import {
  getConsultantProfile,
  type ApiProfile,
  type CallSession,
  PetipyApiError,
} from '@/lib/petipy-api';
import * as SecureStore from 'expo-secure-store';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { Platform } from 'react-native';

const SESSION_KEY = 'petipy.voice-consultant.session';

type SessionState =
  | 'loading'
  | 'signed-out'
  | 'connected'
  | 'wrong-role'
  | 'error';

type SessionContextValue = {
  token: string | null;
  profile: ApiProfile | null;
  activeCall: CallSession | null;
  state: SessionState;
  message: string | null;
  disconnect: () => Promise<void>;
  refresh: () => Promise<void>;
  setActiveCall: (call: CallSession | null) => void;
};

const SessionContext = createContext<SessionContextValue | null>(null);

function publicError(error: unknown) {
  if (error instanceof PetipyApiError) return error.message;
  return 'اتصال به Petipy برقرار نشد. اتصال اینترنت و نشست حساب را بررسی کنید.';
}

export function ConsultantSessionProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [token, setToken] = useState<string | null>(null);
  const [profile, setProfile] = useState<ApiProfile | null>(null);
  const [activeCall, setActiveCall] = useState<CallSession | null>(null);
  const [state, setState] = useState<SessionState>('loading');
  const [message, setMessage] = useState<string | null>(null);

  const verify = useCallback(async (candidate: string) => {
    setMessage(null);
    try {
      const nextProfile = await getConsultantProfile(candidate);
      if (nextProfile.active !== true) {
        setProfile(nextProfile);
        setState('wrong-role');
        setMessage('حساب مشاور صوتی Petipy فعال نیست.');
        return false;
      }
      setProfile(nextProfile);
      setToken(candidate);
      setState('connected');
      return true;
    } catch (error) {
      setProfile(null);
      setState('error');
      setMessage(publicError(error));
      return false;
    }
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      if (Platform.OS === 'web') {
        if (active) {
          setState('signed-out');
          setMessage('ورود رسمی Petipy هنوز به این برنامه متصل نشده است.');
        }
        return;
      }
      try {
        const savedToken = await SecureStore.getItemAsync(SESSION_KEY);
        if (!active) return;
        if (!savedToken) {
          setState('signed-out');
          return;
        }
        await verify(savedToken);
      } catch {
        if (active) {
          setState('error');
          setMessage('نشست امن روی این دستگاه در دسترس نیست.');
        }
      }
    })();
    return () => {
      active = false;
    };
  }, [verify]);

  const disconnect = useCallback(async () => {
    if (Platform.OS !== 'web') await SecureStore.deleteItemAsync(SESSION_KEY);
    setToken(null);
    setProfile(null);
    setActiveCall(null);
    setMessage(null);
    setState('signed-out');
  }, []);

  const refresh = useCallback(async () => {
    if (!token) {
      setState('signed-out');
      return;
    }
    await verify(token);
  }, [token, verify]);

  const value = useMemo(
    () => ({
      token,
      profile,
      activeCall,
      state,
      message,
      disconnect,
      refresh,
      setActiveCall,
    }),
    [token, profile, activeCall, state, message, disconnect, refresh],
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
