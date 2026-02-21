# Android build: temporary changes (MVP)

Date: 2026-02-21

## What was temporarily disabled to make `installDebug` build pass

1. Android autolinking for LiveKit modules in:
`/Users/mamu/Documents/vedicai/frontend/react-native.config.js`

Disabled entries:
- `@livekit/react-native` (`platforms.android = null`)
- `@livekit/react-native-webrtc` (`platforms.android = null`)

Why:
- Temporary workaround for unstable Android native build path during local smoke-install flow.

Impact:
- Android build can pass, but LiveKit native Android features are excluded from autolinking in this mode.

## What was enabled/added (required for Firebase push)

1. Google Services Gradle plugin classpath in:
`/Users/mamu/Documents/vedicai/frontend/android/build.gradle`
- `classpath("com.google.gms:google-services:4.4.2")`

2. Google Services plugin apply in:
`/Users/mamu/Documents/vedicai/frontend/android/app/build.gradle`
- `apply plugin: "com.google.gms.google-services"`

3. Correct Android Firebase config file:
- `frontend/android/app/google-services.json`
- package in file must match app id: `com.ragagent`
- project id: `vedamathai`

## Required before Play Market production release

1. Decide LiveKit strategy for Android release:
- If LiveKit voice/video features are required in production, re-enable autolinking for both LiveKit packages and fix native build issues properly.
- If not required for MVP release, keep this disabled state documented in release notes and QA scope.

2. Run full Android release validation after decision:
- `./gradlew app:assembleRelease`
- smoke test auth/chat/push on real device
- verify no regressions in calls/media flows

3. Keep Firebase files consistent:
- `applicationId` in Gradle == `package_name` in `google-services.json`
- server Firebase Admin credentials and project id must be from the same Firebase project.
