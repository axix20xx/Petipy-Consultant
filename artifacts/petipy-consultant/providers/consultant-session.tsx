import {
  clearStoredConsultantSession,
  ConsultantAuthError,
  isDevelopmentPhoneAuthEnabled,
  readStoredConsultantSession,
  resolvePetipyMobileAuthMode,
  signInDevelopmentConsultant,
  type ConsultantMobileSession,
} from '@/lib/consultant-auth';
import {
  getConsultantProfile,
  PetipyApiError,
  type ApiProfile,
  type CallSession,
} from '@/lib/petipy-api';
import {
  type PushSetupState,
} from '@/lib/push-notifications';
import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';
import { useQueryClient } from '@tanstack/react-query';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { AppState, Platform } from 'react-native';

type SessionState =
  | 'loading'
  | 'signed-out'
  | 'connected'
  | 'wrong-role'
  | 'expired'
  | 'auth-unavailable'
  | 'error';

type SessionContextValue = {
  token: string | null;
  tokenExpiresAt: string | null;
  profile: ApiProfile | null;
  activeCall: CallSession | null;
  state: SessionState;
  message: string | null;
  authBusy: boolean;
  devAuthAvailable: boolean;
  signIn: (phone: string, code: string) => Promise<boolean>;
  disconnect: () => Promise<{ pushRevoked: boolean }>;
  refresh: () => Promise<void>;
  setActiveCall: (call: CallSession | null) => void;
  pushSetupState: PushSetupState;
  pushSetupMessage: string | null;
  retryPushSetup: () => void;
};

const LIVE_AUTH_MESSAGE =
  'ورود موبایلی زنده هنوز به Petipy متصل نیست. ورود آزمایشی فقط با فعال‌بودن حالت توسعه‌ی احراز هویت شماره‌موبایل در دسترس است.';
const WEB_AUTH_MESSAGE =
  'ورود آزمایشی با کد فقط در برنامه‌ی بومی Expo روی Android در دسترس است؛ پیش‌نمایش وب نشست امن موبایل را پشتیبانی نمی‌کند.';

const SessionContext = createContext<SessionContextValue | null>(null);

async function stopAvailabilityServiceSafely() {
  try {
    const { stopAvailabilityService } = await import('@/lib/background-monitor');
    await stopAvailabilityService();
  } catch {
    // A native service cleanup failure must not prevent session recovery/logout.
  }
}

async function revokePushDeviceSafely(sessionToken: string) {
  try {
    const { revokePushDeviceForSession } = await import('@/lib/push-notifications');
    return await revokePushDeviceForSession(sessionToken);
  } catch {
    return false;
  }
}

function getSessionError(error: unknown) {
  if (error instanceof ConsultantAuthError) return error;
  if (error instanceof PetipyApiError && error.status === 401) {
    return new ConsultantAuthError('expired');
  }
  if (error instanceof PetipyApiError && error.status === 403) {
    return new ConsultantAuthError('wrong-role');
  }
  return null;
}

export function ConsultantSessionProvider({
  children,
}: {
  children: ReactNode;
}) {
  const queryClient = useQueryClient();
  const [token, setToken] = useState<string | null>(null);
  const [tokenExpiresAt, setTokenExpiresAt] = useState<string | null>(null);
  const [profile, setProfile] = useState<ApiProfile | null>(null);
  const [activeCall, setActiveCall] = useState<CallSession | null>(null);
  const [state, setState] = useState<SessionState>('loading');
  const [message, setMessage] = useState<string | null>(null);
  const [authBusy, setAuthBusy] = useState(false);
  const [devAuthUnavailable, setDevAuthUnavailable] = useState(false);
  const [pushSetupState, setPushSetupState] = useState<PushSetupState>(
    Platform.OS === 'android' ? 'idle' : 'unsupported',
  );
  const [pushSetupMessage, setPushSetupMessage] = useState<string | null>(null);
  const [pushSetupAttempt, setPushSetupAttempt] = useState(0);

  const configuredAuthMode = resolvePetipyMobileAuthMode(
    process.env.EXPO_PUBLIC_PETIPY_AUTH_MODE,
    Constants.expoConfig?.extra?.petipyAuthMode,
  );
  const devAuthAvailable =
    Platform.OS !== 'web' &&
    isDevelopmentPhoneAuthEnabled(configuredAuthMode) &&
    !devAuthUnavailable;

  const expireSession = useCallback(async () => {
    await Promise.allSettled([
      clearStoredConsultantSession(SecureStore),
      stopAvailabilityServiceSafely(),
    ]);
    setToken(null);
    setTokenExpiresAt(null);
    setProfile(null);
    setState('expired');
    setMessage(new ConsultantAuthError('expired').message);
    queryClient.clear();
  }, [queryClient]);

  const verifySession = useCallback(
    async (session: ConsultantMobileSession) => {
      if (Date.parse(session.tokenExpiresAt) <= Date.now()) {
        await expireSession();
        return false;
      }
      try {
        const nextProfile = await getConsultantProfile(session.accessToken);
        if (nextProfile.active !== true) {
          await clearStoredConsultantSession(SecureStore);
          queryClient.clear();
          setToken(null);
          setTokenExpiresAt(null);
          setProfile(null);
          setState('wrong-role');
          setMessage(new ConsultantAuthError('wrong-role').message);
          return false;
        }
        setProfile(nextProfile);
        setToken(session.accessToken);
        setTokenExpiresAt(session.tokenExpiresAt);
        setState('connected');
        setMessage(null);
        return true;
      } catch (error) {
        const authError = getSessionError(error);
        if (authError?.code === 'expired') {
          await expireSession();
        } else if (authError?.code === 'wrong-role') {
          await clearStoredConsultantSession(SecureStore);
          queryClient.clear();
          setToken(null);
          setTokenExpiresAt(null);
          setProfile(null);
          setState('wrong-role');
          setMessage(authError.message);
        } else {
          setState('error');
          setMessage(
            'بررسی نشست Petipy ممکن نشد. اتصال اینترنت را بررسی و دوباره تلاش کنید.',
          );
        }
        return false;
      }
    },
    [expireSession, queryClient],
  );

  const restoreSession = useCallback(async () => {
    if (Platform.OS === 'web') {
      setState('auth-unavailable');
      setMessage(WEB_AUTH_MESSAGE);
      return;
    }
    setState('loading');
    try {
      const stored = await readStoredConsultantSession(SecureStore);
      if (!devAuthAvailable) {
        if (stored.status === 'ready') {
          await clearStoredConsultantSession(SecureStore);
          queryClient.clear();
        }
        setState('auth-unavailable');
        setMessage(LIVE_AUTH_MESSAGE);
        return;
      }
      if (stored.status === 'empty') {
        setState('signed-out');
        setMessage(null);
        return;
      }
      if (stored.status === 'expired') {
        setState('expired');
        setMessage(new ConsultantAuthError('expired').message);
        return;
      }
      if (stored.status === 'invalid') {
        setState('signed-out');
        setMessage(
          'نشست ذخیره‌شده معتبر نبود و از این دستگاه پاک شد. دوباره وارد شوید.',
        );
        return;
      }
      await verifySession(stored.session);
    } catch {
      setState('error');
      setMessage('نشست امن روی این دستگاه در دسترس نیست.');
    }
  }, [devAuthAvailable, queryClient, verifySession]);

  useEffect(() => {
    void restoreSession();
  }, [restoreSession]);

  useEffect(() => {
    if (state !== 'connected' || !tokenExpiresAt) return;
    const delay = Date.parse(tokenExpiresAt) - Date.now();
    if (delay <= 0) {
      void expireSession();
      return;
    }
    const timeout = setTimeout(() => void expireSession(), delay);
    return () => clearTimeout(timeout);
  }, [expireSession, state, tokenExpiresAt]);

  useEffect(() => {
    if (Platform.OS !== 'android') {
      setPushSetupState('unsupported');
      setPushSetupMessage('اعلان FCM فقط در نسخه‌ی Android فعال است.');
      return;
    }
    if (state !== 'connected' || !token) {
      setPushSetupState('idle');
      setPushSetupMessage(null);
      return;
    }

    let mounted = true;
    let stop = () => {};
    void import('@/lib/push-notifications')
      .then(({ startPushRegistration }) => {
        if (!mounted) return;
        stop = startPushRegistration(token, (nextState, nextMessage) => {
          if (!mounted) return;
          setPushSetupState(nextState);
          setPushSetupMessage(nextMessage);
        });
      })
      .catch(() => {
        if (!mounted) return;
        setPushSetupState('error');
        setPushSetupMessage(
          'ثبت اعلان FCM در این دستگاه در دسترس نیست؛ درخواست‌های ورودی هنگام آنلاین‌بودن بررسی می‌شوند.',
        );
      });
    return () => {
      mounted = false;
      stop();
    };
  }, [pushSetupAttempt, state, token]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (
        nextState === 'active' &&
        state === 'connected' &&
        tokenExpiresAt &&
        Date.parse(tokenExpiresAt) <= Date.now()
      ) {
        void expireSession();
      }
    });
    return () => subscription.remove();
  }, [expireSession, state, tokenExpiresAt]);

  const signIn = useCallback(
    async (phone: string, code: string) => {
      if (!devAuthAvailable) {
        setState('auth-unavailable');
        setMessage(LIVE_AUTH_MESSAGE);
        return false;
      }
      setAuthBusy(true);
      setMessage(null);
      try {
        const result = await signInDevelopmentConsultant(
          { phone, code },
          {
            devAuthEnabled: devAuthAvailable,
            storage: SecureStore,
            verifyConsultant: getConsultantProfile,
          },
        );
        queryClient.clear();
        setProfile(result.profile);
        setToken(result.session.accessToken);
        setTokenExpiresAt(result.session.tokenExpiresAt);
        setState('connected');
        setMessage(null);
        return true;
      } catch (error) {
        const authError =
          getSessionError(error) ?? new ConsultantAuthError('network');
        if (authError.code === 'unavailable') {
          setDevAuthUnavailable(true);
          setState('auth-unavailable');
        } else if (authError.code === 'wrong-role') {
          setState('wrong-role');
        } else if (authError.code === 'expired') {
          setState('expired');
        } else {
          setState('error');
        }
        setMessage(authError.message);
        return false;
      } finally {
        setAuthBusy(false);
      }
    },
    [devAuthAvailable, queryClient],
  );

  const disconnect = useCallback(async () => {
    const pushRevoked = token
      ? await revokePushDeviceSafely(token)
      : true;
    try {
      await stopAvailabilityServiceSafely();
      await clearStoredConsultantSession(SecureStore);
    } catch {
      setState('error');
      setMessage('نشست امن پاک نشد؛ خروج کامل نشد. دوباره تلاش کنید.');
      throw new Error('Secure Petipy session could not be cleared.');
    }
    setToken(null);
    setTokenExpiresAt(null);
    setProfile(null);
    setActiveCall(null);
    setMessage(null);
    setState('signed-out');
    queryClient.clear();
    return { pushRevoked };
  }, [queryClient, token]);

  const retryPushSetup = useCallback(() => {
    setPushSetupAttempt((attempt) => attempt + 1);
  }, []);

  const value = useMemo(
    () => ({
      token,
      tokenExpiresAt,
      profile,
      activeCall,
      state,
      message,
      authBusy,
      devAuthAvailable,
      signIn,
      disconnect,
      refresh: restoreSession,
      setActiveCall,
      pushSetupState,
      pushSetupMessage,
      retryPushSetup,
    }),
    [
      token,
      tokenExpiresAt,
      profile,
      activeCall,
      state,
      message,
      authBusy,
      devAuthAvailable,
      signIn,
      disconnect,
      restoreSession,
      pushSetupState,
      pushSetupMessage,
      retryPushSetup,
    ],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useConsultantSession() {
  const value = useContext(SessionContext);
  if (!value) {
    throw new Error(
      'useConsultantSession must be used within ConsultantSessionProvider',
    );
  }
  return value;
}
