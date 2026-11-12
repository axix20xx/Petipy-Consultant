try {
  const messaging =
    require('@react-native-firebase/messaging') as typeof import('@react-native-firebase/messaging');
  const pushNotifications =
    require('./push-notifications') as typeof import('./push-notifications');

  messaging.setBackgroundMessageHandler(
    messaging.getMessaging(),
    pushNotifications.handleBackgroundIncomingMessage,
  );
} catch (error) {
  // Keep app startup available when native push setup is missing; foreground
  // polling remains the fallback and this message contains no session data.
  console.error(
    'Background FCM handler registration failed; polling fallback remains available.',
    error,
  );
}
