import { useColors } from '@/hooks/useColors';
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
  ActivityIndicator,
  PermissionsAndroid,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function IncomingCallScreen() {
  const colors = useColors();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { id, answer, action } = useLocalSearchParams<{
    id?: string | string[];
    answer?: string | string[];
    action?: string | string[];
  }>();
  const callId = Array.isArray(id) ? id[0] : id;
  const answerParam = Array.isArray(answer) ? answer[0] : answer;
  const actionParam = Array.isArray(action) ? action[0] : action;
  const {
    token,
    state: sessionState,
    setActiveCall,
  } = useConsultantSession();
  const [accepting, setAccepting] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const queue = useQuery({
    queryKey: ['petipy', 'incoming-requests'],
    queryFn: () => getIncomingCalls(token as string),
    enabled: sessionState === 'connected' && Boolean(token && callId),
    refetchInterval: 3_000,
    refetchIntervalInBackground: true,
  });
  const call =
    queue.data && callId
      ? findActiveIncomingCall(queue.data, callId)
      : null;

  const acceptCall = useCallback(async () => {
    if (!token || !callId || accepting || !call) return;
    setAccepting(true);
    setActionError(null);
    try {
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
      router.replace(`/call/${encodeURIComponent(session.callId)}`);
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error.message
          : 'پاسخ به تماس ممکن نشد؛ دوباره تلاش کنید.',
      );
    } finally {
      setAccepting(false);
    }
  }, [accepting, call, callId, queryClient, router, setActiveCall, token]);

  const rejectCall = useCallback(async () => {
    if (!token || !callId || rejecting || accepting || !call) return;
    setRejecting(true);
    setActionError(null);
    try {
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
    <SafeAreaView
      style={[styles.safe, { backgroundColor: colors.background }]}
      edges={['top', 'bottom']}
    >
      <View style={styles.content}>
        <View style={styles.callDetails}>
          <Text style={[styles.brand, { color: colors.primary }]}>
            PETIPY CONSULTANT
          </Text>
          <View
            style={[
              styles.avatar,
              { backgroundColor: colors.secondary, borderColor: colors.border },
            ]}
          >
            <Ionicons
              name="person"
              size={42}
              color={colors.primary}
              accessible={false}
            />
          </View>
          <Text style={[styles.eyebrow, { color: colors.mutedForeground }]}>
            تماس ورودی مشاوره
          </Text>
          <Text style={[styles.callerName, { color: colors.foreground }]}>
            {call?.callerName || 'درخواست تماس جدید'}
          </Text>
          {call?.petName ? (
            <Text style={[styles.petName, { color: colors.mutedForeground }]}>
              درباره‌ی {call.petName}
            </Text>
          ) : null}
          {call?.subject ? (
            <Text style={[styles.subject, { color: colors.mutedForeground }]}>
              {call.subject}
            </Text>
          ) : null}

          <View
            style={[
              styles.statusCard,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                borderRadius: colors.radius,
              },
            ]}
          >
            {isLoading ? (
              <>
                <ActivityIndicator color={colors.primary} />
                <Text style={[styles.statusText, { color: colors.mutedForeground }]}>
                  بررسی درخواست تماس…
                </Text>
              </>
            ) : queue.isError ? (
              <>
                <Text style={[styles.statusText, { color: colors.destructive }]}>
                  صف تماس در دسترس نیست. اتصال اینترنت را بررسی کنید.
                </Text>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => void queue.refetch()}
                  testID="incoming-call-retry"
                >
                  <Text style={[styles.linkText, { color: colors.primary }]}>
                    تلاش دوباره
                  </Text>
                </Pressable>
              </>
            ) : isUnavailable ? (
              <Text style={[styles.statusText, { color: colors.mutedForeground }]}>
                این درخواست دیگر فعال نیست یا منقضی شده است.
              </Text>
            ) : (
              <Text style={[styles.statusText, { color: colors.mutedForeground }]}>
                برای پاسخ، دکمه‌ی تماس را بزنید.
              </Text>
            )}
          </View>

          {actionError ? (
            <Text
              accessibilityRole="alert"
              style={[styles.errorText, { color: colors.destructive }]}
            >
              {actionError}
            </Text>
          ) : null}
        </View>

        <View style={styles.actions}>
          {call ? (
            <View style={styles.callActions}>
              <View style={styles.actionOption}>
                <Pressable
                  accessibilityLabel="رد تماس"
                  accessibilityRole="button"
                  disabled={accepting || rejecting}
                  onPress={() => void rejectCall()}
                  style={[
                    styles.acceptButton,
                    { backgroundColor: colors.destructive },
                    (accepting || rejecting) && styles.disabledButton,
                  ]}
                  testID="incoming-call-reject"
                >
                  {rejecting ? (
                    <ActivityIndicator color={colors.primaryForeground} />
                  ) : (
                    <Ionicons
                      name="close"
                      size={31}
                      color={colors.primaryForeground}
                      accessible={false}
                    />
                  )}
                </Pressable>
                <Text style={[styles.actionLabel, { color: colors.foreground }]}>
                  {rejecting ? 'در حال رد…' : 'رد تماس'}
                </Text>
              </View>
              <View style={styles.actionOption}>
                <Pressable
                  accessibilityLabel="پاسخ به تماس"
                  accessibilityRole="button"
                  disabled={accepting || rejecting}
                  onPress={() => void acceptCall()}
                  style={[
                    styles.acceptButton,
                    { backgroundColor: colors.success },
                    (accepting || rejecting) && styles.disabledButton,
                  ]}
                  testID="incoming-call-accept"
                >
                  {accepting ? (
                    <ActivityIndicator color={colors.primaryForeground} />
                  ) : (
                <Ionicons
                  name="call"
                  size={31}
                  color={colors.primaryForeground}
                  accessible={false}
                />
              )}
                </Pressable>
                <Text style={[styles.actionLabel, { color: colors.foreground }]}>
                  {accepting ? 'متصل می‌شوید…' : 'پاسخ به تماس'}
                </Text>
              </View>
            </View>
          ) : null}
          <Pressable
            accessibilityRole="button"
            onPress={() => router.replace('/(tabs)')}
            style={styles.backButton}
            testID="incoming-call-back"
          >
            <Ionicons
              name="arrow-forward"
              size={18}
              color={colors.primary}
              accessible={false}
            />
            <Text style={[styles.linkText, { color: colors.primary }]}>
              بازگشت به صف تماس‌ها
            </Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  loadingContainer: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 28,
  },
  callDetails: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  brand: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 2,
    marginBottom: 32,
  },
  avatar: {
    alignItems: 'center',
    borderRadius: 56,
    borderWidth: 1,
    height: 112,
    justifyContent: 'center',
    marginBottom: 28,
    width: 112,
  },
  eyebrow: {
    fontSize: 15,
    fontWeight: '600',
  },
  callerName: {
    fontSize: 30,
    fontWeight: '700',
    marginTop: 8,
    textAlign: 'center',
  },
  petName: {
    fontSize: 16,
    marginTop: 8,
  },
  subject: {
    fontSize: 14,
    marginTop: 6,
    textAlign: 'center',
  },
  statusCard: {
    alignItems: 'center',
    borderWidth: 1,
    gap: 10,
    marginTop: 28,
    maxWidth: 340,
    paddingHorizontal: 20,
    paddingVertical: 16,
    width: '100%',
  },
  statusText: {
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 14,
    lineHeight: 21,
    marginTop: 14,
    textAlign: 'center',
  },
  actions: {
    alignItems: 'center',
    gap: 14,
    paddingBottom: 12,
  },
  callActions: {
    flexDirection: 'row',
    gap: 56,
    justifyContent: 'center',
  },
  actionOption: {
    alignItems: 'center',
    gap: 10,
  },
  actionLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  acceptButton: {
    alignItems: 'center',
    borderRadius: 36,
    height: 72,
    justifyContent: 'center',
    width: 72,
  },
  disabledButton: {
    opacity: 0.65,
  },
  acceptLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  backButton: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
    padding: 8,
  },
  linkText: {
    fontSize: 14,
    fontWeight: '600',
  },
  note: {
    fontSize: 12,
    lineHeight: 18,
    maxWidth: 340,
    textAlign: 'center',
  },
});
