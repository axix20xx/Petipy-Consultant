import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  clearStoredConsultantSession,
  CONSULTANT_DESTINATION,
  CONSULTANT_ROLE,
  CONSULTANT_SESSION_KEY,
  MAX_MOBILE_SESSION_MS,
  readStoredConsultantSession,
  resolvePetipyMobileAuthMode,
  signInDevelopmentConsultant,
  isDevelopmentPhoneAuthEnabled,
  type SessionStorage,
} from '../lib/consultant-auth';

function makeStorage(initial?: string) {
  const values = new Map<string, string>();
  if (initial) values.set(CONSULTANT_SESSION_KEY, initial);
  const storage: SessionStorage = {
    getItemAsync: async (key) => values.get(key) ?? null,
    setItemAsync: async (key, value) => {
      values.set(key, value);
    },
    deleteItemAsync: async (key) => {
      values.delete(key);
    },
  };
  return { storage, values };
}

function signInResponse(overrides: Record<string, unknown> = {}) {
  return {
    authenticated: true,
    role: CONSULTANT_ROLE,
    destination: CONSULTANT_DESTINATION,
    accessToken: 'unit-test-only-token',
    tokenExpiresAt: '2026-12-07T12:00:00.000Z',
    ...overrides,
  };
}

const fixedNow = Date.parse('2026-11-07T12:00:00.000Z');

test('enables the demo login only for an explicit development auth mode', () => {
  assert.equal(isDevelopmentPhoneAuthEnabled('development'), true);
  assert.equal(isDevelopmentPhoneAuthEnabled('live'), false);
  assert.equal(isDevelopmentPhoneAuthEnabled(undefined), false);
});

test('uses the bundled Expo mode when a release build has no environment value', () => {
  assert.equal(resolvePetipyMobileAuthMode(undefined, 'development'), 'development');
  assert.equal(resolvePetipyMobileAuthMode(undefined, 'live'), 'live');
});

test('lets an explicit environment mode override the bundled mode', () => {
  assert.equal(
    resolvePetipyMobileAuthMode('live', 'development'),
    'live',
  );
});

test('accepts only the consultant mobile response and stores after API verification', async () => {
  const { storage, values } = makeStorage();
  let requestedUrl = '';
  let requestedBody: unknown;

  const result = await signInDevelopmentConsultant(
    { phone: ' ۰۹۱۲۰۰۰۰۰۰۰ ', code: '۱۲۳۴۵۶' },
    {
      devAuthEnabled: true,
      storage,
      now: () => fixedNow,
      fetcher: async (input, init) => {
        requestedUrl = String(input);
        requestedBody = JSON.parse(String(init?.body));
        return new Response(JSON.stringify(signInResponse()), { status: 200 });
      },
      verifyConsultant: async (token) => {
        assert.equal(token, 'unit-test-only-token');
        return { active: true, displayName: 'Test consultant' };
      },
    },
  );

  assert.equal(
    requestedUrl,
    'https://petipy.com/api/dev-auth/universal/sign-in',
  );
  assert.deepEqual(requestedBody, {
    phone: '09120000000',
    code: '123456',
    client: 'mobile',
  });
  assert.equal(result.profile.active, true);
  assert.equal(
    Date.parse(result.session.tokenExpiresAt) - fixedNow,
    MAX_MOBILE_SESSION_MS,
  );
  const stored = JSON.parse(values.get(CONSULTANT_SESSION_KEY) ?? '{}');
  assert.equal(stored.role, CONSULTANT_ROLE);
  assert.equal(stored.destination, CONSULTANT_DESTINATION);
  assert.equal(stored.authMode, 'development');
  assert.equal(stored.accessToken, 'unit-test-only-token');
});

test('rejects other identity roles without persisting a token', async () => {
  const { storage, values } = makeStorage();
  await assert.rejects(
    signInDevelopmentConsultant(
      { phone: '09120000000', code: '123456' },
      {
        devAuthEnabled: true,
        storage,
        now: () => fixedNow,
        fetcher: async () =>
          new Response(
            JSON.stringify(
              signInResponse({
                role: 'CUSTOMER',
                destination: '/workspace/customer',
              }),
            ),
            { status: 200 },
          ),
        verifyConsultant: async () => {
          throw new Error('Must not verify a non-consultant token');
        },
      },
    ),
    { code: 'wrong-role' },
  );
  assert.equal(values.has(CONSULTANT_SESSION_KEY), false);
});

test('rejects an expired token before verification or persistence', async () => {
  const { storage, values } = makeStorage();
  await assert.rejects(
    signInDevelopmentConsultant(
      { phone: '09120000000', code: '123456' },
      {
        devAuthEnabled: true,
        storage,
        now: () => fixedNow,
        fetcher: async () =>
          new Response(
            JSON.stringify(
              signInResponse({ tokenExpiresAt: '2026-11-07T11:59:59.000Z' }),
            ),
            { status: 200 },
          ),
        verifyConsultant: async () => {
          throw new Error('Must not verify an expired token');
        },
      },
    ),
    { code: 'expired' },
  );
  assert.equal(values.has(CONSULTANT_SESSION_KEY), false);
});

test('restores a valid remembered session from secure storage after app relaunch', async () => {
  const { storage, values } = makeStorage(
    JSON.stringify({
      accessToken: 'unit-test-only-token',
      authMode: 'development',
      role: CONSULTANT_ROLE,
      destination: CONSULTANT_DESTINATION,
      tokenExpiresAt: '2026-11-07T14:00:00.000Z',
    }),
  );

  const result = await readStoredConsultantSession(storage, fixedNow);

  assert.equal(result.status, 'ready');
  if (result.status === 'ready') {
    assert.equal(result.session.accessToken, 'unit-test-only-token');
  }
  assert.equal(values.has(CONSULTANT_SESSION_KEY), true);
});

test('clears an expired stored session on restore', async () => {
  const expired = JSON.stringify({
    accessToken: 'expired-test-token',
    authMode: 'development',
    role: CONSULTANT_ROLE,
    destination: CONSULTANT_DESTINATION,
    tokenExpiresAt: '2026-11-07T11:00:00.000Z',
  });
  const { storage, values } = makeStorage(expired);
  const restored = await readStoredConsultantSession(storage, fixedNow);
  assert.deepEqual(restored, { status: 'expired' });
  assert.equal(values.has(CONSULTANT_SESSION_KEY), false);
});

test('logout removes the persisted consultant session', async () => {
  const { storage, values } = makeStorage('{"accessToken":"test-only"}');
  await clearStoredConsultantSession(storage);
  assert.equal(values.has(CONSULTANT_SESSION_KEY), false);
});

test('does not call the development endpoint when auth mode is disabled', async () => {
  const { storage, values } = makeStorage();
  let didFetch = false;
  await assert.rejects(
    signInDevelopmentConsultant(
      { phone: '09120000000', code: '123456' },
      {
        devAuthEnabled: false,
        storage,
        fetcher: async () => {
          didFetch = true;
          return new Response('{}', { status: 200 });
        },
        verifyConsultant: async () => ({ active: true }),
      },
    ),
    { code: 'unavailable' },
  );
  assert.equal(didFetch, false);
  assert.equal(values.has(CONSULTANT_SESSION_KEY), false);
});

test('turns off development sign-in when the API says it is unavailable', async () => {
  const { storage, values } = makeStorage();
  await assert.rejects(
    signInDevelopmentConsultant(
      { phone: '09120000000', code: '123456' },
      {
        devAuthEnabled: true,
        storage,
        fetcher: async () => new Response('Not found', { status: 404 }),
        verifyConsultant: async () => ({ active: true }),
      },
    ),
    { code: 'unavailable' },
  );
  assert.equal(values.has(CONSULTANT_SESSION_KEY), false);
});

test('rejects a consultant token if the protected profile check denies it', async () => {
  const { storage, values } = makeStorage();
  await assert.rejects(
    signInDevelopmentConsultant(
      { phone: '09120000000', code: '123456' },
      {
        devAuthEnabled: true,
        storage,
        now: () => fixedNow,
        fetcher: async () =>
          new Response(JSON.stringify(signInResponse()), { status: 200 }),
        verifyConsultant: async () => ({ active: false }),
      },
    ),
    { code: 'wrong-role' },
  );
  assert.equal(values.has(CONSULTANT_SESSION_KEY), false);
});
