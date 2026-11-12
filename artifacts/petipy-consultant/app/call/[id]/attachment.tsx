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
          style={({ pressed }) => [styles.iconButton, { backgroundColor: colors.secondary, opacity: pressed ? 0.76 : 1 }]}
        >
          <Ionicons name="arrow-forward" size={20} color={colors.primary} />
        </Pressable>
        <View style={styles.headerCopy}>
          <Text style={[styles.headerEyebrow, { color: colors.primary }]}>فایل امن تماس</Text>
          <Text numberOfLines={1} style={[styles.title, { color: colors.foreground }]}>
            {preview.attachment?.fileName ?? 'پیش‌نمایش پیوست'}
          </Text>
        </View>
        <View style={[styles.fileTypeBadge, { backgroundColor: colors.secondary }]}>
          <Ionicons
            name={preview.attachment?.contentType === 'application/pdf' ? 'document-text-outline' : 'image-outline'}
            size={16}
            color={colors.primary}
          />
        </View>
      </View>

      <View style={styles.body}>
        {loading ? (
          <View style={[styles.centerState, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.stateIcon, { backgroundColor: colors.secondary }]}>
              <ActivityIndicator color={colors.primary} size="small" />
            </View>
            <Text style={[styles.stateTitle, { color: colors.foreground }]}>در حال آماده‌سازی</Text>
            <Text style={[styles.stateText, { color: colors.mutedForeground }]}>فایل امن در حال دریافت است…</Text>
          </View>
        ) : error ? (
          <View style={[styles.centerState, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.stateIcon, { backgroundColor: colors.accent }]}>
              <Ionicons name="document-text-outline" size={25} color={colors.destructive} />
            </View>
            <Text style={[styles.stateTitle, { color: colors.foreground }]}>نمایش فایل ممکن نشد</Text>
            <Text
              testID="attachment-preview-error"
              accessibilityRole="alert"
              style={[styles.errorText, { color: colors.mutedForeground }]}
            >
              {error}
            </Text>
            <Pressable
              testID="attachment-preview-retry"
              accessibilityRole="button"
              onPress={() => setRetryKey((current) => current + 1)}
              style={({ pressed }) => [styles.retryButton, { backgroundColor: colors.primary, opacity: pressed ? 0.84 : 1 }]}
            >
              <Ionicons name="refresh-outline" size={16} color={colors.primaryForeground} />
              <Text style={[styles.retryText, { color: colors.primaryForeground }]}>
                تلاش دوباره
              </Text>
            </Pressable>
          </View>
        ) : preview.imageUrl ? (
          <View style={[styles.previewFrame, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Image
              testID="attachment-image-preview"
              source={{ uri: preview.imageUrl }}
              resizeMode="contain"
              style={styles.image}
              onError={() => setError('بارگذاری تصویر ناموفق بود. دوباره تلاش کنید.')}
              accessibilityLabel={preview.attachment?.fileName ?? 'تصویر پیوست'}
            />
            <View style={[styles.previewCaption, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Ionicons name="shield-checkmark-outline" size={15} color={colors.success} />
              <Text style={[styles.previewCaptionText, { color: colors.mutedForeground }]}>پیش‌نمایش امن درون برنامه</Text>
            </View>
          </View>
        ) : preview.pdfUri ? (
          <View style={[styles.previewFrame, { backgroundColor: colors.card, borderColor: colors.border }]}>
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
                  { backgroundColor: colors.card, borderColor: colors.border },
                ]}
              >
                <Text style={[styles.pageText, { color: colors.foreground }]}>
                  صفحه {page.current} از {page.total}
                </Text>
              </View>
            ) : null}
          </View>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    minHeight: 76,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingHorizontal: 14,
    gap: 10,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  iconButton: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCopy: { flex: 1, alignItems: 'flex-end', gap: 2 },
  headerEyebrow: { fontSize: 9, fontWeight: '700', writingDirection: 'rtl' },
  title: {
    maxWidth: '100%',
    fontSize: 13,
    fontWeight: '800',
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  fileTypeBadge: { width: 37, height: 37, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  body: { flex: 1 },
  centerState: {
    flex: 1,
    margin: 18,
    borderWidth: 1,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    gap: 10,
  },
  stateIcon: { width: 54, height: 54, borderRadius: 19, alignItems: 'center', justifyContent: 'center', marginBottom: 3 },
  stateTitle: { fontSize: 16, fontWeight: '800', textAlign: 'center', writingDirection: 'rtl' },
  stateText: {
    fontSize: 11,
    lineHeight: 18,
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  errorText: {
    fontSize: 11,
    lineHeight: 19,
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  retryButton: {
    minHeight: 46,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row-reverse',
    gap: 7,
    paddingHorizontal: 18,
    borderRadius: 14,
    marginTop: 5,
  },
  retryText: { fontSize: 11, fontWeight: '700', writingDirection: 'rtl' },
  previewFrame: { flex: 1, margin: 15, borderWidth: 1, borderRadius: 23, overflow: 'hidden', position: 'relative' },
  image: { flex: 1, width: '100%', padding: 10 },
  pdf: { flex: 1, width: '100%' },
  previewCaption: { position: 'absolute', top: 11, right: 11, flexDirection: 'row-reverse', alignItems: 'center', gap: 6, borderWidth: 1, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 8 },
  previewCaptionText: { fontSize: 10, writingDirection: 'rtl' },
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
