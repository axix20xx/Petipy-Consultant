import { useColors } from '@/hooks/useColors';
import {
  getVoiceCallMessages,
  getVoiceChatAttachmentUrl,
  type VoiceChatAttachment,
} from '@/lib/petipy-api';
import { useConsultantSession } from '@/providers/consultant-session';
import { Ionicons } from '@expo/vector-icons';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { createElement, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type Preview = {
  attachment: VoiceChatAttachment;
  url: string;
} | null;

const Iframe = 'iframe' as unknown as React.ElementType;

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default function VoiceCallAttachmentWebScreen() {
  const colors = useColors();
  const params = useLocalSearchParams<{
    id: string;
    messageId: string;
    attachmentId: string;
  }>();
  const callId = first(params.id);
  const messageId = first(params.messageId);
  const attachmentId = first(params.attachmentId);
  const { token } = useConsultantSession();
  const [preview, setPreview] = useState<Preview>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function loadPreview() {
      if (!token || !callId || !messageId || !attachmentId) {
        setError('مشخصات پیوست کامل نیست.');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      setPreview(null);
      try {
        const messages = await getVoiceCallMessages(token, callId);
        const attachment = messages
          .find((message) => message.id === messageId)
          ?.attachments.find((item) => item.id === attachmentId);
        if (!attachment) {
          throw new Error('این فایل دیگر در گفت‌وگوی تماس در دسترس نیست.');
        }
        if (
          !attachment.contentType.startsWith('image/') &&
          attachment.contentType !== 'application/pdf'
        ) {
          throw new Error('پیش‌نمایش این نوع فایل در برنامه پشتیبانی نمی‌شود.');
        }
        const { url } = await getVoiceChatAttachmentUrl(
          token,
          callId,
          messageId,
          attachmentId,
        );
        if (!cancelled) setPreview({ attachment, url });
      } catch (previewError) {
        if (!cancelled) {
          setError(
            previewError instanceof Error
              ? previewError.message
              : 'نمایش فایل ممکن نشد. دوباره تلاش کنید.',
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadPreview();
    return () => {
      cancelled = true;
    };
  }, [attachmentId, callId, messageId, retryKey, token]);

  if (!token) return <Redirect href="/sign-in" />;

  return (
    <SafeAreaView
      style={[styles.safe, { backgroundColor: colors.background }]}
      edges={['top', 'bottom']}
    >
      <View
        style={[
          styles.header,
          { backgroundColor: colors.card, borderBottomColor: colors.border },
        ]}
      >
        <Pressable
          testID="attachment-preview-back"
          accessibilityRole="button"
          accessibilityLabel="بازگشت به گفت‌وگو"
          onPress={() => router.back()}
          style={[styles.iconButton, { backgroundColor: colors.secondary }]}
        >
          <Ionicons name="arrow-forward" size={21} color={colors.primary} />
        </Pressable>
        <Text numberOfLines={1} style={[styles.title, { color: colors.foreground }]}>
          {preview?.attachment.fileName ?? 'پیش‌نمایش پیوست'}
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.body}>
        {loading ? (
          <View style={styles.centerState}>
            <ActivityIndicator color={colors.primary} size="large" />
            <Text style={[styles.stateText, { color: colors.mutedForeground }]}>
              در حال آماده‌سازی فایل امن…
            </Text>
          </View>
        ) : error ? (
          <View style={styles.centerState}>
            <Ionicons
              name="document-text-outline"
              size={38}
              color={colors.mutedForeground}
            />
            <Text
              testID="attachment-preview-error"
              accessibilityRole="alert"
              style={[styles.errorText, { color: colors.foreground }]}
            >
              {error}
            </Text>
            <Pressable
              testID="attachment-preview-retry"
              accessibilityRole="button"
              onPress={() => setRetryKey((current) => current + 1)}
              style={[styles.retryButton, { backgroundColor: colors.primary }]}
            >
              <Text style={[styles.retryText, { color: colors.primaryForeground }]}>
                تلاش دوباره
              </Text>
            </Pressable>
          </View>
        ) : preview?.attachment.contentType.startsWith('image/') ? (
          <Image
            testID="attachment-image-preview"
            source={{ uri: preview.url }}
            resizeMode="contain"
            style={styles.image}
            onError={() => setError('بارگذاری تصویر ناموفق بود. دوباره تلاش کنید.')}
            accessibilityLabel={preview.attachment.fileName}
          />
        ) : preview?.attachment.contentType === 'application/pdf' ? (
          createElement(Iframe, {
            testID: 'attachment-pdf-preview',
            src: preview.url,
            title: preview.attachment.fileName,
            referrerPolicy: 'no-referrer',
            style: {
              width: '100%',
              height: '100%',
              border: 'none',
              backgroundColor: colors.background,
            },
          })
        ) : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    minHeight: 68,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  iconButton: {
    width: 46,
    height: 46,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  headerSpacer: { width: 40 },
  body: { flex: 1 },
  centerState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    gap: 14,
    margin: 18,
    borderRadius: 20,
  },
  stateText: {
    fontSize: 12,
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  errorText: {
    fontSize: 13,
    lineHeight: 21,
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  retryButton: {
    minHeight: 42,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    borderRadius: 14,
  },
  retryText: { fontSize: 12, fontWeight: '700', writingDirection: 'rtl' },
  image: { flex: 1, width: '100%' },
});
