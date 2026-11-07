---
name: Petipy consultant auth and rejection
description: Product constraints for consultant mobile authentication and pending-call rejection.
---

For Android `VOICE_CONSULTANT` accounts, `POST /api/dev-auth/universal/sign-in` is development-only and does not support the consultant role. The production identity-provider handoff for Android has not been specified. Do not use the development OTP route, transfer tokens through clipboard or deep links, or invent mobile sign-in/token-exchange routes. Do not mark the user signed in or remove the unavailable-flow warning until a real Petipy-authenticated consultant session is verified. Store mobile session credentials only in Expo SecureStore.

The Petipy call API has no consultant reject endpoint. Leave rejection unavailable and let pending requests expire. Do not reuse the customer `POST /api/voice/calls/cancel-pending` route or the call-finish route.

**Why:** The product owner requires authentication through Petipy's real identity flow and server-enforced consultant authorization; guessed routes or fake success would falsely grant access.

**How to apply:** Inspect the actual Petipy auth implementation and API contract before enabling sign-in. Treat the consultant API's authorization response as authoritative, clear expired sessions from SecureStore, and keep rejection unavailable until a consultant-specific API operation is added.
