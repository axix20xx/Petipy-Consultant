export async function prepareIncomingCallAlerts() {}
export async function getIncomingCallChannelStatus() {
  return 'unavailable' as const;
}
export async function openIncomingCallChannelSettings() {}
export async function notifyIncomingCall(_callId: string) {}
export async function cancelIncomingCallNotification(_callId: string) {}
export async function clearIncomingCallNotifications() {}
export function startIncomingCallRingtone() {}
export function stopIncomingCallRingtone() {}
export function onIncomingCallNotificationOpen(_onOpen: () => void) {
  return () => {};
}
