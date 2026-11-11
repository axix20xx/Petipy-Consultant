import { useColors } from '@/hooks/useColors';
import {
  getCallHistory,
  getConsultantCallAnalytics,
  type CallHistoryEntry,
  type ConsultantCallAnalytics,
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

function getTrendBuckets(daily: ConsultantCallAnalytics['daily'], days: ConsultantAnalyticsDays) {
  const sorted = [...daily].sort((a, b) => Date.parse(a.date) - Date.parse(b.date));
  if (days === 7 || days === 30) {
    return sorted.slice(-days).map((item) => ({
      label: new Intl.DateTimeFormat('fa-IR', { day: 'numeric', ...(days === 7 ? { weekday: 'short' as const } : {}) }).format(new Date(item.date)),
      calls: item.calls,
    }));
  }
  const bucketCount = days === 90 ? 13 : 12;
  const buckets = Array.from({ length: bucketCount }, (_, index) => ({
    label: days === 90 ? `ه${index + 1}` : `ماه ${new Intl.NumberFormat('fa-IR').format(index + 1)}`,
    calls: 0,
  }));
  const start = Date.now() - days * 24 * 60 * 60 * 1000;
  for (const item of sorted) {
    const date = Date.parse(item.date);
    if (!Number.isFinite(date) || date < start) continue;
    const elapsedDays = Math.floor((date - start) / (24 * 60 * 60 * 1000));
    const index = Math.min(bucketCount - 1, Math.floor((elapsedDays / days) * bucketCount));
    buckets[index].calls += item.calls;
  }
  return buckets;
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
          backgroundColor: colors.background,
          borderColor: colors.border,
          borderRadius: 17,
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
    android_ripple={{ color: colors.accent, borderless: true }}
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
          style={[styles.periods, { backgroundColor: colors.muted }]}
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
            <View style={[styles.trendCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.trendHeader}>
                <View>
                  <Text style={[styles.trendTitle, { color: colors.foreground }]}>روند تماس‌ها</Text>
                  <Text style={[styles.trendCaption, { color: colors.mutedForeground }]}>بر پایه‌ی آمار ثبت‌شده‌ی سرور</Text>
                </View>
                <View style={[styles.trendBadge, { backgroundColor: colors.secondary }]}>
                  <Ionicons name="stats-chart-outline" size={15} color={colors.primary} />
                  <Text style={[styles.trendBadgeText, { color: colors.secondaryForeground }]}>{days === 365 ? 'ماهانه' : days === 90 ? 'هفتگی' : 'روزانه'}</Text>
                </View>
              </View>
              {(() => {
                const buckets = getTrendBuckets(analytics.data.daily, days);
                const peak = Math.max(1, ...buckets.map((bucket) => bucket.calls));
                return (
                  <View style={styles.chart}>
                    {buckets.map((bucket, index) => (
                      <View key={`${bucket.label}-${index}`} style={styles.chartColumn}>
                        <Text style={[styles.chartValue, { color: colors.mutedForeground }]}>{bucket.calls ? new Intl.NumberFormat('fa-IR').format(bucket.calls) : ''}</Text>
                        <View style={[styles.chartTrack, { backgroundColor: colors.muted }]}>
                          <View style={[styles.chartBar, { backgroundColor: bucket.calls ? colors.primary : colors.input, height: `${Math.max(bucket.calls ? 10 : 4, (bucket.calls / peak) * 100)}%` }]} />
                        </View>
                        <Text numberOfLines={1} style={[styles.chartLabel, { color: colors.mutedForeground }]}>{bucket.label}</Text>
                      </View>
                    ))}
                  </View>
                );
              })()}
            </View>
            <View style={[styles.metricsGrid, { backgroundColor: colors.card, borderColor: colors.border }]}>
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
          <View style={[styles.historyList, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {recentHistory.map((entry, index) => (
              <View
                key={entry.id}
                style={[
                  styles.historyRow,
                  {
                    borderBottomColor: colors.border,
                    borderBottomWidth: index === recentHistory.length - 1 ? 0 : StyleSheet.hairlineWidth,
                  },
                ]}
                testID={`call-history-${entry.id}`}
              >
                <View style={[styles.historyIcon, { backgroundColor: colors.secondary }]}>
                  <Ionicons
                    name={entry.status === 'completed' ? 'checkmark' : 'call-outline'}
                    size={19}
                    color={entry.status === 'completed' ? colors.success : colors.primary}
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
                  <View style={[styles.durationBadge, { backgroundColor: colors.muted }]}>
                    <Text style={[styles.duration, { color: colors.foreground }]}>{formatDuration(entry.durationSeconds)}</Text>
                  </View>
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
                  >{getHistoryStatus(entry)}</Text>
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
    minHeight: 48,
    minWidth: 48,
    marginLeft: 8,
    borderRadius: 17,
  },
  periods: { flexDirection: 'row-reverse', gap: 7, marginBottom: 14, padding: 5, borderRadius: 20 },
  periodButton: {
    alignItems: 'center',
    borderWidth: 1,
    flex: 1,
    justifyContent: 'center',
    minHeight: 43,
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
    gap: 0,
    marginTop: 10,
    borderWidth: 1,
    borderRadius: 22,
    padding: 9,
    overflow: 'hidden',
  },
  metricCard: {
    flexBasis: '46%',
    flexGrow: 1,
    gap: 9,
    minHeight: 94,
    padding: 12,
    borderWidth: 1,
  },
  metricHeading: {
    alignItems: 'center',
    flexDirection: 'row-reverse',
    gap: 7,
  },
  metricLabel: { flexShrink: 1, fontSize: 11, writingDirection: 'rtl' },
  metricValue: { fontSize: 23, fontWeight: '700', writingDirection: 'rtl' },
  trendCard: { borderWidth: 1, borderRadius: 26, padding: 17, marginTop: 12, shadowColor: '#672334', shadowOpacity: 0.04, shadowRadius: 12, shadowOffset: { width: 0, height: 5 }, elevation: 1 },
  trendHeader: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 16 },
  trendTitle: { fontSize: 14, fontWeight: '700', textAlign: 'right', writingDirection: 'rtl' },
  trendCaption: { fontSize: 10, marginTop: 3, textAlign: 'right', writingDirection: 'rtl' },
  trendBadge: { flexDirection: 'row-reverse', alignItems: 'center', gap: 5, paddingHorizontal: 9, paddingVertical: 7, borderRadius: 12 },
  trendBadgeText: { fontSize: 10, fontWeight: '600', writingDirection: 'rtl' },
  chart: { height: 142, flexDirection: 'row-reverse', alignItems: 'stretch', justifyContent: 'space-between', gap: 4, paddingTop: 5 },
  chartColumn: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', gap: 5, minWidth: 0 },
  chartValue: { height: 13, fontSize: 8, fontWeight: '600' },
  chartTrack: { width: '70%', flex: 1, justifyContent: 'flex-end', overflow: 'hidden', borderRadius: 7 },
  chartBar: { width: '100%', minHeight: 3, borderRadius: 7 },
  chartLabel: { maxWidth: '100%', height: 15, fontSize: 8, textAlign: 'center', writingDirection: 'rtl' },
  emptyHint: {
    fontSize: 12,
    marginTop: 9,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  historyHeading: { marginTop: 23, marginBottom: 5 },
  historyList: { marginTop: 6, borderWidth: 1, borderRadius: 26, overflow: 'hidden', shadowColor: '#672334', shadowOpacity: 0.035, shadowRadius: 12, shadowOffset: { width: 0, height: 5 }, elevation: 1 },
  historyRow: {
    alignItems: 'center',
    flexDirection: 'row-reverse',
    gap: 11,
    minHeight: 72,
    paddingHorizontal: 13,
    paddingVertical: 10,
  },
  historyIcon: {
    alignItems: 'center',
    borderRadius: 13,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  historyMain: { alignItems: 'flex-end', flex: 1, gap: 5 },
  historyTitle: { fontSize: 13, fontWeight: '700', writingDirection: 'rtl' },
  historyDate: { fontSize: 10, writingDirection: 'rtl' },
  historyMeta: { alignItems: 'flex-end', gap: 4 },
  durationBadge: { borderRadius: 9, paddingHorizontal: 7, paddingVertical: 4 },
  duration: { fontSize: 10, fontWeight: '700', writingDirection: 'rtl' },
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
