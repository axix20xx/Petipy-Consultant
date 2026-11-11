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
        <ActivityIndicator color={colors.primary} size="large" />
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
      <View
        pointerEvents="none"
        style={[
          styles.orb,
          styles.orbTop,
          { backgroundColor: colors.secondary },
        ]}
      />
      <View
        pointerEvents="none"
        style={[
          styles.orb,
          styles.orbBottom,
          { backgroundColor: colors.accent },
        ]}
      />
      <KeyboardAwareScrollViewCompat
        contentContainerStyle={styles.scrollContent}
        bottomOffset={24}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.hero, { backgroundColor: colors.primary }]}>
          <View
            style={[
              styles.brandHalo,
              { backgroundColor: colors.accent },
            ]}
          >
            <View
              style={[
                styles.brandMark,
                { backgroundColor: colors.card },
              ]}
            >
              <Ionicons name="paw" size={29} color={colors.primary} />
            </View>
            <View
              style={[
                styles.sparkle,
                { backgroundColor: colors.accent },
              ]}
            >
              <Ionicons name="sparkles" size={15} color={colors.warning} />
            </View>
          </View>
          <View style={styles.heroText}>
            <Text style={[styles.eyebrow, { color: colors.primaryForeground }]}>
              PETIPY  ·  CONSULTANT
            </Text>
            <Text style={[styles.title, { color: colors.primaryForeground }]}>
              همراهِ مراقبت
            </Text>
            <Text style={[styles.heroCopy, { color: colors.primaryForeground }]}>
              ورود به فضای مشاوره‌ی امن پتی‌پای
            </Text>
          </View>
        </View>

        <View
          style={[
            styles.card,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <View style={styles.cardHeading}>
            <View style={styles.cardHeadingText}>
              <Text style={[styles.cardTitle, { color: colors.foreground }]}>
                ورود مشاور
              </Text>
              <Text style={[styles.body, { color: colors.mutedForeground }]}>
                فقط حساب فعال VOICE_CONSULTANT مجاز است
              </Text>
            </View>
            <View
              style={[
                styles.headingIcon,
                { backgroundColor: colors.secondary },
              ]}
            >
              <Ionicons
                name="lock-closed"
                size={18}
                color={colors.primary}
              />
            </View>
          </View>

          {devAuthAvailable ? (
            <>
              <View
                style={[
                  styles.notice,
                  { backgroundColor: colors.accent },
                ]}
              >
                <Ionicons
                  name="flask-outline"
                  size={19}
                  color={colors.warning}
                />
                <Text
                  style={[
                    styles.noticeText,
                    { color: colors.accentForeground },
                  ]}
                >
                  ورود آزمایشی است، نه ورود زنده. اعتبار فعلی را سرور تعیین می‌کند (۲ ساعت)؛ برای ۳۰ روز باید سرور هم به‌روزرسانی شود.
                </Text>
              </View>

              <View style={styles.form}>
                <Text style={[styles.label, { color: colors.foreground }]}>
                  شماره موبایل حساب مشاور
                </Text>
                <View
                  style={[
                    styles.inputShell,
                    {
                      backgroundColor: colors.background,
                      borderColor: colors.input,
                    },
                  ]}
                >
                  <Ionicons
                    name="call-outline"
                    size={19}
                    color={colors.mutedForeground}
                  />
                  <TextInput
                    testID="consultant-phone-input"
                    accessibilityLabel="شماره موبایل حساب مشاور"
                    value={phone}
                    onChangeText={(value) =>
                      setPhone(normalizeMobileDigits(value))
                    }
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
                <Text style={[styles.label, { color: colors.foreground }]}>
                  کد توسعه‌ای ۶ رقمی
                </Text>
                <View
                  style={[
                    styles.inputShell,
                    {
                      backgroundColor: colors.background,
                      borderColor: colors.input,
                    },
                  ]}
                >
                  <Ionicons
                    name="keypad-outline"
                    size={19}
                    color={colors.mutedForeground}
                  />
                  <TextInput
                    testID="consultant-code-input"
                    accessibilityLabel="کد توسعه‌ای شش رقمی"
                    value={code}
                    onChangeText={(value) =>
                      setCode(
                        normalizeMobileDigits(value)
                          .replace(/\D/g, '')
                          .slice(0, 6),
                      )
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
                    style={[
                      styles.input,
                      styles.codeInput,
                      { color: colors.foreground },
                    ]}
                  />
                </View>
                <View style={styles.rememberNote}>
                  <Ionicons
                    name="shield-checkmark-outline"
                    size={17}
                    color={colors.success}
                  />
                  <Text
                    style={[
                      styles.rememberText,
                      { color: colors.mutedForeground },
                    ]}
                  >
                    ورود امن روی این دستگاه حفظ می‌شود تا نشست منقضی شود.
                  </Text>
                </View>
                <Pressable
                  testID="consultant-sign-in"
                  accessibilityRole="button"
                  accessibilityState={{ disabled: !canSubmit }}
                  disabled={!canSubmit}
                  onPress={() => void submit()}
                  android_ripple={{ color: colors.secondary }}
                  style={[
                    styles.primaryButton,
                    { backgroundColor: colors.primary },
                    !canSubmit && styles.disabledButton,
                  ]}
                >
                  {authBusy ? (
                    <ActivityIndicator color={colors.primaryForeground} />
                  ) : (
                    <>
                      <Text
                        style={[
                          styles.primaryButtonText,
                          { color: colors.primaryForeground },
                        ]}
                      >
                        ورود امن به پنل
                      </Text>
                      <Ionicons
                        name="arrow-back"
                        size={19}
                        color={colors.primaryForeground}
                      />
                    </>
                  )}
                </Pressable>
              </View>
            </>
          ) : (
            <View
              style={[
                styles.notice,
                { backgroundColor: colors.accent },
              ]}
            >
              <Ionicons
                name="lock-closed-outline"
                size={18}
                color={colors.warning}
              />
              <Text
                accessibilityRole="alert"
                style={[styles.noticeText, { color: colors.accentForeground }]}
              >
                {unavailableMessage}
              </Text>
            </View>
          )}

          {message && devAuthAvailable ? (
            <Text
              testID="consultant-auth-error"
              accessibilityRole="alert"
              style={[styles.error, { color: colors.destructive }]}
            >
              {message}
            </Text>
          ) : null}

          {state === 'error' ? (
            <Pressable
              testID="retry-session-check"
              accessibilityRole="button"
              onPress={() => void refresh()}
              disabled={authBusy}
              style={[styles.retryButton, { borderColor: colors.border }]}
            >
              <Text style={[styles.retryText, { color: colors.primary }]}>
                بررسی دوباره نشست
              </Text>
            </Pressable>
          ) : null}
        </View>
        <View style={styles.footerRow}>
          <Ionicons
            name="heart"
            size={13}
            color={colors.primary}
          />
          <Text style={[styles.footer, { color: colors.mutedForeground }]}>
            همراهِ مراقبت بهتر از حیوانات خانگی
          </Text>
        </View>
        <Text style={[styles.privacy, { color: colors.mutedForeground }]}>
          کد و توکن در گزارش‌ها ثبت نمی‌شوند و نشست در SecureStore نگهداری می‌شود.
        </Text>
        {!devAuthAvailable && state !== 'auth-unavailable' && message ? (
          <Text
            accessibilityRole="alert"
            style={[styles.footer, { color: colors.destructive }]}
          >
            {message}
          </Text>
        ) : null}
        {!devAuthAvailable && state !== 'auth-unavailable' ? (
          <Text style={[styles.footer, { color: colors.mutedForeground }]}>
            فرم آزمایشی فقط وقتی حالت توسعه‌ی احراز هویت Petipy فعال باشد نمایش داده می‌شود.
          </Text>
        ) : null}
      </KeyboardAwareScrollViewCompat>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, overflow: 'hidden' },
  orb: {
    position: 'absolute',
    borderRadius: 999,
    opacity: 0.38,
  },
  orbTop: {
    width: 240,
    height: 240,
    top: -122,
    right: -92,
  },
  orbBottom: {
    width: 188,
    height: 188,
    bottom: -91,
    left: -94,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 22,
    gap: 14,
  },
  hero: {
    minHeight: 158,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 14,
    borderRadius: 27,
    padding: 18,
    overflow: 'hidden',
    marginBottom: 1,
  },
  brandHalo: {
    width: 72,
    height: 72,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  heroText: {
    flex: 1,
    alignItems: 'flex-end',
    gap: 6,
  },
  card: {
    alignItems: 'stretch',
    borderWidth: 1,
    borderRadius: 25,
    padding: 18,
    gap: 14,
    shadowOpacity: 0.08,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 9 },
    elevation: 4,
  },
  brandMark: {
    width: 53,
    height: 53,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sparkle: {
    position: 'absolute',
    top: -3,
    right: -3,
    width: 27,
    height: 27,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eyebrow: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.4,
    textAlign: 'right',
    alignSelf: 'flex-end',
  },
  title: {
    fontSize: 23,
    fontWeight: '800',
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  heroCopy: {
    fontSize: 11,
    lineHeight: 18,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  cardHeading: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 12,
  },
  cardHeadingText: { flex: 1, gap: 4 },
  cardTitle: {
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  headingIcon: {
    width: 40,
    height: 40,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    fontSize: 11,
    lineHeight: 18,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  notice: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 10,
    borderRadius: 15,
    padding: 13,
  },
  noticeText: {
    flex: 1,
    fontSize: 10,
    lineHeight: 18,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  form: { gap: 10, marginTop: 1 },
  label: {
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'right',
    writingDirection: 'rtl',
    marginTop: 4,
  },
  inputShell: {
    minHeight: 55,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 14,
  },
  input: {
    flex: 1,
    minHeight: 52,
    fontSize: 14,
    writingDirection: 'ltr',
  },
  codeInput: {
    letterSpacing: 10,
    fontWeight: '700',
    writingDirection: 'ltr',
  },
  rememberNote: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
    paddingTop: 3,
  },
  rememberText: {
    flex: 1,
    fontSize: 10,
    lineHeight: 17,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  primaryButton: {
    minHeight: 54,
    borderRadius: 18,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 11,
    paddingHorizontal: 18,
    marginTop: 5,
  },
  disabledButton: { opacity: 0.7 },
  primaryButtonText: {
    fontSize: 13,
    fontWeight: '700',
    writingDirection: 'rtl',
  },
  error: {
    fontSize: 12,
    lineHeight: 19,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  retryButton: {
    minHeight: 42,
    borderWidth: 1,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryText: { fontSize: 12, fontWeight: '700', writingDirection: 'rtl' },
  footerRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    marginTop: 3,
  },
  footer: {
    fontSize: 10,
    lineHeight: 16,
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  privacy: {
    fontSize: 9,
    lineHeight: 15,
    textAlign: 'center',
    writingDirection: 'rtl',
    marginTop: 7,
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 13,
    paddingHorizontal: 22,
  },
});
