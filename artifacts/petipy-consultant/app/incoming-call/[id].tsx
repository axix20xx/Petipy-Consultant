import { useColors } from '@/hooks/useColors';
import { PetipyPetMark } from '@/components/PetipyPetMark';
import {
  acceptIncomingCall,
  getIncomingCalls,
  PetipyApiError,
  rejectIncomingCall,
} from '@/lib/petipy-api';
import {
  cancelIncomingCallNotification,
  stopIncomingCallRingtone,
} from '@/lib/incoming-call-alerts';
import { setAvailabilityCallState } from '@/lib/background-monitor';
import { endSystemCall, markSystemCallActive } from '@/lib/system-calling';
import { findActiveIncomingCall } from '@/lib/incoming-push-routing';
import { useConsultantSession } from '@/providers/consultant-session';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AppState,
  ActivityIndicator,
  PermissionsAndroid,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

function formatExpiryTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'نامشخص';
  return new Intl.DateTimeFormat('fa-IR', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function formatRemainingTime(value: string, now: number) {
  const expiresAt = Date.parse(value);
  if (!Number.isFinite(expiresAt)) return 'نامشخص';
  const remainingSeconds = Math.max(0, Math.ceil((expiresAt - now) / 1000));
  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;
  const number = new Intl.NumberFormat('fa-IR', {
    minimumIntegerDigits: 2,
    useGrouping: false,
  });
  return `${number.format(minutes)}:${number.format(seconds)}`;
}

export default function IncomingCallScreen() {
  const colors = useColors();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { id, answer, action, nativeRequestId: nativeRequestIdParam } = useLocalSearchParams<{
    id?: string | string[];
    answer?: string | string[];
    action?: string | string[];
    nativeRequestId?: string | string[];
  }>();
  const callId = Array.isArray(id) ? id[0] : id;
  const answerParam = Array.isArray(answer) ? answer[0] : answer;
  const actionParam = Array.isArray(action) ? action[0] : action;
  const nativeRequestId = Array.isArray(nativeRequestIdParam)
    ? nativeRequestIdParam[0]
    : nativeRequestIdParam;
  const {
    token,
    state: sessionState,
    setActiveCall,
  } = useConsultantSession();
  const [accepting, setAccepting] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    const startTimer = () => {
      if (interval) return;
      interval = setInterval(() => setNow(Date.now()), 1000);
    };
    const stopTimer = () => {
      if (!interval) return;
      clearInterval(interval);
      interval = null;
    };
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        setNow(Date.now());
        startTimer();
      } else {
        stopTimer();
      }
    });
    if (AppState.currentState === 'active') startTimer();
    return () => {
      stopTimer();
      subscription.remove();
    };
  }, []);

  const queue = useQuery({
    queryKey: ['petipy', 'incoming-requests'],
    queryFn: () => getIncomingCalls(token as string),
    enabled: sessionState === 'connected' && Boolean(token && callId),
    refetchInterval: 3_000,
  });
  const call =
    queue.data && callId
      ? findActiveIncomingCall(queue.data, callId)
      : null;
  const lifecycleCall = queue.data?.find((request) => request.id === callId);
  const isCallAccepted =
    lifecycleCall?.status === 'connecting' || lifecycleCall?.status === 'active';
  const cleanedIncomingAlertCallId = useRef<string | null>(null);
  const endedTelecomCallId = useRef<string | null>(null);

  useEffect(() => {
    if (call) {
      cleanedIncomingAlertCallId.current = null;
      endedTelecomCallId.current = null;
      return;
    }
    if (
      !callId ||
      sessionState !== 'connected' ||
      queue.isPending
    ) {
      return;
    }
    if (queue.isError) {
      stopIncomingCallRingtone();
      return;
    }

    if (cleanedIncomingAlertCallId.current !== callId) {
      cleanedIncomingAlertCallId.current = callId;
      stopIncomingCallRingtone();
      void cancelIncomingCallNotification(callId).catch(() => {});
    }
    if (!isCallAccepted && endedTelecomCallId.current !== callId) {
      endedTelecomCallId.current = callId;
      void endSystemCall(callId, 'missed');
    }
  }, [call, callId, isCallAccepted, queue.isError, queue.isPending, sessionState]);

  const acceptCall = useCallback(async () => {
    if (!token || !callId || accepting || !call) return;
    setAccepting(true);
    setActionError(null);
    try {
      if (Platform.OS === 'ios' && !nativeRequestId) {
        try {
          const { answerCall: answerNativeCall, getActiveCallSession } =
            await import('expo-callkit-telecom');
          const systemSession = await getActiveCallSession();
          if (systemSession?.incomingCallEvent?.serverCallId === callId) {
            await answerNativeCall(systemSession.id);
            return;
          }
        } catch {
          // Expo Go has no PushKit/CallKit module; allow foreground API accept.
        }
      }

      if (Platform.OS === 'android') {
        const result = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
          {
            title: 'اجازه‌ی میکروفون',
            message: 'برای پاسخ‌گویی به تماس مشاوره، Petipy به میکروفون نیاز دارد.',
            buttonPositive: 'اجازه می‌دهم',
            buttonNegative: 'بعداً',
          },
        );
        if (result !== PermissionsAndroid.RESULTS.GRANTED) {
          setActionError('برای پاسخ‌گویی به تماس، اجازه‌ی میکروفون را فعال کنید.');
          return;
        }
      }

      const session = await acceptIncomingCall(token, callId);
      await markSystemCallActive(session.callId);
      setAvailabilityCallState(session.callId, 'connecting');
      stopIncomingCallRingtone();
      try {
        await cancelIncomingCallNotification(callId);
      } catch {
        // A stale notification should not block a successful acceptance.
      }
      setActiveCall(session);
      void queryClient.invalidateQueries({
        queryKey: ['petipy', 'incoming-requests'],
      });
      router.replace({
        pathname: '/call/[id]',
        params: {
          id: session.callId,
          ...(nativeRequestId ? { nativeRequestId } : {}),
        },
      });
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error.message
          : 'پاسخ به تماس ممکن نشد؛ دوباره تلاش کنید.',
      );
    } finally {
      setAccepting(false);
    }
  }, [
    accepting,
    call,
    callId,
    nativeRequestId,
    queryClient,
    router,
    setActiveCall,
    token,
  ]);

  const rejectCall = useCallback(async () => {
    if (!token || !callId || rejecting || accepting || !call) return;
    setRejecting(true);
    setActionError(null);
    try {
      if (Platform.OS === 'ios') {
        try {
          const { endCall: endNativeCall, getActiveCallSession } =
            await import('expo-callkit-telecom');
          const systemSession = await getActiveCallSession();
          if (systemSession?.incomingCallEvent?.serverCallId === callId) {
            await endNativeCall(systemSession.id);
            return;
          }
        } catch {
          // Fall back to the authenticated API when CallKit is unavailable.
        }
      }

      await rejectIncomingCall(token, callId, 'busy');
      await endSystemCall(callId, 'rejected');
      stopIncomingCallRingtone();
      setAvailabilityCallState(null, null);
      try {
        await cancelIncomingCallNotification(callId);
      } catch {
        // Stale notification cleanup must not block a successful rejection.
      }
      void queryClient.invalidateQueries({
        queryKey: ['petipy', 'incoming-requests'],
      });
      router.replace('/(tabs)');
    } catch (error) {
      if (error instanceof PetipyApiError && error.status === 401) {
        setActionError('نشست شما منقضی شده است؛ دوباره وارد حساب شوید.');
      } else if (error instanceof PetipyApiError && error.status === 409) {
        setActionError('این درخواست دیگر در انتظار پاسخ نیست یا منقضی شده است.');
      } else if (error instanceof PetipyApiError && error.status === 403) {
        setActionError('این درخواست به حساب مشاور شما تعلق ندارد.');
      } else {
        setActionError(
          error instanceof Error
            ? error.message
            : 'رد تماس ممکن نشد؛ اتصال اینترنت را بررسی کنید.',
        );
      }
    } finally {
      setRejecting(false);
    }
  }, [accepting, call, callId, queryClient, rejecting, router, token]);

  const autoActionHandled = useRef(false);
  useEffect(() => {
    const shouldAnswer = actionParam === 'answer' || answerParam === '1';
    const shouldReject = actionParam === 'reject';
    if (
      (!shouldAnswer && !shouldReject) ||
      sessionState !== 'connected' ||
      !call ||
      autoActionHandled.current
    ) {
      return;
    }
    autoActionHandled.current = true;
    if (shouldAnswer) void acceptCall();
    else void rejectCall();
  }, [acceptCall, actionParam, answerParam, call, rejectCall, sessionState]);

  if (sessionState === 'loading') {
    return (
      <SafeAreaView
        style={[styles.safe, { backgroundColor: colors.background }]}
        edges={['top', 'bottom']}
      >
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (sessionState !== 'connected' || !token) {
    return <Redirect href="/sign-in" />;
  }

  const isLoading = queue.isPending;
  const isUnavailable = !isLoading && !queue.isError && !call;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      <View style={styles.page}>
        <View style={styles.brandLine}>
          <View style={[styles.brandMark, { backgroundColor: colors.primary }]}>
            <Ionicons name="paw" size={17} color={colors.primaryForeground} />
          </View>
          <View style={styles.brandCopy}>
            <Text style={[styles.brandName, { color: colors.foreground }]}>پتی‌پای</Text>
            <Text style={[styles.brandCaption, { color: colors.mutedForeground }]}>میز مشاوره</Text>
          </View>
          <View style={[styles.liveChip, { backgroundColor: colors.accent }]}>
            <View style={[styles.liveDot, { backgroundColor: colors.warning }]} />
            <Text style={[styles.liveChipText, { color: colors.accentForeground }]}>درخواست تازه</Text>
          </View>
        </View>

        <View style={[styles.callerCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.requestTopline}>
            <Text style={[styles.eyebrow, { color: colors.primary }]}>درخواست مشاوره</Text>
            <View style={[styles.requestState, { backgroundColor: colors.accent }]}>
              <View style={[styles.liveDot, { backgroundColor: colors.warning }]} />
              <Text style={[styles.requestStateText, { color: colors.accentForeground }]}>در انتظار پاسخ</Text>
            </View>
          </View>
          {call?.expiresAt ? (
            <View style={[styles.deadlineCard, { backgroundColor: colors.primary }]}>
              <View style={[styles.deadlineIcon, { backgroundColor: colors.primaryForeground }]}>
                <Ionicons name="time-outline" size={22} color={colors.primary} />
              </View>
              <View style={styles.deadlineCopy}>
                <Text style={[styles.deadlineLabel, { color: colors.primaryForeground }]}>زمان باقی‌مانده</Text>
                <Text style={[styles.deadlineTime, { color: colors.primaryForeground }]}>{formatRemainingTime(call.expiresAt, now)}</Text>
              </View>
              <Text style={[styles.deadlineNote, { color: colors.primaryForeground }]}>مهلت تا ساعت {formatExpiryTime(call.expiresAt)}</Text>
            </View>
          ) : null}
          <View style={styles.callerIdentity}>
            <PetipyPetMark compact />
            <View style={styles.identityCopy}>
              <Text style={[styles.identityLabel, { color: colors.primary }]}>خانواده‌ی همراهِ پتی‌پای</Text>
              <Text style={[styles.callerName, { color: colors.foreground }]}>
                {call?.callerName || 'درخواست تماس جدید'}
              </Text>
            </View>
          </View>
          <View style={styles.requestContext}>
            {call?.petName ? (
              <View style={[styles.petContext, { backgroundColor: colors.secondary }]}>
                <Ionicons name="paw-outline" size={15} color={colors.secondaryForeground} />
                <Text style={[styles.petName, { color: colors.secondaryForeground }]}>درباره‌ی {call.petName}</Text>
              </View>
            ) : null}
            {call?.subject ? (
              <View style={[styles.subjectBlock, { backgroundColor: colors.background }]}>
                <Text style={[styles.subjectLabel, { color: colors.mutedForeground }]}>موضوع درخواست</Text>
                <Text style={[styles.subject, { color: colors.foreground }]}>{call.subject}</Text>
              </View>
            ) : null}
          </View>
          <View style={[styles.statusCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <View style={[styles.statusIcon, { backgroundColor: isLoading ? colors.secondary : queue.isError ? colors.accent : colors.card }]}>
              {isLoading ? (
                <ActivityIndicator color={colors.primary} />
              ) : (
                <Ionicons name={queue.isError ? 'cloud-offline-outline' : isUnavailable ? 'time-outline' : 'call-outline'} size={18} color={queue.isError ? colors.destructive : colors.primary} />
              )}
            </View>
            <View style={styles.statusCopy}>
              <Text style={[styles.statusTitle, { color: colors.foreground }]}>
                {isLoading ? 'در حال بررسی' : queue.isError ? 'ارتباط برقرار نیست' : isUnavailable ? 'درخواست غیرفعال است' : 'آماده‌ی پاسخ'}
              </Text>
              {isLoading ? (
                <Text style={[styles.statusText, { color: colors.mutedForeground }]}>بررسی درخواست تماس…</Text>
              ) : queue.isError ? (
                <Text style={[styles.statusText, { color: colors.mutedForeground }]}>صف تماس در دسترس نیست. اتصال اینترنت را بررسی کنید.</Text>
              ) : isUnavailable ? (
                <Text style={[styles.statusText, { color: colors.mutedForeground }]}>این درخواست دیگر فعال نیست یا منقضی شده است.</Text>
              ) : (
                <Text style={[styles.statusText, { color: colors.mutedForeground }]}>برای پاسخ‌گویی، دکمه‌ی پاسخ را بزنید.</Text>
              )}
            </View>
            {queue.isError ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => void queue.refetch()}
                testID="incoming-call-retry"
                style={({ pressed }) => [styles.refreshAction, { backgroundColor: colors.secondary, opacity: pressed ? 0.75 : 1 }]}
              >
                <Ionicons name="refresh-outline" size={17} color={colors.primary} />
              </Pressable>
            ) : null}
          </View>
          {actionError ? (
            <View style={[styles.errorBox, { backgroundColor: colors.accent }]}>
              <Ionicons name="alert-circle-outline" size={17} color={colors.destructive} />
              <Text accessibilityRole="alert" style={[styles.errorText, { color: colors.destructive }]}>{actionError}</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.actionDock}>
          {call ? (
            <View style={styles.callActions}>
              <Pressable
                accessibilityLabel="رد تماس"
                accessibilityRole="button"
                disabled={accepting || rejecting}
                onPress={() => void rejectCall()}
                style={({ pressed }) => [
                  styles.rejectButton,
                  { backgroundColor: colors.card, borderColor: colors.border, opacity: accepting || rejecting ? 0.55 : pressed ? 0.82 : 1 },
                ]}
                testID="incoming-call-reject"
              >
                {rejecting ? <ActivityIndicator color={colors.destructive} /> : <Ionicons name="close" size={22} color={colors.destructive} accessible={false} />}
                <Text style={[styles.rejectLabel, { color: colors.destructive }]}>{rejecting ? 'در حال رد…' : 'رد تماس'}</Text>
              </Pressable>
              <Pressable
                accessibilityLabel="پاسخ به تماس"
                accessibilityRole="button"
                disabled={accepting || rejecting}
                onPress={() => void acceptCall()}
                style={({ pressed }) => [
                  styles.acceptButton,
                  { backgroundColor: colors.primary, opacity: accepting || rejecting ? 0.58 : pressed ? 0.88 : 1 },
                ]}
                testID="incoming-call-accept"
              >
                {accepting ? <ActivityIndicator color={colors.primaryForeground} /> : <Ionicons name="call" size={20} color={colors.primaryForeground} accessible={false} />}
                <Text style={[styles.acceptLabel, { color: colors.primaryForeground }]}>{accepting ? 'متصل می‌شوید…' : 'پاسخ به تماس'}</Text>
              </Pressable>
            </View>
          ) : null}
          <Pressable
            accessibilityRole="button"
            onPress={() => router.replace('/(tabs)')}
            style={styles.backButton}
            testID="incoming-call-back"
          >
            <Ionicons name="arrow-forward" size={17} color={colors.primary} accessible={false} />
            <Text style={[styles.linkText, { color: colors.primary }]}>بازگشت به صف تماس‌ها</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  loadingContainer: { alignItems: 'center', flex: 1, justifyContent: 'center' },
  page: { flex: 1, justifyContent: 'space-between', paddingHorizontal: 18, paddingTop: 12, paddingBottom: 16, gap: 16 },
  brandLine: { minHeight: 43, flexDirection: 'row-reverse', alignItems: 'center', gap: 9 },
  brandMark: { width: 37, height: 37, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  brandCopy: { flex: 1, alignItems: 'flex-end', gap: 1 },
  brandName: { fontSize: 13, fontWeight: '800', writingDirection: 'rtl' },
  brandCaption: { fontSize: 9, writingDirection: 'rtl' },
  liveChip: { flexDirection: 'row-reverse', alignItems: 'center', gap: 5, borderRadius: 11, paddingHorizontal: 10, paddingVertical: 7 },
  liveDot: { width: 6, height: 6, borderRadius: 3 },
  liveChipText: { fontSize: 10, fontWeight: '700', writingDirection: 'rtl' },
  callerCard: { width: '100%', maxWidth: 460, alignSelf: 'center', borderWidth: 1, borderRadius: 28, padding: 18, gap: 17, elevation: 2 },
  requestTopline: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between' },
  requestState: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6, borderRadius: 10, paddingHorizontal: 9, paddingVertical: 6 },
  requestStateText: { fontSize: 9, fontWeight: '700', writingDirection: 'rtl' },
  deadlineCard: { minHeight: 86, flexDirection: 'row-reverse', alignItems: 'center', gap: 11, borderRadius: 17, paddingHorizontal: 13, paddingVertical: 11 },
  deadlineIcon: { width: 44, height: 44, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  deadlineCopy: { alignItems: 'flex-end', gap: 2 },
  deadlineLabel: { fontSize: 10, fontWeight: '600', writingDirection: 'rtl', opacity: 0.85 },
  deadlineTime: { fontSize: 24, fontWeight: '800', fontVariant: ['tabular-nums'] },
  deadlineNote: { flex: 1, fontSize: 10, lineHeight: 16, textAlign: 'right', writingDirection: 'rtl', opacity: 0.88 },
  callerIdentity: { flexDirection: 'column', alignItems: 'center', gap: 10, paddingVertical: 4 },
  identityCopy: { width: '100%', alignItems: 'center', gap: 5 },
  identityLabel: { fontSize: 10, writingDirection: 'rtl' },
  eyebrow: { fontSize: 11, fontWeight: '700', writingDirection: 'rtl' },
  callerName: { maxWidth: '100%', fontSize: 24, fontWeight: '900', textAlign: 'center', writingDirection: 'rtl' },
  requestContext: { alignItems: 'flex-end', gap: 9 },
  petContext: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6, borderRadius: 10, paddingHorizontal: 9, paddingVertical: 6 },
  petName: { fontSize: 11, fontWeight: '600', writingDirection: 'rtl' },
  subjectBlock: { width: '100%', borderRadius: 12, padding: 10, gap: 4 },
  subjectLabel: { fontSize: 9, textAlign: 'right', writingDirection: 'rtl' },
  subject: { fontSize: 12, lineHeight: 19, textAlign: 'right', writingDirection: 'rtl' },
  statusCard: { flexDirection: 'row-reverse', alignItems: 'center', borderWidth: 1, borderRadius: 16, gap: 10, marginTop: 4, padding: 11 },
  statusIcon: { width: 37, height: 37, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  statusCopy: { flex: 1, alignItems: 'flex-end', gap: 3 },
  statusTitle: { fontSize: 12, fontWeight: '800', writingDirection: 'rtl' },
  statusText: { fontSize: 10, lineHeight: 16, textAlign: 'right', writingDirection: 'rtl' },
  refreshAction: { width: 44, height: 44, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  errorBox: { flexDirection: 'row-reverse', alignItems: 'center', gap: 7, borderRadius: 12, padding: 10 },
  errorText: { flex: 1, fontSize: 11, lineHeight: 18, textAlign: 'right', writingDirection: 'rtl' },
  actionDock: { alignItems: 'center', gap: 9, paddingBottom: 5 },
  callActions: { width: '100%', flexDirection: 'row-reverse', gap: 10 },
  rejectButton: { flex: 0.78, minHeight: 62, borderWidth: 1, borderRadius: 19, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 7 },
  rejectLabel: { fontSize: 12, fontWeight: '700', writingDirection: 'rtl' },
  acceptButton: { flex: 1.22, minHeight: 62, borderRadius: 19, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 8, elevation: 3 },
  acceptLabel: { fontSize: 13, fontWeight: '800', writingDirection: 'rtl' },
  backButton: { alignItems: 'center', flexDirection: 'row-reverse', gap: 8, minHeight: 43, paddingHorizontal: 12 },
  linkText: { fontSize: 11, fontWeight: '700', writingDirection: 'rtl' },
});
