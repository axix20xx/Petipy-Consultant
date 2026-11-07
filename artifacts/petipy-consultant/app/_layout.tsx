import React, { useEffect, useState } from 'react';
import { I18nManager, Platform } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
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
import { onIncomingCallNotificationOpen } from '@/lib/incoming-call-alerts';
import { getIncomingCalls } from '@/lib/petipy-api';
import { resolveIncomingPushRoute } from '@/lib/incoming-push-routing';
import { listenForForegroundIncomingPush } from '@/lib/push-notifications';
import { useConsultantSession } from '@/providers/consultant-session';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();
I18nManager.allowRTL(true);

const queryClient = new QueryClient();

function RootLayoutNav() {
  const router = useRouter();
  const { token, state } = useConsultantSession();
  const [pendingNotificationCallId, setPendingNotificationCallId] =
    useState<string | null>(null);

  useEffect(() => {
    return onIncomingCallNotificationOpen(setPendingNotificationCallId);
  }, []);

  useEffect(() => {
    if (!pendingNotificationCallId || state === 'loading') return;
    if (state !== 'connected' || !token) {
      setPendingNotificationCallId(null);
      return;
    }

    let active = true;
    void getIncomingCalls(token)
      .then((requests) => {
        const route = resolveIncomingPushRoute(requests, {
          callId: pendingNotificationCallId,
        });
        if (active && route) {
          router.replace(`/incoming-call/${encodeURIComponent(route.callId)}`);
        }
      })
      .catch(() => {
        // A notification is only a signal; the request API remains authoritative.
      })
      .finally(() => {
        if (active) setPendingNotificationCallId(null);
      });
    return () => {
      active = false;
    };
  }, [pendingNotificationCallId, router, state, token]);

  useEffect(() => {
    if (state !== 'connected' || !token) return;
    return listenForForegroundIncomingPush(token, (callId) =>
      router.replace(`/incoming-call/${encodeURIComponent(callId)}`),
    );
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
      SplashScreen.hideAsync();
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
