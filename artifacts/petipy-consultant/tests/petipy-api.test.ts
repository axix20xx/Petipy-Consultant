import assert from 'node:assert/strict';
import { test } from 'node:test';
import { PetipyApiError, rejectIncomingCall } from '../lib/petipy-api';

test('sends an authenticated reject request with the documented reason', async () => {
  const originalFetch = globalThis.fetch;
  let requestUrl = '';
  let requestInit: RequestInit | undefined;
  globalThis.fetch = async (input, init) => {
    requestUrl = String(input);
    requestInit = init;
    return new Response(
      JSON.stringify({ callId: 'call-1234567890', status: 'rejected' }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  };

  try {
    const result = await rejectIncomingCall(
      'redacted-test-token',
      'call-1234567890',
    );
    assert.equal(
      requestUrl,
      'https://petipy.com/api/voice/consultant/me/requests/call-1234567890/reject',
    );
    assert.equal(
      (requestInit?.headers as Record<string, string>).Authorization,
      'Bearer redacted-test-token',
    );
    assert.deepEqual(JSON.parse(String(requestInit?.body)), { reason: 'busy' });
    assert.deepEqual(result, {
      callId: 'call-1234567890',
      status: 'rejected',
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('does not turn a conflict response into a successful rejection', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () =>
    new Response(JSON.stringify({ error: 'Call is no longer pending' }), {
      status: 409,
      headers: { 'Content-Type': 'application/json' },
    });

  try {
    await assert.rejects(
      rejectIncomingCall('redacted-test-token', 'call-1234567890'),
      (error: unknown) => error instanceof PetipyApiError && error.status === 409,
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});
