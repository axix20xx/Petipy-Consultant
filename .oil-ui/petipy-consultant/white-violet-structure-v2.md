# Petipy Consultant — Structural Redesign Reset

Target: a narrow Android phone, Persian RTL. This wireframe intentionally replaces the existing app's layout grammar. It is not a palette pass.

## Home / live queue

```text
┌────────────────────────────────────┐
│ پتی‌پای · میز تماس       profile   │ compact utility bar
│ امروز · available switch · refresh│ readiness stays visible without a hero panel
│ service/push readiness summary →  │ real status remains one tap away
│                                    │
│  ۰۲  درخواست منتظر پاسخ            │ queue count becomes the visual anchor
│      آخرین بررسی همین حالا          │
│                                    │
│ ┌──────── caller spotlight ───────┐ │
│ │  caller identity     pet mark   │ │ one featured live request
│ │  pet / concern                  │ │ caller context, not generic metadata
│ │  received time · ۶ دقیقه مانده │ │ remaining time is explicit
│ │                                 │ │
│ │ [reject]             [answer]   │ │ Persian RTL: primary action on right
│ └─────────────────────────────────┘ │
│                                    │
│ در صف بعدی                         │
│ caller · pet · received time      │ quiet ledger rows, no repeated cards
│ caller · pet · received time      │
│                                    │
│ today calls / spoken minutes       │ compact work summary
│ خانه             گزارش      حساب  │
└────────────────────────────────────┘
```

When the queue is empty, the spotlight becomes a warm, low-noise pet-care rest state with a concise explanation; it must not become another large availability panel. Loading, offline, auth-required, and error states use the same information hierarchy.

## Incoming call

```text
┌────────────────────────────────────┐
│ incoming request · ۰۶:۱۲ remaining │ prominent countdown
│                                    │
│        caller identity             │ full-screen call invitation
│        pet / topic details         │ distinct from the home queue
│                                    │
│        short ring / connection cue │
│                                    │
│ reject                    answer   │ Persian RTL: primary action on right
└────────────────────────────────────┘
```

## Active voice/video call

```text
┌────────────────────────────────────┐
│ connected · elapsed time           │
│                                    │
│     remote video or voice stage    │ call media owns the screen
│     caller / pet context           │ preserve pet-card access
│                                    │
│ mute · audio route · video · chat  │ clear native-size controls
│                 hang up            │ destructive action separated
└────────────────────────────────────┘
```

## Call history and analytics

```text
┌────────────────────────────────────┐
│ my consultations           refresh │
│ 7d      30d      90d      365d     │ period filter
│                                    │
│ answered minutes                   │ one personal headline metric
│ calls · answer rate · missed       │ supporting facts, not card stack
│                                    │
│ recent calls                       │
│ time ─ caller · duration · result  │ chronological timeline
│ time ─ caller · duration · result  │
│                                    │
│ home             report      account│
└────────────────────────────────────┘
```

## Settings and call readiness

```text
┌────────────────────────────────────┐
│ account / consultant identity      │ compact profile summary
│                                    │
│ call readiness                     │
│ availability service    state →   │ clear device/service status rows
│ incoming-call alerts    state →   │ real actions open Android settings
│ push registration       state →   │ do not claim unverified behavior
│                                    │
│ privacy and session                │
│ sign out                           │ destructive action is distinct
│                                    │
│ home             report      account│
└────────────────────────────────────┘
```

## Sign-in

```text
┌────────────────────────────────────┐
│ Petipy Consultant                  │ concise, welcoming brand
│ consultant sign-in                 │
│ development-auth notice or disabled│ accurately reflects server mode
│ phone                              │
│ six-digit development code         │
│ [continue securely]                │ actual authentication only
│ role/session error state           │
└────────────────────────────────────┘
```

## In-call chat and attachment

```text
┌────────────────────────────────────┐
│ return to call · caller             │
│                                    │
│ message conversation              │ in-app attachment preview
│ received image / PDF              │ no external browser link
│                                    │
│ attach · message field · send      │ keyboard-safe composer
└────────────────────────────────────┘
```

## Non-negotiable implementation constraints

- Preserve existing API, auth, role routing, SecureStore, FCM, foreground service, notification and native-call behavior.
- Preserve current WebRTC, media permission, mute, audio-route, video, chat, attachment, timer, finish-call, history, analytics, and pet-card flows.
- No new API routes, mock login success, fake service states, or fallback credentials.
- Keep every real loading/error/empty/expired state; do not hide a missing backend operation.
- Use the existing light white/violet theme and Persian RTL. No dark maroon/pink surfaces and no color-only variants.
- The APK must visibly reflect this new composition before it is presented.
