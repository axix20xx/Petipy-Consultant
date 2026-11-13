import React, { useEffect, useState } from 'react';
import { AppState, I18nManager, Platform } from 'react-native';
import { focusManager, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import {
  ConsultantSessionProvider,
} from '@/providers/consultant-session';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from '@expo-google-fonts/inter';
import { Stack, useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { getIncomingCalls } from '@/lib/petipy-api';
import { resolveIncomingPushRoute } from '@/lib/incoming-push-routing';
import { useConsultantSession } from '@/providers/consultant-session';

// Prevent the splash screen from auto-hiding before asset loading is complete.
void SplashScreen.preventAutoHideAsync().catch((error) => {
  if (__DEV__) console.warn('Could not hold the splash screen open.', error);
});
I18nManager.allowRTL(true);

const queryClient = new QueryClient();

function RootLayoutNav() {
  const router = useRouter();
  const { token, state } = useConsultantSession();
  const [pendingNotificationCall, setPendingNotificationCall] = useState<{
    callId: string;
    action: 'answer' | 'reject' | 'open';
  } | null>(null);

  useEffect(() => {
    focusManager.setFocused(AppState.currentState === 'active');
    const subscription = AppState.addEventListener('change', (state) => {
      focusManager.setFocused(state === 'active');
    });
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    let active = true;
    let unsubscribe = () => {};
    void import('@/lib/incoming-call-alerts')
      .then(({ onIncomingCallNotificationOpen }) => {
        if (!active) return;
        unsubscribe = onIncomingCallNotificationOpen((callId, action) =>
          setPendingNotificationCall({ callId, action }),
        );
      })
      .catch(() => {
        // Notification routing is optional at launch; the signed-in app remains usable.
      });
    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!pendingNotificationCall || state === 'loading') return;
    if (state !== 'connected' || !token) {
      setPendingNotificationCall(null);
      return;
    }

    let active = true;
    void getIncomingCalls(token)
      .then((requests) => {
        const route = resolveIncomingPushRoute(requests, {
          callId: pendingNotificationCall.callId,
        });
        if (active && route) {
          router.replace({
            pathname: '/incoming-call/[id]',
            params: {
              id: route.callId,
              action: pendingNotificationCall.action,
            },
          });
        }
      })
      .catch(() => {
        // A notification is only a signal; the request API remains authoritative.
      })
      .finally(() => {
        if (active) setPendingNotificationCall(null);
      });
    return () => {
      active = false;
    };
  }, [pendingNotificationCall, router, state, token]);

  useEffect(() => {
    if (state !== 'connected' || !token) return;
    let active = true;
    let unsubscribe = () => {};
    void import('@/lib/push-notifications')
      .then(({ listenForForegroundIncomingPush }) => {
        if (!active) return;
        unsubscribe = listenForForegroundIncomingPush(token, (callId) =>
          router.replace(`/incoming-call/${encodeURIComponent(callId)}`),
        );
      })
      .catch(() => {
        // Foreground request polling remains available if FCM cannot initialize.
      });
    return () => {
      active = false;
      unsubscribe();
    };
  }, [router, state, token]);

  return (
    <Stack screenOptions={{ headerShown: false, headerBackTitle: 'بازگشت' }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="sign-in" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen
        name="incoming-call/[id]"
        options={{ presentation: 'fullScreenModal', gestureEnabled: false }}
      />
      <Stack.Screen
        name="call/[id]"
        options={{ presentation: 'fullScreenModal', gestureEnabled: false }}
      />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      void SplashScreen.hideAsync().catch((error) => {
        if (__DEV__) console.warn('Could not hide the splash screen.', error);
      });
    }
  }, [fontsLoaded, fontError]);

  if (Platform.OS !== 'web' && !fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <GestureHandlerRootView style={{ flex: 1 }}>
            <KeyboardProvider>
              <ConsultantSessionProvider>
                <RootLayoutNav />
              </ConsultantSessionProvider>
            </KeyboardProvider>
          </GestureHandlerRootView>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
