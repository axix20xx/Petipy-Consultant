---
name: Petipy background call alerts
description: User constraints and Android limits for consultant incoming-call alerting.
---

Petipy Consultant uses FCM for incoming-call signals through the approved device registration/status/revoke API routes. The push payload is only a signal: fetch the authenticated consultant request queue and verify the call is still active before opening the screen. Keep the foreground-service polling fallback when push is disabled or notification permission is denied. Never put session/call/TURN credentials or private call details in push payloads. Firebase Admin credentials belong only in the API deployment's secure secrets; FCM must not add Google STUN.

**Why:** The user changed the product requirement and provided the existing Petipy device API contract for FCM; the mobile client must not invent backend routes or own server credentials.

For the incoming call screen, use an Android full-screen notification intent with `USE_FULL_SCREEN_INTENT`. On Android 14+, even when access is granted, an unlocked display gets a persistent heads-up notification; full-screen launches are for a locked or screen-off display. Apps cannot silently grant special access. Android force-stop halts background delivery until the user opens the app again; battery controls may also stop background work.

**Why:** Android documents this unlocked-versus-locked behavior for full-screen intents; a minimized app on an unlocked phone is expected to show heads-up, not launch an activity.

The user chose app-only best-effort call delivery and declined a regular phone/SIP fallback. They still want calls while force-stopped, but ordinary Android apps cannot receive FCM or restart their service after force-stop until the person opens the app again; do not claim a mobile-only workaround exists or add external telephony unless the user changes direction.

**Why:** The user chose “App-only best effort” when offered a server-side phone/SIP fallback.

**How to apply:** Explain the OS boundary plainly and optimize delivery while the app is backgrounded, without adding a non-app phone-call path.

Incoming-call ringing must stop when a request expires, is accepted, or otherwise leaves the authenticated API queue. The user reported that ringing continued after no answer or call completion.

**Why:** Local FCM, poller, native Telecom, notification, and fallback-audio paths can outlive one another unless terminal request state clears all alert surfaces.

**How to apply:** Revalidate requested status and expiry against the server queue, bound ringtone duration, and stop native and fallback sound plus call notifications/Telecom state on terminal transitions.

For WhatsApp-style Android call integration, use a self-managed `PhoneAccount` and `ConnectionService` to report call state to Telecom, while keeping the incoming-call notification and full-screen UI app-owned with CallStyle. Sync Telecom answer/reject/disconnect callbacks with the API and WebRTC state. This integration does not override full-screen access, force-stop, or FCM delivery rules.

**Why:** Android's self-managed Telecom mode coordinates calls and audio but leaves the calling app responsible for its incoming-call UI; it is not a way to bypass Android's background-launch policy.

**How to apply:** Keep native call state and API/WebRTC state synchronized, and test the app-owned CallStyle UI on a physical device in foreground, background, and locked states.

Android notification-channel importance is fixed once a channel is created. Reusing an old channel ID does not repair a channel that was created with low importance or later changed by the user; use a new versioned ID when the channel configuration must be reset.

**Why:** Multiple installed APK iterations can leave the device's original channel configuration in force even when the app code now requests high importance.

**How to apply:** Register/refresh/revoke the installation's FCM token through Petipy's existing routes. Require data-only high-priority call signals, verify them via the API queue, and explain physical-device testing, polling fallback, force-stop, battery, and full-screen permission limits plainly. Test full-screen behavior with the device locked or screen-off. When fixing stale channel importance, create a new channel ID and ensure the notification uses it.
