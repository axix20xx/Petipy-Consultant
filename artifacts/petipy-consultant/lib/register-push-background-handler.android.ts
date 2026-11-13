try {
  const messaging =
    require('@react-native-firebase/messaging') as typeof import('@react-native-firebase/messaging');
  const pushNotifications =
    null;

  messaging.setBackgroundMessageHandler(
    messaging.getMessaging(),
    async (message) => {
      try {
        const { handleBackgroundIncomingMessage } = await import(
          './push-notifications.android'
        );
        await handleBackgroundIncomingMessage(message);
      } catch {
        // Optional native call-alert modules must not prevent React Native startup.
        console.error(
          'Background call handling could not load; foreground polling remains available.',
        );
      }
    },
  );
} catch {
  // Keep app startup available when native push setup is missing; foreground
  // polling remains the fallback. Avoid logging native error objects because
  // third-party SDK errors can include request metadata.
  console.error(
    'Background FCM handler registration failed; foreground polling remains available.',
  );
}
