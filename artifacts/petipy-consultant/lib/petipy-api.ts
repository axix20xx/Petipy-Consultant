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

export async function getCallHistory(
  token: string,
): Promise<CallHistoryEntry[]> {
  const result = await request<unknown>('/voice/calls/history', token);
  return findList(result, ['history', 'items', 'calls']).map(
    normalizeHistoryEntry,
  );
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
