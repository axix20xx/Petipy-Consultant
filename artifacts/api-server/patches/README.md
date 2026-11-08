# Consultant development login patch

`consultant-dev-login-30-day.patch` targets the full Petipy VPS backend source
snapshot, not this workspace's API Server artifact. The workspace artifact is a
health-check stub and does not contain the login route or token issuer.

Apply the patch from the root of the matching full backend source. It changes
only mobile development sessions for an identity account resolved as
`VOICE_CONSULTANT`; other mobile-session durations and per-call join tokens
remain unchanged.

The complete patched source bundle is generated at
`generated-artifacts/petipy-api-consultant-dev-login-30-day.zip`. Neither the
patch nor that bundle has been deployed to the live Petipy API.
