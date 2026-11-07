import { NativeModules, Platform } from 'react-native';

type PetipyFullScreenAccessNativeModule = {
  canUseFullScreenIntent: () => Promise<boolean>;
  openFullScreenIntentSettings: () => Promise<boolean>;
};

const fullScreenAccessModule = NativeModules
  .PetipyFullScreenAccess as PetipyFullScreenAccessNativeModule | undefined;

export async function canUseFullScreenIntent(): Promise<boolean | null> {
  if (Platform.OS !== 'android' || !fullScreenAccessModule) return null;
  try {
    return await fullScreenAccessModule.canUseFullScreenIntent();
  } catch {
    return null;
  }
}

export async function openFullScreenIntentSettings(): Promise<boolean> {
  if (Platform.OS !== 'android' || !fullScreenAccessModule) return false;
  return fullScreenAccessModule.openFullScreenIntentSettings();
}
