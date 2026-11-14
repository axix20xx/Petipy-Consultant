import {
  PETIPY_API_ORIGIN,
  PetipyApiError,
  type ApiProfile,
} from './petipy-api';

export const CONSULTANT_SESSION_KEY = 'petipy.voice-consultant.session';
export const CONSULTANT_ROLE = 'VOICE_CONSULTANT';
export const CONSULTANT_DESTINATION = '/workspace/voice';
export const MAX_MOBILE_SESSION_MS = 30 * 24 * 60 * 60 * 1_000;

export type ConsultantMobileSession = {
  accessToken: string;
  authMode: 'development';
  role: typeof CONSULTANT_ROLE;
  destination: typeof CONSULTANT_DESTINATION;
  tokenExpiresAt: string;
};

export type SessionStorage = {
  getItemAsync: (key: string) => Promise<string | null>;
  setItemAsync: (key: string, value: string) => Promise<void>;
  deleteItemAsync: (key: string) => Promise<void>;
};

export type ConsultantAuthErrorCode =
  | 'unavailable'
  | 'invalid-input'
  | 'invalid-credentials'
  | 'wrong-role'
  | 'expired'
  | 'network'
  | 'server'
  | 'storage';

const ERROR_MESSAGES: Record<ConsultantAuthErrorCode, string> = {
  unavailable:
    'ورود آزمایشی فقط در حالت توسعه‌ی احراز هویت Petipy فعال است. ورود موبایلی زنده هنوز در دسترس نیست.',
  'invalid-input': 'شماره موبایل و کد توسعه‌ای ۶ رقمی را وارد کنید.',
  'invalid-credentials': 'ورود انجام نشد. شماره و کد توسعه‌ای را بررسی کنید.',
  'wrong-role':
    'این حساب دسترسی VOICE_CONSULTANT ندارد. ورود فقط برای حساب مشاور مجاز است.',
  expired: 'نشست Petipy منقضی یا نامعتبر است. دوباره وارد شوید.',
  network: 'ارتباط با سرویس ورود Petipy برقرار نشد. دوباره تلاش کنید.',
  server: 'سرویس ورود Petipy نتوانست درخواست را تکمیل کند.',
  storage: 'ذخیره‌سازی امن نشست روی این دستگاه در دسترس نیست.',
};

export class ConsultantAuthError extends Error {
  constructor(readonly code: ConsultantAuthErrorCode) {
    super(ERROR_MESSAGES[code]);
    this.name = 'ConsultantAuthError';
  }
}

export type SessionValidationFailure = 'expired' | 'wrong-role' | 'offline';

export function resolveSessionValidationFailure(
  error: unknown,
): SessionValidationFailure {
  if (
    error instanceof ConsultantAuthError &&
    (error.code === 'expired' || error.code === 'wrong-role')
  ) {
    return error.code;
  }
  if (error instanceof PetipyApiError) {
    if (error.status === 401) return 'expired';
    if (error.status === 403) return 'wrong-role';
  }
  return 'offline';
}

export function resolvePetipyMobileAuthMode(
  environmentMode: string | undefined,
  bundledMode: unknown,
) {
  if (environmentMode) return environmentMode;
  return typeof bundledMode === 'string' ? bundledMode : undefined;
}

export function isDevelopmentPhoneAuthEnabled(
  authMode = process.env.EXPO_PUBLIC_PETIPY_AUTH_MODE,
) {
  return authMode === 'development';
}

function asRecord(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export function normalizeMobileDigits(value: string) {
  return value.replace(/[۰-۹٠-٩]/g, (digit) => {
    const persianDigit = '۰۱۲۳۴۵۶۷۸۹'.indexOf(digit);
    const arabicDigit = '٠١٢٣٤٥٦٧٨٩'.indexOf(digit);
    return String(persianDigit >= 0 ? persianDigit : arabicDigit);
  });
}

export type StoredSessionResult =
  | { status: 'empty' }
  | { status: 'expired' }
  | { status: 'invalid' }
  | { status: 'ready'; session: ConsultantMobileSession };

export type SessionBootstrapAction =
  | 'verify-stored-session'
  | 'show-signed-out'
  | 'show-auth-unavailable'
  | 'show-expired'
  | 'show-invalid-session';

export function resolveSessionBootstrapAction(
  stored: StoredSessionResult,
  devAuthEnabled: boolean,
): SessionBootstrapAction {
  if (stored.status === 'ready') return 'verify-stored-session';
  if (stored.status === 'expired') return 'show-expired';
  if (stored.status === 'invalid') return 'show-invalid-session';
  return devAuthEnabled ? 'show-signed-out' : 'show-auth-unavailable';
}

export async function readStoredConsultantSession(
  storage: SessionStorage,
  now = Date.now(),
): Promise<StoredSessionResult> {
  const raw = await storage.getItemAsync(CONSULTANT_SESSION_KEY);
  if (!raw) return { status: 'empty' };

  let value: Record<string, unknown>;
  try {
    value = asRecord(JSON.parse(raw));
  } catch {
    await storage.deleteItemAsync(CONSULTANT_SESSION_KEY);
    return { status: 'invalid' };
  }

  const expiry =
    typeof value.tokenExpiresAt === 'string'
      ? Date.parse(value.tokenExpiresAt)
      : Number.NaN;
  const valid =
    typeof value.accessToken === 'string' &&
    value.accessToken.length > 0 &&
    value.authMode === 'development' &&
    value.role === CONSULTANT_ROLE &&
    value.destination === CONSULTANT_DESTINATION &&
    Number.isFinite(expiry);

  if (!valid) {
    await storage.deleteItemAsync(CONSULTANT_SESSION_KEY);
    return { status: 'invalid' };
  }
  if (expiry <= now) {
    await storage.deleteItemAsync(CONSULTANT_SESSION_KEY);
    return { status: 'expired' };
  }

  return {
    status: 'ready',
    session: {
      accessToken: value.accessToken as string,
      authMode: 'development',
      role: CONSULTANT_ROLE,
      destination: CONSULTANT_DESTINATION,
      tokenExpiresAt: new Date(expiry).toISOString(),
    },
  };
}

export async function clearStoredConsultantSession(storage: SessionStorage) {
  await storage.deleteItemAsync(CONSULTANT_SESSION_KEY);
}

export type DevSignInDependencies = {
  devAuthEnabled: boolean;
  storage: SessionStorage;
  verifyConsultant: (token: string) => Promise<ApiProfile>;
  fetcher?: typeof fetch;
  now?: () => number;
};

export async function signInDevelopmentConsultant(
  input: { phone: string; code: string },
  dependencies: DevSignInDependencies,
) {
  if (!dependencies.devAuthEnabled) {
    throw new ConsultantAuthError('unavailable');
  }

  const phone = normalizeMobileDigits(input.phone).trim();
  const code = normalizeMobileDigits(input.code).trim();
  if (!phone || !/^\d{6}$/.test(code)) {
    throw new ConsultantAuthError('invalid-input');
  }

  const fetcher = dependencies.fetcher ?? fetch;
  let response: Response;
  try {
    response = await fetcher(
      `${PETIPY_API_ORIGIN}/api/dev-auth/universal/sign-in`,
      {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phone, code, client: 'mobile' }),
      },
    );
  } catch {
    throw new ConsultantAuthError('network');
  }

  let payload: unknown = null;
  try {
    payload = await response.json();
  } catch {
    // A non-JSON response is handled as a generic auth failure below.
  }
  const result = asRecord(payload);

  if ([404, 405, 501, 503].includes(response.status)) {
    throw new ConsultantAuthError('unavailable');
  }
  if (response.status === 403) {
    throw new ConsultantAuthError('wrong-role');
  }
  if (response.status === 401) {
    throw new ConsultantAuthError('invalid-credentials');
  }
  if (!response.ok) {
    throw new ConsultantAuthError('server');
  }

  if (
    result.role !== undefined &&
    (result.role !== CONSULTANT_ROLE ||
      result.destination !== CONSULTANT_DESTINATION)
  ) {
    throw new ConsultantAuthError('wrong-role');
  }
  if (result.authenticated !== true) {
    throw new ConsultantAuthError('invalid-credentials');
  }
  if (
    result.role !== CONSULTANT_ROLE ||
    result.destination !== CONSULTANT_DESTINATION
  ) {
    throw new ConsultantAuthError('wrong-role');
  }
  if (typeof result.accessToken !== 'string' || !result.accessToken) {
    throw new ConsultantAuthError('server');
  }
  if (typeof result.tokenExpiresAt !== 'string') {
    throw new ConsultantAuthError('server');
  }

  const now = dependencies.now?.() ?? Date.now();
  const serverExpiry = Date.parse(result.tokenExpiresAt);
  if (!Number.isFinite(serverExpiry) || serverExpiry <= now) {
    throw new ConsultantAuthError('expired');
  }

  const effectiveExpiry = Math.min(
    serverExpiry,
    now + MAX_MOBILE_SESSION_MS,
  );
  const session: ConsultantMobileSession = {
    accessToken: result.accessToken,
    authMode: 'development',
    role: CONSULTANT_ROLE,
    destination: CONSULTANT_DESTINATION,
    tokenExpiresAt: new Date(effectiveExpiry).toISOString(),
  };

  let profile: ApiProfile;
  try {
    profile = await dependencies.verifyConsultant(session.accessToken);
  } catch (error) {
    if (error instanceof PetipyApiError && error.status === 401) {
      throw new ConsultantAuthError('expired');
    }
    if (error instanceof PetipyApiError && error.status === 403) {
      throw new ConsultantAuthError('wrong-role');
    }
    throw new ConsultantAuthError('server');
  }
  if (profile.active !== true) {
    throw new ConsultantAuthError('wrong-role');
  }

  try {
    await dependencies.storage.setItemAsync(
      CONSULTANT_SESSION_KEY,
      JSON.stringify(session),
    );
  } catch {
    throw new ConsultantAuthError('storage');
  }

  return { session, profile };
}
