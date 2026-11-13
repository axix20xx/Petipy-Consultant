try {
  const messaging =
    require('@react-native-firebase/messaging') as typeof import('@react-native-firebase/messaging');
  const pushNotifications =
    require('./push-notifications') as typeof import('./push-notifications');

  messaging.setBackgroundMessageHandler(
    messaging.getMessaging(),
    pushNotifications.handleBackgroundIncomingMessage,
  );
} catch {
  // Keep app startup available when native push setup is missing; foreground
  // polling remains the fallback. Avoid logging native error objects because
  // third-party SDK errors can include request metadata.
  console.error(
    'Background FCM handler registration failed; foreground polling remains available.',
  );
}
