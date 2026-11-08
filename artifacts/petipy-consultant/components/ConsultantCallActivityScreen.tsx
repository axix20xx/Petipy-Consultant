import { useColors } from '@/hooks/useColors';
import {
  getCallHistory,
  getConsultantCallAnalytics,
  type CallHistoryEntry,
  type ConsultantAnalyticsDays,
} from '@/lib/petipy-api';
import { useConsultantSession } from '@/providers/consultant-session';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { Redirect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const PERIODS: Array<{ days: ConsultantAnalyticsDays; label: string }> = [
  { days: 7, label: '۷ روز' },
  { days: 30, label: '۳۰ روز' },
  { days: 90, label: '۹۰ روز' },
  { days: 365, label: '۱ سال' },
];

function formatAnsweredMinutes(totalSpokenSeconds: number) {
  const totalMinutes = Math.floor(totalSpokenSeconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return hours > 0 ? `${hours}س ${minutes}د` : `${totalMinutes} دقیقه`;
}

function formatDuration(seconds?: number) {
  if (typeof seconds !== 'number' || seconds <= 0) return '—';
  const totalMinutes = Math.floor(seconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return hours > 0
    ? `${hours}س ${minutes}د`
    : totalMinutes > 0
      ? `${totalMinutes} دقیقه`
      : `${seconds} ثانیه`;
}

function formatDate(value?: string) {
  if (!value) return 'زمان ثبت نشده';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'زمان ثبت نشده';
  return new Intl.DateTimeFormat('fa-IR', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function getHistoryStatus(entry: CallHistoryEntry) {
  switch (entry.status) {
    case 'completed':
      return 'پایان‌یافته';
    case 'rejected':
      return 'ردشده';
    case 'expired':
      return 'بدون پاسخ';
    case 'cancelled':
      return 'لغوشده';
    case 'failed':
      return 'ناموفق';
    case 'connecting':
      return 'در حال اتصال';
    case 'active':
      return 'فعال';
    default:
      return entry.endReason ?? '';
  }
}

function MetricCard({
  icon,
  label,
  value,
  color,
  colors,
}: {
  icon: 'time-outline' | 'call-outline' | 'checkmark-circle-outline' | 'close-circle-outline';
  label: string;
  value: string;
  color: string;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <View
      style={[
        styles.metricCard,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          borderRadius: colors.radius,
        },
      ]}
    >
      <View style={styles.metricHeading}>
        <Ionicons name={icon} size={18} color={color} />
        <Text style={[styles.metricLabel, { color: colors.mutedForeground }]}>
          {label}
        </Text>
      </View>
      <Text style={[styles.metricValue, { color: colors.foreground }]}>
        {value}
      </Text>
    </View>
  );
}

function RefreshButton({
  refreshing,
  onPress,
  colors,
}: {
  refreshing: boolean;
  onPress: () => void;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="تازه‌سازی آمار و سوابق"
      disabled={refreshing}
      onPress={onPress}
      hitSlop={12}
      testID="refresh-call-activity"
      style={styles.refreshButton}
    >
      {refreshing ? (
        <ActivityIndicator size="small" color={colors.primary} />
      ) : (
        <Ionicons name="refresh" size={22} color={colors.primary} />
      )}
    </Pressable>
  );
}

export default function ConsultantCallActivityScreen() {
  const colors = useColors();
  const { token, state } = useConsultantSession();
  const [days, setDays] = useState<ConsultantAnalyticsDays>(30);
  const isAuthenticatedConsultant = state === 'connected' && Boolean(token);

  const analytics = useQuery({
    queryKey: ['petipy', 'consultant-call-analytics', days],
    queryFn: () => getConsultantCallAnalytics(token as string, days),
    enabled: isAuthenticatedConsultant,
    refetchInterval: isAuthenticatedConsultant ? 60_000 : false,
  });
  const history = useQuery({
    queryKey: ['petipy', 'call-history'],
    queryFn: () => getCallHistory(token as string),
    enabled: isAuthenticatedConsultant,
    refetchInterval: isAuthenticatedConsultant ? 60_000 : false,
  });

  const refreshAll = useCallback(async () => {
    await Promise.all([analytics.refetch(), history.refetch()]);
  }, [analytics.refetch, history.refetch]);

  const refreshing = analytics.isRefetching || history.isRefetching;
  const recentHistory = useMemo(() => {
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    return (history.data ?? []).filter((entry) => {
      const timestamp = entry.startedAt ? Date.parse(entry.startedAt) : NaN;
      return Number.isFinite(timestamp) && timestamp >= cutoff;
    });
  }, [days, history.data]);

  if (!isAuthenticatedConsultant) {
    return <Redirect href="/sign-in" />;
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
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void refreshAll()}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={[styles.eyebrow, { color: colors.primary }]}>
              CONSULTANT ACTIVITY
            </Text>
            <Text style={[styles.title, { color: colors.foreground }]}>
              آمار و سوابق تماس
            </Text>
            <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
              عملکرد تماس‌های مشاوره‌ی شما
            </Text>
          </View>
          <RefreshButton
            refreshing={refreshing}
            onPress={() => void refreshAll()}
            colors={colors}
          />
        </View>

        <View
          accessibilityRole="tablist"
          style={styles.periods}
          testID="analytics-period-filter"
        >
          {PERIODS.map((period) => {
            const selected = days === period.days;
            return (
              <Pressable
                key={period.days}
                accessibilityRole="tab"
                accessibilityState={{ selected }}
                onPress={() => setDays(period.days)}
                style={[
                  styles.periodButton,
                  {
                    backgroundColor: selected ? colors.primary : colors.card,
                    borderColor: selected ? colors.primary : colors.border,
                    borderRadius: colors.radius,
                  },
                ]}
                testID={`analytics-period-${period.days}`}
              >
                <Text
                  style={[
                    styles.periodLabel,
                    {
                      color: selected
                        ? colors.primaryForeground
                        : colors.mutedForeground,
                    },
                  ]}
                >
                  {period.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.sectionHeading}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
            خلاصه‌ی عملکرد
          </Text>
          <Text style={[styles.sectionHint, { color: colors.mutedForeground }]}>
            {days === 365 ? '۱۲ ماه گذشته' : `${days} روز گذشته`}
          </Text>
        </View>

        {analytics.isPending ? (
          <View
            style={[
              styles.stateCard,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <ActivityIndicator color={colors.primary} />
            <Text style={[styles.stateText, { color: colors.mutedForeground }]}>
              در حال دریافت آمار تماس‌ها…
            </Text>
          </View>
        ) : analytics.isError ? (
          <View
            style={[
              styles.stateCard,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <Ionicons
              name="cloud-offline-outline"
              size={25}
              color={colors.destructive}
            />
            <Text style={[styles.stateTitle, { color: colors.foreground }]}>
              دریافت آمار ممکن نشد
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => void analytics.refetch()}
              style={[
                styles.retryButton,
                { backgroundColor: colors.secondary, borderRadius: colors.radius },
              ]}
              testID="retry-analytics"
            >
              <Text style={[styles.retryText, { color: colors.primary }]}>
                تلاش دوباره
              </Text>
            </Pressable>
          </View>
        ) : analytics.data ? (
          <>
            <View style={styles.metricsGrid}>
              <MetricCard
                icon="time-outline"
                label="دقایق پاسخ‌گویی"
                value={formatAnsweredMinutes(analytics.data.totalSpokenSeconds)}
                color={colors.primary}
                colors={colors}
              />
              <MetricCard
                icon="call-outline"
                label="کل تماس‌ها"
                value={String(analytics.data.totalCalls)}
                color={colors.warning}
                colors={colors}
              />
              <MetricCard
                icon="checkmark-circle-outline"
                label="نرخ پاسخ‌گویی"
                value={`${new Intl.NumberFormat('fa-IR', {
                  maximumFractionDigits: 1,
                }).format(analytics.data.answerRate)}٪`}
                color={colors.success}
                colors={colors}
              />
              <MetricCard
                icon="close-circle-outline"
                label="تماس‌های بی‌پاسخ"
                value={String(analytics.data.missedCalls)}
                color={colors.destructive}
                colors={colors}
              />
            </View>
            {analytics.data.totalCalls === 0 ? (
              <Text
                style={[styles.emptyHint, { color: colors.mutedForeground }]}
                testID="analytics-empty"
              >
                در این بازه تماسی ثبت نشده است.
              </Text>
            ) : null}
          </>
        ) : null}

        <View style={[styles.sectionHeading, styles.historyHeading]}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
            تماس‌های اخیر
          </Text>
          <Text style={[styles.sectionHint, { color: colors.mutedForeground }]}>
            {recentHistory.length} تماس
          </Text>
        </View>

        {history.isPending ? (
          <View style={styles.loadingHistory}>
            <ActivityIndicator color={colors.primary} />
            <Text style={[styles.stateText, { color: colors.mutedForeground }]}>
              در حال دریافت سوابق…
            </Text>
          </View>
        ) : history.isError ? (
          <View
            style={[
              styles.stateCard,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <Text style={[styles.stateTitle, { color: colors.foreground }]}>
              دریافت سوابق ممکن نشد
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => void history.refetch()}
              style={[
                styles.retryButton,
                { backgroundColor: colors.secondary, borderRadius: colors.radius },
              ]}
              testID="retry-history"
            >
              <Text style={[styles.retryText, { color: colors.primary }]}>
                تلاش دوباره
              </Text>
            </Pressable>
          </View>
        ) : recentHistory.length > 0 ? (
          <View style={styles.historyList}>
            {recentHistory.map((entry) => (
              <View
                key={entry.id}
                style={[
                  styles.historyRow,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                    borderRadius: colors.radius,
                  },
                ]}
                testID={`call-history-${entry.id}`}
              >
                <View
                  style={[
                    styles.historyIcon,
                    { backgroundColor: colors.secondary },
                  ]}
                >
                  <Ionicons
                    name="call-outline"
                    size={19}
                    color={colors.primary}
                  />
                </View>
                <View style={styles.historyMain}>
                  <Text
                    style={[styles.historyTitle, { color: colors.foreground }]}
                  >
                    تماس مشاوره
                  </Text>
                  <Text
                    style={[
                      styles.historyDate,
                      { color: colors.mutedForeground },
                    ]}
                  >
                    {formatDate(entry.startedAt)}
                  </Text>
                </View>
                <View style={styles.historyMeta}>
                  <Text
                    style={[styles.duration, { color: colors.foreground }]}
                  >
                    {formatDuration(entry.durationSeconds)}
                  </Text>
                  <Text
                    style={[
                      styles.historyStatus,
                      {
                        color:
                          entry.status === 'completed'
                            ? colors.success
                            : entry.status === 'rejected' ||
                                entry.status === 'expired' ||
                                entry.status === 'failed'
                              ? colors.destructive
                              : colors.mutedForeground,
                      },
                    ]}
                  >
                    {getHistoryStatus(entry)}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        ) : (
          <View
            style={[
              styles.stateCard,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
            testID="history-empty"
          >
            <View
              style={[
                styles.emptyIcon,
                { backgroundColor: colors.secondary, borderRadius: colors.radius },
              ]}
            >
              <Ionicons name="time-outline" size={26} color={colors.primary} />
            </View>
            <Text style={[styles.stateTitle, { color: colors.foreground }]}>
              تماسی در این بازه ثبت نشده
            </Text>
            <Text style={[styles.stateText, { color: colors.mutedForeground }]}>
              سوابق واقعی تماس‌های مشاوره‌ی شما پس از ثبت در اینجا نمایش داده می‌شوند.
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { padding: 22, paddingTop: 18, paddingBottom: 28, gap: 8 },
  webContent: { paddingTop: 67, paddingBottom: 34 },
  header: {
    alignItems: 'center',
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  headerText: { alignItems: 'flex-end', flex: 1, gap: 4 },
  eyebrow: { fontSize: 10, fontWeight: '700', letterSpacing: 1.6 },
  title: { fontSize: 27, fontWeight: '700', writingDirection: 'rtl' },
  subtitle: { fontSize: 12, writingDirection: 'rtl' },
  refreshButton: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    minWidth: 44,
    marginLeft: 8,
  },
  periods: { flexDirection: 'row-reverse', gap: 8, marginBottom: 12 },
  periodButton: {
    alignItems: 'center',
    borderWidth: 1,
    flex: 1,
    justifyContent: 'center',
    minHeight: 40,
    paddingHorizontal: 8,
  },
  periodLabel: { fontSize: 12, fontWeight: '700', writingDirection: 'rtl' },
  sectionHeading: {
    alignItems: 'baseline',
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  sectionTitle: { fontSize: 17, fontWeight: '700', writingDirection: 'rtl' },
  sectionHint: { fontSize: 11, writingDirection: 'rtl' },
  metricsGrid: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 10,
  },
  metricCard: {
    borderWidth: 1,
    flexBasis: '47%',
    flexGrow: 1,
    gap: 12,
    minHeight: 104,
    padding: 14,
  },
  metricHeading: {
    alignItems: 'center',
    flexDirection: 'row-reverse',
    gap: 7,
  },
  metricLabel: { flexShrink: 1, fontSize: 11, writingDirection: 'rtl' },
  metricValue: { fontSize: 23, fontWeight: '700', writingDirection: 'rtl' },
  emptyHint: {
    fontSize: 12,
    marginTop: 9,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  historyHeading: { marginTop: 23, marginBottom: 5 },
  historyList: { gap: 10, marginTop: 6 },
  historyRow: {
    alignItems: 'center',
    borderWidth: 1,
    flexDirection: 'row-reverse',
    gap: 10,
    minHeight: 76,
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  historyIcon: {
    alignItems: 'center',
    borderRadius: 15,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  historyMain: { alignItems: 'flex-end', flex: 1, gap: 5 },
  historyTitle: { fontSize: 13, fontWeight: '700', writingDirection: 'rtl' },
  historyDate: { fontSize: 10, writingDirection: 'rtl' },
  historyMeta: { alignItems: 'flex-end', gap: 5 },
  duration: { fontSize: 12, fontWeight: '700', writingDirection: 'rtl' },
  historyStatus: { fontSize: 10, writingDirection: 'rtl' },
  stateCard: {
    alignItems: 'center',
    borderRadius: 21,
    borderWidth: 1,
    gap: 10,
    marginTop: 10,
    padding: 20,
  },
  stateTitle: {
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  stateText: {
    fontSize: 12,
    lineHeight: 20,
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  loadingHistory: { alignItems: 'center', gap: 10, paddingVertical: 25 },
  retryButton: { marginTop: 4, paddingHorizontal: 17, paddingVertical: 10 },
  retryText: { fontSize: 12, fontWeight: '700', writingDirection: 'rtl' },
  emptyIcon: {
    alignItems: 'center',
    height: 54,
    justifyContent: 'center',
    marginBottom: 2,
    width: 54,
  },
});
