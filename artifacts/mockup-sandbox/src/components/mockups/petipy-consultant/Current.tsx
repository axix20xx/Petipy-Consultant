import './_group.css';

import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useColorScheme,
} from 'react-native-web';
import {
  ArrowLeft,
  FlaskConical,
  Heart,
  KeyRound,
  LockKeyhole,
  PawPrint,
  Phone,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { useState } from 'react';

const colors = {
  light: {
    text: '#263a39',
    tint: '#26756d',
    background: '#f4f5ef',
    foreground: '#263a39',
    card: '#fffefa',
    cardForeground: '#263a39',
    primary: '#26756d',
    primaryForeground: '#fffefa',
    secondary: '#e2eeea',
    secondaryForeground: '#285e58',
    muted: '#e9eee9',
    mutedForeground: '#687b75',
    accent: '#f6e7d8',
    accentForeground: '#94603b',
    destructive: '#b85850',
    destructiveForeground: '#fffefa',
    border: '#dce5dd',
    input: '#d6e1da',
    success: '#39816d',
    warning: '#c78343',
  },
  dark: {
    text: '#edf3ed',
    tint: '#83c5b7',
    background: '#182321',
    foreground: '#edf3ed',
    card: '#222f2b',
    cardForeground: '#edf3ed',
    primary: '#83c5b7',
    primaryForeground: '#17312b',
    secondary: '#2a403a',
    secondaryForeground: '#c8e4da',
    muted: '#293631',
    mutedForeground: '#a4b5ac',
    accent: '#45392d',
    accentForeground: '#f0cba4',
    destructive: '#e18478',
    destructiveForeground: '#321b19',
    border: '#34443d',
    input: '#3b4b43',
    success: '#83c5a5',
    warning: '#e0ae73',
  },
};

const LIVE_AUTH_MESSAGE =
  'ورود موبایلی زنده هنوز به Petipy متصل نیست. ورود آزمایشی فقط پس از فعال‌شدن حالت توسعه‌ی احراز هویت شماره‌موبایل قابل استفاده است.';

type SessionState =
  | 'loading'
  | 'signed-out'
  | 'connected'
  | 'wrong-role'
  | 'expired'
  | 'auth-unavailable'
  | 'error';

function useColors() {
  const scheme = useColorScheme();
  return scheme === 'dark' ? colors.dark : colors.light;
}

function normalizeMobileDigits(value: string) {
  return value.replace(/[۰-۹٠-٩]/g, (digit) => {
    const persianDigit = '۰۱۲۳۴۵۶۷۸۹'.indexOf(digit);
    const arabicDigit = '٠١٢٣٤٥٦٧٨٩'.indexOf(digit);
    return String(persianDigit >= 0 ? persianDigit : arabicDigit);
  });
}

/**
 * Visual-only session stub: renders the app's development sign-in state.
 * It deliberately performs no authentication, network request, or login.
 */
function useMockConsultantSession() {
  return {
    state: 'signed-out' as SessionState,
    message: null as string | null,
    authBusy: false,
    devAuthAvailable: true,
    signIn: async (_phone: string, _code: string) => false,
    refresh: async () => {},
  };
}

function KeyboardAwareScrollViewCompat({
  children,
  contentContainerStyle,
}: {
  children: React.ReactNode;
  contentContainerStyle: object;
}) {
  // The native keyboard-aware view is replaced with the web ScrollView.
  return (
    <ScrollView
      contentContainerStyle={contentContainerStyle}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  );
}

export function Current() {
  const palette = useColors();
  const { state, message, authBusy, devAuthAvailable, signIn, refresh } =
    useMockConsultantSession();
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
      style={[styles.safe, { backgroundColor: palette.background }]}
    >
      <View
        pointerEvents="none"
        style={[
          styles.orb,
          styles.orbTop,
          { backgroundColor: palette.secondary },
        ]}
      />
      <View
        pointerEvents="none"
        style={[
          styles.orb,
          styles.orbBottom,
          { backgroundColor: palette.accent },
        ]}
      />
      <KeyboardAwareScrollViewCompat
        contentContainerStyle={styles.scrollContent}
      >
        <View style={[styles.hero, { backgroundColor: palette.primary }]}>
          <View
            style={[styles.brandHalo, { backgroundColor: palette.accent }]}
          >
            <View
              style={[styles.brandMark, { backgroundColor: palette.card }]}
            >
              <PawPrint size={29} color={palette.primary} />
            </View>
            <View
              style={[styles.sparkle, { backgroundColor: palette.accent }]}
            >
              <Sparkles size={15} color={palette.warning} />
            </View>
          </View>
          <View style={styles.heroText}>
            <Text style={[styles.eyebrow, { color: palette.primaryForeground }]}>
              PETIPY  ·  CONSULTANT
            </Text>
            <Text style={[styles.title, { color: palette.primaryForeground }]}>
              همراهِ مراقبت
            </Text>
            <Text
              style={[styles.heroCopy, { color: palette.primaryForeground }]}
            >
              ورود به فضای مشاوره‌ی امن پتی‌پای
            </Text>
          </View>
        </View>

        <View
          style={[
            styles.card,
            { backgroundColor: palette.card, borderColor: palette.border },
          ]}
        >
          <View style={styles.cardHeading}>
            <View style={styles.cardHeadingText}>
              <Text style={[styles.cardTitle, { color: palette.foreground }]}>
                ورود مشاور
              </Text>
              <Text style={[styles.body, { color: palette.mutedForeground }]}>
                فقط حساب فعال VOICE_CONSULTANT مجاز است
              </Text>
            </View>
            <View
              style={[
                styles.headingIcon,
                { backgroundColor: palette.secondary },
              ]}
            >
              <LockKeyhole size={18} color={palette.primary} />
            </View>
          </View>

          {devAuthAvailable ? (
            <>
              <View
                style={[styles.notice, { backgroundColor: palette.accent }]}
              >
                <FlaskConical size={19} color={palette.warning} />
                <Text
                  style={[
                    styles.noticeText,
                    { color: palette.accentForeground },
                  ]}
                >
                  ورود آزمایشی است، نه ورود زنده. اعتبار فعلی را سرور تعیین می‌کند (۲ ساعت)؛ برای ۳۰ روز باید سرور هم به‌روزرسانی شود.
                </Text>
              </View>

              <View style={styles.form}>
                <Text style={[styles.label, { color: palette.foreground }]}>
                  شماره موبایل حساب مشاور
                </Text>
                <View
                  style={[
                    styles.inputShell,
                    {
                      backgroundColor: palette.background,
                      borderColor: palette.input,
                    },
                  ]}
                >
                  <Phone size={19} color={palette.mutedForeground} />
                  <TextInput
                    testID="consultant-phone-input"
                    accessibilityLabel="شماره موبایل حساب مشاور"
                    value={phone}
                    onChangeText={(value: string) =>
                      setPhone(normalizeMobileDigits(value))
                    }
                    placeholder="09xxxxxxxxx"
                    placeholderTextColor={palette.mutedForeground}
                    keyboardType="phone-pad"
                    autoComplete="tel"
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!authBusy}
                    maxLength={20}
                    textAlign="left"
                    style={[styles.input, { color: palette.foreground }]}
                  />
                </View>
                <Text style={[styles.label, { color: palette.foreground }]}>
                  کد توسعه‌ای ۶ رقمی
                </Text>
                <View
                  style={[
                    styles.inputShell,
                    {
                      backgroundColor: palette.background,
                      borderColor: palette.input,
                    },
                  ]}
                >
                  <KeyRound size={19} color={palette.mutedForeground} />
                  <TextInput
                    testID="consultant-code-input"
                    accessibilityLabel="کد توسعه‌ای شش رقمی"
                    value={code}
                    onChangeText={(value: string) =>
                      setCode(
                        normalizeMobileDigits(value)
                          .replace(/\D/g, '')
                          .slice(0, 6),
                      )
                    }
                    placeholder="••••••"
                    placeholderTextColor={palette.mutedForeground}
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
                      { color: palette.foreground },
                    ]}
                  />
                </View>
                <View style={styles.rememberNote}>
                  <ShieldCheck size={17} color={palette.success} />
                  <Text
                    style={[
                      styles.rememberText,
                      { color: palette.mutedForeground },
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
                  style={[
                    styles.primaryButton,
                    { backgroundColor: palette.primary },
                    !canSubmit && styles.disabledButton,
                  ]}
                >
                  {authBusy ? (
                    <ActivityIndicator color={palette.primaryForeground} />
                  ) : (
                    <>
                      <Text
                        style={[
                          styles.primaryButtonText,
                          { color: palette.primaryForeground },
                        ]}
                      >
                        ورود امن به پنل
                      </Text>
                      <ArrowLeft size={19} color={palette.primaryForeground} />
                    </>
                  )}
                </Pressable>
              </View>
            </>
          ) : (
            <View style={[styles.notice, { backgroundColor: palette.accent }]}>
              <LockKeyhole size={18} color={palette.warning} />
              <Text
                accessibilityRole="alert"
                style={[
                  styles.noticeText,
                  { color: palette.accentForeground },
                ]}
              >
                {unavailableMessage}
              </Text>
            </View>
          )}

          {message && devAuthAvailable ? (
            <Text
              testID="consultant-auth-error"
              accessibilityRole="alert"
              style={[styles.error, { color: palette.destructive }]}
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
              style={[styles.retryButton, { borderColor: palette.border }]}
            >
              <Text style={[styles.retryText, { color: palette.primary }]}>
                بررسی دوباره نشست
              </Text>
            </Pressable>
          ) : null}
        </View>
        <View style={styles.footerRow}>
          <Heart size={13} color={palette.primary} />
          <Text style={[styles.footer, { color: palette.mutedForeground }]}>
            همراهِ مراقبت بهتر از حیوانات خانگی
          </Text>
        </View>
        <Text style={[styles.privacy, { color: palette.mutedForeground }]}>
          کد و توکن در گزارش‌ها ثبت نمی‌شوند و نشست در SecureStore نگهداری می‌شود.
        </Text>
        {!devAuthAvailable && state !== 'auth-unavailable' && message ? (
          <Text
            accessibilityRole="alert"
            style={[styles.footer, { color: palette.destructive }]}
          >
            {message}
          </Text>
        ) : null}
        {!devAuthAvailable && state !== 'auth-unavailable' ? (
          <Text style={[styles.footer, { color: palette.mutedForeground }]}>
            فرم آزمایشی فقط وقتی حالت توسعه‌ی احراز هویت Petipy فعال باشد نمایش داده می‌شود.
          </Text>
        ) : null}
      </KeyboardAwareScrollViewCompat>
    </SafeAreaView>
  );
}

export default Current;

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
