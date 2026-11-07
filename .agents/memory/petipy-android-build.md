---
name: Petipy Android release build setup
description: Local Expo Android build constraints and reliable SDK setup for this workspace
---

Expo SDK 58's Android template requires compile SDK 37, Build Tools 37.0.0, and NDK 27.1.12297006. Some available Nix Android SDK packages only include API/build-tools through 36, so builds need a writable SDK overlay with the missing packages installed through SDK Manager. CMake must also be present. For this SDK, custom Expo plugins can import `expo/config-plugins`; `expo prebuild` verifies the plugin resolves under pnpm without a direct `@expo/config-plugins` dependency.

**Why:** The available Nix SDK can lag behind Expo's generated Android project defaults, while the default root filesystem and parallel Gradle workers can run out of disk or memory during native builds. The public Expo subpath avoids an unnecessary direct dependency in this workspace.

**How to apply:** Check the generated Gradle SDK, build-tools, NDK, and CMake requirements before building. Put the Gradle user home on workspace-backed storage and limit Gradle to one worker in constrained environments.
