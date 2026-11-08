---
name: Petipy voice chat deployment
description: Deployment boundary for consultant in-call messages and attachments.
---

The supplied Petipy VPS source snapshot contains participant-authenticated per-call message and attachment routes. This workspace's `artifacts/api-server` is only a health-check service, not the Petipy production backend. The mobile client can be built and tested with mocked HTTP contracts here, but live message delivery, storage uploads, and customer visibility are unverified until the real backend is checked.

**Why:** The mobile app has no direct control over the production VPS, and a source archive alone does not prove that these routes or its object-storage configuration are deployed.

**How to apply:** Before claiming the chat is live, verify the routes and signed object-storage upload/download flow against Petipy with an authorized consultant and customer account.
