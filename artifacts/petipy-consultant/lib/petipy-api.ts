export const PETIPY_API_ORIGIN = 'https://petipy.com';

export type ApiProfile = {
  id?: string;
  displayName?: string;
  active?: boolean;
  manualStatus?: 'online' | 'offline' | string;
};

export type IncomingCall = {
  id: string;
  callerName: string;
  petName?: string;
  subject?: string;
  createdAt?: string;
  expiresAt?: string;
  status?: string;
};

export type ConsultantPushDevice =
  | {
      deviceId: string;
      platform: 'android';
      pushToken: string;
    }
  | {
      deviceId: string;
      platform: 'ios';
      pushToken: string;
      pushEnvironment: 'sandbox' | 'production';
    };

export type CallHistoryEntry = {
  id: string;
  callerName: string;
  petName?: string;
  subject?: string;
  status?: string;
  startedAt?: string;
  durationSeconds?: number;
  endReason?: string;
};

export type ConsultantAnalyticsDays = 7 | 30 | 90 | 365;

export type ConsultantCallAnalytics = {
  days: ConsultantAnalyticsDays;
  totalCalls: number;
  completedCalls: number;
  missedCalls: number;
  totalSpokenSeconds: number;
  averageSpokenSeconds: number;
  answerRate: number;
  daily: Array<{
    date: string;
    calls: number;
    spokenSeconds: number;
  }>;
};

export type TurnIceServer = {
  urls: string[];
  username: string;
  credential: string;
};

export type CallSession = {
  callId: string;
  token: string;
  status: string;
  displayName: string;
  expiresAt: string;
  iceServers: TurnIceServer[];
};

export type VoiceChatAttachment = {
  id: string;
  fileName: string;
  contentType: string;
  size: number;
};

export type VoiceChatMessage = {
  id: string;
  callId: string;
  senderRole: 'customer' | 'consultant';
  isMine: boolean;
  content: string;
  attachments: VoiceChatAttachment[];
  createdAt: string;
};

export type VoiceChatUploadTicket = {
  attachmentId: string;
  uploadUrl: string;
};

export type VoiceChatUploadInput = {
  fileName: string;
  contentType: string;
  size: number;
};

export const VOICE_CHAT_ALLOWED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
] as const;
export const VOICE_CHAT_MAX_FILE_BYTES = 25 * 1024 * 1024;
export const VOICE_CHAT_MAX_ATTACHMENTS = 5;

export class PetipyApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'PetipyApiError';
    this.status = status;
  }
}

async function request<T>(
  path: string,
  sessionToken: string,
  init: RequestInit = {},
): Promise<T> {
  const response = await fetch(`${PETIPY_API_ORIGIN}/api${path}`, {
    ...init,
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${sessionToken}`,
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...init.headers,
    },
  });

  const text = await response.text();
  let body: unknown;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = null;
  }

  if (!response.ok) {
    const record = asRecord(body);
    const message =
      typeof record.error === 'string'
        ? record.error
        : typeof record.message === 'string'
          ? record.message
          : `Petipy API returned ${response.status}`;
    throw new PetipyApiError(message, response.status);
  }

  return unwrap<T>(body);
}

function asRecord(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function unwrap<T>(value: unknown): T {
  const root = asRecord(value);
  if ('data' in root) return root.data as T;
  if ('result' in root) return root.result as T;
  return value as T;
}

export function normalizeProfile(value: unknown): ApiProfile {
  const root = asRecord(value);
  const account = asRecord(root.account);
  const user = asRecord(root.user);
  const profile = asRecord(root.profile);
  const sources = [root, profile, account, user];
  const firstString = (...values: unknown[]) =>
    values.find((value): value is string => typeof value === 'string');

  return {
    id: firstString(...sources.map((source) => source.id)),
    displayName: firstString(
      ...sources.map((source) => source.displayName),
      ...sources.map((source) => source.name),
    ),
    active: sources.some((source) => source.active === true),
    manualStatus: firstString(
      ...sources.map((source) => source.manualStatus),
      ...sources.map((source) => source.availability),
    ),
  };
}

function normalizeCall(value: unknown): IncomingCall {
  const item = asRecord(value);
  const id = item.id ?? item.callId ?? item.requestId;
  if (typeof id !== 'string' && typeof id !== 'number') {
    throw new Error('تماس دریافتی شناسه‌ی معتبر ندارد.');
  }
  const customer = asRecord(item.customer);
  const caller = asRecord(item.caller);
  const pet = asRecord(item.pet);
  const stringValue = (...values: unknown[]) =>
    values.find((candidate): candidate is string => typeof candidate === 'string');
  return {
    id: String(id),
    callerName:
      stringValue(
        item.callerName,
        item.customerName,
        caller.name,
        customer.name,
      ) ?? 'درخواست مشاوره',
    petName: stringValue(item.petName, pet.name),
    subject: stringValue(item.subject, item.topic, item.reason),
    createdAt: stringValue(item.createdAt, item.requestedAt),
    expiresAt:
      typeof item.expiresAt === 'string' ? item.expiresAt : undefined,
    status: typeof item.status === 'string' ? item.status : undefined,
  };
}

function normalizeHistoryEntry(value: unknown): CallHistoryEntry {
  const item = asRecord(value);
  const call = normalizeCall(item);
  const duration = item.durationSeconds ?? item.duration;
  return {
    ...call,
    id: String(item.callId ?? call.id),
    callerName: 'تماس مشاوره',
    status: typeof item.status === 'string' ? item.status : undefined,
    startedAt:
      typeof item.acceptedAt === 'string'
        ? item.acceptedAt
        : typeof item.startedAt === 'string'
          ? item.startedAt
          : call.createdAt,
    durationSeconds: typeof duration === 'number' ? duration : undefined,
    endReason:
      typeof item.endReason === 'string' ? item.endReason : undefined,
  };
}

function normalizeCallSession(value: unknown, requestedCallId: string): CallSession {
  const result = asRecord(value);
  const callId =
    typeof result.callId === 'string' ? result.callId : requestedCallId;
  const token = result.token;
  const servers = result.iceServers;
  if (typeof token !== 'string' || !token) {
    throw new Error('نشست تماس، توکن موقت معتبر ندارد.');
  }
  if (!Array.isArray(servers) || servers.length === 0) {
    throw new Error('سرویس تماس، اطلاعات TURN را برنگرداند.');
  }
  const iceServers = servers.map((value): TurnIceServer => {
    const server = asRecord(value);
    const rawUrls = server.urls;
    const urls = Array.isArray(rawUrls)
      ? rawUrls.filter((url): url is string => typeof url === 'string')
      : typeof rawUrls === 'string'
        ? [rawUrls]
        : [];
    if (
      urls.length === 0 ||
      urls.some((url) => !/^turns?:/i.test(url)) ||
      typeof server.username !== 'string' ||
      typeof server.credential !== 'string'
    ) {
      throw new Error(
        'اطلاعات TURN نامعتبر است؛ برای امنیت، اتصال مستقیم یا STUN پذیرفته نمی‌شود.',
      );
    }
    return {
      urls,
      username: server.username,
      credential: server.credential,
    };
  });
  return {
    callId,
    token,
    status: typeof result.status === 'string' ? result.status : 'connecting',
    displayName:
      typeof result.displayName === 'string'
        ? result.displayName
        : 'تماس مشاوره',
    expiresAt: typeof result.expiresAt === 'string' ? result.expiresAt : '',
    iceServers,
  };
}

function findList(value: unknown, candidateKeys: string[]): unknown[] {
  if (Array.isArray(value)) return value;
  const root = asRecord(value);
  for (const key of candidateKeys) {
    if (Array.isArray(root[key])) return root[key] as unknown[];
  }
  for (const key of ['data', 'result', 'payload']) {
    const nested = root[key];
    if (Array.isArray(nested)) return nested;
    const nestedRecord = asRecord(nested);
    for (const listKey of candidateKeys) {
      if (Array.isArray(nestedRecord[listKey])) {
        return nestedRecord[listKey] as unknown[];
      }
    }
  }
  return [];
}

export async function getConsultantProfile(token: string) {
  const result = await request<unknown>('/voice/consultant/me', token);
  return normalizeProfile(result);
}

export async function getIncomingCalls(token: string): Promise<IncomingCall[]> {
  const result = await request<unknown>('/voice/consultant/me/requests', token);
  return findList(result, ['requests', 'items', 'calls']).map(normalizeCall);
}

export async function registerConsultantPushDevice(
  token: string,
  device: ConsultantPushDevice,
) {
  return request<unknown>('/voice/consultant/me/devices', token, {
    method: 'POST',
    body: JSON.stringify(device),
  });
}

export async function getConsultantPushStatus(token: string) {
  return request<unknown>('/voice/consultant/me/push-status', token);
}

export async function revokeConsultantPushDevice(
  token: string,
  deviceId: string,
) {
  return request<unknown>(
    `/voice/consultant/me/devices/${encodeURIComponent(deviceId)}`,
    token,
    { method: 'DELETE' },
  );
}

export async function getCallHistory(
  token: string,
): Promise<CallHistoryEntry[]> {
  const result = await request<unknown>('/voice/calls/history', token);
  return findList(result, ['history', 'items', 'calls']).map(
    normalizeHistoryEntry,
  );
}

export async function getConsultantCallAnalytics(
  token: string,
  days: ConsultantAnalyticsDays,
): Promise<ConsultantCallAnalytics> {
  if (![7, 30, 90, 365].includes(days)) {
    throw new PetipyApiError('بازه‌ی گزارش معتبر نیست.', 400);
  }
  const value = asRecord(
    await request<unknown>(
      `/voice/consultant/me/analytics?days=${days}`,
      token,
    ),
  );
  const isNonNegativeInteger = (candidate: unknown): candidate is number =>
    typeof candidate === 'number' &&
    Number.isSafeInteger(candidate) &&
    candidate >= 0;
  const daily = value.daily;
  if (
    value.days !== days ||
    !isNonNegativeInteger(value.totalCalls) ||
    !isNonNegativeInteger(value.completedCalls) ||
    !isNonNegativeInteger(value.missedCalls) ||
    !isNonNegativeInteger(value.totalSpokenSeconds) ||
    !isNonNegativeInteger(value.averageSpokenSeconds) ||
    typeof value.answerRate !== 'number' ||
    !Number.isFinite(value.answerRate) ||
    value.answerRate < 0 ||
    value.answerRate > 100 ||
    !Array.isArray(daily)
  ) {
    throw new PetipyApiError('آمار تماس از سرور معتبر نیست.', 502);
  }

  const normalizedDaily = daily.map((item): ConsultantCallAnalytics['daily'][number] => {
    const row = asRecord(item);
    if (
      typeof row.date !== 'string' ||
      !Number.isFinite(Date.parse(row.date)) ||
      !isNonNegativeInteger(row.calls) ||
      !isNonNegativeInteger(row.spokenSeconds)
    ) {
      throw new PetipyApiError('ردیف آمار تماس از سرور معتبر نیست.', 502);
    }
    return {
      date: row.date,
      calls: row.calls,
      spokenSeconds: row.spokenSeconds,
    };
  });

  return {
    days,
    totalCalls: value.totalCalls,
    completedCalls: value.completedCalls,
    missedCalls: value.missedCalls,
    totalSpokenSeconds: value.totalSpokenSeconds,
    averageSpokenSeconds: value.averageSpokenSeconds,
    answerRate: value.answerRate,
    daily: normalizedDaily,
  };
}

export async function setConsultantAvailability(
  token: string,
  status: 'online' | 'offline',
) {
  return request<unknown>('/voice/consultant/me/availability', token, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}

export async function acceptIncomingCall(token: string, callId: string) {
  const result = await request<unknown>(
    `/voice/consultant/me/requests/${encodeURIComponent(callId)}/accept`,
    token,
    { method: 'POST' },
  );
  return normalizeCallSession(result, callId);
}

export async function rejectIncomingCall(
  token: string,
  callId: string,
  reason: 'busy' = 'busy',
) {
  const result = asRecord(await request<unknown>(
    `/voice/consultant/me/requests/${encodeURIComponent(callId)}/reject`,
    token,
    {
      method: 'POST',
      body: JSON.stringify({ reason }),
    },
  ));
  if (result.callId !== callId || result.status !== 'rejected') {
    throw new PetipyApiError('پاسخ رد تماس از سرور معتبر نیست.', 502);
  }
  return { callId, status: 'rejected' as const };
}

export async function joinCall(token: string, callId: string) {
  const result = await request<unknown>(
    `/voice/consultant/me/requests/${encodeURIComponent(callId)}/join`,
    token,
    { method: 'POST' },
  );
  return normalizeCallSession(result, callId);
}

export async function finishCall(token: string, callId: string) {
  return request<unknown>(
    `/voice/calls/${encodeURIComponent(callId)}/finish`,
    token,
    { method: 'POST' },
  );
}

function normalizeVoiceChatAttachment(value: unknown): VoiceChatAttachment {
  const record = asRecord(value);
  if (
    typeof record.id !== 'string' ||
    typeof record.fileName !== 'string' ||
    typeof record.contentType !== 'string' ||
    typeof record.size !== 'number' ||
    !Number.isFinite(record.size)
  ) {
    throw new PetipyApiError('پیوست پیام از سرور معتبر نیست.', 502);
  }
  return {
    id: record.id,
    fileName: record.fileName,
    contentType: record.contentType,
    size: record.size,
  };
}

function normalizeVoiceChatMessage(value: unknown): VoiceChatMessage {
  const record = asRecord(value);
  const createdAt =
    typeof record.createdAt === 'string'
      ? record.createdAt
      : record.createdAt instanceof Date
        ? record.createdAt.toISOString()
        : '';
  if (
    typeof record.id !== 'string' ||
    typeof record.callId !== 'string' ||
    (record.senderRole !== 'customer' && record.senderRole !== 'consultant') ||
    typeof record.isMine !== 'boolean' ||
    typeof record.content !== 'string' ||
    !Array.isArray(record.attachments) ||
    !Number.isFinite(Date.parse(createdAt))
  ) {
    throw new PetipyApiError('پیام گفت‌وگوی تماس از سرور معتبر نیست.', 502);
  }
  return {
    id: record.id,
    callId: record.callId,
    senderRole: record.senderRole,
    isMine: record.isMine,
    content: record.content,
    attachments: record.attachments.map(normalizeVoiceChatAttachment),
    createdAt: new Date(createdAt).toISOString(),
  };
}

export async function getVoiceCallMessages(
  token: string,
  callId: string,
): Promise<VoiceChatMessage[]> {
  const result = await request<unknown>(
    `/voice/calls/${encodeURIComponent(callId)}/messages`,
    token,
  );
  if (!Array.isArray(result)) {
    throw new PetipyApiError('فهرست پیام‌های تماس از سرور معتبر نیست.', 502);
  }
  return result.map(normalizeVoiceChatMessage);
}

export async function createVoiceChatUpload(
  token: string,
  callId: string,
  input: VoiceChatUploadInput,
): Promise<VoiceChatUploadTicket> {
  if (
    input.fileName.trim().length < 1 ||
    input.fileName.length > 180 ||
    !(VOICE_CHAT_ALLOWED_TYPES as readonly string[]).includes(input.contentType) ||
    !Number.isInteger(input.size) ||
    input.size < 1 ||
    input.size > VOICE_CHAT_MAX_FILE_BYTES
  ) {
    throw new PetipyApiError('نوع یا اندازه‌ی فایل پشتیبانی نمی‌شود.', 400);
  }
  const result = asRecord(
    await request<unknown>(
      `/voice/calls/${encodeURIComponent(callId)}/messages/uploads`,
      token,
      {
        method: 'POST',
        body: JSON.stringify(input),
      },
    ),
  );
  if (
    typeof result.attachmentId !== 'string' ||
    typeof result.uploadUrl !== 'string'
  ) {
    throw new PetipyApiError('پاسخ بارگذاری فایل از سرور معتبر نیست.', 502);
  }
  let uploadUrl: URL;
  try {
    uploadUrl = new URL(result.uploadUrl, PETIPY_API_ORIGIN);
  } catch {
    throw new PetipyApiError('نشانی بارگذاری فایل معتبر نیست.', 502);
  }
  if (uploadUrl.protocol !== 'https:') {
    throw new PetipyApiError('بارگذاری فایل امن در دسترس نیست.', 502);
  }
  return { attachmentId: result.attachmentId, uploadUrl: uploadUrl.toString() };
}

export async function sendVoiceCallMessage(
  token: string,
  callId: string,
  content: string,
  attachments: VoiceChatAttachment[],
): Promise<VoiceChatMessage> {
  if (
    content.length > 4000 ||
    attachments.length > VOICE_CHAT_MAX_ATTACHMENTS ||
    (!content.trim() && attachments.length === 0)
  ) {
    throw new PetipyApiError('پیام باید متن یا حداکثر پنج پیوست داشته باشد.', 400);
  }
  const result = await request<unknown>(
    `/voice/calls/${encodeURIComponent(callId)}/messages`,
    token,
    {
      method: 'POST',
      body: JSON.stringify({ content, attachments }),
    },
  );
  return normalizeVoiceChatMessage(result);
}

export async function getVoiceChatAttachmentUrl(
  token: string,
  callId: string,
  messageId: string,
  attachmentId: string,
): Promise<{ url: string; expiresAt: string }> {
  const result = asRecord(
    await request<unknown>(
      `/voice/calls/${encodeURIComponent(callId)}/messages/${encodeURIComponent(messageId)}/attachments/${encodeURIComponent(attachmentId)}`,
      token,
    ),
  );
  if (
    typeof result.url !== 'string' ||
    typeof result.expiresAt !== 'string' ||
    !Number.isFinite(Date.parse(result.expiresAt))
  ) {
    throw new PetipyApiError('پیوست تماس از سرور معتبر نیست.', 502);
  }
  let url: URL;
  try {
    url = new URL(result.url, PETIPY_API_ORIGIN);
  } catch {
    throw new PetipyApiError('نشانی دریافت فایل معتبر نیست.', 502);
  }
  if (url.protocol !== 'https:') {
    throw new PetipyApiError('دریافت فایل امن در دسترس نیست.', 502);
  }
  return { url: url.toString(), expiresAt: result.expiresAt };
}
