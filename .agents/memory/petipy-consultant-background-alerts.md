---
name: Petipy background call alerts
description: User constraints and Android limits for consultant incoming-call alerting.
---

Petipy Consultant uses FCM for incoming-call signals through the approved device registration/status/revoke API routes. The push payload is only a signal: fetch the authenticated consultant request queue and verify the call is still active before opening the screen. Keep the foreground-service polling fallback when push is disabled or notification permission is denied. Never put session/call/TURN credentials or private call details in push payloads. Firebase Admin credentials belong only in the API deployment's secure secrets; FCM must not add Google STUN.

**Why:** The user changed the product requirement and provided the existing Petipy device API contract for FCM; the mobile client must not invent backend routes or own server credentials.

For the incoming call screen, use an Android full-screen notification intent with `USE_FULL_SCREEN_INTENT`. Android 14+ users can disable that special access, and Android may show only a heads-up alert while they are actively using the device. Android force-stop halts background delivery until the user opens the app again; battery controls may also stop background work.

**How to apply:** Register/refresh/revoke the installation's FCM token through Petipy's existing routes. Require data-only high-priority call signals, verify them via the API queue, and explain physical-device testing, polling fallback, force-stop, battery, and full-screen permission limits plainly.
