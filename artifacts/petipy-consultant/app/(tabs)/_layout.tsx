import { useColors } from '@/hooks/useColors';
import { SessionLoadingScreen } from '@/components/ConsultantSignInScreen';
import { useConsultantSession } from '@/providers/consultant-session';
import { Ionicons } from '@expo/vector-icons';
import { Redirect, Tabs } from 'expo-router';
import { Platform, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function TabLayout() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
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
        tabBarLabelStyle: { fontSize: 10, fontWeight: '800', marginTop: 2 },
        tabBarItemStyle: { paddingTop: 3, minHeight: 54 },
        tabBarStyle: {
          height: isWeb ? 80 : 64 + insets.bottom,
          paddingTop: 6,
          paddingBottom: isWeb ? 34 : insets.bottom,
          backgroundColor: colors.card,
          borderTopColor: colors.accent,
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopLeftRadius: 25,
          borderTopRightRadius: 25,
          elevation: 8,
          shadowColor: colors.foreground,
          shadowOpacity: 0.08,
          shadowRadius: 16,
          shadowOffset: { width: 0, height: -4 },
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'خانه',
          tabBarIcon: ({ size, focused }) => (
            <View style={[styles.iconWell, { backgroundColor: focused ? colors.secondary : colors.card }]}>
              <Ionicons name={focused ? 'grid' : 'grid-outline'} size={size} color={focused ? colors.primary : colors.mutedForeground} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'گزارش',
          tabBarIcon: ({ size, focused }) => (
            <View style={[styles.iconWell, { backgroundColor: focused ? colors.secondary : colors.card }]}>
              <Ionicons name={focused ? 'time' : 'time-outline'} size={size} color={focused ? colors.primary : colors.mutedForeground} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'تنظیمات',
          tabBarIcon: ({ size, focused }) => (
            <View style={[styles.iconWell, { backgroundColor: focused ? colors.secondary : colors.card }]}>
              <Ionicons name={focused ? 'settings' : 'settings-outline'} size={size} color={focused ? colors.primary : colors.mutedForeground} />
            </View>
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  iconWell: { width: 42, height: 30, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
});
