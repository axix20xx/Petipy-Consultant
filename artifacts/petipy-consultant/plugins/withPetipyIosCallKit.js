const {
  withEntitlementsPlist,
  withInfoPlist,
} = require('expo/config-plugins');

function withPetipyIosCallKit(config) {
  const voipEnabled = process.env.EXPO_PUBLIC_IOS_VOIP_ENABLED === 'true';
  const environment = process.env.EXPO_PUBLIC_APNS_ENVIRONMENT;
  if (voipEnabled && environment !== 'sandbox' && environment !== 'production') {
    throw new Error(
      'Set EXPO_PUBLIC_APNS_ENVIRONMENT to sandbox or production before enabling iOS VoIP.',
    );
  }

  config = withInfoPlist(config, (mod) => {
    const modes = Array.isArray(mod.modResults.UIBackgroundModes)
      ? mod.modResults.UIBackgroundModes
      : [];
    const nextModes = modes.filter((mode) => mode !== 'voip');
    if (!nextModes.includes('audio')) nextModes.push('audio');
    if (voipEnabled) nextModes.push('voip');
    mod.modResults.UIBackgroundModes = [...new Set(nextModes)];
    // CallKit is used for calls reported while the app is active. Do not add
    // PushKit background mode or APNs entitlements unless VoIP is explicitly
    // enabled by a separately provisioned build.
    mod.modResults.ExpoCallKitTelecomIncomingCallTimeout = 90;
    mod.modResults.ExpoCallKitTelecomFulfillAnswerCallTimeout = 30;
    mod.modResults.ExpoCallKitTelecomSupportsVideo = false;
    mod.modResults.ExpoCallKitTelecomIncludesCallsInRecents = false;
    mod.modResults.ExpoCallKitTelecomDefaultRingtone = 'default';
    return mod;
  });

  return withEntitlementsPlist(config, (mod) => {
    if (voipEnabled && environment) {
      mod.modResults['aps-environment'] = environment === 'sandbox'
        ? 'development'
        : 'production';
    } else {
      delete mod.modResults['aps-environment'];
    }
    return mod;
  });
}

module.exports = withPetipyIosCallKit;
