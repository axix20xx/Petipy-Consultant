# Petipy Consultant — Redesign brief

## Product facts

- Audience: authorized `VOICE_CONSULTANT` accounts only.
- Main work: set availability, answer customer call requests, keep an active call connected, review personal call activity, and use chat or attachments during a call.
- Language and device: Persian, right-to-left, Android-first; the main target is a narrow phone viewport, including the user's Samsung Flip 3.
- Existing product constraints: retain the current authenticated API/session flow, role checks, request polling and push handling, native calling service, WebRTC, audio/video controls, chat, history, and logout. No new endpoints or fake success states.
- Existing visual assets: Petipy's paw mark and installed icon library. No supplied typeface or photography needs to be added.
- Technology: existing Expo / React Native components, shared local color tokens, installed packages only.

## North star

**A reassuring pet-care practice with the speed and clarity of a live call desk.** A consultant should know the current service state immediately and reach the right call action without hunting.

## Confirmed direction

The user selected **Ivory + ruby**: warm, boutique, spacious, polished, cute, premium, and visibly structured. Do not return to the rejected flat, muted, or colorless presentation.

Working visual concept: a carefully kept pet-care notebook, using warm paper as the base and ruby as the action color. Use pet-care motifs sparingly and only where they improve recognition; the caller and current call remain the strongest content.

## Screen protagonists and primary actions

| Screen | Protagonist | Primary action | State change the user must see |
| --- | --- | --- | --- |
| Sign-in | Consultant identity | Sign in | Loading, unavailable auth, or a clear error |
| Consultant home | Current availability and pending request | Accept the selected request | Request moves into the active-call flow only after the API succeeds |
| Incoming call | Caller and call status | Accept | Connecting becomes visible; reject remains its existing supported path |
| Active call | Caller and connection state | End call | Connected timer and controls remain immediately readable |
| History | Personal call activity | Change date range | Metrics and history refresh for 7/30/90/365 days |
| Settings | Account and device-call readiness | Resolve a blocked status or log out | Status is explained; logout clears the existing session |
| In-call chat | Conversation | Send message or attachment | The sent item appears in the conversation and opens in-app |

## State rules

- Preserve real loading, empty, error, unavailable-auth, and retry states. An empty history must say there is no data in the selected period; a failed load must offer retry rather than showing dashes as if they were a valid result.
- Every pending request must be visually identified as pending and have its own existing accept/reject controls. Do not label a pending request merely “in queue” if it can be acted on.
- Settings must name each capability and show its distinct real state: service running/stopped, notification/full-screen permission granted/blocked, call channel enabled/disabled, and push registered/unavailable. A blocked item must lead to the existing permission-check/settings action.
- The active-call header must not imply that Back returns to the queue or ends a call. Show only an explicit route to in-call chat; ending remains a separate, clearly named action.
- Chat must distinguish loading, failed, and truly empty conversations. Keep attach and send actions visible beside the keyboard-safe composer; attachments open in-app.
- The active-call duration must use clearly legible tabular digits beside the connection state.

## Gray structure

Phone viewport: 390 × 844 CSS pixels, portrait, matching the design tool's mobile capture and a narrow Android layout. The wireframe is intentionally monochrome; it tests grouping and action priority before visual styling.

### Sign-in

```text
┌──────────────────────────────┐
│ Petipy Consultant     status │
│                              │
│       Paw / brand mark       │
│       ورود مشاور             │
│       one-line purpose       │
│                              │
│ ┌──────────────────────────┐ │
│ │ Development-auth notice  │ │
│ │ phone field              │ │
│ │ six-digit code           │ │
│ │ privacy/session note     │ │
│ │ [  ورود امن  ]           │ │
│ │ error / retry            │ │
│ └──────────────────────────┘ │
└──────────────────────────────┘
```

### Consultant home / queue

```text
┌──────────────────────────────┐
│ brand / consultant identity  │
│ availability state + toggle  │
│ one concise service summary  │
│                              │
│ درخواست‌های تماس     refresh │
│ ┌──────────────────────────┐ │
│ │ caller / request time    │ │
│ │ pending state / expiry  │ │
│ │ [accept]       [reject]  │ │
│ └──────────────────────────┘ │
│ repeat for each pending item │
│ clear loading / empty / error│
│                              │
│ home       history    config│
└──────────────────────────────┘
```

### Incoming call

```text
┌──────────────────────────────┐
│ incoming state               │
│                              │
│          caller              │
│          call context        │
│          time remaining      │
│                              │
│ [ reject ]      [ accept ]   │
└──────────────────────────────┘
```

### Active call

```text
┌──────────────────────────────┐
│ connected / reconnecting     │
│ call timer      [open chat]  │
│                              │
│          caller              │
│      connected / reconnecting│
│                              │
│ mute   speaker   video   chat│
│                              │
│         [ end call ]         │
└──────────────────────────────┘
```

### History and settings

```text
History:  title + refresh
          7 / 30 / 90 / 365-day filter
          answered minutes, total, rate, missed
          personal rows or explicit empty state
          loading/error states with retry
          bottom navigation

Settings: account + active role
          call notification + foreground-service state
          full-screen permission, channel, and push status
          clear existing path to resolve blocked status
          session/logout action
          bottom navigation
```

### In-call chat

```text
┌──────────────────────────────┐
│ caller / return to call      │
│ messages or empty/loading/error state
│ file opens in the app        │
│ keyboard-safe composer + attach + send
└──────────────────────────────┘
```

## Interaction and motion limits

- Main actions respond immediately and preserve API success/error semantics.
- Use short press feedback and restrained one-time entrances. Do not delay or animate the call timer, call state, or media controls.
- Keep the active call usable with one hand; the hang-up action stays visually distinct from mute/speaker/video/chat controls.
- Respect reduced motion. No looping decorative motion.

## Validation scope

- Compare the original sign-in baseline against the new structure.
- Inspect the redesigned sign-in at 100% and 200% and verify the keyboard does not cover its primary action.
- Exercise the real phone/code validation and auth error paths.
- Inspect narrow portrait layouts and the call screen's status and control hierarchy.
- Run typecheck and existing auth, API, and push tests. Physical call-state and launch verification still require an Android device.
