import { useColors } from '@/hooks/useColors';
import { PetipyPetMark } from '@/components/PetipyPetMark';
import { PetipyText as Text } from '@/components/PetipyText';
import { useConsultantSession } from '@/providers/consultant-session';
import {
  acceptIncomingCall,
  getCallHistory,
  getIncomingCalls,
  rejectIncomingCall,
  setConsultantAvailability,
} from '@/lib/petipy-api';
import {
  hasAvailabilityNotificationPermission,
  requestAvailabilityPermissions,
  isAvailabilityServiceRunning,
  setAvailabilityCallState,
  startAvailabilityService,
  stopAvailabilityService,
} from '@/lib/background-monitor';
import {
  clearSystemIncomingCallSuppression,
  endSystemCall,
  isSystemIncomingCallSuppressed,
  markSystemCallActive,
  reportSystemIncomingCall,
} from '@/lib/system-calling';
import {
  cancelIncomingCallNotification,
  startIncomingCallRingtone,
  stopIncomingCallRingtone,
} from '@/lib/incoming-call-alerts';
import { isUnexpiredRequestedCall } from '@/lib/incoming-push-routing';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  AppState,
  ActivityIndicator,
  Alert,
  PermissionsAndroid,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

function formatTime(value?: string) {
  if (!value) return 'همین حالا';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'درخواست تازه';
  return new Intl.DateTimeFormat('fa-IR', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export default function ConsultantHome() {
  const colors = useColors();
  const queryClient = useQueryClient();
  const {
    token,
    tokenExpiresAt,
    profile,
    state: sessionState,
    message: sessionMessage,
    setActiveCall,
    activeCall,
    refresh,
    pushSetupState,
    pushSetupMessage,
    retryPushSetup,
  } = useConsultantSession();
  const [availabilityBusy, setAvailabilityBusy] = useState(false);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectError, setRejectError] = useState<{ callId: string; message: string } | null>(null);
  const [serviceRunning, setServiceRunning] = useState(false);
  const [appIsActive, setAppIsActive] = useState(
    AppState.currentState === 'active',
  );
  const reportedSystemCallsRef = useRef(new Set<string>());
  const callKitReportedCallsRef = useRef(new Set<string>());
  const endingSystemCallsRef = useRef(new Set<string>());
  const isConnected = sessionState === 'connected' && Boolean(token);
  const hasSession = Boolean(token) && ['connected', 'offline'].includes(sessionState);
  const isAvailable = profile?.manualStatus === 'online';
  const refreshServiceState = () => setServiceRunning(isAvailabilityServiceRunning());

  useEffect(() => {
    refreshServiceState();
    const subscription = AppState.addEventListener('change', (nextState) => {
      setAppIsActive(nextState === 'active');
      if (nextState === 'active') {
        refreshServiceState();
        void queryClient.invalidateQueries({
          queryKey: ['petipy', 'incoming-requests'],
        });
        if (Platform.OS === 'ios') {
          void queryClient.invalidateQueries({
            queryKey: ['petipy', 'call-history'],
          });
        }
      }
    });
    return () => subscription.remove();
  }, [queryClient]);

  const queue = useQuery({
    queryKey: ['petipy', 'incoming-requests'],
    queryFn: () => getIncomingCalls(token as string),
    enabled: isConnected,
    refetchInterval:
      isConnected &&
      isAvailable &&
      appIsActive &&
      !(Platform.OS === 'android' && serviceRunning)
        ? 5_000
        : false,
    refetchIntervalInBackground: false,
    refetchOnReconnect: true,
  });
  useEffect(() => {
    if (Platform.OS !== 'ios') return;
    const pendingCall =
      appIsActive &&
      isConnected &&
      isAvailable &&
      !activeCall &&
      !acceptingId &&
      !rejectingId
        ? queue.data?.find(
            (call) =>
              isUnexpiredRequestedCall(call) &&
              !isSystemIncomingCallSuppressed(call.id) &&
              !callKitReportedCallsRef.current.has(call.id),
          ) ?? null
        : null;
    if (pendingCall) startIncomingCallRingtone(pendingCall.expiresAt);
    else stopIncomingCallRingtone();
  }, [
    acceptingId,
    activeCall,
    appIsActive,
    isAvailable,
    isConnected,
    queue.data,
    rejectingId,
  ]);
  useEffect(
    () => () => {
      if (Platform.OS === 'ios') stopIncomingCallRingtone();
    },
    [],
  );
  useEffect(() => {
    if (
      Platform.OS !== 'ios' ||
      !appIsActive ||
      !isConnected ||
      !queue.data
    ) {
      return;
    }

    const canReportIncoming =
      isAvailable && !activeCall && !acceptingId && !rejectingId;
    const pendingCalls = canReportIncoming
      ? queue.data.filter(
          (call) =>
            isUnexpiredRequestedCall(call) &&
            !isSystemIncomingCallSuppressed(call.id),
        )
      : [];
    const pendingIds = new Set(pendingCalls.map((call) => call.id));
    let active = true;

    for (const call of pendingCalls) {
      if (reportedSystemCallsRef.current.has(call.id)) continue;
      reportedSystemCallsRef.current.add(call.id);
      void reportSystemIncomingCall(
        call.id,
        call.expiresAt,
        call.callerName,
      ).then((reported) => {
        if (reported) {
          callKitReportedCallsRef.current.add(call.id);
          stopIncomingCallRingtone();
        } else {
          reportedSystemCallsRef.current.delete(call.id);
        }
        if (!active) return;
        if (!reported && (
          AppState.currentState === 'active' &&
          isConnected &&
          isAvailable &&
          !activeCall
        )) {
          startIncomingCallRingtone(call.expiresAt);
        }
      });
    }

    for (const callId of reportedSystemCallsRef.current) {
      if (
        pendingIds.has(callId) ||
        endingSystemCallsRef.current.has(callId)
      ) {
        continue;
      }
      const current = queue.data.find((call) => call.id === callId);
      if (
        current &&
        isUnexpiredRequestedCall(current) &&
        isSystemIncomingCallSuppressed(callId)
      ) {
        continue;
      }
      if (
        activeCall?.callId === callId ||
        current?.status === 'connecting' ||
        current?.status === 'active'
      ) {
        continue;
      }

      const reason =
        current?.status === 'rejected'
          ? 'rejected'
          : current?.status === 'expired' ||
              (current && !isUnexpiredRequestedCall(current))
            ? 'missed'
            : 'remote';
      endingSystemCallsRef.current.add(callId);
      void endSystemCall(callId, reason).finally(() => {
        endingSystemCallsRef.current.delete(callId);
        if (!active) return;
        reportedSystemCallsRef.current.delete(callId);
        callKitReportedCallsRef.current.delete(callId);
        clearSystemIncomingCallSuppression(callId);
      });
    }

    return () => {
      active = false;
    };
  }, [
    acceptingId,
    activeCall,
    appIsActive,
    isAvailable,
    isConnected,
    queue.data,
    rejectingId,
  ]);
  const history = useQuery({
    queryKey: ['petipy', 'call-history'],
    queryFn: () => getCallHistory(token as string),
    enabled: isConnected,
    refetchInterval: isConnected ? 60_000 : false,
    refetchIntervalInBackground: false,
    refetchOnReconnect: true,
  });
  const todayCount =
    history.data?.filter((item) => {
      if (!item.startedAt) return false;
      return new Date(item.startedAt).toDateString() === new Date().toDateString();
    }).length ?? 0;
  const todayDuration =
    history.data?.reduce(
      (total, item) => total + (item.durationSeconds ?? 0),
      0,
    ) ?? 0;

  useEffect(() => {
    if (
      !isConnected ||
      !isAvailable ||
      !token ||
      !tokenExpiresAt ||
      !appIsActive ||
      Platform.OS !== 'android'
    ) {
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const [microphoneGranted, notificationGranted] = await Promise.all([
          PermissionsAndroid.check(
            PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
          ),
          hasAvailabilityNotificationPermission(),
        ]);
        if (!microphoneGranted || !notificationGranted) {
          return;
        }
        await startAvailabilityService(token, tokenExpiresAt);
        if (!cancelled) refreshServiceState();
      } catch (error) {
        await stopAvailabilityService();
        refreshServiceState();
        try {
          await setConsultantAvailability(token, 'offline');
        } catch {
          // Keep the service-start error visible to the consultant.
        }
        await refresh();
        if (!cancelled) {
          Alert.alert(
            'سرویس تماس فعال نشد',
            error instanceof Error
              ? error.message
              : 'تنظیمات Android را بررسی کنید.',
          );
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    appIsActive,
    isConnected,
    isAvailable,
    pushSetupState,
    token,
    tokenExpiresAt,
    refresh,
  ]);

  async function requestMicrophone() {
    if (Platform.OS !== 'android') return true;
    if (
      await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
      )
    ) {
      return true;
    }
    const result = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
      {
        title: 'اجازه‌ی میکروفون',
        message: 'برای پاسخ‌گویی به تماس مشاوره، Petipy به میکروفون نیاز دارد.',
        buttonPositive: 'اجازه می‌دهم',
        buttonNegative: 'بعداً',
      },
    );
    return result === PermissionsAndroid.RESULTS.GRANTED;
  }

  async function updateAvailability(next: boolean) {
    if (!token || !tokenExpiresAt || availabilityBusy) return;
    setAvailabilityBusy(true);
    try {
      if (next) {
        const microphoneGranted = await requestMicrophone();
        if (!microphoneGranted) {
          Alert.alert(
            'اجازه‌ی میکروفون لازم است',
            'برای دریافت تماس، دسترسی میکروفون را در تنظیمات Android فعال کنید.',
          );
          return;
        }
        const notificationGranted = await requestAvailabilityPermissions();
        if (!notificationGranted) {
          Alert.alert(
            'اعلان‌ها محدود هستند',
            'دستگاه آنلاین می‌شود و سرویس foreground صف تماس را بررسی می‌کند؛ اما ممکن است Android اعلان تماس را پنهان کند.',
          );
        } else if (pushSetupState === 'permission-denied') {
          void retryPushSetup();
        }
      }

      if (next) {
        try {
          await startAvailabilityService(token, tokenExpiresAt);
          await setConsultantAvailability(token, 'online');
        } catch (error) {
          await stopAvailabilityService().catch(() => undefined);
          throw error;
        }
      } else {
        await setConsultantAvailability(token, 'offline');
        await stopAvailabilityService();
      }
      await queryClient.invalidateQueries({
        queryKey: ['petipy', 'incoming-requests'],
      });
      await queryClient.invalidateQueries({
        queryKey: ['petipy', 'call-history'],
      });
      await refresh();
      refreshServiceState();
    } catch (error) {
      Alert.alert(
        'وضعیت تغییر نکرد',
        error instanceof Error
          ? error.message
          : 'اتصال به Petipy برقرار نشد.',
      );
    } finally {
      setAvailabilityBusy(false);
      refreshServiceState();
    }
  }

  async function acceptCall(callId: string) {
    if (!token || acceptingId) return;
    const microphoneGranted = await requestMicrophone();
    if (!microphoneGranted) {
      Alert.alert(
        'اجازه‌ی میکروفون لازم است',
        'برای پاسخ‌گویی به تماس، دسترسی میکروفون را فعال کنید.',
      );
      return;
    }
    setAcceptingId(callId);
    try {
      const session = await acceptIncomingCall(token, callId);
      await markSystemCallActive(session.callId);
      setAvailabilityCallState(session.callId, 'connecting');
      stopIncomingCallRingtone();
      try {
        await cancelIncomingCallNotification(callId);
      } catch {
        // A stale alert should not block a successful call acceptance.
      }
      await queryClient.invalidateQueries({
        queryKey: ['petipy', 'incoming-requests'],
      });
      setActiveCall(session);
      router.push(`/call/${encodeURIComponent(session.callId)}`);
    } catch (error) {
      Alert.alert(
        'پاسخ به تماس ممکن نشد',
        error instanceof Error ? error.message : 'درخواست را دوباره بررسی کنید.',
      );
    } finally {
      setAcceptingId(null);
    }
  }

  async function rejectCall(callId: string) {
    if (!token || rejectingId) return;
    setRejectingId(callId);
    setRejectError(null);
    try {
      await rejectIncomingCall(token, callId, 'busy');
      await queryClient.invalidateQueries({ queryKey: ['petipy', 'incoming-requests'] });
    } catch (error) {
      setRejectError({
        callId,
        message: error instanceof Error ? error.message : 'رد تماس ممکن نشد؛ دوباره تلاش کنید.',
      });
    } finally {
      setRejectingId(null);
    }
  }

  const refreshAll = async () => {
    await Promise.all([queue.refetch(), history.refetch()]);
    refreshServiceState();
  };
  const pushReady = pushSetupState === 'ready';
  const pushReadinessText = pushReady
    ? 'اعلان دستگاه آماده'
    : pushSetupMessage ??
      (pushSetupState === 'idle'
        ? 'ثبت اعلان در انتظار ورود'
        : pushSetupState === 'unsupported'
          ? 'اعلان دستگاه پشتیبانی نمی‌شود'
          : 'وضعیت اعلان نیاز به بررسی دارد');
  const readinessTone = isConnected && isAvailable && serviceRunning && pushReady
    ? colors.success
    : colors.warning;

  const pendingCount = queue.data?.length ?? 0;
  const todayLabel = new Intl.DateTimeFormat('fa-IR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date());

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView
        contentContainerStyle={[styles.content, Platform.OS === 'web' && styles.webContent]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={queue.isRefetching || history.isRefetching}
            onRefresh={() => void refreshAll()}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        <View style={styles.topLine}>
          <View style={[styles.brandMark, { backgroundColor: colors.primary }]}>
            <Ionicons name="paw" size={19} color={colors.primaryForeground} />
          </View>
          <View style={styles.topBrandCopy}>
            <Text numberOfLines={1} style={[styles.brandName, { color: colors.foreground }]}>پتی‌پای</Text>
            <Text style={[styles.brandCaption, { color: colors.mutedForeground }]}>میز مشاوره‌ی صوتی</Text>
          </View>
          <View style={styles.topDate}>
            <Text style={[styles.dateCaption, { color: colors.mutedForeground }]}>{todayLabel}</Text>
          </View>
        </View>

        {!isConnected ? (
          <View style={[styles.connectionNotice, { backgroundColor: colors.accent, borderColor: colors.border }]}>
            <Ionicons name="information-circle-outline" size={20} color={colors.accentForeground} />
            <Text style={[styles.noticeText, { color: colors.accentForeground }]}>
              {sessionMessage ?? 'برای ورود مشاور، مسیر رسمی Petipy برای صدور bearer token باید تنظیم شود.'}
            </Text>
          </View>
        ) : null}

        <View style={[styles.statusRail, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.statusRailMain}>
            <View style={styles.availabilityControl}>
              <View style={[styles.statusIcon, { backgroundColor: isAvailable ? colors.secondary : colors.muted }]}>
                <Ionicons name={isAvailable ? 'radio' : 'radio-outline'} size={18} color={readinessTone} />
              </View>
              <View style={styles.statusCopy}>
                <Text style={[styles.shiftTitle, { color: colors.foreground }]}>
                  {isAvailable ? 'آماده‌ی پاسخ‌گویی' : 'شیفت شما آفلاین است'}
                </Text>
                <Text style={[styles.shiftDetail, { color: colors.mutedForeground }]} numberOfLines={2}>
                  {isAvailable ? 'درخواست‌های تازه مستقیم به این صف می‌آیند' : isConnected ? 'برای دریافت تماس، وضعیت را آنلاین کنید' : 'پس از اتصال حساب فعال می‌شود'}
                </Text>
              </View>
              {availabilityBusy ? (
                <ActivityIndicator color={colors.primary} />
              ) : (
                <Switch
                  testID="availability-switch"
                  value={Boolean(isAvailable)}
                  onValueChange={updateAvailability}
                  disabled={!isConnected}
                  trackColor={{ false: colors.border, true: colors.success }}
                  thumbColor={colors.card}
                  accessibilityLabel="وضعیت در دسترس بودن مشاور"
                />
              )}
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="بررسی وضعیت تماس در تنظیمات"
              onPress={() => router.push('/(tabs)/settings')}
              style={({ pressed }) => [styles.readiness, { borderTopColor: colors.border, opacity: pressed ? 0.72 : 1 }]}
              testID="call-readiness-settings"
            >
              <Ionicons name={pushReady && serviceRunning ? 'checkmark-circle' : 'alert-circle-outline'} size={15} color={readinessTone} />
              <Text style={[styles.readinessText, { color: colors.mutedForeground }]} numberOfLines={1}>
                {pushReadinessText}
                {' · '}
                {serviceRunning ? 'سرویس فعال' : 'سرویس متوقف'}
              </Text>
              <Ionicons name="chevron-back" size={14} color={colors.primary} />
            </Pressable>
          </View>
        </View>

        <View style={styles.queueHeading}>
          <View style={styles.queueTitleGroup}>
            <Text style={[styles.sectionKicker, { color: colors.primary }]}>میز تماس</Text>
            <Text style={[styles.sectionHeading, { color: colors.foreground }]}>درخواست‌های ورودی</Text>
          </View>
          <Pressable
            testID="refresh-queue"
            accessibilityRole="button"
            accessibilityLabel="تازه‌سازی صف تماس"
            onPress={() => void refreshAll()}
            disabled={queue.isRefetching || history.isRefetching}
            style={({ pressed }) => [styles.refreshButton, { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.7 : 1 }]}
          >
            {queue.isRefetching ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Ionicons name="refresh-outline" size={18} color={colors.primary} />
            )}
          </Pressable>
        </View>

        <View style={styles.queueMeta}>
          <View style={[styles.countBadge, { backgroundColor: colors.secondary }]}>
            <Text style={[styles.countText, { color: colors.secondaryForeground }]}>{pendingCount.toLocaleString('fa-IR')}</Text>
          </View>
          <Text style={[styles.queueMetaText, { color: colors.mutedForeground }]}>
            درخواست در انتظار پاسخ
          </Text>
          <View style={styles.metaSpacer} />
          <View style={styles.pollingLabel}>
            <View style={[styles.pollingDot, { backgroundColor: colors.success }]} />
            <Text style={[styles.pollingText, { color: colors.mutedForeground }]}>بررسی خودکار هر ۵ ثانیه</Text>
          </View>
        </View>

        {!hasSession ? (
          <View style={[styles.emptyState, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.emptyIllustration, { backgroundColor: colors.secondary }]}>
              <Ionicons name="headset-outline" size={26} color={colors.primary} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>ورود مشاور لازم است</Text>
            <Text style={[styles.emptyDescription, { color: colors.mutedForeground }]}>
              صف پس از تأیید حساب VOICE_CONSULTANT از سوی Petipy نمایش داده می‌شود.
            </Text>
          </View>
        ) : sessionState === 'offline' ? (
          <View style={[styles.emptyState, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.emptyIllustration, { backgroundColor: colors.accent }]}>
              <Ionicons name="cloud-offline-outline" size={25} color={colors.accentForeground} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>نشست شما حفظ شده است</Text>
            <Text style={[styles.emptyDescription, { color: colors.mutedForeground }]}>
              {sessionMessage ?? 'پس از بازگشت اتصال، صف تماس دوباره بررسی می‌شود.'}
            </Text>
            <Pressable
              testID="retry-session"
              accessibilityRole="button"
              accessibilityLabel="بررسی دوباره اتصال Petipy"
              onPress={() => void refresh()}
              style={({ pressed }) => [styles.retryButton, { backgroundColor: colors.primary, opacity: pressed ? 0.86 : 1 }]}
            >
              <Ionicons name="refresh-outline" size={16} color={colors.primaryForeground} />
              <Text style={[styles.retryText, { color: colors.primaryForeground }]}>بررسی اتصال</Text>
            </Pressable>
          </View>
        ) : queue.isLoading ? (
          <View style={styles.skeletonStack} accessibilityLabel="در حال دریافت صف تماس">
            {[0, 1].map((item) => (
              <View key={item} style={[styles.skeletonCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={styles.skeletonHeader}>
                  <View style={[styles.skeletonAvatar, { backgroundColor: colors.muted }]} />
                  <View style={styles.skeletonLines}>
                    <View style={[styles.skeletonLine, styles.skeletonLineLong, { backgroundColor: colors.muted }]} />
                    <View style={[styles.skeletonLine, styles.skeletonLineShort, { backgroundColor: colors.muted }]} />
                  </View>
                </View>
                <View style={[styles.skeletonAction, { backgroundColor: colors.muted }]} />
              </View>
            ))}
          </View>
        ) : queue.isError ? (
          <View style={[styles.emptyState, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.emptyIllustration, { backgroundColor: colors.accent }]}>
              <Ionicons name="cloud-offline-outline" size={24} color={colors.accentForeground} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>دریافت صف تماس ممکن نشد</Text>
            <Text style={[styles.emptyDescription, { color: colors.mutedForeground }]}>اتصال را بررسی کنید و دوباره تلاش کنید.</Text>
            <Pressable
              testID="retry-queue"
              accessibilityRole="button"
              onPress={() => void queue.refetch()}
              style={({ pressed }) => [styles.retryButton, { backgroundColor: colors.primary, opacity: pressed ? 0.86 : 1 }]}
            >
              <Ionicons name="refresh-outline" size={16} color={colors.primaryForeground} />
              <Text style={[styles.retryText, { color: colors.primaryForeground }]}>تلاش دوباره</Text>
            </Pressable>
          </View>
        ) : queue.data?.length ? (
          <View style={styles.queueList}>
            {queue.data.map((call, index) => index === 0 ? (
              <View key={call.id} style={[styles.featuredRequest, { backgroundColor: colors.primary, borderColor: colors.primary }]}>
                <View style={styles.featuredTopline}>
                  <View style={[styles.featuredStatus, { backgroundColor: colors.primaryForeground }]}>
                    <View style={[styles.pendingDot, { backgroundColor: colors.warning }]} />
                    <Text style={[styles.featuredStatusText, { color: colors.primary }]}>در انتظار پاسخ</Text>
                  </View>
                  <Text style={[styles.featuredEyebrow, { color: colors.primaryForeground }]}>درخواست اول صف</Text>
                </View>
                <View style={styles.featuredIdentity}>
                  <View style={[styles.featuredAvatar, { backgroundColor: colors.secondary }]}>
                    <Ionicons name="paw" size={23} color={colors.primary} />
                  </View>
                  <View style={styles.featuredCopy}>
                    <Text numberOfLines={2} style={[styles.featuredName, { color: colors.primaryForeground }]}>{call.callerName || 'درخواست تماس مشاوره'}</Text>
                    <Text numberOfLines={1} style={[styles.featuredPet, { color: colors.primaryForeground }]}>
                      {call.petName ? `برای ${call.petName}` : `ثبت درخواست · ${formatTime(call.createdAt)}`}
                    </Text>
                  </View>
                </View>
                {call.subject ? (
                  <View style={[styles.featuredSubject, { borderRightColor: colors.accent }]}>
                    <Text style={[styles.subjectCaption, { color: colors.primaryForeground }]}>موضوع درخواست</Text>
                    <Text numberOfLines={2} style={[styles.subjectValue, { color: colors.primaryForeground }]}>{call.subject}</Text>
                  </View>
                ) : null}
                <View style={styles.featuredMeta}>
                  <Ionicons name="time-outline" size={15} color={colors.primaryForeground} />
                  <Text style={[styles.featuredDeadline, { color: colors.primaryForeground }]}>
                    {call.expiresAt ? `مهلت پاسخ تا ${formatTime(call.expiresAt)}` : `ثبت درخواست · ${formatTime(call.createdAt)}`}
                  </Text>
                </View>
                <View style={styles.featuredActions}>
                  <Pressable
                    testID={`accept-${call.id}`}
                    accessibilityRole="button"
                    onPress={() => void acceptCall(call.id)}
                    disabled={acceptingId !== null}
                    android_ripple={{ color: colors.secondary }}
                    style={({ pressed }) => [styles.featuredAccept, { backgroundColor: colors.primaryForeground, opacity: pressed ? 0.86 : 1 }]}
                  >
                    {acceptingId === call.id ? <ActivityIndicator color={colors.primary} /> : <Ionicons name="call" size={17} color={colors.primary} />}
                    <Text style={[styles.featuredAcceptText, { color: colors.primary }]}>پاسخ به تماس</Text>
                  </Pressable>
                  <Pressable
                    testID={`reject-${call.id}`}
                    accessibilityRole="button"
                    accessibilityLabel="رد تماس"
                    accessibilityState={{ disabled: rejectingId !== null }}
                    onPress={() => void rejectCall(call.id)}
                    disabled={rejectingId !== null || acceptingId !== null}
                    android_ripple={{ color: colors.secondary }}
                    style={({ pressed }) => [styles.featuredReject, { borderColor: colors.primaryForeground, opacity: pressed ? 0.75 : 1 }]}
                  >
                    {rejectingId === call.id ? <ActivityIndicator color={colors.primaryForeground} /> : <Ionicons name="close" size={18} color={colors.primaryForeground} />}
                    <Text style={[styles.featuredRejectText, { color: colors.primaryForeground }]}>{rejectingId === call.id ? 'در حال رد' : 'رد'}</Text>
                  </Pressable>
                </View>
                {rejectError?.callId === call.id ? (
                  <Text accessibilityRole="alert" style={[styles.missingAction, { color: colors.primaryForeground }]}>{rejectError.message}</Text>
                ) : null}
              </View>
            ) : (
              <View key={call.id} style={[styles.ledgerRow, { borderBottomColor: colors.border }]}>
                <View style={[styles.ledgerIcon, { backgroundColor: colors.secondary }]}>
                  <Ionicons name="person-outline" size={17} color={colors.primary} />
                </View>
                <View style={styles.ledgerCopy}>
                  <Text numberOfLines={1} style={[styles.ledgerName, { color: colors.foreground }]}>{call.callerName || 'درخواست تماس مشاوره'}</Text>
                  <Text numberOfLines={1} style={[styles.ledgerDetail, { color: colors.mutedForeground }]}>
                    {[call.petName, call.subject, formatTime(call.createdAt)].filter(Boolean).join(' · ')}
                  </Text>
                </View>
                <View style={styles.ledgerActions}>
                  <Pressable
                    testID={`accept-${call.id}`}
                    accessibilityRole="button"
                    accessibilityLabel="پاسخ به تماس"
                    onPress={() => void acceptCall(call.id)}
                    disabled={acceptingId !== null}
                    style={({ pressed }) => [styles.ledgerAction, { backgroundColor: colors.secondary, opacity: pressed ? 0.72 : 1 }]}
                  >
                    {acceptingId === call.id ? <ActivityIndicator size="small" color={colors.primary} /> : <Ionicons name="call" size={16} color={colors.primary} />}
                  </Pressable>
                  <Pressable
                    testID={`reject-${call.id}`}
                    accessibilityRole="button"
                    accessibilityLabel="رد تماس"
                    accessibilityState={{ disabled: rejectingId !== null }}
                    onPress={() => void rejectCall(call.id)}
                    disabled={rejectingId !== null || acceptingId !== null}
                    style={({ pressed }) => [styles.ledgerAction, { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.72 : 1 }]}
                  >
                    {rejectingId === call.id ? <ActivityIndicator size="small" color={colors.destructive} /> : <Ionicons name="close" size={16} color={colors.destructive} />}
                  </Pressable>
                </View>
                {rejectError?.callId === call.id ? (
                  <Text accessibilityRole="alert" style={[styles.missingAction, styles.ledgerError, { color: colors.destructive }]}>{rejectError.message}</Text>
                ) : null}
              </View>
            ))}
          </View>
        ) : (
          <View style={[styles.emptyState, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.emptyIllustration, { backgroundColor: colors.secondary }]}>
              <Ionicons name="chatbubbles-outline" size={26} color={colors.primary} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>فعلاً درخواستی ندارید</Text>
            <Text style={[styles.emptyDescription, { color: colors.mutedForeground }]}>
              وقتی درخواست تازه‌ای ثبت شود، همین‌جا برای پاسخ‌گویی می‌بینید.
            </Text>
          </View>
        )}

        <View style={[styles.shiftHero, { backgroundColor: colors.secondary }]}>
          <PetipyPetMark compact />
          <View style={styles.shiftHeroCopy}>
            <Text style={[styles.shiftHeroEyebrow, { color: colors.secondaryForeground }]}>
              جمع‌بندی شیفت
            </Text>
            <Text style={[styles.shiftHeroTitle, { color: colors.foreground }]}>
              {profile?.displayName ? `شیفتِ ${profile.displayName}` : 'همراهِ شیفت امروز'}
            </Text>
            <Text style={[styles.shiftHeroText, { color: colors.secondaryForeground }]}>
              {pendingCount ? `${pendingCount.toLocaleString('fa-IR')} درخواست در صف پاسخ‌گویی است` : 'صف تماس برای همراهی با خانواده‌ها آماده است'}
            </Text>
          </View>
        </View>

        <View style={[styles.footerNote, { borderTopColor: colors.border }]}>
          <Ionicons name="shield-checkmark-outline" size={16} color={colors.mutedForeground} />
          <Text style={[styles.footerText, { color: colors.mutedForeground }]}>
            دسترسی مشاور و وضعیت تماس از سرویس Petipy بررسی می‌شود.
          </Text>
          <View style={styles.todaySummary}>
            <Text style={[styles.todaySummaryValue, { color: colors.foreground }]}>
              {history.isLoading ? '—' : todayCount.toLocaleString('fa-IR')}
            </Text>
            <Text style={[styles.todaySummaryLabel, { color: colors.mutedForeground }]}>تماس امروز</Text>
            <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />
            <Text style={[styles.todaySummaryValue, { color: colors.foreground }]}>
              {history.isLoading ? '—' : `${Math.floor(todayDuration / 60).toLocaleString('fa-IR')} دقیقه`}
            </Text>
            <Text style={[styles.todaySummaryLabel, { color: colors.mutedForeground }]}>گفت‌وگو</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { paddingHorizontal: 18, paddingTop: 12, paddingBottom: 28, gap: 14 },
  webContent: { paddingTop: 67, paddingBottom: 34 },
  topLine: { flexDirection: 'row-reverse', alignItems: 'center', minHeight: 54, gap: 11 },
  brandMark: { width: 44, height: 44, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  topBrandCopy: { flex: 1, alignItems: 'flex-end', gap: 3 },
  brandName: { maxWidth: '100%', fontSize: 17, fontWeight: '800', writingDirection: 'rtl', textAlign: 'right' },
  brandCaption: { fontSize: 11, writingDirection: 'rtl' },
  topDate: { flex: 1, alignItems: 'flex-start', justifyContent: 'center' },
  dateCaption: { fontSize: 9, writingDirection: 'rtl' },
  shiftHero: { minHeight: 116, flexDirection: 'row-reverse', alignItems: 'center', gap: 13, padding: 13, borderRadius: 24, overflow: 'hidden' },
  shiftHeroCopy: { flex: 1, alignItems: 'flex-end', gap: 5 },
  shiftHeroEyebrow: { fontSize: 11, fontWeight: '700', writingDirection: 'rtl' },
  shiftHeroTitle: { fontSize: 18, fontWeight: '900', textAlign: 'right', writingDirection: 'rtl' },
  shiftHeroText: { fontSize: 12, lineHeight: 18, textAlign: 'right', writingDirection: 'rtl' },
  connectionNotice: { flexDirection: 'row-reverse', alignItems: 'center', gap: 9, borderRadius: 15, borderWidth: 1, paddingHorizontal: 13, paddingVertical: 11 },
  noticeText: { flex: 1, textAlign: 'right', lineHeight: 20, fontSize: 11, writingDirection: 'rtl' },
  queueHeading: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10, marginTop: 4 },
  queueTitleGroup: { flex: 1, alignItems: 'flex-end', gap: 3 },
  sectionKicker: { fontSize: 11, fontWeight: '800', letterSpacing: 0.4, writingDirection: 'rtl' },
  sectionHeading: { fontSize: 21, fontWeight: '800', writingDirection: 'rtl' },
  refreshButton: { width: 42, height: 42, borderWidth: 1, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  queueMeta: { flexDirection: 'row-reverse', alignItems: 'center', gap: 7, marginTop: -10 },
  countBadge: { minWidth: 25, height: 24, borderRadius: 9, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 },
  countText: { fontSize: 11, fontWeight: '800', fontVariant: ['tabular-nums'] },
  queueMetaText: { fontSize: 11, writingDirection: 'rtl' },
  metaSpacer: { flex: 1 },
  pollingLabel: { flexDirection: 'row-reverse', alignItems: 'center', gap: 5 },
  pollingDot: { width: 5, height: 5, borderRadius: 3 },
  pollingText: { fontSize: 10, writingDirection: 'rtl' },
  statusRail: { borderWidth: 1, borderRadius: 22, paddingHorizontal: 13, paddingVertical: 12, elevation: 1 },
  statusRailMain: { gap: 8 },
  availabilityControl: { minHeight: 58, flexDirection: 'row-reverse', alignItems: 'center', gap: 10 },
  statusIcon: { width: 42, height: 42, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  statusCopy: { flex: 1, alignItems: 'flex-end', gap: 2 },
  readiness: { minHeight: 32, flexDirection: 'row-reverse', alignItems: 'center', gap: 6, borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 7 },
  readinessText: { flex: 1, fontSize: 11, lineHeight: 16, textAlign: 'right', writingDirection: 'rtl' },
  emptyState: { borderRadius: 22, borderWidth: 1, paddingHorizontal: 22, paddingVertical: 24, alignItems: 'center', gap: 8 },
  emptyIllustration: { width: 52, height: 52, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
  emptyTitle: { fontSize: 15, fontWeight: '800', writingDirection: 'rtl', textAlign: 'center' },
  emptyDescription: { fontSize: 11, lineHeight: 19, textAlign: 'center', writingDirection: 'rtl' },
  skeletonStack: { gap: 11 },
  skeletonCard: { borderRadius: 20, borderWidth: 1, padding: 15, gap: 15 },
  skeletonHeader: { flexDirection: 'row-reverse', alignItems: 'center', gap: 11 },
  skeletonAvatar: { width: 40, height: 40, borderRadius: 14 },
  skeletonLines: { flex: 1, alignItems: 'flex-end', gap: 8 },
  skeletonLine: { height: 9, borderRadius: 5 },
  skeletonLineLong: { width: '54%' },
  skeletonLineShort: { width: '36%' },
  skeletonAction: { height: 44, borderRadius: 14 },
  retryButton: { minHeight: 43, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 7, borderRadius: 13, paddingHorizontal: 18, marginTop: 5 },
  retryText: { fontSize: 11, fontWeight: '800', writingDirection: 'rtl' },
  queueList: { gap: 0 },
  featuredRequest: { borderWidth: 1, borderRadius: 26, padding: 17, gap: 14, overflow: 'hidden', elevation: 2 },
  featuredTopline: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  featuredStatus: { flexDirection: 'row-reverse', alignItems: 'center', gap: 5, borderRadius: 10, paddingHorizontal: 9, paddingVertical: 6 },
  featuredStatusText: { fontSize: 11, fontWeight: '800', writingDirection: 'rtl' },
  pendingDot: { width: 5, height: 5, borderRadius: 3 },
  featuredEyebrow: { fontSize: 11, fontWeight: '700', writingDirection: 'rtl', opacity: 0.84 },
  featuredIdentity: { flexDirection: 'row-reverse', alignItems: 'center', gap: 11 },
  featuredAvatar: { width: 48, height: 48, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  featuredCopy: { flex: 1, alignItems: 'flex-end', gap: 4 },
  featuredName: { maxWidth: '100%', fontSize: 19, fontWeight: '800', writingDirection: 'rtl', textAlign: 'right' },
  featuredPet: { fontSize: 12, writingDirection: 'rtl', textAlign: 'right', opacity: 0.88 },
  featuredSubject: { borderRightWidth: 2, paddingRight: 10, gap: 4 },
  subjectCaption: { fontSize: 11, writingDirection: 'rtl', textAlign: 'right', opacity: 0.82 },
  subjectValue: { fontSize: 14, fontWeight: '700', lineHeight: 21, writingDirection: 'rtl', textAlign: 'right' },
  featuredMeta: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6 },
  featuredDeadline: { flex: 1, fontSize: 12, fontWeight: '700', writingDirection: 'rtl', textAlign: 'right' },
  featuredActions: { flexDirection: 'row-reverse', gap: 8, marginTop: 1 },
  featuredAccept: { flex: 1.25, minHeight: 49, borderRadius: 14, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 7 },
  featuredAcceptText: { fontSize: 12, fontWeight: '800', writingDirection: 'rtl' },
  featuredReject: { flex: 0.75, minHeight: 49, borderWidth: 1, borderRadius: 14, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 6 },
  featuredRejectText: { fontSize: 12, fontWeight: '700', writingDirection: 'rtl' },
  ledgerRow: { minHeight: 68, flexDirection: 'row-reverse', alignItems: 'center', gap: 9, borderBottomWidth: StyleSheet.hairlineWidth, paddingVertical: 10, flexWrap: 'wrap' },
  ledgerIcon: { width: 34, height: 34, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  ledgerCopy: { flex: 1, minWidth: 95, alignItems: 'flex-end', gap: 4 },
  ledgerName: { maxWidth: '100%', fontSize: 12, fontWeight: '700', writingDirection: 'rtl', textAlign: 'right' },
  ledgerDetail: { maxWidth: '100%', fontSize: 11, lineHeight: 16, writingDirection: 'rtl', textAlign: 'right' },
  ledgerActions: { flexDirection: 'row-reverse', alignItems: 'center', gap: 5 },
  ledgerAction: { width: 34, height: 34, borderWidth: 1, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  ledgerError: { width: '100%', textAlign: 'right' },
  shiftTitle: { fontSize: 12, fontWeight: '800', writingDirection: 'rtl' },
  shiftDetail: { fontSize: 11, lineHeight: 16, textAlign: 'right', writingDirection: 'rtl' },
  missingAction: { fontSize: 11, textAlign: 'right', writingDirection: 'rtl', lineHeight: 18 },
  footerNote: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 13, flexDirection: 'row-reverse', alignItems: 'center', gap: 7, flexWrap: 'wrap' },
  footerText: { fontSize: 11, flex: 1, textAlign: 'right', writingDirection: 'rtl' },
  todaySummary: { width: '100%', flexDirection: 'row-reverse', alignItems: 'center', gap: 7, paddingTop: 3 },
  todaySummaryValue: { fontSize: 11, fontWeight: '800', writingDirection: 'rtl' },
  todaySummaryLabel: { fontSize: 10, writingDirection: 'rtl' },
  summaryDivider: { width: 1, height: 17, marginHorizontal: 4 },
});
