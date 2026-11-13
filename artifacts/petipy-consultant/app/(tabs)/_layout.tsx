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
          tabBarLabelStyle: { fontSize: 10, fontWeight: '800', marginTop: 3 },
          tabBarItemStyle: { paddingTop: 4, minHeight: 56 },
        tabBarStyle: {
          height: isWeb ? 82 : 68 + insets.bottom,
          paddingTop: 7,
          paddingBottom: isWeb ? 34 : insets.bottom,
          backgroundColor: colors.card,
          borderTopColor: colors.border,
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopLeftRadius: 28,
          borderTopRightRadius: 28,
          elevation: 5,
          shadowColor: colors.foreground,
          shadowOpacity: 0.06,
          shadowRadius: 14,
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
