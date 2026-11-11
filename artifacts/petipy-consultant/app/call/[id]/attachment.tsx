import { PdfView } from '@kishannareshpal/expo-pdf';
import { useColors } from '@/hooks/useColors';
import { getVoiceCallMessages, getVoiceChatAttachmentUrl } from '@/lib/petipy-api';
import type { VoiceChatAttachment } from '@/lib/petipy-api';
import { useConsultantSession } from '@/providers/consultant-session';
import { File, Paths } from 'expo-file-system';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

type AttachmentPreviewState = {
  attachment: VoiceChatAttachment | null;
  imageUrl: string | null;
  pdfUri: string | null;
};

function getParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default function VoiceCallAttachmentScreen() {
  const colors = useColors();
  const params = useLocalSearchParams<{
    id: string;
    messageId: string;
    attachmentId: string;
  }>();
  const callId = getParam(params.id);
  const messageId = getParam(params.messageId);
  const attachmentId = getParam(params.attachmentId);
  const { token } = useConsultantSession();
  const [preview, setPreview] = useState<AttachmentPreviewState>({
    attachment: null,
    imageUrl: null,
    pdfUri: null,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);
  const [page, setPage] = useState<{ current: number; total: number } | null>(
    null,
  );

  useEffect(() => {
    let cancelled = false;
    let cachedPdf: File | null = null;

    async function loadPreview() {
      if (!token || !callId || !messageId || !attachmentId) {
        setError('مشخصات پیوست کامل نیست.');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      setPreview({ attachment: null, imageUrl: null, pdfUri: null });
      setPage(null);

      try {
        const messages = await getVoiceCallMessages(token, callId);
        const message = messages.find((item) => item.id === messageId);
        const attachment = message?.attachments.find(
          (item) => item.id === attachmentId,
        );
        if (!attachment) {
          throw new Error('این فایل دیگر در گفت‌وگوی تماس در دسترس نیست.');
        }

        const { url } = await getVoiceChatAttachmentUrl(
          token,
          callId,
          messageId,
          attachmentId,
        );

        if (attachment.contentType === 'application/pdf') {
          const destination = new File(
            Paths.cache,
            `petipy-chat-${Date.now()}.pdf`,
          );
          const file = await File.downloadFileAsync(url, destination);
          cachedPdf = file;
          if (cancelled) {
            file.delete();
            return;
          }
          setPreview({ attachment, imageUrl: null, pdfUri: file.uri });
        } else if (attachment.contentType.startsWith('image/')) {
          setPreview({ attachment, imageUrl: url, pdfUri: null });
        } else {
          throw new Error('پیش‌نمایش این نوع فایل در برنامه پشتیبانی نمی‌شود.');
        }
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
      cachedPdf?.delete();
    };
  }, [attachmentId, callId, messageId, retryKey, token]);

  if (!token) return <Redirect href="/sign-in" />;

  return (
    <SafeAreaView
      style={[styles.safe, { backgroundColor: colors.background }]}
      edges={['top', 'bottom']}
    >
      <View style={[styles.header, { borderBottomColor: colors.border, backgroundColor: colors.card }]}>
        <Pressable
          testID="attachment-preview-back"
          accessibilityRole="button"
          accessibilityLabel="بازگشت به گفت‌وگو"
          onPress={() => router.back()}
          style={[styles.iconButton, { backgroundColor: colors.secondary }]}
        >
          <Ionicons name="arrow-forward" size={21} color={colors.foreground} />
        </Pressable>
        <Text
          numberOfLines={1}
          style={[styles.title, { color: colors.foreground }]}
        >
          {preview.attachment?.fileName ?? 'پیش‌نمایش پیوست'}
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
              <Text
                style={[
                  styles.retryText,
                  { color: colors.primaryForeground },
                ]}
              >
                تلاش دوباره
              </Text>
            </Pressable>
          </View>
        ) : preview.imageUrl ? (
          <Image
            testID="attachment-image-preview"
            source={{ uri: preview.imageUrl }}
            resizeMode="contain"
            style={styles.image}
            onError={() =>
              setError('بارگذاری تصویر ناموفق بود. دوباره تلاش کنید.')
            }
            accessibilityLabel={preview.attachment?.fileName ?? 'تصویر پیوست'}
          />
        ) : preview.pdfUri ? (
          <>
            <PdfView
              testID="attachment-pdf-preview"
              style={styles.pdf}
              uri={preview.pdfUri}
              fitMode="width"
              pageGap={10}
              onLoadComplete={({ pageCount }) =>
                setPage({ current: 1, total: pageCount })
              }
              onPageChanged={({ pageIndex, pageCount }) =>
                setPage({ current: pageIndex + 1, total: pageCount })
              }
              onError={() =>
                setError('باز کردن PDF ناموفق بود. فایل را دوباره دریافت کنید.')
              }
            />
            {page ? (
              <View
                style={[
                  styles.pageBadge,
                  { backgroundColor: colors.card, borderColor: colors.input },
                ]}
              >
                <Text style={[styles.pageText, { color: colors.foreground }]}>
                  صفحه {page.current} از {page.total}
                </Text>
              </View>
            ) : null}
          </>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    minHeight: 72,
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
  pdf: { flex: 1, width: '100%' },
  pageBadge: {
    position: 'absolute',
    bottom: 14,
    alignSelf: 'center',
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderWidth: 1,
    borderRadius: 16,
  },
  pageText: { fontSize: 10, writingDirection: 'rtl' },
});
