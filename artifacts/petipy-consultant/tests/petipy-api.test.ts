import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  createVoiceChatUpload,
  getVoiceCallMessages,
  getVoiceChatAttachmentUrl,
  PetipyApiError,
  rejectIncomingCall,
  sendVoiceCallMessage,
} from '../lib/petipy-api';

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

test('loads authenticated voice-call messages from the documented route', async () => {
  const originalFetch = globalThis.fetch;
  let requestUrl = '';
  let requestInit: RequestInit | undefined;
  globalThis.fetch = async (input, init) => {
    requestUrl = String(input);
    requestInit = init;
    return new Response(
      JSON.stringify([
        {
          id: 'message-1',
          callId: 'call-1234567890',
          senderRole: 'consultant',
          isMine: true,
          content: 'سلام',
          attachments: [],
          createdAt: '2026-11-08T10:00:00.000Z',
        },
      ]),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  };

  try {
    const messages = await getVoiceCallMessages(
      'redacted-test-token',
      'call-1234567890',
    );
    assert.equal(
      requestUrl,
      'https://petipy.com/api/voice/calls/call-1234567890/messages',
    );
    assert.equal(
      (requestInit?.headers as Record<string, string>).Authorization,
      'Bearer redacted-test-token',
    );
    assert.equal(messages[0]?.content, 'سلام');
    assert.equal(messages[0]?.isMine, true);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('requests an attachment upload ticket with the real file metadata', async () => {
  const originalFetch = globalThis.fetch;
  let requestUrl = '';
  let requestInit: RequestInit | undefined;
  globalThis.fetch = async (input, init) => {
    requestUrl = String(input);
    requestInit = init;
    return new Response(
      JSON.stringify({
        attachmentId: 'attachment-1',
        uploadUrl: 'https://storage.petipy.com/signed-upload',
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  };

  try {
    const ticket = await createVoiceChatUpload(
      'redacted-test-token',
      'call-1234567890',
      {
        fileName: 'pet-photo.jpg',
        contentType: 'image/jpeg',
        size: 4096,
      },
    );
    assert.equal(
      requestUrl,
      'https://petipy.com/api/voice/calls/call-1234567890/messages/uploads',
    );
    assert.deepEqual(JSON.parse(String(requestInit?.body)), {
      fileName: 'pet-photo.jpg',
      contentType: 'image/jpeg',
      size: 4096,
    });
    assert.equal(ticket.attachmentId, 'attachment-1');
    assert.equal(ticket.uploadUrl, 'https://storage.petipy.com/signed-upload');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('sends a text or attachment message to the documented route', async () => {
  const originalFetch = globalThis.fetch;
  let requestUrl = '';
  let requestInit: RequestInit | undefined;
  globalThis.fetch = async (input, init) => {
    requestUrl = String(input);
    requestInit = init;
    return new Response(
      JSON.stringify({
        id: 'message-2',
        callId: 'call-1234567890',
        senderRole: 'consultant',
        isMine: true,
        content: 'گزارش',
        attachments: [],
        createdAt: '2026-11-08T10:00:00.000Z',
      }),
      { status: 201, headers: { 'Content-Type': 'application/json' } },
    );
  };

  try {
    await sendVoiceCallMessage(
      'redacted-test-token',
      'call-1234567890',
      'گزارش',
      [],
    );
    assert.equal(
      requestUrl,
      'https://petipy.com/api/voice/calls/call-1234567890/messages',
    );
    assert.deepEqual(JSON.parse(String(requestInit?.body)), {
      content: 'گزارش',
      attachments: [],
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('gets a short-lived attachment download URL for an authenticated participant', async () => {
  const originalFetch = globalThis.fetch;
  let requestUrl = '';
  globalThis.fetch = async (input) => {
    requestUrl = String(input);
    return new Response(
      JSON.stringify({
        url: 'https://storage.petipy.com/signed-download',
        expiresAt: '2026-11-08T10:10:00.000Z',
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  };

  try {
    const result = await getVoiceChatAttachmentUrl(
      'redacted-test-token',
      'call-1234567890',
      'message-1',
      'attachment-1',
    );
    assert.equal(
      requestUrl,
      'https://petipy.com/api/voice/calls/call-1234567890/messages/message-1/attachments/attachment-1',
    );
    assert.equal(result.url, 'https://storage.petipy.com/signed-download');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('rejects unsupported chat attachment types before requesting an upload', async () => {
  await assert.rejects(
    createVoiceChatUpload('redacted-test-token', 'call-1234567890', {
      fileName: 'script.exe',
      contentType: 'application/octet-stream',
      size: 512,
    }),
    (error: unknown) => error instanceof PetipyApiError && error.status === 400,
  );
});

test('resolves local storage upload paths against the secure Petipy origin', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () =>
    new Response(
      JSON.stringify({
        attachmentId: 'attachment-local',
        uploadUrl: '/api/storage/local-upload/signed',
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );

  try {
    const ticket = await createVoiceChatUpload(
      'redacted-test-token',
      'call-1234567890',
      {
        fileName: 'report.pdf',
        contentType: 'application/pdf',
        size: 1024,
      },
    );
    assert.equal(
      ticket.uploadUrl,
      'https://petipy.com/api/storage/local-upload/signed',
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});
