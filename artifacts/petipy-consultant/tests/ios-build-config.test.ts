import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import {
  isDevelopmentPhoneAuthEnabled,
  resolvePetipyMobileAuthMode,
} from '../lib/consultant-auth';

const expoConfig = JSON.parse(readFileSync('app.json', 'utf8')).expo;
const buildConfig = JSON.parse(readFileSync('eas.json', 'utf8')).build;
const iosWorkflow = readFileSync(
  '../../.github/workflows/build-ios-unsigned.yml',
  'utf8',
);

test('keeps the consultant app identity and production auth fail-closed', () => {
  assert.equal(expoConfig.ios.bundleIdentifier, 'com.petipy.consultant');
  assert.equal(expoConfig.scheme, 'petipy-consultant');
  assert.equal(expoConfig.extra.petipyAuthMode, 'live');
  assert.equal(
    isDevelopmentPhoneAuthEnabled(expoConfig.extra.petipyAuthMode),
    false,
  );
});

test('development profile is the only profile using development OTP', () => {
  assert.equal(buildConfig.development.distribution, 'internal');
  assert.equal(
    buildConfig.development.env.EXPO_PUBLIC_PETIPY_AUTH_MODE,
    'development',
  );
  assert.equal(
    buildConfig.development.env.EXPO_PUBLIC_IOS_VOIP_ENABLED,
    'false',
  );

  for (const profileName of ['preview', 'production']) {
    assert.equal(
      buildConfig[profileName].env.EXPO_PUBLIC_PETIPY_AUTH_MODE,
      'live',
    );
    assert.equal(
      buildConfig[profileName].env.EXPO_PUBLIC_IOS_VOIP_ENABLED,
      'false',
    );
  }
});

test('simulator profile is distinct from a device IPA profile', () => {
  assert.equal(buildConfig['ios-simulator'].ios.simulator, true);
  assert.equal(
    buildConfig['ios-simulator'].env.EXPO_PUBLIC_PETIPY_AUTH_MODE,
    'development',
  );
  assert.equal(
    buildConfig['ios-simulator'].env.EXPO_PUBLIC_IOS_VOIP_ENABLED,
    'false',
  );
});

test('unsigned iOS GitHub build enables development OTP only while bundling', () => {
  assert.equal(expoConfig.extra.petipyAuthMode, 'live');
  assert.match(
    iosWorkflow,
    /- name: Build iOS application[\s\S]*?env:\s*(?:#[^\n]*\n\s*)*EXPO_PUBLIC_PETIPY_AUTH_MODE: development/,
  );
  assert.equal(
    resolvePetipyMobileAuthMode('development', expoConfig.extra.petipyAuthMode),
    'development',
  );
  assert.equal(
    resolvePetipyMobileAuthMode(undefined, expoConfig.extra.petipyAuthMode),
    'live',
  );
});
