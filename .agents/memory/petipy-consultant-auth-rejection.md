---
name: Petipy consultant auth and rejection
description: Product constraints for consultant mobile authentication and pending-call rejection.
---

For Android `VOICE_CONSULTANT` accounts, `POST /api/dev-auth/universal/sign-in` can issue a mobile token only when Petipy's development phone-auth mode is enabled and the identity account has consultant role metadata. Its token expires after two hours. This is not production/live sign-in; keep sign-in unavailable in live mode until Petipy provides a live mobile token exchange. Do not invent endpoints, transfer tokens through clipboard/deep links, or present demo auth as official live authentication. Store mobile credentials only in Expo SecureStore, and never log credentials.

For standalone Android release APKs, the shell `EXPO_PUBLIC_PETIPY_AUTH_MODE` value may not be present in the bundled JS. Use the Expo app config `extra.petipyAuthMode` as a fallback in addition to the environment override, and verify `assets/app.config` inside the APK contains the intended mode. Keep the configuration explicitly set to development only for the requested test build.

The Petipy call API has no consultant reject endpoint. Leave rejection unavailable and let pending requests expire. Do not reuse the customer `POST /api/voice/calls/cancel-pending` route or the call-finish route.

**Why:** The product owner clarified the development-only endpoint contract and requires server-enforced consultant authorization; guessed routes or fake success would falsely grant access.

**Why:** A Gradle release build did not inline the shell auth-mode variable into the Expo JS bundle, so the installed app incorrectly hid the development OTP form.

**How to apply:** Gate the development form on explicit development auth mode, validate `authenticated`, `VOICE_CONSULTANT`, `/workspace/voice`, and future `tokenExpiresAt`, then verify access through the consultant API before storing. Clear expired sessions from SecureStore. Keep live login disabled and rejection unavailable until their supported API operations exist. When producing a standalone APK, confirm the bundled Expo config contains the development mode.
