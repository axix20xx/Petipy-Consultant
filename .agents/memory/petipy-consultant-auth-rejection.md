---
name: Petipy consultant auth and rejection
description: Product constraints for consultant mobile authentication and pending-call rejection.
---

For Android `VOICE_CONSULTANT` accounts, `POST /api/dev-auth/universal/sign-in` is development-only and does not support the consultant role. The production identity-provider handoff for Android has not been specified. Do not use the development OTP route or transfer tokens through clipboard or deep links.

The Petipy call API has no consultant reject endpoint. Leave rejection unavailable and let pending requests expire. Do not reuse the customer `POST /api/voice/calls/cancel-pending` route or the call-finish route.

**Why:** These constraints were confirmed by the product owner; using the development session or a guessed reject route would violate the API’s role and call-state rules.

**How to apply:** Wait for the production Android identity-provider flow before enabling sign-in. Keep the reject action disabled until a consultant-specific API operation is added.
