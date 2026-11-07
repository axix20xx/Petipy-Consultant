import { useColors } from '@/hooks/useColors';
import { finishCall, joinCall } from '@/lib/petipy-api';
import { VoiceCallClient } from '@/lib/voice-call';
import { useConsultantSession } from '@/providers/consultant-session';
import RemoteVideo from '@/components/RemoteVideo';
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
  const { id } = useLocalSearchParams<{ id: string }>();
  const callId = Array.isArray(id) ? id[0] : id;
  const { token, activeCall, setActiveCall } = useConsultantSession();
  const matchingCall = activeCall?.callId === callId ? activeCall : null;
  const clientRef = useRef<VoiceCallClient | null>(null);
  const connectedAtRef = useRef<number | null>(null);
  const [status, setStatus] = useState('در حال آماده‌سازی تماس…');
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [muted, setMuted] = useState(false);
  const [speaker, setSpeaker] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [joining, setJoining] = useState(false);
  const [ending, setEnding] = useState(false);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
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
    connectedAtRef.current = null;

    void client
      .start(matchingCall, {
        onStatus: (message) => {
          if (isMounted) setStatus(message);
        },
        onConnected: () => {
          if (!isMounted) return;
          connectedAtRef.current = Date.now();
          setConnected(true);
          setError(null);
          setStatus('تماس برقرار است');
        },
        onEnded: () => {
          if (isMounted) {
            setStatus('مشتری تماس را پایان داد.');
            setConnected(false);
            void endCall(false);
          }
        },
        onError: (message) => {
          if (isMounted) setError(message);
        },
        onRemoteVideo: (stream) => {
          if (isMounted) setRemoteStream(stream);
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
        }
      });

    return () => {
      isMounted = false;
      client.close();
      setRemoteStream(null);
      if (clientRef.current === client) clientRef.current = null;
    };
    // Restart the peer when a rejoin returns a fresh call-session token.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchingCall]);

  useEffect(() => {
    if (!connected) return;
    const interval = setInterval(() => {
      const connectedAt = connectedAtRef.current;
      if (connectedAt) {
        setElapsed(Math.floor((Date.now() - connectedAt) / 1000));
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [connected]);

  async function endCall(sendSignal: boolean) {
    if (ending) return;
    setEnding(true);
    clientRef.current?.close(sendSignal);
    clientRef.current = null;
    try {
      if (token && callId) await finishCall(token, callId);
    } catch {
      setError('تماس روی دستگاه پایان یافت؛ وضعیت سرور هنوز تأیید نشده است.');
    } finally {
      setActiveCall(null);
      setConnected(false);
      router.replace('/(tabs)');
      setEnding(false);
    }
  }

  async function reconnect() {
    if (!token || !callId || joining) return;
    setJoining(true);
    setError(null);
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

  function toggleSpeaker() {
    const next = !speaker;
    clientRef.current?.setSpeaker(next);
    setSpeaker(next);
  }

  if (!token && !activeCall) return <Redirect href="/sign-in" />;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <View style={styles.topBar}>
        <View style={[styles.brandMark, { backgroundColor: colors.secondary }]}>
          <Ionicons name="paw" size={18} color={colors.primary} />
        </View>
        <Text style={[styles.topLabel, { color: colors.mutedForeground }]}>
          تماس خصوصی پتی‌پای
        </Text>
      </View>

      <View style={styles.center}>
        {hasRemoteVideo && remoteStream ? (
          <View
            style={[
              styles.videoStage,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <RemoteVideo
              stream={remoteStream}
              label="تصویر زنده‌ی مشتری یا حیوان خانگی"
            />
            <View
              style={[styles.videoBadge, { backgroundColor: colors.foreground }]}
            >
              <Ionicons name="videocam" size={14} color={colors.background} />
              <Text style={[styles.videoBadgeText, { color: colors.background }]}>
                تصویر زنده
              </Text>
            </View>
          </View>
        ) : (
          <View
            style={[
              styles.avatarOuter,
              {
                backgroundColor: colors.secondary,
                borderColor: connected ? colors.success : colors.primary,
              },
            ]}
          >
            <View style={[styles.avatarInner, { backgroundColor: colors.card }]}>
              <Ionicons name="paw" size={39} color={colors.primary} />
            </View>
          </View>
        )}
        <Text style={[styles.kicker, { color: colors.primary }]}>
          مشاور صوتی Petipy
        </Text>
        <Text style={[styles.name, { color: colors.foreground }]}>
          {matchingCall?.displayName ?? 'تماس مشاوره'}
        </Text>
        <View style={styles.liveStatus}>
          <View
            style={[
              styles.liveDot,
              { backgroundColor: connected ? colors.success : colors.warning },
            ]}
          />
          <Text style={[styles.status, { color: colors.mutedForeground }]}>
            {status}
          </Text>
        </View>
        <Text style={[styles.timer, { color: colors.foreground }]}>
          {formatDuration(elapsed)}
        </Text>

        {!matchingCall ? (
          <Pressable
            testID="rejoin-call"
            onPress={() => void reconnect()}
            disabled={joining || !token}
            style={[styles.rejoinButton, { backgroundColor: colors.primary }]}
          >
            {joining ? (
              <ActivityIndicator color={colors.primaryForeground} />
            ) : (
              <Ionicons name="refresh" size={18} color={colors.primaryForeground} />
            )}
            <Text style={[styles.rejoinText, { color: colors.primaryForeground }]}>
              اتصال مجدد به تماس
            </Text>
          </Pressable>
        ) : null}

        {error ? (
          <View style={styles.errorActions}>
            <Text
              accessibilityRole="alert"
              style={[styles.errorText, { color: colors.destructive }]}
            >
              {error}
            </Text>
            <Pressable
              testID="retry-call"
              accessibilityRole="button"
              onPress={() => void retryConnection()}
              disabled={joining || !token || !callId}
              style={[styles.retryButton, { backgroundColor: colors.primary }]}
            >
              {joining ? (
                <ActivityIndicator color={colors.primaryForeground} />
              ) : (
                <Text style={[styles.retryText, { color: colors.primaryForeground }]}>
                  تلاش دوباره برای اتصال
                </Text>
              )}
            </Pressable>
            {permissionIssue ? (
              <Pressable
                accessibilityRole="button"
                onPress={openPermissionSettings}
                style={[styles.settingsButton, { borderColor: colors.border }]}
              >
                <Text style={[styles.settingsText, { color: colors.foreground }]}>
                  باز کردن تنظیمات دسترسی
                </Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}
      </View>

      <View style={styles.controls}>
        <Pressable
          testID="call-mute"
          accessibilityRole="button"
          accessibilityLabel={muted ? 'روشن کردن میکروفون' : 'خاموش کردن میکروفون'}
          onPress={toggleMute}
          disabled={!matchingCall}
          style={[
            styles.control,
            { backgroundColor: muted ? colors.accent : colors.card, borderColor: colors.border },
          ]}
        >
          <Ionicons
            name={muted ? 'mic-off' : 'mic-outline'}
            size={23}
            color={muted ? colors.accentForeground : colors.foreground}
          />
          <Text style={[styles.controlLabel, { color: colors.foreground }]}>
            {muted ? 'میکروفون خاموش' : 'بی‌صدا'}
          </Text>
        </Pressable>
        <Pressable
          testID="call-speaker"
          accessibilityRole="button"
          accessibilityLabel={speaker ? 'خاموش کردن بلندگو' : 'روشن کردن بلندگو'}
          onPress={toggleSpeaker}
          disabled={!matchingCall || Platform.OS === 'web'}
          style={[
            styles.control,
            { backgroundColor: speaker ? colors.secondary : colors.card, borderColor: colors.border },
          ]}
        >
          <Ionicons
            name={speaker ? 'volume-high' : 'volume-medium-outline'}
            size={23}
            color={colors.primary}
          />
          <Text style={[styles.controlLabel, { color: colors.foreground }]}>
            بلندگو
          </Text>
        </Pressable>
        <Pressable
          testID="call-hangup"
          accessibilityRole="button"
          accessibilityLabel="پایان تماس"
          onPress={() => void endCall(true)}
          disabled={ending}
          style={[styles.endButton, { backgroundColor: colors.destructive }]}
        >
          {ending ? (
            <ActivityIndicator color={colors.destructiveForeground} />
          ) : (
            <Ionicons
              name="call"
              size={24}
              color={colors.destructiveForeground}
              style={styles.hangupIcon}
            />
          )}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, paddingHorizontal: 24, paddingTop: 10, paddingBottom: 18 },
  topBar: { flexDirection: 'row-reverse', alignItems: 'center', gap: 9 },
  brandMark: { width: 34, height: 34, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  topLabel: { fontSize: 12, writingDirection: 'rtl' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 13 },
  avatarOuter: { width: 120, height: 120, borderRadius: 44, borderWidth: 2, alignItems: 'center', justifyContent: 'center', marginBottom: 5 },
  avatarInner: { width: 102, height: 102, borderRadius: 37, alignItems: 'center', justifyContent: 'center' },
  videoStage: { width: '100%', height: '58%', minHeight: 220, maxHeight: 430, borderRadius: 26, borderWidth: 1, overflow: 'hidden', position: 'relative', marginBottom: 3 },
  videoBadge: { position: 'absolute', right: 12, bottom: 12, zIndex: 1, flexDirection: 'row-reverse', alignItems: 'center', gap: 6, paddingHorizontal: 11, paddingVertical: 8, borderRadius: 14 },
  videoBadgeText: { fontSize: 11, fontWeight: '700', writingDirection: 'rtl' },
  kicker: { fontSize: 12, fontWeight: '700', writingDirection: 'rtl' },
  name: { fontSize: 24, fontWeight: '700', writingDirection: 'rtl' },
  liveStatus: { flexDirection: 'row-reverse', alignItems: 'center', gap: 7 },
  liveDot: { width: 7, height: 7, borderRadius: 4 },
  status: { fontSize: 12, writingDirection: 'rtl' },
  timer: { fontSize: 33, fontWeight: '600', fontVariant: ['tabular-nums'] },
  errorActions: { alignItems: 'center', gap: 9, maxWidth: 320 },
  errorText: { maxWidth: 310, textAlign: 'center', lineHeight: 20, fontSize: 12, writingDirection: 'rtl' },
  retryButton: { minHeight: 44, minWidth: 190, paddingHorizontal: 16, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  retryText: { fontWeight: '700', fontSize: 12, writingDirection: 'rtl' },
  settingsButton: { minHeight: 42, paddingHorizontal: 14, borderWidth: 1, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  settingsText: { fontSize: 11, fontWeight: '600', writingDirection: 'rtl' },
  rejoinButton: { minHeight: 44, flexDirection: 'row-reverse', gap: 8, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16, borderRadius: 15, marginTop: 8 },
  rejoinText: { fontWeight: '700', fontSize: 12, writingDirection: 'rtl' },
  controls: { flexDirection: 'row-reverse', justifyContent: 'center', alignItems: 'center', gap: 16, paddingBottom: 10 },
  control: { width: 78, minHeight: 78, borderRadius: 24, borderWidth: 1, alignItems: 'center', justifyContent: 'center', gap: 7 },
  controlLabel: { fontSize: 10, fontWeight: '600', writingDirection: 'rtl' },
  endButton: { width: 68, height: 68, borderRadius: 25, alignItems: 'center', justifyContent: 'center', marginHorizontal: 4 },
  hangupIcon: { transform: [{ rotate: '135deg' }] },
});
