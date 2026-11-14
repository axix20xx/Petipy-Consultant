import { useColors } from '@/hooks/useColors';
import { PetipyPetMark } from '@/components/PetipyPetMark';
import { PetipyText as Text } from '@/components/PetipyText';
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
  compact = false,
}: {
  icon: 'time-outline' | 'call-outline' | 'checkmark-circle-outline' | 'close-circle-outline';
  label: string;
  value: string;
  color: string;
  colors: ReturnType<typeof useColors>;
  compact?: boolean;
}) {
  return (
    <View
      style={[
        compact ? styles.metricCompact : styles.metricCard,
        {
          backgroundColor: compact ? colors.card : colors.background,
          borderColor: colors.border,
          borderRadius: compact ? 0 : 17,
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
      style={({ pressed }) => [
        styles.refreshButton,
        { backgroundColor: colors.primaryForeground, opacity: pressed ? 0.78 : 1 },
      ]}
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
        <View style={styles.historyTop}>
          <PetipyPetMark compact />
          <View style={styles.historyTopCopy}>
            <Text style={[styles.historyEyebrow, { color: colors.primary }]}>ردّ همراهی‌ها</Text>
            <Text style={[styles.historyPageTitle, { color: colors.foreground }]}>گزارش تماس</Text>
          </View>
          <RefreshButton refreshing={refreshing} onPress={() => void refreshAll()} colors={colors} />
        </View>

        <View style={styles.periodIntro}>
          <View style={styles.periodTitleCopy}>
            <Text style={[styles.periodTitle, { color: colors.foreground }]}>بازه‌ی گزارش</Text>
            <Text style={[styles.sectionHint, { color: colors.mutedForeground }]}>یک بازه برای دیدن روند انتخاب کنید</Text>
          </View>
          <Ionicons name="calendar-outline" size={18} color={colors.primary} />
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
                    backgroundColor: selected ? colors.primary : 'transparent',
                    borderColor: selected ? colors.primary : 'transparent',
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
          <View style={styles.sectionTitleCopy}>
            <Text style={[styles.sectionKicker, { color: colors.primary }]}>گزارش زنده</Text>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>خلاصه‌ی عملکرد</Text>
          </View>
          <View style={[styles.periodStamp, { backgroundColor: colors.secondary }]}>
            <Text style={[styles.periodStampText, { color: colors.secondaryForeground }]}>
              {days === 365 ? '۱۲ ماه گذشته' : `${new Intl.NumberFormat('fa-IR').format(days)} روز گذشته`}
            </Text>
          </View>
        </View>

        {analytics.isPending ? (
          <View style={[styles.analyticsSkeleton, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.skeletonMetrics}>
              {[0, 1, 2, 3].map((item) => (
                <View key={item} style={[styles.skeletonMetric, { backgroundColor: colors.muted }]}>
                  <View style={[styles.skeletonLine, styles.skeletonLineShort, { backgroundColor: colors.input }]} />
                  <View style={[styles.skeletonLine, styles.skeletonLineWide, { backgroundColor: colors.input }]} />
                </View>
              ))}
            </View>
            <Text style={[styles.stateText, { color: colors.mutedForeground }]}>در حال دریافت آمار تماس‌ها…</Text>
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
            <View style={[styles.answeredHero, { backgroundColor: colors.primary }]}>
              <View style={styles.answeredHeroTop}>
                <View style={[styles.answeredPeriod, { backgroundColor: colors.primaryForeground }]}>
                  <Text style={[styles.answeredPeriodText, { color: colors.primary }]}>
                    {days === 365 ? '۱۲ ماه گذشته' : `${new Intl.NumberFormat('fa-IR').format(days)} روز گذشته`}
                  </Text>
                </View>
                <View style={styles.answeredTitleCopy}>
                  <Text style={[styles.answeredLabel, { color: colors.primaryForeground }]}>دقایق پاسخ‌گویی</Text>
                  <Text style={[styles.answeredCaption, { color: colors.primaryForeground }]}>بر پایه‌ی زمان گفت‌وگوی ثبت‌شده در سرور</Text>
                </View>
              </View>
              <View style={styles.answeredValueLine}>
                <Text style={[styles.answeredValue, { color: colors.primaryForeground }]}>
                  {formatAnsweredMinutes(analytics.data.totalSpokenSeconds)}
                </Text>
              </View>
            </View>
            <View style={[styles.metricsStrip, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <MetricCard
                compact
                icon="call-outline"
                label="کل تماس‌ها"
                value={String(analytics.data.totalCalls)}
                color={colors.primary}
                colors={colors}
              />
              <View style={[styles.metricDivider, { backgroundColor: colors.border }]} />
              <MetricCard
                compact
                icon="checkmark-circle-outline"
                label="نرخ پاسخ‌گویی"
                value={`${new Intl.NumberFormat('fa-IR', {
                  maximumFractionDigits: 1,
                }).format(analytics.data.answerRate)}٪`}
                color={colors.success}
                colors={colors}
              />
              <View style={[styles.metricDivider, { backgroundColor: colors.border }]} />
              <MetricCard
                compact
                icon="close-circle-outline"
                label="بی‌پاسخ"
                value={String(analytics.data.missedCalls)}
                color={colors.destructive}
                colors={colors}
              />
            </View>
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
          <View style={styles.sectionTitleCopy}>
            <Text style={[styles.sectionKicker, { color: colors.primary }]}>دفترچه‌ی شخصی</Text>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>تماس‌های اخیر</Text>
          </View>
          <View style={[styles.periodStamp, { backgroundColor: colors.muted }]}>
            <Text style={[styles.periodStampText, { color: colors.mutedForeground }]}>
              {new Intl.NumberFormat('fa-IR').format(recentHistory.length)} تماس
            </Text>
          </View>
        </View>

        {history.isPending ? (
          <View style={[styles.historySkeleton, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {[0, 1, 2].map((item) => (
              <View key={item} style={[styles.skeletonHistoryRow, { borderBottomColor: colors.border }]}>
                <View style={[styles.skeletonHistoryIcon, { backgroundColor: colors.muted }]} />
                <View style={styles.skeletonHistoryText}>
                  <View style={[styles.skeletonLine, styles.skeletonLineWide, { backgroundColor: colors.muted }]} />
                  <View style={[styles.skeletonLine, styles.skeletonLineShort, { backgroundColor: colors.muted }]} />
                </View>
                <View style={[styles.skeletonHistoryMeta, { backgroundColor: colors.muted }]} />
              </View>
            ))}
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
            <View style={[styles.timelineRail, { backgroundColor: colors.border }]} />
            {recentHistory.map((entry, index) => (
              <View
                key={entry.id}
                style={[
                  styles.historyRow,
                  {
                    borderBottomWidth: index === recentHistory.length - 1 ? 0 : StyleSheet.hairlineWidth,
                    borderBottomColor: colors.border,
                  },
                ]}
                testID={`call-history-${entry.id}`}
              >
                <View style={[styles.timelineDot, { backgroundColor: entry.status === 'completed' ? colors.success : colors.warning, borderColor: colors.background }]} />
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
  content: { width: '100%', maxWidth: 620, alignSelf: 'center', paddingHorizontal: 18, paddingTop: 14, paddingBottom: 34, gap: 13 },
  webContent: { paddingTop: 67, paddingBottom: 34 },
  historyTop: { minHeight: 88, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 },
  historyTopCopy: { alignItems: 'flex-end', gap: 2 },
  historyEyebrow: { fontSize: 11, fontWeight: '700', writingDirection: 'rtl' },
  historyPageTitle: { fontSize: 25, fontWeight: '800', writingDirection: 'rtl' },
  hero: { minHeight: 80, borderRadius: 18, padding: 14, overflow: 'hidden', justifyContent: 'space-between', marginBottom: 4 },
  heroTop: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8 },
  heroMark: { width: 35, height: 35, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  heroBrand: { flex: 1, fontSize: 9, fontWeight: '800', letterSpacing: 1.1 },
  heroCopy: { alignItems: 'flex-end', gap: 3 },
  heroRing: { position: 'absolute', left: -48, bottom: -88, width: 190, height: 190, borderRadius: 95, borderWidth: 1, opacity: 0.12 },
  eyebrow: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5, writingDirection: 'rtl', opacity: 0.82 },
  title: { fontSize: 25, fontWeight: '800', writingDirection: 'rtl' },
  subtitle: { fontSize: 11, writingDirection: 'rtl', opacity: 0.82 },
  refreshButton: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 46,
    minWidth: 46,
    borderRadius: 17,
  },
  periodIntro: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8, marginTop: 2 },
  periodTitleCopy: { flex: 1, alignItems: 'flex-end', gap: 2 },
  periodTitle: { fontSize: 14, fontWeight: '800', writingDirection: 'rtl' },
  periods: { flexDirection: 'row-reverse', gap: 6, marginBottom: 5, padding: 5, borderRadius: 16 },
  periodButton: {
    alignItems: 'center',
    borderWidth: 1,
    flex: 1,
    justifyContent: 'center',
    minHeight: 42,
    paddingHorizontal: 8,
  },
  periodLabel: { fontSize: 12, fontWeight: '700', writingDirection: 'rtl' },
  sectionHeading: {
    alignItems: 'center',
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  sectionTitleCopy: { alignItems: 'flex-end', gap: 2 },
  sectionKicker: { fontSize: 11, fontWeight: '800', writingDirection: 'rtl' },
  sectionTitle: { fontSize: 17, fontWeight: '800', writingDirection: 'rtl' },
  sectionHint: { fontSize: 12, writingDirection: 'rtl' },
  periodStamp: { borderRadius: 10, paddingHorizontal: 9, paddingVertical: 6 },
  periodStampText: { fontSize: 11, fontWeight: '700', writingDirection: 'rtl' },
  answeredHero: { minHeight: 176, borderRadius: 28, padding: 20, gap: 16, overflow: 'hidden', elevation: 2 },
  answeredHeroTop: { flexDirection: 'row-reverse', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 },
  answeredTitleCopy: { flex: 1, alignItems: 'flex-end', gap: 5 },
  answeredLabel: { fontSize: 12, fontWeight: '700', writingDirection: 'rtl' },
  answeredCaption: { maxWidth: 230, fontSize: 11, lineHeight: 18, textAlign: 'right', writingDirection: 'rtl', opacity: 0.84 },
  answeredPeriod: { borderRadius: 10, paddingHorizontal: 9, paddingVertical: 6 },
  answeredPeriodText: { fontSize: 10, fontWeight: '800', writingDirection: 'rtl' },
  answeredValueLine: { flexDirection: 'row-reverse', alignItems: 'baseline', marginTop: 'auto' },
  answeredValue: { fontSize: 40, fontWeight: '800', writingDirection: 'rtl' },
  metricsStrip: {
    flexDirection: 'row-reverse',
    borderWidth: 1,
    borderRadius: 21,
    paddingVertical: 15,
    paddingHorizontal: 8,
    alignItems: 'stretch',
  },
  metricDivider: { width: StyleSheet.hairlineWidth, alignSelf: 'stretch', marginVertical: 2 },
  analyticsSkeleton: { minHeight: 188, borderWidth: 1, borderRadius: 21, padding: 13, gap: 14, marginTop: 5 },
  skeletonMetrics: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8 },
  skeletonMetric: { flexBasis: '45%', flexGrow: 1, minHeight: 70, borderRadius: 13, padding: 11, justifyContent: 'space-between', alignItems: 'flex-end' },
  skeletonLine: { height: 8, borderRadius: 5 },
  skeletonLineShort: { width: '36%' },
  skeletonLineWide: { width: '63%' },
  metricCard: {
    flexBasis: '46%',
    flexGrow: 1,
    gap: 9,
    minHeight: 94,
    padding: 12,
    borderWidth: 1,
  },
  metricCompact: { flex: 1, minWidth: 0, alignItems: 'flex-end', justifyContent: 'space-between', gap: 7, paddingHorizontal: 8 },
  metricHeading: {
    alignItems: 'center',
    flexDirection: 'row-reverse',
    gap: 7,
  },
  metricLabel: { flexShrink: 1, fontSize: 11, writingDirection: 'rtl' },
  metricValue: { fontSize: 23, fontWeight: '700', writingDirection: 'rtl' },
  trendCard: { borderWidth: 1, borderRadius: 21, padding: 16, marginTop: 5, elevation: 1 },
  trendHeader: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 16 },
  trendTitle: { fontSize: 14, fontWeight: '700', textAlign: 'right', writingDirection: 'rtl' },
  trendCaption: { fontSize: 11, marginTop: 3, textAlign: 'right', writingDirection: 'rtl' },
  trendBadge: { flexDirection: 'row-reverse', alignItems: 'center', gap: 5, paddingHorizontal: 9, paddingVertical: 7, borderRadius: 12 },
  trendBadgeText: { fontSize: 10, fontWeight: '600', writingDirection: 'rtl' },
  chart: { height: 142, flexDirection: 'row-reverse', alignItems: 'stretch', justifyContent: 'space-between', gap: 4, paddingTop: 5 },
  chartColumn: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', gap: 5, minWidth: 0 },
  chartValue: { height: 14, fontSize: 10, fontWeight: '600' },
  chartTrack: { width: '70%', flex: 1, justifyContent: 'flex-end', overflow: 'hidden', borderRadius: 7 },
  chartBar: { width: '100%', minHeight: 3, borderRadius: 7 },
  chartLabel: { maxWidth: '100%', height: 16, fontSize: 10, textAlign: 'center', writingDirection: 'rtl' },
  emptyHint: {
    fontSize: 12,
    marginTop: 9,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  historyHeading: { marginTop: 20, marginBottom: 3 },
  historyList: { marginTop: 4, position: 'relative', paddingRight: 17, paddingLeft: 5 },
  timelineRail: { position: 'absolute', right: 17, top: 8, bottom: 14, width: 1 },
  timelineDot: { position: 'absolute', right: 0, top: 18, width: 9, height: 9, borderWidth: 2, borderRadius: 5 },
  historyRow: {
    position: 'relative',
    alignItems: 'center',
    flexDirection: 'row-reverse',
    gap: 11,
    minHeight: 69,
    paddingHorizontal: 3,
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
  historyDate: { fontSize: 11, writingDirection: 'rtl' },
  historyMeta: { alignItems: 'flex-end', gap: 4 },
  durationBadge: { borderRadius: 9, paddingHorizontal: 7, paddingVertical: 4 },
  duration: { fontSize: 11, fontWeight: '700', writingDirection: 'rtl' },
  historyStatus: { fontSize: 11, writingDirection: 'rtl' },
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
  historySkeleton: { borderWidth: 1, borderRadius: 21, paddingHorizontal: 12, overflow: 'hidden' },
  skeletonHistoryRow: { minHeight: 65, flexDirection: 'row-reverse', alignItems: 'center', gap: 10, borderBottomWidth: StyleSheet.hairlineWidth, paddingVertical: 10 },
  skeletonHistoryIcon: { width: 35, height: 35, borderRadius: 12 },
  skeletonHistoryText: { flex: 1, alignItems: 'flex-end', gap: 7 },
  skeletonHistoryMeta: { width: 49, height: 18, borderRadius: 7 },
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
