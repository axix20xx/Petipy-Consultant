export function isIosNativeVoipEnabled(
  value = process.env.EXPO_PUBLIC_IOS_VOIP_ENABLED,
) {
  return value === 'true';
}
