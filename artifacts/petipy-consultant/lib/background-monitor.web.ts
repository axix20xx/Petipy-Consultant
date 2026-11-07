export async function requestAvailabilityPermissions() {
  return false;
}

export async function startAvailabilityService(_sessionToken: string) {
  throw new Error('تماس در پس‌زمینه فقط در نسخه‌ی Android در دسترس است.');
}

export async function stopAvailabilityService() {}
