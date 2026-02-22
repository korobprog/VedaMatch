# Android Stability + Visual Quality Smoke Checklist

Date: 2026-02-22
Scope: Android first (iOS regression sanity included)
Build: current frontend with `performanceMode` + WS/context stabilization

## 0) Preconditions
1. Use a real Android device (not only emulator).
2. Notification permission is enabled for `com.ragagent`.
3. User is logged in and opened app at least once after install/update.
4. For push tests: do not use force-stop during delivery checks.

## 1) Auth/session + WebSocket single-init
1. Login once.
2. Open app logs (`adb logcat`) and watch WebSocket logs.
3. Verify only one initial connect sequence appears.

PASS:
- No duplicate burst of `Connecting to bridge...` on a single login.
- No reconnect storm on idle portal usage.

FAIL:
- 2+ immediate connect attempts at login without disconnect reason.
- Reconnect loop every few seconds.

## 2) Heartbeat 401 recovery path
1. Simulate expired access token (or wait until it expires).
2. Trigger heartbeat cycle (wait ~3 min or force user activity that sends heartbeat).
3. Observe logs for refresh attempt.

PASS:
- Heartbeat 401 triggers refresh first.
- Session remains active if refresh succeeds.
- Logout only happens after refresh failure.

FAIL:
- Immediate logout on first 401 even with valid refresh token.

## 3) Portal stress (10 min)
1. Open Portal main screen.
2. Keep app active for 10 minutes:
- scroll portal,
- open/close folders,
- switch tabs and return to portal,
- keep slideshow enabled.
3. Monitor responsiveness (tap latency), no ANR dialog.

PASS:
- No ANR/freeze.
- UI remains responsive to taps/scroll.
- No heavy reconnect storm in logs.

FAIL:
- ANR popup.
- Multi-second UI hangs.

## 4) Slideshow render stability
1. Enable slideshow and set interval to a small value (e.g. 10-15 sec).
2. Stay on portal and observe 5-8 transitions.

PASS:
- Wallpaper changes smoothly.
- No visible whole-screen flicker loops.
- No burst lag during each slide change.

FAIL:
- Major frame drops/freeze on each wallpaper change.

## 5) Performance mode behavior

### 5.1 High Quality
1. Set `Performance = High Quality`.
2. Open portal and observe effects.

PASS:
- Blur + shimmer + pulse + cross-fade are visually active.
- No immediate instability on a modern device.

### 5.2 Adaptive
1. Set `Performance = Adaptive`.
2. Stress portal (scrolling + transitions).
3. Watch settings badge for temporary auto-degrade.

PASS:
- Adaptive keeps visuals but can auto-degrade under lag.
- Later recovers after stable window.

Expected logs:
- `[adaptive_degrade_on] ...`
- `[adaptive_degrade_off] ...`

### 5.3 Battery Saver
1. Set `Performance = Battery Saver`.
2. Re-open portal.

PASS:
- Blur is reduced/disabled on Android.
- Shimmer/pulse are minimized.
- UI still readable and stylistically consistent.

FAIL:
- Full visual breakage (unreadable text, lost contrast).

## 6) Push regression (Android)
1. App in foreground: send test push.
2. App in background (home screen): send test push.
3. App terminated normally (swiped away, not force-stop): send test push.

PASS:
- Push appears in notification shade.
- Tap opens expected app flow/screen.
- Existing booking/news/wallet push behavior remains intact.

Important platform note:
- After `force-stop`, Android may suppress FCM until manual relaunch.

## 7) iOS sanity regression
1. Open portal and check visuals.
2. Send one push sanity test.

PASS:
- No noticeable visual downgrade from baseline.
- Push flow remains correct.

## 8) Quick telemetry checklist
Check for presence (not necessarily exact counts):
- `ws_connect_attempt`
- `ws_reconnect_backoff_ms`
- `ws_auth_recover`
- `ws_reconnect_storm_detected` (should normally be absent)
- `render_heavy_mode_entered`
- `portal_animation_dropped`
- `adaptive_degrade_on/off`

## 9) Go/No-Go for closed MVP test
Go if all are true:
1. No ANR during 10-min portal stress.
2. WebSocket single-init confirmed.
3. Adaptive/Battery Saver behavior verified.
4. Push works in foreground/background/terminated (without force-stop).
5. iOS sanity passes.
