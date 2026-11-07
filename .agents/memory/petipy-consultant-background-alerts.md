---
name: Petipy background call alerts
description: User constraints and Android limits for consultant incoming-call alerting.
---

Petipy Consultant background calling must not use Google FCM. The current Petipy API supports request polling, not push delivery. Android force-stop halts the app's background service until the user opens it again, and device battery controls can also stop background work.

**Why:** The user wants call alerts while the consultant app is in the background but explicitly excludes FCM; the API has no incoming-call push contract.

**How to apply:** Keep delivery on authenticated Petipy-supported or self-hosted paths, do not invent push endpoints, and explain polling delay, force-stop, and battery limits plainly.
