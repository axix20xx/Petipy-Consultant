const { withAndroidManifest } = require('@expo/config-plugins');

const SERVICE_NAME =
  'com.asterinet.react.bgactions.RNBackgroundActionsTask';

module.exports = function withPetipyForegroundService(config) {
  return withAndroidManifest(config, (mod) => {
    const manifest = mod.modResults.manifest;
    const app = manifest.application?.[0];
    if (!app) {
      throw new Error('Petipy Android application manifest is missing.');
    }

    const permissions = new Set(
      (manifest['uses-permission'] ?? []).map(
        (permission) => permission.$?.['android:name'],
      ),
    );
    for (const permission of [
      'android.permission.FOREGROUND_SERVICE',
      'android.permission.FOREGROUND_SERVICE_MICROPHONE',
      'android.permission.POST_NOTIFICATIONS',
      'android.permission.RECORD_AUDIO',
      'android.permission.WAKE_LOCK',
    ]) {
      if (!permissions.has(permission)) {
        manifest['uses-permission'] ??= [];
        manifest['uses-permission'].push({ $: { 'android:name': permission } });
      }
    }

    app.service ??= [];
    const service = app.service.find(
      (entry) => entry.$?.['android:name'] === SERVICE_NAME,
    );
    if (service) {
      service.$['android:foregroundServiceType'] =
        'microphone';
      service.$['android:exported'] = 'false';
    } else {
      app.service.push({
        $: {
          'android:name': SERVICE_NAME,
          'android:exported': 'false',
          'android:foregroundServiceType': 'microphone',
        },
      });
    }

    return mod;
  });
};
