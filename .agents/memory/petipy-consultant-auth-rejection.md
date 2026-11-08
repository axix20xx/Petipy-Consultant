---
name: Petipy consultant auth and rejection
description: Product constraints for consultant mobile authentication and pending-call rejection.
---

For Android `VOICE_CONSULTANT` accounts, `POST /api/dev-auth/universal/sign-in` can issue a mobile token only when Petipy's development phone-auth mode is enabled and the identity account has consultant role metadata. Its token expires after two hours. This is not production/live sign-in; keep sign-in unavailable in live mode until Petipy provides a live mobile token exchange. Do not invent endpoints, transfer tokens through clipboard/deep links, or present demo auth as official live authentication. Store mobile credentials only in Expo SecureStore, and never log credentials.

For standalone Android release APKs, the shell `EXPO_PUBLIC_PETIPY_AUTH_MODE` value may not be present in the bundled JS. Use the Expo app config `extra.petipyAuthMode` as a fallback in addition to the environment override, and verify `assets/app.config` inside the APK contains the intended mode. Keep the configuration explicitly set to development only for the requested test build.

The owner supplied an approved rejection contract: `POST /api/voice/consultant/me/requests/{callId}/reject`, optional `{ "reason": "busy" }`, and `{ callId, status: "rejected" }` on success. It must check active consultant ownership and pending/unexpired status, persist a rejection event, and return 401/403/409 for the specified auth, ownership, and conflict cases. The attached source snapshot lacked the route; the local backend artifact is only a health-check placeholder, so the live route is not deployed merely because a patch exists.

Do not fake rejection or reuse the customer `POST /api/voice/calls/cancel-pending` or finish route. The customer currently waits on the call WebSocket; deliver a rejection message there and support reconnecting customers so rejection is visible even if the first socket was not open yet.

**Why:** The product owner clarified the development-only endpoint contract and requires server-enforced consultant authorization; guessed routes or fake success would falsely grant access.

**Why:** A Gradle release build did not inline the shell auth-mode variable into the Expo JS bundle, so the installed app incorrectly hid the development OTP form.

**Why:** The owner later provided a specific rejection endpoint contract and an attached API source snapshot, superseding the earlier statement that no reject operation exists. The production deployment is still separate from the snapshot.

**How to apply:** Gate the development form on explicit development auth mode, validate `authenticated`, `VOICE_CONSULTANT`, `/workspace/voice`, and future `tokenExpiresAt`, then verify access through the consultant API before storing. Clear expired sessions from SecureStore. Keep live login disabled. Before enabling rejection on a release, deploy the approved route and customer WebSocket handling to Petipy's live backend. When producing a standalone APK, confirm the bundled Expo config contains the development mode.
