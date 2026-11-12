import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';
import { useColors } from '@/hooks/useColors';
import { normalizeMobileDigits } from '@/lib/consultant-auth';
import { useConsultantSession } from '@/providers/consultant-session';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const LIVE_AUTH_MESSAGE =
  'ورود موبایلی زنده هنوز به Petipy متصل نیست. ورود آزمایشی فقط پس از فعال‌شدن حالت توسعه‌ی احراز هویت شماره‌موبایل قابل استفاده است.';

export function SessionLoadingScreen() {
  const colors = useColors();
  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <View style={styles.loading}>
        <View style={[styles.loadingMark, { backgroundColor: colors.secondary }]}>
          <Ionicons name="paw" size={26} color={colors.primary} />
        </View>
        <Text style={[styles.body, { color: colors.mutedForeground }]}>
          در حال بررسی نشست امن Petipy…
        </Text>
      </View>
    </SafeAreaView>
  );
}

export default function ConsultantSignInScreen() {
  const colors = useColors();
  const {
    state,
    message,
    authBusy,
    devAuthAvailable,
    signIn,
    refresh,
  } = useConsultantSession();
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');

  async function submit() {
    const submittedCode = code;
    setCode('');
    await signIn(phone, submittedCode);
  }

  const unavailableMessage =
    state === 'auth-unavailable' && message ? message : LIVE_AUTH_MESSAGE;
  const canSubmit =
    !authBusy && phone.trim().length >= 10 && code.length === 6;

  return (
    <SafeAreaView
      style={[styles.safe, { backgroundColor: colors.background }]}
      edges={['top', 'bottom']}
    >
      <KeyboardAwareScrollViewCompat
        contentContainerStyle={styles.scrollContent}
        bottomOffset={26}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.pageTop}>
          <View style={styles.brandLine}>
            <View style={[styles.miniMark, { backgroundColor: colors.primary }]}>
              <Ionicons name="paw" size={17} color={colors.primaryForeground} />
            </View>
            <View style={styles.brandWords}>
              <Text style={[styles.brandName, { color: colors.foreground }]}>PETIPY</Text>
              <Text style={[styles.brandSub, { color: colors.mutedForeground }]}>میز مشاوره</Text>
            </View>
          </View>
          <View style={[styles.securePill, { backgroundColor: colors.secondary }]}>
            <Ionicons name="shield-checkmark-outline" size={14} color={colors.secondaryForeground} />
            <Text style={[styles.secureLabel, { color: colors.secondaryForeground }]}>ورود امن</Text>
          </View>
        </View>

        <View style={styles.signInIntro}>
          <View style={[styles.panelSeal, { backgroundColor: colors.secondary }]}>
            <Ionicons name="paw" size={26} color={colors.primary} />
          </View>
          <View style={styles.panelCopy}>
            <Text style={[styles.panelKicker, { color: colors.primary }]}>میز مشاوره‌ی پتی‌پای</Text>
            <Text style={[styles.title, { color: colors.foreground }]}>ورود مشاور</Text>
            <Text style={[styles.heroCopy, { color: colors.mutedForeground }]}>
              پاسخ‌گویی امن برای حساب فعال مشاور صوتی
            </Text>
          </View>
        </View>

        <View style={styles.formIntro}>
          <View style={styles.formIntroText}>
            <Text style={[styles.formTitle, { color: colors.foreground }]}>ورود مشاور</Text>
            <Text style={[styles.body, { color: colors.mutedForeground }]}>
              دسترسی فقط برای حساب فعال مشاور صوتی
            </Text>
          </View>
          <View style={[styles.roleTag, { backgroundColor: colors.muted }]}>
            <Text style={[styles.roleTagText, { color: colors.mutedForeground }]}>VOICE_CONSULTANT</Text>
          </View>
        </View>

        {devAuthAvailable ? (
          <View style={[styles.formCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.devNotice, { backgroundColor: colors.secondary }]}>
              <View style={[styles.noticeIcon, { backgroundColor: colors.card }]}>
                <Ionicons name="flask-outline" size={17} color={colors.secondaryForeground} />
              </View>
              <Text style={[styles.noticeText, { color: colors.secondaryForeground }]}>
                ورود آزمایشی فقط برای توسعه است. توکن فعلی ۲ ساعت اعتبار دارد و زمان انقضا را سرور تعیین می‌کند.
              </Text>
            </View>

            <View style={styles.form}>
              <View style={styles.fieldBlock}>
                <Text style={[styles.label, { color: colors.foreground }]}>شماره موبایل حساب مشاور</Text>
                <View style={[styles.inputShell, { backgroundColor: colors.background, borderColor: colors.input }]}>
                  <Ionicons name="call-outline" size={18} color={colors.mutedForeground} />
                  <TextInput
                    testID="consultant-phone-input"
                    accessibilityLabel="شماره موبایل حساب مشاور"
                    value={phone}
                    onChangeText={(value) => setPhone(normalizeMobileDigits(value))}
                    placeholder="09xxxxxxxxx"
                    placeholderTextColor={colors.mutedForeground}
                    keyboardType="phone-pad"
                    autoComplete="tel"
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!authBusy}
                    maxLength={20}
                    textAlign="left"
                    style={[styles.input, { color: colors.foreground }]}
                  />
                </View>
              </View>
              <View style={styles.fieldBlock}>
                <Text style={[styles.label, { color: colors.foreground }]}>کد توسعه‌ای ۶ رقمی</Text>
                <View style={[styles.inputShell, { backgroundColor: colors.background, borderColor: colors.input }]}>
                  <Ionicons name="keypad-outline" size={18} color={colors.mutedForeground} />
                  <TextInput
                    testID="consultant-code-input"
                    accessibilityLabel="کد توسعه‌ای شش رقمی"
                    value={code}
                    onChangeText={(value) =>
                      setCode(normalizeMobileDigits(value).replace(/\D/g, '').slice(0, 6))
                    }
                    placeholder="••••••"
                    placeholderTextColor={colors.mutedForeground}
                    keyboardType="number-pad"
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!authBusy}
                    maxLength={6}
                    secureTextEntry
                    textAlign="center"
                    style={[styles.input, styles.codeInput, { color: colors.foreground }]}
                  />
                </View>
              </View>
            </View>

            <View style={styles.privacyRow}>
              <Ionicons name="lock-closed-outline" size={16} color={colors.success} />
              <Text style={[styles.privacyText, { color: colors.mutedForeground }]}>
                نشست امن این دستگاه در SecureStore نگهداری می‌شود.
              </Text>
            </View>

            <Pressable
              testID="consultant-sign-in"
              accessibilityRole="button"
              accessibilityState={{ disabled: !canSubmit }}
              disabled={!canSubmit}
              onPress={() => void submit()}
              android_ripple={{ color: colors.secondary }}
              style={({ pressed }) => [
                styles.primaryButton,
                { backgroundColor: colors.primary, opacity: !canSubmit ? 0.58 : pressed ? 0.88 : 1 },
              ]}
            >
              {authBusy ? (
                <ActivityIndicator color={colors.primaryForeground} />
              ) : (
                <>
                  <Ionicons name="arrow-back" size={18} color={colors.primaryForeground} />
                  <Text style={[styles.primaryButtonText, { color: colors.primaryForeground }]}>
                    ورود به میز مشاوره
                  </Text>
                </>
              )}
            </Pressable>
          </View>
        ) : (
          <View style={[styles.unavailableCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.unavailableIcon, { backgroundColor: colors.accent }]}>
              <Ionicons name="lock-closed-outline" size={21} color={colors.accentForeground} />
            </View>
            <Text style={[styles.unavailableTitle, { color: colors.foreground }]}>ورود در دسترس نیست</Text>
            <Text accessibilityRole="alert" style={[styles.noticeText, styles.unavailableCopy, { color: colors.foreground }]}>
              {unavailableMessage}
            </Text>
          </View>
        )}

        {message && devAuthAvailable ? (
          <View style={[styles.errorBox, { backgroundColor: colors.accent }]}>
            <Ionicons name="alert-circle-outline" size={17} color={colors.destructive} />
            <Text
              testID="consultant-auth-error"
              accessibilityRole="alert"
              style={[styles.error, { color: colors.destructive }]}
            >
              {message}
            </Text>
          </View>
        ) : null}

        {state === 'error' ? (
          <Pressable
            testID="retry-session-check"
            accessibilityRole="button"
            onPress={() => void refresh()}
            disabled={authBusy}
            style={({ pressed }) => [styles.retryButton, { borderColor: colors.border, opacity: pressed ? 0.7 : 1 }]}
          >
            <Ionicons name="refresh-outline" size={16} color={colors.primary} />
            <Text style={[styles.retryText, { color: colors.primary }]}>بررسی دوباره نشست</Text>
          </Pressable>
        ) : null}

        <View style={styles.footerBlock}>
          <View style={[styles.footerRule, { backgroundColor: colors.border }]} />
          <Text style={[styles.footer, { color: colors.mutedForeground }]}>
            همراهِ مراقبت بهتر از حیوانات خانگی
          </Text>
          <Text style={[styles.footerTiny, { color: colors.mutedForeground }]}>
            کد و توکن در گزارش‌ها ثبت نمی‌شوند.
          </Text>
          {!devAuthAvailable && state !== 'auth-unavailable' && message ? (
            <Text accessibilityRole="alert" style={[styles.footer, { color: colors.destructive }]}>{message}</Text>
          ) : null}
          {!devAuthAvailable && state !== 'auth-unavailable' ? (
            <Text style={[styles.footerTiny, { color: colors.mutedForeground }]}>
              فرم آزمایشی فقط هنگام فعال‌بودن حالت توسعه نمایش داده می‌شود.
            </Text>
          ) : null}
        </View>
      </KeyboardAwareScrollViewCompat>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 24, gap: 17 },
  pageTop: { minHeight: 45, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between' },
  brandLine: { flexDirection: 'row-reverse', alignItems: 'center', gap: 9 },
  miniMark: { width: 34, height: 34, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  brandWords: { alignItems: 'flex-end', gap: 1 },
  brandName: { fontSize: 12, fontWeight: '800', letterSpacing: 1.3 },
  brandSub: { fontSize: 10, writingDirection: 'rtl' },
  securePill: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6, borderRadius: 20, paddingHorizontal: 11, paddingVertical: 8 },
  secureLabel: { fontSize: 10, fontWeight: '700', writingDirection: 'rtl' },
  signInIntro: { flexDirection: 'row-reverse', alignItems: 'center', gap: 14, paddingVertical: 8 },
  panelSeal: { width: 52, height: 52, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  panelCopy: { alignItems: 'flex-end', gap: 5, flex: 1 },
  panelKicker: { fontSize: 9, fontWeight: '800', letterSpacing: 1.2, opacity: 0.78 },
  title: { fontSize: 23, fontWeight: '800', textAlign: 'right', writingDirection: 'rtl' },
  heroCopy: { maxWidth: 270, fontSize: 11, lineHeight: 18, textAlign: 'right', writingDirection: 'rtl' },
  panelDisc: { position: 'absolute', width: 158, height: 158, borderWidth: 1, borderRadius: 80, opacity: 0.11, top: -67, left: -35 },
  panelDiscSmall: { position: 'absolute', width: 100, height: 100, borderWidth: 1, borderRadius: 50, opacity: 0.1, top: -38, left: -7 },
  formIntro: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginTop: 1 },
  formIntroText: { alignItems: 'flex-end', gap: 4 },
  formTitle: { fontSize: 19, fontWeight: '800', textAlign: 'right', writingDirection: 'rtl' },
  body: { fontSize: 11, lineHeight: 18, textAlign: 'right', writingDirection: 'rtl' },
  roleTag: { borderRadius: 9, paddingHorizontal: 8, paddingVertical: 6 },
  roleTagText: { fontSize: 8, fontWeight: '700', letterSpacing: 0.3 },
  formCard: { borderRadius: 20, borderWidth: 1, padding: 16, gap: 16, elevation: 1 },
  devNotice: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10, borderRadius: 15, paddingHorizontal: 12, paddingVertical: 11 },
  noticeIcon: { width: 31, height: 31, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  noticeText: { flex: 1, fontSize: 11, lineHeight: 18, textAlign: 'right', writingDirection: 'rtl' },
  form: { gap: 15 },
  fieldBlock: { gap: 8 },
  label: { fontSize: 11, fontWeight: '700', textAlign: 'right', writingDirection: 'rtl' },
  inputShell: { minHeight: 56, flexDirection: 'row-reverse', alignItems: 'center', gap: 11, borderWidth: 1, borderRadius: 15, paddingHorizontal: 14 },
  input: { flex: 1, minHeight: 52, fontSize: 15, writingDirection: 'ltr' },
  codeInput: { letterSpacing: 9, fontWeight: '700' },
  privacyRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8 },
  privacyText: { flex: 1, fontSize: 10, lineHeight: 16, textAlign: 'right', writingDirection: 'rtl' },
  primaryButton: { minHeight: 56, borderRadius: 16, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 10, paddingHorizontal: 16 },
  primaryButtonText: { fontSize: 13, fontWeight: '800', writingDirection: 'rtl' },
  unavailableCard: { alignItems: 'center', borderWidth: 1, borderRadius: 24, padding: 22, gap: 10 },
  unavailableIcon: { width: 48, height: 48, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  unavailableTitle: { fontSize: 16, fontWeight: '800', writingDirection: 'rtl' },
  unavailableCopy: { fontSize: 12, textAlign: 'center', lineHeight: 22 },
  errorBox: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8, borderRadius: 13, padding: 12 },
  error: { flex: 1, fontSize: 11, lineHeight: 18, textAlign: 'right', writingDirection: 'rtl' },
  retryButton: { minHeight: 46, borderWidth: 1, borderRadius: 14, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 8 },
  retryText: { fontSize: 12, fontWeight: '700', writingDirection: 'rtl' },
  footerBlock: { alignItems: 'center', gap: 7, paddingTop: 2 },
  footerRule: { width: 42, height: 2, borderRadius: 2, marginBottom: 3 },
  footer: { fontSize: 12, lineHeight: 19, textAlign: 'center', writingDirection: 'rtl' },
  footerTiny: { fontSize: 10, lineHeight: 17, textAlign: 'center', writingDirection: 'rtl' },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 13, paddingHorizontal: 22 },
  loadingMark: { width: 62, height: 62, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
});
