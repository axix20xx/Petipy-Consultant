import { useColors } from '@/hooks/useColors';
import { PetipyPetMark } from '@/components/PetipyPetMark';
import { PetipyText as Text } from '@/components/PetipyText';
import {
  getIncomingCalls,
  setConsultantAvailability,
} from '@/lib/petipy-api';
import { canReceiveForegroundCall } from '@/lib/ios-call-recovery';
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
import {
  normalizeIosNotificationPermission,
  type IosNotificationPermission,
} from '@/lib/ios-notification-permission';
import {
  normalizeMicrophonePermission,
  type MicrophonePermission,
} from '@/lib/microphone-permission';
import { useConsultantSession } from '@/providers/consultant-session';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { useCallback, useState } from 'react';
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

function SettingsActionRow({
  icon,
  title,
  onPress,
  testID,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  onPress: () => void;
  testID: string;
}) {
  const colors = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={[styles.infoRow, { borderBottomColor: colors.border }]}
      testID={testID}
    >
      <View style={[styles.rowIcon, { backgroundColor: colors.secondary }]}>
        <Ionicons name={icon} size={19} color={colors.primary} />
      </View>
      <View style={styles.rowCopy}>
        <Text style={[styles.rowTitle, { color: colors.primary }]}>{title}</Text>
      </View>
    </Pressable>
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
  const [microphoneAccess, setMicrophoneAccess] = useState<boolean | null>(null);
  const [iosNotificationAccess, setIosNotificationAccess] =
    useState<IosNotificationPermission>('unavailable');
  const [iosMicrophoneAccess, setIosMicrophoneAccess] =
    useState<MicrophonePermission>('unavailable');
  const [iosBackendReachable, setIosBackendReachable] = useState<
    boolean | null
  >(null);
  const [iosCallKitAvailable, setIosCallKitAvailable] = useState<
    boolean | null
  >(null);
  const [iosAudioSession, setIosAudioSession] = useState<{
    configured: boolean;
    active: boolean;
  } | null>(null);
  const isConnected = state === 'connected' && Boolean(token);
  const hasSession = Boolean(token) && ['connected', 'offline'].includes(state);

  const refreshCallAlertStatus = useCallback(async () => {
    if (Platform.OS === 'android') {
      try {
        const [access, channelStatus, notifications, microphone] =
          await Promise.all([
            canUseFullScreenIntent(),
            getIncomingCallChannelStatus(),
            Number(Platform.Version) < 33
              ? Promise.resolve(true)
              : PermissionsAndroid.check(
                  PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
                ),
            PermissionsAndroid.check(
              PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
            ),
          ]);
        setFullScreenAccess(access);
        setCallChannelStatus(channelStatus);
        setNotificationAccess(notifications);
        setMicrophoneAccess(microphone);
        setServiceRunning(isAvailabilityServiceRunning());
      } catch {
        setFullScreenAccess(null);
        setCallChannelStatus('unavailable');
        setNotificationAccess(null);
        setMicrophoneAccess(null);
        setServiceRunning(isAvailabilityServiceRunning());
      }
      setIosNotificationAccess('unavailable');
      setIosMicrophoneAccess('unavailable');
      setIosBackendReachable(null);
      setIosCallKitAvailable(null);
      setIosAudioSession(null);
      return;
    }

    setFullScreenAccess(null);
    setCallChannelStatus('unavailable');
    setNotificationAccess(null);
    setMicrophoneAccess(null);
    setServiceRunning(null);

    if (Platform.OS === 'ios') {
      const [notificationResult, microphoneResult, callKitResult, apiResult] =
        await Promise.allSettled([
          Notifications.getPermissionsAsync(),
          import('react-native-webrtc').then(({ permissions }) =>
            permissions.query({ name: 'microphone' }),
          ),
          import('expo-callkit-telecom').then(({ getAudioSession }) => {
            const audio = getAudioSession();
            return {
              configured:
                audio.useManualAudio === true &&
                Boolean(audio.category) &&
                Boolean(audio.mode),
              active: audio.isActive === true,
            };
          }),
          isConnected && token
            ? getIncomingCalls(token).then(() => true)
            : Promise.resolve(false),
        ]);
      if (notificationResult.status === 'fulfilled') {
        const permission = notificationResult.value;
        setIosNotificationAccess(
          normalizeIosNotificationPermission({
            granted: permission.granted,
            status: permission.status,
            iosStatus: permission.ios?.status,
          }),
        );
      } else {
        setIosNotificationAccess('unavailable');
      }
      setIosMicrophoneAccess(
        microphoneResult.status === 'fulfilled'
          ? normalizeMicrophonePermission(microphoneResult.value)
          : 'unavailable',
      );
      setIosCallKitAvailable(callKitResult.status === 'fulfilled');
      setIosAudioSession(
        callKitResult.status === 'fulfilled' ? callKitResult.value : null,
      );
      setIosBackendReachable(
        apiResult.status === 'fulfilled' ? apiResult.value : false,
      );
      return;
    }

    setIosNotificationAccess('unavailable');
    setIosMicrophoneAccess('unavailable');
    setIosBackendReachable(null);
    setIosCallKitAvailable(null);
    setIosAudioSession(null);
  }, [isConnected, token]);

  useFocusEffect(
    useCallback(() => {
      void refreshCallAlertStatus();
      const subscription = AppState.addEventListener('change', (nextState) => {
        if (nextState === 'active') void refreshCallAlertStatus();
      });
      return () => subscription.remove();
    }, [refreshCallAlertStatus]),
  );

  const pushStatusLabel =
    pushSetupState === 'ready'
      ? 'ثبت شده'
      : pushSetupState === 'idle'
        ? 'در انتظار'
        : pushSetupState === 'foreground-only'
          ? Platform.OS === 'ios'
            ? 'فقط پیش‌زمینه'
            : 'فاز اول'
          : pushSetupState === 'unsupported'
            ? 'پشتیبانی نمی‌شود'
            : pushSetupState === 'error' ||
                pushSetupState === 'permission-denied' ||
                pushSetupState === 'server-disabled'
              ? 'نیاز به بررسی'
              : 'در حال ثبت';
  const pushStatusColor =
    pushSetupState === 'ready' ? colors.success : colors.warning;

  const iosNotificationPermissionCopy = {
    authorized: {
      label: 'مجاز',
      detail:
        'اعلان‌های معمولی در iOS مجازند؛ این به‌تنهایی تماس ورودی پس‌زمینه را فعال نمی‌کند.',
      color: colors.success,
    },
    provisional: {
      label: 'آرام',
      detail:
        'اعلان‌ها به‌صورت بی‌صدا و موقت مجازند؛ تماس ورودی پس‌زمینه هنوز به PushKit و API نیاز دارد.',
      color: colors.warning,
    },
    denied: {
      label: 'مسدود',
      detail: 'اجازه اعلان‌های iOS رد شده است. وضعیت را از تنظیمات دستگاه تغییر دهید.',
      color: colors.warning,
    },
    'not-determined': {
      label: 'درخواست نشده',
      detail:
        'اجازه هنوز درخواست نشده است. چون API فعلی ارسال تماس iOS ندارد، درخواست مجوز را بی‌دلیل نمایش نمی‌دهیم.',
      color: colors.mutedForeground,
    },
    unavailable: {
      label: 'نامشخص',
      detail: 'وضعیت اجازه اعلان iOS از این دستگاه خوانده نشد.',
      color: colors.mutedForeground,
    },
  }[iosNotificationAccess];

  const iosMicrophonePermissionCopy: Record<
    MicrophonePermission,
    { label: string; detail: string; color: string }
  > = {
    granted: {
      label: 'مجاز',
      detail: 'اجازه میکروفون در iOS فعال است.',
      color: colors.success,
    },
    denied: {
      label: 'مسدود',
      detail: 'اجازه میکروفون رد شده است؛ برای تماس آن را در تنظیمات iOS فعال کنید.',
      color: colors.warning,
    },
    prompt: {
      label: 'درخواست نشده',
      detail: 'iOS هنگام نخستین تلاش برای تماس، اجازه میکروفون را درخواست می‌کند.',
      color: colors.mutedForeground,
    },
    unavailable: {
      label: 'نامشخص',
      detail: 'وضعیت میکروفون از این دستگاه خوانده نشد.',
      color: colors.mutedForeground,
    },
  };
  const iosMicrophonePermission = iosMicrophonePermissionCopy[iosMicrophoneAccess];
  const iosBackendStatus = !isConnected
    ? hasSession
      ? { label: 'اتصال موقتاً قطع است', color: colors.warning }
      : { label: 'نشست موجود نیست', color: colors.warning }
    : iosBackendReachable === true
      ? { label: 'متصل', color: colors.success }
      : iosBackendReachable === false
        ? { label: 'قطع', color: colors.warning }
        : { label: 'در حال بررسی', color: colors.mutedForeground };
  const iosCallKitStatus =
    iosCallKitAvailable === true
      ? { label: 'در دسترس', color: colors.success }
      : iosCallKitAvailable === false
        ? { label: 'در دسترس نیست', color: colors.warning }
        : { label: 'در حال بررسی', color: colors.mutedForeground };
  const iosAudioStatus = !iosCallKitAvailable
    ? { label: 'نامشخص', color: colors.mutedForeground }
    : iosAudioSession?.configured
      ? {
          label: iosAudioSession.active ? 'فعال در تماس' : 'آماده برای تماس',
          color: colors.success,
        }
      : { label: 'پیکربندی نشده', color: colors.warning };
  const iosForegroundCallsReady = canReceiveForegroundCall({
    apiReachable: iosBackendReachable === true,
    callKitAvailable: iosCallKitAvailable === true,
    microphoneGranted: iosMicrophoneAccess === 'granted',
    consultantOnline: profile?.manualStatus === 'online',
  });

  const openSystemSettings = useCallback(() => {
    void Linking.openSettings().catch(() =>
      Alert.alert(
        'تنظیمات باز نشد',
        'تنظیمات Petipy را از بخش برنامه‌ها در دستگاه باز کنید.',
      ),
    );
  }, []);

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
        <View style={styles.settingsIntro}>
          <View style={styles.settingsTop}>
            <View style={styles.settingsHeading}>
              <Text style={[styles.settingsEyebrow, { color: colors.primary }]}>فضای شخصی مشاور</Text>
              <Text style={[styles.settingsTitle, { color: colors.foreground }]}>حساب و آمادگی</Text>
            </View>
            <PetipyPetMark compact />
          </View>

          <View style={[styles.accountCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {hasSession ? (
              <>
                <View style={styles.profilePanel}>
                  <View style={[styles.profileMark, { backgroundColor: colors.secondary }]}>
                    <Ionicons name="person-outline" size={22} color={colors.primary} />
                  </View>
                  <View style={styles.profileCopy}>
                    <Text style={[styles.profileName, { color: colors.foreground }]}>{profile?.displayName ?? 'مشاور Petipy'}</Text>
                      <View style={[styles.profileStatus, { backgroundColor: state === 'offline' ? colors.accent : colors.secondary }]}>
                      <View style={[styles.profileDot, { backgroundColor: state === 'offline' ? colors.warning : colors.success }]} />
                      <Text style={[styles.profileStatusText, { color: state === 'offline' ? colors.accentForeground : colors.secondaryForeground }]}>
                        {state === 'offline' ? 'نشست امن ذخیره‌شده' : 'حساب تأییدشده'}
                      </Text>
                    </View>
                  </View>
                </View>
                <Text style={[styles.body, { color: colors.mutedForeground }]}>
                  {state === 'offline'
                    ? message ?? 'اتصال دوباره بررسی می‌شود؛ دسترسی سرور تا اتصال بعدی تأیید نشده است.'
                    : 'حساب فعال از API مشاور تأیید شد. API نقش و دسترسی VOICE_CONSULTANT را بررسی می‌کند.'}
                </Text>
              </>
            ) : (
              <>
                <Text style={[styles.body, { color: colors.foreground }]}>
                  ورود موبایلی زنده با ارائه‌دهنده‌ی رسمی Petipy هنوز به این برنامه متصل نشده است.
                </Text>
                <View style={[styles.authNotice, { backgroundColor: colors.accent }]}>
                  <Ionicons name="information-circle-outline" size={17} color={colors.warning} />
                  <Text style={[styles.authNoticeText, { color: colors.accentForeground }]}>
                    ورود وب فقط کوکی مرورگر می‌سازد. تا آماده‌شدن مسیر رسمی ورود موبایل، از OTP توسعه‌ای یا کپی‌کردن توکن استفاده نمی‌شود.
                  </Text>
                </View>
                {message ? (
                  <Text accessibilityRole="alert" style={[styles.error, { color: colors.destructive }]}>
                    {message}
                  </Text>
                ) : null}
                <Text style={[styles.footnote, { color: colors.mutedForeground }]}>
                  نشست اپ‌های دیگر قابل‌خواندن نیست و به این برنامه منتقل نمی‌شود. ورود موبایلی زنده پس از فراهم‌شدن مسیر رسمی Petipy فعال خواهد شد.
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
          {Platform.OS !== 'web' ? (
            <InfoRow
              icon="notifications-outline"
              title={Platform.OS === 'ios' ? 'وضعیت اعلان تماس iOS' : 'وضعیت اعلان FCM'}
              detail={
                pushSetupMessage ??
                (pushSetupState === 'idle'
                  ? 'پس از ورود مشاور، وضعیت اعلان دستگاه بررسی می‌شود.'
                  : 'در انتظار وضعیت سرویس اعلان…')
              }
              color={pushStatusColor}
              status={pushStatusLabel}
              statusColor={pushStatusColor}
            />
          ) : null}

          {Platform.OS === 'android' ? (
            <>
              <View
                style={[
                  styles.serviceSummary,
                  {
                    backgroundColor: serviceRunning
                      ? colors.secondary
                      : colors.muted,
                  },
                ]}
              >
                <View
                  style={[
                    styles.serviceSummaryIcon,
                    { backgroundColor: colors.card },
                  ]}
                >
                  <Ionicons
                    name={serviceRunning ? 'radio' : 'radio-outline'}
                    size={20}
                    color={serviceRunning ? colors.success : colors.warning}
                  />
                </View>
                <View style={styles.serviceSummaryCopy}>
                  <Text style={[styles.rowTitle, { color: colors.foreground }]}>
                    سرویس تماس پس‌زمینه
                  </Text>
                  <Text style={[styles.rowDetail, { color: colors.mutedForeground }]}>
                    {serviceRunning === null
                      ? 'در حال خواندن وضعیت سرویس دستگاه…'
                      : serviceRunning
                        ? 'سرویس foreground در حال اجراست.'
                        : 'سرویس فعلاً متوقف است؛ برای دریافت تماس، در خانه آنلاین شوید.'}
                  </Text>
                </View>
                <View style={[styles.statePill, { backgroundColor: colors.card }]}>
                  <View
                    style={[
                      styles.statusDot,
                      {
                        backgroundColor: serviceRunning
                          ? colors.success
                          : colors.warning,
                      },
                    ]}
                  />
                  <Text style={[styles.statePillText, { color: colors.foreground }]}>
                    {serviceRunning === null
                      ? 'بررسی'
                      : serviceRunning
                        ? 'فعال'
                        : 'متوقف'}
                  </Text>
                </View>
              </View>
              <InfoRow
                icon="notifications-outline"
                title="اجازه اعلان Android"
                detail={
                  notificationAccess === null
                    ? 'وضعیت مجوز اعلان دستگاه در دسترس نیست.'
                    : notificationAccess
                      ? 'مجوز اعلان دستگاه فعال است.'
                      : 'مجوز اعلان Android مسدود است؛ اعلان تماس ممکن است نمایش داده نشود.'
                }
                color={notificationAccess === false ? colors.warning : colors.primary}
                status={
                  notificationAccess === null
                    ? 'نامشخص'
                    : notificationAccess
                      ? 'مجاز'
                      : 'مسدود'
                }
                statusColor={
                  notificationAccess === false
                    ? colors.warning
                    : notificationAccess
                      ? colors.success
                      : colors.mutedForeground
                }
              />
              <InfoRow
                icon="mic-outline"
                title="اجازه میکروفون Android"
                detail={
                  microphoneAccess === null
                    ? 'وضعیت مجوز میکروفون دستگاه در دسترس نیست.'
                    : microphoneAccess
                      ? 'مجوز میکروفون فعال است.'
                      : 'برای پاسخ به تماس، مجوز میکروفون را در تنظیمات Android فعال کنید.'
                }
                color={microphoneAccess === false ? colors.warning : colors.primary}
                status={
                  microphoneAccess === null
                    ? 'نامشخص'
                    : microphoneAccess
                      ? 'مجاز'
                      : 'مسدود'
                }
                statusColor={
                  microphoneAccess === false
                    ? colors.warning
                    : microphoneAccess
                      ? colors.success
                      : colors.mutedForeground
                }
              />
              {microphoneAccess === false ? (
                <SettingsActionRow
                  icon="settings-outline"
                  title="بازکردن تنظیمات میکروفون Android"
                  testID="open-android-microphone-settings"
                  onPress={openSystemSettings}
                />
              ) : null}
              <InfoRow
                icon="phone-portrait-outline"
                title="دسترسی تمام‌صفحه Android"
                detail={
                  fullScreenAccess === true
                    ? 'Android دسترسی تمام‌صفحه را برای Petipy مجاز می‌داند. نمایش تمام‌صفحه همچنان به سیاست سیستم بستگی دارد.'
                    : fullScreenAccess === false
                      ? 'Android دسترسی تمام‌صفحه را مسدود کرده است؛ ممکن است فقط اعلان دیده شود.'
                      : 'وضعیت دسترسی تمام‌صفحه از Android قابل‌خواندن نیست.'
                }
                color={fullScreenAccess === false ? colors.warning : colors.primary}
                status={
                  fullScreenAccess === null
                    ? 'در حال بررسی'
                    : fullScreenAccess
                      ? 'مجاز'
                      : 'مسدود'
                }
                statusColor={
                  fullScreenAccess === false
                    ? colors.warning
                    : fullScreenAccess
                      ? colors.success
                      : colors.mutedForeground
                }
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
                statusColor={
                  callChannelStatus === 'high' ? colors.success : colors.warning
                }
              />
              {fullScreenAccess !== true ? (
                <SettingsActionRow
                  icon="open-outline"
                  title="بررسی یا بازکردن دسترسی تمام‌صفحه"
                  testID="open-full-screen-access-settings"
                  onPress={() => {
                    void openFullScreenIntentSettings()
                      .then((opened) => {
                        if (!opened) return Linking.openSettings();
                      })
                      .catch(() => Linking.openSettings())
                      .catch(() =>
                        Alert.alert(
                          'تنظیمات باز نشد',
                          'دسترسی تمام‌صفحه را از Special app access در تنظیمات Android باز کنید.',
                        ),
                      );
                  }}
                />
              ) : null}
              {callChannelStatus !== 'high' ? (
                <SettingsActionRow
                  icon="notifications-outline"
                  title="بازکردن تنظیمات کانال تماس"
                  testID="open-incoming-call-channel-settings"
                  onPress={() => {
                    void openIncomingCallChannelSettings().catch(() =>
                      Linking.openSettings().catch(() =>
                        Alert.alert(
                          'تنظیمات اعلان باز نشد',
                          'تنظیمات اعلان‌های Petipy را از اطلاعات برنامه باز کنید.',
                        ),
                      ),
                    );
                  }}
                />
              ) : null}
              {isConnected &&
              pushSetupState !== 'ready' &&
              pushSetupState !== 'foreground-only' ? (
                <SettingsActionRow
                  icon="refresh-outline"
                  title={
                    pushSetupState === 'permission-denied'
                      ? 'فعال‌کردن اعلان تماس'
                      : 'تلاش دوباره برای ثبت اعلان'
                  }
                  testID="retry-fcm-registration"
                  onPress={retryPushSetup}
                />
              ) : null}
              <InfoRow
                icon="battery-half-outline"
                title="محدودیت باتری"
                detail="برای کاهش تأخیر تماس، مصرف باتری Petipy را در Android روی Unrestricted بگذارید."
                color={colors.warning}
              />
              <InfoRow
                icon="hand-left-outline"
                title="توقف اجباری تماس را متوقف می‌کند"
                detail="پس از Force stop، Android اجرای برنامه و دریافت تماس را تا بازکردن دوباره متوقف می‌کند."
                color={colors.destructive}
              />
              <SettingsActionRow
                icon="settings-outline"
                title="بازکردن تنظیمات برنامه و باتری"
                testID="open-android-app-settings"
                onPress={openSystemSettings}
              />
              <Text style={[styles.footnote, { color: colors.mutedForeground }]}>
                اگر FCM در دسترس نباشد و مجوز اعلان و میکروفون فعال باشد، سرویس foreground هنگام آنلاین‌بودن صف تماس را بررسی می‌کند. بدون این مجوزها، تماس پس‌زمینه تضمین نمی‌شود. پس از Force stop، Android دریافت اعلان و اجرای سرویس را متوقف می‌کند.
              </Text>
            </>
          ) : Platform.OS === 'ios' ? (
            <>
              <InfoRow
                icon="notifications-outline"
                title="اجازه اعلان‌های iOS"
                detail={iosNotificationPermissionCopy.detail}
                color={iosNotificationPermissionCopy.color}
                status={iosNotificationPermissionCopy.label}
                statusColor={iosNotificationPermissionCopy.color}
              />
              <InfoRow
                icon="mic-outline"
                title="دسترسی میکروفون"
                detail={iosMicrophonePermission.detail}
                color={iosMicrophonePermission.color}
                status={iosMicrophonePermission.label}
                statusColor={iosMicrophonePermission.color}
              />
              <InfoRow
                icon="cloud-done-outline"
                title="اتصال API تماس"
                detail="وضعیت از پاسخ واقعی صف درخواست‌های مشاور بررسی می‌شود."
                color={iosBackendStatus.color}
                status={iosBackendStatus.label}
                statusColor={iosBackendStatus.color}
              />
              <InfoRow
                icon="call-outline"
                title="رابط تماس بومی CallKit"
                detail="در دسترس‌بودن ماژول نصب‌شده خوانده می‌شود؛ نمایش واقعی باید روی iPhone آزمایش شود."
                color={iosCallKitStatus.color}
                status={iosCallKitStatus.label}
                statusColor={iosCallKitStatus.color}
              />
              <InfoRow
                icon="radio-outline"
                title="تماس ورودی هنگام بازبودن برنامه"
                detail="برای آماده‌بودن، API باید در دسترس باشد، حساب آنلاین و میکروفون مجاز باشد؛ صف فقط در پیش‌زمینه بررسی می‌شود."
                color={
                  iosForegroundCallsReady ? colors.success : colors.warning
                }
                status={iosForegroundCallsReady ? 'آماده' : 'نیاز به بررسی'}
                statusColor={
                  iosForegroundCallsReady ? colors.success : colors.warning
                }
              />
              <InfoRow
                icon="volume-high-outline"
                title="پیکربندی نشست صوتی"
                detail="وضعیت Audio Session و هماهنگی WebRTC از ماژول بومی خوانده می‌شود؛ صدا فعال می‌شود فقط هنگام تماس."
                color={iosAudioStatus.color}
                status={iosAudioStatus.label}
                statusColor={iosAudioStatus.color}
              />
              <InfoRow
                icon="headset-outline"
                title="ادامه تماس فعال در پس‌زمینه"
                detail="CallKit و حالت صوتی پس‌زمینه برای ادامه تماس پذیرفته‌شده پیکربندی شده‌اند؛ رفتار واقعی به iOS و آزمون دستگاه وابسته است."
                color={colors.warning}
                status="نیازمند آزمون"
                statusColor={colors.warning}
              />
              <InfoRow
                icon="notifications-off-outline"
                title="تماس تازه در پس‌زمینه"
                detail="سرور موجود PushKit/APNs ندارد؛ iOS برنامه را برای درخواست تازه بیدار نمی‌کند. تماس هنگام بازگشت برنامه بررسی می‌شود."
                color={colors.warning}
                status="پشتیبانی نمی‌شود"
                statusColor={colors.warning}
              />
              <InfoRow
                icon="power-outline"
                title="تماس پس از بستن اجباری"
                detail="پس از Force Quit تماس تازه دریافت نمی‌شود؛ با بازکردن دوباره برنامه، صف و تاریخچه برای همگام‌سازی خوانده می‌شوند."
                color={colors.destructive}
                status="در دسترس نیست"
                statusColor={colors.destructive}
              />
              <SettingsActionRow
                icon="settings-outline"
                title="تنظیمات اعلان و میکروفون iOS"
                testID="open-ios-app-settings"
                onPress={openSystemSettings}
              />
              <InfoRow
                icon="information-circle-outline"
                title="اطلاعات برنامه"
                detail={`نسخه ${Constants.expoConfig?.version ?? 'نامشخص'} · ساخت ${Constants.expoConfig?.ios?.buildNumber ?? 'نامشخص'}`}
                color={colors.primary}
              />
            </>
          ) : (
            <InfoRow
              icon="phone-portrait-outline"
              title="تنظیمات دستگاه"
              detail="تماس بومی و مجوزهای سیستم فقط در نسخه نصب‌شده iOS یا Android در دسترس است."
              color={colors.mutedForeground}
            />
          )}
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
            تماس با API پتی‌پای برقرار می‌شود و TURN relay-only از نشست دریافت می‌شود. {Platform.OS === 'ios' ? 'صدای تماس پذیرفته‌شده برای ادامه در پس‌زمینه تنظیم شده؛ دریافت تماس تازه در پس‌زمینه تا فعال‌شدن APNs/PushKit سرور ممکن نیست.' : Platform.OS === 'android' ? 'FCM فقط اعلان را می‌رساند و جزئیات تماس را از API می‌گیریم.' : 'پیش‌نمایش وب تماس بومی را پشتیبانی نمی‌کند.'} هیچ Google STUN استفاده نمی‌شود.
          </Text>
          <View style={[styles.statusBadge, { backgroundColor: colors.accent }]}>
            <View style={[styles.badgeDot, { backgroundColor: colors.warning }]} />
            <Text style={[styles.badgeText, { color: colors.accentForeground }]}>
              {state === 'connected'
                ? 'حساب مشاور تأیید شد'
                : state === 'offline' && token
                  ? 'نشست امن حفظ شد؛ اتصال دوباره بررسی می‌شود'
                  : 'در انتظار نشست رسمی Petipy'}
            </Text>
          </View>
        </View>

        {hasSession ? (
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
  settingsIntro: { gap: 5, marginBottom: 4 },
  settingsTop: { minHeight: 76, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', marginBottom: 0 },
  settingsHeading: { alignItems: 'flex-end', gap: 2 },
  settingsEyebrow: { fontSize: 11, fontWeight: '700', writingDirection: 'rtl' },
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
  sectionKicker: { fontSize: 11, fontWeight: '800', letterSpacing: 0.6, writingDirection: 'rtl' },
  sectionTitle: { fontSize: 18, fontWeight: '800', writingDirection: 'rtl' },
  card: { borderRadius: 18, borderWidth: 1, padding: 16, gap: 14, elevation: 0 },
  accountCard: { borderRadius: 25, borderWidth: 1, padding: 15, gap: 12, elevation: 1 },
  capabilityPanel: { borderRadius: 24, borderWidth: 1, paddingHorizontal: 15, paddingVertical: 7, elevation: 1 },
  serviceSummary: { flexDirection: 'row-reverse', alignItems: 'center', gap: 9, borderRadius: 16, padding: 11, marginVertical: 7 },
  serviceSummaryIcon: { width: 39, height: 39, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  serviceSummaryCopy: { flex: 1, alignItems: 'flex-end', gap: 3 },
  statePill: { flexDirection: 'row-reverse', alignItems: 'center', gap: 5, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 6 },
  statePillText: { fontSize: 11, fontWeight: '700', writingDirection: 'rtl' },
  cardHeading: { flexDirection: 'row-reverse', alignItems: 'center', gap: 9 },
  safetyIcon: { width: 36, height: 36, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { fontSize: 15, fontWeight: '700', writingDirection: 'rtl' },
  profileName: { fontSize: 17, fontWeight: '700', textAlign: 'right', writingDirection: 'rtl' },
  profilePanel: { flexDirection: 'row-reverse', alignItems: 'center', gap: 14, paddingBottom: 3 },
  profileMark: { width: 56, height: 56, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  profileCopy: { flex: 1, alignItems: 'flex-end', gap: 6 },
  profileStatus: { flexDirection: 'row-reverse', alignItems: 'center', gap: 5, borderRadius: 9, paddingHorizontal: 8, paddingVertical: 4 },
  profileDot: { width: 6, height: 6, borderRadius: 3 },
  profileStatusText: { fontSize: 10, fontWeight: '700', writingDirection: 'rtl' },
  body: { textAlign: 'right', fontSize: 13, lineHeight: 22, writingDirection: 'rtl' },
  authNotice: { flexDirection: 'row-reverse', alignItems: 'flex-start', gap: 8, borderRadius: 13, padding: 11 },
  authNoticeText: { flex: 1, fontSize: 12, lineHeight: 20, textAlign: 'right', writingDirection: 'rtl' },
  error: { fontSize: 12, lineHeight: 19, textAlign: 'right', writingDirection: 'rtl' },
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
  rowStatusText: { fontSize: 11, fontWeight: '700', writingDirection: 'rtl' },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  rowTitle: { flexShrink: 1, fontSize: 12, fontWeight: '700', textAlign: 'right', writingDirection: 'rtl' },
  rowDetail: { fontSize: 13, lineHeight: 21, textAlign: 'right', writingDirection: 'rtl' },
  footnote: { fontSize: 11, lineHeight: 19, textAlign: 'right', writingDirection: 'rtl', marginTop: 1 },
});
