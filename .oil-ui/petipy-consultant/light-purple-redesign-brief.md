# Petipy Consultant — White and Violet Redesign

## Product and use

Petipy Consultant is a Persian, right-to-left Android call desk for authorized `VOICE_CONSULTANT` accounts. Consultants manage availability, answer or reject incoming requests, complete voice/video calls, use in-call chat and attachments, and review their own call history.

The redesign is for a narrow portrait phone, including the user's Samsung Galaxy Z Flip 3. Keep the existing Expo/React Native stack, authentication and role checks, SecureStore session handling, API calls, FCM and foreground-service behavior, WebRTC state, audio/video controls, history filters, chat upload/preview, and logout semantics. Do not invent actions, API routes, customer data, or success states.

## User direction

The user explicitly rejected the previous dark, pink-heavy screen and asked for a complete structural redesign, not a color-only pass. Use a bright white-and-purple light theme throughout, with a cute, polished Petipy character. Do not use the previous ivory/ruby or dark appearance.

## North star

**A bright, reassuring call desk that makes the consultant's current availability and next call action obvious at a glance.**

## Structure to rethink

- Replace the existing greeting + large saturated availability panel + generic queue-card stack. Do not preserve that composition with new colors.
- Rework the home, history, settings, sign-in, incoming-call, active-call, and in-call chat surfaces as one coherent product.
- Keep navigation and the first meaningful content close to the top; avoid a tall decorative hero that pushes the call queue below the fold.
- Give every screen one clear primary action and keep loading, empty, error, and unavailable-auth states designed with the same care.
- Maintain obvious pending state and separate accept/reject actions for every request. Keep the active-call timer, connection state, mute, speaker/earpiece, video, chat, and hang-up controls easy to identify.
- Settings must continue to show real device, notification, foreground-service, full-screen-intent, push, account, and logout states.
- Preserve Persian RTL reading order and comfortable text sizes on the target phone.

## Visual direction

Use white and very light lavender as the main surfaces, deep violet for primary actions, and softer violet for selected states and illustrations. Use a readable dark-plum text color, clear neutral separators, and distinct green/amber/red status colors. Purple should be a deliberate brand accent, not a gradient repeated on every surface; avoid dark-mode backgrounds, hot pink, frosted-glass cards, and stacks of identical rounded cards.

Favor crisp editorial grouping, varied but disciplined surface shapes, tactile call controls, and a small number of pet-care marks derived from the existing paw/icon assets. Use the installed icon set and existing fonts/dependencies. No emojis, new packages, or fake content.

## Motion

Use subtle, fast press feedback and short entrance transitions for non-call content. Never delay the call state, timer, or media controls. No looping decorative animation.

## Acceptance

- The physical-device screenshot's dark pink style is replaced by a clearly light white/violet interface.
- The home-screen structure visibly differs from the old screen, not merely its colors.
- All requested routes retain their real behavior and states.
- Typecheck and the existing authentication, API, push, and pet-card tests pass.
- Capture a real preview screenshot where auth permits; do not bypass authentication. Signed-in states still require a physical or authorized-device check.
