# Petipy Consultant — Monochrome Structure Pass

Target: 390 × 844 portrait Android, Persian RTL. The structure below is deliberately grayscale; it tests hierarchy before color or surface styling.

## Home / calls

```text
┌────────────────────────────────┐
│ PETIPY / میز تماس   profile    │ compact identity; no greeting hero
│                                │
│ [count] درخواست تازه    refresh│ queue is the first content block
│                                │
│ ┌────────────────────────────┐ │
│ │ caller · pending state     │ │ first actionable request is protagonist
│ │ pet/topic                  │ │ concise context
│ │ time received · expiry     │ │ timing stays visible
│ │ [accept]          [reject] │ │ separate, real API actions
│ └────────────────────────────┘ │
│ more requests, if any          │
│ loading / empty / error+retry  │
│                                │
│ ───────── shift control ────── │
│ available / offline    toggle  │ compact secondary control
│ service / push readiness →    │ details link to settings
│                                │
│ calls              stats   me  │
└────────────────────────────────┘
```

Primary action: accept a selected pending call. The request queue occupies the first and strongest reading zone; the screen has no welcome/greeting hero or large availability banner before it. Availability remains one compact shift-control row below the queue, with real service/readiness information linked to Settings.

## History and analytics

```text
┌────────────────────────────────┐
│ history                     ↻  │ compact title and refresh
│ 7d     30d     90d      365d   │ period selection
│                                │
│ answered minutes / calls       │ strongest personal result
│ answer rate / missed           │ supporting metrics
│                                │
│ recent calls                   │
│ own call rows, newest first    │ server-scoped history only
│ loading / empty / error+retry  │
│                                │
│ calls              stats   me  │
└────────────────────────────────┘
```

## Settings

```text
┌────────────────────────────────┐
│ account / settings             │
│ consultant identity + role     │
│                                │
│ call readiness                 │
│ service · notification         │ each real status is distinct
│ full-screen · channel · push   │ blocked items stay actionable
│                                │
│ session / secure logout        │ existing cleanup behavior
│                                │
│ calls              stats   me  │
└────────────────────────────────┘
```

## Sign-in

```text
┌────────────────────────────────┐
│ Petipy                         │ compact wordmark
│                                │
│ consultant identity            │ welcoming but concise
│ real dev-auth status or form   │ no fake success
│ phone and six-digit code       │ only when the API enables it
│ expiry/security note           │ server-controlled two-hour token
│ [sign in]                      │ primary action
│ loading / error / retry        │
└────────────────────────────────┘
```

## Incoming and active calls

```text
Incoming                     Active
┌──────────────────────┐     ┌──────────────────────┐
│ incoming / expires   │     │ connection + timer   │
│ caller + context     │     │ caller / remote video│
│ [reject] [accept]    │     │ mute · route · video │
└──────────────────────┘     │ chat · [hang up]     │
                             └──────────────────────┘
```

## In-call chat and attachment

```text
Chat                         Attachment
┌──────────────────────┐     ┌──────────────────────┐
│ caller · return call │     │ in-app file preview  │
│ message history      │     │ image / PDF handling │
│ loading / empty / err│     │ loading / error      │
│ attach · input · send│     └──────────────────────┘
└──────────────────────┘
```
