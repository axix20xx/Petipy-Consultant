const {
  withEntitlementsPlist,
  withInfoPlist,
} = require('expo/config-plugins');

function withPetipyIosCallKit(config) {
  config = withInfoPlist(config, (mod) => {
    const modes = Array.isArray(mod.modResults.UIBackgroundModes)
      ? mod.modResults.UIBackgroundModes
      : [];
    mod.modResults.UIBackgroundModes = [...new Set([...modes, 'audio', 'voip'])];
    mod.modResults.ExpoCallKitTelecomIncomingCallTimeout = 90;
    mod.modResults.ExpoCallKitTelecomSupportsVideo = false;
    mod.modResults.ExpoCallKitTelecomIncludesCallsInRecents = false;
    mod.modResults.ExpoCallKitTelecomDefaultRingtone = 'default';
    return mod;
  });

  return withEntitlementsPlist(config, (mod) => {
    const environment = process.env.EXPO_PUBLIC_APNS_ENVIRONMENT;
    if (environment === 'sandbox' || environment === 'production') {
      mod.modResults['aps-environment'] = environment === 'sandbox'
        ? 'development'
        : 'production';
    } else {
      // A development entitlement is only a safe default. The app refuses to
      // register a release token until EXPO_PUBLIC_APNS_ENVIRONMENT is explicit.
      mod.modResults['aps-environment'] ??= 'development';
    }
    return mod;
  });
}

module.exports = withPetipyIosCallKit;
