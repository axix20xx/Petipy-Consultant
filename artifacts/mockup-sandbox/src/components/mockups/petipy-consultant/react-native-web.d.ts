declare module 'react-native-web' {
  import type { ComponentType } from 'react';

  export const ActivityIndicator: ComponentType<any>;
  export const Pressable: ComponentType<any>;
  export const RefreshControl: ComponentType<any>;
  export const SafeAreaView: ComponentType<any>;
  export const ScrollView: ComponentType<any>;
  export const Switch: ComponentType<any>;
  export const Text: ComponentType<any>;
  export const TextInput: ComponentType<any>;
  export const View: ComponentType<any>;
  export const StyleSheet: {
    create<T extends Record<string, any>>(styles: T): T;
    hairlineWidth: number;
  };
  export function useColorScheme(): 'light' | 'dark' | null;
}
