import { useColors } from '@/hooks/useColors';
import { setConsultantAvailability } from '@/lib/petipy-api';
import { stopAvailabilityService } from '@/lib/background-monitor';
import { useConsultantSession } from '@/providers/consultant-session';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as WebBrowser from 'expo-web-browser';

function InfoRow({
  icon,
  title,
  detail,
  color,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  detail: string;
  color: string;
}) {
  const colors = useColors();
  return (
    <View style={[styles.infoRow, { borderBottomColor: colors.border }]}>
      <View style={[styles.rowIcon, { backgroundColor: colors.secondary }]}>
        <Ionicons name={icon} size={19} color={color} />
      </View>
      <View style={styles.rowCopy}>
        <Text style={[styles.rowTitle, { color: colors.foreground }]}>{title}</Text>
        <Text style={[styles.rowDetail, { color: colors.mutedForeground }]}>{detail}</Text>
      </View>
    </View>
  );
}

export default function SettingsScreen() {
  const colors = useColors();
  const {
    token,
    profile,
    state,
    message,
    connect,
    disconnect,
  } = useConsultantSession();
  const [tokenDraft, setTokenDraft] = useState('');
  const [connecting, setConnecting] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const isConnected = state === 'connected' && Boolean(token);

  async function connectAccount() {
    if (!tokenDraft.trim() || connecting) return;
    if (Platform.OS === 'web') {
      Alert.alert('نسخه‌ی Android لازم است', 'توکن فقط در SecureStore دستگاه ذخیره می‌شود.');
      return;
    }
    setConnecting(true);
    try {
      await connect(tokenDraft.trim());
      setTokenDraft('');
    } finally {
      setConnecting(false);
    }
  }

  async function signOut() {
    if (signingOut) return;
    setSigningOut(true);
    try {
      if (token && profile?.manualStatus === 'online') {
        await setConsultantAvailability(token, 'offline');
      }
    } catch {
      Alert.alert(
        'وضعیت سرور تأیید نشد',
        'سرویس تماس روی دستگاه متوقف می‌شود؛ وضعیت آنلاین حساب ممکن است تا به‌روزرسانی بعدی باقی بماند.',
      );
    } finally {
      await stopAvailabilityService();
      await disconnect();
      setSigningOut(false);
    }
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          Platform.OS === 'web' && styles.webContent,
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.eyebrow, { color: colors.primary }]}>ACCOUNT & CALLS</Text>
        <Text style={[styles.title, { color: colors.foreground }]}>تنظیمات</Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
          وضعیت حساب و راهنمای تماس در پس‌زمینه
        </Text>

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.cardHeading}>
            <Ionicons name="shield-checkmark-outline" size={20} color={colors.primary} />
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>حساب مشاور</Text>
          </View>
          {isConnected ? (
            <>
              <Text style={[styles.profileName, { color: colors.foreground }]}>
                {profile?.displayName ?? 'مشاور Petipy'}
              </Text>
              <Text style={[styles.body, { color: colors.mutedForeground }]}>
                حساب فعال از API مشاور تأیید شد. API نقش و دسترسی VOICE_CONSULTANT را بررسی می‌کند.
              </Text>
              <Pressable
                testID="sign-out"
                accessibilityRole="button"
                onPress={() => void signOut()}
                disabled={signingOut}
                style={[styles.secondaryButton, { backgroundColor: colors.secondary }]}
              >
                {signingOut ? (
                  <ActivityIndicator color={colors.primary} />
                ) : (
                  <Ionicons name="log-out-outline" size={18} color={colors.primary} />
                )}
                <Text style={[styles.secondaryButtonText, { color: colors.primary }]}>
                  خروج امن
                </Text>
              </Pressable>
            </>
          ) : (
            <>
              <Text style={[styles.body, { color: colors.mutedForeground }]}>
                ورود با نشست تازه‌ی Petipy انجام می‌شود. نشست برنامه‌ی مشتری از اینجا خوانده یا کپی نمی‌شود.
              </Text>
              <View style={[styles.authNotice, { backgroundColor: colors.accent }]}>
                <Ionicons name="information-circle-outline" size={17} color={colors.warning} />
                <Text style={[styles.authNoticeText, { color: colors.accentForeground }]}>
                  ورود وب فعلی Petipy کوکی وب می‌سازد. تا ارائه‌ی API تبادل نشست برای Android، ورود خودکار کامل نیست؛ فقط توکن تازه‌ی رسمی را وارد کنید، نه توکن برنامه‌ی مشتری.
                </Text>
              </View>
              <Pressable
                testID="open-petipy-sign-in"
                accessibilityRole="link"
                onPress={() => void WebBrowser.openBrowserAsync('https://petipy.com/sign-in')}
                style={[styles.secondaryButton, { backgroundColor: colors.secondary }]}
              >
                <Ionicons name="open-outline" size={18} color={colors.primary} />
                <Text style={[styles.secondaryButtonText, { color: colors.primary }]}>
                  ورود در Petipy
                </Text>
              </Pressable>
              <Text style={[styles.fieldLabel, { color: colors.foreground }]}>
                توکن API تازه
              </Text>
              <TextInput
                testID="fresh-session-token"
                value={tokenDraft}
                onChangeText={setTokenDraft}
                placeholder="توکن تازه‌ی صادرشده برای حساب مشاور"
                placeholderTextColor={colors.mutedForeground}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                textContentType="oneTimeCode"
                style={[
                  styles.tokenInput,
                  {
                    color: colors.foreground,
                    backgroundColor: colors.background,
                    borderColor: colors.border,
                  },
                ]}
                accessibilityLabel="توکن تازه‌ی نشست Petipy"
              />
              {message ? (
                <Text accessibilityRole="alert" style={[styles.error, { color: colors.destructive }]}>
                  {message}
                </Text>
              ) : null}
              <Pressable
                testID="connect-petipy"
                accessibilityRole="button"
                onPress={() => void connectAccount()}
                disabled={!tokenDraft.trim() || connecting}
                style={[
                  styles.primaryButton,
                  {
                    backgroundColor: colors.primary,
                    opacity: !tokenDraft.trim() || connecting ? 0.55 : 1,
                  },
                ]}
              >
                {connecting ? (
                  <ActivityIndicator color={colors.primaryForeground} />
                ) : (
                  <Ionicons name="lock-closed-outline" size={18} color={colors.primaryForeground} />
                )}
                <Text style={[styles.primaryButtonText, { color: colors.primaryForeground }]}>
                  تأیید حساب مشاور
                </Text>
              </Pressable>
              <Text style={[styles.footnote, { color: colors.mutedForeground }]}>
                توکن فقط پس از تأیید API در SecureStore دستگاه ذخیره می‌شود؛ هیچ توکنی در URL یا گزارش‌ها قرار نمی‌گیرد.
              </Text>
            </>
          )}
        </View>

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.cardHeading}>
            <Ionicons name="phone-portrait-outline" size={20} color={colors.primary} />
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>تماس در پس‌زمینه</Text>
          </View>
          <InfoRow
            icon="notifications-outline"
            title="اعلان تماس فعال"
            detail="وقتی آنلاین هستید، سرویس foreground با اعلان دائمی درخواست‌ها را بررسی می‌کند."
            color={colors.primary}
          />
          <InfoRow
            icon="battery-half-outline"
            title="محدودیت باتری را بردارید"
            detail="در تنظیمات Android، مصرف باتری Petipy را روی Unrestricted بگذارید."
            color={colors.warning}
          />
          <InfoRow
            icon="hand-left-outline"
            title="Force stop تماس را متوقف می‌کند"
            detail="پس از Force stop، Android اجرای برنامه و دریافت تماس را تا بازشدن دوباره متوقف می‌کند."
            color={colors.destructive}
          />
          <Text style={[styles.footnote, { color: colors.mutedForeground }]}>
            بدون FCM، تماس ورودی فقط وقتی قابل دریافت است که سرویس foreground از قبل اجرا باشد و سیستم آن را نکشته باشد.
          </Text>
        </View>

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.cardHeading}>
            <Ionicons name="server-outline" size={20} color={colors.primary} />
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>سرویس تماس</Text>
          </View>
          <Text style={[styles.body, { color: colors.mutedForeground }]}>
            API از Petipy استفاده می‌کند و TURN relay-only را از نشست تماس دریافت می‌کند. Google STUN و FCM برای دریافت تماس استفاده نمی‌شوند.
          </Text>
          <View style={[styles.statusBadge, { backgroundColor: colors.accent }]}>
            <View style={[styles.badgeDot, { backgroundColor: colors.warning }]} />
            <Text style={[styles.badgeText, { color: colors.accentForeground }]}>
              {state === 'connected' ? 'حساب مشاور تأیید شد' : 'در انتظار نشست رسمی Petipy'}
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { padding: 22, paddingTop: 18, paddingBottom: 28, gap: 14 },
  webContent: { paddingTop: 67, paddingBottom: 34 },
  eyebrow: { fontSize: 10, fontWeight: '700', letterSpacing: 1.6, textAlign: 'right' },
  title: { fontSize: 28, fontWeight: '700', textAlign: 'right', writingDirection: 'rtl' },
  subtitle: { fontSize: 13, textAlign: 'right', writingDirection: 'rtl', marginBottom: 2 },
  card: { borderRadius: 22, borderWidth: 1.5, padding: 17, gap: 12 },
  cardHeading: { flexDirection: 'row-reverse', alignItems: 'center', gap: 9 },
  cardTitle: { fontSize: 15, fontWeight: '700', writingDirection: 'rtl' },
  profileName: { fontSize: 17, fontWeight: '700', textAlign: 'right', writingDirection: 'rtl' },
  body: { textAlign: 'right', fontSize: 12, lineHeight: 21, writingDirection: 'rtl' },
  authNotice: { flexDirection: 'row-reverse', alignItems: 'flex-start', gap: 8, borderRadius: 13, padding: 11 },
  authNoticeText: { flex: 1, fontSize: 10, lineHeight: 18, textAlign: 'right', writingDirection: 'rtl' },
  fieldLabel: { textAlign: 'right', fontSize: 12, fontWeight: '700', writingDirection: 'rtl', marginTop: 4 },
  tokenInput: { minHeight: 47, borderWidth: 1, borderRadius: 14, paddingHorizontal: 12, fontSize: 12, textAlign: 'left' },
  error: { fontSize: 11, lineHeight: 18, textAlign: 'right', writingDirection: 'rtl' },
  primaryButton: { minHeight: 46, borderRadius: 15, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 8 },
  primaryButtonText: { fontSize: 12, fontWeight: '700', writingDirection: 'rtl' },
  secondaryButton: { minHeight: 42, borderRadius: 14, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 14, alignSelf: 'flex-end' },
  secondaryButtonText: { fontSize: 12, fontWeight: '700', writingDirection: 'rtl' },
  statusBadge: { alignSelf: 'flex-end', flexDirection: 'row-reverse', alignItems: 'center', gap: 7, paddingHorizontal: 11, paddingVertical: 7, borderRadius: 20 },
  badgeDot: { width: 7, height: 7, borderRadius: 4 },
  badgeText: { fontSize: 11, fontWeight: '600', writingDirection: 'rtl' },
  infoRow: { flexDirection: 'row-reverse', alignItems: 'flex-start', gap: 11, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  rowIcon: { width: 35, height: 35, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  rowCopy: { flex: 1, alignItems: 'flex-end', gap: 4 },
  rowTitle: { fontSize: 13, fontWeight: '600', textAlign: 'right', writingDirection: 'rtl' },
  rowDetail: { fontSize: 11, lineHeight: 19, textAlign: 'right', writingDirection: 'rtl' },
  footnote: { fontSize: 11, lineHeight: 19, textAlign: 'right', writingDirection: 'rtl', marginTop: 1 },
});
