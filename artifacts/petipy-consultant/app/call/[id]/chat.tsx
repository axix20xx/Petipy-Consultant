import { useColors } from '@/hooks/useColors';
import {
  createVoiceChatUpload,
  getVoiceCallMessages,
  sendVoiceCallMessage,
  VOICE_CHAT_ALLOWED_TYPES,
  VOICE_CHAT_MAX_ATTACHMENTS,
  VOICE_CHAT_MAX_FILE_BYTES,
  type VoiceChatAttachment,
  type VoiceChatMessage,
} from '@/lib/petipy-api';
import { useConsultantSession } from '@/providers/consultant-session';
import { Ionicons } from '@expo/vector-icons';
import { File } from 'expo-file-system';
import * as DocumentPicker from 'expo-document-picker';
import { fetch as expoFetch } from 'expo/fetch';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { SafeAreaView } from 'react-native-safe-area-context';

type LocalAttachment = {
  uri: string;
  fileName: string;
  contentType: string;
  size: number;
};

const MAX_MESSAGE_LENGTH = 4000;
const POLL_INTERVAL_MS = 5000;

function inferContentType(fileName: string, suppliedType?: string | null) {
  const type = suppliedType?.toLowerCase();
  if (type && VOICE_CHAT_ALLOWED_TYPES.includes(type as never)) return type;
  const extension = fileName.split('.').pop()?.toLowerCase();
  const byExtension: Record<string, string> = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
    pdf: 'application/pdf',
  };
  return extension ? byExtension[extension] ?? '' : '';
}

function friendlyApiError(error: unknown) {
  if (error instanceof Error && error.message) return error.message;
  return 'ارتباط با گفت‌وگوی تماس برقرار نشد. دوباره تلاش کنید.';
}

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString('fa-IR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function VoiceCallChatScreen() {
  const colors = useColors();
  const params = useLocalSearchParams<{ id: string }>();
  const callId = Array.isArray(params.id) ? params.id[0] : params.id;
  const { token } = useConsultantSession();
  const [messages, setMessages] = useState<VoiceChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [files, setFiles] = useState<LocalAttachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestRunning = useRef(false);

  const loadMessages = useCallback(
    async (silent = false) => {
      if (!token || !callId || requestRunning.current) return;
      requestRunning.current = true;
      if (!silent) setLoading(true);
      try {
        const result = await getVoiceCallMessages(token, callId);
        setMessages(result);
        setError(null);
      } catch (loadError) {
        if (!silent || messages.length === 0) {
          setError(friendlyApiError(loadError));
        }
      } finally {
        requestRunning.current = false;
        setLoading(false);
      }
    },
    [callId, messages.length, token],
  );

  useEffect(() => {
    void loadMessages();
    const interval = setInterval(() => void loadMessages(true), POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [loadMessages]);

  const chooseFiles = useCallback(async () => {
    if (files.length >= VOICE_CHAT_MAX_ATTACHMENTS) {
      Alert.alert('حد پیوست', 'در هر پیام حداکثر پنج فایل می‌توانید بفرستید.');
      return;
    }
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [...VOICE_CHAT_ALLOWED_TYPES],
        multiple: true,
        copyToCacheDirectory: true,
      });
      if (result.canceled) return;

      const selected = result.assets.map((asset) => {
        const file = new File(asset.uri);
        return {
          uri: asset.uri,
          fileName: asset.name,
          contentType: inferContentType(asset.name, asset.mimeType),
          size: asset.size ?? file.size,
        };
      });
      const invalid = selected.find(
        (file) =>
          !file.contentType ||
          !Number.isInteger(file.size) ||
          file.size < 1 ||
          file.size > VOICE_CHAT_MAX_FILE_BYTES,
      );
      if (invalid) {
        Alert.alert(
          'فایل پشتیبانی نمی‌شود',
          'فقط تصویر JPG، PNG، WebP یا PDF تا حجم ۲۵ مگابایت قابل ارسال است.',
        );
        return;
      }
      if (files.length + selected.length > VOICE_CHAT_MAX_ATTACHMENTS) {
        Alert.alert('حد پیوست', 'در هر پیام حداکثر پنج فایل می‌توانید بفرستید.');
        return;
      }
      setFiles((current) => [...current, ...selected]);
      setError(null);
    } catch {
      setError('انتخاب فایل انجام نشد. دوباره تلاش کنید.');
    }
  }, [files.length]);

  const removeFile = useCallback((uri: string) => {
    setFiles((current) => current.filter((file) => file.uri !== uri));
  }, []);

  const submitMessage = useCallback(async () => {
    if (!token || !callId || sending) return;
    const content = draft.trim();
    if (!content && files.length === 0) return;

    setSending(true);
    setError(null);
    try {
      const attachments: VoiceChatAttachment[] = [];
      for (const picked of files) {
        const ticket = await createVoiceChatUpload(token, callId, {
          fileName: picked.fileName,
          contentType: picked.contentType,
          size: picked.size,
        });
        const response = await expoFetch(ticket.uploadUrl, {
          method: 'PUT',
          headers: { 'Content-Type': picked.contentType },
          body: new File(picked.uri),
        });
        if (!response.ok) {
          throw new Error('بارگذاری فایل کامل نشد. دوباره تلاش کنید.');
        }
        attachments.push({
          id: ticket.attachmentId,
          fileName: picked.fileName,
          contentType: picked.contentType,
          size: picked.size,
        });
      }

      const saved = await sendVoiceCallMessage(
        token,
        callId,
        content,
        attachments,
      );
      setMessages((current) => [...current, saved]);
      setDraft('');
      setFiles([]);
    } catch (sendError) {
      setError(friendlyApiError(sendError));
    } finally {
      setSending(false);
    }
  }, [callId, draft, files, sending, token]);

  const openAttachment = useCallback(
    (message: VoiceChatMessage, attachment: VoiceChatAttachment) => {
      if (!callId) return;
      router.push({
        pathname: '/call/[id]/attachment',
        params: {
          id: callId,
          messageId: message.id,
          attachmentId: attachment.id,
        },
      });
    },
    [callId],
  );

  if (!token || !callId) return <Redirect href="/sign-in" />;

  const renderMessage = ({ item }: { item: VoiceChatMessage }) => {
    const mine = item.isMine;
    return (
      <View
        style={[
          styles.messageRow,
          mine ? styles.messageMine : styles.messageTheirs,
        ]}
      >
        <View
          style={[
            styles.bubble,
            mine ? styles.bubbleMine : styles.bubbleTheirs,
            {
              backgroundColor: mine ? colors.primary : colors.card,
              borderColor: mine ? colors.primary : colors.input,
            },
          ]}
        >
          {item.content ? (
            <Text
              style={[
                styles.messageText,
                { color: mine ? colors.primaryForeground : colors.foreground },
              ]}
            >
              {item.content}
            </Text>
          ) : null}
          {item.attachments.map((attachment) => (
            <Pressable
              key={attachment.id}
              testID={`voice-chat-attachment-${attachment.id}`}
              accessibilityRole="button"
              onPress={() => void openAttachment(item, attachment)}
              style={[
                styles.attachment,
                {
                  backgroundColor: mine
                    ? colors.primaryForeground
                    : colors.secondary,
                },
              ]}
            >
              <Ionicons
                name={
                  attachment.contentType === 'application/pdf'
                    ? 'document-text-outline'
                    : 'image-outline'
                }
                size={18}
                color={colors.primary}
              />
              <Text
                numberOfLines={1}
                style={[styles.attachmentName, { color: colors.foreground }]}
              >
                {attachment.fileName}
              </Text>
              <Ionicons
                name="open-outline"
                size={15}
                color={colors.mutedForeground}
              />
            </Pressable>
          ))}
          <Text
            style={[
              styles.messageTime,
              { color: mine ? colors.primaryForeground : colors.mutedForeground },
            ]}
          >
            {formatTime(item.createdAt)}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView
      style={[styles.safe, { backgroundColor: colors.background }]}
      edges={['top', 'bottom']}
    >
      <View style={[styles.header, { borderBottomColor: colors.border, backgroundColor: colors.card }]}>
        <Pressable
          testID="voice-chat-back"
          accessibilityRole="button"
          accessibilityLabel="بازگشت به تماس"
          onPress={() => router.back()}
          style={[styles.iconButton, { backgroundColor: colors.secondary }]}
        >
          <Ionicons name="arrow-forward" size={20} color={colors.primary} />
        </Pressable>
        <View style={styles.headerText}>
          <Text style={[styles.title, { color: colors.foreground }]}>
            گفت‌وگوی تماس
          </Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            پیام‌ها و فایل‌های همین تماس
          </Text>
        </View>
        <Pressable
          testID="voice-chat-refresh"
          accessibilityRole="button"
          accessibilityLabel="تازه‌سازی پیام‌ها"
          onPress={() => void loadMessages()}
          disabled={loading}
          style={[styles.iconButton, { backgroundColor: colors.secondary }]}
        >
          {loading ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Ionicons name="refresh" size={19} color={colors.primary} />
          )}
        </Pressable>
      </View>

      <KeyboardAvoidingView
        behavior="padding"
        style={styles.keyboardView}
      >
        <FlatList
          testID="voice-chat-messages"
          inverted
          data={[...messages].reverse()}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          keyboardDismissMode="interactive"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.messageList}
          ListEmptyComponent={
            loading ? (
              <View style={styles.emptyState}>
                <ActivityIndicator color={colors.primary} />
                <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                  در حال دریافت گفت‌وگو…
                </Text>
              </View>
            ) : (
              <View style={styles.emptyState}>
                <View
                  style={[
                    styles.emptyIcon,
                    { backgroundColor: colors.secondary },
                  ]}
                >
                  <Ionicons
                    name="chatbubble-ellipses"
                    size={27}
                    color={colors.primary}
                  />
                </View>
                <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
                  گفت‌وگو تازه شروع می‌شود
                </Text>
                <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                  پیام یا فایل مرتبط با این مشاوره را بفرستید.
                </Text>
              </View>
            )
          }
        />

        {error ? (
          <Text
            testID="voice-chat-error"
            accessibilityRole="alert"
            style={[styles.error, { color: colors.destructive }]}
          >
            {error}
          </Text>
        ) : null}

        {files.length ? (
          <View style={styles.selectedFiles}>
            {files.map((file) => (
              <View
                key={file.uri}
                style={[
                  styles.fileChip,
                  { backgroundColor: colors.secondary },
                ]}
              >
                <Text
                  numberOfLines={1}
                  style={[styles.fileChipText, { color: colors.foreground }]}
                >
                  {file.fileName}
                </Text>
                <Pressable
                  testID="voice-chat-remove-file"
                  accessibilityRole="button"
                  accessibilityLabel={`حذف فایل ${file.fileName}`}
                  onPress={() => removeFile(file.uri)}
                  hitSlop={8}
                >
                  <Ionicons
                    name="close-circle"
                    size={18}
                    color={colors.mutedForeground}
                  />
                </Pressable>
              </View>
            ))}
          </View>
        ) : null}

        <View
          style={[
            styles.composer,
            { backgroundColor: colors.card, borderColor: colors.input },
          ]}
        >
          <Pressable
            testID="voice-chat-pick-file"
            accessibilityRole="button"
            accessibilityLabel="افزودن عکس یا فایل PDF"
            onPress={() => void chooseFiles()}
            disabled={sending}
            style={[styles.composerIcon, { backgroundColor: colors.secondary }]}
          >
            <Ionicons name="attach" size={22} color={colors.primary} />
          </Pressable>
          <TextInput
            testID="voice-chat-input"
            accessibilityLabel="متن پیام"
            value={draft}
            onChangeText={setDraft}
            placeholder="پیامت را بنویس…"
            placeholderTextColor={colors.mutedForeground}
            multiline
            maxLength={MAX_MESSAGE_LENGTH}
            editable={!sending}
            textAlign="right"
            style={[styles.textInput, { color: colors.foreground }]}
          />
          <Pressable
            testID="voice-chat-send"
            accessibilityRole="button"
            accessibilityLabel="ارسال پیام"
            disabled={sending || (!draft.trim() && files.length === 0)}
            onPress={() => void submitMessage()}
            style={[
              styles.sendButton,
              { backgroundColor: colors.primary },
              (sending || (!draft.trim() && files.length === 0)) &&
                styles.sendDisabled,
            ]}
          >
            {sending ? (
              <ActivityIndicator size="small" color={colors.primaryForeground} />
            ) : (
              <Ionicons name="send" size={17} color={colors.primaryForeground} />
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    minHeight: 78,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    backgroundColor: 'transparent',
  },
  iconButton: {
    width: 46,
    height: 46,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: { flex: 1, alignItems: 'flex-end', gap: 3 },
  title: { fontSize: 17, fontWeight: '700', writingDirection: 'rtl' },
  subtitle: { fontSize: 10, writingDirection: 'rtl' },
  keyboardView: { flex: 1 },
  messageList: {
    flexGrow: 1,
    justifyContent: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 20,
    gap: 10,
  },
  messageRow: { width: '100%', marginVertical: 5 },
  messageMine: { alignItems: 'flex-end' },
  messageTheirs: { alignItems: 'flex-start' },
  bubble: {
    maxWidth: '89%',
    borderWidth: 1,
    borderRadius: 24,
    paddingHorizontal: 15,
    paddingVertical: 13,
    gap: 8,
  },
  bubbleMine: { borderBottomLeftRadius: 6 },
  bubbleTheirs: { borderBottomRightRadius: 6 },
  messageText: {
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  messageTime: {
    alignSelf: 'flex-start',
    fontSize: 9,
    writingDirection: 'rtl',
    marginTop: 2,
  },
  attachment: {
    minHeight: 42,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 10,
    borderRadius: 13,
  },
  attachmentName: {
    flex: 1,
    maxWidth: 180,
    fontSize: 11,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  emptyState: {
    flex: 1,
    minHeight: 250,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 11,
    paddingHorizontal: 28,
    transform: [{ scaleY: -1 }],
  },
  emptyIcon: {
    width: 62,
    height: 62,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  emptyText: {
    fontSize: 11,
    lineHeight: 19,
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  error: {
    paddingHorizontal: 18,
    paddingBottom: 8,
    fontSize: 11,
    lineHeight: 18,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  selectedFiles: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: 7,
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
  fileChip: {
    maxWidth: '100%',
    minHeight: 32,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 9,
    borderRadius: 11,
  },
  fileChipText: {
    maxWidth: 190,
    fontSize: 10,
    writingDirection: 'rtl',
  },
  composer: {
    minHeight: 58,
    flexDirection: 'row-reverse',
    alignItems: 'flex-end',
    gap: 9,
    marginHorizontal: 12,
    marginBottom: 10,
    padding: 7,
    borderWidth: 1,
    borderRadius: 23,
  },
  composerIcon: {
    width: 46,
    height: 46,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textInput: {
    flex: 1,
    maxHeight: 110,
    minHeight: 46,
    paddingTop: 11,
    paddingBottom: 8,
    paddingHorizontal: 3,
    fontSize: 13,
    lineHeight: 20,
    writingDirection: 'rtl',
  },
  sendButton: {
    width: 46,
    height: 46,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendDisabled: { opacity: 0.48 },
});
