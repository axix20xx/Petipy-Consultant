const { withAndroidManifest, withDangerousMod } = require('expo/config-plugins');
const fs = require('node:fs');
const path = require('node:path');

const SERVICE_NAME =
  'com.asterinet.react.bgactions.RNBackgroundActionsTask';

function withPetipyNativeCallModule(config) {
  return withDangerousMod(config, [
    'android',
    async (mod) => {
      const projectRoot = mod.modRequest.projectRoot;
      const javaDirectory = path.join(
        projectRoot,
        'android/app/src/main/java/com/petipy/consultant',
      );
      fs.mkdirSync(javaDirectory, { recursive: true });
      fs.copyFileSync(
        path.join(__dirname, 'native/PetipyFullScreenAccessModule.kt'),
        path.join(javaDirectory, 'PetipyFullScreenAccessModule.kt'),
      );
      fs.copyFileSync(
        path.join(__dirname, 'native/PetipyTelecomConnectionService.kt'),
        path.join(javaDirectory, 'PetipyTelecomConnectionService.kt'),
      );

      const applicationPath = path.join(javaDirectory, 'MainApplication.kt');
      let application = fs.readFileSync(applicationPath, 'utf8');
      const packageRegistration = 'add(PetipyFullScreenAccessPackage())';
      if (!application.includes(packageRegistration)) {
        const packageList = 'PackageList(this).packages.apply {';
        if (!application.includes(packageList)) {
          throw new Error('Could not register the Petipy native call module.');
        }
        application = application.replace(
          packageList,
          `${packageList}\n          ${packageRegistration}`,
        );
        fs.writeFileSync(applicationPath, application);
      }

      const activityPath = path.join(javaDirectory, 'MainActivity.kt');
      let activity = fs.readFileSync(activityPath, 'utf8');
      if (!activity.includes('override fun onNewIntent(')) {
        const anchor = '  override fun invokeDefaultOnBackPressed() {';
        if (!activity.includes(anchor)) {
          throw new Error('Could not add Petipy call notification deep-link support.');
        }
        activity = activity.replace(
          anchor,
          [
            '  override fun onNewIntent(intent: android.content.Intent) {',
            '    super.onNewIntent(intent)',
            '    setIntent(intent)',
            '  }',
            '',
            anchor,
          ].join('\n'),
        );
        fs.writeFileSync(activityPath, activity);
      }
      return mod;
    },
  ]);
}

module.exports = function withPetipyForegroundService(config) {
  const withManifest = withAndroidManifest(config, (mod) => {
    const manifest = mod.modResults.manifest;
    const app = manifest.application?.[0];
    if (!app) {
      throw new Error('Petipy Android application manifest is missing.');
    }
    app.$ ??= {};
    app.$['android:supportsRtl'] = 'true';

    const permissions = new Set(
      (manifest['uses-permission'] ?? []).map(
        (permission) => permission.$?.['android:name'],
      ),
    );
    for (const permission of [
      'android.permission.FOREGROUND_SERVICE',
      'android.permission.FOREGROUND_SERVICE_MICROPHONE',
      'android.permission.USE_FULL_SCREEN_INTENT',
      'android.permission.MANAGE_OWN_CALLS',
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

    const telecomServiceName =
      'com.petipy.consultant.PetipyTelecomConnectionService';
    const telecomService = app.service.find(
      (entry) => entry.$?.['android:name'] === telecomServiceName,
    );
    if (telecomService) {
      telecomService.$['android:permission'] =
        'android.permission.BIND_TELECOM_CONNECTION_SERVICE';
      telecomService.$['android:exported'] = 'true';
      telecomService['intent-filter'] ??= [];
      if (
        !telecomService['intent-filter'].some((filter) =>
          filter.action?.some(
            (action) =>
              action.$?.['android:name'] ===
              'android.telecom.ConnectionService',
          ),
        )
      ) {
        telecomService['intent-filter'].push({
          action: [{ $: { 'android:name': 'android.telecom.ConnectionService' } }],
        });
      }
    } else {
      app.service.push({
        $: {
          'android:name': telecomServiceName,
          'android:permission': 'android.permission.BIND_TELECOM_CONNECTION_SERVICE',
          'android:exported': 'true',
        },
        'intent-filter': [
          {
            action: [{ $: { 'android:name': 'android.telecom.ConnectionService' } }],
          },
        ],
      });
    }

    const mainActivity = (app.activity ?? []).find((entry) =>
      entry.$?.['android:name']?.endsWith('.MainActivity'),
    );
    if (!mainActivity) {
      throw new Error('Petipy Android main activity is missing.');
    }
    mainActivity.$['android:showWhenLocked'] = 'true';
    mainActivity.$['android:turnScreenOn'] = 'true';

    return mod;
  });
  return withPetipyNativeCallModule(withManifest);
};
