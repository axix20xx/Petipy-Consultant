---
name: Petipy Android release build setup
description: Local Expo Android build constraints and reliable SDK setup for this workspace
---

Expo SDK 58's Android template requires compile SDK 37, Build Tools 37.0.0, and NDK 27.1.12297006. Some available Nix Android SDK packages only include API/build-tools through 36, so builds need a writable SDK overlay with the missing packages installed through SDK Manager. CMake must also be present. For this SDK, custom Expo plugins can import `expo/config-plugins`; `expo prebuild` verifies the plugin resolves under pnpm without a direct `@expo/config-plugins` dependency.

In the Google SDK repository used here, the platform package identifier is `platforms;android-37.0` (not `platforms;android-37`); Build Tools remains `build-tools;37.0.0`.

**Why:** The available Nix SDK can lag behind Expo's generated Android project defaults, while temporary SDK files under `/tmp` disappear after workspace sleep/restart. The default root filesystem and parallel Gradle workers can also run out of disk or memory during native builds. The public Expo subpath avoids an unnecessary direct dependency in this workspace.

**How to apply:** Check the generated Gradle SDK, build-tools, NDK, and CMake requirements before building. Use the exact SDK Manager package identifiers from the repository listing, keep downloaded SDK overlays under an ignored workspace-backed directory rather than `/tmp`, put the Gradle user home on workspace-backed storage, and limit Gradle to one worker in constrained environments.

With pnpm's isolated layout, an Expo config plugin loaded by Gradle from a package's real store path may not resolve a dependency linked only inside the app. The React Native Firebase plugin needs `@expo/config-plugins` visible from the workspace root as well as declared by the Expo app. R8 also reports an optional `org.webrtc.Dav1dDecoder$Natives` class absent from the bundled WebRTC build; its generated `-dontwarn` rule must persist through prebuild.

**Why:** Gradle's Expo config extraction resolves plugins from native build scripts, not from the same app-local module path used by normal JavaScript commands, and clean prebuild deletes hand-edited Android files.

**How to apply:** Verify plugin resolution from its package-store path, use a narrowly scoped pnpm public hoist for `@expo/config-plugins`, and generate the WebRTC R8 rule through the app's config plugin rather than editing generated Android files only.
