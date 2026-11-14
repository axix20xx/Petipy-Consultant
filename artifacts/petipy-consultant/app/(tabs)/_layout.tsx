import { useColors } from '@/hooks/useColors';
import { SessionLoadingScreen } from '@/components/ConsultantSignInScreen';
import { PetipyText as Text } from '@/components/PetipyText';
import { useConsultantSession } from '@/providers/consultant-session';
import { Ionicons } from '@expo/vector-icons';
import { Redirect, Tabs } from 'expo-router';
import { BlurView } from 'expo-blur';
import type { ComponentProps } from 'react';
import { Platform, Pressable, StyleSheet, View, useColorScheme } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type ConsultantTabBarProps = Parameters<
  NonNullable<ComponentProps<typeof Tabs>['tabBar']>
>[0];

function ConsultantTabBar({ state, descriptors, emitter, navigateToTab }: ConsultantTabBarProps) {
  const colors = useColors();
  const isDark = useColorScheme() === 'dark';
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.dockShell, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      {Platform.OS === 'ios' ? (
        <BlurView
          intensity={76}
          tint={isDark ? 'dark' : 'light'}
          style={StyleSheet.absoluteFill}
        />
      ) : null}
      <View
        style={[
          styles.dock,
          {
            backgroundColor: Platform.OS === 'ios' ? 'transparent' : colors.card,
            borderColor: colors.border,
          },
        ]}
      >
        {state.routes.map((route, index) => {
          const options = descriptors[route.key].options;
          const focused = state.index === index;
          const label =
            typeof options.tabBarLabel === 'string'
              ? options.tabBarLabel
              : options.title ?? route.name;
          const color = focused ? colors.primary : colors.mutedForeground;
          const icon = options.tabBarIcon?.({
            focused,
            color,
            size: 21,
          });

          return (
            <Pressable
              key={route.key}
              accessibilityRole="tab"
              accessibilityLabel={options.tabBarAccessibilityLabel ?? label}
              accessibilityState={{ selected: focused }}
              onPress={() => {
                const event = emitter.emit({
                  type: 'tabPress',
                  target: route.key,
                  canPreventDefault: true,
                });
                if (!focused && !event.defaultPrevented) {
                  navigateToTab(route.key);
                }
              }}
              onLongPress={() => {
                emitter.emit({ type: 'tabLongPress', target: route.key });
              }}
              style={styles.dockItem}
            >
              <View
                style={[
                  styles.dockItemContent,
                  focused && { backgroundColor: colors.secondary },
                ]}
              >
                {icon}
                <Text
                  style={[
                    styles.dockLabel,
                    { color },
                    focused && styles.dockLabelSelected,
                  ]}
                >
                  {label}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export default function TabLayout() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { state, activeCall, token } = useConsultantSession();
  const isWeb = Platform.OS === 'web';

  if (state === 'loading') return <SessionLoadingScreen />;
  if ((!token || (state !== 'connected' && state !== 'offline')) && !activeCall) {
    return <Redirect href="/sign-in" />;
  }

  return (
    <Tabs
      tabBar={(props) => <ConsultantTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          height: (isWeb ? 74 : 66) + insets.bottom,
          padding: 0,
          backgroundColor: 'transparent',
          borderTopWidth: 0,
          elevation: 0,
          shadowOpacity: 0,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'خانه',
          tabBarIcon: ({ size, focused }) => (
            <Ionicons name={focused ? 'grid' : 'grid-outline'} size={size} color={focused ? colors.primary : colors.mutedForeground} />
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'گزارش',
          tabBarIcon: ({ size, focused }) => (
            <Ionicons name={focused ? 'time' : 'time-outline'} size={size} color={focused ? colors.primary : colors.mutedForeground} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'تنظیمات',
          tabBarIcon: ({ size, focused }) => (
            <Ionicons name={focused ? 'settings' : 'settings-outline'} size={size} color={focused ? colors.primary : colors.mutedForeground} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  dockShell: {
    paddingHorizontal: 17,
    paddingTop: 7,
    overflow: 'hidden',
  },
  dock: {
    minHeight: 56,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 21,
    padding: 4,
    overflow: 'hidden',
  },
  dockItem: { flex: 1, minWidth: 0, minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  dockItemContent: {
    minHeight: 44,
    minWidth: 48,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingHorizontal: 11,
    borderRadius: 16,
  },
  dockLabel: { fontSize: 11, fontFamily: 'Vazirmatn_500Medium' },
  dockLabelSelected: { fontFamily: 'Vazirmatn_700Bold' },
});
