# Petipy Consultant iOS build and sideload preparation

## Current project setup

- The app remains an Expo-managed project. The existing `app.json` config and
  config plugins generate native iOS project files when a native build runs;
  no generated `ios/` directory is checked in.
- The bundle ID is `com.petipy.consultant`; the app scheme is
  `petipy-consultant`. The existing icon, splash screen, SecureStore session
  storage, API client, WebRTC configuration, and CallKit config plugin remain
  in place.
- Expo Go remains the Replit preview client, not the standalone application.
  The EAS `development` profile is an internal standalone build, not a custom
  Metro development client.
- Build profiles are declared in `eas.json`: `development`, `preview`,
  `production`, and `ios-simulator`. EAS profiles are future configuration;
  this workspace does not run EAS CLI builds.

## Safety defaults and current blockers

- **Production authentication defaults to `live`.** The available mobile sign-in
  is development phone/OTP only. It is enabled in the development profile,
  Replit development workflow, and the manually triggered unsigned iOS GitHub
  Actions build. That IPA is for development testing only; its OTP is still
  validated by Petipy's development-auth endpoint. Preview and production
  profiles keep live auth, and a supported live consultant sign-in/token
  exchange is still required before a production user can sign in.
- **iOS VoIP is disabled in every profile.** The PushKit/CallKit code and config
  plugin are retained. Enabling them requires both
  `EXPO_PUBLIC_IOS_VOIP_ENABLED=true` and an `EXPO_PUBLIC_APNS_ENVIRONMENT`
  value of `sandbox` or `production`; the plugin fails closed if the environment
  is missing or invalid.
- Accepted iOS calls now activate the native WebRTC audio session and use the
  native speaker/receiver route controls. `UIBackgroundModes: audio` is already
  configured, but continued audio must still be verified on a physical iPhone.
  Foreground incoming requests can ring locally; background incoming delivery
  remains unavailable until the Petipy API supports iOS VoIP token registration
  and APNs delivery.
- The iOS VoIP API overlay has not been deployed to the live Petipy API. APNs
  provider credentials and the corresponding server-side feature flag are also
  not configured here. A client build alone cannot make background call
  delivery work.
- APNs private keys and server service credentials must stay in the API
  deployment's secure secret store. Never put them in this app, `eas.json`,
  GitHub, or a committed environment file.
- No native iOS build, IPA, TestFlight upload, or physical-device verification
  has been performed. No production backend changes were made.

## Build profile intent

| Profile | Purpose | Important limits |
| --- | --- | --- |
| `development` | Internal standalone test build with development OTP | Internal iPhone installation needs Apple signing and device registration. It is not a Metro development client. VoIP stays off. |
| `preview` | Production-like internal test | Uses the live-auth gate; internal iPhone installation needs an Apple Developer team and registered device. VoIP stays off. |
| `production` | Future store-signed release | Live authentication and VoIP remain gated until their backend contracts and Apple setup are complete. |
| `ios-simulator` | Standalone build for an iOS Simulator | Simulator output is not installable on a physical iPhone and does not verify PushKit delivery. |

The profiles are future configuration only. Replit's current Expo workflow
does not run EAS CLI builds. Replit's iOS Publish flow submits a build to
App Store Connect for TestFlight/App Store distribution; it does not provide a
downloadable IPA file.

## IPA and signing facts

- An iPhone requires a correctly signed app and a matching provisioning
  profile. An unsigned IPA is not installable on an iPhone. It can only become
  installable after it is signed with valid Apple credentials and a compatible
  provisioning profile.
- Internal/ad-hoc distribution uses a device allow-list. Each iPhone UDID must
  be included in the provisioning profile used for that build.
- Apple allows free Personal Team device testing through Xcode, but requires a
  Mac and periodic reprovisioning. Apple's current limits include three
  registered devices and three installed apps per device; app IDs, devices, and
  provisioning profiles expire after seven days.
- Sideloadly and AltStore Classic are desktop-assisted signing/install paths.
  With a free Apple account, the app signature also expires after seven days
  and must be refreshed. Sideloadly's first device connection uses USB; AltStore
  Classic's refresh path also depends on its desktop helper. Neither removes
  Apple's signing limits.
- AltStore PAL is a separate regional alternative-app marketplace; it is not a
  general way to install an arbitrary Petipy IPA.
- APNs/PushKit capabilities and TestFlight distribution require Apple developer
  program access. A free Personal Team build is not a substitute for the
  production VoIP push entitlement and server credentials.

## What is still needed for real iOS incoming calls

1. An enrolled Apple Developer team, the `com.petipy.consultant` app identifier,
   Push Notifications capability, and matching signing/provisioning.
2. APNs provider credentials stored only on the Petipy API deployment.
3. Deployment and verification of the approved iOS VoIP registration and
   delivery changes on the live API, including queued-call promotion.
4. A production consultant authentication/token flow. The development OTP
   endpoint is not production authentication.
5. An explicitly enabled iOS VoIP build with matching APNs environment, then
   physical-device tests for foreground, background, locked, expired, and
   duplicate-call cases.

## Unsigned iOS CI build

The manually triggered `.github/workflows/build-ios-unsigned.yml` workflow
builds the iOS app target on GitHub's macOS runner and uploads an unsigned IPA
artifact. It enables the development OTP mode only during the app's JS bundle
build; the committed Expo config and production/preview profiles remain `live`.
The workflow does not require Apple signing credentials, but the resulting
unsigned IPA still must be signed with a compatible profile before it can be
installed on an iPhone.

## References

- [Expo development builds](https://docs.expo.dev/develop/development-builds/introduction/)
- [Expo internal distribution](https://docs.expo.dev/build/internal-distribution/)
- [Expo iOS app credentials](https://docs.expo.dev/app-signing/app-credentials/)
- [Apple Developer account and Personal Team limits](https://developer.apple.com/help/account/basics/about-your-developer-account)
- [Sideloadly FAQ](https://sideloadly.io/faq)
- [AltStore FAQ](https://faq.altstore.io/)
