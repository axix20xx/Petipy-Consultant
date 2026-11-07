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

  return (
    <SafeAreaView
      style={[styles.safe, { backgroundColor: colors.background }]}
      edges={['top', 'bottom']}
    >
      <KeyboardAwareScrollViewCompat
        contentContainerStyle={[
          styles.scrollContent,
        ]}
        bottomOffset={28}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View
          style={[
            styles.card,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <View style={[styles.brandMark, { backgroundColor: colors.secondary }]}>
            <Ionicons name="paw" size={26} color={colors.primary} />
          </View>
          <Text style={[styles.eyebrow, { color: colors.primary }]}>
            PETIPY CONSULTANT
          </Text>
          <Text style={[styles.title, { color: colors.foreground }]}>
            ورود مشاور
          </Text>
          <Text style={[styles.body, { color: colors.mutedForeground }]}>
            فقط حساب‌های فعال VOICE_CONSULTANT می‌توانند وارد این برنامه شوند.
          </Text>

          {devAuthAvailable ? (
            <>
              <View style={[styles.notice, { backgroundColor: colors.accent }]}>
                <Ionicons
                  name="information-circle-outline"
                  size={18}
                  color={colors.warning}
                />
                <Text
                  style={[
                    styles.noticeText,
                    { color: colors.accentForeground },
                  ]}
                >
                  ورود توسعه‌ای است و ورود زنده محسوب نمی‌شود. نشست پس از دو ساعت منقضی می‌شود.
                </Text>
              </View>

              <View style={styles.form}>
                <Text style={[styles.label, { color: colors.foreground }]}>
                  شماره موبایل حساب مشاور
                </Text>
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
                  style={[
                    styles.input,
                    {
                      backgroundColor: colors.background,
                      borderColor: colors.input,
                      color: colors.foreground,
                    },
                  ]}
                />
                <Text style={[styles.label, { color: colors.foreground }]}>
                  کد توسعه‌ای ۶ رقمی
                </Text>
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
                    {
                      backgroundColor: colors.background,
                      borderColor: colors.input,
                      color: colors.foreground,
                    },
                  ]}
                />
                <Pressable
                  testID="consultant-sign-in"
                  accessibilityRole="button"
                  accessibilityState={{ disabled: authBusy }}
                  disabled={authBusy}
                  onPress={() => void submit()}
                  style={[
                    styles.primaryButton,
                    { backgroundColor: colors.primary },
                    authBusy && styles.disabledButton,
                  ]}
                >
                  {authBusy ? (
                    <ActivityIndicator color={colors.primaryForeground} />
                  ) : (
                    <>
                      <Ionicons
                        name="log-in-outline"
                        size={19}
                        color={colors.primaryForeground}
                      />
                      <Text
                        style={[
                          styles.primaryButtonText,
                          { color: colors.primaryForeground },
                        ]}
                      >
                        ورود به حساب مشاور
                      </Text>
                    </>
                  )}
                </Pressable>
              </View>
            </>
          ) : (
            <View style={[styles.notice, { backgroundColor: colors.accent }]}>
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
        <Text style={[styles.footer, { color: colors.mutedForeground }]}>
          رمز، کد ورود و توکن نشست در گزارش‌ها ثبت نمی‌شوند.
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
            فرم آزمایشی فقط در بیلد توسعه با
            {' EXPO_PUBLIC_PETIPY_AUTH_MODE=development '}
            و وقتی حالت توسعه‌ی Petipy فعال است نمایش داده می‌شود.
          </Text>
        ) : null}
      </KeyboardAwareScrollViewCompat>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 22,
  },
  card: {
    alignItems: 'stretch',
    borderWidth: 1.5,
    borderRadius: 24,
    padding: 22,
    gap: 14,
  },
  brandMark: {
    alignSelf: 'center',
    width: 54,
    height: 54,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eyebrow: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.7,
    textAlign: 'center',
  },
  title: {
    fontSize: 27,
    fontWeight: '700',
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  body: {
    fontSize: 13,
    lineHeight: 21,
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  notice: {
    flexDirection: 'row-reverse',
    alignItems: 'flex-start',
    gap: 9,
    borderRadius: 14,
    padding: 12,
  },
  noticeText: {
    flex: 1,
    fontSize: 11,
    lineHeight: 19,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  form: { gap: 9, marginTop: 2 },
  label: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'right',
    writingDirection: 'rtl',
    marginTop: 3,
  },
  input: {
    minHeight: 50,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    fontSize: 15,
  },
  codeInput: {
    alignSelf: 'flex-end',
    width: 170,
    letterSpacing: 7,
    fontWeight: '700',
  },
  primaryButton: {
    minHeight: 50,
    borderRadius: 15,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    paddingHorizontal: 16,
    marginTop: 6,
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
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryText: { fontSize: 12, fontWeight: '700', writingDirection: 'rtl' },
  footer: {
    fontSize: 11,
    lineHeight: 18,
    textAlign: 'center',
    writingDirection: 'rtl',
    marginTop: 14,
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 13,
    paddingHorizontal: 22,
  },
});
