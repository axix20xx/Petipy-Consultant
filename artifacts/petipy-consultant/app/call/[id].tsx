import { useColors } from '@/hooks/useColors';
import { finishCall, joinCall } from '@/lib/petipy-api';
import { VoiceCallClient } from '@/lib/voice-call';
import { setAvailabilityCallState } from '@/lib/background-monitor';
import { endSystemCall, markSystemCallActive } from '@/lib/system-calling';
import { useConsultantSession } from '@/providers/consultant-session';
import RemoteVideo from '@/components/RemoteVideo';
import type { PetCard } from '@/lib/pet-card-protocol';
import { Ionicons } from '@expo/vector-icons';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import type { MediaStream } from 'react-native-webrtc';
import {
  ActivityIndicator,
  Alert,
  BackHandler,
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

function formatDuration(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export default function ConsultantCallScreen() {
  const colors = useColors();
  const { id, action } = useLocalSearchParams<{ id: string; action?: string }>();
  const callId = Array.isArray(id) ? id[0] : id;
  const { token, activeCall, setActiveCall } = useConsultantSession();
  const matchingCall = activeCall?.callId === callId ? activeCall : null;
  const clientRef = useRef<VoiceCallClient | null>(null);
  const connectedAtRef = useRef<number | null>(null);
  const accumulatedSecondsRef = useRef(0);
  const timerCallIdRef = useRef<string | null>(null);
  const [status, setStatus] = useState('در حال آماده‌سازی تماس…');
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [muted, setMuted] = useState(false);
  const [audioRoute, setAudioRoute] = useState<'earpiece' | 'speaker'>(
    'earpiece',
  );
  const [routeChanging, setRouteChanging] = useState(false);
  const [routeError, setRouteError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [joining, setJoining] = useState(false);
  const [ending, setEnding] = useState(false);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [petCardBatches, setPetCardBatches] = useState<
    { shareId: number; pets: PetCard[] }[]
  >([]);
  const acknowledgedPetSharesRef = useRef<Set<number>>(new Set());
  const systemActionHandled = useRef(false);
  const permissionIssue =
    Boolean(error) && /permission|denied|میکروفون|دسترسی/i.test(error ?? '');
  const hasRemoteVideo =
    remoteStream?.getVideoTracks().some((track) => track.readyState === 'live') ??
    false;

  useEffect(() => {
    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      () => true,
    );
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (!matchingCall) return;
    const client = new VoiceCallClient();
    clientRef.current = client;
    let isMounted = true;
    setError(null);
    setConnected(false);
    setElapsed(0);
    setRemoteStream(null);
    setPetCardBatches([]);
    acknowledgedPetSharesRef.current.clear();
    if (timerCallIdRef.current !== callId) {
      timerCallIdRef.current = callId ?? null;
      connectedAtRef.current = null;
      accumulatedSecondsRef.current = 0;
      setElapsed(0);
    }
    setAvailabilityCallState(callId ?? null, 'connecting');

    void client
      .start(matchingCall, {
        onStatus: (message) => {
          if (isMounted) setStatus(message);
        },
        onConnected: () => {
          if (!isMounted) return;
          connectedAtRef.current ??= Date.now();
          setConnected(true);
          setError(null);
          setStatus('تماس برقرار است');
          setAvailabilityCallState(callId ?? null, 'connected');
          if (callId) void markSystemCallActive(callId);
        },
        onDisconnected: () => {
          if (!isMounted) return;
          if (connectedAtRef.current) {
            accumulatedSecondsRef.current += Math.floor(
              (Date.now() - connectedAtRef.current) / 1000,
            );
            connectedAtRef.current = null;
            setElapsed(accumulatedSecondsRef.current);
          }
          setConnected(false);
          setError('ارتباط تماس قطع شد؛ برای ادامه، دوباره وصل شوید.');
          setAvailabilityCallState(callId ?? null, 'reconnecting');
        },
        onEnded: () => {
          if (isMounted) {
            setStatus('مشتری تماس را پایان داد.');
            setConnected(false);
            setAvailabilityCallState(null, null);
            void endCall(false);
          }
        },
        onError: (message) => {
          if (isMounted) {
            setConnected(false);
            setError(message);
            setAvailabilityCallState(callId ?? null, 'reconnecting');
          }
        },
        onRemoteVideo: (stream) => {
          if (isMounted) setRemoteStream(stream);
        },
        onPetCardsReceived: (shareId, pets) => {
          if (!isMounted) return;
          setPetCardBatches((current) => [...current, { shareId, pets }]);
        },
      })
      .catch((startError: unknown) => {
        client.close();
        if (clientRef.current === client) clientRef.current = null;
        if (isMounted) {
          setRemoteStream(null);
          setError(
            startError instanceof Error
              ? startError.message
              : 'شروع تماس ممکن نشد.',
          );
          setAvailabilityCallState(callId ?? null, 'reconnecting');
        }
      });

    return () => {
      isMounted = false;
      client.close();
      setRemoteStream(null);
      setPetCardBatches([]);
      setAvailabilityCallState(null, null);
      if (clientRef.current === client) clientRef.current = null;
    };
    // Restart the peer when a rejoin returns a fresh call-session token.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchingCall]);

  useEffect(() => {
    if (!matchingCall || petCardBatches.length === 0) return;
    const frame = requestAnimationFrame(() => {
      for (const batch of petCardBatches) {
        if (acknowledgedPetSharesRef.current.has(batch.shareId)) continue;
        if (clientRef.current?.acknowledgePetCards()) {
          acknowledgedPetSharesRef.current.add(batch.shareId);
        }
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [matchingCall, petCardBatches]);

  useEffect(() => {
    if (!connected) return;
    const interval = setInterval(() => {
      const connectedAt = connectedAtRef.current;
      if (connectedAt) {
        setElapsed(
          accumulatedSecondsRef.current +
            Math.floor((Date.now() - connectedAt) / 1000),
        );
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [connected]);

  async function endCall(sendSignal: boolean) {
    if (ending) return;
    setEnding(true);
    setAvailabilityCallState(null, null);
    clientRef.current?.close(sendSignal);
    clientRef.current = null;
    try {
      if (token && callId) await finishCall(token, callId);
    } catch {
      setError('تماس روی دستگاه پایان یافت؛ وضعیت سرور هنوز تأیید نشده است.');
    } finally {
      if (callId) await endSystemCall(callId, 'local');
      setActiveCall(null);
      setConnected(false);
      router.replace('/(tabs)');
      setEnding(false);
    }
  }

  useEffect(() => {
    if (
      action !== 'hangup' ||
      !matchingCall ||
      systemActionHandled.current
    ) {
      return;
    }
    systemActionHandled.current = true;
    void endCall(true);
  }, [action, matchingCall]);

  async function reconnect() {
    if (!token || !callId || joining) return;
    setJoining(true);
    setError(null);
    setAvailabilityCallState(callId, 'reconnecting');
    try {
      const session = await joinCall(token, callId);
      setActiveCall(session);
    } catch (joinError) {
      setError(
        joinError instanceof Error
          ? joinError.message
          : 'اتصال مجدد ممکن نشد.',
      );
    } finally {
      setJoining(false);
    }
  }

  async function retryConnection() {
    if (Platform.OS === 'android') {
      const permission = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
        {
          title: 'اجازه‌ی میکروفون',
          message: 'برای ادامه‌ی تماس مشاوره، دسترسی میکروفون را فعال کنید.',
          buttonPositive: 'اجازه می‌دهم',
          buttonNegative: 'بعداً',
        },
      );
      if (permission !== PermissionsAndroid.RESULTS.GRANTED) {
        setError('دسترسی میکروفون لازم است؛ آن را فعال کنید و دوباره تلاش کنید.');
        return;
      }
    }
    await reconnect();
  }

  function openPermissionSettings() {
    void Linking.openSettings().catch(() => {
      Alert.alert(
        'تنظیمات در دسترس نیست',
        'از تنظیمات Android یا iOS، دسترسی میکروفون Petipy را فعال کنید.',
      );
    });
  }

  function toggleMute() {
    const next = !muted;
    clientRef.current?.setMuted(next);
    setMuted(next);
  }

  async function selectAudioRoute(route: 'earpiece' | 'speaker') {
    const client = clientRef.current;
    if (!client || !callId || routeChanging || route === audioRoute) return;

    setRouteChanging(true);
    setRouteError(null);
    try {
      const changed = await client.setAudioRoute(route, callId);
      if (!changed) {
        throw new Error('مسیر صدای انتخاب‌شده در این تماس در دسترس نیست.');
      }
      setAudioRoute(route);
    } catch (routeChangeError) {
      setRouteError(
        routeChangeError instanceof Error
          ? routeChangeError.message
          : 'تغییر مسیر صدا ممکن نشد. دوباره تلاش کنید.',
      );
    } finally {
      setRouteChanging(false);
    }
  }

  if (!token && !activeCall) return <Redirect href="/sign-in" />;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      <View style={styles.topBar}>
        <View style={styles.topBrand}>
          <View style={[styles.brandMark, { backgroundColor: colors.primary }]}>
            <Ionicons name="paw" size={17} color={colors.primaryForeground} />
          </View>
          <View style={styles.topBrandCopy}>
            <Text style={[styles.topBrandName, { color: colors.foreground }]}>پتی‌پای</Text>
            <Text style={[styles.topLabel, { color: colors.mutedForeground }]}>تماس خصوصی</Text>
          </View>
        </View>
        <Pressable
          testID="call-chat"
          accessibilityRole="button"
          accessibilityLabel="گفت‌وگوی تماس"
          disabled={!callId || !token}
          onPress={() => {
            if (!callId) return;
            router.push({ pathname: '/call/[id]/chat', params: { id: callId } });
          }}
          style={({ pressed }) => [
            styles.chatButton,
            { backgroundColor: colors.secondary, opacity: !callId || !token ? 0.48 : pressed ? 0.78 : 1 },
          ]}
        >
          <Ionicons name="chatbubble-ellipses-outline" size={18} color={colors.primary} />
          <Text style={[styles.chatButtonText, { color: colors.secondaryForeground }]}>گفت‌وگو</Text>
        </Pressable>
      </View>

      <ScrollView
        style={styles.mainScroll}
        contentContainerStyle={styles.mainContent}
        showsVerticalScrollIndicator={false}
      >
        {hasRemoteVideo && remoteStream ? (
          <View style={[styles.videoStage, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <RemoteVideo
              key={`${callId ?? 'call'}-${remoteStream.id}`}
              stream={remoteStream}
              label="تصویر زنده‌ی مشتری یا حیوان خانگی"
            />
            <View style={[styles.videoBadge, { backgroundColor: colors.card }]}>
              <View style={[styles.liveDot, { backgroundColor: colors.success }]} />
              <Ionicons name="videocam" size={14} color={colors.primary} />
              <Text style={[styles.videoBadgeText, { color: colors.foreground }]}>تصویر زنده</Text>
            </View>
          </View>
        ) : (
          <View style={styles.voiceStage}>
            <View style={[styles.avatarOuter, { backgroundColor: colors.secondary, borderColor: connected ? colors.success : colors.accent }]}>
              <View style={[styles.avatarInner, { backgroundColor: colors.card }]}>
                <Ionicons name="paw" size={38} color={colors.primary} />
              </View>
            </View>
            <View style={[styles.audioOnlyBadge, { backgroundColor: colors.secondary }]}>
              <Ionicons name="mic-outline" size={14} color={colors.secondaryForeground} />
              <Text style={[styles.audioOnlyText, { color: colors.secondaryForeground }]}>تماس صوتی</Text>
            </View>
          </View>
        )}

        <View style={[styles.callInfo, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.callInfoTop}>
            <Text style={[styles.kicker, { color: colors.primary }]}>مشاوره‌ی صوتی پتی‌پای</Text>
            <View style={[styles.privateBadge, { backgroundColor: colors.secondary }]}>
              <Ionicons name="shield-checkmark-outline" size={13} color={colors.primary} />
              <Text style={[styles.privateBadgeText, { color: colors.secondaryForeground }]}>خصوصی</Text>
            </View>
          </View>
          <Text style={[styles.name, { color: colors.foreground }]}>{matchingCall?.displayName ?? 'تماس مشاوره'}</Text>
          <View style={styles.liveStatus}>
            <View style={[styles.liveDot, { backgroundColor: connected ? colors.success : colors.warning }]} />
            <Text style={[styles.status, { color: colors.mutedForeground }]}>{status}</Text>
          </View>
          <View style={[styles.timerTrack, { backgroundColor: colors.muted }]}>
            <Ionicons name="time-outline" size={17} color={colors.primary} />
            <Text style={[styles.timerLabel, { color: colors.mutedForeground }]}>مدت تماس</Text>
            <View style={styles.timerSpacer} />
            <Text style={[styles.timer, { color: colors.foreground }]}>{formatDuration(elapsed)}</Text>
          </View>
        </View>

        {petCardBatches.length > 0 ? (
          <View
            testID="shared-pet-cards"
            accessibilityLabel="اطلاعات حیوان‌های انتخاب‌شده"
            style={[styles.petCardsPanel, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <View style={styles.petCardsHeading}>
              <View style={[styles.petHeadingIcon, { backgroundColor: colors.secondary }]}>
                <Ionicons name="paw" size={16} color={colors.primary} />
              </View>
              <Text style={[styles.petCardsTitle, { color: colors.foreground }]}>اطلاعات حیوان‌های انتخاب‌شده</Text>
              <Text style={[styles.petCardsCount, { color: colors.mutedForeground }]}>
                {petCardBatches.reduce((count, batch) => count + batch.pets.length, 0)}
              </Text>
            </View>
            <ScrollView style={styles.petCardsScroll} contentContainerStyle={styles.petCardsList} nestedScrollEnabled showsVerticalScrollIndicator={false}>
              {petCardBatches.flatMap((batch) =>
                batch.pets.map((pet, index) => (
                  <View key={`${batch.shareId}-${index}`} style={[styles.petCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
                    <View style={styles.petCardTop}>
                      <Text style={[styles.petName, { color: colors.foreground }]}>{pet.name}</Text>
                      <Text style={[styles.petDetails, { color: colors.mutedForeground }]}>{[pet.species, pet.breed].filter(Boolean).join(' · ')}</Text>
                    </View>
                    <Text style={[styles.petDetails, { color: colors.mutedForeground }]}>
                      {[pet.age ? `سن: ${pet.age}` : null, pet.weight ? `وزن: ${pet.weight}` : null].filter(Boolean).join('  •  ')}
                    </Text>
                    {pet.health ? (
                      <View style={styles.petHealth}>
                        {pet.health.allergies ? <Text style={[styles.petHealthText, { color: colors.accentForeground }]}>حساسیت: {pet.health.allergies}</Text> : null}
                        {pet.health.medicalConditions ? <Text style={[styles.petHealthText, { color: colors.accentForeground }]}>شرایط پزشکی: {pet.health.medicalConditions}</Text> : null}
                        {pet.health.dietaryRestrictions ? <Text style={[styles.petHealthText, { color: colors.accentForeground }]}>محدودیت غذایی: {pet.health.dietaryRestrictions}</Text> : null}
                      </View>
                    ) : null}
                  </View>
                )),
              )}
            </ScrollView>
          </View>
        ) : null}

        {!matchingCall ? (
          <Pressable
            testID="rejoin-call"
            onPress={() => void reconnect()}
            disabled={joining || !token}
            style={({ pressed }) => [styles.rejoinButton, { backgroundColor: colors.primary, opacity: pressed ? 0.88 : 1 }]}
          >
            {joining ? <ActivityIndicator color={colors.primaryForeground} /> : <Ionicons name="refresh" size={18} color={colors.primaryForeground} />}
            <Text style={[styles.rejoinText, { color: colors.primaryForeground }]}>اتصال مجدد به تماس</Text>
          </Pressable>
        ) : null}

        {error ? (
          <View style={[styles.errorActions, { backgroundColor: colors.accent }]}>
            <Text accessibilityRole="alert" style={[styles.errorText, { color: colors.destructive }]}>{error}</Text>
            <Pressable
              testID="retry-call"
              accessibilityRole="button"
              onPress={() => void retryConnection()}
              disabled={joining || !token || !callId}
              style={({ pressed }) => [styles.retryButton, { backgroundColor: colors.primary, opacity: pressed ? 0.86 : 1 }]}
            >
              {joining ? <ActivityIndicator color={colors.primaryForeground} /> : <Text style={[styles.retryText, { color: colors.primaryForeground }]}>تلاش دوباره برای اتصال</Text>}
            </Pressable>
            {permissionIssue ? (
              <Pressable accessibilityRole="button" onPress={openPermissionSettings} style={[styles.settingsButton, { borderColor: colors.border }]}>
                <Text style={[styles.settingsText, { color: colors.foreground }]}>باز کردن تنظیمات دسترسی</Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}
      </ScrollView>

      <View style={[styles.controlDock, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.controls}>
          <Pressable
            testID="call-earpiece"
            accessibilityRole="button"
            accessibilityLabel="انتقال صدا به گوشی"
            accessibilityState={{ selected: audioRoute === 'earpiece' }}
            onPress={() => void selectAudioRoute('earpiece')}
            disabled={!matchingCall || routeChanging || Platform.OS === 'web'}
            style={({ pressed }) => [
              styles.control,
              { backgroundColor: audioRoute === 'earpiece' ? colors.secondary : colors.background, borderColor: colors.border, opacity: !matchingCall || routeChanging || Platform.OS === 'web' ? 0.5 : pressed ? 0.78 : 1 },
            ]}
          >
            {routeChanging && audioRoute === 'speaker' ? <ActivityIndicator color={colors.primary} /> : <Ionicons name="phone-portrait-outline" size={21} color={colors.primary} />}
            <Text style={[styles.controlLabel, { color: colors.foreground }]}>گوشی</Text>
          </Pressable>
          <Pressable
            testID="call-mute"
            accessibilityRole="button"
            accessibilityLabel={muted ? 'روشن کردن میکروفون' : 'خاموش کردن میکروفون'}
            onPress={toggleMute}
            disabled={!matchingCall}
            style={({ pressed }) => [styles.control, { backgroundColor: muted ? colors.accent : colors.background, borderColor: colors.border, opacity: !matchingCall ? 0.5 : pressed ? 0.78 : 1 }]}
          >
            <Ionicons name={muted ? 'mic-off' : 'mic-outline'} size={22} color={muted ? colors.accentForeground : colors.foreground} />
            <Text style={[styles.controlLabel, { color: colors.foreground }]}>{muted ? 'بی‌صدا' : 'میکروفون'}</Text>
          </Pressable>
          <Pressable
            testID="call-speaker"
            accessibilityRole="button"
            accessibilityLabel="انتقال صدا به بلندگو"
            accessibilityState={{ selected: audioRoute === 'speaker' }}
            onPress={() => void selectAudioRoute('speaker')}
            disabled={!matchingCall || routeChanging || Platform.OS === 'web'}
            style={({ pressed }) => [
              styles.control,
              { backgroundColor: audioRoute === 'speaker' ? colors.secondary : colors.background, borderColor: colors.border, opacity: !matchingCall || routeChanging || Platform.OS === 'web' ? 0.5 : pressed ? 0.78 : 1 },
            ]}
          >
            {routeChanging && audioRoute === 'earpiece' ? <ActivityIndicator color={colors.primary} /> : <Ionicons name="volume-high-outline" size={22} color={colors.primary} />}
            <Text style={[styles.controlLabel, { color: colors.foreground }]}>بلندگو</Text>
          </Pressable>
          <Pressable
            testID="call-hangup"
            accessibilityRole="button"
            accessibilityLabel="پایان تماس"
            onPress={() => void endCall(true)}
            disabled={ending}
            style={({ pressed }) => [styles.endButton, { backgroundColor: colors.destructive, opacity: ending ? 0.7 : pressed ? 0.86 : 1 }]}
          >
            {ending ? <ActivityIndicator color={colors.destructiveForeground} /> : <Ionicons name="call" size={22} color={colors.destructiveForeground} style={styles.hangupIcon} />}
            <Text style={[styles.endLabel, { color: colors.destructiveForeground }]}>پایان</Text>
          </Pressable>
        </View>
        {routeError ? <Text accessibilityRole="alert" style={[styles.routeError, { color: colors.destructive }]}>{routeError}</Text> : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, paddingHorizontal: 15, paddingTop: 6, paddingBottom: 8 },
  topBar: { minHeight: 49, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 },
  topBrand: { flexDirection: 'row-reverse', alignItems: 'center', gap: 9 },
  brandMark: { width: 37, height: 37, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  topBrandCopy: { alignItems: 'flex-end', gap: 1 },
  topBrandName: { fontSize: 12, fontWeight: '800', writingDirection: 'rtl' },
  topLabel: { fontSize: 9, writingDirection: 'rtl' },
  chatButton: { minHeight: 46, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 7, paddingHorizontal: 13, borderRadius: 14 },
  chatButtonText: { fontSize: 11, fontWeight: '700', writingDirection: 'rtl' },
  mainScroll: { flex: 1 },
  mainContent: { alignItems: 'center', justifyContent: 'center', gap: 11, paddingVertical: 6 },
  voiceStage: { alignItems: 'center', gap: 9, marginVertical: 2 },
  avatarOuter: { width: 106, height: 106, borderRadius: 38, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  avatarInner: { width: 82, height: 82, borderRadius: 29, alignItems: 'center', justifyContent: 'center' },
  audioOnlyBadge: { flexDirection: 'row-reverse', alignItems: 'center', gap: 5, borderRadius: 10, paddingHorizontal: 9, paddingVertical: 5 },
  audioOnlyText: { fontSize: 9, fontWeight: '700', writingDirection: 'rtl' },
  videoStage: { width: '100%', height: 250, maxHeight: 330, borderRadius: 24, borderWidth: 1, overflow: 'hidden', position: 'relative' },
  videoBadge: { position: 'absolute', right: 11, bottom: 11, zIndex: 1, flexDirection: 'row-reverse', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 12 },
  videoBadgeText: { fontSize: 10, fontWeight: '700', writingDirection: 'rtl' },
  liveDot: { width: 7, height: 7, borderRadius: 4 },
  callInfo: { width: '100%', borderWidth: 1, borderRadius: 21, paddingHorizontal: 15, paddingVertical: 13, alignItems: 'center', gap: 7, shadowColor: '#5D2934', shadowOpacity: 0.05, shadowRadius: 12, shadowOffset: { width: 0, height: 5 }, elevation: 1 },
  callInfoTop: { width: '100%', flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between' },
  privateBadge: { flexDirection: 'row-reverse', alignItems: 'center', gap: 4, borderRadius: 9, paddingHorizontal: 7, paddingVertical: 5 },
  privateBadgeText: { fontSize: 9, fontWeight: '700', writingDirection: 'rtl' },
  kicker: { fontSize: 10, fontWeight: '700', writingDirection: 'rtl' },
  name: { fontSize: 21, fontWeight: '800', textAlign: 'center', writingDirection: 'rtl' },
  liveStatus: { flexDirection: 'row-reverse', alignItems: 'center', gap: 7 },
  status: { fontSize: 11, textAlign: 'right', writingDirection: 'rtl' },
  timerTrack: { width: '100%', flexDirection: 'row-reverse', alignItems: 'center', gap: 8, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, marginTop: 1 },
  timerLabel: { fontSize: 10, writingDirection: 'rtl' },
  timerSpacer: { flex: 1 },
  timer: { fontSize: 21, fontWeight: '800', fontVariant: ['tabular-nums'] },
  petCardsPanel: { width: '100%', maxHeight: 174, borderWidth: 1, borderRadius: 18, padding: 10, gap: 8 },
  petCardsHeading: { flexDirection: 'row-reverse', alignItems: 'center', gap: 7 },
  petHeadingIcon: { width: 30, height: 30, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  petCardsTitle: { flex: 1, fontSize: 11, fontWeight: '700', writingDirection: 'rtl' },
  petCardsCount: { fontSize: 10, fontWeight: '700' },
  petCardsScroll: { flexGrow: 0 },
  petCardsList: { gap: 7, paddingBottom: 2 },
  petCard: { borderWidth: 1, borderRadius: 12, padding: 9, gap: 4 },
  petCardTop: { flexDirection: 'row-reverse', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' },
  petName: { fontSize: 12, fontWeight: '700', writingDirection: 'rtl' },
  petDetails: { fontSize: 10, writingDirection: 'rtl', textAlign: 'right' },
  petHealth: { gap: 2, marginTop: 2 },
  petHealthText: { fontSize: 10, lineHeight: 15, writingDirection: 'rtl', textAlign: 'right' },
  errorActions: { width: '100%', alignItems: 'center', gap: 8, borderRadius: 15, padding: 10 },
  errorText: { maxWidth: 310, textAlign: 'center', lineHeight: 19, fontSize: 11, writingDirection: 'rtl' },
  retryButton: { minHeight: 43, minWidth: 190, paddingHorizontal: 16, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  retryText: { fontWeight: '700', fontSize: 11, writingDirection: 'rtl' },
  settingsButton: { minHeight: 42, paddingHorizontal: 14, borderWidth: 1, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  settingsText: { fontSize: 10, fontWeight: '600', writingDirection: 'rtl' },
  rejoinButton: { minHeight: 44, width: '100%', flexDirection: 'row-reverse', gap: 8, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16, borderRadius: 14 },
  rejoinText: { fontWeight: '700', fontSize: 11, writingDirection: 'rtl' },
  controlDock: { borderWidth: 1, borderRadius: 20, padding: 8, marginTop: 5, shadowColor: '#5D2934', shadowOpacity: 0.06, shadowRadius: 14, shadowOffset: { width: 0, height: 4 }, elevation: 2 },
  controls: { flexDirection: 'row-reverse', justifyContent: 'center', alignItems: 'center', gap: 6 },
  control: { flex: 1, minWidth: 0, minHeight: 67, borderRadius: 15, borderWidth: 1, alignItems: 'center', justifyContent: 'center', gap: 5 },
  controlLabel: { fontSize: 9, fontWeight: '700', writingDirection: 'rtl' },
  endButton: { width: 69, minHeight: 67, borderRadius: 15, alignItems: 'center', justifyContent: 'center', gap: 3 },
  endLabel: { fontSize: 9, fontWeight: '800', writingDirection: 'rtl' },
  routeError: { textAlign: 'center', fontSize: 10, lineHeight: 15, writingDirection: 'rtl', marginTop: 4 },
  hangupIcon: { transform: [{ rotate: '135deg' }] },
});
