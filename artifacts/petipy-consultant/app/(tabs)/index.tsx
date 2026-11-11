import { useColors } from '@/hooks/useColors';
import { useConsultantSession } from '@/providers/consultant-session';
import {
  acceptIncomingCall,
  getCallHistory,
  getIncomingCalls,
  rejectIncomingCall,
  setConsultantAvailability,
} from '@/lib/petipy-api';
import {
  requestAvailabilityPermissions,
  isAvailabilityServiceRunning,
  setAvailabilityCallState,
  startAvailabilityService,
  stopAvailabilityService,
} from '@/lib/background-monitor';
import { markSystemCallActive } from '@/lib/system-calling';
import {
  cancelIncomingCallNotification,
  stopIncomingCallRingtone,
} from '@/lib/incoming-call-alerts';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
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
  Text,
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
    refresh,
    pushSetupState,
    pushSetupMessage,
  } = useConsultantSession();
  const [availabilityBusy, setAvailabilityBusy] = useState(false);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectError, setRejectError] = useState<{ callId: string; message: string } | null>(null);
  const [serviceRunning, setServiceRunning] = useState(false);
  const isConnected = sessionState === 'connected' && Boolean(token);
  const isAvailable = profile?.manualStatus === 'online';
  const refreshServiceState = () => setServiceRunning(isAvailabilityServiceRunning());

  useEffect(() => {
    refreshServiceState();
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') refreshServiceState();
    });
    return () => subscription.remove();
  }, []);

  const queue = useQuery({
    queryKey: ['petipy', 'incoming-requests'],
    queryFn: () => getIncomingCalls(token as string),
    enabled: isConnected,
    refetchInterval: isConnected ? 5_000 : false,
    refetchIntervalInBackground: true,
  });
  const history = useQuery({
    queryKey: ['petipy', 'call-history'],
    queryFn: () => getCallHistory(token as string),
    enabled: isConnected,
    refetchInterval: isConnected ? 60_000 : false,
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
      Platform.OS !== 'android'
    ) {
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const microphoneGranted = await requestMicrophone();
        if (!microphoneGranted) {
          throw new Error(
            'برای دریافت تماس، دسترسی میکروفون را در تنظیمات Android فعال کنید.',
          );
        }
        const notificationGranted = await requestAvailabilityPermissions();
        if (!notificationGranted && !cancelled) {
          Alert.alert(
            'اعلان‌ها محدود هستند',
            'سرویس foreground همچنان صف تماس را بررسی می‌کند، اما Android ممکن است اعلان تماس را نمایش ندهد.',
          );
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
  }, [isConnected, isAvailable, token, tokenExpiresAt, refresh]);

  async function requestMicrophone() {
    if (Platform.OS !== 'android') return true;
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
  const readinessTone = isConnected && isAvailable && serviceRunning && pushReady
    ? colors.success
    : colors.warning;

  return (
    <SafeAreaView
      style={[styles.safe, { backgroundColor: colors.background }]}
      edges={['top']}
    >
      <ScrollView
        contentContainerStyle={[
          styles.content,
          Platform.OS === 'web' && styles.webContent,
        ]}
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
        <View style={[styles.header, { backgroundColor: colors.primary }]}>
          <View style={styles.headerText}>
            <Text style={[styles.eyebrow, { color: colors.primaryForeground }]}>
              PETIPY CONSULTANT
            </Text>
            <Text style={[styles.greeting, { color: colors.primaryForeground }]}>
              سلام، {profile?.displayName ?? 'مشاور'}
            </Text>
            <Text style={[styles.subtitle, { color: colors.primaryForeground }]}>
              امروز، یک گفت‌وگوی خوب از شما شروع می‌شود
            </Text>
          </View>
          <View
            style={[
              styles.avatar,
              { backgroundColor: colors.card, borderColor: colors.card },
            ]}
          >
            <Ionicons name="paw" size={23} color={colors.primary} />
          </View>
        </View>

        {!isConnected ? (
          <View
            style={[
              styles.connectionNotice,
              { backgroundColor: colors.accent, borderColor: colors.border },
            ]}
          >
            <Ionicons
              name="information-circle-outline"
              size={21}
              color={colors.accentForeground}
            />
            <Text
              style={[
                styles.noticeText,
                { color: colors.accentForeground },
              ]}
            >
              {sessionMessage ??
                'برای ورود مشاور، مسیر رسمی Petipy برای صدور bearer token باید تنظیم شود.'}
            </Text>
          </View>
        ) : null}

        <View style={[styles.availabilityCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.availabilityCopy}>
            <View
              style={[
                styles.statusDot,
                {
                   backgroundColor: readinessTone,
                },
              ]}
            />
            <View style={styles.availabilityText}>
              <Text style={[styles.cardTitle, { color: colors.foreground }]}>
                {isAvailable ? 'وضعیت دریافت تماس' : 'در دسترس نیستید'}
              </Text>
              <Text style={[styles.bodyText, { color: colors.mutedForeground }]}>
                {isAvailable
                  ? serviceRunning && pushReady
                    ? 'سرویس پس‌زمینه و اعلان دستگاه آماده‌اند'
                    : pushSetupMessage ?? (serviceRunning
                      ? 'سرویس فعال است؛ ثبت اعلان هنوز تأیید نشده'
                      : 'سرویس پس‌زمینه فعال نیست؛ تنظیمات را بررسی کنید')
                  : isConnected
                    ? 'برای دریافت تماس، وضعیت خود را فعال کنید'
                    : 'پس از اتصال ورود رسمی Petipy فعال می‌شود'}
              </Text>
            </View>
          </View>
          {availabilityBusy ? (
            <ActivityIndicator color={colors.primary} />
          ) : (
            <Switch
              testID="availability-switch"
              value={Boolean(isAvailable)}
              onValueChange={updateAvailability}
              disabled={!isConnected}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={colors.card}
              accessibilityLabel="وضعیت در دسترس بودن مشاور"
            />
          )}
        </View>
        {isAvailable ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="بررسی وضعیت تماس در تنظیمات"
            onPress={() => router.push('/(tabs)/settings')}
            style={[styles.readiness, { backgroundColor: colors.secondary }]}
            testID="call-readiness-settings"
          >
            <Ionicons name={pushReady && serviceRunning ? 'checkmark-circle' : 'alert-circle-outline'} size={16} color={readinessTone} />
            <Text style={[styles.readinessText, { color: colors.secondaryForeground }]}>
              {pushReady ? 'اعلان دستگاه تأیید شده' : pushSetupMessage ?? `وضعیت اعلان: ${pushSetupState}`}
              {' · '}
              {serviceRunning ? 'سرویس در حال اجرا' : 'سرویس متوقف است'}
            </Text>
            <Ionicons name="chevron-back" size={15} color={colors.secondaryForeground} />
          </Pressable>
        ) : null}

        <View style={[styles.summaryRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.summaryMetric}>
            <Text style={[styles.summaryNumber, { color: colors.foreground }]}>
              {history.isLoading ? '—' : todayCount}
            </Text>
            <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>
              تماس امروز
            </Text>
          </View>
          <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />
          <View style={styles.summaryMetric}>
            <Text style={[styles.summaryNumber, { color: colors.foreground }]}>
              {history.isLoading
                ? '—'
                : `${Math.floor(todayDuration / 60)} دقیقه`}
            </Text>
            <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>
              زمان گفتگو
            </Text>
          </View>
          <View style={[styles.summaryMark, { backgroundColor: colors.accent }]}>
            <Ionicons name="pulse-outline" size={19} color={colors.accentForeground} />
          </View>
        </View>

        <View style={styles.sectionTitle}>
          <Text style={[styles.sectionHeading, { color: colors.foreground }]}>
            صف تماس‌های ورودی
          </Text>
          <Text style={[styles.sectionTrailing, { color: colors.mutedForeground }]}>
            تازه‌سازی هر ۵ ثانیه
          </Text>
        </View>

        {!isConnected ? (
          <View
            style={[
              styles.emptyCard,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <View style={[styles.emptyIcon, { backgroundColor: colors.secondary }]}>
              <Ionicons name="headset-outline" size={27} color={colors.primary} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
              ورود مشاور لازم است
            </Text>
            <Text style={[styles.emptyDescription, { color: colors.mutedForeground }]}>
              ورود رسمی Android هنوز متصل نیست؛ صف پس از تأیید حساب VOICE_CONSULTANT نمایش داده می‌شود.
            </Text>
          </View>
        ) : queue.isLoading ? (
          <View style={styles.loading}>
            <ActivityIndicator color={colors.primary} />
            <Text style={[styles.bodyText, { color: colors.mutedForeground }]}>
              در حال دریافت صف تماس…
            </Text>
          </View>
        ) : queue.isError ? (
          <View
            style={[
              styles.emptyCard,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
              دریافت صف تماس ممکن نشد
            </Text>
            <Pressable
              testID="retry-queue"
              onPress={() => void queue.refetch()}
              style={[styles.retryButton, { backgroundColor: colors.secondary }]}
            >
              <Text style={[styles.retryText, { color: colors.primary }]}>
                تلاش دوباره
              </Text>
            </Pressable>
          </View>
        ) : queue.data?.length ? (
          <View style={styles.queueList}>
            {queue.data.map((call) => (
              <View
                key={call.id}
                style={[
                  styles.callCard,
                  { backgroundColor: colors.card, borderColor: colors.border },
                ]}
              >
                <View style={styles.callHeader}>
                  <View style={[styles.callIcon, { backgroundColor: colors.accent }]}>
                    <Ionicons
                      name="call"
                      size={18}
                      color={colors.accentForeground}
                    />
                  </View>
                  <View style={styles.callCopy}>
                    <Text style={[styles.cardTitle, { color: colors.foreground }]}>
                      {call.callerName || 'درخواست تماس مشاوره'}
                    </Text>
                    <Text style={[styles.bodyText, { color: colors.mutedForeground }]}>
                      {call.petName ? `درباره‌ی ${call.petName} · ${formatTime(call.createdAt)}` : formatTime(call.createdAt)}
                    </Text>
                    {call.subject ? <Text numberOfLines={1} style={[styles.callSubject, { color: colors.accentForeground }]}>{call.subject}</Text> : null}
                  </View>
                </View>
                <View style={styles.callActions}>
                  <Pressable
                    testID={`accept-${call.id}`}
                    accessibilityRole="button"
                    onPress={() => void acceptCall(call.id)}
                    disabled={acceptingId !== null}
                    android_ripple={{ color: colors.secondary }}
                    style={[styles.acceptButton, { backgroundColor: colors.primary }]}
                  >
                    {acceptingId === call.id ? (
                      <ActivityIndicator color={colors.primaryForeground} />
                    ) : (
                      <Ionicons
                        name="call"
                        size={17}
                        color={colors.primaryForeground}
                      />
                    )}
                    <Text
                      style={[
                        styles.acceptText,
                        { color: colors.primaryForeground },
                      ]}
                    >
                      پاسخ
                    </Text>
                  </Pressable>
                  <Pressable
                    testID={`reject-${call.id}`}
                    accessibilityRole="button"
                    accessibilityLabel="رد تماس"
                    accessibilityState={{ disabled: rejectingId !== null }}
                    onPress={() => void rejectCall(call.id)}
                    disabled={rejectingId !== null || acceptingId !== null}
                    android_ripple={{ color: colors.secondary }}
                    style={[
                      styles.rejectButton,
                      { backgroundColor: colors.accent },
                    ]}
                  >
                    {rejectingId === call.id ? <ActivityIndicator color={colors.accentForeground} /> : <Ionicons name="close" size={18} color={colors.accentForeground} />}
                    <Text
                      style={[
                        styles.rejectText,
                        { color: colors.accentForeground },
                      ]}
                    >
                      {rejectingId === call.id ? 'در حال رد' : 'رد'}
                    </Text>
                  </Pressable>
                </View>
                {rejectError?.callId === call.id ? <Text accessibilityRole="alert" style={[styles.missingAction, { color: colors.destructive }]}>{rejectError.message}</Text> : null}
              </View>
            ))}
          </View>
        ) : (
          <View
            style={[
              styles.emptyCard,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <View style={[styles.emptyIcon, { backgroundColor: colors.secondary }]}>
              <Ionicons name="headset-outline" size={27} color={colors.primary} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
              صف تماس خالی است
            </Text>
            <Text style={[styles.emptyDescription, { color: colors.mutedForeground }]}>
              درخواست‌های واقعی تماس پس از ثبت در سرویس Petipy اینجا نمایش داده می‌شوند.
            </Text>
          </View>
        )}

        <View style={[styles.footerNote, { borderTopColor: colors.border }]}>
          <Ionicons
            name="shield-checkmark-outline"
            size={17}
            color={colors.mutedForeground}
          />
          <Text style={[styles.footerText, { color: colors.mutedForeground }]}>
            مجوز حساب مشاور صوتی توسط API Petipy بررسی می‌شود. توقف اجباری Android سرویس و اعلان‌ها را تا بازکردن دوباره‌ی برنامه متوقف می‌کند.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { paddingHorizontal: 18, paddingTop: 14, paddingBottom: 28, gap: 16 },
  webContent: { paddingTop: 67, paddingBottom: 34 },
  header: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 1, borderRadius: 26, paddingHorizontal: 17, paddingVertical: 18, minHeight: 132, overflow: 'hidden' },
  headerText: { alignItems: 'flex-end', flex: 1, gap: 3 },
  eyebrow: { fontSize: 9, fontWeight: '800', letterSpacing: 1.8, marginBottom: 4 },
  greeting: { fontSize: 24, fontWeight: '800', writingDirection: 'rtl' },
  subtitle: { fontSize: 11, marginTop: 3, textAlign: 'right', writingDirection: 'rtl', opacity: 0.86 },
  avatar: { width: 50, height: 50, borderRadius: 19, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginLeft: 14 },
  connectionNotice: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10, borderRadius: 15, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12 },
  noticeText: { flex: 1, textAlign: 'right', lineHeight: 21, fontSize: 12, writingDirection: 'rtl' },
  availabilityCard: { borderRadius: 21, borderWidth: 1, padding: 15, flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center' },
  readiness: { minHeight: 42, borderRadius: 14, paddingHorizontal: 11, flexDirection: 'row-reverse', alignItems: 'center', gap: 7, marginTop: -12 },
  readinessText: { flex: 1, fontSize: 10, lineHeight: 16, textAlign: 'right', writingDirection: 'rtl' },
  availabilityCopy: { flexDirection: 'row-reverse', alignItems: 'center', flex: 1, gap: 11 },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  availabilityText: { alignItems: 'flex-end', gap: 5 },
  cardTitle: { fontSize: 15, fontWeight: '700', writingDirection: 'rtl' },
  bodyText: { fontSize: 11, textAlign: 'right', writingDirection: 'rtl' },
  summaryRow: { minHeight: 86, flexDirection: 'row-reverse', alignItems: 'center', gap: 13, borderRadius: 20, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12 },
  summaryMetric: { flex: 1, alignItems: 'flex-end', gap: 3 },
  summaryDivider: { height: 38, width: StyleSheet.hairlineWidth },
  summaryMark: { height: 37, width: 37, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  summaryNumber: { fontSize: 21, fontWeight: '800', alignSelf: 'flex-end' },
  summaryLabel: { fontSize: 10, writingDirection: 'rtl' },
  sectionTitle: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginTop: 3 },
  sectionHeading: { fontSize: 17, fontWeight: '700', writingDirection: 'rtl' },
  sectionTrailing: { fontSize: 11, writingDirection: 'rtl' },
  emptyCard: { borderRadius: 22, borderWidth: 1, paddingHorizontal: 22, paddingVertical: 25, alignItems: 'center' },
  emptyIcon: { width: 56, height: 56, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  emptyTitle: { fontSize: 15, fontWeight: '700', marginBottom: 7, writingDirection: 'rtl' },
  emptyDescription: { fontSize: 12, lineHeight: 20, textAlign: 'center', writingDirection: 'rtl' },
  loading: { paddingVertical: 30, alignItems: 'center', gap: 10 },
  queueList: { gap: 12 },
  callCard: { borderRadius: 22, borderWidth: 1, padding: 14, gap: 12 },
  callHeader: { flexDirection: 'row-reverse', alignItems: 'center', gap: 11 },
  callIcon: { width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  callCopy: { flex: 1, alignItems: 'flex-end', gap: 4 },
  callSubject: { maxWidth: '100%', fontSize: 10, writingDirection: 'rtl', textAlign: 'right' },
  callActions: { flexDirection: 'row-reverse', gap: 10 },
  acceptButton: { flex: 1, minHeight: 46, borderRadius: 15, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 8 },
  acceptText: { fontSize: 13, fontWeight: '700', writingDirection: 'rtl' },
  rejectButton: { width: 90, minHeight: 46, borderRadius: 15, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 5 },
  rejectText: { fontSize: 13, fontWeight: '600', writingDirection: 'rtl' },
  missingAction: { fontSize: 10, textAlign: 'right', writingDirection: 'rtl' },
  retryButton: { paddingHorizontal: 18, paddingVertical: 10, borderRadius: 14, marginTop: 7 },
  retryText: { fontSize: 12, fontWeight: '700', writingDirection: 'rtl' },
  footerNote: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 14, flexDirection: 'row-reverse', alignItems: 'center', gap: 8 },
  footerText: { fontSize: 11, flex: 1, textAlign: 'right', writingDirection: 'rtl' },
});
