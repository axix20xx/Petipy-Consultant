import { useColors } from '@/hooks/useColors';
import { PetipyPetMark } from '@/components/PetipyPetMark';
import { setConsultantAvailability } from '@/lib/petipy-api';
import {
  isAvailabilityServiceRunning,
  stopAvailabilityService,
} from '@/lib/background-monitor';
import {
  canUseFullScreenIntent,
  openFullScreenIntentSettings,
} from '@/lib/full-screen-access';
import {
  getIncomingCallChannelStatus,
  openIncomingCallChannelSettings,
} from '@/lib/incoming-call-alerts';
import { useConsultantSession } from '@/providers/consultant-session';
import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import {
  AppState,
  ActivityIndicator,
  Alert,
  Linking,
  PermissionsAndroid,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

function InfoRow({
  icon,
  title,
  detail,
  color,
  status,
  statusColor,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  detail: string;
  color: string;
  status?: string;
  statusColor?: string;
}) {
  const colors = useColors();
  return (
    <View style={[styles.infoRow, { borderBottomColor: colors.border }]}>
      <View style={[styles.rowIcon, { backgroundColor: colors.secondary }]}>
        <Ionicons name={icon} size={19} color={color} />
      </View>
      <View style={styles.rowCopy}>
        <View style={styles.rowTitleLine}>
          <Text style={[styles.rowTitle, { color: colors.foreground }]}>{title}</Text>
          {status ? (
            <View style={[styles.rowStatus, { backgroundColor: colors.muted }]}>
              <View style={[styles.statusDot, { backgroundColor: statusColor ?? color }]} />
              <Text style={[styles.rowStatusText, { color: colors.foreground }]}>{status}</Text>
            </View>
          ) : null}
        </View>
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
    disconnect,
    pushSetupState,
    pushSetupMessage,
    retryPushSetup,
  } = useConsultantSession();
  const [signingOut, setSigningOut] = useState(false);
  const [fullScreenAccess, setFullScreenAccess] = useState<boolean | null>(null);
  const [callChannelStatus, setCallChannelStatus] = useState<
    | 'high'
    | 'high-silent'
    | 'low'
    | 'low-silent'
    | 'blocked'
    | 'missing'
    | 'unavailable'
  >('unavailable');
  const [serviceRunning, setServiceRunning] = useState<boolean | null>(null);
  const [notificationAccess, setNotificationAccess] = useState<boolean | null>(null);
  const isConnected = state === 'connected' && Boolean(token);

  const refreshCallAlertStatus = useCallback(async () => {
    const [access, channelStatus, notifications] = await Promise.all([
      canUseFullScreenIntent(),
      getIncomingCallChannelStatus(),
      Platform.OS === 'android'
        ? Number(Platform.Version) < 33
          ? Promise.resolve(true)
          : PermissionsAndroid.check(
              PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
            )
        : Promise.resolve(null),
    ]);
    setFullScreenAccess(access);
    setCallChannelStatus(channelStatus);
    setNotificationAccess(notifications);
    setServiceRunning(isAvailabilityServiceRunning());
  }, []);

  useFocusEffect(
    useCallback(() => {
      void refreshCallAlertStatus();
    }, [refreshCallAlertStatus]),
  );

  useEffect(() => {
    void refreshCallAlertStatus();
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') void refreshCallAlertStatus();
    });
    return () => subscription.remove();
  }, [refreshCallAlertStatus]);

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
    }
    try {
      const result = await disconnect();
      if (!result.pushRevoked) {
        Alert.alert(
          'اعلان دستگاه قطع نشد',
          'خروج انجام شد، اما اتصال اعلان این دستگاه از سرور حذف نشد. هنگام اتصال دوباره، وضعیت را بررسی کنید.',
        );
      }
    } catch {
      Alert.alert(
        'خروج امن انجام نشد',
        'نشست امن پاک نشد یا سرویس تماس متوقف نشد. دوباره تلاش کنید.',
      );
    } finally {
      await stopAvailabilityService().catch(() => undefined);
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
        <View style={[styles.identitySection, { backgroundColor: colors.secondary }]}>
        <View style={styles.settingsTop}>
          <View style={styles.settingsHeading}>
            <Text style={[styles.settingsEyebrow, { color: colors.secondaryForeground }]}>فضای شخصی مشاور</Text>
            <Text style={[styles.settingsTitle, { color: colors.foreground }]}>حساب و آمادگی</Text>
          </View>
          <PetipyPetMark compact />
        </View>

        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionKicker, { color: colors.primary }]}>پروفایل</Text>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>حساب شما</Text>
        </View>
        <View style={[styles.accountCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {isConnected ? (
            <>
              <View style={[styles.profilePanel, { backgroundColor: colors.background, borderColor: colors.border }]}>
                <View style={[styles.profileMark, { backgroundColor: colors.secondary }]}>
                  <Ionicons name="person-outline" size={22} color={colors.primary} />
                </View>
                <View style={styles.profileCopy}>
                  <Text style={[styles.profileName, { color: colors.foreground }]}>{profile?.displayName ?? 'مشاور Petipy'}</Text>
                  <View style={[styles.profileStatus, { backgroundColor: colors.secondary }]}>
                    <View style={[styles.profileDot, { backgroundColor: colors.success }]} />
                    <Text style={[styles.profileStatusText, { color: colors.secondaryForeground }]}>حساب تأییدشده</Text>
                  </View>
                </View>
              </View>
              <Text style={[styles.body, { color: colors.mutedForeground }]}>
                حساب فعال از API مشاور تأیید شد. API نقش و دسترسی VOICE_CONSULTANT را بررسی می‌کند.
              </Text>
            </>
          ) : (
            <>
              <Text style={[styles.body, { color: colors.foreground }]}>
                ورود Android با ارائه‌دهنده‌ی رسمی Petipy هنوز به این برنامه متصل نشده است.
              </Text>
              <View style={[styles.authNotice, { backgroundColor: colors.accent }]}>
                <Ionicons name="information-circle-outline" size={17} color={colors.warning} />
                <Text style={[styles.authNoticeText, { color: colors.accentForeground }]}>
                  ورود وب فقط کوکی مرورگر می‌سازد. مسیر OTP توسعه‌ای برای VOICE_CONSULTANT پشتیبانی ندارد؛ تا آماده‌شدن ورود رسمی Android، از OTP توسعه‌ای یا کپی‌کردن توکن استفاده نمی‌شود.
                </Text>
              </View>
              {message ? (
                <Text accessibilityRole="alert" style={[styles.error, { color: colors.destructive }]}>
                  {message}
                </Text>
              ) : null}
              <Text style={[styles.footnote, { color: colors.mutedForeground }]}>
                نشست اپ‌های دیگر قابل‌خواندن نیست و به این برنامه منتقل نمی‌شود. ورود فقط پس از فراهم‌شدن مسیر رسمی Android فعال خواهد شد.
              </Text>
            </>
          )}
        </View>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionKicker, { color: colors.primary }]}>آمادگی دستگاه</Text>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>دریافت تماس</Text>
        </View>
        <View style={[styles.capabilityPanel, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.serviceSummary, { backgroundColor: serviceRunning ? colors.secondary : colors.muted }]}>
            <View style={[styles.serviceSummaryIcon, { backgroundColor: colors.card }]}>
              <Ionicons name={serviceRunning ? 'radio' : 'radio-outline'} size={20} color={serviceRunning ? colors.success : colors.warning} />
            </View>
            <View style={styles.serviceSummaryCopy}>
              <Text style={[styles.rowTitle, { color: colors.foreground }]}>سرویس تماس پس‌زمینه</Text>
              <Text style={[styles.rowDetail, { color: colors.mutedForeground }]}>
                {serviceRunning === null
                  ? 'در حال خواندن وضعیت سرویس دستگاه…'
                  : serviceRunning
                    ? 'سرویس foreground در حال اجراست.'
                    : Platform.OS === 'android'
                      ? 'سرویس فعلاً متوقف است؛ برای دریافت تماس، در خانه آنلاین شوید.'
                      : 'سرویس تماس پس‌زمینه فقط در Android در دسترس است.'}
              </Text>
            </View>
            <View style={[styles.statePill, { backgroundColor: colors.card }]}>
              <View style={[styles.statusDot, { backgroundColor: serviceRunning ? colors.success : colors.warning }]} />
              <Text style={[styles.statePillText, { color: colors.foreground }]}>
                {serviceRunning === null ? 'بررسی' : serviceRunning ? 'فعال' : Platform.OS === 'android' ? 'متوقف' : 'فقط Android'}
              </Text>
            </View>
          </View>
          <InfoRow
            icon="information-circle-outline"
            title="محدودیت توقف اجباری Android"
            detail="اگر از تنظیمات Android «توقف اجباری» را بزنید، تماس و اعلان تا بازکردن دوباره‌ی Petipy متوقف می‌شود. برای خروج، از دکمه‌ی خانه استفاده کنید یا صفحه را قفل کنید."
            color={colors.warning}
            status="محدودیت سیستم"
            statusColor={colors.warning}
          />
          <InfoRow
            icon="notifications-outline"
            title="اعلان تماس فعال"
            detail={
              notificationAccess === null
                ? 'وضعیت مجوز اعلان دستگاه در دسترس نیست.'
                : notificationAccess
                  ? 'مجوز اعلان دستگاه فعال است.'
                  : 'مجوز اعلان Android مسدود است؛ اعلان تماس ممکن است نمایش داده نشود.'
            }
            color={notificationAccess === false ? colors.warning : colors.primary}
            status={notificationAccess === null ? 'نامشخص' : notificationAccess ? 'مجاز' : 'مسدود'}
            statusColor={notificationAccess === false ? colors.warning : notificationAccess ? colors.success : colors.mutedForeground}
          />
          <InfoRow
            icon="phone-portrait-outline"
            title="دسترسی تمام‌صفحه Android"
            detail={
              fullScreenAccess === true
                ? 'Android دسترسی تمام‌صفحه را برای Petipy مجاز می‌داند. هنگام بازبودن گوشی ممکن است فقط بنر تماس نمایش داده شود.'
                : fullScreenAccess === false
                  ? 'Android دسترسی تمام‌صفحه را مسدود کرده است؛ به همین دلیل فقط اعلان دیده می‌شود.'
                  : 'وضعیت دسترسی تمام‌صفحه از Android قابل‌خواندن نیست.'
            }
            color={fullScreenAccess === false ? colors.warning : colors.primary}
            status={fullScreenAccess === null ? 'در حال بررسی' : fullScreenAccess ? 'مجاز' : 'مسدود'}
            statusColor={fullScreenAccess === false ? colors.warning : fullScreenAccess ? colors.success : colors.mutedForeground}
          />
          <InfoRow
            icon="notifications-outline"
            title="کانال اعلان تماس"
            detail={
              callChannelStatus === 'high'
                ? 'صدای اعلان فعال است و اولویت کانال بالاست.'
                : callChannelStatus === 'high-silent'
                  ? 'اولویت بالاست، اما Android صدای اعلان این کانال را خاموش کرده است.'
                : callChannelStatus === 'low'
                    ? 'صدا فعال است، اما اولویت کانال پایین است.'
                    : callChannelStatus === 'low-silent'
                      ? 'صدای اعلان خاموش است و اولویت کانال نیز پایین است.'
                      : callChannelStatus === 'blocked'
                        ? 'این کانال در Android مسدود شده است.'
                        : callChannelStatus === 'missing'
                          ? 'کانال تماس هنوز ساخته نشده است؛ برنامه را دوباره باز کنید.'
                          : 'وضعیت کانال در دسترس نیست.'
            }
            color={callChannelStatus === 'high' ? colors.success : colors.warning}
            status={
              callChannelStatus === 'high'
                ? 'فعال'
                : callChannelStatus === 'high-silent'
                  ? 'بی‌صدا'
                  : callChannelStatus === 'low'
                    ? 'اولویت پایین'
                    : callChannelStatus === 'low-silent'
                      ? 'پایین و بی‌صدا'
                      : callChannelStatus === 'blocked'
                        ? 'مسدود'
                        : callChannelStatus === 'missing'
                          ? 'ساخته نشده'
                          : 'نامشخص'
            }
            statusColor={callChannelStatus === 'high' ? colors.success : colors.warning}
          />
          {Platform.OS === 'android' && fullScreenAccess !== true ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                void openFullScreenIntentSettings().then((opened) => {
                  if (!opened) return Linking.openSettings();
                }).catch(() => Linking.openSettings()).catch(() =>
                  Alert.alert(
                    'تنظیمات باز نشد',
                    'دسترسی تمام‌صفحه را از Special app access در تنظیمات Android باز کنید.',
                  ),
                );
              }}
              style={styles.infoRow}
              testID="open-full-screen-access-settings"
            >
              <View style={[styles.rowIcon, { backgroundColor: colors.secondary }]}>
                <Ionicons name="open-outline" size={19} color={colors.primary} />
              </View>
              <View style={styles.rowCopy}>
                <Text style={[styles.rowTitle, { color: colors.primary }]}>
                  بررسی یا بازکردن دسترسی تمام‌صفحه
                </Text>
              </View>
            </Pressable>
          ) : null}
          {Platform.OS === 'android' && callChannelStatus !== 'high' ? (
            <Pressable
              accessibilityRole="button"
              onPress={() =>
                void openIncomingCallChannelSettings().catch(() =>
                  Linking.openSettings().catch(() =>
                    Alert.alert(
                      'تنظیمات اعلان باز نشد',
                      'تنظیمات اعلان‌های Petipy را از اطلاعات برنامه باز کنید.',
                    ),
                  ),
                )
              }
              style={styles.infoRow}
              testID="open-incoming-call-channel-settings"
            >
              <View style={[styles.rowIcon, { backgroundColor: colors.secondary }]}>
                <Ionicons name="notifications-outline" size={19} color={colors.primary} />
              </View>
              <View style={styles.rowCopy}>
                <Text style={[styles.rowTitle, { color: colors.primary }]}>
                  بازکردن تنظیمات کانال تماس
                </Text>
              </View>
            </Pressable>
          ) : null}
          <InfoRow
            icon="notifications-outline"
            title={Platform.OS === 'ios' ? 'تماس iOS هنگام بازبودن' : 'وضعیت اعلان FCM'}
            detail={
              pushSetupMessage ??
              (pushSetupState === 'idle'
                ? 'پس از ورود مشاور، دستگاه برای اعلان ثبت می‌شود.'
                : 'در انتظار وضعیت سرویس اعلان…')
            }
            color={
              pushSetupState === 'ready'
                ? colors.success
                : pushSetupState === 'error' ||
                    pushSetupState === 'permission-denied' ||
                    pushSetupState === 'server-disabled'
                  ? colors.warning
                  : colors.primary
            }
            status={
              pushSetupState === 'ready'
                ? 'ثبت شده'
                : pushSetupState === 'idle'
                  ? 'در انتظار'
                    : pushSetupState === 'foreground-only'
                      ? 'فاز اول'
                  : pushSetupState === 'unsupported'
                    ? 'پشتیبانی نمی‌شود'
                    : pushSetupState === 'error' || pushSetupState === 'permission-denied' || pushSetupState === 'server-disabled'
                      ? 'نیاز به بررسی'
                      : 'در حال ثبت'
            }
            statusColor={pushSetupState === 'ready' ? colors.success : colors.warning}
          />
          {isConnected &&
          pushSetupState !== 'ready' &&
          pushSetupState !== 'foreground-only' ? (
            <Pressable
              accessibilityRole="button"
              onPress={retryPushSetup}
              style={styles.infoRow}
              testID="retry-fcm-registration"
            >
              <View style={[styles.rowIcon, { backgroundColor: colors.secondary }]}>
                <Ionicons name="refresh-outline" size={19} color={colors.primary} />
              </View>
              <View style={styles.rowCopy}>
                <Text style={[styles.rowTitle, { color: colors.primary }]}>
                  تلاش دوباره برای ثبت اعلان
                </Text>
              </View>
            </Pressable>
          ) : null}
          {Platform.OS === 'android' ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                void Linking.openSettings().catch(() =>
                  Alert.alert('تنظیمات باز نشد', 'تنظیمات Petipy را از اطلاعات برنامه باز کنید.'),
                );
              }}
              style={styles.infoRow}
              testID="open-android-app-settings"
            >
              <View style={[styles.rowIcon, { backgroundColor: colors.secondary }]}>
                <Ionicons name="settings-outline" size={19} color={colors.primary} />
              </View>
              <View style={styles.rowCopy}>
                <Text style={[styles.rowTitle, { color: colors.primary }]}>
                  باز کردن تنظیمات برنامه
                </Text>
              </View>
            </Pressable>
          ) : null}
          {Platform.OS === 'android' ? (
            <>
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
                اگر FCM یا مجوز اعلان در دسترس نباشد، سرویس foreground هنگام آنلاین‌بودن صف تماس را بررسی می‌کند. پس از Force stop، Android دریافت اعلان و اجرای سرویس را متوقف می‌کند.
              </Text>
            </>
          ) : Platform.OS === 'ios' ? (
            <Text style={[styles.footnote, { color: colors.mutedForeground }]}>
              در فاز اول، تماس هنگام بازبودن برنامه از صف Petipy دریافت می‌شود. اعلان استاندارد iOS هنوز به مسیر سرور متصل نیست؛ PushKit و CallKit آماده اما غیرفعال‌اند تا اعتبارنامه‌های Apple و ساخت بومی فراهم شود. پس از Force Quit دستی، دریافت تماس تضمین نمی‌شود.
            </Text>
          ) : null}
        </View>

        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionKicker, { color: colors.primary }]}>یادآوری</Text>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>نکته‌های تماس امن</Text>
        </View>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.cardHeading}>
            <View style={[styles.safetyIcon, { backgroundColor: colors.secondary }]}>
              <Ionicons name="shield-checkmark-outline" size={20} color={colors.primary} />
            </View>
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>حفاظت از اتصال</Text>
          </View>
          <Text style={[styles.body, { color: colors.mutedForeground }]}>
            تماس با API پتی‌پای برقرار می‌شود و TURN relay-only از نشست دریافت می‌شود. {Platform.OS === 'ios' ? 'تماس پیش‌زمینه فعال است؛ PushKit و CallKit تا آماده‌شدن زیرساخت Apple غیرفعال‌اند.' : 'FCM فقط اعلان را می‌رساند.'} هیچ Google STUN استفاده نمی‌شود.
          </Text>
          <View style={[styles.statusBadge, { backgroundColor: colors.accent }]}>
            <View style={[styles.badgeDot, { backgroundColor: colors.warning }]} />
            <Text style={[styles.badgeText, { color: colors.accentForeground }]}>
              {state === 'connected' ? 'حساب مشاور تأیید شد' : 'در انتظار نشست رسمی Petipy'}
            </Text>
          </View>
        </View>

        {isConnected ? (
          <View style={styles.secureSessionSection}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionKicker, { color: colors.primary }]}>نشست امن</Text>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>مدیریت حساب</Text>
            </View>
            <Pressable
              testID="sign-out"
              accessibilityRole="button"
              onPress={() => void signOut()}
              disabled={signingOut}
              style={({ pressed }) => [
                styles.signOutButton,
                { backgroundColor: colors.card, borderColor: colors.border, opacity: signingOut ? 0.7 : pressed ? 0.82 : 1 },
              ]}
            >
              {signingOut ? (
                <ActivityIndicator color={colors.destructive} />
              ) : (
                <Ionicons name="log-out-outline" size={18} color={colors.destructive} />
              )}
              <Text style={[styles.signOutText, { color: colors.destructive }]}>خروج امن</Text>
              <View style={styles.signOutSpacer} />
              <Ionicons name="chevron-back" size={16} color={colors.mutedForeground} />
            </Pressable>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { width: '100%', maxWidth: 620, alignSelf: 'center', paddingHorizontal: 18, paddingTop: 14, paddingBottom: 38, gap: 15 },
  webContent: { paddingTop: 67, paddingBottom: 34 },
  settingsTop: { minHeight: 92, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 },
  identitySection: { borderRadius: 28, padding: 14, gap: 7, overflow: 'hidden' },
  settingsHeading: { alignItems: 'flex-end', gap: 2 },
  settingsEyebrow: { fontSize: 10, fontWeight: '700', writingDirection: 'rtl' },
  settingsTitle: { fontSize: 26, fontWeight: '800', writingDirection: 'rtl' },
  settingsMark: { width: 48, height: 48, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  heroTop: { flexDirection: 'row-reverse', alignItems: 'center', gap: 9 },
  brandMark: { width: 36, height: 36, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  brandLabel: { fontSize: 9, fontWeight: '800', letterSpacing: 1.1, writingDirection: 'rtl' },
  heroCopy: { alignItems: 'flex-end', gap: 4 },
  eyebrow: { fontSize: 10, fontWeight: '700', textAlign: 'right', writingDirection: 'rtl', opacity: 0.8 },
  title: { fontSize: 29, fontWeight: '800', textAlign: 'right', writingDirection: 'rtl' },
  subtitle: { fontSize: 11, lineHeight: 18, textAlign: 'right', writingDirection: 'rtl', opacity: 0.82 },
  heroOrnament: { position: 'absolute', width: 144, height: 144, borderWidth: 1, borderRadius: 72, opacity: 0.11, left: -45, top: -62 },
  sectionHeader: { alignItems: 'flex-end', gap: 4, marginTop: 8, paddingHorizontal: 2 },
  sectionKicker: { fontSize: 9, fontWeight: '800', letterSpacing: 0.6, writingDirection: 'rtl' },
  sectionTitle: { fontSize: 18, fontWeight: '800', writingDirection: 'rtl' },
  card: { borderRadius: 18, borderWidth: 1, padding: 16, gap: 14, elevation: 0 },
  accountCard: { borderRadius: 25, borderWidth: 1, padding: 15, gap: 12, elevation: 1 },
  capabilityPanel: { borderRadius: 24, borderWidth: 1, paddingHorizontal: 15, paddingVertical: 7, elevation: 1 },
  serviceSummary: { flexDirection: 'row-reverse', alignItems: 'center', gap: 9, borderRadius: 16, padding: 11, marginVertical: 7 },
  serviceSummaryIcon: { width: 39, height: 39, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  serviceSummaryCopy: { flex: 1, alignItems: 'flex-end', gap: 3 },
  statePill: { flexDirection: 'row-reverse', alignItems: 'center', gap: 5, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 6 },
  statePillText: { fontSize: 9, fontWeight: '700', writingDirection: 'rtl' },
  cardHeading: { flexDirection: 'row-reverse', alignItems: 'center', gap: 9 },
  safetyIcon: { width: 36, height: 36, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { fontSize: 15, fontWeight: '700', writingDirection: 'rtl' },
  profileName: { fontSize: 17, fontWeight: '700', textAlign: 'right', writingDirection: 'rtl' },
  profilePanel: { flexDirection: 'row-reverse', alignItems: 'center', gap: 14, padding: 15, borderRadius: 20, borderWidth: 1 },
  profileMark: { width: 56, height: 56, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  profileCopy: { flex: 1, alignItems: 'flex-end', gap: 6 },
  profileStatus: { flexDirection: 'row-reverse', alignItems: 'center', gap: 5, borderRadius: 9, paddingHorizontal: 8, paddingVertical: 4 },
  profileDot: { width: 6, height: 6, borderRadius: 3 },
  profileStatusText: { fontSize: 9, fontWeight: '700', writingDirection: 'rtl' },
  body: { textAlign: 'right', fontSize: 12, lineHeight: 21, writingDirection: 'rtl' },
  authNotice: { flexDirection: 'row-reverse', alignItems: 'flex-start', gap: 8, borderRadius: 13, padding: 11 },
  authNoticeText: { flex: 1, fontSize: 10, lineHeight: 18, textAlign: 'right', writingDirection: 'rtl' },
  error: { fontSize: 11, lineHeight: 18, textAlign: 'right', writingDirection: 'rtl' },
  secondaryButton: { minHeight: 48, borderRadius: 16, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 16, alignSelf: 'flex-end' },
  secondaryButtonText: { fontSize: 12, fontWeight: '700', writingDirection: 'rtl' },
  secureSessionSection: { gap: 8, marginTop: 4 },
  signOutButton: { minHeight: 52, flexDirection: 'row-reverse', alignItems: 'center', gap: 9, paddingHorizontal: 14, borderRadius: 15, borderWidth: 1 },
  signOutText: { fontSize: 12, fontWeight: '800', writingDirection: 'rtl' },
  signOutSpacer: { flex: 1 },
  statusBadge: { alignSelf: 'flex-end', flexDirection: 'row-reverse', alignItems: 'center', gap: 7, paddingHorizontal: 11, paddingVertical: 7, borderRadius: 20 },
  badgeDot: { width: 7, height: 7, borderRadius: 4 },
  badgeText: { fontSize: 11, fontWeight: '600', writingDirection: 'rtl' },
  infoRow: { flexDirection: 'row-reverse', alignItems: 'flex-start', gap: 10, paddingVertical: 13, borderBottomWidth: StyleSheet.hairlineWidth },
  rowIcon: { width: 38, height: 38, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  rowCopy: { flex: 1, alignItems: 'flex-end', gap: 5 },
  rowTitleLine: { width: '100%', flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  rowStatus: { flexDirection: 'row-reverse', alignItems: 'center', gap: 5, borderRadius: 9, paddingHorizontal: 7, paddingVertical: 5 },
  rowStatusText: { fontSize: 10, fontWeight: '700', writingDirection: 'rtl' },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  rowTitle: { flexShrink: 1, fontSize: 12, fontWeight: '700', textAlign: 'right', writingDirection: 'rtl' },
  rowDetail: { fontSize: 12, lineHeight: 20, textAlign: 'right', writingDirection: 'rtl' },
  footnote: { fontSize: 11, lineHeight: 19, textAlign: 'right', writingDirection: 'rtl', marginTop: 1 },
});
