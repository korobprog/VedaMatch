# Permissions Matrix (P0 Release)

## Android (`frontend/android/app/src/main/AndroidManifest.xml`)

| Permission | Feature | Screen/Flow | Release Decision |
|---|---|---|---|
| `INTERNET` | API/WebSocket | Global | Keep |
| `CAMERA` | Capture photo | Registration, chat attachments | Keep |
| `READ_MEDIA_IMAGES` | Pick image | Registration, profile/chat | Keep |
| `READ_MEDIA_VIDEO` | Pick video | Multimedia/chat attachment flows | Keep |
| `READ_EXTERNAL_STORAGE` (<=32) | Legacy image/file picker | Legacy Android devices | Keep (compat) |
| `WRITE_EXTERNAL_STORAGE` (<=28) | Legacy media save | Legacy Android devices | Keep (compat) |
| `RECORD_AUDIO` | Voice notes/calls | Chat/rooms/calls | Keep |
| `MODIFY_AUDIO_SETTINGS` | Audio routing | Calls/rooms | Keep |
| `FOREGROUND_SERVICE` | Active audio tasks | Calls/recording | Keep |
| `FOREGROUND_SERVICE_MICROPHONE` | Recording in foreground | Calls/recording | Keep |
| `FOREGROUND_SERVICE_CAMERA` | Camera usage in foreground | Camera/call features | Keep |
| `FOREGROUND_SERVICE_PHONE_CALL` | Call service foreground mode | Callkeep/VoIP-style flows | Keep (reviewer justification required) |
| `BIND_TELECOM_CONNECTION_SERVICE` | Callkeep service binding | Callkeep integration | Keep (reviewer justification required) |
| `MANAGE_OWN_CALLS` | In-app call management | Callkeep integration | Keep (reviewer justification required) |
| `POST_NOTIFICATIONS` | Push notifications | Messaging/system updates | Keep |
| `ACCESS_FINE_LOCATION` | Nearby/map/localized content | Map, nearby features | Keep |
| `ACCESS_COARSE_LOCATION` | Nearby/map/localized content | Map, nearby features | Keep |
| `ACCESS_NETWORK_STATE` | Connectivity checks | Reconnect/offline handling | Keep |
| `ACCESS_WIFI_STATE` | Connectivity checks | Reconnect/offline handling | Keep |

### Removed in P0 hardening
- `CALL_PHONE`
- `READ_PHONE_STATE`
- `READ_PHONE_NUMBERS`

## iOS (`frontend/ios/vedamatch/Info.plist`)

| Permission key | Feature | Decision |
|---|---|---|
| `NSCameraUsageDescription` | Camera capture | Keep |
| `NSPhotoLibraryUsageDescription` | Photo picker | Keep |
| `NSPhotoLibraryAddUsageDescription` | Save image/media | Keep |
| `NSMicrophoneUsageDescription` | Voice/call recording | Keep |
| `NSLocationWhenInUseUsageDescription` | Nearby/map features | Keep |

## Reviewer notes requirement
- Reviewer notes must include a short explanation for microphone/camera/location and call-related capabilities.
- If call-related Android permissions are kept, include a direct feature reference and where it is used in-app.
