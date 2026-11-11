import { useColors } from '@/hooks/useColors';
import { SessionLoadingScreen } from '@/components/ConsultantSignInScreen';
import { useConsultantSession } from '@/providers/consultant-session';
import { Ionicons } from '@expo/vector-icons';
import { Redirect, Tabs } from 'expo-router';
import { Platform, StyleSheet } from 'react-native';

export default function TabLayout() {
  const colors = useColors();
  const { state, activeCall } = useConsultantSession();
  const isWeb = Platform.OS === 'web';

  if (state === 'loading') return <SessionLoadingScreen />;
  if (state !== 'connected' && !activeCall) {
    return <Redirect href="/sign-in" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedForeground,
        tabBarLabelStyle: { fontSize: 10, fontWeight: '700', marginTop: 3 },
        tabBarItemStyle: { paddingTop: 2 },
        tabBarStyle: {
          height: isWeb ? 84 : 76,
          paddingTop: 8,
          paddingBottom: isWeb ? 34 : 10,
          backgroundColor: colors.card,
          borderTopColor: colors.border,
          borderTopWidth: isWeb ? StyleSheet.hairlineWidth : 0,
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          elevation: 8,
          shadowColor: '#55232F',
          shadowOpacity: 0.09,
          shadowRadius: 16,
          shadowOffset: { width: 0, height: -5 },
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'خانه',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? 'grid' : 'grid-outline'}
              size={size}
              color={focused ? colors.primary : colors.mutedForeground}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'گزارش',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? 'time' : 'time-outline'}
              size={size}
              color={focused ? colors.primary : colors.mutedForeground}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'تنظیمات',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? 'settings' : 'settings-outline'}
              size={size}
              color={focused ? colors.primary : colors.mutedForeground}
            />
          ),
        }}
      />
    </Tabs>
  );
}
