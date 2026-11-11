export async function requestAvailabilityPermissions() {
  return false;
}

export function isAvailabilityServiceRunning() {
  return false;
}

export function setAvailabilityCallState(
  _callId: string | null,
  _state: 'connecting' | 'connected' | 'reconnecting' | null,
) {}

export async function startAvailabilityService(
  _sessionToken: string,
  _tokenExpiresAt: string,
) {
  throw new Error('تماس در پس‌زمینه فقط در نسخه‌ی Android در دسترس است.');
}

export async function stopAvailabilityService() {}
