---
name: Petipy background call alerts
description: User constraints and Android limits for consultant incoming-call alerting.
---

Petipy Consultant uses FCM for incoming-call signals through the approved device registration/status/revoke API routes. The push payload is only a signal: fetch the authenticated consultant request queue and verify the call is still active before opening the screen. Keep the foreground-service polling fallback when push is disabled or notification permission is denied. Never put session/call/TURN credentials or private call details in push payloads. Firebase Admin credentials belong only in the API deployment's secure secrets; FCM must not add Google STUN.

**Why:** The user changed the product requirement and provided the existing Petipy device API contract for FCM; the mobile client must not invent backend routes or own server credentials.

For the incoming call screen, use an Android full-screen notification intent with `USE_FULL_SCREEN_INTENT`. On Android 14+, even when access is granted, an unlocked display gets a persistent heads-up notification; full-screen launches are for a locked or screen-off display. Apps cannot silently grant special access. Android force-stop halts background delivery until the user opens the app again; battery controls may also stop background work.

**Why:** Android documents this unlocked-versus-locked behavior for full-screen intents; a minimized app on an unlocked phone is expected to show heads-up, not launch an activity.

Android notification-channel importance is fixed once a channel is created. Reusing an old channel ID does not repair a channel that was created with low importance or later changed by the user; use a new versioned ID when the channel configuration must be reset.

**Why:** Multiple installed APK iterations can leave the device's original channel configuration in force even when the app code now requests high importance.

**How to apply:** Register/refresh/revoke the installation's FCM token through Petipy's existing routes. Require data-only high-priority call signals, verify them via the API queue, and explain physical-device testing, polling fallback, force-stop, battery, and full-screen permission limits plainly. Test full-screen behavior with the device locked or screen-off. When fixing stale channel importance, create a new channel ID and ensure the notification uses it.
