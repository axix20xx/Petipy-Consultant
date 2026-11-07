---
name: Petipy consultant media scope
description: Real-contract requirements for consultant video, in-call chat, and attachments
---

Implement consultant media features only against Petipy's real authenticated API and call contracts. Do not mock production messages, file transfers, or invent routes. If message or attachment contracts are unavailable, identify the exact missing details before wiring those features. The consultant receives customer video; do not request consultant camera permission unless the product contract changes.

**Why:** The user explicitly required real Petipy contracts, no mocked production behavior, and receive-only customer video.

**How to apply:** Inspect the available OpenAPI/API implementation and customer call flow before adding chat or file network code. Keep the consultant camera disabled by default.
