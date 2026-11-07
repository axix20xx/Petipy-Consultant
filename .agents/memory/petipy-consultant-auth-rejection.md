---
name: Petipy consultant auth and rejection
description: Product constraints for consultant mobile authentication and pending-call rejection.
---

For Android `VOICE_CONSULTANT` accounts, `POST /api/dev-auth/universal/sign-in` can issue a mobile token only when Petipy's development phone-auth mode is enabled and the identity account has consultant role metadata. Its token expires after two hours. This is not production/live sign-in; keep sign-in unavailable in live mode until Petipy provides a live mobile token exchange. Do not invent endpoints, transfer tokens through clipboard/deep links, or present demo auth as official live authentication. Store mobile credentials only in Expo SecureStore, and never log credentials.

The Petipy call API has no consultant reject endpoint. Leave rejection unavailable and let pending requests expire. Do not reuse the customer `POST /api/voice/calls/cancel-pending` route or the call-finish route.

**Why:** The product owner clarified the development-only endpoint contract and requires server-enforced consultant authorization; guessed routes or fake success would falsely grant access.

**How to apply:** Gate the development form on explicit development auth mode, validate `authenticated`, `VOICE_CONSULTANT`, `/workspace/voice`, and future `tokenExpiresAt`, then verify access through the consultant API before storing. Clear expired sessions from SecureStore. Keep live login disabled and rejection unavailable until their supported API operations exist.
