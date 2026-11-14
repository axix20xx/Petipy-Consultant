---
name: Petipy consultant media scope
description: Real-contract requirements for consultant video, in-call chat, and attachments
---

Implement consultant media features only against Petipy's real authenticated API and call contracts. Do not mock production messages, file transfers, or invent routes. If message or attachment contracts are unavailable, identify the exact missing details before wiring those features. The consultant receives customer video; do not request consultant camera permission unless the product contract changes.

Treat the call as connected only when the local WebRTC peer connection reports `connected`; a signaling `connected` message alone may describe only the other participant. Keep ongoing service status synchronized with accepted, connecting, connected, and reconnecting states.

**Why:** The user explicitly required real Petipy contracts, no mocked production behavior, and receive-only customer video.

**How to apply:** Inspect the available OpenAPI/API implementation and customer call flow before adding chat or file network code. Keep the consultant camera disabled by default, and derive connection indicators and timers from WebRTC state rather than signaling acknowledgements.

When an iOS call returns from suspension, use the authenticated join route to obtain a fresh short-lived call token and replace only the consultant signaling socket if the WebRTC peer is still connected. Rebuild media only when peer state is disconnected, failed, or closed. The supplied signaling server accepts only `offer`, `answer`, `ice-candidate`, `connected`, and `hangup`; do not invent heartbeat messages.

**Why:** The available server snapshot replaces a participant's prior socket when the same role rejoins, but does not define a heartbeat message. Recreating an already-connected peer on every foreground return can unnecessarily interrupt audio.

**How to apply:** On foreground return, inspect the actual socket and peer states. Refresh the join token only when signaling/media needs recovery; do not persist or log call tokens.
