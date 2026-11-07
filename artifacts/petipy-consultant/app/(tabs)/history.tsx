import { useColors } from '@/hooks/useColors';
import { getCallHistory } from '@/lib/petipy-api';
import { useConsultantSession } from '@/providers/consultant-session';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

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

function formatDuration(seconds?: number) {
  if (typeof seconds !== 'number') return '—';
  const minutes = Math.floor(seconds / 60);
  const remaining = seconds % 60;
  return minutes > 0
    ? `${minutes} دقیقه`
    : `${remaining} ثانیه`;
}

export default function CallHistoryScreen() {
  const colors = useColors();
  const { token, state, message } = useConsultantSession();
  const history = useQuery({
    queryKey: ['petipy', 'call-history'],
    queryFn: () => getCallHistory(token as string),
    enabled: state === 'connected' && Boolean(token),
    refetchInterval: state === 'connected' ? 60_000 : false,
  });

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          Platform.OS === 'web' && styles.webContent,
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.eyebrow, { color: colors.primary }]}>ACTIVITY</Text>
        <Text style={[styles.title, { color: colors.foreground }]}>سوابق تماس</Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
          تاریخچه‌ی گفتگوهای مشاوره‌ی شما
        </Text>

        {state !== 'connected' ? (
          <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.iconWrap, { backgroundColor: colors.secondary }]}>
              <Ionicons name="time-outline" size={29} color={colors.primary} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
              ورود مشاور لازم است
            </Text>
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              {message ?? 'پس از ورود امن با حساب فعال مشاور صوتی، تاریخچه‌ی تماس نمایش داده می‌شود.'}
            </Text>
          </View>
        ) : history.isLoading ? (
          <View style={styles.loading}>
            <ActivityIndicator color={colors.primary} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              در حال دریافت سوابق…
            </Text>
          </View>
        ) : history.isError ? (
          <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
              دریافت سوابق ممکن نشد
            </Text>
            <Pressable
              testID="retry-history"
              onPress={() => void history.refetch()}
              style={[styles.retryButton, { backgroundColor: colors.secondary }]}
            >
              <Text style={[styles.retryText, { color: colors.primary }]}>
                تلاش دوباره
              </Text>
            </Pressable>
          </View>
        ) : history.data?.length ? (
          <View style={styles.list}>
            {history.data.map((entry) => (
              <View
                key={entry.id}
                style={[
                  styles.row,
                  { backgroundColor: colors.card, borderColor: colors.border },
                ]}
              >
                <View style={[styles.iconWrap, { backgroundColor: colors.secondary }]}>
                  <Ionicons name="call-outline" size={21} color={colors.primary} />
                </View>
                <View style={styles.rowMain}>
                  <Text style={[styles.rowTitle, { color: colors.foreground }]}>
                    تماس مشاوره
                  </Text>
                  <Text style={[styles.rowDate, { color: colors.mutedForeground }]}>
                    {formatDate(entry.startedAt)}
                  </Text>
                </View>
                <View style={styles.rowMeta}>
                  <Text style={[styles.duration, { color: colors.foreground }]}>
                    {formatDuration(entry.durationSeconds)}
                  </Text>
                  <Text style={[styles.statusText, { color: colors.mutedForeground }]}>
                    {entry.status ?? entry.endReason ?? ''}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        ) : (
          <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.iconWrap, { backgroundColor: colors.secondary }]}>
              <Ionicons name="time-outline" size={29} color={colors.primary} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
              هنوز تماسی ثبت نشده
            </Text>
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              سوابق واقعی تماس پس از پایان گفتگو در این بخش نمایش داده می‌شوند.
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
  eyebrow: { fontSize: 10, fontWeight: '700', letterSpacing: 1.6, textAlign: 'right' },
  title: { fontSize: 28, fontWeight: '700', textAlign: 'right', writingDirection: 'rtl' },
  subtitle: { fontSize: 13, textAlign: 'right', writingDirection: 'rtl', marginBottom: 18 },
  emptyCard: { borderRadius: 22, borderWidth: 1.5, padding: 24, alignItems: 'center', marginTop: 12 },
  iconWrap: { width: 58, height: 58, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  emptyTitle: { fontSize: 15, fontWeight: '700', marginBottom: 7, writingDirection: 'rtl' },
  emptyText: { fontSize: 12, lineHeight: 21, textAlign: 'center', writingDirection: 'rtl' },
  loading: { paddingVertical: 30, alignItems: 'center', gap: 10 },
  list: { gap: 11 },
  row: { minHeight: 80, borderRadius: 19, borderWidth: 1, padding: 13, flexDirection: 'row-reverse', alignItems: 'center', gap: 11 },
  rowMain: { flex: 1, alignItems: 'flex-end', gap: 5 },
  rowTitle: { fontSize: 13, fontWeight: '700', writingDirection: 'rtl' },
  rowDate: { fontSize: 10, writingDirection: 'rtl' },
  rowMeta: { alignItems: 'flex-end', gap: 5 },
  duration: { fontSize: 12, fontWeight: '700', writingDirection: 'rtl' },
  statusText: { fontSize: 10, writingDirection: 'rtl' },
  retryButton: { paddingHorizontal: 18, paddingVertical: 10, borderRadius: 14, marginTop: 7 },
  retryText: { fontSize: 12, fontWeight: '700', writingDirection: 'rtl' },
});
