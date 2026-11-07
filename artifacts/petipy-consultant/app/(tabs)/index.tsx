import { useColors } from '@/hooks/useColors';
import { useConsultantSession } from '@/providers/consultant-session';
import {
  acceptIncomingCall,
  getCallHistory,
  getIncomingCalls,
  setConsultantAvailability,
} from '@/lib/petipy-api';
import {
  requestAvailabilityPermissions,
  startAvailabilityService,
  stopAvailabilityService,
} from '@/lib/background-monitor';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  PermissionsAndroid,
  Platform,
  Pressable,
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
  } = useConsultantSession();
  const [availabilityBusy, setAvailabilityBusy] = useState(false);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const isConnected = sessionState === 'connected' && Boolean(token);
  const isAvailable = profile?.manualStatus === 'online';

  const queue = useQuery({
    queryKey: ['petipy', 'incoming-requests'],
    queryFn: () => getIncomingCalls(token as string),
    enabled: isConnected,
    refetchInterval: isConnected ? 10_000 : false,
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
        const notificationGranted = await requestAvailabilityPermissions();
        if (!microphoneGranted || !notificationGranted) {
          throw new Error(
            'برای دریافت تماس در پس‌زمینه، مجوز میکروفون و اعلان لازم است.',
          );
        }
        await startAvailabilityService(token, tokenExpiresAt);
      } catch (error) {
        await stopAvailabilityService();
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
            'اجازه‌ی اعلان لازم است',
            'برای دیدن درخواست تماس در پس‌زمینه، اعلان‌های Petipy را فعال کنید.',
          );
          return;
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
    } catch (error) {
      Alert.alert(
        'وضعیت تغییر نکرد',
        error instanceof Error
          ? error.message
          : 'اتصال به Petipy برقرار نشد.',
      );
    } finally {
      setAvailabilityBusy(false);
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
      >
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={[styles.eyebrow, { color: colors.primary }]}>
              PETIPY CONSULTANT
            </Text>
            <Text style={[styles.greeting, { color: colors.foreground }]}>
              سلام، {profile?.displayName ?? 'مشاور'}
            </Text>
            <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
              آماده‌ی همراهی با حیوانات خانگی باشید
            </Text>
          </View>
          <View
            style={[
              styles.avatar,
              { backgroundColor: colors.secondary, borderColor: colors.border },
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

        <View
          style={[
            styles.availabilityCard,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <View style={styles.availabilityCopy}>
            <View
              style={[
                styles.statusDot,
                {
                  backgroundColor: isAvailable
                    ? colors.success
                    : colors.warning,
                },
              ]}
            />
            <View style={styles.availabilityText}>
              <Text style={[styles.cardTitle, { color: colors.foreground }]}>
                {isAvailable ? 'آماده‌ی دریافت تماس' : 'در دسترس نیستید'}
              </Text>
              <Text style={[styles.bodyText, { color: colors.mutedForeground }]}>
                {isAvailable
                  ? 'سرویس تماس در پس‌زمینه فعال می‌ماند'
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

        <View style={styles.summaryRow}>
          <View
            style={[
              styles.summaryCard,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <View style={[styles.summaryIcon, { backgroundColor: colors.secondary }]}>
              <Ionicons name="call-outline" size={20} color={colors.primary} />
            </View>
            <Text style={[styles.summaryNumber, { color: colors.foreground }]}>
              {history.isLoading ? '—' : todayCount}
            </Text>
            <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>
              تماس امروز
            </Text>
          </View>
          <View
            style={[
              styles.summaryCard,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <View style={[styles.summaryIcon, { backgroundColor: colors.accent }]}>
              <Ionicons
                name="time-outline"
                size={20}
                color={colors.accentForeground}
              />
            </View>
            <Text style={[styles.summaryNumber, { color: colors.foreground }]}>
              {history.isLoading
                ? '—'
                : `${Math.floor(todayDuration / 60)} دقیقه`}
            </Text>
            <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>
              زمان گفتگو
            </Text>
          </View>
        </View>

        <View style={styles.sectionTitle}>
          <Text style={[styles.sectionHeading, { color: colors.foreground }]}>
            صف تماس‌های ورودی
          </Text>
          <Text style={[styles.sectionTrailing, { color: colors.mutedForeground }]}>
            تازه‌سازی هر ۱۰ ثانیه
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
                      درخواست تماس مشاوره
                    </Text>
                    <Text style={[styles.bodyText, { color: colors.mutedForeground }]}>
                      {formatTime(call.createdAt)}
                    </Text>
                  </View>
                </View>
                <View style={styles.callActions}>
                  <Pressable
                    testID={`accept-${call.id}`}
                    accessibilityRole="button"
                    onPress={() => void acceptCall(call.id)}
                    disabled={acceptingId !== null}
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
                  <View
                    accessibilityLabel="رد تماس در دسترس نیست؛ درخواست تا زمان انقضا در صف می‌ماند"
                    style={[
                      styles.rejectButton,
                      { backgroundColor: colors.muted },
                    ]}
                  >
                    <Ionicons
                      name="close"
                      size={18}
                      color={colors.mutedForeground}
                    />
                    <Text
                      style={[
                        styles.rejectText,
                        { color: colors.mutedForeground },
                      ]}
                    >
                      رد
                    </Text>
                  </View>
                </View>
                <Text style={[styles.missingAction, { color: colors.mutedForeground }]}>
                  رد در API موجود نیست؛ درخواست تا زمان انقضا در صف می‌ماند.
                </Text>
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
            مجوز حساب مشاور صوتی توسط API Petipy بررسی می‌شود.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { paddingHorizontal: 22, paddingTop: 14, paddingBottom: 28, gap: 20 },
  webContent: { paddingTop: 67, paddingBottom: 34 },
  header: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 },
  headerText: { alignItems: 'flex-end', flex: 1 },
  eyebrow: { fontSize: 10, fontWeight: '700', letterSpacing: 1.8, marginBottom: 7 },
  greeting: { fontSize: 27, fontWeight: '700', writingDirection: 'rtl' },
  subtitle: { fontSize: 13, marginTop: 5, textAlign: 'right', writingDirection: 'rtl' },
  avatar: { width: 48, height: 48, borderRadius: 18, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginLeft: 14 },
  connectionNotice: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10, borderRadius: 15, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12 },
  noticeText: { flex: 1, textAlign: 'right', lineHeight: 21, fontSize: 12, writingDirection: 'rtl' },
  availabilityCard: { borderRadius: 22, borderWidth: 1.5, padding: 17, flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', shadowOpacity: 0.06, shadowRadius: 12, elevation: 2 },
  availabilityCopy: { flexDirection: 'row-reverse', alignItems: 'center', flex: 1, gap: 11 },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  availabilityText: { alignItems: 'flex-end', gap: 5 },
  cardTitle: { fontSize: 15, fontWeight: '700', writingDirection: 'rtl' },
  bodyText: { fontSize: 11, textAlign: 'right', writingDirection: 'rtl' },
  summaryRow: { flexDirection: 'row-reverse', gap: 12 },
  summaryCard: { flex: 1, borderRadius: 20, borderWidth: 1, padding: 15, minHeight: 128, alignItems: 'flex-end', justifyContent: 'space-between' },
  summaryIcon: { width: 36, height: 36, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  summaryNumber: { fontSize: 23, fontWeight: '700', alignSelf: 'flex-end' },
  summaryLabel: { fontSize: 12, writingDirection: 'rtl' },
  sectionTitle: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginTop: 3 },
  sectionHeading: { fontSize: 17, fontWeight: '700', writingDirection: 'rtl' },
  sectionTrailing: { fontSize: 11, writingDirection: 'rtl' },
  emptyCard: { borderRadius: 22, borderWidth: 1, paddingHorizontal: 22, paddingVertical: 25, alignItems: 'center' },
  emptyIcon: { width: 56, height: 56, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  emptyTitle: { fontSize: 15, fontWeight: '700', marginBottom: 7, writingDirection: 'rtl' },
  emptyDescription: { fontSize: 12, lineHeight: 20, textAlign: 'center', writingDirection: 'rtl' },
  loading: { paddingVertical: 30, alignItems: 'center', gap: 10 },
  queueList: { gap: 12 },
  callCard: { borderRadius: 22, borderWidth: 1.5, padding: 15, gap: 12 },
  callHeader: { flexDirection: 'row-reverse', alignItems: 'center', gap: 11 },
  callIcon: { width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  callCopy: { flex: 1, alignItems: 'flex-end', gap: 5 },
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
