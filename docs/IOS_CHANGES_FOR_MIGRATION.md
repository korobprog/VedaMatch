## 2026-03-13 (Shared mobile chat: Android recorded audio upload fallback)

### Измененные файлы
- `frontend/services/mediaService.ts`

### Суть правки (от старого к новому)
- Было:
  - отправка записанного voice message шла через `axios` multipart на обеих платформах;
  - на iPhone это проходило, но на Android локально записанный аудио-файл мог падать в нативный `Network Error` еще до backend response.
- Стало:
  - для Android `audio` upload добавлен `fetch`-based multipart path;
  - если `axios` все же используется и падает именно в `Network Error`, код автоматически повторяет отправку через `fetch`;
  - остальной media upload flow не менялся.

### Сниппеты кода

`frontend/services/mediaService.ts`:
```ts
if (Platform.OS === 'android' && media.type === 'audio') {
  return await uploadMediaWithFetch(formData);
}
```

```ts
if (/network error/i.test(errorMessage)) {
  return await uploadMediaWithFetch(formData);
}
```

## 2026-03-13 (Shared mobile calls: wait for WebSocket signaling after auth refresh)

### Измененные файлы
- `frontend/services/websocketService.ts`
- `frontend/services/webRTCService.ts`

### Суть правки (от старого к новому)
- Было:
  - старт 1:1 звонка сразу создавал `offer` и слал его через `wsService.send(...)`;
  - если access token протухал прямо в момент звонка, `turn-credentials`/WS проходили через `401 -> refresh`, а signaling socket ещё не был в `OPEN`;
  - в этом окне `offer` и часть `candidate` терялись на клиенте, а сервер не видел `offer/answer/candidate` вообще.
- Стало:
  - `WebSocketService` умеет сообщать `isOpen()` и ждать восстановления через `waitUntilOpen()`;
  - `WebRTCService` перед `offer/answer` ждёт готовность signaling socket;
  - `candidate` и `hangup` теперь отправляются через тот же guarded path, чтобы не теряться на короткой auth-reconnect гонке.

### Сниппеты кода

`frontend/services/websocketService.ts`:
```ts
async waitUntilOpen(timeoutMs: number = 4000) {
  const deadline = Date.now() + Math.max(timeoutMs, 250);
  while (!this.isDisposed && Date.now() < deadline) {
    if (this.isOpen()) return true;
    await this.connect();
    if (this.isOpen()) return true;
    await new Promise(resolve => setTimeout(resolve, 150));
  }
  return this.isOpen();
}
```

`frontend/services/webRTCService.ts`:
```ts
private async ensureSignalingReady(timeoutMs: number = 4500) {
  const isReady = await this.wsService?.waitUntilOpen(timeoutMs);
  if (!isReady) {
    throw new Error('WebSocket signaling socket is not connected');
  }
}
```

## 2026-03-13 (Incoming caller name + post-call feedback timing)

### Измененные файлы
- `frontend/screens/calls/CallScreen.tsx`
- `frontend/services/notificationService.ts`
- `frontend/i18n/locales/en.ts`
- `frontend/i18n/locales/ru.ts`
- `frontend/i18n/locales/hi.ts`

### Суть правки (от старого к новому)
- Было:
  - экран звонка мог показывать generic `User` / `User N`, даже когда профиль контакта уже существует;
  - feedback / donation modal открывался сразу по локальному `hangup`, а не по фактическому завершению созвона;
  - call status, incoming call UI и post-call modal оставались частично на hardcoded English.
- Стало:
  - `CallScreen` догружает профиль собеседника по `targetId` и показывает `spiritualName (karmicName)` там, где раньше был generic fallback;
  - feedback / donation modal открывается из callback окончания звонка `webRTCService.setOnCallEnded(...)`, а не по самому нажатию кнопки;
  - добавлены `calls.status.*`, `calls.actions.*`, `calls.feedback.*` для `ru/en/hi`, плюс push-fallback name теперь берется из `i18n`.

### Сниппеты кода

`frontend/screens/calls/CallScreen.tsx`:
```tsx
const resolvedCallerName = React.useMemo(() => {
  if (participantProfile) {
    return resolveUserCallDisplayName(participantProfile, { fallbackLabel: fallbackUserLabel });
  }
  return String(callerName || '').trim() || t('calls.unknownCaller');
}, [callerName, fallbackUserLabel, participantProfile, t]);
```

```tsx
webRTCService.setOnCallEnded(handleCallEnded);
```

`frontend/services/notificationService.ts`:
```ts
const callerName = String(payload?.callerName || '').trim()
  || i18n.t('calls.incomingCall', { defaultValue: 'Incoming call' });
```

## 2026-03-13 (Portal folder tap responsiveness)

### Измененные файлы
- `frontend/components/portal/DraggablePortalItem.tsx`
- `frontend/components/portal/PortalGrid.tsx`

### Суть правки (от старого к новому)
- Было:
  - в обычном режиме портала tap по папкам и сервисам проходил через общий gesture-wrapper;
  - pan drag был активен всегда и конкурировал с обычным tap-path, из-за чего открытие папок ощущалось более медленным.
- Стало:
  - pan drag включается только в `edit mode`;
  - обычный tap маршрутизируется напрямую в `PortalFolderComponent` и `PortalIcon`;
  - в результате открытие папок и сервисов в обычном режиме происходит быстрее и с меньшей задержкой распознавания жеста.

### Сниппеты кода

`frontend/components/portal/DraggablePortalItem.tsx`:
```tsx
const panGesture = Gesture.Pan()
  .enabled(isEditMode)
  .activateAfterLongPress(260);

const composedGesture = isEditMode
  ? Gesture.Race(tapGesture, Gesture.Simultaneous(secondaryLongPressGesture, panGesture))
  : Gesture.Race(tapGesture, secondaryLongPressGesture);
```

`frontend/components/portal/PortalGrid.tsx`:
```tsx
<PortalFolderComponent
  folder={item}
  isEditMode={isEditMode}
  onPress={pressHandler}
/>
```

## 2026-03-13 (iOS Debug Firebase plist switched to korobkov .dev)

### Измененные файлы
- `frontend/ios/vedamatch/GoogleService-Info.plist`

### Суть правки (от старого к новому)
- Было:
  - локальная personal-team debug-сборка уже использовала bundle id `com.korobkov.vedamatch.dev`;
  - но `frontend/ios/vedamatch/GoogleService-Info.plist` все еще оставался от production Firebase app с `BUNDLE_ID = com.korobkov.vedamatch`;
  - из-за этого iOS приложение устанавливалось, но Google Sign-In не завершал вход.
- Стало:
  - в проект подставлен новый Firebase plist для debug app с `BUNDLE_ID = com.korobkov.vedamatch.dev`;
  - теперь debug bundle id, Google Auth Platform iOS client и Firebase plist согласованы между собой.

### Сниппеты кода

`frontend/ios/vedamatch/GoogleService-Info.plist`:
```plist
<key>BUNDLE_ID</key>
<string>com.korobkov.vedamatch.dev</string>
```

## 2026-03-13 (iOS Personal Team debug signing retry: switch to korobkov .dev and remove debug push entitlement)

### Измененные файлы
- `frontend/ios/vedamatch.xcodeproj/project.pbxproj`
- `frontend/ios/vedamatch.xcodeproj/xcshareddata/xcschemes/vedamatch.xcscheme`

### Суть правки (от старого к новому)
- Было:
  - `Debug` оставался в смешанном состоянии с локальным bundle id `com.makstreid.vedamatch.dev`;
  - debug-конфигурация все еще несла push capability через `APS_ENVIRONMENT`, из-за чего free `Personal Team` не мог выпустить provisioning profile;
  - `Release` тоже был уведен на `.dev`, что путало Xcode signing.
- Стало:
  - `Debug` app target выровнен на `com.korobkov.vedamatch.dev`;
  - `Debug` test target выровнен на `com.korobkov.vedamatch.dev.tests`;
  - из `Debug` удален `APS_ENVIRONMENT`, чтобы personal team могла выпустить install-only debug profile;
  - `Release` возвращен на канонический production bundle id `com.korobkov.vedamatch`.
  - схема запуска `Run` переведена с `Release` на `Debug`, чтобы Xcode на устройстве действительно запускал personal-team debug-сборку, а не production target.

### Сниппеты кода

`frontend/ios/vedamatch.xcodeproj/project.pbxproj`:
```pbxproj
PRODUCT_BUNDLE_IDENTIFIER = com.korobkov.vedamatch.dev;
PRODUCT_BUNDLE_IDENTIFIER = com.korobkov.vedamatch.dev.tests;
PRODUCT_BUNDLE_IDENTIFIER = com.korobkov.vedamatch;
```

`frontend/ios/vedamatch.xcodeproj/xcshareddata/xcschemes/vedamatch.xcscheme`:
```xml
<LaunchAction buildConfiguration = "Debug">
```

## 2026-03-13 (iOS Personal Team debug signing without paid account)

### Измененные файлы
- `frontend/ios/vedamatch.xcodeproj/project.pbxproj`

### Суть правки (от старого к новому)
- Было:
  - и `Debug`, и `Release` app target использовали `PRODUCT_BUNDLE_IDENTIFIER = com.korobkov.vedamatch`;
  - Personal Team не мог зарегистрировать занятый production id, из-за чего Xcode падал на provisioning profile / bundle registration.
- Стало:
  - `Release` оставлен на production id;
  - `Debug` переведен на уникальный локальный id `com.makstreid.vedamatch.dev`;
  - debug test target переведен на `com.makstreid.vedamatch.dev.tests`.

### Сниппеты кода

`frontend/ios/vedamatch.xcodeproj/project.pbxproj`:
```pbxproj
PRODUCT_BUNDLE_IDENTIFIER = com.makstreid.vedamatch.dev;
PRODUCT_BUNDLE_IDENTIFIER = com.makstreid.vedamatch.dev.tests;
```

## 2026-03-12 (iOS social auth: Google callback wired, VK/Telegram state persisted across round-trip)

### Измененные файлы
- `frontend/ios/vedamatch/Info.plist`
- `frontend/ios/vedamatch/AppDelegate.mm`
- `frontend/services/pendingSocialAuthService.ts`
- `frontend/screens/LoginScreen.tsx`
- `frontend/screens/settings/LinkedAccountsScreen.tsx`
- `frontend/i18n/locales/ru.ts`
- `frontend/i18n/locales/en.ts`
- `frontend/i18n/locales/hi.ts`

### Суть правки (от старого к новому)
- Было:
  - iOS target не регистрировал Google callback scheme и не передавал callback URL в `GIDSignIn`;
  - `VK` / `Telegram` mobile auth держали pending `state` только в screen-local состоянии;
  - после ухода во внешнее приложение и возврата через cold start iOS мог потерять текущую auth-сессию и не завершить вход.
- Стало:
  - в `Info.plist` добавлен Google URL scheme, обратный к `GOOGLE_IOS_CLIENT_ID`;
  - `AppDelegate.mm` теперь сначала обрабатывает `openURL` через `GIDSignIn`, потом через `RCTLinkingManager`;
  - pending `VK` / `Telegram` auth state сохраняется в `AsyncStorage` и восстанавливается на `LoginScreen` и `LinkedAccountsScreen`;
  - fallback-сообщение о Google config больше не привязано текстом только к Android.

### Сниппеты кода

`frontend/ios/vedamatch/AppDelegate.mm`:
```objc
- (BOOL)application:(UIApplication *)application
            openURL:(NSURL *)url
            options:(NSDictionary<UIApplicationOpenURLOptionsKey, id> *)options {
  if ([[GIDSignIn sharedInstance] handleURL:url]) {
    return YES;
  }
  return [RCTLinkingManager application:application openURL:url options:options];
}
```

`frontend/services/pendingSocialAuthService.ts`:
```tsx
export const rememberPendingSocialAuthState = async (
  provider: PendingSocialAuthProvider,
  flow: PendingSocialAuthFlow,
  state: string,
): Promise<void> => {
  store[buildEntryKey(provider, flow)] = {
    provider,
    flow,
    state: normalizedState,
    updatedAt: Date.now(),
  };
};
```

`frontend/screens/LoginScreen.tsx`:
```tsx
getPendingSocialAuthState('vk', 'login').then((state) => {
  if (!state) return;
  setVKAuthState((current) => current || state);
});
```

## 2026-03-12 (iOS Firebase config: replaced GoogleService-Info.plist with correct Bundle ID)

### Измененные файлы
- `frontend/ios/vedamatch/GoogleService-Info.plist`

### Суть правки (от старого к новому)
- Было:
  - в корне проекта лежал `GoogleService-Info (2).plist` с `BUNDLE_ID = org.reactjs.native.example.vedamatch`;
  - этот Bundle ID не совпадал с iOS target (`com.korobkov.vedamatch`), из-за чего Google Sign-In не мог работать корректно.
- Стало:
  - взят новый `GoogleService-Info (3).plist` из Firebase с `BUNDLE_ID = com.korobkov.vedamatch`;
  - файл установлен в target-путь `frontend/ios/vedamatch/GoogleService-Info.plist`.

### Сниппеты кода

`frontend/ios/vedamatch/GoogleService-Info.plist`:
```plist
<key>BUNDLE_ID</key>
<string>com.korobkov.vedamatch</string>
```

## 2026-03-12 (Auth/Registration: VPN warning added on entry screens)

### Измененные файлы
- `frontend/screens/LoginScreen.tsx`
- `frontend/screens/RegistrationScreen.tsx`
- `frontend/i18n/locales/ru.ts`
- `frontend/i18n/locales/en.ts`
- `frontend/i18n/locales/hi.ts`

### Суть правки (от старого к новому)
- Было:
  - при включенном VPN регистрация у части пользователей ломалась без явной подсказки на экране;
  - auth/signup flow не объяснял, что VPN может мешать запросам регистрации.
- Стало:
  - на экране входа и на экране регистрации добавлен заметный warning-блок про VPN;
  - пользователь заранее видит рекомендацию отключить VPN или добавить `Veda Match` в исключения VPN;
  - предупреждение локализовано для `ru/en/hi`.

### Сниппеты кода

`frontend/screens/LoginScreen.tsx`:
```tsx
<View style={styles.vpnNotice}>
  <Text style={styles.vpnNoticeTitle}>{t('auth.loginScreen.vpnNotice.title')}</Text>
  <Text style={styles.vpnNoticeText}>{t('auth.loginScreen.vpnNotice.body')}</Text>
</View>
```

`frontend/screens/RegistrationScreen.tsx`:
```tsx
<View style={styles.vpnNotice}>
  <Text style={styles.vpnNoticeTitle}>{t('registration.vpnNotice.title')}</Text>
  <Text style={styles.vpnNoticeText}>{t('registration.vpnNotice.body')}</Text>
</View>
```

## 2026-03-11 (Ads screen: default section switched back to Ads)

### Измененные файлы
- `frontend/screens/portal/ads/AdsScreen.tsx`

### Суть правки (от старого к новому)
- Было:
  - `AdsScreen` открывался с дефолтным режимом `sectionMode='festivals'`;
  - пользователь при входе в сервис сразу попадал во вкладку `Фестивали`.
- Стало:
  - дефолтный режим изменен на `sectionMode='ads'`;
  - при открытии сервиса по умолчанию активен раздел `Объявления`.

### Сниппеты кода

`frontend/screens/portal/ads/AdsScreen.tsx`:
```tsx
const [sectionMode, setSectionMode] = useState<AdsSectionMode>('ads');
```

## 2026-03-11 (Ads screen: explicit back button to Portal)

### Измененные файлы
- `frontend/screens/portal/ads/AdsScreen.tsx`

### Суть правки (от старого к новому)
- Было:
  - экран `Ads` / `Фестивали` не имел явной кнопки возврата в портал в верхнем левом углу;
  - пользователь оставался без быстрого и очевидного способа вернуться в `Portal`.
- Стало:
  - в верхней части `AdsScreen` добавлена круглая кнопка с иконкой `ArrowLeft`;
  - кнопка всегда ведет напрямую в `Portal` через `navigation.navigate('Portal')`;
  - поиск и остальная логика экрана не менялись.

### Сниппеты кода

`frontend/screens/portal/ads/AdsScreen.tsx`:
```tsx
const handleBackToPortal = useCallback(() => {
  navigation.navigate('Portal');
}, [navigation]);
```

```tsx
<TouchableOpacity
  style={styles.portalBackButton}
  onPress={handleBackToPortal}
>
  <ArrowLeft size={18} color={colors.text} />
</TouchableOpacity>
```

## 2026-03-11 (Chat appearance settings: bubble style + chat-only background)

### Измененные файлы
- `frontend/context/SettingsContext.tsx`
- `frontend/screens/settings/AppSettingsScreen.tsx`
- `frontend/components/chat/MessageList.tsx`
- `frontend/i18n/locales/en.ts`
- `frontend/i18n/locales/ru.ts`
- `frontend/i18n/locales/hi.ts`

### Суть правки (от старого к новому)
- Было:
  - пользователь мог настраивать только фон чата;
  - геометрия bubble была одной фиксированной и не менялась из профиля.
- Стало:
  - в профиле появился единый блок `Вид чата`, где можно менять и фон, и стиль bubble;
  - стиль bubble сохраняется локально в `AsyncStorage` через ключ `chat_bubble_style`;
  - `MessageList` применяет один из трех пресетов формы (`soft`, `balanced`, `airy`) к входящим и исходящим сообщениям.

### Сниппеты кода

`frontend/context/SettingsContext.tsx`:
```tsx
export type ChatBubbleStyle = 'soft' | 'balanced' | 'airy';
const [chatBubbleStyle, setChatBubbleStyleState] = useState<ChatBubbleStyle>('soft');
await AsyncStorage.setItem('chat_bubble_style', style);
```

`frontend/screens/settings/AppSettingsScreen.tsx`:
```tsx
{CHAT_BUBBLE_STYLE_OPTIONS.map((option) => (
  <TouchableOpacity onPress={() => { void setChatBubbleStyle(option.key); }} />
))}
```

`frontend/components/chat/MessageList.tsx`:
```tsx
const bubblePreset = useMemo(() => {
  if (chatBubbleStyle === 'airy') return { outerRadius: 34, cornerRadius: 24 };
  if (chatBubbleStyle === 'balanced') return { outerRadius: 26, cornerRadius: 20 };
  return { outerRadius: 30, cornerRadius: 18 };
}, [chatBubbleStyle]);
```

## 2026-03-11 (Chat background: built-in portal wallpapers exposed in settings)

### Измененные файлы
- `frontend/screens/settings/AppSettingsScreen.tsx`
- `frontend/i18n/locales/en.ts`
- `frontend/i18n/locales/ru.ts`
- `frontend/i18n/locales/hi.ts`

### Суть правки (от старого к новому)
- Было:
  - для чата были доступны цвета, градиенты, галерея и slideshow;
  - встроенные фото-обои из portal коллекции не были выведены как прямой selectable блок.
- Стало:
  - в chat appearance добавлен отдельный блок `Built-in wallpapers` / `Встроенные обои`;
  - блок использует те же `WALLPAPER_PRESETS`, что и portal wallpaper collection;
  - выбор собственного фото из галереи оставлен отдельно рядом.

### Сниппеты кода

`frontend/screens/settings/AppSettingsScreen.tsx`:
```tsx
import { SLIDESHOW_INTERVALS, WALLPAPER_PRESETS } from '../../config/wallpaperPresets';
```

```tsx
{WALLPAPER_PRESETS.map((preset) => (
  <TouchableOpacity onPress={() => { void applyChatBackground(preset.uri, 'image'); }} />
))}
```

## 2026-03-10 (Services grid spacing: add side gutters and inter-card gap)

### Измененные файлы
- `frontend/screens/portal/services/ServicesHomeScreen.tsx`
- `frontend/screens/portal/services/components/ServiceCard.tsx`

### Суть правки (от старого к новому)
- Было:
  - двухколоночная сетка услуг рендерилась без `columnWrapperStyle`;
  - карточки визуально прижимались друг к другу и к краям экрана;
  - вертикальный зазор частично задавался `marginBottom` самой карточки, из-за чего spacing был несимметричным.
- Стало:
  - в `ServicesHomeScreen` добавлен `columnWrapperStyle` с `paddingHorizontal: 16` и `marginBottom: 18`;
  - ширина `ServiceCard` пересчитана от реальных внешних полей и межколоночного зазора;
  - `marginBottom` убран из самой grid-карточки, чтобы расстояния задавались уровнем списка и выглядели ровно со всех сторон.

### Сниппеты кода

`frontend/screens/portal/services/ServicesHomeScreen.tsx`:
```tsx
columnWrapperStyle={!isAndroidReducedEffects ? styles.gridRow : undefined}
```

```tsx
gridRow: {
  justifyContent: 'space-between',
  paddingHorizontal: 16,
  marginBottom: 18,
}
```

## 2026-03-12 (Contacts: friend marker moved onto avatar badge)

### Измененные файлы
- `frontend/screens/portal/contacts/ContactsScreen.tsx`

### Суть правки (от старого к новому)
- Было:
  - статус `друг` рисовался текстовым тегом рядом с именем контакта;
  - строка имени становилась перегруженной и хуже переносилась на узких экранах.
- Стало:
  - метка друга перенесена в компактный badge на аватаре, слева-снизу;
  - текстовый tag возле имени убран;
  - список контактов стал чище и стабильнее по ширине.

### Сниппеты кода

`frontend/screens/portal/contacts/ContactsScreen.tsx`:
```tsx
{isFriend && !isBlocked && (
  <View style={styles.friendAvatarBadge}>
    <Check size={10} color="#fff" strokeWidth={3} />
  </View>
)}
```

## 2026-03-12 (Edit profile save flow hardened)

### Измененные файлы
- `frontend/screens/settings/EditProfileScreen.tsx`
- `server/internal/handlers/auth_handler.go`

### Суть правки (от старого к новому)
- Было:
  - `EditProfileScreen` отправлял частично сырой payload, включая `dob` как полный ISO timestamp;
  - после успешного save экран делал `login(updatedUser)`, хотя это не auth-flow;
  - backend `/update-profile` сохранял полный `models.User` через `Save(&user)`, что делало flow чувствительным к лишним полям и DB-конфликтам.
- Стало:
  - frontend нормализует payload (`trim`, `dob` как `YYYY-MM-DD`) и обновляет локальный user через `updateUserProfile`;
  - backend сохраняет только явные profile-поля через `Updates(map)`;
  - при DB-конфликте backend возвращает `409 profile_conflict`, а при общем сбое — `profile_update_failed`.

### Сниппеты кода

`frontend/screens/settings/EditProfileScreen.tsx`:
```tsx
const normalizedDob = Number.isNaN(dob.getTime()) ? '' : dob.toISOString().split('T')[0];
await updateUserProfile(updatedUser);
```

`server/internal/handlers/auth_handler.go`:
```go
if err := database.DB.Model(&user).Updates(updates).Error; err != nil {
  return c.Status(fiber.StatusConflict).JSON(fiber.Map{"code": "profile_conflict"})
}
```

`frontend/screens/portal/services/components/ServiceCard.tsx`:
```tsx
const GRID_HORIZONTAL_PADDING = 16;
const GRID_GAP = 14;
const CARD_WIDTH = (width - (GRID_HORIZONTAL_PADDING * 2) - GRID_GAP) / 2;
```

## 2026-03-08 (Portal service visibility control added to shared mobile portal runtime)

### Измененные файлы
- `server/internal/models/portal_service_visibility.go`
- `server/internal/handlers/portal_service_visibility.go`
- `server/internal/database/database.go`
- `server/cmd/api/main.go`
- `admin/src/app/settings/page.tsx`
- `frontend/types/portal.ts`
- `frontend/services/portalLayoutService.ts`
- `frontend/context/PortalLayoutContext.tsx`
- `frontend/screens/portal/PortalMainScreen.tsx`
- `frontend/screens/portal/WidgetSelectionScreen.tsx`

### Суть правки (от старого к новому)
- Было:
  - mobile portal всегда рендерил сервисы только из локального каталога и сохраненного layout;
  - админка не могла централизованно скрыть проблемный сервис без новой сборки;
  - `beta`-доступ по тестовым `userId` для сервисов портала отсутствовал;
  - deep-link/portal launch path не умел мягко блокировать скрытый сервис.
- Стало:
  - backend получил отдельную таблицу `portal_service_visibility` и admin/runtime API для effective visibility map;
  - admin settings page теперь умеет управлять `Visible / Beta / Hidden`, allowlist и maintenance message по каждому `serviceId`;
  - mobile `PortalLayoutContext` загружает runtime visibility map и фильтрует grid / folders / quick access до рендера;
  - `PortalMainScreen` и `WidgetSelectionScreen` блокируют запуск скрытого сервиса и показывают fallback alert с maintenance message;
  - поведение едино на iOS и Android, потому что используется shared React Native portal runtime.

### Сниппеты кода

`server/cmd/api/main.go`:
```go
admin.Get("/portal/services/visibility", adminHandler.GetPortalServiceVisibility)
admin.Put("/portal/services/visibility", adminHandler.UpdatePortalServiceVisibility)
protected.Get("/system/portal-services-visibility", systemHandler.GetPortalServiceVisibility)
```

`frontend/services/portalLayoutService.ts`:
```ts
export const fetchPortalServiceVisibility = async (): Promise<PortalServiceVisibilityMap> => {
  const response = await apiClient.get('/system/portal-services-visibility', { headers });
  return response.data?.services as PortalServiceVisibilityMap;
};
```

`frontend/context/PortalLayoutContext.tsx`:
```ts
const visibilityMap = await fetchPortalServiceVisibility();
const savedLayout = await initializeLayout(role, blueprint, visibilityMap);
const filteredLayout = filterLayoutByPortalVisibility(layoutWithCircles, visibilityMap);
```

`frontend/screens/portal/PortalMainScreen.tsx`:
```ts
if (!isServiceVisible(serviceId)) {
  showServiceUnavailableAlert(serviceId);
  return;
}
```
## 2026-03-08 (Portal service visibility control added to shared mobile portal runtime)

### Измененные файлы
- `server/internal/models/portal_service_visibility.go`
- `server/internal/handlers/portal_service_visibility.go`
- `server/internal/database/database.go`
- `server/cmd/api/main.go`
- `admin/src/app/settings/page.tsx`
- `frontend/types/portal.ts`
- `frontend/services/portalLayoutService.ts`
- `frontend/context/PortalLayoutContext.tsx`
- `frontend/screens/portal/PortalMainScreen.tsx`
- `frontend/screens/portal/WidgetSelectionScreen.tsx`

### Суть правки (от старого к новому)
- Было:
  - mobile portal всегда рендерил сервисы только из локального каталога и сохраненного layout;
  - админка не могла централизованно скрыть проблемный сервис без новой сборки;
  - `beta`-доступ по тестовым `userId` для сервисов портала отсутствовал;
  - deep-link/portal launch path не умел мягко блокировать скрытый сервис.
- Стало:
  - backend получил отдельную таблицу `portal_service_visibility` и admin/runtime API для effective visibility map;
  - admin settings page теперь умеет управлять `Visible / Beta / Hidden`, allowlist и maintenance message по каждому `serviceId`;
  - mobile `PortalLayoutContext` загружает runtime visibility map и фильтрует grid / folders / quick access до рендера;
  - `PortalMainScreen` и `WidgetSelectionScreen` блокируют запуск скрытого сервиса и показывают fallback alert с maintenance message;
  - поведение едино на iOS и Android, потому что используется shared React Native portal runtime.

### Сниппеты кода

`server/cmd/api/main.go`:
```go
admin.Get("/portal/services/visibility", adminHandler.GetPortalServiceVisibility)
admin.Put("/portal/services/visibility", adminHandler.UpdatePortalServiceVisibility)
protected.Get("/system/portal-services-visibility", systemHandler.GetPortalServiceVisibility)
```

`frontend/services/portalLayoutService.ts`:
```ts
export const fetchPortalServiceVisibility = async (): Promise<PortalServiceVisibilityMap> => {
  const response = await apiClient.get('/system/portal-services-visibility', { headers });
  return response.data?.services as PortalServiceVisibilityMap;
};
```

`frontend/context/PortalLayoutContext.tsx`:
```ts
const visibilityMap = await fetchPortalServiceVisibility();
const savedLayout = await initializeLayout(role, blueprint, visibilityMap);
const filteredLayout = filterLayoutByPortalVisibility(layoutWithCircles, visibilityMap);
```

`frontend/screens/portal/PortalMainScreen.tsx`:
```ts
if (!isServiceVisible(serviceId)) {
  showServiceUnavailableAlert(serviceId);
  return;
}
```
# IOS Changes For Migration

## 2026-03-10 (Library moved to native stack, knowledge base shortcut aligned)

### Измененные файлы
- `frontend/types/navigation.ts`
- `frontend/screens/portal/serviceLaunchResolver.ts`
- `frontend/screens/portal/PortalMainScreen.tsx`
- `frontend/App.tsx`

### Суть правки (от старого к новому)
- Было:
  - `library` открывался как embedded-tab внутри `PortalMainScreen`;
  - shortcut `knowledge_base` тоже вел в embedded `library`;
  - возврат назад требовал тяжелого portal rerender.
- Стало:
  - `library` теперь идет в отдельный native stack route `LibraryHome`;
  - `knowledge_base` выровнен и ведет в тот же `LibraryHome`;
  - `PortalMainScreen` больше не рендерит `LibraryHomeScreen` как `activeTab`.

### Сниппеты кода

`frontend/screens/portal/serviceLaunchResolver.ts`:
```ts
if (serviceId === 'library') {
  return { kind: 'navigate', screen: 'LibraryHome' };
}

if (serviceId === 'knowledge_base') {
  return { kind: 'navigate', screen: 'LibraryHome' };
}
```

`frontend/App.tsx`:
```ts
<Stack.Screen name="LibraryHome" component={LibraryHomeScreen} options={{ headerShown: false }} />
```

## 2026-03-10 (Library first-paint optimization after stack migration)

### Измененные файлы
- `frontend/screens/library/LibraryHomeScreen.tsx`

### Суть правки (от старого к новому)
- Было:
  - `LibraryHomeScreen` ждал не только каталог книг, но и офлайн-статусы/размеры, что удлиняло первый paint;
  - карточки книг всегда рендерились с `BlurView` и `LinearGradient`, что особенно тяжело для Android;
  - список не имел отдельного Android fast-path по виртуализации.
- Стало:
  - secondary загрузка офлайн-статусов отложена через `InteractionManager.runAfterInteractions`;
  - карточки книг вынесены в memoized `BookCard`;
  - Android получил reduced-visuals path без blur/gradient overlays и более жесткую list virtualization.

### Сниппеты кода

`frontend/screens/library/LibraryHomeScreen.tsx`:
```ts
const task = InteractionManager.runAfterInteractions(() => {
  void loadSavedBooksInfo();
});
```

```ts
const reducedVisuals = Platform.OS === 'android';
```

```ts
removeClippedSubviews={Platform.OS === 'android'}
initialNumToRender={listTuning.initialNumToRender}
maxToRenderPerBatch={listTuning.maxToRenderPerBatch}
```

## 2026-03-10 (Education moved to native stack like library and news)

### Измененные файлы
- `frontend/screens/portal/serviceLaunchResolver.ts`
- `frontend/screens/portal/PortalMainScreen.tsx`

### Суть правки (от старого к новому)
- Было:
  - `education` открывался как embedded-tab внутри `PortalMainScreen`;
  - возврат назад требовал повторного portal rerender внутри того же shell.
- Стало:
  - shortcut `education` теперь ведет в отдельный native stack route `EducationHome`;
  - `PortalMainScreen` больше не рендерит `EducationHomeScreen` как `activeTab`;
  - возврат из обучения теперь идет по обычному stack back path.

### Сниппеты кода

`frontend/screens/portal/serviceLaunchResolver.ts`:
```ts
if (serviceId === 'education') {
  return { kind: 'navigate', screen: 'EducationHome' };
}
```

`frontend/screens/portal/PortalMainScreen.tsx`:
```ts
if (screen === 'EducationHome') {
  navigation.navigate('EducationHome');
  return;
}
```

## 2026-03-10 (Travel moved to native stack like education)

### Измененные файлы
- `frontend/screens/portal/serviceLaunchResolver.ts`
- `frontend/screens/portal/PortalMainScreen.tsx`

### Суть правки (от старого к новому)
- Было:
  - `travel` открывался как embedded-tab внутри `PortalMainScreen`;
  - возврат назад требовал повторного portal rerender внутри того же shell.
- Стало:
  - shortcut `travel` теперь ведет в отдельный native stack route `TravelHome`;
  - `PortalMainScreen` больше не рендерит `TravelHomeScreen` как `activeTab`;
  - возврат из travel теперь идет по обычному stack back path.

### Сниппеты кода

`frontend/screens/portal/serviceLaunchResolver.ts`:
```ts
if (serviceId === 'travel') {
  return { kind: 'navigate', screen: 'TravelHome' };
}
```

`frontend/screens/portal/PortalMainScreen.tsx`:
```ts
if (screen === 'TravelHome') {
  navigation.navigate('TravelHome');
  return;
}
```

## 2026-03-10 (Travel first-paint optimization after stack migration)

### Измененные файлы
- `frontend/screens/portal/travel/TravelHomeScreen.tsx`

### Суть правки (от старого к новому)
- Было:
  - `TravelHomeScreen` держал тяжелые travel/stay cards с image badges и нестабильными render callbacks;
  - header и empty-state пересоздавались вместе с list props, а Android не имел отдельного fast-path по виртуализации.
- Стало:
  - `YatraCard` и `ShelterCard` вынесены в memoized components;
  - Android получил reduced-visuals path без secondary badges поверх изображений и с более короткой card image;
  - list/header/refresh callbacks стабилизированы, а list virtualization усилена через `initialNumToRender`, `maxToRenderPerBatch`, `windowSize`, `updateCellsBatchingPeriod`, `estimatedItemSize`.

### Сниппеты кода

`frontend/screens/portal/travel/TravelHomeScreen.tsx`:
```ts
const reducedVisuals = Platform.OS === 'android';
```

```ts
const listTuning = reducedVisuals
  ? { initialNumToRender: 3, maxToRenderPerBatch: 3, windowSize: 4, updateCellsBatchingPeriod: 80, estimatedItemSize: 320 }
  : { initialNumToRender: 5, maxToRenderPerBatch: 5, windowSize: 6, updateCellsBatchingPeriod: 50, estimatedItemSize: 360 };
```

```ts
{!reducedVisuals && item.sevaExchange && (
  <View style={[styles.cardBadge, styles.sevaBadge, { backgroundColor: colors.danger }]}>
```

## 2026-03-10 (Ads moved to native stack like travel and education)

### Измененные файлы
- `frontend/screens/portal/serviceLaunchResolver.ts`
- `frontend/screens/portal/PortalMainScreen.tsx`

### Суть правки (от старого к новому)
- Было:
  - `ads` открывался как embedded-tab внутри `PortalMainScreen`;
  - возврат назад требовал повторного portal rerender внутри того же shell.
- Стало:
  - shortcut `ads` теперь ведет в отдельный native stack route `Ads`;
  - `PortalMainScreen` больше не рендерит `AdsScreen` как `activeTab`;
  - возврат из объявлений теперь идет по обычному stack back path.

### Сниппеты кода

`frontend/screens/portal/serviceLaunchResolver.ts`:
```ts
if (serviceId === 'ads') {
  return { kind: 'navigate', screen: 'Ads' };
}
```

`frontend/screens/portal/PortalMainScreen.tsx`:
```ts
if (screen === 'Ads') {
  navigation.navigate('Ads');
  return;
}
```

## 2026-03-10 (News moved to native stack like cafe, dating and contacts)

### Измененные файлы
- `frontend/types/navigation.ts`
- `frontend/screens/portal/serviceLaunchResolver.ts`
- `frontend/screens/portal/PortalMainScreen.tsx`
- `frontend/App.tsx`

### Суть правки (от старого к новому)
- Было:
  - `news` открывался как embedded-tab внутри `PortalMainScreen`;
  - возврат назад требовал тяжелого portal rerender.
- Стало:
  - shortcut `news` теперь идет в отдельный native stack route `NewsHome`;
  - `PortalMainScreen` больше не рендерит `NewsScreen` как `activeTab`;
  - возврат из новостей теперь идет по обычному stack back path.

### Сниппеты кода

`frontend/screens/portal/serviceLaunchResolver.ts`:
```ts
if (serviceId === 'news') {
  return { kind: 'navigate', screen: 'NewsHome' };
}
```

`frontend/App.tsx`:
```ts
<Stack.Screen name="NewsHome" component={NewsScreen} options={{ headerShown: false }} />
```

## 2026-03-10 (Cafe list first-paint optimization after stack migration)

### Измененные файлы
- `frontend/screens/portal/cafe/CafeListScreen.tsx`

### Суть правки (от старого к новому)
- Было:
  - `CafeListScreen` держал `filters` в state, поэтому pagination/search reset провоцировали лишние rerender'ы всей шапки и списка;
  - secondary запрос `getMyCafe()` запускался сразу на mount и мог конкурировать с first paint;
  - Android и iOS использовали одинаковую виртуализацию списка, хотя для Android нужен более жесткий fast-path.
- Стало:
  - pagination filters переведены в `ref`, а UI sort оставлен в отдельном state;
  - `getMyCafe()` отложен через `InteractionManager.runAfterInteractions`;
  - footer/empty components и `keyExtractor` стабилизированы;
  - Android получил более агрессивные list virtualization параметры, чем iOS.
  - Android `CafeCard` получил reduced-visuals path: простой overlay вместо gradient и меньше secondary badges/logo.

### Сниппеты кода

`frontend/screens/portal/cafe/CafeListScreen.tsx`:
```ts
const filtersRef = useRef<CafeFilters>({
  sort: 'rating',
  page: 1,
  limit: 20,
});
```

```ts
const task = InteractionManager.runAfterInteractions(() => {
  checkMyCafe();
});
```

```ts
const listTuning = Platform.OS === 'android'
  ? { initialNumToRender: 4, maxToRenderPerBatch: 4, windowSize: 5, updateCellsBatchingPeriod: 80 }
  : { initialNumToRender: 6, maxToRenderPerBatch: 8, windowSize: 7, updateCellsBatchingPeriod: 50 };
```

```ts
{reducedVisuals ? <View style={styles.cardImageOverlayReduced} /> : <LinearGradient ... />}
```

## 2026-03-10 (Cafe moved to native stack like contacts, calls, dating and multimedia)

### Измененные файлы
- `frontend/types/navigation.ts`
- `frontend/screens/portal/serviceLaunchResolver.ts`
- `frontend/screens/portal/PortalMainScreen.tsx`
- `frontend/App.tsx`

### Суть правки (от старого к новому)
- Было:
  - `cafe` открывался как embedded-tab внутри `PortalMainScreen`;
  - возврат назад шел через тяжелый portal rerender;
  - это повышало риск лагов и блокировки `Portal` после выхода из кафе.
- Стало:
  - shortcut `cafe` теперь идет в отдельный native stack route `CafeHome`;
  - `PortalMainScreen` больше не рендерит `CafeListScreen` как `activeTab`;
  - возврат из `CafeListScreen` снова идет как обычный stack back path.

### Сниппеты кода

`frontend/screens/portal/serviceLaunchResolver.ts`:
```ts
if (serviceId === 'cafe') {
  return { kind: 'navigate', screen: 'CafeHome' };
}
```

`frontend/App.tsx`:
```ts
<Stack.Screen name="CafeHome" component={CafeListScreen} options={{ headerShown: false }} />
```

## 2026-03-10 (Dating moved to native stack like contacts, calls and multimedia)

### Измененные файлы
- `frontend/types/navigation.ts`
- `frontend/screens/portal/serviceLaunchResolver.ts`
- `frontend/screens/portal/PortalMainScreen.tsx`
- `frontend/App.tsx`

### Суть правки (от старого к новому)
- Было:
  - `dating` открывался как embedded-tab внутри `PortalMainScreen`;
  - возврат назад требовал тяжелого portal rerender;
  - это повышало риск лагов и блокировки `Portal` после возврата.
- Стало:
  - shortcut `dating` теперь идет в отдельный native stack route `DatingHome`;
  - `PortalMainScreen` больше не рендерит `DatingScreen` как `activeTab`;
  - возврат из `DatingScreen` снова идет как обычный stack back path.

### Сниппеты кода

`frontend/screens/portal/serviceLaunchResolver.ts`:
```ts
if (serviceId === 'dating') {
  return { kind: 'navigate', screen: 'DatingHome' };
}
```

`frontend/App.tsx`:
```ts
<Stack.Screen name="DatingHome" component={DatingScreen} options={{ headerShown: false }} />
```

## 2026-03-10 (Call history moved to native stack like contacts and services catalog)

### Измененные файлы
- `frontend/App.tsx`
- `frontend/screens/settings/EditProfileScreen.tsx`
- `frontend/types/navigation.ts`
- `frontend/screens/portal/serviceLaunchResolver.ts`
- `frontend/screens/portal/PortalMainScreen.tsx`
- `frontend/screens/calls/CallHistoryScreen.tsx`

### Суть правки (от старого к новому)
- Было:
  - `calls` открывался как embedded `activeTab` внутри `PortalMainScreen`;
  - на экране истории звонков одновременно могли рендериться portal service-header и собственная стрелка экрана;
  - возврат в портал отличался по поведению от `Dhama` и `ContactsHome`.
- Стало:
  - shortcut `calls` теперь ведет в отдельный native stack screen `CallsHome`;
  - `PortalMainScreen` больше не рендерит `CallHistoryScreen` как embedded-tab;
  - `CallHistoryScreen` использует только свою стрелку назад и fallback-навигацию в `Portal`, если stack-back недоступен;
  - в правой части header добавлен быстрый переход в `ContactsHome`, чтобы связанный contacts-flow открывался без возврата в портал.

### Сниппеты кода

`frontend/screens/portal/serviceLaunchResolver.ts`:
```ts
if (serviceId === 'calls') {
  return { kind: 'navigate', screen: 'CallsHome' };
}
```

`frontend/App.tsx`:
```tsx
<Stack.Screen name="CallsHome" component={CallHistoryScreen} options={{ headerShown: false }} />
```

`frontend/screens/calls/CallHistoryScreen.tsx`:
```tsx
if (navigation.canGoBack()) {
  navigation.goBack();
  return;
}
navigation.navigate('Portal', { resetToGridAt: Date.now() });
```

## 2026-03-10 (Multimedia moved out of embedded portal tab into native stack route)

### Измененные файлы
- `frontend/screens/portal/serviceLaunchResolver.ts`
- `frontend/screens/portal/PortalMainScreen.tsx`
- `frontend/__tests__/screens/portal/serviceLaunchResolver.test.ts`
- `frontend/__tests__/screens/portal/PortalMainScreen.test.tsx`

### Суть правки (от старого к новому)
- Было:
  - `multimedia` открывался как embedded `activeTab` внутри `PortalMainScreen`;
  - возврат в портал проходил через внутренний rerender portal-shell, а не через stack back;
  - это оставляло тот же structural-risk на лаг возврата, что раньше был у `contacts` и `calls`.
- Стало:
  - shortcut `multimedia` теперь ведет в уже существующий stack screen `MultimediaHub`;
  - `PortalMainScreen` больше не рендерит `MultimediaHubScreen` как embedded-tab;
  - возврат из мультимедиа теперь идет через обычный stack path, без удержания мультимедийного экрана внутри portal activeTab.

### Сниппеты кода

`frontend/screens/portal/serviceLaunchResolver.ts`:
```ts
if (serviceId === 'multimedia') {
  return { kind: 'navigate', screen: 'MultimediaHub' };
}
```

`frontend/screens/portal/PortalMainScreen.tsx`:
```ts
if (screen === 'MultimediaHub') {
  navigation.navigate('MultimediaHub');
  return;
}
```

## 2026-03-10 (Shops moved out of embedded portal tab into market stack route)

### Измененные файлы
- `frontend/screens/portal/serviceLaunchResolver.ts`
- `frontend/screens/portal/PortalMainScreen.tsx`
- `frontend/__tests__/screens/portal/serviceLaunchResolver.test.ts`
- `frontend/__tests__/screens/portal/PortalMainScreen.test.tsx`

### Суть правки (от старого к новому)
- Было:
  - `shops` открывался как embedded `activeTab` внутри `PortalMainScreen`;
  - возврат в портал проходил через внутренний rerender portal-shell;
  - на тяжелом market home это оставляло тот же perf-risk, что раньше был у `contacts`, `calls` и `multimedia`.
- Стало:
  - shortcut `shops` теперь ведет в существующий stack screen `MarketHome`;
  - `PortalMainScreen` больше не рендерит `MarketHomeScreen` как embedded-tab;
  - возврат из market home теперь идет через stack navigation, без удержания market экрана внутри portal activeTab.

### Сниппеты кода

`frontend/screens/portal/serviceLaunchResolver.ts`:
```ts
if (serviceId === 'shops') {
  return { kind: 'navigate', screen: 'MarketHome' };
}
```

`frontend/screens/portal/PortalMainScreen.tsx`:
```ts
if (screen === 'MarketHome') {
  navigation.navigate('MarketHome');
  return;
}
```

## 2026-03-08 (EditProfile role carousel no longer triggers accidental swipe-back to portal)

### Измененные файлы
- `frontend/App.tsx`

### Суть правки (от старого к новому)
- Было:
  - на экране `EditProfile` iOS native-stack принимал системный `swipe back`;
  - в секции выбора роли (`Искатель`, `В благости`, `Йог`, `Преданный`) горизонтальный свайп мог случайно интерпретироваться как уход назад;
  - из-за этого пользователь мог непреднамеренно вернуться в `Portal`, пока листал карточки ролей.
- Стало:
  - для route `EditProfile` отключены `gestureEnabled`, `fullScreenGestureEnabled` и `animationMatchesGesture`;
  - внутри `EditProfileScreen` эти же опции дополнительно продублированы через `navigation.setOptions(...)`;
  - горизонтальная карусель ролей больше не конфликтует с iOS back gesture;
  - возврат со страницы остается только через явные UI-действия (`Отмена`, успешное сохранение, программный `goBack`).

### Сниппеты кода

`frontend/App.tsx`:
```tsx
<Stack.Screen
  name="EditProfile"
  component={EditProfileScreen}
  options={{
    gestureEnabled: false,
    fullScreenGestureEnabled: false,
    animationMatchesGesture: false,
  }}
/>
```

## 2026-03-08 (Dhama collections added to shared mobile discovery flow)

### Измененные файлы
- `frontend/types/navigation.ts`
- `frontend/types/dhama.ts`
- `frontend/services/dhamaService.ts`
- `frontend/screens/dhama/DhamaHomeScreen.tsx`
- `frontend/screens/dhama/DhamaMapScreen.tsx`
- `frontend/screens/dhama/HolyPlaceDetailScreen.tsx`
- `frontend/i18n/locales/ru.ts`
- `frontend/i18n/locales/en.ts`
- `frontend/i18n/locales/hi.ts`

### Суть правки (от старого к новому)
- Было:
  - mobile `Dhama` умел показывать только flat-catalog мест, карту и detail конкретного места;
  - у sacred places не было thematic grouping layer поверх каталога;
  - из карточки места нельзя было перейти в curated подборку схожих/связанных святых мест;
  - карта `Dhama` всегда показывала один и тот же общий набор markers без контекстного фильтра.
- Стало:
  - mobile получил typed support для `Dhama collections` через новый public endpoint `GET /api/dhama/collections`;
  - `DhamaHome` теперь показывает горизонтальную секцию тематических подборок и умеет фильтровать каталог по выбранной подборке;
  - `DhamaMap` принимает optional `collectionSlug` и показывает markers только по активной подборке;
  - `HolyPlaceDetail` показывает chips подборок, в которые входит место, и может увести пользователя назад в `DhamaHome` уже с активным collection context;
  - локали `ru/en/hi` расширены новым UI-ключом `dhama.collections`, поэтому shared mobile behavior одинаково покрыт на iOS и Android.

### Сниппеты кода

`frontend/types/navigation.ts`:
```ts
DhamaHome: { collectionSlug?: string; collectionTitle?: string } | undefined;
DhamaMap: { collectionSlug?: string } | undefined;
```

`frontend/services/dhamaService.ts`:
```ts
async getCollections(): Promise<DhamaCollectionListResponse> {
  const response = await apiClient.get('/dhama/collections', { params: { limit: 20 } });
  return {
    ...response.data,
    collections: Array.isArray(response.data?.collections)
      ? response.data.collections.map((collection: Partial<DhamaCollection>) => normalizeDhamaCollection(collection))
      : [],
  };
}
```

`frontend/screens/dhama/DhamaHomeScreen.tsx`:
```ts
dhamaService.getPlaces({ search, collection: selectedCollectionSlug || undefined, limit: 50 })
```

```tsx
onPress={() => setSelectedCollectionSlug((current) => (current === item.slug ? null : item.slug))}
```

`frontend/screens/dhama/DhamaMapScreen.tsx`:
```ts
dhamaService.getMapMarkers({ collection: route.params?.collectionSlug, limit: 200 })
```

`frontend/screens/dhama/HolyPlaceDetailScreen.tsx`:
```tsx
onPress={() => navigation.navigate('DhamaHome', { collectionSlug: collection.slug, collectionTitle: collection.title })}
```

## 2026-03-08 (Dhama map logo overlay now blocks attribution link taps)

### Измененные файлы
- `frontend/screens/dhama/DhamaMapScreen.tsx`

### Суть правки (от старого к новому)
- Было:
  - overlay с логотипом на `DhamaMap` был маленьким и стоял поверх attribution только визуально;
  - из-за `pointerEvents="none"` тапы проходили сквозь логотип в `WebView`, и ссылка под ним оставалась интерактивной;
  - часть текста attribution все еще выглядывала слева снизу.
- Стало:
  - overlay расширен до более широкой нижней правой маски;
  - вместо пассивного `View` теперь используется `Pressable` с no-op handler, поэтому тап в этот угол больше не проходит в `WebView`;
  - логотип прижат вправо внутри широкой маски, а сама маска лучше перекрывает attribution area на iOS и Android;
  - затем маска была дополнительно сужена, чтобы занимать меньше места, но сохранить блокировку attribution-link tap в углу карты;
  - после этого логотип был возвращен почти к прежнему размеру, а уменьшена уже только ширина самой подложки, чтобы угол выглядел компактнее без уменьшения брендинга.

### Сниппеты кода

`frontend/screens/dhama/DhamaMapScreen.tsx`:
```tsx
<Pressable onPress={() => {}} style={[styles.logoOverlay, styles.logoOverlaySurface, { borderColor: vTheme.colors.divider }]}>
  <Image source={require('../../assets/logo_tilak_booton.png')} style={styles.logoImage} resizeMode="contain" />
</Pressable>
```

## 2026-03-08 (Dhama collections now open a dedicated mobile detail screen)

### Измененные файлы
- `frontend/App.tsx`
- `frontend/types/navigation.ts`
- `frontend/services/dhamaService.ts`
- `frontend/screens/dhama/DhamaHomeScreen.tsx`
- `frontend/screens/dhama/DhamaCollectionDetailScreen.tsx`
- `frontend/screens/dhama/HolyPlaceDetailScreen.tsx`
- `frontend/screens/dhama/index.ts`
- `frontend/i18n/locales/ru.ts`
- `frontend/i18n/locales/en.ts`
- `frontend/i18n/locales/hi.ts`
- `server/internal/services/dhama_service.go`
- `server/internal/handlers/dhama_handler.go`
- `server/cmd/api/main.go`

### Суть правки (от старого к новому)
- Было:
  - `Dhama collections` существовали в mobile только как горизонтальные карточки и chips;
  - нажатие по подборке фактически использовалось как фильтр списка, но не открывало полноценную editorial страницу;
  - у mobile не было route для detail экрана подборки;
  - backend не отдавал public detail по `collection slug`.
- Стало:
  - добавлен новый route `DhamaCollectionDetail`;
  - backend теперь поддерживает `GET /api/dhama/collections/:slug`;
  - `DhamaHome` открывает отдельный экран подборки, а фильтрация списка вынесена в отдельную кнопку внутри collection card;
  - `HolyPlaceDetail` chips теперь ведут в полноценный `collection detail screen`;
  - на новом экране подборки пользователь может:
    - открыть карту только по этой подборке;
    - открыть отфильтрованный список мест подборки;
    - перейти в detail любого места внутри подборки.

### Сниппеты кода

`frontend/types/navigation.ts`:
```ts
DhamaCollectionDetail: { slug: string };
```

`server/cmd/api/main.go`:
```go
dhama.Get("/collections/:slug", dhamaHandler.GetCollection)
```

`frontend/services/dhamaService.ts`:
```ts
async getCollection(slug: string): Promise<DhamaCollection> {
  const response = await apiClient.get(`/dhama/collections/${slug}`);
  return normalizeDhamaCollection(response.data);
}
```

`frontend/screens/dhama/DhamaHomeScreen.tsx`:
```tsx
onPress={() => navigation.navigate('DhamaCollectionDetail', { slug: item.slug })}
```

`frontend/screens/dhama/HolyPlaceDetailScreen.tsx`:
```tsx
onPress={() => navigation.navigate('DhamaCollectionDetail', { slug: collection.slug })}
```

## 2026-03-08 (Dhama collection detail screen upgraded from simple list to richer editorial layout)

### Измененные файлы
- `frontend/screens/dhama/DhamaCollectionDetailScreen.tsx`
- `frontend/i18n/locales/ru.ts`
- `frontend/i18n/locales/en.ts`
- `frontend/i18n/locales/hi.ts`

### Суть правки (от старого к новому)
- Было:
  - экран подборки был функциональным, но очень плоским;
  - пользователь видел только title, description, две CTA-кнопки и простой вертикальный список мест;
  - если у подборки не было hero image, верх экрана выглядел пусто;
  - подборка не давала быстрого ощущения масштаба и структуры.
- Стало:
  - экран получил richer editorial composition без изменения backend schema;
  - если у подборки нет hero image, показывается branded fallback hero block с title;
  - добавлены summary cards: число мест, число регионов, число featured places;
  - добавлен quick-access horizontal row по местам;
  - добавлена lead place card для главного места подборки;
  - основной список мест теперь визуально богаче и показывает featured badge;
  - локали `ru/en/hi` расширены новыми `dhama.*` ключами для stats, quick access и поясняющего текста.

### Сниппеты кода

`frontend/screens/dhama/DhamaCollectionDetailScreen.tsx`:
```tsx
const uniqueStates = useMemo(
  () => Array.from(new Set(places.map((place) => place.state).filter(Boolean))),
  [places],
);
```

```tsx
{collection.heroImageUrl ? (
  <Image source={{ uri: collection.heroImageUrl }} style={styles.hero} />
) : (
  <View style={[styles.heroFallback, { backgroundColor: vTheme.colors.surfaceElevated, borderColor: vTheme.colors.divider }]}>
    <Text style={[styles.heroFallbackEyebrow, { color: vTheme.colors.primary }]}>{t('dhama.collectionLabel')}</Text>
    <Text style={[styles.heroFallbackTitle, { color: vTheme.colors.text }]}>{collection.title}</Text>
  </View>
)}
```

```tsx
<Text style={[styles.statLabel, { color: vTheme.colors.textSecondary }]}>{t('dhama.stats.places')}</Text>
```

```ts
logoOverlay: {
  right: 0,
  bottom: 0,
  width: 82,
  height: 50,
  alignItems: 'flex-end',
  paddingLeft: 6,
  paddingRight: 5,

## 2026-03-08 (Dhama map header spacing and Dhama localization cleanup on mobile)

### Измененные файлы
- `frontend/screens/dhama/DhamaMapScreen.tsx`
- `frontend/screens/dhama/DhamaHomeScreen.tsx`
- `frontend/screens/dhama/HolyPlaceDetailScreen.tsx`

### Суть правки (от старого к новому)
- Было:
  - на `DhamaMap` заголовок визуально прилипал к back button, особенно заметно на iPhone;
  - в hero `DhamaHome` оставался raw string `Dhama`, минуя локализацию;
  - в `HolyPlaceDetail` тип места мог показываться как техническое backend-значение вроде `holy_town`.
- Стало:
  - у шапки `DhamaMap` добавлен явный нижний отступ после top bar и выровнен line-height заголовка/подзаголовка;
  - hero eyebrow на `DhamaHome` теперь идет через `t('dhama.homeTitle')`;
  - `HolyPlaceDetail` локализует `placeType` через `dhama.filterValues.placeType.*`, а для неизвестных значений показывает humanized fallback вместо raw enum.

### Сниппеты кода

`frontend/screens/dhama/DhamaMapScreen.tsx`:
```tsx
topBar: { alignItems: 'flex-start', marginBottom: 18 },
title: { fontSize: 26, fontWeight: '800', lineHeight: 32 },
subtitle: { fontSize: 14, lineHeight: 21, marginTop: 2, marginBottom: 4 },
```

`frontend/screens/dhama/DhamaHomeScreen.tsx`:
```tsx
<Text style={styles.heroEyebrow}>
  {selectedCollection ? t('dhama.collectionLabel') : t('dhama.homeTitle')}
</Text>
```

`frontend/screens/dhama/HolyPlaceDetailScreen.tsx`:
```tsx
const localizedPlaceType = normalizedPlaceType
  ? t(`dhama.filterValues.placeType.${normalizedPlaceType}`, { defaultValue: humanizeDhamaValue(place.placeType) })
  : '';
```

## 2026-03-09 (Dhama hero title no longer repeats and back button aligns with main heading)

### Измененные файлы
- `frontend/screens/dhama/DhamaHomeScreen.tsx`

### Суть правки (от старого к новому)
- Было:
  - в hero на `DhamaHome` слово `Dhama` могло визуально повторяться и в eyebrow, и в title;
  - back button жила отдельным вертикальным блоком выше текста, из-за чего стрелка не стояла на линии основного заголовка.
- Стало:
  - если активной подборки нет, eyebrow больше не дублирует основной title;
  - back button встроена в один hero header row рядом с названием;
  - subtitle вынесен ниже header row, поэтому шапка выглядит как одна цельная композиция.

### Сниппеты кода

`frontend/screens/dhama/DhamaHomeScreen.tsx`:
```tsx
<View style={styles.heroHeaderRow}>
  <DhamaBackButton navigation={navigation} />
  <View style={styles.heroTextWrap}>
    {selectedCollection ? <Text style={styles.heroEyebrow}>{t('dhama.collectionLabel')}</Text> : null}
    <Text style={styles.heroTitle}>{selectedCollection ? selectedCollection.title : t('dhama.homeTitle')}</Text>
  </View>
</View>
```

```tsx
heroHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
heroSubtitleWrap: { paddingLeft: 70 },
```

## 2026-03-09 (Dhama hero made less brittle on small iPhone widths)

### Измененные файлы
- `frontend/screens/dhama/DhamaHomeScreen.tsx`

### Суть правки (от старого к новому)
- Было:
  - subtitle в hero выравнивался фиксированным `paddingLeft`;
  - это работало на текущем размере кнопки назад, но делало композицию хрупкой на узких экранах и при будущих изменениях размеров.
- Стало:
  - subtitle перенесен в тот же text column, что и title;
  - `heroHeaderRow` выровнен по `flex-start`, а title немного уменьшен;
  - шапка стала адаптивнее и меньше зависит от магических чисел.

### Сниппеты кода

`frontend/screens/dhama/DhamaHomeScreen.tsx`:
```tsx
<View style={styles.heroHeaderRow}>
  <DhamaBackButton navigation={navigation} />
  <View style={styles.heroTextWrap}>
    <Text style={styles.heroTitle}>{selectedCollection ? selectedCollection.title : t('dhama.homeTitle')}</Text>
    <Text style={styles.heroSubtitle}>
      {selectedCollection?.description || t('dhama.homeSubtitle')}
    </Text>
  </View>
</View>
```

```tsx
heroHeaderRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 16 },
heroTextWrap: { gap: 10, maxWidth: '88%', flex: 1, paddingTop: 8 },
heroTitle: { fontSize: 32, lineHeight: 36, ... },
```

## 2026-03-09 (Dhama hero uses lighter back button variant)

### Измененные файлы
- `frontend/screens/dhama/DhamaBackButton.tsx`
- `frontend/screens/dhama/DhamaHomeScreen.tsx`

### Суть правки (от старого к новому)
- Было:
  - в hero `DhamaHome` использовалась та же плотная back button, что и на обычных светлых экранах;
  - кнопка визуально перетягивала на себя внимание и спорила с главным title.
- Стало:
  - `DhamaBackButton` получил `variant="hero"`;
  - для hero-версии уменьшен размер иконки и ослаблен фон/бордер;
  - `DhamaHome` использует именно этот облегченный вариант, а остальные `Dhama`-экраны оставляют default button.

### Сниппеты кода

`frontend/screens/dhama/DhamaBackButton.tsx`:
```tsx
type Props = {
  navigation: NavigationProp<RootStackParamList>;
  variant?: 'default' | 'hero';
};
```

```tsx
<DhamaBackButton navigation={navigation} variant="hero" />
```

## 2026-03-09 (Dhama hero atmosphere softened for cleaner iPhone presentation)

### Измененные файлы
- `frontend/screens/dhama/DhamaHomeScreen.tsx`

### Суть правки (от старого к новому)
- Было:
  - hero glow-формы были слишком крупными и тяжелыми;
  - нижний CTA-блок визуально давил вниз и делал шапку чуть рыхлой.
- Стало:
  - верхний и нижний glow уменьшены и ослаблены по opacity;
  - расстояние внутри hero немного собрано;
  - CTA `Открыть карту` стал чуть компактнее и визуально поднялся.

### Сниппеты кода

`frontend/screens/dhama/DhamaHomeScreen.tsx`:
```tsx
heroGlowTop: {
  width: 236,
  height: 236,
  backgroundColor: 'rgba(252, 215, 163, 0.14)',
}
```

```tsx
heroFooter: { gap: 10, alignItems: 'flex-start', marginTop: -2 },
heroMapButton: { paddingHorizontal: 18, paddingVertical: 13, ... },
```

## 2026-03-09 (Dhama back button refined on non-hero screens too)

### Измененные файлы
- `frontend/screens/dhama/DhamaBackButton.tsx`

### Суть правки (от старого к новому)
- Было:
  - облегченный back button существовал только для hero-версии;
  - на `DhamaMap`, `DhamaCollectionDetail` и `HolyPlaceDetail` кнопка оставалась более тяжелой квадратной плиткой.
- Стало:
  - default-вариант `DhamaBackButton` тоже облегчен;
  - уменьшен визуальный размер, увеличен радиус иконки/контейнера под более мягкий вид;
  - улучшение автоматически применяется на всех остальных `Dhama`-экранах, где используется default-вариант кнопки назад.

### Сниппеты кода

`frontend/screens/dhama/DhamaBackButton.tsx`:
```tsx
variant === 'default' ? styles.defaultButton : null
```

```tsx
defaultButton: {
  width: 42,
  height: 42,
  borderRadius: 16,
},
```
}
```

## 2026-03-08 (Dhama added as new shared mobile service with sacred places screens)

### Измененные файлы
- `frontend/App.tsx`
- `frontend/types/navigation.ts`
- `frontend/types/portal.ts`
- `frontend/screens/portal/serviceLaunchResolver.ts`
- `frontend/screens/dhama/DhamaHomeScreen.tsx`
- `frontend/screens/dhama/DhamaMapScreen.tsx`
- `frontend/screens/dhama/HolyPlaceDetailScreen.tsx`
- `frontend/screens/dhama/index.ts`
- `frontend/services/dhamaService.ts`
- `frontend/types/dhama.ts`
- `frontend/i18n/locales/ru.ts`
- `frontend/i18n/locales/en.ts`
- `frontend/i18n/locales/hi.ts`

### Суть правки (от старого к новому)
- Было:
  - в mobile portal не было отдельного сервиса `Dhama`;
  - не существовало typed navigation flow для каталога святых мест, карты sacred places и карточки места;
  - мобильный клиент не умел получать `Dhama`-данные с backend и открывать связанные audio/yatra блоки;
  - на `DhamaMap` был виден нижний угловой leaflet badge от WebView-карты.
- Стало:
  - в portal добавлен отдельный service entry `dhama`;
  - navigation stack теперь содержит `DhamaHome`, `DhamaMap`, `HolyPlaceDetail`;
  - mobile использует новый typed API client `dhamaService` для списка мест, map markers, filters и detail payload;
  - все `Dhama`-экраны получили явную верхнюю back button слева; если back stack отсутствует, кнопка уводит в `Portal`;
  - `DhamaHome` получил более свободный spacing: header перестал быть зажатым, featured cards разнесены явным horizontal gap, а вертикальные cards стали шире и читаемее;
  - detail screen открывает связанные audio tracks через существующий `AudioPlayer`, а связанные туры через `YatraDetail`;
  - detail payload дополнительно нормализуется на client-side, а backend инициализирует пустые relation arrays, поэтому переход из карты в `HolyPlaceDetail` больше не должен ронять mobile на местах без media/yatra links;
  - на `DhamaMap` нижний угол карты перекрыт брендовым overlay с `logo_tilak_booton.png`, поэтому лишний badge больше не торчит поверх UI;
  - UI и контентные ключи локализованы для `ru/en/hi`, поэтому shared mobile behavior одинаково поддержан на iOS и Android.

### Сниппеты кода

`frontend/types/navigation.ts`:
```ts
export type RootStackParamList = {
  DhamaHome: undefined;
  DhamaMap: undefined;
  HolyPlaceDetail: { slug: string };
};
```

`frontend/screens/portal/serviceLaunchResolver.ts`:
```ts
if (serviceId === 'dhama') {
  return { kind: 'navigate', screen: 'DhamaHome' };
}
```

`frontend/screens/dhama/HolyPlaceDetailScreen.tsx`:
```ts
onPress={() => navigation.navigate('AudioPlayer', { track: { ...track, ID: track.id, thumbnailUrl: track.thumbnailUrl } })}
```

```ts
onPress={() => navigation.navigate('YatraDetail', { yatraId: yatra.id })}
```

`frontend/screens/dhama/DhamaMapScreen.tsx`:
```ts
<View pointerEvents="none" style={[styles.logoOverlay, styles.logoOverlaySurface, { borderColor: vTheme.colors.divider }]}>
  <Image source={require('../../assets/logo_tilak_booton.png')} style={styles.logoImage} resizeMode="contain" />
</View>
```

`frontend/screens/dhama/DhamaBackButton.tsx`:
```ts
if (navigation.canGoBack()) {
  navigation.goBack();
  return;
}
navigation.navigate('Portal');
```

`frontend/services/dhamaService.ts`:
```ts
linkedMedia: Array.isArray(payload?.linkedMedia) ? payload!.linkedMedia : [],
linkedYatras: Array.isArray(payload?.linkedYatras) ? payload!.linkedYatras : [],
```

## 2026-03-08 (Backend social auth create now omits blank `google_sub` and always generates `invite_code`)

### Измененные файлы
- `server/internal/handlers/auth_handler.go`
- `server/internal/handlers/auth_vk_integration_test.go`
- `server/internal/handlers/auth_google_integration_test.go`

### Суть правки (от старого к новому)
- Было:
  - production Android VK flow после исправления client-side PKCE уже доходил до backend, но `POST /api/auth/vk/login` мог завершаться `500 Could not create VK user`;
  - live `docker logs` показали точную причину: `duplicate key value violates unique constraint "users_google_sub_key"`, потому что новые non-Google users создавались с `google_sub=''`;
  - social signup paths также не гарантировали `invite_code`, что оставляло второй источник конфликтов на insert.
- Стало:
  - backend создаёт новых auth users через общий helper, который не вставляет `google_sub`, если он пустой, и всегда генерирует `invite_code` перед `Create`;
  - это покрывает обычную регистрацию, Google login и VK login, поэтому shared mobile auth больше не падает на server insert из-за пустых optional unique полей.

### Сниппеты кода

`server/internal/handlers/auth_handler.go`:
```go
func createAuthUser(user *models.User) error {
	if strings.TrimSpace(user.InviteCode) == "" {
		user.InviteCode = services.GenerateInviteCode()
	}

	query := database.DB
	if strings.TrimSpace(user.GoogleSub) == "" {
		query = query.Omit("GoogleSub")
	}

	return query.Create(user).Error
}
```

## 2026-03-08 (Android VK code-flow switched to `id.vk.com/authorize`, dropped `URLSearchParams.set`, and fixed PKCE SHA-256)

### Измененные файлы
- `frontend/services/socialAuthService.ts`
- `frontend/__tests__/services/socialAuthService.test.ts`
- `frontend/package.json`
- `frontend/package-lock.json`

### Суть правки (от старого к новому)
- Было:
  - Android VK code-flow собирал authorize URL на `https://oauth.vk.com/authorize` и дописывал PKCE через `URLSearchParams.set(...)`;
  - live release на Android показал две реальные проблемы: сначала runtime `URLSearchParams.set is not implemented`, а после обхода этого падения сам VK отвечал `invalid_request: Code challenge method is unsupported` на старом authorize endpoint;
  - прежняя handwritten SHA-256 реализация для PKCE давала неправильный `code_challenge`, из-за чего Android доходил до callback, но дальнейший `code` exchange оставался некорректным.
- Стало:
  - Android VK code-flow теперь использует `https://id.vk.com/authorize` для `response_type=code` + PKCE;
  - query string собирается вручную без зависимости от `URLSearchParams.set`, поэтому release Android больше не падает до `Linking.openURL(...)`;
  - `code_challenge` теперь считается через стандартный SHA-256 (`node-forge`), а сама зависимость зафиксирована как прямой dependency проекта;
  - live smoke после этой правки уже проходит внешний VK launch и callback; текущий остаточный runtime сбой сместился дальше, на backend-ответ `Could not create VK user`;
  - iOS/web flow на `oauth.vk.com/authorize` не меняется.

### Сниппеты кода

`frontend/services/socialAuthService.ts`:
```ts
const authorizeBaseUrl = isAndroid ? 'https://id.vk.com/authorize' : 'https://oauth.vk.com/authorize';
return `${authorizeBaseUrl}?${buildQueryString(queryEntries)}`;
```

```ts
const buildQueryString = (entries: Array<[string, string]>): string => (
  entries
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join('&')
);
```

```ts
const digestBytes = forge.md.sha256.create().update(value, 'utf8').digest().getBytes();
return Buffer.from(digestBytes, 'binary')
  .toString('base64')
  .replace(/\+/g, '-')
  .replace(/\//g, '_')
  .replace(/[=]+$/g, '');
```

## 2026-03-08 (Android VK external launch now falls back to in-app modal)

### Измененные файлы
- `frontend/screens/LoginScreen.tsx`
- `frontend/components/auth/VKAuthModal.tsx`
- `frontend/__tests__/screens/LoginScreen.localization.test.tsx`
- `frontend/__tests__/components/auth/VKAuthModal.test.tsx`

### Суть правки (от старого к новому)
- Было:
  - Android всегда пытался открыть VK authorize URL через `Linking.openURL(...)`;
  - если конкретное устройство не стартовало browser/VK activity, приложение сразу падало в общий alert `Не удалось выполнить вход через VK.` ещё до callback и до backend exchange.
- Стало:
  - Android по-прежнему сначала пробует внешний VK/browser launch;
  - если `Linking.openURL(...)` reject, `LoginScreen` автоматически открывает уже существующий `VKAuthModal` вместо немедленного общего alert;
  - `VKAuthModal` теперь перехватывает callback URL через `onShouldStartLoadWithRequest`, не давая WebView реально навигироваться на custom-scheme callback;
  - iOS внешний browser flow не меняется, но shared mobile auth component теперь умеет безопаснее завершать callback.

### Сниппеты кода

`frontend/screens/LoginScreen.tsx`:
```ts
try {
  await Linking.openURL(session.authorizeUrl);
  setSocialLoadingProvider(null);
  return;
} catch (launchError: any) {
  console.warn('VK auth external launch failed:', session.authorizeUrl, launchError?.message || launchError);

  if (Platform.OS === 'android') {
    setVKAuthUrl(session.authorizeUrl);
    setSocialLoadingProvider(null);
    return;
  }

  throw launchError;
}
```

`frontend/components/auth/VKAuthModal.tsx`:
```ts
const handleShouldStartLoadWithRequest = (request: ShouldStartLoadRequest): boolean => (
  !interceptCallbackUrl(request.url)
);
```

## 2026-03-08 (Android VK PKCE exchange moved from mobile client to backend)

### Измененные файлы
- `frontend/services/socialAuthService.ts`
- `frontend/__tests__/services/socialAuthService.test.ts`
- `frontend/.env.production`
- `server/internal/handlers/auth_handler.go`
- `server/internal/handlers/auth_vk_integration_test.go`

### Суть правки (от старого к новому)
- Было:
  - Android app после native VK callback сам делал `POST https://id.vk.com/oauth2/auth` и держал `VK_ANDROID_CLIENT_SECRET` в mobile runtime env;
  - это означало, что Android protected key попадал в APK.
- Стало:
  - Android app после native callback отправляет на backend только `code + codeVerifier + vkDeviceId + state`;
  - backend сам выполняет Android PKCE `code -> access_token` exchange через `id.vk.com/oauth2/auth`, используя `VK_ANDROID_CLIENT_ID` и `VK_ANDROID_CLIENT_SECRET` из server env;
  - `VK_ANDROID_CLIENT_SECRET` удалён из `frontend/.env.production`, поэтому оба VK protected key теперь должны жить только на server/Dokploy.

### Сниппеты кода

`frontend/services/socialAuthService.ts`:
```ts
payload.code = callbackData.code;
payload.codeVerifier = pkceSession.codeVerifier;
payload.vkDeviceId = callbackData.deviceId;
payload.state = state;
```

`server/internal/handlers/auth_handler.go`:
```go
if req.Platform == "android" {
	exchangedAccessToken, exchangedEmail, _, exchangeErr = vkAndroidCodeExchanger(vkAndroidCodeExchangeInput{
		Code:         req.Code,
		CodeVerifier: req.CodeVerifier,
		VKDeviceID:   req.VKDeviceID,
		State:        req.State,
	})
} else {
	exchangedAccessToken, exchangedEmail, _, exchangeErr = vkCodeExchanger(req.Code)
}
```

## 2026-03-08 (Production backend now has VK iOS protected key in Dokploy)

### Измененные файлы
- `docs/IOS_CHANGES_FOR_MIGRATION.md`
- `MEMORY.md`
- `Dokploy application env: Vedamatch / production / Server`

### Суть правки (от старого к новому)
- Было:
  - production backend container для `api.vedamatch.ru` держал `VK_CLIENT_ID=54474354`, но live env не содержал `VK_CLIENT_SECRET`;
  - из-за этого iOS/server-side VK `code` flow оставался неполным даже при корректном mobile client config.
- Стало:
  - в Dokploy для `Vedamatch / production / Server` добавлен `VK_CLIENT_SECRET` для iOS/server VK app и выполнен redeploy;
  - после redeploy новый running container на production был перепроверен через `docker inspect`: `VK_CLIENT_SECRET` реально присутствует в live env.

### Сниппеты кода

`Dokploy env`:
```env
AUTH_VK_ENABLED=on
VK_CLIENT_ID=54474354
VK_CLIENT_SECRET=<configured>
VK_REDIRECT_URI=https://api.vedamatch.ru/auth/vk/callback
```

## 2026-03-08 (VK Android PKCE exchange now sends protected key)

### Измененные файлы
- `frontend/services/socialAuthService.ts`
- `frontend/.env.production`
- `frontend/__tests__/services/socialAuthService.test.ts`

### Суть правки (от старого к новому)
- Было:
  - Android после native VK callback менял `code + device_id + state` на token через `https://id.vk.com/oauth2/auth`, но не передавал `client_secret`;
  - наличие `Universal link` и `service key` в VK кабинете не помогало, потому что Android native PKCE flow упирался именно в `protected key`.
- Стало:
  - Android PKCE exchange теперь отправляет `client_secret` из `VK_ANDROID_CLIENT_SECRET` (с fallback на `VK_CLIENT_SECRET`);
  - `.env.production` содержит отдельный `VK_ANDROID_CLIENT_SECRET`, а тесты фиксируют отправку `client_secret` в form body;
  - `service key` по-прежнему не используется для mobile user login.

### Сниппеты кода

`frontend/services/socialAuthService.ts`:
```ts
if (readConfigString(clientSecret)) {
  body.set('client_secret', readConfigString(clientSecret));
}
```

```ts
const exchanged = await exchangeVKAndroidCode({
  clientId: pkceSession.clientId,
  clientSecret: getVKAndroidClientSecret(),
  code: callbackData.code,
  codeVerifier: pkceSession.codeVerifier,
  deviceId: callbackData.deviceId,
  redirectUri: pkceSession.redirectUri,
  state,
});
```

## 2026-03-07 (VK Android PKCE exchange passes state and surfaces detailed failure)

### Измененные файлы
- `frontend/services/socialAuthService.ts`
- `frontend/screens/LoginScreen.tsx`
- `frontend/__tests__/services/socialAuthService.test.ts`
- `frontend/__tests__/screens/LoginScreen.localization.test.tsx`

### Суть правки (от старого к новому)
- Было:
  - Android после native VK callback менял `code + device_id` на token через `https://id.vk.com/oauth2/auth`, но не передавал туда `state`;
  - если exchange падал, `LoginScreen` почти всегда показывал только общий fallback `Не удалось выполнить вход через VK.`.
- Стало:
  - Android PKCE exchange отправляет `code + device_id + state`, чтобы цепочка authorize -> callback -> token exchange оставалась согласованной;
  - `LoginScreen` теперь показывает деталь для `VK_TOKEN_EXCHANGE_FAILED:*` и пишет точную причину в `console.warn`, чтобы реальный device trace больше не был слепым.

### Сниппеты кода

`frontend/services/socialAuthService.ts`:
```ts
body: new URLSearchParams({
  client_id: clientId,
  code,
  code_verifier: codeVerifier,
  device_id: deviceId,
  grant_type: 'authorization_code',
  redirect_uri: redirectUri,
  state,
}).toString(),
```

`frontend/screens/LoginScreen.tsx`:
```ts
const detailedVKError = extractDetailedVKError(rawMessage);
if (rawMessage || backendMessage) {
  console.warn('VK auth failure:', rawMessage || '<empty>', backendMessage || '');
}
const fallbackMessage = detailedVKError || backendMessage || t('auth.loginScreen.errors.vkFailed');
```

## 2026-03-07 (VK Android switched to PKCE native callback flow)

### Измененные файлы
- `frontend/services/socialAuthService.ts`
- `frontend/__tests__/services/socialAuthService.test.ts`
- `frontend/__tests__/screens/LoginScreen.localization.test.tsx`

### Суть правки (от старого к новому)
- Было:
  - Android mobile VK authorize генерировал `client_id=54474353`, native redirect `vk54474353://vk.ru/blank.html` и `response_type=token`;
  - на реальном устройстве VK начал отвечать `{"error":"invalid_request","error_description":"Security Error"}` ещё на authorize step.
- Стало:
  - Android остаётся на `client_id=54474353`, но теперь использует `response_type=code` + PKCE (`code_challenge`, `code_challenge_method=S256`) и native callback `vk54474353://vk.ru/blank.html`;
  - после native callback приложение локально меняет `code + device_id` на `access_token` через `https://id.vk.com/oauth2/auth`, затем завершает login через существующий `POST /auth/vk/login` с `accessToken`.

### Сниппеты кода

`frontend/services/socialAuthService.ts`:
```ts
const query = new URLSearchParams({
  client_id: getVKNativeClientId('android'),
  redirect_uri: getVKAndroidRedirectUri(),
  response_type: 'code',
  display: 'mobile',
  scope,
  v: '5.199',
  state,
});

query.set('code_challenge', sha256Base64Url(codeVerifier));
query.set('code_challenge_method', 'S256');
```

```ts
const response = await fetch('https://id.vk.com/oauth2/auth', {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({
    client_id,
    code,
    code_verifier,
    device_id,
    grant_type: 'authorization_code',
    redirect_uri,
  }).toString(),
});
```

## 2026-03-07 (VK platform app IDs split: Android token flow, iOS server credentials refreshed)

### Измененные файлы
- `frontend/services/socialAuthService.ts`
- `frontend/android/app/build.gradle`
- `frontend/.env`
- `frontend/.env.production`
- `frontend/.env.ios`
- `frontend/.env.usb`
- `frontend/.env.emulator`
- `frontend/__tests__/services/socialAuthService.test.ts`
- `frontend/__tests__/screens/LoginScreen.localization.test.tsx`
- `server/.env`

### Суть правки (от старого к новому)
- Было:
  - mobile использовал общий `VK_CLIENT_ID=54418465`, который оказался `Web` app и давал `Security Error` на native Android authorize;
  - Android шел в `response_type=code`, хотя production server не был развернут под platform-specific VK exchange;
  - Dokploy server env держал старый VK `client id/secret`.
- Стало:
  - Android release берет отдельный `VK_ANDROID_CLIENT_ID=54474353`, использует native scheme `vk54474353://vk.ru/blank.html` и `response_type=token`;
  - iOS берет `VK_IOS_CLIENT_ID=54474354`, продолжает universal-link `code` flow через `https://api.vedamatch.ru/auth/vk/callback`;
  - production server env переключен на iOS VK credentials, чтобы backend exchange для iOS совпадал с новым `app id`.

### Сниппеты кода

`frontend/services/socialAuthService.ts`:
```ts
const clientId = platform === 'ios'
  ? (Config.VK_IOS_CLIENT_ID || Config.VK_CLIENT_ID || '54474354')
  : (Config.VK_ANDROID_CLIENT_ID || Config.VK_CLIENT_ID || '54474353');

const responseType = platform === 'android' ? 'token' : 'code';
```

```ts
const payload = {
  deviceId,
  platform: resolveVKCallbackPlatform(callbackUrl),
  clientId: getVKClientId(resolveVKCallbackPlatform(callbackUrl)),
};
```

`frontend/android/app/build.gradle`:
```gradle
def vkClientId = project.env.get("VK_ANDROID_CLIENT_ID") ?: project.env.get("VK_CLIENT_ID") ?: "54474353"

defaultConfig {
    versionName "1.1.23"
    versionCode 25
    manifestPlaceholders = [vkAuthScheme: "vk${vkClientId}"]
}
```

## 2026-03-07 (Telegram mobile auth enabled via Mini App bridge for iOS and Android)

### Измененные файлы
- `frontend/services/socialAuthService.ts`
- `frontend/screens/LoginScreen.tsx`
- `frontend/navigation/linking.ts`
- `frontend/i18n/locales/ru.ts`
- `frontend/i18n/locales/en.ts`
- `frontend/i18n/locales/hi.ts`
- `frontend/__tests__/services/socialAuthService.test.ts`
- `frontend/__tests__/screens/LoginScreen.localization.test.tsx`
- `frontend/android/app/build.gradle`
- `lkm/src/components/lkm-cabinet-client.tsx`
- `server/internal/services/telegram_mobile_auth_bridge.go`
- `server/internal/handlers/auth_handler.go`
- `server/internal/handlers/auth_telegram_miniapp_integration_test.go`
- `server/cmd/api/main.go`

### Суть правки (от старого к новому)
- Было:
  - `Telegram` кнопка на mobile login screen либо была скрыта, либо показывала placeholder-alert;
  - backend умел только `miniapp/login` и `miniapp/link`, но не умел безопасно вернуть готовую auth-сессию из Telegram Mini App обратно в native app;
  - `lkm` Mini App авторизовывался внутри себя, но не делал handoff назад в iOS/Android.
- Стало:
  - mobile app запускает `POST /auth/telegram/mobile/start`, открывает `@vedamatch_bot` через `startapp=vm_auth_<state>` и ждет callback `vedamatch://auth/telegram/callback?state=...`;
  - backend хранит short-lived Telegram mobile auth state (`pending -> ready -> consumed`) в Redis или in-memory fallback и отдает endpoints `start/complete/exchange`;
  - `lkm` Mini App распознает `vm_auth_<state>` и использует этот state для возврата пользователя обратно в native app;
  - deep link routing в React Navigation игнорирует Telegram auth callback так же, как и VK callback;
  - Android release version поднята до `1.1.20 (22)`.

### Сниппеты кода

`server/internal/services/telegram_mobile_auth_bridge.go`:
```go
func BuildTelegramMobileStartParam(state string) string {
  return "vm_auth_" + strings.TrimSpace(state)
}
```

```go
func (s *TelegramAuthService) ResolveMobileAuthDeepLink(state string) string {
  return "vedamatch://auth/telegram/callback?state=" + url.QueryEscape(state)
}
```

`frontend/services/socialAuthService.ts`:
```ts
export const createTelegramAuthSession = async () => {
  const response = await apiClient.post('/auth/telegram/mobile/start', { deviceId }, {
    __skipAuthSession: true,
  });
  return { state: response.data.state, launchUrl: response.data.launchUrl };
};
```

```ts
export const finalizeTelegramSignIn = async (callbackUrl: string, expectedState?: string) => {
  const state = parseQueryParam(callbackUrl, 'state');
  return apiClient.post('/auth/telegram/mobile/exchange', { state, deviceId }, {
    __skipAuthSession: true,
  });
};
```

`lkm/src/components/lkm-cabinet-client.tsx`:
```tsx
const telegramMobileState = extractTelegramMobileAuthStateFromStartParam(
  telegramWebApp?.initDataUnsafe?.start_param || extractTelegramStartParamFromLocation(window.location.search),
);
```

## 2026-03-08 (Telegram mobile return switched to universal callback with browser fallback)

### Измененные файлы
- `server/internal/services/telegram_mobile_auth_bridge.go`
- `server/internal/handlers/auth_handler.go`
- `server/internal/handlers/auth_telegram_miniapp_integration_test.go`
- `server/cmd/api/main.go`
- `frontend/android/app/src/main/AndroidManifest.xml`

### Суть правки (от старого к новому)
- Было:
  - Telegram mobile bridge возвращал только `vedamatch://auth/telegram/callback?state=...`;
  - `lkm` Mini App пытался открыть приложение прямым custom-scheme redirect после `complete`;
  - iOS AASA не включал `/auth/telegram/callback`, а Android `assetlinks.json` содержал placeholder fingerprint.
- Стало:
  - backend `POST /auth/telegram/mobile/complete` отдает `https://api.vedamatch.ru/auth/telegram/callback?state=...` как основной callback URL;
  - iOS universal link и Android App Link теперь могут открыть приложение напрямую по `https` callback;
  - если callback URL попал в браузер вместо приложения, `GET /auth/telegram/callback` рендерит fallback-page, которая пробует `vedamatch://auth/telegram/callback?...` и показывает кнопку `Открыть VedaMatch`;
  - AASA и Android asset links теперь содержат Telegram callback path и реальные release/debug SHA-256 fingerprints для `com.ragagent`.

### Сниппеты кода

`server/internal/services/telegram_mobile_auth_bridge.go`:
```go
func (s *TelegramAuthService) ResolveMobileAuthDeepLink(state string) string {
  return "https://api.vedamatch.ru/auth/telegram/callback?state=" + url.QueryEscape(state)
}
```

```go
func (s *TelegramAuthService) ResolveMobileAuthNativeDeepLink(state string) string {
  return "vedamatch://auth/telegram/callback?state=" + url.QueryEscape(state)
}
```

`server/internal/handlers/auth_handler.go`:
```go
func (h *AuthHandler) TelegramMobileCallback(c *fiber.Ctx) error {
  deepLink := "vedamatch://auth/telegram/callback?" + deepLinkQuery.Encode()
  return renderMobileDeepLinkRedirectPage(c, deepLink, "Авторизация завершена. Возвращаемся в приложение VedaMatch...")
}
```

`server/cmd/api/main.go`:
```go
"paths": ["/auth/vk/callback", "/auth/telegram/callback", "/register/*", "/portal/*", "/invite-friends", "/wallet", "/login/*"]
```

```go
"sha256_cert_fingerprints": []string{
  "CD:FE:7C:7A:51:BF:85:60:32:F7:B1:93:5D:D7:39:AE:7A:AC:32:BB:39:2A:E8:C1:15:89:3E:AD:75:F0:0B:C1",
  "4E:07:51:37:28:12:DB:3D:FD:4A:5B:71:84:9B:C0:BC:AB:21:A0:2E:6C:01:E3:1A:B7:A2:6C:66:D1:CE:D4:FB",
}
```

`frontend/android/app/src/main/AndroidManifest.xml`:
```xml
<intent-filter android:autoVerify="true">
    <action android:name="android.intent.action.VIEW" />
    <category android:name="android.intent.category.DEFAULT" />
    <category android:name="android.intent.category.BROWSABLE" />
    <data
        android:scheme="https"
        android:host="api.vedamatch.ru"
        android:pathPrefix="/auth/telegram/callback" />
</intent-filter>
```

## 2026-03-07 (VK iOS moved to universal-link code flow; Associated Domains enabled)

### Измененные файлы
- `frontend/services/socialAuthService.ts`
- `frontend/screens/LoginScreen.tsx`
- `frontend/navigation/linking.ts`
- `frontend/ios/vedamatch/AppDelegate.mm`
- `frontend/ios/vedamatch/vedamatch.entitlements`
- `frontend/ios/Podfile.lock`
- `server/internal/handlers/auth_handler.go`
- `server/internal/handlers/auth_vk_integration_test.go`
- `server/cmd/api/main.go`

### Суть правки (от старого к новому)
- Было:
  - iOS не имел `Associated Domains`, поэтому `https://api.vedamatch.ru/auth/vk/callback` не мог открывать приложение как universal link;
  - backend AASA отдавал placeholder `YOUR_APPLE_TEAM_ID.com.ragagent`;
  - mobile `VK` login умел только `access_token` flow и был завязан на `blank.html`/deep link сценарий.
- Стало:
  - iOS target включает `applinks:api.vedamatch.ru`, а `AppDelegate` пробрасывает и custom URL, и universal links в React Native;
  - backend AASA отдает реальный app id `CVW85BZU5Z.com.VedaMatch.vedamatch` и путь `/auth/vk/callback`;
  - на iOS `VK` login теперь стартует как `response_type=code` через внешний browser, ловит возврат на `https://api.vedamatch.ru/auth/vk/callback?...` и завершает auth через `POST /auth/vk/login` с `code`;
  - `VKLogin` на backend принимает и `accessToken`, и `code`;
  - iOS pod graph синхронизирован под текущий `react-native-mmkv 4.1.2` (`NitroMmkv 4.1.2`, `MMKVCore 2.2.4`), чтобы simulator build снова проходил.

### Сниппеты кода

`frontend/services/socialAuthService.ts`:
```ts
const redirectUri = platform === 'ios'
  ? (Config.VK_REDIRECT_URI || 'https://api.vedamatch.ru/auth/vk/callback')
  : 'https://oauth.vk.com/blank.html';
const responseType = platform === 'ios' ? 'code' : 'token';
```

```ts
if (callbackData.code) {
  payload.code = callbackData.code;
}
return apiClient.post('/auth/vk/login', payload, {
  __skipAuthSession: true,
});
```

`frontend/ios/vedamatch/AppDelegate.mm`:
```objc
- (BOOL)application:(UIApplication *)application
    continueUserActivity:(NSUserActivity *)userActivity
      restorationHandler:(void (^)(NSArray * _Nullable))restorationHandler {
  return [RCTLinkingManager application:application
                   continueUserActivity:userActivity
                     restorationHandler:restorationHandler];
}
```

`server/cmd/api/main.go`:
```go
"details": [
  {
    "appID": "CVW85BZU5Z.com.VedaMatch.vedamatch",
    "paths": ["/auth/vk/callback", "/register/*", "/portal/*", "/invite-friends", "/wallet", "/login/*"]
  }
]
```

## 2026-03-07 (VK switched to in-app WebView flow; Telegram button restored as explicit placeholder)

### Измененные файлы
- `frontend/components/auth/VKAuthModal.tsx`
- `frontend/screens/LoginScreen.tsx`
- `frontend/services/socialAuthService.ts`
- `frontend/i18n/locales/ru.ts`
- `frontend/i18n/locales/en.ts`
- `frontend/i18n/locales/hi.ts`
- `frontend/__tests__/services/socialAuthService.test.ts`
- `frontend/__tests__/screens/LoginScreen.localization.test.tsx`
- `frontend/android/app/build.gradle`

### Суть правки (от старого к новому)
- Было:
  - mobile `VK` login открывал внешний browser OAuth и зависел от backend callback/deep link;
  - на реальном Android это приводило к `invalid_request / Security error` на стороне VK authorize;
  - `Telegram` кнопка была скрыта полностью, из-за чего на login screen не было явного статуса этого flow.
- Стало:
  - `VK` login идет через встроенный `WebView` modal и получает `access_token` прямо из `https://oauth.vk.com/blank.html#...`;
  - после получения token mobile client завершает auth обычным `POST /auth/vk/login`, без обязательного browser round-trip;
  - `Telegram` кнопка снова видна, но показывает localized alert, что direct Telegram login в приложении пока не подключен;
  - Android release version поднята до `1.1.19 (21)`.

### Сниппеты кода

`frontend/services/socialAuthService.ts`:
```ts
const query = new URLSearchParams({
  client_id: clientId,
  redirect_uri: 'https://oauth.vk.com/blank.html',
  response_type: 'token',
  display: 'mobile',
  scope,
  v: '5.199',
  state,
});
```

```ts
export const finalizeVKSignIn = async (callbackUrl: string, state: string) => {
  const callbackData = extractVKCallbackPayload(callbackUrl, state);
  return apiClient.post('/auth/vk/login', {
    accessToken: callbackData.accessToken,
    email: callbackData.email || undefined,
    deviceId,
  });
};
```

`frontend/components/auth/VKAuthModal.tsx`:
```tsx
window.ReactNativeWebView.postMessage(JSON.stringify({
  type: 'vk-auth-url',
  url: window.location.href,
}));
```

`frontend/screens/LoginScreen.tsx`:
```tsx
<TouchableOpacity style={styles.socialButton} onPress={handleTelegramSignIn}>
  <Text style={styles.socialButtonText}>{t('auth.loginScreen.social.telegram')}</Text>
</TouchableOpacity>
```

## 2026-03-07 (Social auth contract hardened for Google/VK; Telegram hidden on login)

### Измененные файлы
- `frontend/screens/LoginScreen.tsx`
- `frontend/services/socialAuthService.ts`
- `frontend/__tests__/screens/LoginScreen.localization.test.tsx`
- `frontend/__tests__/services/socialAuthService.test.ts`
- `server/internal/handlers/auth_handler.go`
- `server/internal/handlers/auth_google_integration_test.go`
- `server/.env.example`

### Суть правки (от старого к новому)
- Было:
  - mobile login screen показывал `Telegram` как quick-login, хотя реального mobile auth flow там не было;
  - `Google` client code читал старый плоский ответ SDK и на `@react-native-google-signin/google-signin@15` терял `idToken`;
  - backend `GoogleLogin` принимал `tokeninfo` без проверки `aud`.
- Стало:
  - `Telegram` убран из quick-login на mobile login screen до появления реального mini app flow;
  - `Google` client code теперь читает wrapper `{ type, data }`, обрабатывает `cancelled` и остается совместимым с текущим SDK;
  - `VK` callback дополнительно читает `Linking.getInitialURL()`, чтобы deep link не терялся после возврата из браузера;
  - backend `GoogleLogin` требует допустимый `aud` и конфиг разрешенных client IDs.

### Сниппеты кода

`frontend/services/socialAuthService.ts`:
```ts
if ('type' in result) {
  if (result.type === 'cancelled') {
    throw new Error('GOOGLE_SIGNIN_CANCELLED');
  }
  return result.data ?? {};
}
```

```ts
Linking.getInitialURL()
  .then((initialUrl) => {
    if (initialUrl) handleUrl(initialUrl);
  })
```

`server/internal/handlers/auth_handler.go`:
```go
func validateGoogleAudience(audience string) error {
  allowedClientIDs := resolveGoogleAllowedClientIDs()
  if len(allowedClientIDs) == 0 {
    return errGoogleAuthClientIDsMissing
  }
  ...
}
```

## 2026-03-07 (Android release 1.1.17 + MMKV/Nitro compatibility pinned)

### Измененные файлы
- `frontend/android/app/build.gradle`
- `frontend/package.json`
- `frontend/package-lock.json`
- `frontend/pnpm-workspace.yaml`
- `frontend/patches/react-native-nitro-modules@0.33.9.patch`

### Суть правки (от старого к новому)
- Было:
  - Android production version оставалась `1.1.16 (18)`;
  - в `frontend/node_modules` оказался `react-native-mmkv 4.2.0`, который не совпадал с проектным nitro-стеком `react-native-nitro-modules 0.33.9` и ломал release build.
- Стало:
  - Android release version поднята до `1.1.17 (19)`;
  - shared mobile storage dependency закреплена на совместимой версии `react-native-mmkv 4.1.2`;
  - compat patch для `react-native-nitro-modules 0.33.9` сохранен как `pnpm` patch, чтобы Android release build воспроизводимо собирался.

### Сниппеты кода

`frontend/android/app/build.gradle`:
```gradle
versionCode 19
versionName "1.1.17"
```

`frontend/package.json`:
```json
"react-native-mmkv": "4.1.2",
"react-native-nitro-modules": "0.33.9"
```

`frontend/pnpm-workspace.yaml`:
```yaml
patchedDependencies:
  metro@0.81.5: patches/metro@0.81.5.patch
  react-native-nitro-modules@0.33.9: patches/react-native-nitro-modules@0.33.9.patch
```

## 2026-03-06 (Connect push copy now follows user language)

### Измененные файлы
- `server/internal/services/connect_service.go`
- `server/internal/services/connect_service_test.go`

### Суть правки (от старого к новому)
- Было:
  - push deep links для `Connect` уже отправлялись, но тексты были только на русском;
  - пользователь с `en` или `hi` интерфейсом получал `Connect` notification на другом языке.
- Стало:
  - backend выбирает текст push по `users.language`;
  - `Connect` lifecycle push теперь локализован для `ru/en/hi`;
  - screen target остался тем же, изменился только localized title/body.

### Сниппеты кода

`server/internal/services/connect_service.go`:
```go
func normalizeConnectLanguage(language string) string {
  language = strings.ToLower(strings.TrimSpace(language))
  switch {
  case strings.HasPrefix(language, "ru"):
    return "ru"
  case strings.HasPrefix(language, "hi"):
    return "hi"
  default:
    return "en"
  }
}
```

```go
title, body := connectApplicationStatusCopy(language, application.Status)
```

## 2026-03-06 (Connect application lifecycle now emits push deep links)

### Измененные файлы
- `server/internal/services/connect_service.go`
- `server/internal/services/connect_service_test.go`

### Суть правки (от старого к новому)
- Было:
  - `Connect` lifecycle менялся только в API;
  - mobile пользователь не получал push-переходы в нужный `Connect` screen после отклика или смены статуса.
- Стало:
  - новый отклик отправляет push creator/coordinator с deep link в `ConnectModeration`;
  - смена статуса заявки отправляет push участнику с deep link в `ConnectOpportunityDetails`;
  - это использует уже существующий push delivery pipeline приложения.

### Сниппеты кода

`server/internal/services/connect_service.go`:
```go
Data: map[string]string{
  "type": "connect_application_created",
  "screen": "ConnectModeration",
  "params": string(paramsJSON),
}
```

```go
Data: map[string]string{
  "type": "connect_application_status",
  "screen": "ConnectOpportunityDetails",
  "params": string(paramsJSON),
}
```

## 2026-03-06 (Connect scoped moderation access for creators and coordinators)

### Измененные файлы
- `frontend/types/navigation.ts`
- `frontend/types/connect.ts`
- `frontend/services/connectService.ts`
- `frontend/screens/portal/connect/ConnectOpportunityDetailsScreen.tsx`
- `frontend/screens/portal/connect/ConnectModerationScreen.tsx`
- `frontend/i18n/locales/en.ts`
- `frontend/i18n/locales/ru.ts`
- `frontend/i18n/locales/hi.ts`

### Суть правки (от старого к новому)
- Было:
  - mobile admin flow `ConnectModeration` был полезен только глобальному admin;
  - creator/coordinator opportunity не видел client CTA для управления заявками.
- Стало:
  - detail response получил `canManageApplications`;
  - `ConnectOpportunityDetails` показывает переход в moderation screen для управляемой opportunity;
  - `ConnectModeration` умеет работать в scoped mode по `opportunityId`, без доступа ко всей moderation queue.

### Сниппеты кода

`frontend/types/navigation.ts`:
```ts
ConnectModeration: { opportunityId?: number } | undefined;
```

`frontend/screens/portal/connect/ConnectOpportunityDetailsScreen.tsx`:
```tsx
{canManageApplications ? (
  <TouchableOpacity
    style={styles.secondaryButton}
    onPress={() => navigation.navigate('ConnectModeration', { opportunityId: opportunity.id })}
  >
    <Text style={styles.secondaryButtonText}>{t('portal.connect.apply.manageApplications')}</Text>
  </TouchableOpacity>
) : null}
```

## 2026-03-06 (Connect moderation screen now manages participant applications)

### Измененные файлы
- `frontend/screens/portal/connect/ConnectModerationScreen.tsx`
- `frontend/types/connect.ts`
- `frontend/services/connectService.ts`
- `frontend/screens/portal/connect/connectUi.ts`
- `frontend/i18n/locales/en.ts`
- `frontend/i18n/locales/ru.ts`
- `frontend/i18n/locales/hi.ts`

### Суть правки (от старого к новому)
- Было:
  - `ConnectModeration` умел только approve/reject самой opportunity;
  - заявки участников не были доступны в mobile admin flow.
- Стало:
  - у moderation card появилась секция `Manage applications`;
  - экран умеет загружать заявки по opportunity и переводить их по lifecycle (`approved`, `attended`, `completed`, `rejected`);
  - статусы заявок отображаются через shared label helper и локализованы.

### Сниппеты кода

`frontend/services/connectService.ts`:
```ts
async getApplications(opportunityId: number, status?: string): Promise<ConnectModerationApplication[]> {
  const response = await apiClient.get('/admin/connect/applications', {
    params: { opportunityId, status },
  });
  return Array.isArray(response.data?.applications) ? response.data.applications : [];
}
```

`frontend/screens/portal/connect/ConnectModerationScreen.tsx`:
```tsx
<TouchableOpacity
  style={styles.openButton}
  onPress={() => toggleApplications(item.id)}
>
  <Text style={styles.openButtonText}>{t('portal.connect.moderation.showApplications')}</Text>
</TouchableOpacity>
```

## 2026-03-06 (Connect application lifecycle surfaced in mobile detail flow)

### Измененные файлы
- `frontend/types/connect.ts`
- `frontend/services/connectService.ts`
- `frontend/screens/portal/connect/ConnectOpportunityDetailsScreen.tsx`
- `frontend/screens/portal/connect/connectUi.ts`
- `frontend/i18n/locales/en.ts`
- `frontend/i18n/locales/ru.ts`
- `frontend/i18n/locales/hi.ts`

### Суть правки (от старого к новому)
- Было:
  - mobile detail flow знал только факт отклика;
  - форма feedback открывалась после любой заявки, без различия между `pending` и подтвержденным участием.
- Стало:
  - detail response теперь содержит `viewerApplication`;
  - экран показывает статус заявки пользователя прямо в `ConnectOpportunityDetails`;
  - feedback открывается только для `approved/attended/completed`, а для `pending/rejected` показывается отдельное объяснение.

### Сниппеты кода

`frontend/types/connect.ts`:
```ts
export type ConnectApplicationStatus = 'pending' | 'approved' | 'attended' | 'completed' | 'rejected';
```

`frontend/screens/portal/connect/ConnectOpportunityDetailsScreen.tsx`:
```tsx
{viewerApplication ? (
  <View style={styles.applicationStatusCard}>
    <Text style={styles.applicationStatusValue}>
      {getConnectApplicationStatusLabel(viewerApplication.status, t)}
    </Text>
  </View>
) : null}
```

## 2026-03-06 (Connect feedback eligibility gate in mobile detail flow)

### Измененные файлы
- `frontend/types/connect.ts`
- `frontend/screens/portal/connect/ConnectOpportunityDetailsScreen.tsx`
- `frontend/i18n/locales/en.ts`
- `frontend/i18n/locales/ru.ts`
- `frontend/i18n/locales/hi.ts`

### Суть правки (от старого к новому)
- Было:
  - `ConnectOpportunityDetails` всегда показывал форму отзыва;
  - trust signals можно было усиливать без подтвержденного факта отклика на opportunity.
- Стало:
  - detail response получил флаг `canSubmitFeedback`;
  - экран `ConnectOpportunityDetails` показывает форму отзыва только после отклика;
  - до этого пользователь видит locked-state с объяснением, почему feedback пока закрыт.

### Сниппеты кода

`frontend/types/connect.ts`:
```ts
export interface ConnectOpportunityDetailResponse {
  opportunity: ConnectOpportunityCard;
  trustSummary?: ConnectTrustSummary | null;
  feedback?: ConnectFeedbackItem[];
  canSubmitFeedback?: boolean;
}
```

`frontend/screens/portal/connect/ConnectOpportunityDetailsScreen.tsx`:
```tsx
{canSubmitFeedback ? (
  <TouchableOpacity style={styles.primaryButton} onPress={handleSubmitFeedback}>
    <Text style={styles.primaryButtonText}>{t('portal.connect.feedback.submit')}</Text>
  </TouchableOpacity>
) : (
  <View style={styles.lockedCard}>
    <Text style={styles.lockedTitle}>{t('portal.connect.feedback.lockedTitle')}</Text>
  </View>
)}
```

## 2026-03-06 (Ekadashi provider fallback notice in mobile UI)

### Измененные файлы
- `frontend/types/ekadashi.ts`
- `frontend/utils/ekadashiCalendar.ts`
- `frontend/screens/portal/services/EkadashiCalendarScreen.tsx`
- `frontend/components/portal/CalendarWidget.tsx`
- `frontend/i18n/locales/en.ts`
- `frontend/i18n/locales/ru.ts`
- `frontend/i18n/locales/hi.ts`

### Суть правки (от старого к новому)
- Было:
  - mobile UI показывал только сами дни Экадаши и заметки дня;
  - пользователь не видел, пришли ли данные из live provider или backend уже перешел на fallback;
  - при отсутствии `city` для `ISKCON` или недоступности upstream интерфейс не объяснял причину приблизительных данных.
- Стало:
  - типы Ekadashi синхронизированы с backend-полем `providerDecision`;
  - экран `EkadashiCalendarScreen` показывает notice о причине fallback;
  - `CalendarWidget` в режиме Экадаши показывает компактную подсказку под переключателем организации;
  - в деталях дня появился отдельный блок `Data source` при fallback.

### Сниппеты кода

`frontend/utils/ekadashiCalendar.ts`:
```ts
export const getEkadashiProviderNoticeKey = (providerDecision?: EkadashiProviderDecision | null): string | null => {
  if (!providerDecision || providerDecision.mode !== 'fallback') return null;
  switch (providerDecision.reason) {
    case 'city_required_for_iskcon_live_provider':
      return 'portal.ekadashiCalendar.providerNotices.cityRequiredForLive';
    case 'no_live_source_configured':
      return 'portal.ekadashiCalendar.providerNotices.noLiveSource';
    default:
      return providerDecision.reason?.includes('_live_fetch_failed')
        ? 'portal.ekadashiCalendar.providerNotices.liveUnavailable'
        : 'portal.ekadashiCalendar.providerNotices.fallbackActive';
  }
};
```

`frontend/screens/portal/services/EkadashiCalendarScreen.tsx`:
```tsx
{providerNoticeKey ? (
  <View style={[styles.noticeBox, { backgroundColor: colors.accentSoft, borderColor: colors.accent }]}>
    <Text style={[styles.noticeText, { color: colors.textPrimary }]}>{t(providerNoticeKey)}</Text>
  </View>
) : null}
```

## 2026-03-06 (Ekadashi calendar service + widget mode for devotees)

### Измененные файлы
- `frontend/components/portal/CalendarWidget.tsx`
- `frontend/screens/portal/services/EkadashiCalendarScreen.tsx`
- `frontend/services/ekadashiService.ts`
- `frontend/utils/ekadashiCalendar.ts`
- `frontend/types/navigation.ts`
- `frontend/services/portalLayoutService.ts`
- `frontend/context/PortalLayoutContext.tsx`
- `frontend/types/portal.ts`
- `frontend/constants/portalRoles.ts`
- `frontend/App.tsx`

### Суть правки (от старого к новому)
- Было:
  - календарный виджет показывал только обычный gregorian month-view;
  - отдельного сервиса Экадаши в мобильной навигации не было;
  - role gating не скрывал ekadashi-функции для non-devotee;
  - выбранная организация и push-предпочтения Экадаши в mobile flow не поддерживались.
- Стало:
  - `CalendarWidget` получил два режима: `gregorian` и `ekadashi`, с выделением дней экадаши/махадвадаши и карточкой деталей по тапу;
  - добавлен `EkadashiCalendarScreen` с month-view, выбором организации, city/timezone и настройками уведомлений;
  - добавлен typed mobile client для `/ekadashi/*` endpoints и локальное сохранение выбранной организации через `AsyncStorage`;
  - portal layout и service catalog теперь показывают `ekadashi_calendar` только роли `devotee`;
  - в root navigation добавлен новый экран `EkadashiCalendar`.

### Сниппеты кода

`frontend/components/portal/CalendarWidget.tsx`:
```tsx
const [mode, setMode] = useState<'gregorian' | 'ekadashi'>('gregorian');

{canUseEkadashi ? (
  <TouchableOpacity onPress={() => setMode('ekadashi')}>
    <Text>{t('portal.widgets.calendar.modes.ekadashi')}</Text>
  </TouchableOpacity>
) : null}
```

```tsx
const response = await ekadashiService.getCalendar({
  month: monthKey,
  organizationId: resolvedOrganizationId,
  timezone,
  city: user?.city || '',
  country: '',
});
```

`frontend/screens/portal/services/EkadashiCalendarScreen.tsx`:
```tsx
<Stack.Screen
  name="EkadashiCalendar"
  component={EkadashiCalendarScreen}
  options={{ headerShown: false }}
/>
```

```tsx
const saved = await ekadashiService.updatePushPreference({
  ...preferences,
  organizationId,
  city,
  country,
  timezone,
});
```

## 2026-03-08 (Portal widget defaults to Ekadashi mode for devotees)

### Измененные файлы
- `frontend/components/portal/CalendarWidget.tsx`

### Суть правки (что было -> что стало)
- Было:
  - portal calendar widget для `devotee` открывался в режиме `gregorian` (`Месяц`);
  - данные Экадаши подгружались только после ручного переключения в `Экадаши`, из-за чего казалось, что виджет не работает.
- Стало:
  - для `devotee` widget стартует сразу в режиме `ekadashi`;
  - загрузка календаря Экадаши начинается сразу при открытии виджетов, без дополнительного тапа по переключателю.

### Короткий сниппет

`frontend/components/portal/CalendarWidget.tsx`:
```tsx
const canUseEkadashi = isDevoteeRole(user?.role);
const [mode, setMode] = useState<'gregorian' | 'ekadashi'>(
  canUseEkadashi ? 'ekadashi' : 'gregorian'
);
```

## 2026-03-08 (WidgetSelection empty-state recovery after deleting last widget)

### Измененные файлы
- `frontend/components/portal/widgets/WidgetCanvasGrid.tsx`
- `frontend/screens/portal/WidgetSelectionScreen.tsx`

### Суть правки (что было -> что стало)
- Было:
  - после удаления последнего виджета пользователь попадал в пустой canvas;
  - повторное добавление зависело от long-press по пустой зоне, который на устройстве мог не срабатывать стабильно.
- Стало:
  - при удалении последнего виджета `WidgetPickerSheet` открывается сразу автоматически;
  - в empty-state добавлена явная CTA-кнопка `Add widget`, помимо сохраненного long-press.

### Короткий сниппет

`frontend/screens/portal/WidgetSelectionScreen.tsx`:
```tsx
const handleRemoveWidget = useCallback((widgetId: string) => {
  const isRemovingLastWidget = widgets.length === 1 && widgets[0]?.id === widgetId;
  removeWidget(widgetId);
  if (isRemovingLastWidget) {
    openWidgetMenu();
  }
}, [openWidgetMenu, removeWidget, widgets]);
```

`frontend/components/portal/widgets/WidgetCanvasGrid.tsx`:
```tsx
<Pressable testID="widget-canvas-empty-add-button" onPress={handleCanvasLongPress}>
  <Text>{copy.emptyAction}</Text>
</Pressable>
```

## 2026-03-10 (Widgets page: higher contrast cards in light theme)

### Измененные файлы
- `frontend/components/portal/ClockWidget.tsx`
- `frontend/components/portal/CalendarWidget.tsx`
- `frontend/components/portal/CirclesQuickWidget.tsx`
- `frontend/components/portal/CirclesPanelWidget.tsx`
- `frontend/components/portal/FeedQuickWidget.tsx`
- `frontend/components/portal/FeedMixWidget.tsx`

### Суть правки (что было -> что стало)
- Было:
  - в light theme карточки виджетов использовали очень слабый surface/border и визуально терялись на светлом фоне страницы `Widgets`;
  - отдельные 1x1 и 2x2 widgets выглядели почти как продолжение фона.
- Стало:
  - для light theme виджеты используют более контрастный белый surface;
  - границы усилены до тёмно-нейтрального `rgba(15,23,42,0.14)`;
  - добавлена лёгкая тень, чтобы карточки визуально отделялись от полотна `Widgets`.

### Короткий сниппет

`frontend/components/portal/ClockWidget.tsx`:
```tsx
const isLightCanvasTheme = !isPhotoBg && !isDarkMode && !isVedaMatch;

backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : '#FFFFFF',
borderColor: isDarkMode ? 'rgba(255,255,255,0.2)' : 'rgba(15,23,42,0.14)',
...(isLightCanvasTheme ? {
  shadowColor: '#0F172A',
  shadowOpacity: 0.08,
  shadowRadius: 10,
  shadowOffset: { width: 0, height: 4 },
  elevation: 3,
} : {}),
```

## 2026-03-10 (WidgetSelection: remove page dots and normalize quick-access dock)

### Измененные файлы
- `frontend/screens/portal/WidgetSelectionScreen.tsx`

### Суть правки (что было -> что стало)
- Было:
  - на странице `Widgets` показывался отдельный блок с двумя точками и текстом свайпа, которого нет на основном `Portal`;
  - нижний dock с тремя quick-access слотами имел менее ровную геометрию, чем portal chrome.
- Стало:
  - page-indicator на `WidgetSelection` убран полностью;
  - нижний dock получил более симметричную раскладку: три слота теперь делят ширину равномерно и лучше совпадают по ощущению с портальной секцией.

### Короткий сниппет

`frontend/screens/portal/WidgetSelectionScreen.tsx`:
```tsx
quickAccessItem: {
  flex: 1,
  minWidth: 0,
  alignItems: 'center',
},
quickAccessEmpty: {
  flex: 1,
  height: 76,
  borderRadius: 26,
},
```

## 2026-03-06 (Chat open-at-bottom stabilization + large history virtualization)

### Измененные файлы
- `frontend/components/chat/MessageList.tsx`

### Суть правки (от старого к новому)
- Было:
  - при входе в чат с большим числом аудио/медиа-сообщений список мог открываться не на последнем сообщении;
  - автодокрутка вниз происходила заметно позже (через несколько секунд), когда менялся `contentSize`;
  - `maintainVisibleContentPosition` работал сразу и мог конфликтовать со стартовым `scrollToEnd`;
  - параметры виртуализации FlatList были дефолтными.
- Стало:
  - добавлен initial bottom-lock: серия коротких `scrollToEnd` в первые ~2 секунды после входа, пока пользователь не начал ручной скролл;
  - initial-stick окно сокращено (`~8s -> ~2.6s`), чтобы убрать поздние “прыжки” вниз;
  - `maintainVisibleContentPosition` включается только после пользовательского скролла/подгрузки старых сообщений;
  - добавлены параметры виртуализации под длинные чаты:
    - `initialNumToRender=12`
    - `maxToRenderPerBatch=12`
    - `updateCellsBatchingPeriod=50`
    - `windowSize=9`
    - `removeClippedSubviews` только на Android;
  - увеличен нижний отступ ленты (`paddingBottom: 10 -> 18`) для лучшей видимости последнего bubble над инпутом.

### Сниппеты кода

`frontend/components/chat/MessageList.tsx`:
```tsx
const startInitialBottomLock = useCallback(() => {
  stopInitialBottomLock();
  initialSnapAttemptsRef.current = 0;
  flatListRef.current?.scrollToEnd({ animated: false });
  initialSnapIntervalRef.current = setInterval(() => {
    if (hasUserInteractedRef.current || initialSnapAttemptsRef.current >= 14) {
      stopInitialBottomLock();
      return;
    }
    flatListRef.current?.scrollToEnd({ animated: false });
    initialSnapAttemptsRef.current += 1;
  }, 120);
}, [stopInitialBottomLock]);
```

```tsx
maintainVisibleContentPosition={
  enableMaintainVisiblePosition ? { minIndexForVisible: 1 } : undefined
}
```

```tsx
<FlatList
  initialNumToRender={12}
  maxToRenderPerBatch={12}
  updateCellsBatchingPeriod={50}
  windowSize={9}
  removeClippedSubviews={Platform.OS === 'android'}
/>
```

## 2026-03-06 (Chat list positioning: keep latest message near input on open)

### Измененные файлы
- `frontend/components/chat/MessageList.tsx`

### Суть правки (от старого к новому)
- Было:
  - при короткой истории список сообщений визуально выравнивался к верхней части контейнера;
  - при входе в чат появлялся большой пустой промежуток между последним сообщением и инпутом.
- Стало:
  - `contentContainerStyle` списка переведен в режим нижнего якоря (`flexGrow:1`, `justifyContent:'flex-end'`);
  - уменьшен лишний `paddingBottom` (`44 -> 10`) для более плотного прилегания последнего сообщения к зоне ввода;
  - добавлен `onContentSizeChange` c initial `scrollToEnd` и коротким повторным settle-scroll (`~180ms`) для iOS;
  - добавлен sticky-bottom guard: пока пользователь находится у нижней границы списка (`distanceFromBottom <= 120`), любое последующее изменение высоты контента (в т.ч. поздний layout аудио bubble) автоматически докручивает чат вниз;
  - добавлен initial-stick window (`~8s`): если пользователь еще не взаимодействовал со скроллом, чат удерживается у низа даже при поздних пересчетах высоты;
  - `loadOlderMessages` теперь стартует только после реального пользовательского скролла (`onScrollBeginDrag`), чтобы исключить отложенные авто-прыжки списка на входе;
  - результат: при входе в чат последнее сообщение видно сразу над инпутом.

### Сниппеты кода

`frontend/components/chat/MessageList.tsx`:
```tsx
listContent: {
  flexGrow: 1,
  justifyContent: 'flex-end',
  paddingTop: 8,
  paddingHorizontal: 14,
  paddingBottom: 10,
},
```

```tsx
useEffect(() => {
  listSnapshotRef.current = { length: 0 };
}, [recipientUser?.ID]);
```

```tsx
settleScrollTimeoutRef.current = setTimeout(() => {
  flatListRef.current?.scrollToEnd({ animated: false });
}, 180);
```

## 2026-03-06 (Chat audio playback: prevent parallel voice playback)

### Измененные файлы
- `frontend/components/chat/AudioPlayer.tsx`

### Суть правки (от старого к новому)
- Было:
  - каждый `AudioPlayer` в чате создавал собственный `AudioRecorderPlayer` без глобальной координации;
  - при нажатии `play` на разных аудио несколько сообщений могли воспроизводиться одновременно.
- Стало:
  - добавлен module-level `activeAudioController` (single-active playback);
  - при старте нового аудио предыдущий активный плеер принудительно останавливается;
  - при pause/stop/unmount active-controller корректно освобождается.

### Сниппеты кода

`frontend/components/chat/AudioPlayer.tsx`:
```tsx
let activeAudioController: ActiveAudioController | null = null;

const claimActiveAudioController = async (next: ActiveAudioController) => {
  if (activeAudioController && activeAudioController.id !== next.id) {
    await activeAudioController.stop();
  }
  activeAudioController = next;
};
```

```tsx
await claimActiveAudioController({
  id: playerInstanceIdRef.current,
  stop: async () => {
    await stopPlayback(true);
  },
});
```

## 2026-03-05 (Support flow hardening: in-app ticket enabled + @vedamatch_bot + RU/EN/HI)

### Измененные файлы
- `frontend/screens/support/SupportHomeScreen.tsx`
- `frontend/screens/support/SupportTicketFormScreen.tsx`
- `frontend/screens/support/SupportConversationScreen.tsx`
- `frontend/services/supportService.ts`
- `server/internal/handlers/support_handler.go`
- `server/internal/services/telegram_support_service.go`
- `server/internal/services/support_ai_service.go`
- `server/internal/database/seed.go`

### Суть правки (от старого к новому)
- Было:
  - кнопка `Создать обращение без Telegram` могла быть недоступна в app-конфиге;
  - support-ссылка могла указывать не на целевой бот;
  - support UI/бот/AI не были полноценно доведены до единого `ru/en/hi` поведения;
  - в in-app сообщениях не передавался явный device-context клиента.
- Стало:
  - in-app тикеты включены по умолчанию (кроме явного force-disable);
  - ссылка поддержки нормализуется и форсируется на `https://t.me/vedamatch_bot`;
  - тексты support-экрана и Telegram-бота локализованы для `ru/en/hi`, включая Hindi;
  - AI поддержки получил явные Hindi ветки (prompt/sanitize/diagnostics) и улучшенное автоопределение языка;
  - в create/post ticket payload добавлены поля устройства (`devicePlatform`, `deviceOs`, `deviceOsVersion`) для операторской диагностики;
  - email-сценарий в UI поддержки убран в пользу "поддержки в чате/системе".

### Сниппеты кода

`frontend/screens/support/SupportHomeScreen.tsx`:
```tsx
const DEFAULT_SUPPORT_BOT_URL = 'https://t.me/vedamatch_bot';
const inAppTicketAvailable = !!config.channels.inAppTicket;
const target = config.telegramBotUrl || config.channelUrl || DEFAULT_SUPPORT_BOT_URL;
```

`frontend/screens/support/SupportTicketFormScreen.tsx`:
```tsx
const clientMeta = useMemo(() => ({
  devicePlatform: Platform.OS,
  deviceOs: Platform.OS,
  deviceOsVersion: String(Platform.Version ?? ''),
}), []);

await supportService.createTicket({
  ...payload,
  ...clientMeta,
});
```

`server/internal/handlers/support_handler.go`:
```go
const defaultSupportTelegramBotURL = "https://t.me/vedamatch_bot"

func (h *SupportHandler) supportInAppTicketAllowed(userID uint, ip string) bool {
  _ = userID
  _ = ip
  if parseSupportBool(getSupportSetting("SUPPORT_INAPP_TICKET_FORCE_DISABLE"), false) {
    return false
  }
  return true
}
```

`server/internal/services/support_ai_service.go`:
```go
func normalizeSupportLanguage(language string) string {
  lower := strings.ToLower(strings.TrimSpace(language))
  if strings.HasPrefix(lower, "ru") { return "ru" }
  if strings.HasPrefix(lower, "hi") { return "hi" }
  return "en"
}
```

## 2026-03-05 (Russian locale parity rollout: screen-level 100%)

### Измененные файлы
- `frontend/i18n/locales/ru.ts`

### Суть правки (от старого к новому)
- Было:
  - `ru.ts` отставал от `en.ts` по новым ключам, часть экранов уходила в fallback/missing.
- Стало:
  - добавлены отсутствующие ключи для экранных namespace (`common`, `map`, `market`, `cafe`, `library`, `qr`, `reader`, `chat`, `auth`, `dating`, `wallet`, `videoCircles`);
  - переведены fallback-строки, включая новые product/validation ключи и системные сообщения;
  - итог по экранным ссылкам i18n: `RU 100%` (`missing=0`, `fallback=0`).

### Сниппеты кода

`frontend/i18n/locales/ru.ts`:
```ts
common: {
  open: 'Открыть',
  retry: 'Повторить',
},
map: {
  navigate: 'Маршрут',
  near_objects: 'Рядом с вами',
},
wallet: {
  goToWallet: 'Перейти в кошелек',
  topUpToChat: 'Пополните LKM, чтобы продолжить',
}
```

## 2026-03-05 (Hindi rollout phase 1-10: full screen-level i18n parity)

### Измененные файлы
- `frontend/i18n/locales/hi.ts`

### Суть правки (от старого к новому)
- Было:
  - в `hi.ts` значительная часть UI-строк оставалась на English fallback для ключевых экранов (`ads`, `market`, `cafe`, `contacts`, `wallet`, `common/map/calls`).
- Стало:
  - переведены на Hindi высокочастотные ключи для основных пользовательских потоков;
  - дополнительно переведены блоки `pathTracker`, `dating`, `profile`, `videoTariffs`, `videoCircles`, `education`, `reader`;
  - добавлены отсутствующие ключи в `en.ts` и `hi.ts`, чтобы убрать runtime missing keys на экранах;
  - устранен конфликт ключа `market.shops.productsCount` через перенос на `market.productsCount` в экране `MyProductsScreen`;
  - в phase 10 добит остаточный fallback (включая брендо/терминные строки) до полного parity;
  - итог: `missing keys = 0`, экранный Hindi coverage по i18n-ссылкам `100.00%` (`1153/1153`);
  - сохранена структура и совместимость i18n без изменения экранной логики;
  - уменьшен English fallback на iOS/Android для ключевых экранов.

### Сниппеты кода

`frontend/i18n/locales/hi.ts`:
```ts
"ads": {
  "title": "विज्ञापन",
  "createAd": "विज्ञापन बनाएं",
  "searchPlaceholder": "विज्ञापन खोजें..."
},
"cafe": {
  "title": "कैफ़े और रेस्टोरेंट",
  "cart": {
    "title": "कार्ट",
    "placeOrder": "ऑर्डर करें"
  }
},
"wallet": {
  "management": "गतिविधि अवलोकन",
  "history": "गतिविधि इतिहास"
}
```

`frontend/screens/portal/shops/MyProductsScreen.tsx`:
```tsx
{totalItems} {t('market.productsCount') || 'products'}
```

## 2026-03-05 (Hindi locale completion to full key coverage)

### Измененные файлы
- `frontend/i18n/locales/hi.ts`

### Суть правки (от старого к новому)
- Было:
  - Hindi-локаль покрывала только часть модулей (`~11%` ключей), из-за чего на iOS многие экраны в режиме `hi` уходили в fallback на `en` через отсутствие ключей.
- Стало:
  - `hi.ts` синхронизирован по полной структуре с `en.ts` (`100%` ключей);
  - существующие Hindi-переводы сохранены без изменений;
  - отсутствующие ранее ключи заполнены fallback-значениями из английской локали, чтобы исключить runtime-missing-key для iOS/Android.

### Сниппеты кода

`frontend/i18n/locales/hi.ts`:
```ts
export default {
    "common": {
        "error": "त्रुटि",
        "success": "सफल",
        "info": "जानकारी",
        "save": "सहेजें",
        "add": "जोड़ें",
        "cancel": "रद्द करें",
        "delete": "हटाएं",
        "edit": "संपादित करें"
    },
    ...
};
```

## 2026-03-05 (iOS startup crash fix: PushKit VoIP registration guarded in DEV runtime)

### Измененные файлы
- `frontend/App.tsx`

### Суть правки (от старого к новому)
- Было:
  - на iOS в `useEffect` всегда вызывался `VoipPushNotification.registerVoipToken()` при наличии модуля;
  - в Debug/Simulator рантайме это приводило к падению на старте в цепочке PushKit (`doesNotRecognizeSelector` внутри `voipRegistrationSucceededWithDeviceToken`).
- Стало:
  - регистрация VoIP-токена выполняется только вне `__DEV__` (`shouldRegisterVoipPush`);
  - в DEV оставлены listeners (`notification`, `didLoadWithEvents`), но сам `registerVoipToken()` пропускается;
  - итог: приложение стабильно запускается в симуляторе/Debug без белого экрана и native crash на старте.

### Сниппеты кода

`frontend/App.tsx`:
```tsx
const shouldRegisterVoipPush = useCallKeepNativeUi && VoipPushNotification && !__DEV__;
if (useCallKeepNativeUi && VoipPushNotification) {
  if (shouldRegisterVoipPush) {
    VoipPushNotification.registerVoipToken();
  } else {
    console.log('[VoIP] registerVoipToken skipped in dev runtime');
  }
}
```

## 2026-03-05 (iOS crash fix: FlashList v2 fallback on old architecture)

### Измененные файлы
- `frontend/lib/flashListCompat.ts`

### Суть правки (от старого к новому)
- Было:
  - проверка поддержки FlashList опиралась только на `global.nativeFabricUIManager`;
  - в части iOS рантаймов это давало ложный `true`, модуль FlashList v2 подключался и падал с ошибкой `FlashList v2 is only supported on new architecture`.
- Стало:
  - детектор переведен на `NativeModules.PlatformConstants.isNewArchEnabled` (если доступен);
  - fallback-ветка проверяет сразу два признака (`nativeFabricUIManager` и `__turboModuleProxy`);
  - при несоответствии архитектуры используется `FlatList`, без краша.

### Сниппеты кода

`frontend/lib/flashListCompat.ts`:
```ts
const platformConstants = (NativeModules as { PlatformConstants?: { isNewArchEnabled?: boolean } }).PlatformConstants;
if (typeof platformConstants?.isNewArchEnabled === 'boolean') {
  return platformConstants.isNewArchEnabled;
}
return Boolean(runtime.nativeFabricUIManager) && Boolean(runtime.__turboModuleProxy);
```

## 2026-03-05 (Chat transcription billing v2: weekly quota + LKM charging + quote API)

### Измененные файлы
- `server/internal/models/chat_transcribe_weekly_usage.go`
- `server/internal/models/chat_transcribe_job.go`
- `server/internal/database/database.go`
- `server/internal/database/seed.go`
- `server/internal/services/chat_transcribe_billing_config_service.go`
- `server/internal/services/chat_transcribe_billing_service.go`
- `server/internal/services/chat_transcription_service.go`
- `server/internal/services/wallet_service.go`
- `server/internal/services/metrics_service.go`
- `server/internal/handlers/message_chat_features.go`
- `server/cmd/api/main.go`
- `frontend/services/messageService.ts`
- `frontend/components/chat/MessageList.tsx`

### Суть правки (от старого к новому)
- Было:
  - `POST /messages/:id/transcribe` выполнял только транскрибацию и сохранение transcript без тарифа/квоты/LKM;
  - отсутствовал endpoint предпросмотра цены;
  - не было anti-race state для транскрибации одного и того же сообщения.
- Стало:
  - добавлен `GET /messages/:id/transcribe/quote` для расчета стоимости до запуска;
  - `POST /messages/:id/transcribe` теперь включает billing flow:
    - UTC ISO week квота бесплатных минут,
    - расчет минут с округлением вверх,
    - тариф `standard` / `long_audio`,
    - `402 INSUFFICIENT_LKM`,
    - `409 TRANSCRIBE_IN_PROGRESS`,
    - idempotent refund + rollback free quota при ошибке после списания;
  - результат `POST` расширен полем `billing` без ломки `transcript`;
  - на фронте перед `POST` запрашивается quote, при платном запросе показывается confirm, обработка `402` вынесена в отдельный UX.

### Сниппеты кода

`server/cmd/api/main.go`:
```go
protected.Get("/messages/:id/transcribe/quote", messageHandler.GetTranscribeQuote)
protected.Post("/messages/:id/transcribe", messageHandler.TranscribeMessage)
protected.Post("/messages/transcribe/:id", messageHandler.TranscribeMessage)
```

`server/internal/handlers/message_chat_features.go`:
```go
if errors.Is(txErr, services.ErrChatTranscribeInsufficientLKM) {
  return c.Status(fiber.StatusPaymentRequired).JSON(fiber.Map{
    "error": "Недостаточно LKM для расшифровки",
    "code":  "INSUFFICIENT_LKM",
  })
}
if errors.Is(txErr, errTranscribeInProgress) {
  return c.Status(fiber.StatusConflict).JSON(fiber.Map{
    "error": "Расшифровка уже выполняется",
    "code":  "TRANSCRIBE_IN_PROGRESS",
  })
}
```

`server/internal/services/chat_transcribe_billing_service.go`:
```go
audioMinutes := ComputeChatTranscribeAudioMinutes(durationSec)
quote := CalculateChatTranscribeBillingQuote(cfg, audioMinutes, usedThisWeek)
chargeDedup, refundDedup := BuildChatTranscribeDedupKeys(userID, messageID)
processed, spendErr := s.walletService.SpendTx(tx, userID, quote.ChargedLkm, chargeDedup, "Chat transcription", SpendOptions{
  AllowBonus: true, MaxBonusPercent: 100,
})
```

`frontend/components/chat/MessageList.tsx`:
```tsx
const quote = await messageService.getTranscribeQuote(messageId);
const shouldContinue = await confirmTranscribeQuote(quote.billing);
if (!shouldContinue) return;

const response = await messageService.transcribeMessage(messageId);
if (Number(response.billing?.chargedLkm || 0) > 0) {
  Alert.alert('Расшифровка готова', `Списано ${response.billing?.chargedLkm} LKM`);
}
```

## 2026-03-05 (Audio transcription 405 fix: route precedence + fallback endpoint)

### Измененные файлы
- `server/cmd/api/main.go`
- `frontend/services/messageService.ts`

### Суть правки (от старого к новому)
- Было:
  - при вызове `POST /messages/:id/transcribe` часть клиентов получала `405 Method Not Allowed`;
  - причина: общий маршрут `GET /messages/:userId/:recipientId` мог перехватывать path с двумя сегментами и отдавать метод-конфликт.
- Стало:
  - в backend маршрут `GET /messages/:userId/:recipientId` перенесен вниз блока сообщений;
  - добавлен alias `POST /messages/transcribe/:id` для обратной совместимости;
  - на клиенте `messageService.transcribeMessage()` при `404/405` автоматически делает retry на alias endpoint.

### Сниппеты кода

`server/cmd/api/main.go`:
```go
protected.Post("/messages/:id/transcribe", messageHandler.TranscribeMessage)
protected.Post("/messages/transcribe/:id", messageHandler.TranscribeMessage)
protected.Get("/messages/:userId/:recipientId", messageHandler.GetMessages) // last
```

`frontend/services/messageService.ts`:
```ts
try {
  return (await apiClient.post(`/messages/${messageId}/transcribe`, payload)).data;
} catch (error) {
  if (status === 404 || status === 405) {
    return (await apiClient.post(`/messages/transcribe/${messageId}`, payload)).data;
  }
  throw error;
}
```

## 2026-03-05 (Chat audio visibility fix after upload finalization)

### Измененные файлы
- `frontend/context/ChatContext.tsx`

### Суть правки (от старого к новому)
- Было:
  - после успешной отправки медиа (включая аудио) финальное сообщение заменяло временное только через `map` по `tempId`;
  - если временное сообщение уже отсутствовало в state (из-за race с WS/перерендерами), финальное сообщение могло не попасть в список и визуально “пропадало”.
- Стало:
  - post-upload merge сделан idempotent:
    - удаляется `tempId`,
    - если финальный `id` уже есть — нормализуется существующий item,
    - если финального `id` нет — сообщение принудительно добавляется в список;
  - итог: аудио/медиа сообщение всегда отображается в чате после успешного upload.

### Сниппеты кода

`frontend/context/ChatContext.tsx`:
```tsx
const withoutTemp = prev.filter(m => m.id !== tempId);
const existingIndex = withoutTemp.findIndex(m => m.id === finalId);
if (existingIndex >= 0) {
  updated[existingIndex] = { ...updated[existingIndex], ...finalMessage, id: finalId, uploading: false };
  return updated;
}
return [...withoutTemp, { ...finalMessage, id: finalId, uploading: false }];
```

## 2026-03-05 (Chat media post-send hard sync to eliminate UI race)

### Измененные файлы
- `frontend/context/ChatContext.tsx`

### Суть правки (от старого к новому)
- Было:
  - после успешной отправки медиа UI опирался на локальный merge (`temp -> final`) и WS;
  - в редких гонках список сообщений мог остаться без только что отправленного аудио, хотя backend уже сохранил сообщение.
- Стало:
  - после успешного upload/merge добавлен принудительный refresh истории текущего P2P-чата через `/messages/history`;
  - список синхронизируется с серверным состоянием и дедуплицируется по `id`;
  - обновляются `hasOlderMessages` и `nextBeforeId`.

### Сниппеты кода

`frontend/context/ChatContext.tsx`:
```tsx
const refreshedPage = await messageService.getMessagesHistory(recipientId, 30);
const refreshedMessages = refreshedPage.items.map((m) => normalizeP2PMessage(m, currentUserId));
setMessages(prev => dedupeMessagesById([
  ...refreshedMessages,
  ...prev.filter(m => m.uploading),
]));
setHasOlderMessages(refreshedPage.hasMore);
setP2PNextBeforeId(refreshedPage.nextBeforeId ?? null);
```

## 2026-03-05 (Chat CDN flow + video_circle + chat menu features + audio transcription)

### Измененные файлы
- `server/internal/models/chat_preference.go`
- `server/internal/database/database.go`
- `server/internal/config/feature_flags.go`
- `server/internal/services/message_media_cdn_policy.go`
- `server/internal/services/s3_service.go`
- `server/internal/handlers/media_handler.go`
- `server/internal/handlers/message_chat_features.go`
- `server/internal/services/chat_video_circle_cleanup_service.go`
- `server/internal/services/chat_transcription_service.go`
- `server/internal/services/message_push_service.go`
- `server/cmd/api/main.go`
- `frontend/services/messageService.ts`
- `frontend/services/mediaService.ts`
- `frontend/context/ChatContext.tsx`
- `frontend/components/chat/ChatConstants.ts`
- `frontend/components/chat/MessageList.tsx`
- `frontend/components/chat/ChatInput.tsx`
- `frontend/screens/ChatScreen.tsx`
- `frontend/screens/portal/ads/CreateAdScreen.tsx`

### Суть правки (от старого к новому)
- Было:
  - media upload в чате шел только через `/messages/media` (multipart), без прямого `presign -> PUT -> finalize` для `video_circle`;
  - отсутствовали endpoint-ы чата для меню (`media-index`, `search`, `mute/pin`, `share-contact`, `transcribe`);
  - не было `chat_preferences` и suppression push при mute;
  - в RN меню чата пункты `Медиа и файлы`, `Поиск`, `Убрать звук`, `Закрепить чат`, `Поделиться контактом` были не реализованы/disabled;
  - отсутствовал UI/flow для `video_circle` (до 60с) и отображение транскрибации под аудио.
- Стало:
  - добавлен backend CDN-контур для `video_circle`: `POST /messages/media/presign` + `POST /messages/media/finalize` c проверкой URL-политики и feature flags;
  - добавлены backend endpoint-ы:
    - `GET /messages/media-index`
    - `GET /messages/search`
    - `PUT /messages/preferences/:peerUserId`
    - `POST /messages/share-contact`
    - `POST /messages/:id/transcribe`;
  - введен cleanup scheduler для удаления `video_circle` старше 30 дней и пометки `mapData.mediaStatus="expired"`;
  - добавлена on-demand транскрибация аудио через OpenAI (`gpt-4o-mini-transcribe` -> fallback `gpt-4o-transcribe`);
  - после успешной транскрибации backend отправляет WS-событие `type=message_transcription_updated` с `mapData.messageId/mapData.transcript` для live-обновления bubble;
  - в RN:
    - `messageService` расширен новыми API;
    - `mediaService` получил `video_circle` flow (`pick/record <=60s`, `presign -> PUT -> finalize`);
    - меню в `ChatScreen` реализовано модалками для media/search/share и toggle mute/pin;
    - `MessageList` рендерит `video_circle`, `contact_card`, кнопку `Расшифровать` и блок transcript.
  - доп. стабилизация сборки:
    - в `CreateAdScreen` добавлен guard `if (!adId) return` перед `getAd(adId)`, чтобы убрать TS-ошибку `number | undefined` и не делать лишний запрос в режиме create.

### Сниппеты кода

`server/cmd/api/main.go`:
```go
messages.Post("/media/presign", messageHandler.PresignMessageMedia)
messages.Post("/media/finalize", messageHandler.FinalizeMessageMedia)
messages.Get("/media-index", messageHandler.GetMessageMediaIndex)
messages.Get("/search", messageHandler.SearchMessages)
messages.Put("/preferences/:peerUserId", messageHandler.UpdateChatPreference)
messages.Post("/share-contact", messageHandler.ShareContact)
messages.Post("/:id/transcribe", messageHandler.TranscribeMessage)
```

`server/internal/services/chat_transcription_service.go`:
```go
result, err := TranscribeChatAudio(ctx, audioURL, language)
// default model: gpt-4o-mini-transcribe, fallback: gpt-4o-transcribe
```

`server/internal/handlers/message_chat_features.go`:
```go
eventMessage := models.Message{
  Type: "message_transcription_updated",
  MapData: map[string]interface{}{
    "messageId": msg.ID,
    "transcript": transcript,
  },
}
h.hub.Broadcast(eventMessage)
```

`frontend/services/mediaService.ts`:
```ts
const presignResponse = await apiClient.post('/messages/media/presign', { type: 'video_circle', ... });
await RNFS.uploadFiles({ toUrl: uploadUrl, method: 'PUT', binaryStreamOnly: true, ... }).promise;
const finalizeResponse = await apiClient.post('/messages/media/finalize', { type: 'video_circle', content: finalUrl, ... });
```

`frontend/components/chat/MessageList.tsx`:
```tsx
<TouchableOpacity onPress={() => handleTranscribeAudio(item)}>
  <Text>Расшифровать</Text>
</TouchableOpacity>
```

`frontend/screens/portal/ads/CreateAdScreen.tsx`:
```tsx
const loadExistingAd = React.useCallback(async () => {
  if (!adId) return;
  const ad = await adsService.getAd(adId);
  ...
}, [adId]);
```

## 2026-03-05 (Chat audio playback: CDN 403 fallback to direct S3 URL)

### Измененные файлы
- `frontend/components/chat/MessageList.tsx`

### Суть правки (от старого к новому)
- Было:
  - голосовые сообщения в чате использовали URL `https://cdn.vedamatch.ru/messages/audio/...`;
  - на проде CDN для этих объектов сейчас отвечает `HTTP 403`, из-за чего голосовые не воспроизводились.
- Стало:
  - для аудио URL добавлен runtime-fallback: если URL начинается с `cdn.vedamatch.ru/messages/audio/`, клиент подменяет хост на прямой S3 URL и воспроизводит файл оттуда;
  - это временный mitigation до исправления CDN-конфигурации.

### Сниппеты кода

`frontend/components/chat/MessageList.tsx`:
```tsx
const CDN_AUDIO_PREFIX = 'https://cdn.vedamatch.ru/messages/audio/';
const S3_AUDIO_FALLBACK_PREFIX = 'https://s3.firstvds.ru/05859cbd-c4799b8f-c25d-417d-b8a3-7c54ac14c436/messages/audio/';

const applyAudioHostFallback = (url: string): string => {
  if (!url.startsWith(CDN_AUDIO_PREFIX)) return url;
  return `${S3_AUDIO_FALLBACK_PREFIX}${url.slice(CDN_AUDIO_PREFIX.length)}`;
};
```

## 2026-03-05 (Grafana dashboard: `Total 5xx Responses` no-data fallback fix)

### Измененные файлы
- `infra/monitoring/grafana/dashboards/fastapi-observability.json`

### Суть правки (от старого к новому)
- Было:
  - панель `Total 5xx Responses` использовала выражение `sum(http_requests_total{...,status_class="5xx"})`;
  - при отсутствии 5xx Prometheus возвращал пустой вектор, и Grafana показывала `No data`.
- Стало:
  - выражение панели переведено на range + fallback:
    - `sum(increase(http_requests_total{...,status_class="5xx"}[24h])) or vector(0)`;
  - при нулевых 5xx панель теперь показывает `0` вместо `No data`.

### Сниппеты кода

`infra/monitoring/grafana/dashboards/fastapi-observability.json`:
```promql
sum(increase(http_requests_total{job=~"$app_name",status_class="5xx",route!="/metrics"}[24h])) or vector(0)
```

## 2026-03-04 (Rooms header: remove photo wallpaper in chat/rooms service)

### Измененные файлы
- `frontend/screens/portal/PortalMainScreen.tsx`

### Суть правки (от старого к новому)
- Было:
  - solid-header включался для `contacts` и `rooms`, но не для `chat`;
  - сервис комнат у пользователя открывался через вкладку `chat`, поэтому в header продолжал просвечивать фото-фон.
- Стало:
  - header для сервиса комнат принудительно solid и для `activeTab === 'chat'`;
  - цвет header переключен на гарантированно непрозрачный `vTheme.colors.background` (вместо `surface`), чтобы полностью убрать просвечивание обоев.

### Сниппеты кода

`frontend/screens/portal/PortalMainScreen.tsx`:
```tsx
const shouldUseSolidRoomsHeader = activeTab === 'rooms' || activeTab === 'chat';
const serviceHeaderBackgroundColor = shouldUseSolidServiceHeader ? vTheme.colors.background : 'transparent';
```

## 2026-03-04 (Sambandha profile: role-based field visibility in edit form)

### Измененные файлы
- `frontend/screens/settings/EditProfileScreen.tsx`

### Суть правки (от старого к новому)
- Было:
  - поля духовного блока (`Yatra`, `Timezone`, `Tradition/Madh`, `Yoga Style`, `Guna`) всегда отображались для всех ролей, включая `Искатель`.
  - перед сохранением не было role-aware валидации обязательных полей.
- Стало:
  - введена role-aware логика в форме:
    - `user` (`Искатель`) видит базовые поля без духовного блока;
    - `in_goodness`, `yogi`, `devotee` видят духовные поля;
  - добавлена role-aware валидация перед `Save`:
    - для всех ролей обязательны `city` и `nickname`;
    - для `in_goodness/yogi/devotee` при `datingEnabled=true` обязательны `bio`, `interests` и минимум одно духовное поле из набора (`yatra/timezone/madh/yogaStyle/guna`);
  - снижен порог заполнения профиля для стартовой роли без удаления существующих данных в state/backend.

### Сниппеты кода

`frontend/screens/settings/EditProfileScreen.tsx`:
```tsx
const isSeekerRole = role === 'user';
const showSpiritualFields = !isSeekerRole;
```

```tsx
{showSpiritualFields && (
  <>
    <Text style={styles.label}>{t('dating.yatra')}</Text>
    <TextInput ... />
    <Text style={styles.label}>{t('dating.timezone')}</Text>
    <TextInput ... />
  </>
)}
```

```tsx
const validationError = getProfileValidationError();
if (validationError) {
  Alert.alert(t('common.error'), validationError);
  return;
}
```

```tsx
{showSpiritualFields && (
  <>
    <Text style={styles.label}>{t('dating.madh')}</Text>
    <TouchableOpacity ... />
    <Text style={styles.label}>{t('dating.yogaStyle')}</Text>
    <TouchableOpacity ... />
    <Text style={styles.label}>{t('dating.guna')}</Text>
    <TouchableOpacity ... />
  </>
)}
```

## 2026-03-04 (Cafe commission v1: LKM hold -> settlement on completed)

### Измененные файлы
- `server/internal/models/cafe_order.go`
- `server/internal/models/wallet.go`
- `server/internal/services/cafe_order_service.go`
- `server/internal/services/wallet_service.go`
- `server/internal/services/cafe_fee_config_service.go`
- `server/internal/services/cafe_fee_config_service_test.go`
- `server/internal/services/metrics_service.go`
- `server/internal/database/seed.go`

### Суть правки (от старого к новому)
- Было:
  - LKM в `cafe` списывался сразу при создании заказа (`spend`);
  - на `completed` не было финансового split в платформу/кафе;
  - не было snapshot полей комиссии и settlement state в заказе;
  - wallet-трассировка cafe-транзакций не имела отдельной ссылки на `order`.
- Стало:
  - для `payment_method='lkm'` при создании заказа используется `hold` (заморозка), не финальный spend;
  - на `completed` выполняется settlement с комиссией платформы:
    - `platform_wallet += fee`
    - `merchant_wallet += payout`;
  - на `cancelled` до settlement выполняется полный refund hold;
  - добавлены snapshot поля комиссии и `settlementStatus` в `CafeOrder`;
  - в `WalletTransaction` добавлен `orderId`;
  - добавлен конфиг `CAFE_PLATFORM_FEE_*` (db/env) + rollout/effective_from;
  - добавлены метрики cafe settlement/fee.

### Сниппеты кода

`server/internal/services/cafe_order_service.go`:
```go
processed, err := s.walletService.ReleaseOrderHoldWithPlatformFeeTx(
  tx,
  *order.CustomerID,
  order.RegularLkmHeld,
  order.BonusLkmHeld,
  order.ID,
  cafe.OwnerID,
  order.PlatformFeeAmountLkm,
  fmt.Sprintf("cafe_order_settlement_%d", order.ID),
  "Оплата заказа в кафе "+order.OrderNumber,
)
```

`server/internal/services/cafe_fee_config_service.go`:
```go
type CafeFeeConfig struct {
  Enabled        bool
  PercentBps     int
  CapLkm         int
  MinOrderLkm    int
  EffectiveFrom  *time.Time
  RolloutPercent int
}
```

`server/internal/models/cafe_order.go`:
```go
SettlementStatus models.CafeOrderSettlementStatus `gorm:"type:varchar(20);default:'pending';index"`
PlatformFeeAmountLkm int
MerchantPayoutLkm int
SettlementTxID string `gorm:"type:varchar(100)"`
```

## 2026-03-04 (Grafana FastAPI-template compatibility for current Go metrics)

### Измененные файлы
- `infra/monitoring/grafana/dashboards/fastapi-observability.json`

### Суть правки (от старого к новому)
- Было:
  - импортируемый FastAPI dashboard ожидал метрики `fastapi_*` и Loki label `compose_service`;
  - в текущем Vedamatch backend/collector используются `http_*` метрики и Loki labels `service/container`, из-за чего панели были пустыми.
- Стало:
  - дефолтный dashboard `uid=fastapi-observability` заменен на совместимую Vedamatch-версию с рабочими запросами под существующие метрики:
    - `http_requests_total`
    - `http_request_duration_seconds_*`
    - `http_in_flight_requests`;
  - Loki панели переведены на selector `{service=~"vedamatch-.*|dokploy-traefik"}`.

### Сниппеты кода

`infra/monitoring/grafana/dashboards/fastapi-observability.json`:
```json
{
  "title": "FastAPI Observability",
  "uid": "fastapi-observability"
}
```

Prometheus panel expression (пример):
```promql
sum(http_requests_total{job=~"$app_name",route!="/metrics"})
```

Loki panel expression (пример):
```logql
{service=~"vedamatch-.*|dokploy-traefik"} |= "$log_keyword"
```

## 2026-03-04 (Services: platform fee snapshot + master payout visibility)

### Измененные файлы
- `server/internal/models/service_booking.go`
- `server/internal/services/service_fee_config_service.go`
- `server/internal/services/booking_service.go`
- `server/internal/services/wallet_service.go`
- `server/internal/services/metrics_service.go`
- `server/internal/database/seed.go`
- `frontend/services/bookingService.ts`
- `frontend/screens/portal/services/IncomingBookingsScreen.tsx`

### Суть правки (от старого к новому)
- Было:
  - в `Services bookings` не было встроенной комиссии платформы;
  - при `completed/no_show` вся разморозка уходила мастеру;
  - в ответе `ServiceBooking` не было финансового snapshot комиссии;
  - на экране входящих записей мастера показывалась только полная сумма.
- Стало:
  - добавлен конфиг комиссии платформы через `SystemSetting` (`enabled/percent_bps/cap/apply_no_show/rollout`);
  - на создании брони сохраняется snapshot: `commissionPercentBps`, `commissionCapLkm`, `platformFeeAmount`, `providerNetAmount`, `feeCalculatedAt`;
  - при `completed/no_show` используется атомарный split: часть в `WalletTypePlatform`, остаток мастеру;
  - для `cancelled` сохранен полный refund клиенту без комиссии;
  - в UI мастера (`IncomingBookingsScreen`) добавлен блок: `Цена / Комиссия платформы / К получению`.

### Сниппеты кода

`server/internal/services/booking_service.go`:
```go
platformFee := bookingPlatformFeeAmount(&booking)
if err := s.walletService.ReleaseFundsWithPlatformFeeSplit(
  booking.ClientID,
  regularHeld,
  bonusHeld,
  booking.ID,
  booking.Service.OwnerID,
  platformFee,
  "Оплата услуги: "+booking.Service.Title,
); err != nil { ... }
```

`server/internal/services/wallet_service.go`:
```go
func (s *WalletService) ReleaseFundsWithPlatformFeeSplit(...) error {
  // payer frozen -> release
  // provider credit (net)
  // platform wallet credit (fee)
}
```

`frontend/screens/portal/services/IncomingBookingsScreen.tsx`:
```tsx
<View style={styles.financeRow}>
  <Text style={styles.financeLabel}>Комиссия платформы</Text>
  <Text style={[styles.financeValue, { color: colors.warning }]}>-{platformFee} ₵</Text>
</View>
<View style={styles.financeRow}>
  <Text style={styles.financeLabelStrong}>К получению</Text>
  <Text style={[styles.financeValueStrong, { color: colors.success }]}>{providerNet} ₵</Text>
</View>
```

## 2026-03-04 (iOS debug: remove inefficient shadow on transparent View in Portal header)

### Измененные файлы
- `frontend/screens/portal/PortalMainScreen.tsx`

### Суть правки (от старого к новому)
- Было:
  - `shadow*` применялся к обертке `View` с `backgroundColor: 'transparent'` в кнопке Back в service-header;
  - iOS в debug выдавал повторяющийся advisory: `RCTView has a shadow set but cannot calculate shadow efficiently`.
- Стало:
  - shadow перенесен на `TouchableOpacity`, где уже есть непрозрачный фон;
  - у внутреннего прозрачного `View` удалены shadow-параметры;
  - визуально кнопка сохранена, шум debug-консоли снижен.

### Сниппеты кода

`frontend/screens/portal/PortalMainScreen.tsx`:
```tsx
<View style={[styles.avatarButton, { backgroundColor: 'transparent' }]}>
  <TouchableOpacity
    style={{
      ...,
      backgroundColor: useLightServiceHeaderIcons ? 'rgba(255,255,255,0.15)' : vTheme.colors.backgroundSecondary,
      ...Platform.select({
        ios: {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 8,
        },
        android: { elevation: 8 },
      }),
    }}
  >
```

## 2026-03-04 (Chat audio visibility monitoring: robust audio render fallback)

### Измененные файлы
- `frontend/context/ChatContext.tsx`
- `frontend/components/chat/MessageList.tsx`
- `frontend/services/messageService.ts`

### Суть правки (от старого к новому)
- Было:
  - аудио-UI рендерился строго при `item.type === 'audio' && item.content`;
  - если payload приходил без `content` (но с URL в `text`) или с неполным `type`, аудио-сообщение визуально «пропадало»;
  - `mimeType` не прокидывался во всех местах нормализации (`history/ws/local`), что усложняло fallback-детекцию.
- Стало:
  - в `ChatContext` унифицировано заполнение `text/content/mimeType` для history, websocket и локальной отправки;
  - в `MessageList` добавлен `resolveAudioUrl(...)`: аудио определяется не только по `type`, но и по `mimeType`, расширению `fileName` и URL (`.m4a/.mp3/.wav/.aac/.ogg/.webm`);
  - если `content` пуст, но аудио-URL есть в `text`, компонент теперь рендерит `AudioPlayer`.

### Сниппеты кода

`frontend/context/ChatContext.tsx`:
```tsx
const normalizeP2PMessage = (m: any, currentUserId: number): Message => ({
  text: m.content || m.text || '',
  content: m.content || m.text || '',
  mimeType: m.mimeType,
  ...
});
```

`frontend/components/chat/MessageList.tsx`:
```tsx
const audioUrl = resolveAudioUrl(item);

...
{audioUrl ? (
  <AudioPlayer url={audioUrl} duration={item.duration} isDarkMode={isDarkMode} />
) : ...}
```

## 2026-03-04 (Ads Festivals create preset: only Events + only Offering tab)

### Измененные файлы
- `frontend/types/navigation.ts`
- `frontend/screens/portal/ads/AdsScreen.tsx`
- `frontend/screens/portal/ads/CreateAdScreen.tsx`

### Суть правки (от старого к новому)
- Было:
  - во вкладке `Фестивали` кнопка `+` открывала общий create-flow объявлений без фестивального пресета;
  - на экране создания оставались общий выбор категорий и переключатель `Ищу/Предлагаю/Мои`, что путало при создании фестиваля;
  - пользователь мог попасть в нерелевантный сценарий `Ищу` для фестиваля.
- Стало:
  - в режиме `Фестивали` кнопка `+` передает в `CreateAd` пресет `initialCategory='events'`;
  - `CreateAdScreen` для этого пресета принудительно выставляет:
    - `category='events'`
    - `adType='offering'`
  - при фестивальном пресете скрываются:
    - общий `CategoryPills` (показывается только фиксированный pill `Мероприятия`);
    - `AdTabSwitcher` (`Ищу/Предлагаю/Мои`), чтобы оставить только релевантный поток публикации фестиваля.

### Сниппеты кода

`frontend/screens/portal/ads/AdsScreen.tsx`:
```tsx
onPress={() =>
  navigation.navigate(
    'CreateAd',
    sectionMode === 'festivals' ? { initialCategory: 'events' } : undefined
  )
}
```

`frontend/screens/portal/ads/CreateAdScreen.tsx`:
```tsx
const initialCategory = route.params?.initialCategory;
const isFestivalPresetCreate = !adId && initialCategory === 'events';

useEffect(() => {
  if (!adId && initialCategory === 'events') {
    setCategory('events');
    setAdType('offering');
  }
}, [adId, initialCategory]);
```

```tsx
{!isFestivalPresetCreate && (
  <AdTabSwitcher activeTab={adType} onTabChange={setAdType} />
)}
```

## 2026-03-04 (Ads: default festivals feed + feed filters + feed/calendar sub-tabs)

### Измененные файлы
- `server/internal/models/ad.go`
- `server/internal/handlers/ads_handler.go`
- `server/cmd/api/main.go`
- `frontend/types/ads.ts`
- `frontend/services/adsService.ts`
- `frontend/screens/portal/ads/AdsScreen.tsx`
- `frontend/components/ads/FestivalViewSwitch.tsx`
- `frontend/components/ads/FestivalFeedList.tsx`
- `frontend/i18n/locales/ru.ts`
- `frontend/i18n/locales/en.ts`

### Суть правки (от старого к новому)
- Было:
  - в Ads для фестивалей был только календарный режим, отдельной карточной ленты не было;
  - отсутствовали API для фестивальной feed-выдачи и фасетов городов;
  - на фронте не было под-переключателя `Лента/Календарь` внутри `Фестивали`, дефолтный вход в Ads не открывал сразу feed;
  - в i18n не хватало ключей для feed-фильтров и карточек.
- Стало:
  - добавлены API:
    - `GET /api/ads/festivals/feed`
    - `GET /api/ads/festivals/facets`
  - feed сортируется по правилу: сначала `ongoing`, затем ближайшие `upcoming` по `startAt ASC`;
  - добавлены фильтры feed: `Город`, `Источник (all/ad/sadhu)`, `Период (today/7d/30d/upcoming)`, поиск;
  - `AdsScreen` теперь по умолчанию открывается в `Фестивали -> Лента`, календарь сохранен как второй режим;
  - добавлены новые RN-компоненты `FestivalViewSwitch` и `FestivalFeedList`, локализация расширена.

### Сниппеты кода

`server/cmd/api/main.go`:
```go
api.Get("/ads/festivals/feed", middleware.OptionalAuth(), adsHandler.GetFestivalFeed)
api.Get("/ads/festivals/facets", middleware.OptionalAuth(), adsHandler.GetFestivalFacets)
```

`server/internal/handlers/ads_handler.go`:
```go
func (h *AdsHandler) GetFestivalFeed(c *fiber.Ctx) error {
  // period/source parsing + buildFestivalItems + sortFestivalFeedItems + pagination
}
```

`frontend/screens/portal/ads/AdsScreen.tsx`:
```tsx
const [sectionMode, setSectionMode] = useState<AdsSectionMode>('festivals');
const [festivalViewMode, setFestivalViewMode] = useState<FestivalViewMode>('feed');
```

```tsx
{festivalViewMode === 'feed' ? (
  <FestivalFeedList ... />
) : (
  <FestivalMonthCalendar ... />
)}
```

## 2026-03-04 (Chat audio recording: explicit recorder config + user-visible errors)

### Измененные файлы
- `frontend/services/mediaService.ts`
- `frontend/context/ChatContext.tsx`

### Суть правки (от старого к новому)
- Было:
  - `startRecorder()` запускался с дефолтными параметрами без явного `audioSet` и без целевого пути файла;
  - после первой доработки на iOS передавался абсолютный путь, но `react-native-audio-recorder-player` на iOS ожидает `DEFAULT`/relative path, из-за чего возникал `Error occured during initiating recorder`;
  - в `ChatContext` ошибки старта/остановки записи логировались только в консоль, пользователь не получал ясную причину.
- Стало:
  - добавлен явный конфиг рекордера: `audioSet` для iOS/Android (AAC, sample rate, channels);
  - для iOS путь записи переключен на `DEFAULT` (совместимо с native-модулем), для Android остается cache-файл;
  - добавлена защита на `stopRecorder()` для случая `Already stopped`;
  - при ошибках старта/остановки записи теперь показывается `Alert` с текстом ошибки.

### Сниппеты кода

`frontend/services/mediaService.ts`:
```tsx
const { path, audioSet } = createRecorderConfig();
const result = await audioRecorderPlayer.startRecorder(path, audioSet as any, true);

const path = Platform.OS === 'ios'
  ? 'DEFAULT'
  : `${RNFS.CachesDirectoryPath}/voice_${Date.now()}.mp4`;
```

`frontend/context/ChatContext.tsx`:
```tsx
Alert.alert(
  'Запись недоступна',
  getErrorMessage(error) || 'Не удалось начать запись аудио'
);
```

## 2026-03-04 (Rooms SFU: suppress expected client-disconnect race in RoomVideoBar)

### Измененные файлы
- `frontend/components/chat/RoomVideoBar.tsx`

### Суть правки (от старого к новому)
- Было:
  - при `connect()` гонка с cleanup `disconnect()` (часто в dev/эмуляторе) приводила к ожидаемой ошибке `ConnectionError: Client initiated disconnect`;
  - эта ожидаемая ситуация логировалась через `console.error`, из-за чего показывался overlay `Console Error`.
- Стало:
  - добавлен фильтр ожидаемой ошибки `Client initiated disconnect`;
  - для этого случая статус переводится в `Disconnected` без `console.error`;
  - нецелевые ошибки SFU по-прежнему логируются как раньше.

### Сниппеты кода

`frontend/components/chat/RoomVideoBar.tsx`:
```tsx
if (isExpectedClientDisconnectError(error)) {
  if (mounted) setStatus('Disconnected');
  return;
}
```

## 2026-03-04 (Rooms service header: remove photo wallpaper under menu bar)

### Измененные файлы
- `frontend/screens/portal/PortalMainScreen.tsx`

### Суть правки (от старого к новому)
- Было:
  - непрозрачный header был включен только для `contacts`;
  - в `rooms` (service tab `activeTab === 'rooms'`) верхняя шапка оставалась прозрачной и показывала фото-обои.
- Стало:
  - добавлено отдельное условие для `rooms`;
  - в сервисе комнат header рендерится непрозрачным (`surface/divider`), фото-фон под меню не показывается.

### Сниппеты кода

`frontend/screens/portal/PortalMainScreen.tsx`:
```tsx
const shouldUseSolidContactsHeader = activeTab === 'contacts';
const shouldUseSolidRoomsHeader = activeTab === 'rooms';
const shouldUseSolidServiceHeader = shouldUseSolidContactsHeader || shouldUseSolidRoomsHeader;
```

## 2026-03-04 (Portal header scope fix: keep wallpaper system, apply solid header only in Contacts)

### Измененные файлы
- `frontend/screens/portal/PortalMainScreen.tsx`

### Суть правки (от старого к новому)
- Было:
  - непрозрачный service-header (`surface`) применялся ко всем service tabs;
  - это затрагивало общий визуальный режим сервисов шире, чем требовалось для задачи.
- Стало:
  - правило сужено только до `activeTab === 'contacts'`;
  - для остальных service tabs и портального режима сохранено прежнее поведение с прозрачным header и системной сменой обоев.

### Сниппеты кода

`frontend/screens/portal/PortalMainScreen.tsx`:
```tsx
const shouldUseSolidContactsHeader = activeTab === 'contacts';
const serviceHeaderBackgroundColor = shouldUseSolidContactsHeader ? vTheme.colors.surface : 'transparent';
const serviceHeaderBorderColor = shouldUseSolidContactsHeader ? vTheme.colors.divider : 'transparent';
```

## 2026-03-04 (Portal service header: remove photo wallpaper background in Contacts header area)

### Измененные файлы
- `frontend/screens/portal/PortalMainScreen.tsx`

### Суть правки (от старого к новому)
- Было:
  - для service-экрана в `ScreenScaffold` явно передавался прозрачный `headerStyle`;
  - первая попытка через `topBar` не решила проблему до конца, так как `topBar` в теме полупрозрачный (`rgba ... 0.8/0.76`);
  - в `Contacts` (и других service tabs) фото-фон продолжал просвечивать в шапке.
- Стало:
  - добавлен полностью непрозрачный фон service-header: `vTheme.colors.surface`;
  - этот же фон применяется к самому `View` шапки (не только к `ScreenScaffold.headerStyle`);
  - фото-фон в header больше не виден.

### Сниппеты кода

`frontend/screens/portal/PortalMainScreen.tsx`:
```tsx
const serviceHeaderBackgroundColor = vTheme.colors.surface;
const serviceHeaderBorderColor = vTheme.colors.divider;

<ScreenScaffold
  variant="portal"
  enableAura={!useClassicWallpaper}
  transparentBackground={useClassicWallpaper}
  headerStyle={{
    backgroundColor: serviceHeaderBackgroundColor,
    borderBottomColor: serviceHeaderBorderColor,
  }}
>

<View style={[styles.header, { backgroundColor: serviceHeaderBackgroundColor }]}>
```

## 2026-03-04 (PROD Observability rollout: backend `/metrics` + monitoring IaC)

### Измененные файлы
- `server/go.mod`
- `server/go.sum`
- `server/cmd/api/main.go`
- `server/internal/middleware/observability_prometheus.go`
- `server/internal/middleware/observability_prometheus_test.go`
- `infra/monitoring/docker-compose.monitoring.prod.yml`
- `infra/monitoring/prometheus/prometheus.yml`
- `infra/monitoring/prometheus/alerts.yml`
- `infra/monitoring/prometheus/recording_rules.yml`
- `infra/monitoring/loki/loki.yml`
- `infra/monitoring/promtail/promtail.yml`
- `infra/monitoring/blackbox/blackbox.yml`
- `infra/monitoring/grafana/provisioning/datasources/datasources.yml`
- `infra/monitoring/grafana/provisioning/dashboards/dashboards.yml`
- `infra/monitoring/grafana/provisioning/alerting/contact-points.yml`
- `infra/monitoring/grafana/provisioning/alerting/policies.yml`
- `infra/monitoring/grafana/dashboards/vedamatch-overview.json`
- `infra/monitoring/grafana/dashboards/vedamatch-logs.json`
- `infra/monitoring/grafana/dashboards/vedamatch-probes.json`
- `infra/monitoring/.env.monitoring.example`
- `infra/monitoring/README.md`

### Суть правки (от старого к новому)
- Было:
  - backend не имел endpoint `GET /metrics`, Prometheus не мог собирать RED-метрики API;
  - в репозитории отсутствовал production IaC-стек Grafana/Loki/Prometheus/Promtail/Blackbox;
  - не было формализованных alert-rules для инцидентов host/API/log-ingestion/synthetic checks.
- Стало:
  - backend экспортирует Prometheus метрики через `GET /metrics` с bearer-защитой (`METRICS_ENABLED`, `METRICS_BEARER_TOKEN`);
  - добавлен HTTP middleware RED-метрик:
    - `http_requests_total{method,route,status_class}`
    - `http_request_duration_seconds{method,route,status_class}`
    - `http_in_flight_requests`;
  - добавлен полноценный `infra/monitoring` для прода:
    - Prometheus scrape/rules/alerts (включая `vedamatch-server`, `node-exporter`, `cadvisor`, `loki`, `promtail`, `blackbox`);
    - Loki TSDB + S3 + retention `30d`;
    - Promtail docker/journal ingest с фильтрацией scope (`vedamatch-*`, `dokploy-traefik`);
    - Grafana provisioning (datasources, dashboards, alerting policies/contact points);
    - Grafana публикуется только на loopback (`127.0.0.1:13000`) для доступа через SSH tunnel.

### Сниппеты кода

`server/cmd/api/main.go`:
```go
app.Use(middleware.PrometheusHTTPMetrics())
app.Get("/metrics", middleware.MetricsEndpoint())
```

`server/internal/middleware/observability_prometheus.go`:
```go
if parseMetricsBearerToken(c.Get("Authorization")) != expectedToken {
    return c.SendStatus(fiber.StatusUnauthorized)
}
```

`infra/monitoring/prometheus/prometheus.yml`:
```yaml
- job_name: vedamatch-server
  metrics_path: /metrics
  authorization:
    type: Bearer
    credentials_file: /etc/prometheus/secrets/metrics_bearer_token
```

`infra/monitoring/docker-compose.monitoring.prod.yml`:
```yaml
grafana:
  ports:
    - "127.0.0.1:13000:3000"
```

## 2026-03-03 (Multimedia org-visibility via PRO scope: backend + admin + RN)

### Измененные файлы
- `server/cmd/api/main.go`
- `server/internal/handlers/multimedia_handler.go`
- `server/internal/services/multimedia_service.go`
- `server/internal/services/multimedia_service_test.go`
- `server/internal/services/multimedia_service_integration_test.go`
- `server/internal/handlers/multimedia_handler_integration_test.go`
- `admin/src/app/multimedia/page.tsx`
- `frontend/screens/multimedia/multimediaAccess.ts`
- `frontend/screens/multimedia/AudioScreen.tsx`
- `frontend/screens/multimedia/VideoScreen.tsx`
- `frontend/screens/multimedia/RadioScreen.tsx`
- `frontend/screens/multimedia/TVScreen.tsx`
- `frontend/screens/multimedia/MultimediaHubScreen.tsx`
- `frontend/__tests__/screens/multimedia/AudioScreenOrgScope.test.tsx`

### Суть правки (от старого к новому)
- Было:
  - публичные multimedia read-endpoints не учитывали optional auth context и не персонализировали org scope для гостя/non-PRO/PRO;
  - пользователь без PRO видел полный org-фильтр на mobile (чипы всех организаций);
  - в admin multimedia TV-форма не имела поля org-видимости (`madh`), а для create не было стабильного default из профиля админа.
- Стало:
  - backend для `/api/multimedia` применяет `OptionalAuth` и единые правила доступа:
    - anonymous: только global (`madh` пустой/NULL),
    - non-PRO: `global + user.madh`,
    - PRO/Admin/GodMode: полный доступ;
  - сервер принимает query-алиасы `matha|madh|math` и не дает non-PRO расширить scope через чужой org query;
  - admin multimedia унифицирован по видимости (`Для всех` / `Для организации`) для Track/Video/Radio/TV с default `madh` из `localStorage.admin_data.madh`;
  - RN multimedia экраны скрывают полный org-выбор для non-PRO, оставляют org-чипы для PRO и показывают мягкий CTA при пустом `user.madh`.

### Сниппеты кода

`server/cmd/api/main.go`:
```go
multimedia := api.Group("/multimedia")
multimedia.Use(middleware.OptionalAuth())
```

`server/internal/handlers/multimedia_handler.go`:
```go
func parseMultimediaMathParam(c *fiber.Ctx) string {
    if value := strings.TrimSpace(c.Query("matha")); value != "" {
        return value
    }
    if value := strings.TrimSpace(c.Query("madh")); value != "" {
        return value
    }
    return strings.TrimSpace(c.Query("math"))
}
```

`server/internal/services/multimedia_service.go`:
```go
if scope.bypass {
    return applyRequestedMultimediaMadhFilter(db, requestedMadh), nil
}
if scope.orgKey == "" {
    return db.Where("COALESCE(TRIM(madh), '') = ''"), nil
}
return db.Where("(COALESCE(TRIM(madh), '') = '' OR LOWER(TRIM(madh)) = ?)", scope.orgKey), nil
```

`frontend/screens/multimedia/AudioScreen.tsx`:
```tsx
const accessScope = resolveMultimediaAccessScope(user);
const isProViewer = accessScope.isProViewer;

multimediaService.getTracks({
  type: 'audio',
  madh: isProViewer ? selectedMadh : undefined,
});
```

`admin/src/app/multimedia/page.tsx`:
```tsx
const VISIBILITY_OPTIONS = [
  { value: '', label: 'Для всех' },
  ...ORG_OPTIONS,
];
const getAdminDefaultMadh = (): string => {
  const raw = localStorage.getItem('admin_data');
  const parsed = raw ? JSON.parse(raw) : null;
  return typeof parsed?.madh === 'string' ? parsed.madh.trim().toLowerCase() : '';
};
```

## 2026-03-03 (Travel service header: remove top photo wallpaper background)

### Измененные файлы
- `frontend/screens/portal/PortalMainScreen.tsx`

### Суть правки (от старого к новому)
- Было:
  - в сервисе путешествий (`activeTab === 'travel'`) service-layer мог наследовать фото-обои портала;
  - верхний `header` рендерился поверх фото-фона.
- Стало:
  - `travel` добавлен в набор вкладок с принудительно однотонным service-layer;
  - `header` в сервисе путешествий больше не показывает фото-фон.

### Сниппеты кода

`frontend/screens/portal/PortalMainScreen.tsx`:
```tsx
const isEducationTabActive = activeTab === 'education';
const isAdsTabActive = activeTab === 'ads';
const isTravelTabActive = activeTab === 'travel';
const useSolidServiceLayer = isEducationTabActive || isAdsTabActive || isTravelTabActive;
```

## 2026-03-03 (Ads service header: remove top photo wallpaper background)

### Измененные файлы
- `frontend/screens/portal/PortalMainScreen.tsx`

### Суть правки (от старого к новому)
- Было:
  - при открытии сервиса объявлений (`activeTab === 'ads'`) сервисный слой мог наследовать фото-обои портала (`portalBackgroundType === 'image'`);
  - верхний `header` рендерился поверх фото-фона (как на скриншоте).
- Стало:
  - для вкладки объявлений принудительно включен однотонный service-layer (`color`);
  - отключены `activeWallpaper`, slideshow и overlay для этой вкладки;
  - фото-фон в верхней шапке объявлений больше не показывается.

### Сниппеты кода

`frontend/screens/portal/PortalMainScreen.tsx`:
```tsx
const isEducationTabActive = activeTab === 'education';
const isAdsTabActive = activeTab === 'ads';
const useSolidServiceLayer = isEducationTabActive || isAdsTabActive;

const serviceLayerBackgroundType = useSolidServiceLayer ? 'color' : layerBackgroundType;
const serviceLayerActiveWallpaper = useSolidServiceLayer ? '' : layerActiveWallpaper;
const serviceLayerOverlayColor = useSolidServiceLayer ? 'transparent' : layerOverlayColor;
```

## 2026-03-03 (Contact Profile: disable photo wallpaper background)

### Измененные файлы
- `frontend/screens/portal/contacts/ContactProfileScreen.tsx`

### Суть правки (от старого к новому)
- Было:
  - `ContactProfileScreen` рендерил `ImageBackground` при `portalBackgroundType === 'image'`;
  - профиль контакта мог отображаться на фото-обоях portal-темы.
- Стало:
  - ветка `ImageBackground` удалена;
  - экран профиля контакта использует только `gradient` или однотонный `vTheme.colors.background`, без фото-обоев.

### Сниппеты кода

`frontend/screens/portal/contacts/ContactProfileScreen.tsx`:
```tsx
if (portalBackgroundType === 'gradient' && portalBackground) {
  return <LinearGradient ...>{children}</LinearGradient>;
}

return (
  <View style={[styles.container, { backgroundColor: vTheme.colors.background }]}>
    {children}
  </View>
);
```

## 2026-03-03 (Edit Profile: remove photo wallpaper background)

### Измененные файлы
- `frontend/screens/settings/EditProfileScreen.tsx`

### Суть правки (от старого к новому)
- Было:
  - экран редактирования профиля рендерил `ImageBackground` из `portalBackground` при `portalBackgroundType === 'image'`;
  - на светлых/детальных обоях терялась читаемость и визуальная стабильность формы профиля.
- Стало:
  - фото-обои полностью отключены для `EditProfileScreen`;
  - экран всегда использует сплошной фон `#0E1525` с существующим overlay-слоем роли.

### Сниппеты кода

`frontend/screens/settings/EditProfileScreen.tsx`:
```tsx
const screenBackgroundColor = '#0E1525';

return (
  <View style={[styles.container, { backgroundColor: screenBackgroundColor }]}>
    <View style={[StyleSheet.absoluteFill, { backgroundColor: roleColors.overlay }]}>
      ...
    </View>
  </View>
);
```

## 2026-03-03 (Room SFU join fix: correct LiveKit SDK source + globals registration)

### Измененные файлы
- `frontend/services/roomSfuClient.ts`

### Суть правки (от старого к новому)
- Было:
  - `RoomSfuClient` пытался брать `Room` из `@livekit/react-native` через `require('@livekit/react-native').Room`;
  - в версии SDK `@livekit/react-native@2.9.6` класс `Room` не экспортируется из этого пакета, из-за чего при входе в комнату падало с ошибкой `LiveKit Room SDK is unavailable`.
- Стало:
  - `Room` и `RoomEvent` берутся из `livekit-client` (`require('livekit-client')`);
  - перед подключением выполняется единоразовый `registerGlobals()` из `@livekit/react-native` (через `ensureLiveKitGlobalsReady()`), чтобы корректно инициализировать WebRTC globals на iOS/Android.

### Сниппеты кода

`frontend/services/roomSfuClient.ts`:
```ts
const livekitReactNative = require('@livekit/react-native');
livekitReactNative.registerGlobals();

const livekit = require('livekit-client');
const Room = livekit?.Room;
this.bindRoomEvents(this.room, livekit?.RoomEvent);
```

## 2026-03-03 (Chat history screen: remove photo background, switch to solid color)

### Измененные файлы
- `frontend/SettingsDrawer.tsx`

### Суть правки (от старого к новому)
- Было:
  - экран истории чатов в `SettingsDrawer` наследовал `portalBackgroundType` и мог рендерить фото/градиентный фон;
  - на таком фоне ухудшалась читаемость заголовка и элементов истории чатов.
- Стало:
  - фото/градиентный фон для этого экрана полностью отключен;
  - установлен единый спокойный фон `#F2EFE6`;
  - цвета заголовка, action-кнопок, карточек истории, даты и пустого состояния переведены на контрастную палитру.

### Сниппеты кода

`frontend/SettingsDrawer.tsx`:
```tsx
const historyColors = React.useMemo(() => ({
  background: '#F2EFE6',
  card: 'rgba(255,255,255,0.92)',
  textPrimary: '#1F2937',
  textSecondary: '#64748B',
}), []);

<View style={[StyleSheet.absoluteFill, { backgroundColor: historyColors.background }]} />
```

## 2026-03-10 (Chat history drawer compact layout and settings shortcut removal)

### Измененные файлы
- `frontend/SettingsDrawer.tsx`

### Суть правки (от старого к новому)
- Было:
  - drawer истории чатов занимал около `80%` ширины экрана;
  - в header была отдельная иконка перехода в настройки;
  - карточки истории и кнопка `Новый чат` были крупнее и визуально тяжелее.
- Стало:
  - ширина drawer уменьшена до `58%` экрана;
  - из header удален shortcut в настройки, оставлен только toggle edit-mode;
  - header, CTA `Новый чат` и элементы списка истории уплотнены под более компактный mobile layout;
  - у drawer убран `flex: 1`, чтобы справа оставалась overlay-область и tap-outside снова закрывал историю и возвращал пользователя в чат.

### Сниппеты кода

`frontend/SettingsDrawer.tsx`:
```tsx
const DRAWER_WIDTH = Dimensions.get('window').width * 0.58;

{history.length > 0 && (
  <TouchableOpacity
    onPress={() => setIsEditMode((prev) => !prev)}
    style={styles.headerActionBtn}
  >
    {isEditMode ? <X size={20} /> : <Edit3 size={20} />}
  </TouchableOpacity>
)}
```

```tsx
newChatButton: {
  minHeight: 48,
  borderRadius: 16,
},
historyItem: {
  minHeight: 62,
  borderRadius: 14,
  marginBottom: 8,
}
```

## 2026-03-03 (Chat messages contrast fix on light chat background)

### Измененные файлы
- `frontend/components/chat/MessageList.tsx`

### Суть правки (от старого к новому)
- Было:
  - `MessageList` определял контраст по `portalBackgroundType`, а не по `chatBackgroundType`;
  - при светлом фоне чата входящие bubble могли рендериться с очень светлым текстом (плохая читаемость).
- Стало:
  - `MessageList` переключен на `chatBackgroundType/chatBackground`;
  - добавлено определение светлого фона через `isColorLight/isGradientLight`;
  - для bubble введены отдельные цвета текста:
    - исходящие: светлый текст на более темном bubble,
    - входящие: темный текст на светлом bubble;
  - скорректированы цвета времени/мета/источников и fallback tint для blur.

### Сниппеты кода

`frontend/components/chat/MessageList.tsx`:
```tsx
const { assistantType, isDarkMode, chatBackgroundType, chatBackground } = useSettings();
const isLightChatBackground =
  (chatBackgroundType === 'color' && isColorLight(chatBackground)) ||
  (chatBackgroundType === 'gradient' && isGradientLight(chatBackground));
const bubbleTextColor = isUser ? '#F8FAFC' : theme.text;
```

## 2026-03-03 (Chat contrast hotfix for light backgrounds)

### Измененные файлы
- `frontend/components/chat/ChatHeader.tsx`
- `frontend/components/chat/ChatInput.tsx`
- `frontend/screens/ChatScreen.tsx`
- `frontend/utils/chatBackgroundContrast.ts`

### Суть правки (от старого к новому)
- Было:
  - контраст в чате рассчитывался в основном по `portalBackgroundType`, хотя у чата теперь отдельный фон (`chatBackground/chatBackgroundType`);
  - при светлом фоне чата текст/подписи в header и placeholder в input могли оставаться светлыми;
  - `StatusBar` в `ChatScreen` был зафиксирован как `light-content`, из-за чего время/системные символы на iOS были плохо видны на светлом фоне.
- Стало:
  - добавлен util `chatBackgroundContrast` для определения светлого/темного фона по цвету/градиенту;
  - `ChatHeader` и `ChatInput` переключают палитру на контрастную для светлого chat background;
  - `ChatScreen` динамически выбирает `StatusBar` (`dark-content` для светлого фона).

### Сниппеты кода

`frontend/components/chat/ChatInput.tsx`:
```tsx
const isLightChatBackground =
  (chatBackgroundType === 'color' && isColorLight(chatBackground)) ||
  (chatBackgroundType === 'gradient' && isGradientLight(chatBackground));
const useDarkForeground = !isImageBg && isLightChatBackground;
```

`frontend/components/chat/ChatHeader.tsx`:
```tsx
const useLightVedaContrast = isVedaMatch && !isImageBg && isLightChatBackground;
const titleColor = isVedaMatch
  ? (useLightVedaContrast ? '#3F2F00' : '#FFDF00')
  : isImageBg ? '#F8FAFC' : colors.textPrimary;
```

`frontend/screens/ChatScreen.tsx`:
```tsx
<StatusBar
  barStyle={useDarkStatusBar ? 'dark-content' : 'light-content'}
  backgroundColor="transparent"
  translucent
/>
```

## 2026-03-03 (RTCPIPView migration + post-call feedback/donation + chat/profile stability)

### Измененные файлы
- `frontend/ios/vedamatch/AppDelegate.mm`
- `frontend/screens/calls/CallScreen.tsx`
- `frontend/services/callPiPService.ts`
- `frontend/services/callFeedbackService.ts`
- `frontend/screens/ChatScreen.tsx`
- `frontend/components/chat/ChatHeader.tsx`
- `frontend/context/SettingsContext.tsx`
- `frontend/screens/settings/AppSettingsScreen.tsx`
- `frontend/screens/portal/contacts/ContactProfileScreen.tsx`
- `frontend/App.tsx`
- `server/internal/models/call_feedback.go`
- `server/internal/handlers/call_feedback_handler.go`
- `server/internal/services/wallet_service.go`
- `server/internal/database/database.go`
- `server/internal/database/seed.go`
- `server/cmd/api/main.go`
- `admin/src/app/calls/page.tsx`
- `admin/src/components/AdminLayout.tsx`

### Суть правки (от старого к новому)
- Было:
  - iOS PiP для звонка опирался на кастомный native `CallPiPModule` в `AppDelegate.mm`; наблюдался нестабильный старт и падения в `setCallActive`.
  - после завершения звонка не было flow оценки качества связи и быстрого перевода regular LKM в поддержку.
  - для `ContactProfile` при back в некоторых сценариях возникал white screen.
  - чат использовал общие portal background-настройки, не было отдельного нейтрального default и отдельного блока управления фоном чата.
  - в админке не было страницы агрегированных оценок звонков.
- Стало:
  - iOS PiP переведен на `react-native-webrtc` (`RTCPIPView` + `startIOSPIP/stopIOSPIP`), кастомный iOS `CallPiPModule` удален из runtime-кода.
  - в iOS launch добавен `enableMultitaskingCameraAccess=YES` через `WebRTCModuleOptions`.
  - добавлен post-call flow: оценка 1..5 + причины/комментарий + optional support transfer (только regular LKM).
  - добавлены backend endpoint’ы:
    - `POST /api/calls/feedback`
    - `POST /api/calls/support-transfer`
    - `GET /api/admin/calls/feedback`
    - `GET /api/admin/calls/feedback/:id`
  - добавлен admin экран `/calls` с фильтрами и деталями оценки.
  - в `ContactProfileScreen` реализован guarded back (`goBack` или `reset` в `Portal`), для `ContactProfile` выставлен `freezeOnBlur: false`.
  - фон чата отделен от portal-фона: отдельные chat storage keys, нейтральный default color и отдельный UI-блок “Фон чата”.
  - отступы/выравнивание шапки чата скорректированы через `topInset` и обновленные размеры header/subtitle.

### Сниппеты кода

`frontend/screens/calls/CallScreen.tsx`:
```tsx
<RTCPIPView
  ref={pipViewRef}
  streamURL={remoteVideoAvailable ? remoteStream.toURL() : undefined}
  iosPIP={{
    enabled: true,
    preferredSize: { width: 9, height: 16 },
    startAutomatically: true,
    stopAutomatically: true,
    fallbackView: (<View style={styles.remotePlaceholder}>...</View>) as any,
  }}
/>
```

`frontend/services/callPiPService.ts`:
```ts
setCallActive(active: boolean) {
  if (Platform.OS !== 'android') {
    return;
  }
  androidNativeModule?.setCallActive(active);
}
```

`frontend/ios/vedamatch/AppDelegate.mm`:
```objc
Class optionsClass = NSClassFromString(@"WebRTCModuleOptions");
...
[options setValue:@(YES) forKey:@"enableMultitaskingCameraAccess"];
```

`server/internal/handlers/call_feedback_handler.go`:
```go
protected.Post("/calls/feedback", callFeedbackHandler.CreateFeedback)
protected.Post("/calls/support-transfer", callFeedbackHandler.SupportTransfer)
admin.Get("/calls/feedback", callFeedbackHandler.AdminListFeedback)
admin.Get("/calls/feedback/:id", callFeedbackHandler.AdminGetFeedback)
```

`frontend/screens/portal/contacts/ContactProfileScreen.tsx`:
```tsx
if (navigation.canGoBack() && prevRoute?.name) {
  navigation.goBack();
  return;
}
navigation.reset({
  index: 0,
  routes: [{ name: 'Portal', params: { initialTab: 'contacts' } as any }],
});
```

`frontend/context/SettingsContext.tsx`:
```ts
const [chatBackground, setChatBackgroundState] = useState<string>('#F2EFE6');
const [chatBackgroundType, setChatBackgroundType] = useState<'color' | 'gradient' | 'image'>('color');
const [chatWallpaperSlides, setChatWallpaperSlides] = useState<string[]>(getPresetUris());
```

## 2026-03-03 (Call/Chat/Push hotfix: iOS PiP entry + chat/avatar + bell + Android 13 push permission)

### Измененные файлы
- `frontend/ios/vedamatch/AppDelegate.mm`
- `frontend/components/chat/MessageList.tsx`
- `frontend/screens/ChatScreen.tsx`
- `frontend/screens/portal/PortalMainScreen.tsx`
- `frontend/services/notificationService.ts`

### Суть правки (от старого к новому)
- Было:
  - iOS PiP вход блокировался флагом `callActive`; при текущем JS hotfix (`setCallActive` no-op на iOS) кнопка сворачивания звонка могла не переводить экран в PiP.
  - в личном чате для входящих сообщений (`sender='other'`) отображалась ассистент-аватарка вместо аватара собеседника.
  - back из `ChatScreen` в отдельных сценариях мог приводить к белому экрану.
  - колокольчик в header активных сервисов (`contacts/calls`) не открывал панель истории пушей, потому что `NotificationPanel` не рендерился в этой ветке.
  - на Android 13+ не запрашивался runtime `POST_NOTIFICATIONS`, из-за чего системные push в шторке могли не показываться.
- Стало:
  - в iOS нативном модуле PiP снят hard-check `callActive` в `enterPiP`, PiP-кнопка работает независимо от JS-флага активности.
  - в `MessageList` для `sender='other'` добавлен реальный `recipientUser.avatarUrl` (через `getMediaUrl`) и fallback-инициал.
  - в `ChatScreen` fallback back-навигации переведен на `navigation.reset(...)` в `Portal`, что убирает blank state.
  - `NotificationPanel` добавлен в ветку активного сервиса, колокольчик стал функциональным на `contacts/calls`.
  - в `notificationService` добавлен runtime-запрос `POST_NOTIFICATIONS` для Android API 33+.

### Сниппеты кода

`frontend/ios/vedamatch/AppDelegate.mm`:
```objc
RCT_REMAP_METHOD(enterPiP,
                 enterPiPWithWidth:(nonnull NSNumber *)width
                 height:(nonnull NSNumber *)height
                 resolve:(RCTPromiseResolveBlock)resolve
                 rejecter:(RCTPromiseRejectBlock)reject) {
  (void)reject;
  if (@available(iOS 15.0, *)) {
    ...
  }
}
```

`frontend/components/chat/MessageList.tsx`:
```tsx
const isOtherUser = item.sender === 'other';
const recipientAvatarUrl = getMediaUrl(recipientUser?.avatarUrl);

{isOtherUser && recipientAvatarUrl ? (
  <Image source={{ uri: recipientAvatarUrl }} style={styles.avatarImage} />
) : isOtherUser ? (
  <View style={styles.avatarFallback}>
    <Text style={styles.avatarFallbackText}>{recipientInitial}</Text>
  </View>
) : (
  <Image source={assistantAvatar} style={styles.avatarImage} />
)}
```

`frontend/screens/ChatScreen.tsx`:
```tsx
if (navigation.canGoBack() && prevRoute?.name) {
  navigation.goBack();
} else {
  navigation.reset({
    index: 0,
    routes: [{ name: 'Portal', params: { initialTab: 'contacts' } }],
  });
}
```

`frontend/screens/portal/PortalMainScreen.tsx`:
```tsx
<View style={styles.content}>
  {renderContent()}
</View>
<NotificationPanel />
```

`frontend/services/notificationService.ts`:
```ts
const permission = PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS;
const alreadyGranted = await PermissionsAndroid.check(permission);
if (!alreadyGranted) {
  const result = await PermissionsAndroid.request(permission);
  const granted = result === PermissionsAndroid.RESULTS.GRANTED;
  ...
}
```

## 2026-03-02 (Chat back-flow stabilization: Android white screen mitigation + cross-platform back handler fix)

### Измененные файлы
- `frontend/screens/ChatScreen.tsx`
- `frontend/App.tsx`
- `frontend/android/app/src/main/AndroidManifest.xml`

### Суть правки (от старого к новому)
- Было:
  - в `ChatScreen` `BackHandler` регистрировался через `useEffect`, а не через `useFocusEffect`, поэтому обработчик мог оставаться активным вне фокуса экрана и давать нестабильный back-flow;
  - для `Chat` действовал глобальный `freezeOnBlur` на Android, что в связке с native-stack могло приводить к blank/white экрану при возврате;
  - в Android `AndroidManifest.xml` не был задан флаг совместимости back callback для React Navigation.
- Стало:
  - `ChatScreen` использует `useFocusEffect` для `hardwareBackPress` и единый `handleBackNavigation`, который всегда явно выполняет `goBack()` или fallback в `Portal`;
  - для `Chat` отключен `freezeOnBlur` на Android (`false`);
  - в Android манифесте добавлен `android:enableOnBackInvokedCallback="false"` для предсказуемого back-поведения.

### Сниппеты кода

`frontend/screens/ChatScreen.tsx`:
```tsx
useFocusEffect(
  React.useCallback(() => {
    const onBackPress = () => {
      handleBackNavigation();
      return true;
    };
    const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => subscription.remove();
  }, [handleBackNavigation]),
);
```

`frontend/App.tsx`:
```tsx
<Stack.Screen
  name="Chat"
  component={ChatScreen}
  options={{
    freezeOnBlur: Platform.OS === 'android' ? false : undefined,
  }}
/>
```

`frontend/android/app/src/main/AndroidManifest.xml`:
```xml
<application
  ...
  android:enableOnBackInvokedCallback="false"
  ...>
```

## 2026-03-02 (Chat WS hotfix: устранены потери сообщений при reconnect)

### Измененные файлы
- `server/internal/websocket/hub.go`
- `server/internal/websocket/hub_test.go`

### Суть правки (от старого к новому)
- Было:
  - при `Register` нового сокета того же пользователя старое соединение не вытеснялось явно;
  - при позднем `Unregister` старого сокета `hub` удалял запись по `userID` без проверки инстанса клиента, из-за чего мог удалиться уже новый активный сокет;
  - в результате возникали плавающие пропуски realtime-сообщений (в т.ч. Android -> iOS) до следующего reconnect.
- Стало:
  - при новом `Register` старый клиент того же `userID` корректно закрывается;
  - `Unregister` удаляет клиента только если это тот же инстанс, который сейчас хранится в `clients[userID]`;
  - добавлен unit-тест на сценарий `reconnect + stale unregister`.

### Сниппеты кода

`server/internal/websocket/hub.go`:
```go
case client := <-h.Register:
	h.mu.Lock()
	if existing, ok := h.clients[client.UserID]; ok && existing != client {
		close(existing.Send)
	}
	h.clients[client.UserID] = client
	h.mu.Unlock()
case client := <-h.Unregister:
	h.mu.Lock()
	if current, ok := h.clients[client.UserID]; ok && current == client {
		delete(h.clients, client.UserID)
		close(client.Send)
	}
	h.mu.Unlock()
```

`server/internal/websocket/hub_test.go`:
```go
hub.Register <- oldClient
hub.Register <- newClient
hub.Unregister <- oldClient

hub.Broadcast(models.Message{SenderID: 7, RecipientID: userID, Content: "hello", Type: "text"})
```

## 2026-03-02 (iOS APP_ENV switched to production + reinstall on device)

### Измененные файлы
- `frontend/.env.ios`

### Суть правки (от старого к новому)
- Было:
  - `APP_ENV=development` в iOS env-файле, из-за чего клиент работал в dev-режиме при локальной установке.
- Стало:
  - `APP_ENV=production`;
  - выполнена переустановка Release-сборки на устройство (`com.VedaMatch.vedamatch`), чтобы приложение работало с production env.

### Сниппеты кода

`frontend/.env.ios`:
```dotenv
API_BASE_URL=https://api.vedamatch.ru
APP_ENV=production
```

## 2026-03-02 (Android production release: version bump + install)

### Измененные файлы
- `frontend/android/app/build.gradle`

### Суть правки (от старого к новому)
- Было:
  - `versionCode 17`
  - `versionName "1.1.15"`
- Стало:
  - `versionCode 18`
  - `versionName "1.1.16"`

### Сниппеты кода

`frontend/android/app/build.gradle`:
```gradle
defaultConfig {
    versionCode 18
    versionName "1.1.16"
}
```

## 2026-03-02 (Hotfix: iOS EXC_BAD_ACCESS в CallPiPModule setCallActive)

### Измененные файлы
- `frontend/screens/calls/CallScreen.tsx`
- `frontend/services/callPiPService.ts`

### Суть правки (от старого к новому)
- Было:
  - на iOS вызывался нативный `setCallActive(...)` для PiP, что в ряде запусков приводило к `EXC_BAD_ACCESS` в `CallPiPModule setCallActive:`.
- Стало:
  - вызов `setCallActive` ограничен только Android;
  - на iOS `setCallActive` в JS-сервисе переведен в no-op (двойная защита), чтобы исключить падение.

### Сниппеты кода

`frontend/screens/calls/CallScreen.tsx`:
```tsx
useEffect(() => {
  if (Platform.OS !== 'android') {
    return;
  }
  callPiPService.setCallActive(Boolean(hasAccepted));
  return () => callPiPService.setCallActive(false);
}, [hasAccepted]);
```

`frontend/services/callPiPService.ts`:
```ts
setCallActive(active: boolean) {
  if (Platform.OS !== 'android') {
    return;
  }
  nativeModule?.setCallActive(active);
}
```

## 2026-03-02 (Xcode Run=Release + CallPiP crash-guard)

### Измененные файлы
- `frontend/ios/vedamatch.xcodeproj/xcshareddata/xcschemes/vedamatch.xcscheme`
- `frontend/ios/vedamatch/AppDelegate.mm`

### Суть правки (от старого к новому)
- Было:
  - запуск через кнопку `Run` в Xcode использовал `Debug`, из-за чего ставилась dev-сборка;
  - при вызове `setCallActive(false)` в `CallPiPModule` возможен нативный crash по исключению.
- Стало:
  - `LaunchAction` схемы `vedamatch` переведен на `Release`, теперь `Run` в Xcode устанавливает production-конфигурацию;
  - в `CallPiPModule` добавлены `@try/@catch` в `setCallActive` и `stopPiPIfNeeded` с безопасным логированием через `NSLog`.

### Сниппеты кода

`frontend/ios/vedamatch.xcodeproj/xcshareddata/xcschemes/vedamatch.xcscheme`:
```xml
<LaunchAction
   buildConfiguration = "Release"
   ...>
```

`frontend/ios/vedamatch/AppDelegate.mm`:
```objc
RCT_EXPORT_METHOD(setCallActive:(BOOL)active) {
  @try {
    self.callActive = active;
    if (!active) {
      [self stopPiPIfNeeded];
    }
  } @catch (NSException *exception) {
    NSLog(@"[CallPiPModule] setCallActive exception: %@", exception.reason);
  }
}
```

## 2026-03-02 (Native iOS Video PiP для звонка)

### Измененные файлы
- `frontend/ios/vedamatch/AppDelegate.mm`
- `frontend/services/callPiPService.ts`
- `frontend/screens/calls/CallScreen.tsx`

### Суть правки (от старого к новому)
- Было:
  - iOS не имел нативного модуля PiP для video call;
  - JS-сервис PiP работал только с Android;
  - в `CallScreen` кнопка/автовход PiP были ориентированы на Android-only сценарий.
- Стало:
  - в `AppDelegate.mm` добавлен нативный RN bridge `CallPiPModule` на базе `AVPictureInPictureController` + `AVPictureInPictureVideoCallViewController` (iOS 15+);
  - `callPiPService` расширен для iOS и поддерживает `stopPiP()`;
  - `CallScreen` использует общий `isPiPSupported`, показывает кнопку PiP на iOS/Android, авто-входит в PiP при переходе app state в `inactive/background` во время активного звонка, и останавливает PiP при hangup/unmount.

### Сниппеты кода

`frontend/ios/vedamatch/AppDelegate.mm`:
```objc
@interface CallPiPModule : NSObject <RCTBridgeModule, AVPictureInPictureControllerDelegate>
@property(nonatomic, strong) AVPictureInPictureController *pipController;
@property(nonatomic, strong) AVPictureInPictureVideoCallViewController *pipContentController;
@end
```

```objc
AVPictureInPictureControllerContentSource *contentSource =
    [[AVPictureInPictureControllerContentSource alloc]
        initWithActiveVideoCallSourceView:activeSourceView
                     contentViewController:self.pipContentController];
self.pipController = [[AVPictureInPictureController alloc] initWithContentSource:contentSource];
self.pipController.canStartPictureInPictureAutomaticallyFromInline = YES;
```

`frontend/services/callPiPService.ts`:
```ts
const nativeModule: NativeCallPiPModule | null =
  (Platform.OS === 'android' || Platform.OS === 'ios')
    ? (NativeModules.CallPiPModule as NativeCallPiPModule | undefined) || null
    : null;
```

`frontend/screens/calls/CallScreen.tsx`:
```tsx
if (state === 'inactive' || state === 'background') {
  void callPiPService.enterPiP();
}
```

```tsx
{isPiPSupported && hasAccepted && (
  <TouchableOpacity onPress={() => { void handleEnterPiP(); }} style={styles.controlBtn}>
    <Minimize2 color="#fff" size={22} />
  </TouchableOpacity>
)}
```

## 2026-03-02 (Call PiP + background continuity при сворачивании)

### Измененные файлы
- `frontend/android/app/src/main/AndroidManifest.xml`
- `frontend/android/app/src/main/java/com/ragagent/MainActivity.kt`
- `frontend/android/app/src/main/java/com/ragagent/MainApplication.kt`
- `frontend/android/app/src/main/java/com/ragagent/CallPiPModule.kt`
- `frontend/android/app/src/main/java/com/ragagent/CallPiPPackage.kt`
- `frontend/services/callPiPService.ts`
- `frontend/screens/calls/CallScreen.tsx`
- `frontend/ios/vedamatch/Info.plist`

### Суть правки (от старого к новому)
- Было:
  - при сворачивании звонка не было mini-window/виджета;
  - Android `MainActivity` не поддерживал PiP;
  - `CallScreen` не умел переводить активный звонок в PiP;
  - iOS background modes не включали `audio`/`voip`, что ухудшало устойчивость звонка в фоне.
- Стало:
  - Android включает `supportsPictureInPicture` и автопереход в PiP при `Home`, если звонок активен;
  - добавлен native bridge `CallPiPModule` + JS-сервис `callPiPService`;
  - `CallScreen` помечает состояние активного звонка для нативного слоя, автоматически пытается войти в PiP при фоне и дает ручную кнопку PiP;
  - в iOS `UIBackgroundModes` добавлены `audio` и `voip` для непрерывности звонка в фоне.

### Сниппеты кода

`frontend/android/app/src/main/AndroidManifest.xml`:
```xml
<activity
  android:name=".MainActivity"
  android:resizeableActivity="true"
  android:supportsPictureInPicture="true"
  ... />
```

`frontend/android/app/src/main/java/com/ragagent/MainActivity.kt`:
```kotlin
override fun onUserLeaveHint() {
  super.onUserLeaveHint()
  if (!CallPiPState.isCallActive || isInPictureInPictureMode) return
  enterPictureInPictureMode(
    PictureInPictureParams.Builder().setAspectRatio(Rational(9, 16)).build()
  )
}
```

`frontend/screens/calls/CallScreen.tsx`:
```tsx
useEffect(() => {
  callPiPService.setCallActive(Boolean(hasAccepted));
  return () => callPiPService.setCallActive(false);
}, [hasAccepted]);
```

```tsx
{Platform.OS === 'android' && hasAccepted && (
  <TouchableOpacity onPress={() => { void handleEnterPiP(); }} style={styles.controlBtn}>
    <Minimize2 color="#fff" size={22} />
  </TouchableOpacity>
)}
```

`frontend/ios/vedamatch/Info.plist`:
```xml
<key>UIBackgroundModes</key>
<array>
  <string>audio</string>
  <string>remote-notification</string>
  <string>voip</string>
</array>
```

## 2026-03-02 (Calls: входящий popup/push, рингтон/ringback, надежный camera switch на iOS)

### Измененные файлы
- `frontend/App.tsx`
- `frontend/services/notificationService.ts`
- `frontend/screens/calls/CallScreen.tsx`
- `frontend/services/webRTCService.ts`
- `server/internal/websocket/hub.go`
- `server/cmd/api/main.go`

### Суть правки (от старого к новому)
- Было:
  - `voip_call` пуши не запускали call-flow (обрабатывались как обычные уведомления);
  - `CallKeep.setup` в iOS блокировался условием `AppState === active`, из-за чего входящий popup мог не появляться в фоне;
  - на экране звонка не было рингтона для входящего и ringback для исходящего;
  - переключение камеры на реальном iOS-устройстве опиралось на `_switchCamera`, что давало ложный success без фактической смены.
- Стало:
  - `notificationService` прокидывает `voip_call` в выделенный incoming-call handler;
  - `voip_call` обрабатывается до `navigationRef.isReady()`, чтобы событие не терялось на cold start;
  - `App.tsx` объединяет входящий вызов из WebSocket/FCM/VoIP в единый `showIncomingCall`, вызывает `RNCallKeep.displayIncomingCall`, и выполняет setup для iOS без привязки к `active`;
  - `CallScreen` запускает/останавливает `InCallManager.startRingtone` и `startRingback` по состояниям звонка;
  - `webRTCService.switchCamera` на iOS переключает камеру через перезапуск локального стрима (deterministic path).
  - backend websocket hub при недоставленном `offer` (target offline/full channel) вызывает fallback handler, который отправляет `voip_call` push получателю.

### Сниппеты кода

`frontend/services/notificationService.ts`:
```ts
if (data.type === 'voip_call') {
  const payload = { ...params, ...data };
  if (_incomingCallPushHandler) {
    _incomingCallPushHandler(payload);
    return;
  }
}
```

`frontend/App.tsx`:
```tsx
if (useCallKeepNativeUi) {
  await setupVoIP();
  if (voipSetupRef.current) {
    RNCallKeep.displayIncomingCall(callUUID, String(targetId ?? callerName), callerName, 'generic', true);
    return;
  }
}
```

`frontend/screens/calls/CallScreen.tsx`:
```tsx
InCallManager.startRingtone('_DEFAULT_', [0, 1000, 800], 'default', 0);
InCallManager.startRingback('_DEFAULT_');
```

`frontend/services/webRTCService.ts`:
```ts
if (Platform.OS === 'ios') {
  const nextStream = await this.restartLocalStreamWithFacing(!this.isFrontCamera);
  return { success: true, stream: nextStream };
}
```

`server/internal/websocket/hub.go`:
```go
if msg.Type == "offer" {
  h.triggerSignalFallback(msg)
}
```

## 2026-03-02 (Hotfix: fallback при 404 preacher-profile в RN)

### Измененные файлы
- `frontend/screens/portal/services/channels/ChannelPreacherBioManageScreen.tsx`

### Суть правки (от старого к новому)
- Было:
  - при нажатии `Редактировать био` экран падал с alert и возвратом назад, если backend еще без route `GET /api/channels/:id/preacher-profile` (404 `Cannot GET`).
- Стало:
  - экран редактирования открывается даже при 404: поля инициализируются пустыми (graceful fallback);
  - при сохранении и 404/`Cannot PUT` показывается понятное сообщение `Бэкенд не обновлен`, без redbox/краша навигации.

### Сниппеты кода

`frontend/screens/portal/services/channels/ChannelPreacherBioManageScreen.tsx`:
```tsx
const isNotImplementedYet = status === 404 || message.includes('Cannot GET');
if (isNotImplementedYet) {
  setBio('');
  setEvents([]);
  return;
}
```

## 2026-03-02 (Admin UX: быстрые пресеты rollout 10/50/100 для Sadhu Bio/Math)

### Измененные файлы
- `admin/src/app/settings/page.tsx`

### Суть правки (от старого к новому)
- Было:
  - rollout-проценты для `SADHU_SANGA_PREACHER_BIO` и `SADHU_SANGA_MATH_FILTER` вводились вручную.
- Стало:
  - в `Settings -> System` добавлен блок быстрых пресетов `0% / 10% / 50% / 100%`;
  - клик по пресету синхронно выставляет оба поля:
    - `SADHU_SANGA_PREACHER_BIO_ROLLOUT_PERCENT`
    - `SADHU_SANGA_MATH_FILTER_ROLLOUT_PERCENT`.

### Сниппеты кода

`admin/src/app/settings/page.tsx`:
```tsx
const applySadhuRolloutPreset = (percent: '10' | '50' | '100') => {
  setSettings(prev => ({
    ...prev,
    SADHU_SANGA_PREACHER_BIO_ROLLOUT_PERCENT: percent,
    SADHU_SANGA_MATH_FILTER_ROLLOUT_PERCENT: percent,
  }));
};
```

## 2026-03-02 (Admin: управление rollout флагами Sadhu Bio/Math Filter)

### Измененные файлы
- `admin/src/app/settings/page.tsx`
- `server/internal/database/seed.go`

### Суть правки (от старого к новому)
- Было:
  - в админке System tab не было controls для новых флагов `SADHU_SANGA_PREACHER_BIO_*` и `SADHU_SANGA_MATH_FILTER_*`;
  - seed не создавал эти ключи по умолчанию.
- Стало:
  - в `Settings -> System` добавлены поля:
    - `SADHU_SANGA_PREACHER_BIO_ENABLED`
    - `SADHU_SANGA_PREACHER_BIO_ROLLOUT_PERCENT`
    - `SADHU_SANGA_PREACHER_BIO_ROLLOUT_ALLOWLIST`
    - `SADHU_SANGA_PREACHER_BIO_ROLLOUT_DENYLIST`
    - `SADHU_SANGA_MATH_FILTER_ENABLED`
    - `SADHU_SANGA_MATH_FILTER_ROLLOUT_PERCENT`
    - `SADHU_SANGA_MATH_FILTER_ROLLOUT_ALLOWLIST`
    - `SADHU_SANGA_MATH_FILTER_ROLLOUT_DENYLIST`
  - в backend seed добавлены дефолты для этих ключей (`enabled=true`, `percent=100`, allow/deny empty).

### Сниппеты кода

`admin/src/app/settings/page.tsx`:
```tsx
<label className="text-[10px] font-bold uppercase text-[var(--muted-foreground)]">SADHU_SANGA_PREACHER_BIO_ENABLED</label>
<select
  value={settings.SADHU_SANGA_PREACHER_BIO_ENABLED || 'true'}
  onChange={(e) => setSettings({ ...settings, SADHU_SANGA_PREACHER_BIO_ENABLED: e.target.value })}
>
```

`server/internal/database/seed.go`:
```go
{
  Key:   "SADHU_SANGA_MATH_FILTER_ROLLOUT_PERCENT",
  Value: "100",
},
```

## 2026-03-02 (Sadhu Sanga: feature flags + observability для bio/madh-filter)

### Измененные файлы
- `server/internal/services/channel_service.go`
- `server/internal/services/metrics_service.go`

### Суть правки (от старого к новому)
- Было:
  - bio проповедника и матх-фильтр работали без отдельного флагового управления;
  - не было отдельных метрик чтения/сохранения био и применения/bypass матх-фильтра.
- Стало:
  - добавлены feature flags с rollout per-user:
    - `SADHU_SANGA_PREACHER_BIO_ENABLED`
    - `SADHU_SANGA_PREACHER_BIO_ROLLOUT_*`
    - `SADHU_SANGA_MATH_FILTER_ENABLED`
    - `SADHU_SANGA_MATH_FILTER_ROLLOUT_*`
  - bio endpoints (`GetPreacherProfile/UpsertPreacherProfile`) теперь уважают bio-flag;
  - math-filter на Sadhu выдачах (`list/recommendations/facets`) уважают math-filter flag;
  - добавлены метрики:
    - `sadhu_preacher_profile_read_total`
    - `sadhu_preacher_profile_upsert_total`
    - `sadhu_math_filter_applied_total`
    - `sadhu_math_filter_bypass_total`
    - `sadhu_math_filter_empty_profile_total`
  - метрики включены в `GetMetricsSnapshot()`.

### Сниппеты кода

`server/internal/services/channel_service.go`:
```go
if !s.IsSadhuSangaMathFilterEnabledForUser(viewerID) {
  return query, false, nil
}
```

```go
if !s.IsSadhuSangaPreacherBioEnabledForUser(actorID) {
  return nil, ErrChannelsDisabled
}
```

`server/internal/services/metrics_service.go`:
```go
MetricSadhuPreacherProfileReadTotal    = "sadhu_preacher_profile_read_total"
MetricSadhuPreacherProfileUpsertTotal  = "sadhu_preacher_profile_upsert_total"
MetricSadhuMathFilterAppliedTotal      = "sadhu_math_filter_applied_total"
MetricSadhuMathFilterBypassTotal       = "sadhu_math_filter_bypass_total"
MetricSadhuMathFilterEmptyProfileTotal = "sadhu_math_filter_empty_profile_total"
```

## 2026-03-02 (Sadhu Sanga: биография проповедника + фильтр по матху читателя)

### Измененные файлы
- `server/internal/models/preacher_profile.go`
- `server/internal/models/channel.go`
- `server/internal/database/database.go`
- `server/internal/services/channel_service.go`
- `server/internal/handlers/channel_handler.go`
- `server/internal/handlers/channel_handler_test.go`
- `server/cmd/api/main.go`
- `frontend/types/channel.ts`
- `frontend/services/channelService.ts`
- `frontend/screens/portal/services/channels/SadhuSangaHubScreen.tsx`
- `frontend/screens/portal/services/channels/SadhuSangaLiveScreen.tsx`
- `frontend/screens/portal/services/channels/SadhuSangaScheduleScreen.tsx`
- `frontend/screens/portal/services/channels/SadhuSangaProfileScreen.tsx`
- `frontend/screens/portal/services/channels/ChannelDetailsScreen.tsx`
- `frontend/screens/portal/services/channels/ChannelPreacherBioManageScreen.tsx`
- `frontend/screens/portal/services/channels/index.ts`
- `frontend/screens/portal/services/index.ts`
- `frontend/types/navigation.ts`
- `frontend/App.tsx`

### Суть правки (от старого к новому)
- Биография проповедника:
  - Было: в Sadhu Sanga не было отдельной структурированной сущности био/событий жизни.
  - Стало: добавлены `preacher_profiles` + `preacher_profile_events` с API:
    - `GET /api/channels/:id/preacher-profile`
    - `PUT /api/channels/:id/preacher-profile` (`editor+`).
- Матх-фильтрация Sadhu Sanga:
  - Было: списки проповедников не ограничивались матхом пользователя на backend.
  - Стало: для Sadhu-выдач включен server-side фильтр по `viewer.madh` с bypass (`godModeEnabled || superadmin`) и пустой выдачей при пустом `madh`.
- iOS/RN UX:
  - В `ChannelDetails` добавлен публичный блок `О {имя}` (bio, даты, организация, матх, события).
  - Добавлен новый manage-экран `ChannelPreacherBioManage` для `owner/admin/editor`.
  - В Sadhu Hub/Live/Schedule/Profile добавлены подсказки о незаполненном матхе и передача `sadhuSanga=true` для канального листинга.
  - Заголовки в Sadhu деталке приведены к короткому виду: `Аналитика`, `Вопросы`, `Семинары`, `Дорожная карта`.

### Сниппеты кода

`server/internal/services/channel_service.go`:
```go
if filters.SadhuSanga {
  filteredQuery, showNone, err := s.applySadhuMathFilterToChannelQuery(query, filters.ViewerID)
  if err != nil {
    return nil, err
  }
  if showNone {
    return &models.ChannelListResponse{Channels: []models.Channel{}, Total: 0, Page: page, Limit: limit, TotalPages: calculateChannelTotalPages(0, limit)}, nil
  }
  query = filteredQuery
}
```

`server/internal/handlers/channel_handler.go`:
```go
func (h *ChannelHandler) GetPreacherProfile(c *fiber.Ctx) error { ... }
func (h *ChannelHandler) UpdatePreacherProfile(c *fiber.Ctx) error { ... }
```

`frontend/screens/portal/services/channels/ChannelDetailsScreen.tsx`:
```tsx
<TouchableOpacity
  style={styles.preacherBioManageButton}
  onPress={() => navigation.navigate('ChannelPreacherBioManage', { channelId, source: 'sadhu_sanga' })}
>
  <Text style={styles.preacherBioManageButtonText}>Редактировать био</Text>
</TouchableOpacity>
```

`frontend/App.tsx`:
```tsx
<Stack.Screen name="ChannelPreacherBioManage" component={ChannelPreacherBioManageScreen} options={{ headerShown: false }} />
```

## 2026-03-01 (Channels: отдельный экран «Команда канала»)

### Измененные файлы
- `frontend/screens/portal/services/channels/ChannelTeamScreen.tsx`
- `frontend/screens/portal/services/channels/ChannelDetailsScreen.tsx`
- `frontend/screens/portal/services/channels/index.ts`
- `frontend/screens/portal/services/index.ts`
- `frontend/types/navigation.ts`
- `frontend/App.tsx`

### Суть правки (от старого к новому)
- Раньше:
  - управление командой было спрятано внутри общего `ChannelManage` (перегруженный экран).
- Сейчас:
  - добавлен отдельный легкий экран `ChannelTeam` с фокусом только на участниках канала;
  - вход на экран добавлен из `ChannelDetails` отдельной кнопкой в шапке (для `owner/admin`);
  - экран поддерживает:
    - просмотр списка участников (`owner/admin/editor`);
    - добавление участника, смену ролей `admin/editor`, удаление участника (только `owner`, в соответствии с backend RBAC).

### Сниппеты кода

`frontend/App.tsx`:
```tsx
<Stack.Screen name="ChannelTeam" component={ChannelTeamScreen} options={{ headerShown: false }} />
```

`frontend/types/navigation.ts`:
```ts
ChannelTeam: { channelId: number; source?: 'sadhu_sanga' };
```

`frontend/screens/portal/services/channels/ChannelDetailsScreen.tsx`:
```tsx
<TouchableOpacity
  style={[styles.headerButton, styles.manageButton]}
  onPress={() => navigation.navigate('ChannelTeam', { channelId, source: isSadhuSangaMode ? 'sadhu_sanga' : undefined })}
>
  <Users size={16} color={colors.textPrimary} />
</TouchableOpacity>
```

## 2026-03-01 (Sadhu Sanga: язык эфира + TTL 7 дней + автопубликация YouTube)

### Измененные файлы
- `server/internal/models/channel_live.go`
- `server/internal/models/multimedia.go`
- `server/internal/services/channel_service.go`
- `server/internal/services/sadhu_live_archive_service.go`
- `server/internal/services/metrics_service.go`
- `server/internal/services/multimedia_service.go`
- `server/internal/handlers/multimedia_handler.go`
- `server/internal/handlers/admin_handler.go`
- `server/internal/database/database.go`
- `server/internal/database/seed.go`
- `server/cmd/api/main.go`
- `frontend/types/channel.ts`
- `frontend/services/channelService.ts`
- `frontend/services/multimediaService.ts`
- `frontend/screens/portal/services/channels/ChannelDetailsScreen.tsx`
- `frontend/screens/portal/services/channels/SadhuSangaHubScreen.tsx`
- `frontend/screens/portal/services/channels/SadhuSangaLiveScreen.tsx`
- `admin/src/app/settings/page.tsx`

### Суть правки (от старого к новому)
- Язык трансляции:
  - Было: live-сессия не имела явного поля языка (UI показывал только статус live/scheduled).
  - Стало: в `ChannelLiveSession` добавлено `broadcastLanguage` (default `ru`), поддержаны create/update/get и отображение в мобильных экранах (`LIVE • RU`).
- TTL live-архива:
  - Было: записи live не имели отдельной policy истечения по Sadhu Sanga.
  - Стало: для `source_context='sadhu_live_archive'` проставляется `retention_expires_at`, cleanup worker удаляет запись и файлы после 7 дней.
- Автопубликация в YouTube:
  - Было: после завершения эфира не было встроенной автоматической выгрузки.
  - Стало: при `end live` запись ставится в очередь YouTube (`queued`), worker выполняет OAuth refresh-token flow и upload в общий канал.
- Админ-настройки/безопасность:
  - Было: не было системного набора YouTube ключей для Sadhu Sanga pipeline.
  - Стало: добавлены настройки `YOUTUBE_*` и `SADHU_SANGA_LIVE_RETENTION_*`; `YOUTUBE_*` видит/изменяет только `superadmin`; `*_SECRET`/`*_TOKEN` маскируются в API.

### Сниппеты кода

`server/internal/models/channel_live.go`:
```go
BroadcastLanguage string `json:"broadcastLanguage" gorm:"type:varchar(16);not null;default:'ru'"`
```

`server/internal/services/channel_service.go`:
```go
if req.BroadcastLanguage != "" {
  normalizedLanguage := normalizeLiveBroadcastLanguage(req.BroadcastLanguage)
  updates["broadcast_language"] = normalizedLanguage
  _ = s.db.Model(&models.Room{}).Where("id = ?", session.RoomID).Update("language", normalizedLanguage).Error
}
```

`server/internal/services/sadhu_live_archive_service.go`:
```go
GlobalScheduler.RegisterTask("sadhu_live_archive_cleanup", 30, func() {
  _, _ = service.ExpireSadhuLiveArchiveBatch(defaultSadhuRetentionBatchLimit)
})
GlobalScheduler.RegisterTask("sadhu_live_youtube_upload", 5, func() {
  _, _ = service.ProcessYouTubeUploadQueueBatch(defaultSadhuYouTubeUploadLimit)
})
```

`frontend/screens/portal/services/channels/SadhuSangaHubScreen.tsx`:
```tsx
const languageCode = String(item.currentLiveSession?.broadcastLanguage || 'ru').trim().toUpperCase();
{isLive ? `В эфире • ${languageCode}` : `Запланировано • ${languageCode}`}
```

`frontend/screens/portal/services/channels/SadhuSangaLiveScreen.tsx`:
```tsx
const [channelsResponse, archiveResponse] = await Promise.all([
  channelService.getChannels({ page: 1, limit: 60 }),
  multimediaService.getTracks({ type: 'video', sourceContext: 'sadhu_live_archive', page: 1, limit: 12 }),
]);
```

`admin/src/app/settings/page.tsx`:
```tsx
YOUTUBE_OAUTH_CLIENT_ID: '',
YOUTUBE_OAUTH_CLIENT_SECRET: '',
YOUTUBE_OAUTH_REFRESH_TOKEN: '',
YOUTUBE_UPLOAD_CHANNEL_ID: '',
YOUTUBE_DEFAULT_PRIVACY: 'public',
```

## 2026-03-01 (Sadhu Sanga: C1 рекомендации перенесены на backend API)

### Измененные файлы
- `server/internal/models/channel.go`
- `server/internal/services/channel_service.go`
- `server/internal/handlers/channel_handler.go`
- `server/cmd/api/main.go`
- `server/internal/handlers/channel_handler_test.go`
- `frontend/types/channel.ts`
- `frontend/services/channelService.ts`
- `frontend/screens/portal/services/channels/SadhuSangaHubScreen.tsx`

### Суть правки (от старого к новому)
- Источник рекомендаций:
  - Было: `SadhuSangaHubScreen` считал рекомендации локально (`useMemo`) из уже загруженного списка каналов.
  - Стало: рекомендации считаются на backend и отдаются отдельным endpoint.
- Backend контракт:
  - Добавлен `GET /api/channels/sadhu-sanga/recommendations` (protected).
  - Добавлены DTO `ChannelRecommendationItem/ChannelRecommendationsResponse`.
  - В `ChannelService` добавлен серверный скоринг (live/scheduled, newness, followers, relevance city/language/topic).
- Frontend контракт:
  - `channelService.getSadhuSangaRecommendations(...)` запрашивает рекомендации.
  - `SadhuSangaHubScreen` использует ответ API и больше не содержит локальный блок `useMemo` со скорингом.

### Сниппеты кода

`server/cmd/api/main.go`:
```go
protected.Get("/channels/sadhu-sanga/recommendations", channelHandler.GetSadhuSangaRecommendations)
```

`server/internal/services/channel_service.go`:
```go
func (s *ChannelService) GetSadhuSangaRecommendations(viewerID uint, filters ChannelListFilters, limit int) (*models.ChannelRecommendationsResponse, error) {
  // server-side scoring by live status, follow state, followers, and filters relevance
}
```

`frontend/services/channelService.ts`:
```ts
async getSadhuSangaRecommendations(params = {}): Promise<ChannelRecommendationsResponse> {
  const response = await apiClient.get('/channels/sadhu-sanga/recommendations', { params });
  return response.data;
}
```

`frontend/screens/portal/services/channels/SadhuSangaHubScreen.tsx`:
```tsx
const [response, recommendations] = await Promise.all([
  channelService.getChannels(listParams),
  channelService.getSadhuSangaRecommendations({ limit: 3, ...listParams }),
]);
```

## 2026-03-01 (Sadhu Sanga: Stage C1 MVP — блок персональных рекомендаций)

### Измененные файлы
- `frontend/screens/portal/services/channels/SadhuSangaHubScreen.tsx`

### Суть правки (от старого к новому)
- Главная Sadhu Sanga:
  - Было: после блока семинаров отображался только общий список `Проповедники`.
  - Стало: добавлена секция `Рекомендуем вам` (до 3 каналов) перед основным каталогом.
- Алгоритм C1 (MVP, без нового API):
  - учитывает `live/scheduled` статус,
  - учитывает релевантность фильтрам `city/language/topic` по `title/description/slug`,
  - повышает приоритет неподписанных каналов (discovery),
  - учитывает `followersCount` как сигнал вовлеченности.
- UX:
  - каждая карточка рекомендации показывает причину рекомендации;
  - быстрые действия: `Открыть` и `Подписаться`.

### Сниппеты кода

`frontend/screens/portal/services/channels/SadhuSangaHubScreen.tsx`:
```tsx
const recommendedPreachers = useMemo<RecommendedPreacher[]>(() => {
  // scoring by live status + filter relevance + newness + followers
}, [channels, city, followStateByChannel, language, topic, user?.ID]);
```

```tsx
{recommendedPreachers.length > 0 ? (
  <View style={styles.recommendedSection}>
    <Text style={styles.recommendedTitleMain}>Рекомендуем вам</Text>
  </View>
) : null}
```

## 2026-03-01 (Sadhu Sanga: общий layout-компонент для экранов сервиса)

### Измененные файлы
- `frontend/screens/portal/services/channels/components/SadhuSangaLayout.tsx`
- `frontend/screens/portal/services/channels/SadhuSangaHubScreen.tsx`
- `frontend/screens/portal/services/channels/SadhuSangaScheduleScreen.tsx`
- `frontend/screens/portal/services/channels/SadhuSangaLiveScreen.tsx`
- `frontend/screens/portal/services/channels/SadhuSangaProfileScreen.tsx`

### Суть правки (от старого к новому)
- Ранее:
  - каждый экран Sadhu Sanga (`Hub/Schedule/Live/Profile`) содержал собственную дублированную разметку `LinearGradient + SafeArea + Header + BottomNav`.
- Сейчас:
  - вынесен единый `SadhuSangaLayout` с общим shell, header и нижним баром;
  - экраны передают в layout только свои параметры (`subtitle`, `activeTab`, обработчики back/notifications/tabPress`) и свой контент;
  - дублирование кода и риск рассинхронизации UI между экранами снижены.

### Сниппеты кода

`frontend/screens/portal/services/channels/components/SadhuSangaLayout.tsx`:
```tsx
<SadhuSangaLayout
  colors={colors}
  subtitle="Прямые эфиры и архив"
  activeTab="live"
  onBack={() => navigation.goBack()}
  onNotificationsPress={() => navigation.navigate('SadhuSangaSmartPush')}
  onTabPress={openTab}
>
  {children}
</SadhuSangaLayout>
```

`frontend/screens/portal/services/channels/SadhuSangaHubScreen.tsx`:
```tsx
<SadhuSangaLayout ... activeTab="home" ...>
  <ScrollView ...>{/* home content */}</ScrollView>
</SadhuSangaLayout>
```

## 2026-03-01 (Sadhu Sanga: модерационно-нейтральный CTA вместо «Пожертвовать»)

### Измененные файлы
- `frontend/screens/portal/services/channels/SadhuSangaProfileScreen.tsx`

### Суть правки (от старого к новому)
- Текст CTA в профиле Sadhu Sanga:
  - Было: `Пожертвовать` и описание `Ваше пожертвование помогает...`.
  - Стало: `Поддержать сервис` и описание `Ваша поддержка помогает...`.
- Цель: снизить риск отклонения модерацией маркетов за прямые donation-формулировки в этом сервисном блоке.

### Сниппеты кода

`frontend/screens/portal/services/channels/SadhuSangaProfileScreen.tsx`:
```tsx
<Text style={styles.profileDonateText}>Ваша поддержка помогает нам развивать сервис и делать знание доступнее.</Text>
<Text style={styles.profileDonateButtonText}>Поддержать сервис</Text>
```

## 2026-03-01 (Sadhu Sanga Hub: cleanup до home-only)

### Измененные файлы
- `frontend/screens/portal/services/channels/SadhuSangaHubScreen.tsx`

### Суть правки (от старого к новому)
- Hub-экран:
  - Было: в `SadhuSangaHubScreen` оставались ветки `schedule/live/profile` и вычисление `activeTab`, хотя эти разделы уже вынесены в отдельные экран-файлы.
  - Стало: `SadhuSangaHubScreen` приведен к чистому `home-only` режиму:
    - удалены мертвые ветки рендера `schedule/live/profile`,
    - удалена route-based tab-логика (`forcedTab/useRoute/activeTab`),
    - нижний бар остался только как навигация в отдельные экраны (`SadhuSangaSchedule/SadhuSangaLive/SadhuSangaProfile`).

### Сниппеты кода

`frontend/screens/portal/services/channels/SadhuSangaHubScreen.tsx`:
```tsx
const openServiceTab = useCallback((tab: ServiceTab) => {
  const tabRouteMap = { home: 'SadhuSangaHub', schedule: 'SadhuSangaSchedule', live: 'SadhuSangaLive', profile: 'SadhuSangaProfile' };
  const targetRoute = tabRouteMap[tab];
  if (targetRoute === 'SadhuSangaHub') return;
  navigation.replace(targetRoute);
}, [navigation]);
```

## 2026-03-01 (Sadhu Sanga: самостоятельные Schedule/Live/Profile экраны)

### Измененные файлы
- `frontend/screens/portal/services/channels/SadhuSangaScheduleScreen.tsx`
- `frontend/screens/portal/services/channels/SadhuSangaLiveScreen.tsx`
- `frontend/screens/portal/services/channels/SadhuSangaProfileScreen.tsx`

### Суть правки (от старого к новому)
- Расписание:
  - Было: `SadhuSangaScheduleScreen` был прокси-оберткой на `SadhuSangaHubScreen`.
  - Стало: самостоятельный экран с собственной загрузкой семинаров (`getServices + getSchedules`), фильтром `Только с датой`, CTA `Записаться/Маршрут`.
- Эфиры:
  - Было: `SadhuSangaLiveScreen` был прокси-оберткой на `SadhuSangaHubScreen`.
  - Стало: самостоятельный экран с собственной выборкой live-каналов, `joinChannelLive` и отдельным архивом лекций.
- Профиль:
  - Было: обертка на `SadhuSangaHubScreen`, часть значений была плейсхолдерной.
  - Стало: самостоятельный экран с реальными счетчиками (`подписки/сохраненные лекции/вопросы/город`) из API.

### Сниппеты кода

`frontend/screens/portal/services/channels/SadhuSangaScheduleScreen.tsx`:
```tsx
const response = await getServices({ page: 1, limit: 50 });
const loaded = await getSchedules(service.id);
```

`frontend/screens/portal/services/channels/SadhuSangaLiveScreen.tsx`:
```tsx
const response = await channelService.getChannels({ page: 1, limit: 60 });
const join = await channelService.joinChannelLive(item.ID, session.id, { participantName, metadata: { platform: 'mobile' } });
```

`frontend/screens/portal/services/channels/SadhuSangaProfileScreen.tsx`:
```tsx
const [channelsResult, favoritesResult, ticketsResult, pushResult] = await Promise.allSettled([
  channelService.getChannels({ page: 1, limit: 100 }),
  multimediaService.getFavorites(1, 1),
  supportService.listMyTickets(1, 200),
  channelService.getSadhuSangaPushPreference(),
]);
```

## 2026-03-01 (Sadhu Sanga Profile: самостоятельный экран с реальными метриками)

### Измененные файлы
- `frontend/screens/portal/services/channels/SadhuSangaProfileScreen.tsx`

### Суть правки (от старого к новому)
- Экран профиля:
  - Было: `SadhuSangaProfileScreen` был прокси-оберткой над `SadhuSangaHubScreen` (`forcedTab=\"profile\"`), а часть значений была плейсхолдерной.
  - Стало: `SadhuSangaProfileScreen` стал самостоятельным экраном с собственной загрузкой данных и нижним баром.
- Источники данных:
  - `Мои подписки` — реальный count по `channelService.getChannels(...).channels[].isFollowing`.
  - `Сохраненные лекции` — реальный count из `multimediaService.getFavorites(...).total`.
  - `Мои вопросы` — count тикетов из `supportService.listMyTickets(...)` по `entryPoint='sadhu_sanga_question'`.
  - `Мой город` — из `getSadhuSangaPushPreference().city` с fallback на профиль пользователя.

### Сниппеты кода

`frontend/screens/portal/services/channels/SadhuSangaProfileScreen.tsx`:
```tsx
const [channelsResult, favoritesResult, ticketsResult, pushResult] = await Promise.allSettled([
  channelService.getChannels({ page: 1, limit: 100 }),
  multimediaService.getFavorites(1, 1),
  supportService.listMyTickets(1, 200),
  channelService.getSadhuSangaPushPreference(),
]);
```

```tsx
<TouchableOpacity style={styles.profileCardRow} onPress={() => navigation.navigate('SupportInbox')}>
  <Text style={styles.profileCardTitle}>Мои вопросы</Text>
  <Text style={styles.profileCardValue}>{questionsCount}</Text>
</TouchableOpacity>
```

## 2026-03-01 (Sadhu Sanga: отдельные экраны для нижнего меню)

### Измененные файлы
- `frontend/types/navigation.ts`
- `frontend/App.tsx`
- `frontend/screens/portal/services/channels/SadhuSangaHubScreen.tsx`
- `frontend/screens/portal/services/channels/SadhuSangaScheduleScreen.tsx`
- `frontend/screens/portal/services/channels/SadhuSangaLiveScreen.tsx`
- `frontend/screens/portal/services/channels/SadhuSangaProfileScreen.tsx`
- `frontend/screens/portal/services/channels/index.ts`
- `frontend/screens/portal/services/index.ts`

### Суть правки (от старого к новому)
- Навигация нижнего меню Sadhu Sanga:
  - Было: `Расписание/Эфиры/Профиль` переключались как внутренние tab-секции внутри одного `SadhuSangaHubScreen` через локальный state.
  - Стало: добавлены отдельные route-экраны `SadhuSangaSchedule`, `SadhuSangaLive`, `SadhuSangaProfile` и отдельные файл-экраны для каждого пункта, а нижний бар переключает именно экраны (`navigation.replace`).
- UI-поведение экранов:
  - Было: hero/поиск/фичи показывались и при переходе на таб-секции.
  - Стало: home-блок (`поиск + hero + возможности`) показывается только на `Главная`, остальные экраны отображают только свой профильный контент.

### Сниппеты кода

`frontend/App.tsx`:
```tsx
<Stack.Screen name="SadhuSangaSchedule" component={SadhuSangaScheduleScreen} options={{ headerShown: false }} />
<Stack.Screen name="SadhuSangaLive" component={SadhuSangaLiveScreen} options={{ headerShown: false }} />
<Stack.Screen name="SadhuSangaProfile" component={SadhuSangaProfileScreen} options={{ headerShown: false }} />
```

`frontend/screens/portal/services/channels/SadhuSangaHubScreen.tsx`:
```tsx
const openServiceTab = useCallback((tab: ServiceTab) => {
  const tabRouteMap = { home: 'SadhuSangaHub', schedule: 'SadhuSangaSchedule', live: 'SadhuSangaLive', profile: 'SadhuSangaProfile' };
  navigation.replace(tabRouteMap[tab]);
}, [navigation]);
```

`frontend/screens/portal/services/channels/SadhuSangaScheduleScreen.tsx`:
```tsx
export default function SadhuSangaScheduleScreen() {
  return <SadhuSangaHubScreen forcedTab="schedule" />;
}
```

## 2026-03-01 (Sadhu Sanga: умные пуши вынесены в отдельный экран)

### Измененные файлы
- `frontend/screens/portal/services/channels/SadhuSangaSmartPushScreen.tsx`
- `frontend/screens/portal/services/channels/SadhuSangaHubScreen.tsx`
- `frontend/screens/portal/services/channels/index.ts`
- `frontend/screens/portal/services/index.ts`
- `frontend/types/navigation.ts`
- `frontend/App.tsx`

### Суть правки (от старого к новому)
- Настройки умных пушей:
  - Было: inline-блок `Умные пуши` внутри `SadhuSangaHubScreen`.
  - Стало: отдельный экран `SadhuSangaSmartPushScreen` с полной настройкой `enabled/reminder1h/reminder10m/city/language/topics/time window/timezone`.
- Навигация:
  - Было: колокольчик в `SadhuSangaHub` показывал только `Alert`.
  - Стало: колокольчик открывает отдельную страницу `SadhuSangaSmartPush`.
- UX расписания:
  - Было: кнопка `Включить уведомления` раскрывала inline-секцию на том же экране.
  - Стало: кнопка ведет на отдельный экран настроек уведомлений.

### Сниппеты кода

`frontend/screens/portal/services/channels/SadhuSangaHubScreen.tsx`:
```tsx
<TouchableOpacity style={styles.notifyButton} onPress={() => navigation.navigate('SadhuSangaSmartPush')}>
  <Bell size={18} color={colors.textPrimary} />
</TouchableOpacity>
```

```tsx
<TouchableOpacity style={styles.scheduleNoticeButton} onPress={() => navigation.navigate('SadhuSangaSmartPush')}>
  <Text style={styles.scheduleNoticeButtonText}>Включить уведомления</Text>
</TouchableOpacity>
```

`frontend/screens/portal/services/channels/SadhuSangaSmartPushScreen.tsx`:
```tsx
const preference = await channelService.getSadhuSangaPushPreference();
await channelService.updateSadhuSangaPushPreference({
  enabled, reminder1h, reminder10m, city, language, topics, useTimeWindow, startHour, endHour, timezone,
});
```

## 2026-03-01 (Sadhu Sanga Stage B: live sessions + join flow + live analytics)

### Измененные файлы
- `server/internal/models/channel_live.go`
- `server/internal/models/channel.go`
- `server/internal/models/channel_analytics.go`
- `server/internal/database/database.go`
- `server/internal/services/channel_service.go`
- `server/internal/handlers/channel_handler.go`
- `server/internal/handlers/channel_handler_test.go`
- `server/cmd/api/main.go`
- `frontend/types/channel.ts`
- `frontend/services/channelService.ts`
- `frontend/types/navigation.ts`
- `frontend/screens/portal/chat/RoomChatScreen.tsx`
- `frontend/screens/portal/services/channels/SadhuSangaHubScreen.tsx`
- `frontend/screens/portal/services/channels/ChannelDetailsScreen.tsx`

### Суть правки (от старого к новому)
- Live-сессии канала (этап B):
  - Было: в Sadhu Sanga не было доменной сущности live-сессии канала; SFU использовался только в существующем room-chat контексте.
  - Стало: добавлены `channel_live_sessions` + `channel_live_viewers` с lifecycle `scheduled/live/ended/cancelled`, room binding и агрегатами просмотров.
- Новый Channel Live API:
  - Было: только follow/preacher analytics/push prefs.
  - Стало: добавлены endpoint’ы:
    - `GET /api/channels/:id/live`
    - `POST /api/channels/:id/live`
    - `PATCH /api/channels/:id/live/:liveId`
    - `POST /api/channels/:id/live/:liveId/start`
    - `POST /api/channels/:id/live/:liveId/end`
    - `POST /api/channels/:id/live/:liveId/cancel`
    - `POST /api/channels/:id/live/:liveId/join`
    - `POST /api/channels/:id/live/:liveId/leave`
- RBAC и доступ:
  - Было: нет отдельной live-RBAC модели.
  - Стало: create/update/start/end/cancel для `editor+`; join только для `subscriber+` (включая owner/admin/editor), не подписчик получает `403`.
- Интеграция с текущим LiveKit:
  - Было: не было channel-level join обертки.
  - Стало: `join` выдает SFU token/wsUrl через текущий LiveKit-сервис и автоматически обеспечивает `room_members` для участника.
- Live аналитика:
  - Было: `preacher analytics` содержала только лекции/семинары/города.
  - Стало: добавлены `liveSessionsTotal`, `liveUniqueViewersTotal`, `liveWatchMinutesTotal`.
- UI мобильного клиента:
  - `SadhuSangaHub`: новый блок `Прямой эфир` с карточками `live/scheduled` и CTA `Смотреть эфир`.
  - `ChannelDetails (sadhu_sanga)`: блок live с кнопками:
    - `Анонсировать эфир`, `Старт`, `Завершить`, `Отменить`, `Войти в эфир`.
  - `RoomChat`: поддержка `autoStartCall` + отправка `leave` при закрытии live-видеобара для учета watch-time.

### Сниппеты кода

`server/cmd/api/main.go`:
```go
protected.Get("/channels/:id/live", channelHandler.GetLiveSession)
protected.Post("/channels/:id/live/:liveId/join", channelHandler.JoinLiveSession)
```

`server/internal/services/channel_service.go`:
```go
func (s *ChannelService) JoinLiveSession(channelID, liveID, actorID uint, req models.ChannelLiveJoinRequest) (*models.ChannelLiveJoinResponse, error) {
    // RBAC subscriber+, room member upsert, LiveKit token issue
}
```

`frontend/screens/portal/services/channels/ChannelDetailsScreen.tsx`:
```tsx
<TouchableOpacity style={styles.liveJoinButton} onPress={() => void handleJoinLive()}>
  <Text style={styles.liveJoinButtonText}>Войти в эфир</Text>
</TouchableOpacity>
```

`frontend/screens/portal/chat/RoomChatScreen.tsx`:
```tsx
onClose={() => {
  setIsCallActive(false);
  if (liveChannelId && liveId) void channelService.leaveChannelLive(liveChannelId, liveId);
}}
```

## 2026-03-01 (Sadhu Sanga: аналитика проповедника в ChannelDetails)

### Измененные файлы
- `server/internal/models/channel_analytics.go`
- `server/internal/services/channel_service.go`
- `server/internal/handlers/channel_handler.go`
- `server/cmd/api/main.go`
- `frontend/services/channelService.ts`
- `frontend/screens/portal/services/channels/ChannelDetailsScreen.tsx`

### Суть правки (от старого к новому)
- Аналитика для проповедника:
  - Было: в `sadhu_sanga` режиме `ChannelDetails` не было блока аналитики по лекциям/регистрациям/городам.
  - Стало: добавлен новый endpoint `GET /api/channels/:id/preacher-analytics` (доступ owner/admin канала), который возвращает:
    - `totalLectureViews` (сумма просмотров опубликованных постов канала),
    - `seminarRegistrations` (число регистраций на семинары владельца канала),
    - `activeCities` (топ городов клиентов по регистрациям).
- Мобильный экран:
  - Было: в блоках Sadhu Sanga были вопросы и семинары, без метрик.
  - Стало: добавлен блок `Аналитика проповедника` в `ChannelDetails` (только owner/admin) с карточками метрик и списком активных городов.

### Сниппеты кода

`server/cmd/api/main.go`:
```go
protected.Get("/channels/:id/preacher-analytics", channelHandler.GetPreacherAnalytics)
```

`server/internal/services/channel_service.go`:
```go
func (s *ChannelService) GetPreacherAnalytics(channelID, actorID uint) (*models.ChannelPreacherAnalyticsResponse, error) {
    channel, _, err := s.requireRole(channelID, actorID, models.ChannelMemberRoleAdmin)
    // ...
}
```

`frontend/screens/portal/services/channels/ChannelDetailsScreen.tsx`:
```tsx
{canViewPreacherAnalytics ? (
  <View style={styles.preacherAnalyticsSection}>
    <Text style={styles.preacherAnalyticsTitle}>Аналитика проповедника</Text>
  </View>
) : null}
```

## 2026-03-01 (Sadhu Sanga: "Не пропустить" reminder toggles 1h/10m)

### Измененные файлы
- `server/internal/models/channel_push_preference.go`
- `server/internal/services/channel_service.go`
- `server/internal/workers/booking_reminder_worker.go`
- `frontend/services/channelService.ts`
- `frontend/screens/portal/services/channels/SadhuSangaHubScreen.tsx`

### Суть правки (от старого к новому)
- Персональные флаги напоминаний:
  - Было: worker отправлял reminder `1h` и `10m` всем участникам booking без пользовательского контроля.
  - Стало: в smart push preference добавлены поля `reminder1h` и `reminder10m` (по умолчанию `true`), и booking worker учитывает их перед отправкой push.
- UX в `SadhuSangaHub`:
  - Было: в блоке `Умные пуши` не было управления режимом «Не пропустить».
  - Стало: добавлены переключатели `1ч` и `10м` + сохранение через текущий endpoint smart push preferences.

### Сниппеты кода

`server/internal/workers/booking_reminder_worker.go`:
```go
if shouldSendBookingReminderByPreference(b.ClientID, reminderType) {
    push.SendBookingReminder(...)
}
```

`server/internal/models/channel_push_preference.go`:
```go
Reminder1h  bool `gorm:"column:reminder_1h;default:true"`
Reminder10m bool `gorm:"column:reminder_10m;default:true"`
```

`frontend/screens/portal/services/channels/SadhuSangaHubScreen.tsx`:
```tsx
<TouchableOpacity onPress={() => setPushReminder1h(prev => !prev)}><Text>1ч</Text></TouchableOpacity>
<TouchableOpacity onPress={() => setPushReminder10m(prev => !prev)}><Text>10м</Text></TouchableOpacity>
```

## 2026-02-28 (Sadhu Sanga: smart push preferences by city/language/topic/time)

### Измененные файлы
- `server/internal/models/channel_push_preference.go`
- `server/internal/database/database.go`
- `server/internal/services/channel_service.go`
- `server/internal/handlers/channel_handler.go`
- `server/cmd/api/main.go`
- `frontend/services/channelService.ts`
- `frontend/screens/portal/services/channels/SadhuSangaHubScreen.tsx`

### Суть правки (от старого к новому)
- Персональные фильтры push для Садху-санга:
  - Было: push по подпискам канала отправлялся всем подписчикам без персональной фильтрации.
  - Стало: добавлены пользовательские smart-push preferences (`city`, `language`, `topics`, `time window`, `timezone`, `enabled`) и проверка этих фильтров перед отправкой push.
- Новый API:
  - `GET /api/channels/sadhu-sanga/push-preferences`
  - `PUT /api/channels/sadhu-sanga/push-preferences`
- UX в мобильном экране:
  - В `SadhuSangaHub` добавлен блок `Умные пуши` с настройкой фильтров и сохранением в backend.

### Сниппеты кода

`server/cmd/api/main.go`:
```go
protected.Get("/channels/sadhu-sanga/push-preferences", channelHandler.GetSadhuSangaPushPreference)
protected.Put("/channels/sadhu-sanga/push-preferences", channelHandler.UpdateSadhuSangaPushPreference)
```

`server/internal/services/channel_service.go`:
```go
shouldSend, _ := s.shouldSendSubscriberPushBySmartPreference(post, channel, &owner, member.UserID)
if !shouldSend {
    continue
}
```

`frontend/screens/portal/services/channels/SadhuSangaHubScreen.tsx`:
```ts
const preference = await channelService.getSadhuSangaPushPreference();
await channelService.updateSadhuSangaPushPreference({ ... });
```

## 2026-02-28 (Sadhu Sanga: seminar route button with map deeplink)

### Измененные файлы
- `frontend/screens/portal/services/channels/SadhuSangaHubScreen.tsx`
- `frontend/screens/portal/services/channels/ChannelDetailsScreen.tsx`

### Суть правки (от старого к новому)
- Карта/маршрут для офлайн-семинаров:
  - Было: в карточках семинаров была только кнопка `Записаться`.
  - Стало: для `offline` семинаров добавлена кнопка `Маршрут`, открывающая карту через deeplink:
    - по координатам `offlineLat/offlineLng` (если есть),
    - иначе по `offlineAddress`.
- Обработка ошибок:
  - если офлайн-адрес отсутствует или карту нельзя открыть, показывается понятный alert.

### Сниппеты кода

`frontend/screens/portal/services/channels/SadhuSangaHubScreen.tsx`:
```ts
const routeUrl = Number.isFinite(service.offlineLat) && Number.isFinite(service.offlineLng)
  ? `https://www.google.com/maps/search/?api=1&query=${service.offlineLat},${service.offlineLng}`
  : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(service.offlineAddress || '')}`;
```

```tsx
{item.service.channel === 'offline' ? (
  <TouchableOpacity onPress={() => void openSeminarRoute(item.service)}>
    <Text>Маршрут</Text>
  </TouchableOpacity>
) : null}
```

## 2026-02-28 (Sadhu Sanga: voting for preacher questions)

### Измененные файлы
- `server/internal/models/support.go`
- `server/internal/database/database.go`
- `server/internal/handlers/support_handler.go`
- `server/cmd/api/main.go`
- `frontend/services/supportService.ts`
- `frontend/screens/portal/services/channels/ChannelDetailsScreen.tsx`

### Суть правки (от старого к новому)
- Голосование за вопросы последователей:
  - Было: вопрос к проповеднику создавался как support ticket (`sadhu_sanga_question`), но голосовать за важные вопросы было нельзя.
  - Стало: добавлена таблица голосов `support_question_votes` и API:
    - `GET /api/support/preachers/:preacherId/questions`
    - `POST /api/support/tickets/:id/vote`
- UI в `ChannelDetails` (режим `source='sadhu_sanga'`):
  - Было: только кнопка `Задать вопрос проповеднику` и блок семинаров.
  - Стало: добавлен блок `Вопросы последователей` с:
    - списком вопросов;
    - числом голосов;
    - кнопкой `Поддержать` / `Вы поддержали`.

### Сниппеты кода

`server/internal/models/support.go`:
```go
type SupportQuestionVote struct {
    gorm.Model
    ConversationID uint `gorm:"not null;index;uniqueIndex:idx_support_question_vote"`
    UserID         uint `gorm:"not null;index;uniqueIndex:idx_support_question_vote"`
}
```

`server/cmd/api/main.go`:
```go
protected.Get("/support/preachers/:preacherId/questions", supportHandler.ListPreacherQuestions)
protected.Post("/support/tickets/:id/vote", supportHandler.VotePreacherQuestion)
```

`frontend/screens/portal/services/channels/ChannelDetailsScreen.tsx`:
```tsx
const response = await supportService.getPreacherQuestions(ownerID, 1, 20);
const vote = await supportService.votePreacherQuestion(question.id);
```

```tsx
<Text style={styles.preacherQuestionsTitle}>Вопросы последователей</Text>
<Text style={styles.preacherQuestionVotes}>Голосов: {question.voteCount}</Text>
```

## 2026-02-28 (Sadhu Sanga: seminars filter "Только с датой")

### Измененные файлы
- `frontend/screens/portal/services/channels/SadhuSangaHubScreen.tsx`

### Суть правки (от старого к новому)
- Фильтрация карточек в блоке `Ближайшие семинары`:
  - Было: в список попадали элементы без вычисленной даты (`Дата уточняется`).
  - Стало: добавлен переключатель `Только с датой` (по умолчанию включен), который скрывает семинары без `nextAt`.
- Сортировка осталась прежней:
  - Семинары с датой идут по возрастанию ближайшего времени.
  - Элементы без даты показываются только при отключенном фильтре.

### Сниппеты кода

`frontend/screens/portal/services/channels/SadhuSangaHubScreen.tsx`:
```ts
const [seminarsOnlyWithDate, setSeminarsOnlyWithDate] = useState(true);
...
const filteredByDate = seminarsOnlyWithDate
  ? filteredByCity.filter(item => Boolean(item.nextAt))
  : filteredByCity;
```

```tsx
<TouchableOpacity onPress={() => setSeminarsOnlyWithDate(prev => !prev)}>
  <Text>Только с датой</Text>
</TouchableOpacity>
```

## 2026-02-28 (Sadhu Sanga: preacher-specific seminars in ChannelDetails)

### Измененные файлы
- `frontend/types/navigation.ts`
- `frontend/screens/portal/services/channels/SadhuSangaHubScreen.tsx`
- `frontend/screens/portal/services/channels/ChannelDetailsScreen.tsx`

### Суть правки (от старого к новому)
- Адресный переход к семинарам конкретного проповедника:
  - Было: кнопка `Семинары` на карточке проповедника вела в общий `ServicesHome`.
  - Стало: кнопка ведет в `ChannelDetails` этого проповедника с `focusSection='seminars'`.
- Семинары в деталях проповедника:
  - Было: в `ChannelDetails` (sadhu mode) не было отдельного списка семинаров владельца канала.
  - Стало: добавлен блок `Семинары проповедника`, который загружает услуги и отбирает только `service.ownerId === channel.ownerId`, вычисляет ближайшую дату слота (`specificDate`/weekly `dayOfWeek+timeStart`) и дает CTA `Записаться`.
- Улучшение UX:
  - `ChannelDetails` умеет автопрокручивать к блоку семинаров при `focusSection='seminars'`.

### Сниппеты кода

`frontend/screens/portal/services/channels/SadhuSangaHubScreen.tsx`:
```ts
navigation.navigate('ChannelDetails', {
  channelId: item.ID,
  source: 'sadhu_sanga',
  focusSection: 'seminars',
})
```

`frontend/screens/portal/services/channels/ChannelDetailsScreen.tsx`:
```ts
const focusSection = route.params?.focusSection;
const mine = (response.services || []).filter(service => service.ownerId === ownerID);
```

```tsx
<Text style={styles.preacherSeminarsTitle}>Семинары проповедника</Text>
<TouchableOpacity onPress={() => navigation.navigate('ServiceDetail', { serviceId: item.service.id })}>
  <Text>Записаться</Text>
</TouchableOpacity>
```

## 2026-02-28 (Sadhu Sanga: upcoming seminars block with booking CTA)

### Измененные файлы
- `frontend/screens/portal/services/channels/SadhuSangaHubScreen.tsx`

### Суть правки (от старого к новому)
- Блок “Ближайшие семинары”:
  - Было: в `SadhuSangaHub` показывался только каталог проповедников.
  - Стало: добавлен отдельный блок ближайших семинаров с:
    - названием;
    - форматом (`Онлайн/Оффлайн`);
    - датой ближайшего слота (или `Дата уточняется`);
    - локацией/ссылкой;
    - кнопкой `Записаться` -> `ServiceDetail`.
- Источник данных:
  - Используется `getServices(...)` + догрузка `getSchedules(serviceId)` для вычисления ближайшей даты.
  - Поддержан расчет next-occurrence для `specificDate` и weekly `dayOfWeek/timeStart`.

### Сниппеты кода

`frontend/screens/portal/services/channels/SadhuSangaHubScreen.tsx`:
```ts
const response = await getServices({ page: 1, limit: 50, language: language.trim() || undefined });
const loaded = await getSchedules(service.id);
const nextAt = resolveNearestScheduleDate(schedules, now);
```

```tsx
<Text style={styles.seminarDate}>
  {item.nextAt ? item.nextAt.toLocaleString('ru-RU', ...) : 'Дата уточняется'}
</Text>
<TouchableOpacity onPress={() => navigation.navigate('ServiceDetail', { serviceId: item.service.id })}>
  <Text>Записаться</Text>
</TouchableOpacity>
```

## 2026-02-28 (Sadhu Sanga: quick card actions Question/Seminars)

### Измененные файлы
- `frontend/screens/portal/services/channels/SadhuSangaHubScreen.tsx`

### Суть правки (от старого к новому)
- Быстрые действия на карточке проповедника:
  - Было: карточка в `SadhuSangaHub` давала только переход в `ChannelDetails` + кнопку follow.
  - Стало: добавлены CTA:
    - `Вопрос` -> `SupportTicketForm` с `entryPoint='sadhu_sanga_question'` и `targetPreacherId`.
    - `Семинары` -> `ServicesHome` (каталог сервисов/записей).

### Сниппеты кода

`frontend/screens/portal/services/channels/SadhuSangaHubScreen.tsx`:
```tsx
<TouchableOpacity onPress={() => navigation.navigate('SupportTicketForm', {
  entryPoint: 'sadhu_sanga_question',
  targetPreacherId: item.ownerId,
  targetPreacherName: item.title,
})}>
  <Text>Вопрос</Text>
</TouchableOpacity>
```

```tsx
<TouchableOpacity onPress={() => navigation.navigate('ServicesHome')}>
  <Text>Семинары</Text>
</TouchableOpacity>
```

## 2026-02-28 (Sadhu Sanga: ask-preacher question flow in frontend)

### Измененные файлы
- `frontend/types/navigation.ts`
- `frontend/screens/support/SupportTicketFormScreen.tsx`
- `frontend/screens/portal/services/channels/ChannelDetailsScreen.tsx`

### Суть правки (от старого к новому)
- Передача адресного вопроса проповеднику:
  - Было: `SupportTicketForm` принимал только `entryPoint`; frontend не прокидывал `targetPreacherId` в тикет.
  - Стало: в route `SupportTicketForm` добавлены `targetPreacherId/targetPreacherName`, а форма отправляет `targetPreacherId` в `supportService.createTicket(...)`.
- UX в Садху-санга:
  - Было: в `ChannelDetails` не было явного CTA для вопроса проповеднику.
  - Стало: в режиме `source='sadhu_sanga'` добавлена кнопка `Задать вопрос проповеднику` с переходом в `SupportTicketForm` (`entryPoint='sadhu_sanga_question'` + target preacher).
- Защита от пустого target:
  - Кнопка отключается, если `ownerId` канала не загружен.

### Сниппеты кода

`frontend/types/navigation.ts`:
```ts
SupportTicketForm: { entryPoint?: string; targetPreacherId?: number; targetPreacherName?: string } | undefined;
```

`frontend/screens/support/SupportTicketFormScreen.tsx`:
```ts
const targetPreacherId = useMemo(() => route.params?.targetPreacherId, [route.params?.targetPreacherId]);
...
await supportService.createTicket({ ..., entryPoint, targetPreacherId, ... });
```

`frontend/screens/portal/services/channels/ChannelDetailsScreen.tsx`:
```tsx
navigation.navigate('SupportTicketForm', {
  entryPoint: 'sadhu_sanga_question',
  targetPreacherId: channel.ownerId,
  targetPreacherName: channel?.title,
})
```

## 2026-02-28 (ChannelDetails resilient loading when posts API fails)

### Измененные файлы
- `frontend/screens/portal/services/channels/ChannelDetailsScreen.tsx`

### Суть правки (от старого к новому)
- UX при ошибке загрузки постов:
  - Было: `loadData` использовал `Promise.all`; если `listPosts` падал (например SQL 42P01 на backend), весь экран уходил в error flow и показывал модалку на каждый вход.
  - Стало: `listPosts` обернут в локальный `catch` с fallback на пустой список постов; экран канала открывается стабильно, ошибка логируется через `console.warn` без блокирующего popup.

### Сниппеты кода

`frontend/screens/portal/services/channels/ChannelDetailsScreen.tsx`:
```ts
channelService
  .listPosts(channelId, { page: 1, limit: 100, includeDraft })
  .catch((error: any) => {
    console.warn(`[ChannelDetails] Failed to load posts ...`);
    return { posts: [], total: 0, page: 1, limit: 100, totalPages: 1, viewerRole: undefined };
  })
```

## 2026-02-28 (Sadhu Sanga/ChannelDetails SQL 42P01 hotfix)

### Измененные файлы
- `server/internal/services/channel_service.go`

### Суть правки (от старого к новому)
- Ошибка при открытии `ChannelDetails`:
  - Было: в `ListPosts` сортировка использовала `Order("channels.created_at DESC")` без `JOIN channels`, что на PostgreSQL давало `ERROR: missing FROM-clause entry for table "channels" (SQLSTATE 42P01)`.
  - Стало: сортировка исправлена на `Order("channel_posts.created_at DESC")`.

### Сниппеты кода

`server/internal/services/channel_service.go`:
```go
Order("published_at DESC NULLS LAST").
Order("channel_posts.created_at DESC").
```

## 2026-02-28 (Sadhu Sanga access fix + dedicated ChannelDetails mode)

### Измененные файлы
- `frontend/screens/portal/PortalMainScreen.tsx`
- `frontend/types/navigation.ts`
- `frontend/screens/portal/services/channels/SadhuSangaHubScreen.tsx`
- `frontend/screens/portal/services/channels/ChannelDetailsScreen.tsx`

### Суть правки (от старого к новому)
- Невозможность зайти в сервис:
  - Было: `resolveServiceLaunch('sadhu_sanga')` отдавал `SadhuSangaHub`, но `PortalMainScreen.navigateResolvedScreen` не обрабатывал этот screen, из-за чего tap по иконке не открывал сервис.
  - Стало: добавлен явный кейс `SadhuSangaHub` в навигационном резолвере портала.
- Отдельный контекст для сервиса `Садху-санга`:
  - Было: `ChannelDetails` всегда показывал общий набор секций канала (CRM кнопка, подсказка, кружки, draft toggle, витрины).
  - Стало: добавлен route-param `source='sadhu_sanga'`; при входе из `SadhuSangaHub` `ChannelDetails` работает в отдельном режиме и скрывает элементы общего канального/коммерческого UX.

### Сниппеты кода

`frontend/screens/portal/PortalMainScreen.tsx`:
```ts
if (screen === 'SadhuSangaHub') {
  navigation.navigate('SadhuSangaHub');
  return;
}
```

`frontend/types/navigation.ts`:
```ts
ChannelDetails: { channelId: number; source?: 'sadhu_sanga' };
```

`frontend/screens/portal/services/channels/SadhuSangaHubScreen.tsx`:
```ts
navigation.navigate('ChannelDetails', { channelId: item.ID, source: 'sadhu_sanga' })
```

`frontend/screens/portal/services/channels/ChannelDetailsScreen.tsx`:
```ts
const isSadhuSangaMode = route.params?.source === 'sadhu_sanga';
```

```tsx
{isModerator && !isSadhuSangaMode ? <TouchableOpacity ... /> : null}
```

## 2026-02-28 (Sadhu Sanga as separate portal service)

### Измененные файлы
- `frontend/screens/portal/services/channels/SadhuSangaHubScreen.tsx`
- `frontend/screens/portal/services/channels/index.ts`
- `frontend/screens/portal/services/index.ts`
- `frontend/types/navigation.ts`
- `frontend/screens/portal/serviceLaunchResolver.ts`
- `frontend/App.tsx`

### Суть правки (от старого к новому)
- Отдельный сервис вместо общего хаба:
  - Было: ярлык `sadhu_sanga` открывал `ChannelsHub`, где смешаны лента и каналы.
  - Стало: добавлен отдельный экран `SadhuSangaHub` и отдельный route `SadhuSangaHub` в stack.
- Каталог проповедников в отдельном сервисе:
  - Добавлен самостоятельный UI `SadhuSangaHubScreen` с:
    - поиском и фильтрами (`city`, `language`, `topic`);
    - списком каналов-проповедников;
    - `follow/unfollow` на карточке;
    - переходом в `ChannelDetails`.
- Запуск из портала:
  - Было: `resolveServiceLaunch('sadhu_sanga') -> ChannelsHub`.
  - Стало: `resolveServiceLaunch('sadhu_sanga') -> SadhuSangaHub`.

### Сниппеты кода

`frontend/screens/portal/serviceLaunchResolver.ts`:
```ts
if (serviceId === 'sadhu_sanga') {
  return { kind: 'navigate', screen: 'SadhuSangaHub' };
}
```

`frontend/types/navigation.ts`:
```ts
SadhuSangaHub: undefined;
```

`frontend/App.tsx`:
```tsx
<Stack.Screen name="SadhuSangaHub" component={SadhuSangaHubScreen} options={{ headerShown: false }} />
```

## 2026-02-28 (Sadhu Sanga: fix ChannelDetails 500 path + suppress dev RedBox)

### Измененные файлы
- `server/internal/services/channel_service.go`
- `frontend/screens/portal/services/channels/ChannelDetailsScreen.tsx`

### Суть правки (от старого к новому)
- Ошибка `500` при открытии канала:
  - Было: при загрузке канала считался `followersCount` и subscriber delivery через SQL-фильтр `role = 'subscriber'`.
  - Проблема: на инстансах со старым enum-типом роли в БД это могло давать SQL-ошибку и `500`.
  - Стало: фильтрация переведена на безопасный вид `role NOT IN ('owner','admin','editor')`, без прямого литерала `subscriber` в SQL-запросе.
- Dev UX на iOS:
  - Было: `ChannelDetailsScreen` логировал ошибку через `console.error(..., error)`, что в RN dev поднимало RedBox.
  - Стало: лог переведен на безопасный `console.warn` с коротким `status/message`, alert для пользователя сохранен.

### Сниппеты кода

`server/internal/services/channel_service.go`:
```go
Where("channel_id IN ? AND role NOT IN ?", channelIDs, []models.ChannelMemberRole{
    models.ChannelMemberRoleOwner,
    models.ChannelMemberRoleAdmin,
    models.ChannelMemberRoleEditor,
})
```

```go
Where("channel_id = ? AND role NOT IN ? AND user_id <> ?", post.ChannelID, []models.ChannelMemberRole{
    models.ChannelMemberRoleOwner,
    models.ChannelMemberRoleAdmin,
    models.ChannelMemberRoleEditor,
}, post.AuthorID)
```

`frontend/screens/portal/services/channels/ChannelDetailsScreen.tsx`:
```ts
const status = error?.response?.status ?? 'n/a';
const message = error?.response?.data?.error || error?.message || 'unknown';
console.warn(`[ChannelDetails] Failed to load channel (status=${status}): ${message}`);
```

## 2026-02-28 (Portal: Sadhu Sanga icon deduplication)

### Измененные файлы
- `frontend/types/portal.ts`
- `frontend/components/portal/PortalIcon.tsx`

### Суть правки (от старого к новому)
- Визуальное дублирование иконок на портале:
  - Было: `sadhu_sanga` использовал `Sparkles`, что визуально дублировало существующий сервис «Союз».
  - Стало: `sadhu_sanga` переведен на отдельную иконку `Flame` (уникальный вид, без совпадения с «Союз»).

### Сниппеты кода

`frontend/types/portal.ts`:
```ts
{ id: 'sadhu_sanga', label: 'Садху-санга', icon: 'Flame', color: '#F59E0B' },
```

`frontend/components/portal/PortalIcon.tsx`:
```ts
import { ..., Flame } from 'lucide-react-native';
const IconComponents = { ..., Flame };
```

## 2026-02-28 (Portal: add Sadhu Sanga icon shortcut)

### Измененные файлы
- `frontend/types/portal.ts`
- `frontend/screens/portal/serviceLaunchResolver.ts`
- `frontend/components/portal/PortalIcon.tsx`

### Суть правки (от старого к новому)
- Ярлык в портале:
  - Было: в списке `DEFAULT_SERVICES` не было `sadhu_sanga`, поэтому иконка «Садху-санга» не отображалась в сетке портала.
  - Стало: добавлен сервис `sadhu_sanga` с label `Садху-санга` и иконкой `Sparkles`.
- Навигация:
  - Было: `resolveServiceLaunch` не знал `sadhu_sanga`, нажатие по такому id не имело маршрута.
  - Стало: `sadhu_sanga` резолвится в `ChannelsHub` (текущий хаб модуля).
- Premium3D fallback:
  - Было: для `sadhu_sanga` не было emoji в `SERVICE_EMOJIS`.
  - Стало: добавлен `🪔` для корректного отображения в emoji-режиме иконок.

### Сниппеты кода

`frontend/types/portal.ts`:
```ts
{ id: 'sadhu_sanga', label: 'Садху-санга', icon: 'Sparkles', color: '#F59E0B' },
```

`frontend/screens/portal/serviceLaunchResolver.ts`:
```ts
if (serviceId === 'sadhu_sanga') {
  return { kind: 'navigate', screen: 'ChannelsHub' };
}
```

`frontend/components/portal/PortalIcon.tsx`:
```ts
'sadhu_sanga': '🪔',
```

## 2026-02-28 (Sadhu Sanga UX: provider bookings calendar action)

### Измененные файлы
- `frontend/screens/portal/services/IncomingBookingsScreen.tsx`

### Суть правки (от старого к новому)
- Входящие записи специалиста:
  - Было: в карточке входящей записи был быстрый доступ в чат, но не было действия добавить событие в календарь.
  - Стало: для будущих (`!past`) входящих бронирований добавлена кнопка календаря (`CalendarPlus`), которая вызывает `exportBookingCalendarIcs(booking.id)` и открывает системный share sheet с ICS payload.

### Сниппеты кода

`frontend/screens/portal/services/IncomingBookingsScreen.tsx`:
```ts
const icsPayload = await exportBookingCalendarIcs(booking.id);
await Share.share({ title: shareTitle, message: icsPayload });
```

```tsx
{!past ? (
  <TouchableOpacity style={styles.calendarButton} onPress={() => void handleAddToCalendar(booking)}>
    <CalendarPlus size={18} color={colors.accent} />
  </TouchableOpacity>
) : null}
```

## 2026-02-28 (Sadhu Sanga UX: follow in ChannelDetails + calendar add from bookings)

### Измененные файлы
- `frontend/screens/portal/services/channels/ChannelDetailsScreen.tsx`
- `frontend/screens/portal/services/MyBookingsScreen.tsx`
- `frontend/screens/portal/services/components/BookingCard.tsx`

### Суть правки (от старого к новому)
- Подписка в деталях канала:
  - Было: на `ChannelDetails` для обычного читателя не было self-service кнопки подписки/отписки; роль `subscriber` отображалась как `Editor`.
  - Стало: добавлена кнопка `Подписаться/Вы подписаны` в хедер с optimistic update и финальной синхронизацией через `GET /channels/:id/follow-status`; `subscriber` отображается отдельным label (`Подписчик`).
- Публичный счетчик:
  - Было: в карточке канала отображался только `@slug`.
  - Стало: рядом показывается `Подписчиков: N` (из `followersCount`).
- Календарь для бронирования:
  - Было: в `MyBookings` не было действия добавления события в календарь.
  - Стало: в `BookingCard` добавлена кнопка календаря (`CalendarPlus`), а в `MyBookings` подключен `exportBookingCalendarIcs(bookingId)` и шаринг ICS payload через системный share sheet.

### Сниппеты кода

`frontend/screens/portal/services/channels/ChannelDetailsScreen.tsx`:
```ts
if (viewerRole === 'editor') {
  return 'Editor';
}
return 'Подписчик';
```

```ts
const followStatus = await channelService.getFollowStatus(channelId);
setChannel(prev => prev ? { ...prev, isFollowing: followStatus.isFollowing, followersCount: followStatus.followersCount } : prev);
```

```tsx
<Text style={styles.channelMetaSecondary}>
  Подписчиков: {Math.max(0, Number(channel?.followersCount) || 0)}
</Text>
```

`frontend/screens/portal/services/MyBookingsScreen.tsx`:
```ts
const icsPayload = await exportBookingCalendarIcs(booking.id);
await Share.share({ title: shareTitle, message: icsPayload });
```

`frontend/screens/portal/services/components/BookingCard.tsx`:
```tsx
{onAddToCalendar && (
  <TouchableOpacity style={styles.calendarAction} onPress={onAddToCalendar}>
    <CalendarPlus size={17} color="rgba(245,158,11,1)" />
    <Text style={styles.calendarActionText}>Календарь</Text>
  </TouchableOpacity>
)}
```

## 2026-02-26 (CreateChannelScreen contrast fix on dark gradient)

### Измененные файлы
- `frontend/screens/portal/services/channels/CreateChannelScreen.tsx`

### Суть правки (от старого к новому)
- Контраст текста на экране создания канала (`Новый канал`) на темном градиенте:
  - Было: заголовки/лейблы/текст кнопки использовали `colors.textPrimary`, что на некоторых role-gradient давало слишком темный текст и низкую читаемость.
  - Стало: добавлен `onGradient` контрастный режим для темных градиентов (`onGradientPrimary/onGradientSecondary`), который принудительно использует светлые оттенки текста поверх темного фона.

### Сниппеты кода

`frontend/screens/portal/services/channels/CreateChannelScreen.tsx`:
```ts
const useLightText =
  gradientToken.includes('0b') ||
  gradientToken.includes('102a43') ||
  gradientToken.includes('1e3a8a') ||
  gradientToken.includes('0f172a');
const onGradientPrimary = useLightText ? '#F8FAFC' : colors.textPrimary;
```

```ts
label: {
  color: onGradientPrimary,
}
```

## 2026-02-26 (ChannelsHub: suppress dev RedBox on network failures)

### Измененные файлы
- `frontend/screens/portal/services/channels/ChannelsHubScreen.tsx`

### Суть правки (от старого к новому)
- Обработка сетевых ошибок загрузки ленты/каналов:
  - Было: использовался `console.error(..., error)` в `catch`, что в RN dev поднимало RedBox (`[ChannelsHub] Failed to load feed: AxiosError: Network Error`).
  - Стало: лог переведен в throttled `console.warn` c коротким сообщением (`status/message`) без передачи объекта ошибки.
- Защита от сетевого шторма при падении feed-запроса:
  - Было: после ошибки первой страницы `feedHasMore` оставался `true`, из-за чего `onEndReached` мог продолжать дергать новые страницы и множить ошибки.
  - Стало: при ошибке загрузки первой страницы выставляется `feedHasMore=false`, что останавливает авто-догрузку до явного refresh.
- Offline DEV профиль:
  - Было: для локального fallback пользователя (`ID=999999`) экран продолжал выполнять серверные запросы.
  - Стало: добавлен ранний выход без сетевых вызовов для `feed` и `my channels`, чтобы не спамить `Network Error` в DEV.

### Сниппеты кода

`frontend/screens/portal/services/channels/ChannelsHubScreen.tsx`:
```ts
if (user?.ID === OFFLINE_DEV_USER_ID) {
  setFeedHasMore(false);
  return;
}
```

```ts
const { message, status } = extractRequestErrorInfo(error);
console.warn(`[ChannelsHub] Failed to load feed (status=${statusTag}, message=${message})`);
```

```ts
if (mountedRef.current && reqId === latestFeedReqRef.current && page === 1) {
  setFeedHasMore(false);
}
```

## 2026-02-26 (iOS push token flow: remove redundant RNFirebase registration warning)

### Измененные файлы
- `frontend/services/notificationService.ts`

### Суть правки (от старого к новому)
- Получение FCM токена на iOS:
  - Было: вызывался `registerDeviceForRemoteMessages()` при каждом запуске, что в текущей конфигурации давало warning RNFirebase (`not required`).
  - Стало: ручная регистрация удалена; используется стандартный auto-registration путь RNFirebase.
- Обработка отсутствия APNS токена:
  - Было: после `getAPNSToken()` код всегда пробовал `getToken()`, и при неготовом/невалидном push-профиле это могло приводить к шумным ошибкам.
  - Стало: при `!apnsToken` добавлен early-skip с telemetry (`token_register_skipped: apns_token_unavailable`) и понятным warning про проверку capabilities/profile.

### Сниппеты кода

`frontend/services/notificationService.ts`:
```ts
const apnsToken = await getAPNSToken(messaging);
if (!apnsToken) {
  console.warn('[NotificationService] APNS token unavailable on iOS; skipping FCM token request. Check push capability/profile if this persists.');
  logPushTelemetry('token_register_skipped', { reason: 'apns_token_unavailable' });
  return null;
}
```

## 2026-02-26 (Offline DEV fallback: suppress iOS network storm logs)

### Измененные файлы
- `frontend/services/authSessionService.ts`
- `frontend/services/websocketService.ts`
- `frontend/services/portalLayoutService.ts`
- `frontend/context/WalletContext.tsx`
- `frontend/context/ChatContext.tsx`
- `frontend/screens/portal/PortalMainScreen.tsx`

### Суть правки (от старого к новому)
- Offline DEV токен (`dev-offline-access-token`):
  - Было: использовался как обычный access token, из-за чего app продолжал пытаться подключать WebSocket и дергать защищенные endpoint'ы.
  - Стало: добавлен явный helper `isOfflineDevAccessToken()` для централизованной детекции локального fallback режима.
- Realtime (WebSocket):
  - Было: при offline DEV профиле запускались циклы reconnect с `kCFErrorDomainCFNetwork error 2`.
  - Стало: при offline DEV токене WebSocket соединение не поднимается и reconnect-цикл не стартует.
- Portal bootstrap sync:
  - Было: `portalLayoutService` продолжал запрашивать blueprint/layout с сервера, даже когда токен локальный и сервер недоступен.
  - Стало: для offline DEV токена auth header не добавляется, сервис сразу уходит в локальный fallback без сетевых вызовов.
- Шумные запросы на старте:
  - Было: `WalletContext`, `ChatContext` (RAG domains) и `PortalMainScreen` (support unread) пытались грузить серверные данные в offline DEV профиле.
  - Стало: для пользователя `ID=999999` эти стартовые запросы пропускаются, чтобы избежать постоянных `AxiosError: Network Error` в dev-консоли.

### Сниппеты кода

`frontend/services/authSessionService.ts`:
```ts
export const DEV_OFFLINE_ACCESS_TOKEN = 'dev-offline-access-token';
export const isOfflineDevAccessToken = (token: string | null | undefined): boolean =>
  !!token && token.trim() === DEV_OFFLINE_ACCESS_TOKEN;
```

`frontend/services/websocketService.ts`:
```ts
if (isOfflineDevAccessToken(token)) {
  console.log('[WebSocket] Offline DEV token detected, skipping realtime connection');
  return;
}
const encodedToken = encodeURIComponent(token);
const url = `${WS_PATH}/ws/${this.userId}?token=${encodedToken}`;
```

`frontend/services/portalLayoutService.ts`:
```ts
if (token && !isOfflineDevAccessToken(token)) {
  headers.Authorization = `Bearer ${token}`;
}
```

`frontend/context/WalletContext.tsx`:
```ts
if (user.ID === 999999) {
  setWallet(null);
  setError(null);
  setLoading(false);
  return;
}
```

## 2026-02-26 (Video Circles CDN policy: fail-fast upload + URL validation)

### Измененные файлы
- `server/internal/services/video_circle_cdn_policy.go`
- `server/internal/services/video_circle_service.go`
- `server/internal/handlers/video_circle_handler.go`
- `server/internal/services/feed_v2_service.go`
- `server/internal/handlers/admin_feed_handler.go`
- `server/internal/services/metrics_service.go`
- `server/.env.example`
- `.env.example`
- `frontend/services/videoCirclesService.ts`
- `frontend/screens/multimedia/VideoCirclesScreen.tsx`
- `docs/feed-v2-yandex-cdn-checklist.md`
- `server/scripts/video_circles_cdn_migration.sql`

### Суть правки (от старого к новому)
- CDN policy для video circles:
  - Было: `video-circles/upload` мог падать в локальный fallback (`/uploads/...`) при недоступном S3.
  - Стало: fail-fast policy — при ошибках S3/CDN upload кружок не создается.
- Валидация URL в `CreateCircle`:
  - Было: принимался любой `mediaUrl`/`thumbnailUrl`.
  - Стало: разрешены только `CDN_BASE_URL` и `S3_PUBLIC_URL` (S3 URL нормализуется в CDN).
- Feed guard для кружков:
  - Было: кружки с non-CDN URL попадали в feed без диагностики.
  - Стало: добавлен warning + метрика `video_circles_non_cdn_detected_total`.
- Диагностика/метрики:
  - Добавлены метрики `video_circles_created_total`, `video_circles_create_rejected_non_cdn_total`, `video_circles_upload_s3_fail_total`, `video_circles_non_cdn_detected_total`.
  - `GET /api/admin/feed/cdn-health` расширен полями `videoCirclesCdnReady` и `videoCirclesUrlPolicy`.
- iOS/RN UX при ошибках публикации:
  - Было: generic publish error.
  - Стало: явные сообщения про недоступность media/CDN сервиса и policy-ошибки URL.

### Сниппеты кода

`server/internal/services/video_circle_cdn_policy.go`:
```go
if hasURLPrefix(value, s3PublicURL) {
    return cdnBaseURL + strings.TrimPrefix(value, s3PublicURL), nil
}
return "", ErrVideoCircleMediaURLNotAllowed
```

`server/internal/handlers/video_circle_handler.go`:
```go
if s3Service == nil {
    _ = services.GetMetricsService().Increment(services.MetricVideoCirclesUploadS3FailTotal, 1)
    return "", errors.New("media service is temporarily unavailable")
}
```

`server/internal/services/video_circle_service.go`:
```go
normalizedMediaURL, err := NormalizeVideoCircleMediaURL(mediaURL)
if err != nil {
    _ = GetMetricsService().Increment(MetricVideoCirclesCreateRejectedNonCDN, 1)
    return nil, err
}
```

`frontend/screens/multimedia/VideoCirclesScreen.tsx`:
```ts
if (normalizedError.includes('media_service_unavailable')) {
  return 'Сервис медиа временно недоступен, попробуйте позже';
}
```

## 2026-02-26 (Seller orders 404 UX + reliable iOS swipe gestures)

### Измененные файлы
- `frontend/services/marketService.ts`
- `frontend/screens/portal/shops/SellerOrdersScreen.tsx`
- `frontend/screens/portal/PortalMainScreen.tsx`
- `frontend/screens/portal/WidgetSelectionScreen.tsx`

### Суть правки (от старого к новому)
- RedBox при `GET /orders/seller` с `404`:
  - Было: `marketService.getSellerOrders` логировал `console.error(..., error)`, что поднимало dev RedBox (`Error fetching seller orders: AxiosError 404`).
  - Стало: лог переведен в безопасный формат (`console.log` в dev / `console.warn` в prod) без передачи объекта ошибки.
- Сообщение пользователю при `404` на экране CRM-заказов:
  - Было: мог отображаться технический текст backend (`Seller shop not found`) или generic fallback.
  - Стало: отдельный человекочитаемый текст про необходимость создать магазин для аккаунта.
- Жесты перехода `Portal ↔ WidgetSelection`:
  - Было: `onTouchStart/onTouchEnd` с ручным расчетом свайпа (на iPhone работало нестабильно, через раз).
  - Стало: переход на `react-native-gesture-handler` (`GestureDetector + Gesture.Pan`) с порогами `activeOffsetX`/`failOffsetY`, что дает более стабильное распознавание горизонтального свайпа.

### Сниппеты кода

`frontend/services/marketService.ts`:
```ts
const logMessage = `[SellerOrders] fetch failed (status=${statusCode}): ${details}`;
if (__DEV__) {
    console.log(logMessage);
} else {
    console.warn(logMessage);
}
```

`frontend/screens/portal/shops/SellerOrdersScreen.tsx`:
```ts
if (statusCode === 404) {
    setOrdersLoadError('CRM-заказы канала доступны только после создания магазина для этого аккаунта.');
}
```

`frontend/screens/portal/PortalMainScreen.tsx`:
```ts
const portalSwipeGesture = Gesture.Pan()

## 2026-02-28 (Sadhu Sanga MVP backend/client integration)

### Измененные файлы
- `server/internal/models/channel.go`
- `server/internal/services/channel_service.go`
- `server/internal/handlers/channel_handler.go`
- `server/cmd/api/main.go`
- `server/internal/services/booking_service.go`
- `server/internal/handlers/booking_handler.go`
- `server/internal/models/support.go`
- `server/internal/handlers/support_handler.go`
- `frontend/types/channel.ts`
- `frontend/services/channelService.ts`
- `frontend/services/bookingService.ts`

### Суть правки (от старого к новому)
- Подписка на проповедника через каналы:
  - Было: роли канала ограничены `owner/admin/editor`, self-service follow API отсутствовал.
  - Стало: добавлена роль `subscriber`, endpoints `POST/DELETE /channels/:id/follow` и `GET /channels/:id/follow-status`, в DTO канала добавлены `followersCount` и `isFollowing`.
- Каталог проповедников (каналов):
  - Было: фильтрация только по `search`.
  - Стало: добавлены фильтры `city`, `language`, `topic` (topic через owner tags).
- Календарь семинаров:
  - Было: отсутствовал экспорт события.
  - Стало: добавлен `GET /api/bookings/:id/calendar.ics` (iCalendar экспорт для iOS/OS calendar).
- Вопросы проповеднику:
  - Было: support ticket без `targetPreacherId` metadata.
  - Стало: в support request добавлен `targetPreacherId`, сохраняется в `support_conversations.meta_json`, автоматически нормализуется `entryPoint=sadhu_sanga_question`.

### Сниппеты кода

`server/internal/models/channel.go`:
```go
const (
    ChannelMemberRoleOwner      ChannelMemberRole = "owner"
    ChannelMemberRoleAdmin      ChannelMemberRole = "admin"
    ChannelMemberRoleEditor     ChannelMemberRole = "editor"
    ChannelMemberRoleSubscriber ChannelMemberRole = "subscriber"
)
```

`server/internal/handlers/channel_handler.go`:
```go
protected.Post("/channels/:id/follow", channelHandler.FollowChannel)
protected.Delete("/channels/:id/follow", channelHandler.UnfollowChannel)
protected.Get("/channels/:id/follow-status", channelHandler.GetFollowStatus)
```

`server/internal/handlers/booking_handler.go`:
```go
// GET /api/bookings/:id/calendar.ics
func (h *BookingHandler) ExportBookingICS(c *fiber.Ctx) error { ... }
```

`server/internal/handlers/support_handler.go`:
```go
type supportCreateTicketRequest struct {
    EntryPoint       string `json:"entryPoint"`
    TargetPreacherID *uint  `json:"targetPreacherId"`
}
```

`frontend/services/channelService.ts`:
```ts
async followChannel(channelId: number) { return (await apiClient.post(`/channels/${channelId}/follow`, {})).data; }
async getFollowStatus(channelId: number) { return (await apiClient.get(`/channels/${channelId}/follow-status`)).data; }
```

## 2026-02-28 (Sadhu Sanga continuation: 10m reminders + support payload)

### Измененные файлы
- `server/internal/models/service_booking.go`
- `server/internal/workers/booking_reminder_worker.go`
- `frontend/services/supportService.ts`

### Суть правки (от старого к новому)
- Режим «Не пропустить» для семинаров:
  - Было: worker отправлял только `24h` и `1h` напоминания.
  - Стало: добавлено `10m` напоминание перед событием (`reminder_10m`) и флаг дедупликации `reminder_10m_sent`.
- Support client payload:
  - Было: тип `CreateSupportTicketPayload` не содержал `targetPreacherId`.
  - Стало: добавлено поле `targetPreacherId`, чтобы iOS/RN мог передавать вопрос конкретному проповеднику.

### Сниппеты кода

`server/internal/workers/booking_reminder_worker.go`:
```go
sendReminders(
    now.Add(8*time.Minute),
    now.Add(10*time.Minute),
    "reminder_10m",
    10,
)
```

`server/internal/models/service_booking.go`:
```go
Reminder10mSent bool `json:"reminder10mSent" gorm:"column:reminder_10m_sent;default:false"`
```

`frontend/services/supportService.ts`:
```ts
export interface CreateSupportTicketPayload {
  entryPoint?: string;
  targetPreacherId?: number;
}
```

## 2026-02-28 (Sadhu Sanga continuation: subscriber push delivery on publish)

### Измененные файлы
- `server/internal/services/channel_service.go`

### Суть правки (от старого к новому)
- Push для подписчиков проповедника:
  - Было: push-доставка поста работала только через personal-delivery для приватных каналов (`deliverPersonally=true`), что не покрывало публичный follow-сценарий.
  - Стало: при публикации поста и при автопубликации scheduled-постов выполняется push-рассылка всем `subscriber` участникам канала (кроме автора) с дедупликацией через `channel_post_deliveries`.

### Сниппеты кода

`server/internal/services/channel_service.go`:
```go
if err := s.deliverPostToSubscribers(post); err != nil {
    log.Printf("[Channels] subscriber delivery failed post=%d: %v", post.ID, err)
}
```

```go
Where("channel_id = ? AND role = ? AND user_id <> ?",
    post.ChannelID,
    models.ChannelMemberRoleSubscriber,
    post.AuthorID,
)
```

## 2026-02-28 (Sadhu Sanga continuation: follow UX in ChannelsHub)

### Измененные файлы
- `frontend/screens/portal/services/channels/ChannelsHubScreen.tsx`

### Суть правки (от старого к новому)
- Лента каналов:
  - Было: пользователь не мог подписаться/отписаться напрямую из карточки поста.
  - Стало: добавлена кнопка `Подписаться/Подписан` в шапке поста (для не-автора) с optimistic update и rollback при ошибке.
- Отображение аудитории:
  - Было: в карточке поста/канала не показывался явный счетчик подписчиков.
  - Стало: добавлен вывод `Подписчиков: N` в посте и в карточке канала.

### Сниппеты кода

`frontend/screens/portal/services/channels/ChannelsHubScreen.tsx`:
```ts
const status = await channelService.getFollowStatus(channelId);
await channelService.followChannel(channelId);
await channelService.unfollowChannel(channelId);
```

```tsx
<TouchableOpacity
  style={[styles.followButton, followState.isFollowing && styles.followButtonActive]}
  onPress={() => void toggleFollow(channelId, followState)}
>
  <Text>{followState.isFollowing ? 'Подписан' : 'Подписаться'}</Text>
</TouchableOpacity>
```
  .runOnJS(true)
  .activeOffsetX([-16, 16])
  .failOffsetY([-32, 32]);
```

`frontend/screens/portal/WidgetSelectionScreen.tsx`:
```ts
const portalBackSwipeGesture = Gesture.Pan()
  .runOnJS(true)
  .activeOffsetX([-16, 16])
  .failOffsetY([-32, 32]);
```

## 2026-02-26 (Portal <-> Widgets swipe pagination + widget menu UX)

### Измененные файлы
- `frontend/screens/portal/PortalMainScreen.tsx`
- `frontend/screens/portal/WidgetSelectionScreen.tsx`
- `frontend/types/navigation.ts`

### Суть правки (от старого к новому)
- Навигация между главной портала и экраном виджетов:
  - Было: переход только по кнопке `LayoutGrid`.
  - Стало: добавлен gesture-flow как в пагинации экранов:
    - на `PortalMainScreen` свайп справа налево открывает `WidgetSelection`,
    - на `WidgetSelectionScreen` свайп слева направо возвращает на портал.
- Индикатор положения (точки пагинации):
  - Было: отсутствовал, пользователь не видел что есть соседний экран.
  - Стало: на обоих экранах добавлены 2 точки и подпись:
    - `Портал · свайп влево для виджетов` (активна 1-я точка),
    - `Виджеты · свайп вправо к порталу` (активна 2-я точка).
- UX меню добавления виджетов:
  - Было: меню в основном открывалось через маленькую иконку/режим редактирования, без явной инструкции.
  - Стало: добавлена отдельная карточка-подсказка с кнопкой `Открыть меню виджетов`; тексты и кнопки получили усиленный контраст в light-теме.
- Типы навигации:
  - Было: `WidgetSelection.source` не поддерживал источник из свайпа.
  - Стало: добавлен `portal_swipe` в union-тип route params.

### Сниппеты кода

`frontend/screens/portal/PortalMainScreen.tsx`:
```ts
if (
  elapsedMs <= SWIPE_MAX_DURATION_MS &&
  dx <= -SWIPE_MIN_DISTANCE_PX &&
  Math.abs(dy) <= SWIPE_MAX_VERTICAL_DELTA_PX
) {
  openWidgetSelection('portal_swipe');
}
```
```tsx
<View style={styles.pageIndicatorDots}>
  <View style={[styles.pageIndicatorDot, { backgroundColor: vTheme.colors.primary }]} />
  <View style={[styles.pageIndicatorDot, { backgroundColor: 'rgba(15,23,42,0.28)' }]} />
</View>
```

`frontend/screens/portal/WidgetSelectionScreen.tsx`:
```ts
if (
  elapsedMs <= SWIPE_MAX_DURATION_MS &&
  dx >= SWIPE_MIN_DISTANCE_PX &&
  Math.abs(dy) <= SWIPE_MAX_VERTICAL_DELTA_PX
) {
  handleBackToPortal();
}
```
```tsx
<Text style={styles.widgetMenuHintTitle}>Как открыть меню виджетов</Text>
<TouchableOpacity onPress={openWidgetMenu}>
  <Text>Открыть меню виджетов</Text>
</TouchableOpacity>
```

`frontend/types/navigation.ts`:
```ts
WidgetSelection: { source?: 'portal_header' | 'portal_swipe' | 'edit_toolbar' | 'widget_dock_return' } | undefined;
```

## 2026-02-26 (Channel CRM orders: recoverable 500 handling)

### Измененные файлы
- `frontend/screens/portal/shops/SellerOrdersScreen.tsx`
- `server/internal/services/order_service.go`
- `server/internal/handlers/order_handler.go`

### Суть правки (от старого к новому)
- Загрузка заказов канала (`SellerOrders`):
  - Было: в обработчике `loadOrders` использовался `console.error('Error loading orders:', error)`, что в DEV поднимало RedBox при HTTP 500.
  - Стало: добавлено управляемое UI-состояние `ordersLoadError` с отображением баннера на экране, а лог переведен в `console.warn` (без аварийного RedBox).
- Поведение при backend ошибках:
  - Было: пользователь видел только системный Console Error.
  - Стало: показывается понятный fallback-текст для CRM канала (`убедитесь, что у аккаунта есть магазин, и попробуйте снова`).
- Контракт API `/orders/seller`:
  - Было: при отсутствии магазина у продавца service возвращал generic error, handler отвечал `500 Could not fetch orders`.
  - Стало: введен sentinel `ErrSellerShopNotFound`, а handler отдает `404 Seller shop not found`.

### Сниппеты кода

`frontend/screens/portal/shops/SellerOrdersScreen.tsx`:
```ts
const [ordersLoadError, setOrdersLoadError] = useState<string | null>(null);
```
```ts
if (statusCode === 500) {
    setOrdersLoadError(fallbackMessage);
} else {
    setOrdersLoadError(serverMessage || fallbackMessage);
}

console.warn('[SellerOrders] Failed to load orders', {
    statusCode,
    sourceFilter,
    channelSourceId,
});
```
```tsx
{ordersLoadError ? (
    <View style={styles.errorBanner}>
        <Text style={styles.errorBannerTitle}>Ошибка загрузки заказов</Text>
        <Text style={styles.errorBannerText}>{ordersLoadError}</Text>
    </View>
) : null}
```
`server/internal/services/order_service.go`:
```go
var (
    ErrSellerShopNotFound = errors.New("seller shop not found")
)
```
```go
if err := database.DB.Where("owner_id = ?", sellerID).First(&shop).Error; err != nil {
    if !errors.Is(err, gorm.ErrRecordNotFound) {
        return nil, err
    }
    return nil, ErrSellerShopNotFound
}
```
`server/internal/handlers/order_handler.go`:
```go
if errors.Is(err, services.ErrSellerShopNotFound) {
    return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
        "error": "Seller shop not found",
    })
}
```

## 2026-02-26 (Portal feed shortcut + channel details contrast fix)

### Измененные файлы
- `frontend/types/portal.ts`
- `frontend/components/portal/PortalIcon.tsx`
- `frontend/screens/portal/serviceLaunchResolver.ts`
- `frontend/services/portalLayoutService.ts`
- `frontend/screens/portal/services/channels/ChannelDetailsScreen.tsx`

### Суть правки (от старого к новому)
- Ярлык сервиса `Лента`:
  - Было: в `DEFAULT_SERVICES` не было `feed`, на портале не отображался отдельный ярлык `Лента`.
  - Стало: добавлен сервис `feed` (`label: Лента`, `icon: PlayCircle`), а launcher для `feed` направлен в `ChannelsHub`.
  - Для существующих layout: добавлена миграция `ensureFeedShortcut` в `portalLayoutService`, которая вставляет `feed` рядом с `channels` на первой странице, если ярлык отсутствует.
- Отрисовка иконки в стиле `vedamatch`:
  - Было: у `feed` не было emoji-мэппинга, использовался fallback `✨`.
  - Стало: добавлен `feed -> 📰`.
- Контраст текста на темном фоне в `ChannelDetailsScreen`:
  - Было: всегда использовался `roleTheme.gradient` (темный), даже при light mode, что делало часть текста малочитаемой.
  - Стало: gradient зависит от режима:
    - dark: `roleTheme.gradient`,
    - light: `colors.background -> colors.surface -> colors.background`.

### Сниппеты кода

`frontend/types/portal.ts`:
```ts
{ id: 'feed', label: 'Лента', icon: 'PlayCircle', color: '#0EA5E9' },
```

`frontend/screens/portal/serviceLaunchResolver.ts`:
```ts
if (serviceId === 'feed') {
    return { kind: 'navigate', screen: 'ChannelsHub' };
}
```

`frontend/services/portalLayoutService.ts`:
```ts
updatedLocal = ensureFeedShortcut(updatedLocal);
// ...
const channelsIndex = firstPage.items.findIndex(
  (item) => item.type === 'service' && item.serviceId === 'channels'
);
```

`frontend/screens/portal/services/channels/ChannelDetailsScreen.tsx`:
```ts
const screenGradient = useMemo<[string, string, string]>(
  () => (isDarkMode
    ? roleTheme.gradient
    : [colors.background, colors.surface, colors.background]),
  [isDarkMode, roleTheme.gradient, colors.background, colors.surface],
);
```

## 2026-02-26 (iOS dev FCM token error: aps-environment handled as recoverable)

### Измененные файлы
- `frontend/services/notificationService.ts`

### Суть правки (от старого к новому)
- Обработка ошибки получения FCM токена на iOS:
  - Было: `console.error('[NotificationService] Failed to get FCM token:', error)` → в DEV поднимался RedBox.
  - Стало: для ошибки отсутствующего `aps-environment` используется recoverable-ветка (`console.warn` + `token_register_skipped`) без блокировки UI.
- Логирование recoverable ошибок в `notificationService`:
  - Было: `console.error` в `getFcmToken`, `handleBackgroundMessage`, `onTokenRefresh`.
  - Стало: `console.warn` с нормализованной строкой ошибки.

### Сниппеты кода

`frontend/services/notificationService.ts`:
```ts
if (isMissingApsEnvironmentEntitlement(error)) {
    console.warn('[NotificationService] FCM token unavailable: missing aps-environment entitlement in current iOS signing profile.');
    logPushTelemetry('token_register_skipped', { reason: 'missing_aps_environment' });
    return null;
}
```
```ts
const details = normalizeErrorMessage(error);
console.warn(`[NotificationService] Failed to get FCM token: ${details}`);
```

## 2026-02-26 (DEV quick login fix: public register role policy)

### Измененные файлы
- `frontend/screens/LoginScreen.tsx`

### Суть правки (от старого к новому)
- Публичная DEV-регистрация:
  - Было: payload отправлял `role = admin` и `identity = Admin`.
  - Стало: payload отправляет `role = user` и `identity = Dev`.
- Причина: backend `POST /register` запрещает назначение admin-роли через публичную регистрацию (`"Admin role cannot be assigned via public registration"`), из-за чего `Быстрый вход (DEV)` падал на первом запуске.

### Сниппеты кода

`frontend/screens/LoginScreen.tsx`:
```ts
role: 'admin'
identity: 'Admin'
```
```ts
role: 'user'
identity: 'Dev'
```

## 2026-02-26 (FirebaseInstallations crash fix on iOS debug launch)

### Измененные файлы
- `frontend/ios/vedamatch/GoogleService-Info.plist`
- `frontend/ios/vedamatch/AppDelegate.mm`

### Суть правки (от старого к новому)
- Firebase options в iOS plist:
  - Было: `API_KEY = REPLACE_WITH_RESTRICTED_FIREBASE_API_KEY` (невалидный формат, падение `I-FIS008000` при `[FIRApp configure]`).
  - Стало: `API_KEY = AIzaSyCFipO88EX0xchqWqBOt3ODNx7YyjZLQHg`.
- Bundle id в iOS plist:
  - Было: `BUNDLE_ID = org.reactjs.native.example.vedamatch`.
  - Стало: `BUNDLE_ID = com.VedaMatch.vedamatch`.
- Защита от падения при невалидной Firebase-конфигурации:
  - Было: безусловный вызов `[FIRApp configure]`.
  - Стало: перед конфигурацией проверяется `API_KEY` (`AIza...`, длина 39); при невалидном ключе Firebase пропускается и приложение не падает.

### Сниппеты кода

`frontend/ios/vedamatch/GoogleService-Info.plist`:
```xml
<key>API_KEY</key>
<string>REPLACE_WITH_RESTRICTED_FIREBASE_API_KEY</string>
```
```xml
<key>API_KEY</key>
<string>AIzaSyCFipO88EX0xchqWqBOt3ODNx7YyjZLQHg</string>
```
```xml
<key>BUNDLE_ID</key>
<string>com.VedaMatch.vedamatch</string>
```

`frontend/ios/vedamatch/AppDelegate.mm`:
```objc
BOOL hasValidApiKey =
    apiKey != nil && [apiKey hasPrefix:@"AIza"] && apiKey.length == 39;

if (!hasValidApiKey) {
  NSLog(@"[Firebase] Skipping configure: invalid or missing API_KEY in GoogleService-Info.plist");
} else if ([FIRApp defaultApp] == nil) {
  [FIRApp configure];
}
```

## 2026-02-26 (iOS debug install fix: User Script Sandboxing)

### Измененные файлы
- `frontend/ios/vedamatch.xcodeproj/project.pbxproj`

### Суть правки (от старого к новому)
- Script sandboxing для app target:
  - Было: `ENABLE_USER_SCRIPT_SANDBOXING = YES` в конфигурациях `Debug` и `Release`.
  - Стало: `ENABLE_USER_SCRIPT_SANDBOXING = NO` в конфигурациях `Debug` и `Release`.
- Причина: при `xcodebuild ... install` падал `Bundle React Native code and images` с ошибкой записи `.../vedamatch.app/ip.txt` (`Operation not permitted`, `INSTALL FAILED`).

### Сниппеты кода

`frontend/ios/vedamatch.xcodeproj/project.pbxproj`:
```pbxproj
- ENABLE_USER_SCRIPT_SANDBOXING = YES;
+ ENABLE_USER_SCRIPT_SANDBOXING = NO;
```

## 2026-02-26 (iOS production version bump + install pipeline correction)

### Измененные файлы
- `frontend/ios/vedamatch.xcodeproj/project.pbxproj`

### Суть правки (от старого к новому)
- Версионирование iOS app target:
  - Было: `MARKETING_VERSION = 1.1.4`, `CURRENT_PROJECT_VERSION = 6`.
  - Стало: `MARKETING_VERSION = 1.1.15`, `CURRENT_PROJECT_VERSION = 7`.
- Операционный вывод для релизной установки:
  - Было: `xcodebuild ... install` трактовался как установка на устройство.
  - Стало: используем это как этап подготовки `.app`; фактическую установку на iPhone выполняем отдельным deploy-шагом (`ios-deploy`/`devicectl`).

### Сниппеты кода

`frontend/ios/vedamatch.xcodeproj/project.pbxproj`:
```pbxproj
CURRENT_PROJECT_VERSION = 7;
MARKETING_VERSION = 1.1.15;
```

## 2026-02-24 (MMKV LogBox noise fix: no component stack in dev)

### Измененные файлы
- `frontend/lib/mmkvStorage.ts`

### Суть правки (от старого к новому)
- Было: fallback/migration сообщения шли через `console.warn`, из-за чего RN LogBox добавлял шумный `Error Component Stack` в dev.
- Стало: добавлен `logStorageMessage()`:
  - в dev используется `console.log` (без LogBox stack),
  - в production используется `console.warn`,
  - сообщения передаются одной строкой без объекта `Error`.

### Сниппеты кода

`frontend/lib/mmkvStorage.ts`:
```ts
const logStorageMessage = (message: string) => {
    if (__DEV__) {
        console.log(message);
        return;
    }
    console.warn(message);
};
```

```ts
const details = firstLine ? ` Detail: ${firstLine}` : '';
const hint = __DEV__ ? ' To enable native MMKV: run `cd ios && pod install`, then rebuild iOS app.' : '';
logStorageMessage(`[MMKV] Native module unavailable, using in-memory fallback.${details}${hint}`);
```

## 2026-02-24 (Seva projects iOS fix: URLSearchParams.set is not implemented)

### Измененные файлы
- `frontend/services/charityService.ts`
- `frontend/screens/seva/SevaHubScreen.tsx`

### Суть правки (от старого к новому)
- `frontend/services/charityService.ts`:
  - Было: сбор query выполнялся через `URLSearchParams` (`set` + `entries`).
  - Стало: добавлен fallback-safe парсинг query в plain object (`parseQueryString`) и передача в axios как `params`.
- `frontend/screens/seva/SevaHubScreen.tsx`:
  - Было: обработанные ошибки загрузки проектов логировались через `console.error`, что в dev поднимало RedBox.
  - Стало: используется `console.warn` для recoverable ошибок (`loadProjects`, `loadData`, `onRefresh`).

### Сниппеты кода

`frontend/services/charityService.ts`:
```ts
const params = parseQueryString(rawQuery);
if (godModeParams.math) {
    params.math = godModeParams.math;
}
const response = await apiClient.get(path, { params, ... });
```

`frontend/screens/seva/SevaHubScreen.tsx`:
```ts
} catch (e) {
    console.warn('Failed to load projects:', e);
    setProjects([]);
    setScreenError('Не удалось загрузить проекты Севы.');
}
```

## 2026-02-24 (Portal PRO Org labels + expanded org filters)

### Измененные файлы
- `frontend/components/portal/god-mode/GodModeFiltersPanel.tsx`
- `frontend/components/portal/god-mode/GodModeStatusBanner.tsx`
- `server/internal/handlers/portal_blueprints.go`
- `frontend/__tests__/screens/portal/PortalMainScreen.test.tsx`
- `docs/portal-blueprints-api.md`

### Суть правки (от старого к новому)
- `frontend/components/portal/god-mode/GodModeFiltersPanel.tsx`:
  - Было: в UI выводились исходные названия, включая `Math/Матх`.
  - Стало: добавлена нормализация отображения `Math/Matha/Матх -> Org./Орг.` для активной орг., чипов и подписи.
- `frontend/components/portal/god-mode/GodModeStatusBanner.tsx`:
  - Было: в title использовалось `activeMath.mathName` без преобразования.
  - Стало: title тоже нормализуется к `Org./Орг.`.
- `server/internal/handlers/portal_blueprints.go`:
  - Было: в default фильтрах были только 4 орг., часть названий с `Math`.
  - Стало: список расширен (добавлены `SCSM`, `Международное Общество Чистой Бхакти-йоги`, `Шри Гопинатх Гаудия`, `Шри Чайтанья Орг.`), названия приведены к `Org./Орг.`.
- `frontend/__tests__/screens/portal/PortalMainScreen.test.tsx`:
  - Было: ожидалось `Gauranga Math`.
  - Стало: ожидание обновлено на `Gauranga Org.`.

### Сниппеты кода

`frontend/components/portal/god-mode/GodModeFiltersPanel.tsx`:
```ts
const normalizeOrgLabel = (value: string) =>
  value
    .replace(/\bMatha\b/gi, 'Org.')
    .replace(/\bMath\b/gi, 'Org.')
    .replace(/Матх/gi, 'Орг.');
```

`frontend/components/portal/god-mode/GodModeStatusBanner.tsx`:
```ts
const activeOrgName = activeMath.mathName
  .replace(/\bMatha\b/gi, 'Org.')
  .replace(/\bMath\b/gi, 'Org.')
  .replace(/Матх/gi, 'Орг.');
```

`server/internal/handlers/portal_blueprints.go`:
```go
{MathID: "gauranga", MathName: "Gauranga Org.", Filters: []string{"prasadam", "family_events", "kirtan"}},
{MathID: "scsm", MathName: "Шри Чайтанья Сарасват Орг. (SCSM)", Filters: []string{"education", "lectures", "satsang"}},
{MathID: "pure-bhakti-yoga", MathName: "Международное Общество Чистой Бхакти-йоги", Filters: []string{"bhakti", "community", "retreats"}},
```

## 2026-02-24 (Multimedia iOS runtime fix: params.entries fallback-safe)

### Измененные файлы
- `frontend/services/multimediaService.ts`
- `frontend/screens/multimedia/MultimediaHubScreen.tsx`

### Суть правки (от старого к новому)
- `frontend/services/multimediaService.ts`:
  - Было: query-params собирались через `URLSearchParams` и `Object.fromEntries(params.entries())`.
  - Стало: query-params собираются plain-object (`params`) без `entries()`, что совместимо с RN iOS/Hermes.
- `frontend/screens/multimedia/MultimediaHubScreen.tsx`:
  - Было: в обработанном `catch` использовался `console.error('Failed to load multimedia data:', error)`, вызывая RedBox в dev.
  - Стало: используется `console.warn(...)`, UI не блокируется при recoverable ошибках.

### Сниппеты кода

`frontend/services/multimediaService.ts`:
```ts
const params: Record<string, string | number | boolean> = {};
if (filter.type) params.type = filter.type;
if (filter.categoryId) params.categoryId = filter.categoryId;
// ...
const response = await apiClient.get('/multimedia/tracks', { params });
```

`frontend/screens/multimedia/MultimediaHubScreen.tsx`:
```ts
} catch (error) {
    console.warn('Failed to load multimedia data:', error);
}
```

## 2026-02-24 (MMKV dev warning cleanup: Nitro fallback без длинного stack trace)

### Измененные файлы
- `frontend/lib/mmkvStorage.ts`

### Суть правки (от старого к новому)
- MMKV fallback логирование:
  - Было: `console.warn(..., error)` в `catch`, из-за чего в iOS dev печатался длинный stack trace NitroModules.
  - Стало: компактный одноразовый лог (`console.warn`) без передачи объекта ошибки:
    - краткое сообщение о fallback;
    - первая строка ошибки;
    - подсказка `cd ios && pod install` + rebuild.

### Сниппеты кода

`frontend/lib/mmkvStorage.ts`:
```ts
let hasLoggedMMKVFallback = false;

const logMMKVFallback = (error: unknown) => {
    if (hasLoggedMMKVFallback) return;
    hasLoggedMMKVFallback = true;

    console.warn('[MMKV] Native module unavailable, using in-memory fallback.');
    // ...
};
```

```ts
try {
    return createMMKV({ id: 'vedamatch-main' });
} catch (error) {
    logMMKVFallback(error);
    return createMemoryStorage();
}
```

## 2026-02-24 (EditProfile: безопасный парсинг /contacts + без RedBox на recoverable ошибках)

### Измененные файлы
- `frontend/screens/settings/EditProfileScreen.tsx`

### Суть правки (от старого к новому)
- Загрузка профиля (`/contacts`):
  - Было: код ожидал строго массив и вызывал `response.data.find(...)`.
  - Стало: добавлен безопасный разбор двух форматов ответа — массив и paginated-объект `{ items: [...] }`.
- Логирование обработанных ошибок в `EditProfile`:
  - Было: `console.error(...)` в `loadProfile/save/searchCities` вызывал RN RedBox в dev.
  - Стало: `console.warn(...)` для recoverable ошибок, экран не блокируется RedBox.

### Сниппеты кода

`frontend/screens/settings/EditProfileScreen.tsx`:
```ts
const response = await apiClient.get<any[] | { items?: any[] }>('/contacts');
const contacts = Array.isArray(response.data)
    ? response.data
    : (Array.isArray(response.data?.items) ? response.data.items : []);
const userData = contacts.find((u: any) => u.ID === user.ID);
```

```ts
console.warn('[EditProfile] Error loading profile:', error);
console.warn('[EditProfile] Error saving:', error);
console.warn('[EditProfile] City search error:', error);
```

## 2026-02-24 (Dev RedBox Fix: Auth Expired Fallback без console.error)

### Измененные файлы
- `frontend/services/websocketService.ts`
- `frontend/context/WebSocketContext.tsx`
- `frontend/context/UserContext.tsx`

### Суть правки (от старого к новому)
- `frontend/services/websocketService.ts`:
  - Было: при `401/unauthorized` в WebSocket `onerror` использовался `console.error`, что в RN dev вызывало RedBox.
  - Стало: используется `console.warn`, auth recovery (`handleAuthFailure`) продолжает выполняться без блокирующего RedBox.
- `frontend/context/WebSocketContext.tsx`:
  - Было: при провале `refreshAuthTokens()` в WS recovery использовался `console.error`.
  - Стало: используется `console.warn`, после чего выполняется `logout()`.
- `frontend/context/UserContext.tsx`:
  - Было: при `401` на heartbeat и неуспешном refresh использовался `console.error`.
  - Стало: используется `console.warn`, после чего выполняется `logout()`.

### Сниппеты кода

`frontend/services/websocketService.ts`:
```ts
if (normalized.includes('401') || normalized.includes('unauthorized')) {
    console.warn('[WebSocket] AUTH_FAILURE: Token expired or invalid');
    void this.handleAuthFailure('ws_error_auth');
}
```

`frontend/context/WebSocketContext.tsx`:
```ts
console.warn('[WebSocketContext] Auth refresh failed, logging out...');
await logoutRef.current();
```

`frontend/context/UserContext.tsx`:
```ts
console.warn('[UserContext] Heartbeat auth refresh failed, logging out');
await logout();
```

## 2026-02-24 (Portal/Widgets Sync: AI Navigation, Back-to-Widgets, Shared Background, Circular LKM)

### Измененные файлы
- `frontend/screens/portal/serviceLaunchResolver.ts`
- `frontend/types/navigation.ts`
- `frontend/types/portal.ts`
- `frontend/services/portalLayoutService.ts`
- `frontend/context/PortalLayoutContext.tsx`
- `frontend/components/portal/PortalIcon.tsx`
- `frontend/components/portal/PortalFolder.tsx`
- `frontend/components/portal/PortalBackgroundLayer.tsx`
- `frontend/components/wallet/PortalLkmCircleButton.tsx`
- `frontend/screens/portal/PortalMainScreen.tsx`
- `frontend/screens/portal/WidgetSelectionScreen.tsx`
- `frontend/components/portal/widgets/WidgetCanvasGrid.tsx`
- `frontend/components/portal/widgets/WidgetPickerSheet.tsx`
- `frontend/__tests__/screens/portal/serviceLaunchResolver.test.ts`
- `frontend/__tests__/screens/portal/PortalMainScreen.test.tsx`
- `frontend/__tests__/screens/portal/WidgetSelectionScreen.test.tsx`
- `frontend/__tests__/screens/portal/WidgetCanvasGrid.test.tsx`

### Суть правки (от старого к новому)
- `services` navigation:
  - Было: `services` открывал `ServicesHome`.
  - Стало: `services` всегда открывает AI-чат (`handleNewChat()` + `navigate('Chat')`).
- Сервисный каталог:
  - Было: отдельного ярлыка каталога не было.
  - Стало: добавлен `services_catalog` (иконка `Briefcase`, label `Сервисы`), а `services` оставлен как AI-ярлык.
- Widget dock -> Portal back:
  - Было: из `WidgetSelection` использовался `navigate('Portal', { initialTab })`, из-за чего back часто возвращал в портал.
  - Стало: используется `push('Portal', { returnToWidget: true, origin: 'widget_dock', originServiceId })`; в `PortalMainScreen` единый `backFromActiveService()` возвращает назад в `WidgetSelection`.
- Фон Portal/Widgets:
  - Было: `WidgetSelection` рендерил фон отдельной упрощенной логикой.
  - Стало: `PortalMainScreen` и `WidgetSelectionScreen` используют общий `PortalBackgroundLayer` (image/gradient/color + slideshow/crossfade/fallback).
- LKM в хедерах:
  - Было: в Portal использовался `BalancePill`, в Widgets — локальная реализация.
  - Стало: общий круглый `PortalLkmCircleButton` в обоих экранах.
- Widget canvas long-press/DnD:
  - Было: long-press зона ограничивалась малой областью (`minHeight: 240`).
  - Стало: зона растянута на весь рабочий canvas (динамический `minHeight`), drag-start стабильно включает edit-mode.

### Сниппеты кода

`frontend/screens/portal/serviceLaunchResolver.ts`:
```ts
if (serviceId === 'services') {
  return { kind: 'assistant_chat' };
}
if (serviceId === 'services_catalog') {
  return { kind: 'open_portal_tab', tab: 'services' };
}
```

`frontend/screens/portal/WidgetSelectionScreen.tsx`:
```tsx
if (launch.kind === 'open_portal_tab') {
  navigation.push('Portal', {
    initialTab: launch.tab,
    returnToWidget: true,
    origin: 'widget_dock',
    originServiceId: serviceId,
  });
}
```

`frontend/screens/portal/PortalMainScreen.tsx`:
```tsx
const backFromActiveService = useCallback(() => {
  if (route.params?.returnToWidget) {
    if (navigation.canGoBack()) navigation.goBack();
    else navigation.navigate('WidgetSelection', { source: 'widget_dock_return' });
    return;
  }
  setActiveTab(null);
}, [navigation, route.params?.returnToWidget]);
```

`frontend/components/portal/PortalBackgroundLayer.tsx`:
```tsx
export const PortalBackgroundLayer: React.FC<PortalBackgroundLayerProps> = ({ ... }) => {
  // единый image/gradient/color + slideshow/crossfade + fallback
};
```

`frontend/components/wallet/PortalLkmCircleButton.tsx`:
```tsx
<PortalLkmCircleButton
  onPress={() => navigation.navigate('Wallet')}
  size={38}
  backgroundColor="rgba(255, 255, 255, 0.25)"
  borderColor="rgba(255, 255, 255, 0.4)"
  textColor={accentIconColor}
/>
```

### Валидация
- TypeScript: `npx tsc --noEmit -p tsconfig.json` — успешно.
- Тесты: `npm test -- --watchman=false --runInBand --runTestsByPath ...` — успешно (4 suite / 11 test).

## 2026-02-24 (Release Version Bump + Production Builds Android/iOS)

### Измененные файлы
- `frontend/android/app/build.gradle`
- `frontend/ios/vedamatch.xcodeproj/project.pbxproj`

### Суть правки (от старого к новому)
- `frontend/android/app/build.gradle`:
  - Было: `versionCode 15`, `versionName "1.1.13"`.
  - Стало: `versionCode 16`, `versionName "1.1.14"`.
- `frontend/ios/vedamatch.xcodeproj/project.pbxproj`:
  - Было: `CURRENT_PROJECT_VERSION = 4;`, `MARKETING_VERSION = 1.1.2;`
  - Стало: `CURRENT_PROJECT_VERSION = 5;`, `MARKETING_VERSION = 1.1.3;`

### Сниппеты кода

`frontend/android/app/build.gradle`:
```gradle
versionCode 16
versionName "1.1.14"
```

`frontend/ios/vedamatch.xcodeproj/project.pbxproj`:
```pbxproj
CURRENT_PROJECT_VERSION = 5;
MARKETING_VERSION = 1.1.3;
```

### Статус сборки
- Android production: `./gradlew assembleRelease` — успешно.
- iOS Release (iphoneos): `xcodebuild -workspace vedamatch.xcworkspace -scheme vedamatch -configuration Release -sdk iphoneos build` — успешно.

## 2026-02-24 (Widget Screen: Portal Dock + Stable Drag + Circular LKM)

### Измененные файлы
- `frontend/screens/portal/WidgetSelectionScreen.tsx`
- `frontend/components/portal/widgets/WidgetCanvasGrid.tsx`
- `frontend/components/portal/widgets/WidgetPickerSheet.tsx`

### Суть правки (от старого к новому)
- `frontend/screens/portal/WidgetSelectionScreen.tsx`:
  - Было: внизу был только edit-toolbar; не было портального dock на 3 сервиса; в хедере использовался `BalancePill` другого размера.
  - Стало: добавлен нижний dock в стиле главного портала с теми же 3 сервисами из `layout.quickAccess`; `LKM` заменен на круглую кнопку размера header-иконки с компактным значением.
- `frontend/components/portal/widgets/WidgetCanvasGrid.tsx`:
  - Было: `onDragStart` принудительно включал `editMode`, что могло срывать drag из-за ререндера в момент удержания.
  - Стало: drag-start больше не переключает `editMode`; как в портале, long-press по фону включает edit-mode, tap по фону выключает.
- `frontend/components/portal/widgets/WidgetPickerSheet.tsx`:
  - Было: список мог ощущаться "нелистаемым" в части конфигураций.
  - Стало: зафиксирован явный scroll-контейнер (`listScroll` + `flexGrow`) для стабильного листания каталога.

### Сниппеты кода

`frontend/screens/portal/WidgetSelectionScreen.tsx`:
```tsx
const quickAccessServices = useMemo(() => {
  const quickItems = [...(layout.quickAccess || [])].sort((a, b) => a.position - b.position).slice(0, 3);
  return quickItems
    .map((item) => DEFAULT_SERVICES.find((service) => service.id === item.serviceId))
    .filter((service): service is NonNullable<typeof service> => Boolean(service));
}, [layout.quickAccess]);
...
<View style={styles.quickAccessDock}>
  <View style={styles.quickAccessInner}>
    {quickAccessServices.map((service) => (
      <PortalIcon key={service.id} service={service} showLabel={false} ... />
    ))}
  </View>
</View>
```

`frontend/components/portal/widgets/WidgetCanvasGrid.tsx`:
```tsx
const handleDragStart = useCallback(() => {
  setIsDraggingItem(true);
  dnd.onDragStart();
}, [dnd]);

const handleCanvasPress = useCallback(() => {
  if (isEditMode && !dnd.isDragging && !isDraggingItem) {
    onSetEditMode(false);
  }
}, [dnd.isDragging, isDraggingItem, isEditMode, onSetEditMode]);
```

`frontend/components/portal/widgets/WidgetPickerSheet.tsx`:
```tsx
<ScrollView
  style={styles.listScroll}
  contentContainerStyle={styles.list}
  nestedScrollEnabled
  bounces
/>
```

## 2026-02-24 (Android Widget Screen White/Black Surface Fix)

### Измененные файлы
- `frontend/App.tsx`
- `frontend/screens/portal/PortalMainScreen.tsx`
- `frontend/components/portal/PortalGrid.tsx`
- `frontend/screens/portal/WidgetSelectionScreen.tsx`

### Суть правки (от старого к новому)
- `frontend/App.tsx`:
  - Было: `WidgetSelection` использовал глобальные `native-stack` настройки Android (`animation: fade`, `freezeOnBlur: true`).
  - Стало: для `WidgetSelection` задано `animation: none`, `freezeOnBlur: false`, явный `contentStyle`.
- `frontend/screens/portal/PortalMainScreen.tsx` + `frontend/components/portal/PortalGrid.tsx`:
  - Было: прямой `navigate('WidgetSelection')` без защиты от повторных быстрых нажатий.
  - Стало: добавлен navigation-lock (таймер + `requestAnimationFrame`) по аналогии с анти-race паттерном из звонков/чата.
- `frontend/screens/portal/WidgetSelectionScreen.tsx`:
  - Было: `BlurView` в header/toolbar рендерился без Android performance-policy.
  - Стало: blur включается только при `androidVisualPolicy.enableBlur` и не используется в reduced Android performance mode.

### Сниппеты кода

`frontend/App.tsx`:
```tsx
<Stack.Screen
  name="WidgetSelection"
  component={WidgetSelectionScreen}
  options={{
    animation: Platform.OS === 'android' ? 'none' : 'slide_from_right',
    freezeOnBlur: false,
    contentStyle: { backgroundColor: Platform.OS === 'android' ? (theme.background || '#000000') : 'transparent' },
  }}
/>
```

`frontend/screens/portal/PortalMainScreen.tsx`:
```tsx
const openWidgetSelection = useCallback(() => {
  if (widgetNavLockRef.current) return;
  widgetNavLockRef.current = true;
  requestAnimationFrame(() => navigation.navigate('WidgetSelection', { source: 'portal_header' }));
  widgetNavUnlockTimerRef.current = setTimeout(() => releaseWidgetNavigationLock(), 450);
}, [navigation, releaseWidgetNavigationLock]);
```

`frontend/components/portal/PortalGrid.tsx`:
```tsx
const openWidgetSelection = useCallback(() => {
  if (widgetNavLockRef.current) return;
  widgetNavLockRef.current = true;
  onCloseDrawer?.();
  requestAnimationFrame(() => navigation.navigate('WidgetSelection', { source: 'edit_toolbar' }));
  widgetNavUnlockTimerRef.current = setTimeout(() => releaseWidgetNavigationLock(), 450);
}, [navigation, onCloseDrawer, releaseWidgetNavigationLock]);
```

`frontend/screens/portal/WidgetSelectionScreen.tsx`:
```tsx
const allowWidgetBlur = androidVisualPolicy.enableBlur
  && !(Platform.OS === 'android' && effectivePerformanceMode !== 'high_quality');

{portalIconStyle !== 'vedamatch' && allowWidgetBlur && (
  <BlurView ... />
)}
```

## 2026-02-24 (Widget Selection UX Fixes + Label Rename Matkh -> Org)

### Измененные файлы
- `frontend/components/portal/widgets/WidgetCanvasGrid.tsx`
- `frontend/components/portal/hooks/useGridReorderDnd.ts`
- `frontend/components/portal/widgets/WidgetPickerSheet.tsx`
- `frontend/screens/portal/WidgetSelectionScreen.tsx`
- `frontend/i18n/locales/ru.ts`
- `frontend/components/portal/PortalGrid.tsx`
- `frontend/__tests__/screens/multimedia/VideoCirclesScreen.test.tsx`

### Суть правки (от старого к новому)
- `frontend/components/portal/widgets/WidgetCanvasGrid.tsx`:
  - Было: drag мог конфликтовать с общим tap-обработчиком холста; во время drag не блокировался ScrollView.
  - Стало: убран конфликт tap/drag, добавлен локальный drag-state, `scrollEnabled` отключается только на время перетаскивания.
- `frontend/components/portal/hooks/useGridReorderDnd.ts`:
  - Было: reorder происходил только при точном попадании в целевой элемент.
  - Стало: добавлен fallback на ближайший элемент, при этом отпускание на исходном элементе не вызывает reorder.
- `frontend/components/portal/widgets/WidgetPickerSheet.tsx`:
  - Было: вложенный backdrop `Pressable` перехватывал жесты и мешал скроллу списка.
  - Стало: backdrop вынесен в отдельный слой (`absoluteFill`), список листается стабильно; sheet не закрывается после каждого добавления.
- `frontend/screens/portal/WidgetSelectionScreen.tsx`:
  - Было: нижний toolbar с 2 кнопками.
  - Стало: toolbar из 3 кнопок в портальном формате (`Портал`, `Виджет`, `Готово/Редакт.`).
- `frontend/i18n/locales/ru.ts` + `frontend/components/portal/PortalGrid.tsx`:
  - Было: UI-формулировки и бейджи использовали `Матх/Math`.
  - Стало: UI-подписи переведены на `Орг/Орг:`.

### Сниппеты кода

`frontend/components/portal/widgets/WidgetCanvasGrid.tsx`:
```tsx
const [isDraggingItem, setIsDraggingItem] = useState(false);
...
<ScrollView scrollEnabled={!dnd.isDragging} ...>
...
onDragStart={() => { setIsDraggingItem(true); onSetEditMode(true); dnd.onDragStart(); }}
onDragEnd={(id, x, y) => { setIsDraggingItem(false); dnd.onDragEnd(id, x, y); }}
```

`frontend/components/portal/hooks/useGridReorderDnd.ts`:
```ts
const resolvedTargetId = targetId || closestTarget?.id || null;
if (!resolvedTargetId || resolvedTargetId === itemId) return;
...
const distance = Math.hypot(absX - centerX, absY - centerY);
if (!closestTarget || distance < closestTarget.distance) {
  closestTarget = { id: item.id, distance };
}
```

`frontend/components/portal/widgets/WidgetPickerSheet.tsx`:
```tsx
<View style={styles.backdrop}>
  <Pressable style={styles.backdropTapArea} onPress={onClose} />
  <View style={styles.sheet}>
    <ScrollView nestedScrollEnabled keyboardShouldPersistTaps="handled" ...>
```

`frontend/screens/portal/WidgetSelectionScreen.tsx`:
```tsx
<TouchableOpacity ...><ChevronLeft ... /><Text>Портал</Text></TouchableOpacity>
<TouchableOpacity ...><LayoutGrid ... /><Text>Виджет</Text></TouchableOpacity>
<TouchableOpacity ...><Pencil ... /><Text>{isEditMode ? 'Готово' : 'Редакт.'}</Text></TouchableOpacity>
```

## 2026-02-24 (Portal Widget Canvas Redesign + Shared DnD)

### Измененные файлы
- `frontend/types/portal.ts`
- `frontend/context/PortalLayoutContext.tsx`
- `frontend/context/widgetCanvasLayout.ts`
- `frontend/components/portal/hooks/useGridReorderDnd.ts`
- `frontend/components/portal/widgets/widgetCatalog.tsx`
- `frontend/components/portal/widgets/renderPortalWidget.tsx`
- `frontend/components/portal/widgets/WidgetCanvasGrid.tsx`
- `frontend/components/portal/widgets/WidgetPickerSheet.tsx`
- `frontend/screens/portal/WidgetSelectionScreen.tsx`
- `frontend/components/portal/PortalGrid.tsx`
- `frontend/context/__tests__/portalLayout.widgetCanvas.test.ts`

### Суть правки (от старого к новому)
- `frontend/types/portal.ts`:
  - Было: виджеты хранились только внутри `pages[].widgets`.
  - Стало: добавлен top-level `widgetCanvas: { widgets, lastModified }` для независимого холста виджетов.
- `frontend/context/PortalLayoutContext.tsx` + `frontend/context/widgetCanvasLayout.ts`:
  - Было: `addWidget/removeWidget/reorderWidgets` работали с `pages[currentPage].widgets`, без результата добавления и с разрозненной логикой.
  - Стало: операции переведены на `layout.widgetCanvas.widgets`, `addWidget` возвращает `{ ok, reason?: 'duplicate' }`, миграция legacy и дедупликация централизованы.
- `frontend/components/portal/widgets/*` + `frontend/screens/portal/WidgetSelectionScreen.tsx`:
  - Было: экран виджетов содержал дубли рендера и управления.
  - Стало: compose-подход с shared-каталогом (`widgetCatalog`), shared renderer (`renderPortalWidget`), отдельным холстом (`WidgetCanvasGrid`) и picker sheet (`WidgetPickerSheet`).
- `frontend/components/portal/PortalGrid.tsx`:
  - Было: локальная дублирующаяся DnD-коллизия в компоненте.
  - Стало: точечное подключение shared `useGridReorderDnd` для сеточной перестановки при сохранении логики дока/папок.

### Сниппеты кода

`frontend/types/portal.ts`:
```ts
export interface WidgetCanvas {
    widgets: PortalWidget[];
    lastModified: number;
}

export interface PortalLayout {
    pages: PortalPage[];
    widgetCanvas: WidgetCanvas;
    quickAccess: PortalItem[];
    ...
}
```

`frontend/context/PortalLayoutContext.tsx`:
```ts
export type AddWidgetResult = { ok: true } | { ok: false; reason: 'duplicate' };

const addWidgetAction = useCallback((widget) => {
  const currentWidgets = layout.widgetCanvas?.widgets || [];
  const { widgets: nextWidgets, result } = addWidgetToCanvas(currentWidgets, widget);
  if (!result.ok) return result;
  updateLayout({
    ...layout,
    widgetCanvas: { widgets: nextWidgets, lastModified: Date.now() },
  });
  return result;
}, [layout, updateLayout]);
```

`frontend/components/portal/PortalGrid.tsx`:
```ts
const gridDnd = useGridReorderDnd({
  items: page?.items ?? [],
  onReorder: reorderGridItems,
  onDropOnItem: handleDropOnGridItem,
});
```

## 2026-02-24 (Portal: Assistant Shortcut Moved to Services + Dock Default)

### Измененные файлы
- `frontend/screens/portal/PortalMainScreen.tsx`
- `frontend/types/portal.ts`
- `frontend/components/portal/PortalIcon.tsx`
- `frontend/components/portal/PortalFolder.tsx`
- `frontend/services/portalLayoutService.ts`
- `frontend/constants/portalRoles.ts`

### Суть правки (от старого к новому)
- `frontend/screens/portal/PortalMainScreen.tsx`:
  - Было: в хедере портала отображалась отдельная иконка ассистента (центральная кнопка).
  - Стало: центральная кнопка ассистента удалена из хедера.
- `frontend/types/portal.ts`:
  - Было: сервис `services` имел иконку `Briefcase`; дефолт quick access: `calls/history/rooms`.
  - Стало: сервис `services` переведен на иконку `Bot`; дефолт quick access: `calls/services/rooms`.
- `frontend/components/portal/PortalIcon.tsx` и `frontend/components/portal/PortalFolder.tsx`:
  - Было: иконка `Bot` не поддерживалась в наборе иконок портала/превью папок.
  - Стало: добавлена поддержка `Bot`, чтобы ярлык `services` отображался как ассистент.
- `frontend/services/portalLayoutService.ts`:
  - Было: quick access нормализовался вокруг старого набора, без гарантии `services`.
  - Стало: добавлена нормализация quick access с обязательным `services` (замена `history` или вставка в слот дока).
- `frontend/constants/portalRoles.ts`:
  - Было: fallback `quickAccess` для ролей `calls/history/rooms`.
  - Стало: fallback `quickAccess` для ролей `calls/services/rooms`.

### Сниппеты кода

`frontend/types/portal.ts`:
```ts
export const DEFAULT_QUICK_ACCESS_SERVICE_IDS = ['calls', 'services', 'rooms'] as const;
...
{ id: 'services', label: 'Услуги', icon: 'Bot', color: '#6366F1' },
```

`frontend/services/portalLayoutService.ts`:
```ts
if (!uniqueKnownIds.includes('services')) {
  const historyIndex = uniqueKnownIds.indexOf('history');
  if (historyIndex >= 0) uniqueKnownIds[historyIndex] = 'services';
  else if (uniqueKnownIds.length < 3) uniqueKnownIds.splice(Math.min(1, uniqueKnownIds.length), 0, 'services');
  else uniqueKnownIds[1] = 'services';
}
```

`frontend/constants/portalRoles.ts`:
```ts
quickAccess: ['calls', 'services', 'rooms'],
```

## 2026-02-24

### Измененные файлы
- `frontend/services/webRTCService.ts`
- `server/internal/handlers/turn_handler.go`

### Суть правки (от старого к новому)
- `frontend/services/webRTCService.ts`:
  - Было: при ошибке `/turn-credentials` добавлялся fallback TURN-сервер с hardcoded `username/credential`.
  - Стало: fallback переведен в STUN-only без захардкоженных секретов.
- `server/internal/handlers/turn_handler.go`:
  - Было: при пустых env использовались hardcoded `TURN_SECRET` и публичный IP fallback.
  - Стало: если нет `TURN_SECRET` или `TURN_EXTERNAL_IP/TURN_HOST`, API возвращает только STUN; TURN добавляется только при валидной env-конфигурации.

### Сниппеты кода

`frontend/services/webRTCService.ts` (fallback конфиг):
```ts
configuration = {
  iceServers: [
    { urls: 'stun:stun.sipnet.ru:3478' },
    { urls: 'stun:stun.chathelp.ru:3478' },
    { urls: 'stun:stun.comtube.ru:3478' },
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:global.stun.twilio.com:3478' },
  ]
};
```

`server/internal/handlers/turn_handler.go` (условное добавление TURN):
```go
turnHost := strings.TrimSpace(os.Getenv("TURN_EXTERNAL_IP"))
if turnHost == "" {
	turnHost = strings.TrimSpace(os.Getenv("TURN_HOST"))
}
if turnHost == "" || h.secret == "" {
	return c.JSON(response)
}

response.IceServers = append(response.IceServers, IceServer{
	Urls:       fmt.Sprintf("turn:%s:%s", turnHost, "3478"),
	Username:   username,
	Credential: password,
})
```

## 2026-02-24 (Contacts Pagination Default)

### Измененные файлы
- `server/internal/config/feature_flags.go`
- `server/internal/config/feature_flags_test.go`

### Суть правки (от старого к новому)
- `server/internal/config/feature_flags.go`:
  - Было: `FF_CONTACTS_LEGACY_MODE` по умолчанию `true`, что позволяло `/contacts` без query возвращать полный список.
  - Стало: `FF_CONTACTS_LEGACY_MODE` по умолчанию `false`; `/contacts` по умолчанию остается в paginated-v2 режиме.
- `server/internal/config/feature_flags_test.go`:
  - Добавлены тесты на default и explicit override для `FF_CONTACTS_LEGACY_MODE`.

### Сниппеты кода

`server/internal/config/feature_flags.go`:
```go
func ContactsLegacyModeEnabled() bool {
	return FlagEnabled("FF_CONTACTS_LEGACY_MODE", false)
}
```

`server/internal/config/feature_flags_test.go`:
```go
func TestContactsLegacyModeEnabled_DefaultFalse(t *testing.T) {
	t.Setenv("FF_CONTACTS_LEGACY_MODE", "")
	if ContactsLegacyModeEnabled() {
		t.Fatalf("expected FF_CONTACTS_LEGACY_MODE default to false")
	}
}
```

## 2026-02-24 (Mobile Version Bump)

### Измененные файлы
- `frontend/android/app/build.gradle`
- `frontend/ios/vedamatch.xcodeproj/project.pbxproj`

### Суть правки (от старого к новому)
- Android (`frontend/android/app/build.gradle`):
  - `versionCode`: `12` -> `13`
  - `versionName`: `1.1.10` -> `1.1.11`
- iOS (`frontend/ios/vedamatch.xcodeproj/project.pbxproj`):
  - `MARKETING_VERSION`: `1.1.0` -> `1.1.1`
  - `CURRENT_PROJECT_VERSION`: `2` -> `3`

### Сниппеты кода

`frontend/android/app/build.gradle`:
```gradle
versionCode 13
versionName "1.1.11"
```

`frontend/ios/vedamatch.xcodeproj/project.pbxproj`:
```pbxproj
CURRENT_PROJECT_VERSION = 3;
MARKETING_VERSION = 1.1.1;
```

## 2026-02-24 (Chat Self-Message Visibility Fix)

### Измененные файлы
- `frontend/context/ChatContext.tsx`

### Суть правки (от старого к новому)
- Было: P2P-текст после `POST /messages` не добавлялся локально, UI полностью зависел от WebSocket-эхо.
- Стало: после успешного ответа API сообщение сразу добавляется в локальный state с дедупликацией по `id`, поэтому отправитель видит своё сообщение даже при задержке/отсутствии WS-эхо.

### Сниппеты кода

`frontend/context/ChatContext.tsx`:
```ts
const savedMsg = await messageService.sendMessage(currentUser.ID, recipientId, text);

const localMessage: Message = {
  id: savedMsg.id?.toString() || savedMsg.ID?.toString() || `local_${Date.now()}`,
  text: savedMsg.content || text,
  sender: 'user',
  type: savedMsg.type || 'text',
  content: savedMsg.content || text,
  createdAt: savedMsg.createdAt || savedMsg.CreatedAt || new Date().toISOString(),
};

setMessages(prev => {
  if (prev.some(m => m.id === localMessage.id)) {
    return prev;
  }
  return [...prev, localMessage];
});
```

## 2026-02-24 (Call Connection Reliability Fixes)

### Измененные файлы
- `frontend/App.tsx`
- `frontend/screens/calls/CallScreen.tsx`
- `frontend/types/navigation.ts`
- `server/internal/handlers/turn_handler.go`

### Суть правки (от старого к новому)
- `frontend/App.tsx`:
  - Было: `answerCall` только открывал `CallScreen` без `targetId` и без авто-accept логики.
  - Стало: добавлен `incomingCallRef`; при `answerCall` передаются `targetId/callerName` и `autoAccept=true`, при `endCall` вызывается `webRTCService.sendHangup()`.
- `frontend/screens/calls/CallScreen.tsx`:
  - Было: входящий звонок принимался только вручную через кнопку.
  - Стало: добавлен авто-accept flow для сценария `autoAccept=true` (CallKeep accept).
- `frontend/types/navigation.ts`:
  - Добавлен новый optional param для `CallScreen`: `autoAccept?: boolean`.
- `server/internal/handlers/turn_handler.go`:
  - Было: выдача TURN только через HMAC (`TURN_SECRET`).
  - Стало: поддержка двух схем в ICE ответе — static (`TURN_USER/TURN_PASSWORD`) и HMAC (`TURN_SECRET`) при наличии соответствующих env, что уменьшает риск mismatch с coturn-конфигом.

### Сниппеты кода

`frontend/App.tsx`:
```ts
navigationRef.navigate('CallScreen', {
  isIncoming: true,
  callUUID,
  autoAccept: true,
  targetId: isMatchedCall ? incoming.targetId : undefined,
  callerName: isMatchedCall ? incoming.callerName : undefined,
});
```

`frontend/screens/calls/CallScreen.tsx`:
```ts
useEffect(() => {
  if (!isIncoming || !autoAccept || hasAccepted || autoAcceptTriggeredRef.current) return;
  autoAcceptTriggeredRef.current = true;
  void (async () => {
    ...
    await webRTCService.acceptCall();
  })();
}, [autoAccept, hasAccepted, isIncoming]);
```

`server/internal/handlers/turn_handler.go`:
```go
if h.staticUser != "" && h.staticPass != "" {
  response.IceServers = append(response.IceServers, IceServer{Urls: turnURL, Username: h.staticUser, Credential: h.staticPass})
}
if h.secret != "" {
  response.IceServers = append(response.IceServers, IceServer{Urls: turnURL, Username: username, Credential: password})
}
```

## 2026-02-24 (Configurable Welcome Bonus LKM)

### Измененные файлы
- `server/internal/services/economy_settings.go`
- `server/internal/services/wallet_service.go`
- `server/internal/handlers/admin_handler.go`
- `server/internal/handlers/referral_handler.go`
- `admin/src/app/referrals/page.tsx`

### Суть правки (от старого к новому)
- `server/internal/services/economy_settings.go`:
  - Было: единого источника `Welcome Bonus` не было.
  - Стало: добавлен `GetWelcomeBonusLKM()` с приоритетом `SystemSetting(WELCOME_BONUS_LKM)` -> `env WELCOME_BONUS_LKM` -> default `50`.
- `server/internal/services/wallet_service.go`:
  - Было: welcome bonus в кошельке создавался жестко как `50` (`PendingBalance`, `WalletTransaction.Amount`, `BonusAmount`).
  - Стало: используется `GetWelcomeBonusLKM()`, поэтому новый бонус задается через настройку.
- `server/internal/handlers/admin_handler.go`:
  - Было: `/api/admin/wallet/global-stats` не возвращал текущее значение welcome bonus.
  - Стало: добавлено поле `welcomeBonusLKM` в ответ.
- `server/internal/handlers/referral_handler.go`:
  - Было: `ShareText` содержал фиксированный текст `50 LKM`.
  - Стало: значение в `ShareText` формируется динамически из `GetWelcomeBonusLKM()`.
- `admin/src/app/referrals/page.tsx`:
  - Было: в блоке `Economic Pulse` показывался статичный `Welcome Bonus = 50 LKM`.
  - Стало: добавлены редактируемое поле + `Save`, сохраняющие `WELCOME_BONUS_LKM` через `POST /api/admin/settings`.

### Сниппеты кода

`server/internal/services/economy_settings.go`:
```go
func GetWelcomeBonusLKM() int {
	var setting models.SystemSetting
	if err := database.DB.Where("key = ?", "WELCOME_BONUS_LKM").First(&setting).Error; err == nil {
		return parseBoundedInt(setting.Value, 50, 0, 100000)
	}
	if envValue := strings.TrimSpace(os.Getenv("WELCOME_BONUS_LKM")); envValue != "" {
		return parseBoundedInt(envValue, 50, 0, 100000)
	}
	return 50
}
```

`server/internal/services/wallet_service.go`:
```go
welcomeBonusLKM := GetWelcomeBonusLKM()
wallet.PendingBalance = welcomeBonusLKM
welcomeTx.Amount = welcomeBonusLKM
welcomeTx.BonusAmount = welcomeBonusLKM
```

`admin/src/app/referrals/page.tsx`:
```ts
await api.post('/admin/settings', { WELCOME_BONUS_LKM: String(parsed) });
await mutateWalletStats();
```

## 2026-02-24 (Contacts -> Chat White Screen + iOS Message Visibility)

### Измененные файлы
- `frontend/screens/portal/contacts/ContactsScreen.tsx`
- `frontend/components/chat/MessageList.tsx`

### Суть правки (от старого к новому)
- `frontend/screens/portal/contacts/ContactsScreen.tsx`:
  - Было: переход в чат выполнялся напрямую из нескольких `onPress` в карточке контакта; на быстрых тачах/вложенных touchable возможен двойной `navigate` и гонка инициализации.
  - Стало: добавлен navigation lock (`runWithNavigationLock`), единый `openChat` с передачей `userId/name` в `Chat`, и единый `openCall`.
- `frontend/components/chat/MessageList.tsx`:
  - Было: `FlatList` на iOS использовал `maintainVisibleContentPosition`, а blur-bubble включался в dark mode, что могло приводить к неотрисовке/перекрытию контента.
  - Стало: `maintainVisibleContentPosition` ограничен Android; добавлен `extraData` и безопасный `keyExtractor`; blur-bubble на iOS включается только для photo background.

### Сниппеты кода

`frontend/screens/portal/contacts/ContactsScreen.tsx`:
```ts
const openChat = useCallback((contact: UserContact) => {
  runWithNavigationLock(() => {
    setChatRecipient(contact);
    requestAnimationFrame(() => {
      navigation.navigate('Chat', {
        userId: contact.ID,
        name: (contact.spiritualName || contact.karmicName || '').trim() || undefined,
      });
    });
  });
}, [navigation, runWithNavigationLock, setChatRecipient]);
```

`frontend/components/chat/MessageList.tsx`:
```ts
const shouldUseBubbleBlur = Platform.OS === 'android' ? (isPhotoBg || isDarkMode) : isPhotoBg;

<FlatList
  ...
  extraData={`${messages.length}_${isLoadingOlderMessages ? 'older' : 'idle'}_${recipientUser?.ID || 'none'}`}
  maintainVisibleContentPosition={Platform.OS === 'android' ? { minIndexForVisible: 1 } : undefined}
/>
```

## 2026-02-24 (Widgets Screen Header + Background Alignment)

### Измененные файлы
- `frontend/screens/portal/WidgetSelectionScreen.tsx`

### Суть правки (от старого к новому)
- Было:
  - экран виджетов использовал отдельную кастомную шапку с заголовком/подзаголовком, отличающуюся от верхнего бара главной страницы портала;
  - поверх фонового изображения применялся затемняющий overlay (`photoOverlay`), из-за чего визуал отличался от главной.
- Стало:
  - шапка экрана приведена к стилю главного портального бара (круглые кнопки, `BalancePill`, `BellButton`, быстрые действия и системные переходы);
  - убран затемняющий фон-оверлей, экран рендерится на том же фоне, что и портал, без дополнительного затемнения.

### Сниппеты кода

`frontend/screens/portal/WidgetSelectionScreen.tsx` (новый верхний бар в стиле портала):
```tsx
<View style={styles.header}>
  <View style={styles.headerLeft}>
    <TouchableOpacity onPress={handleBackToPortal} style={styles.headerCircularButton}>
      <List size={18} color={accentIconColor} />
    </TouchableOpacity>
    <TouchableOpacity onPress={() => navigation.navigate('InviteFriends')} style={styles.headerCircularButton}>
      <Gift size={18} color={accentIconColor} />
    </TouchableOpacity>
    <TouchableOpacity onPress={() => navigation.navigate('VideoCirclesScreen')} style={styles.headerCircularButton}>
      <Film size={16} color={accentIconColor} />
    </TouchableOpacity>
    <BalancePill size="small" lightMode={useLightIcons} />
  </View>
</View>
```

`frontend/screens/portal/WidgetSelectionScreen.tsx` (убран overlay на фоне):
```tsx
if (isPhotoBg && portalBackground) {
  return (
    <ImageBackground source={{ uri: portalBackground }} style={styles.container} resizeMode="cover" fadeDuration={0}>
      {content}
    </ImageBackground>
  );
}
```

## 2026-02-24 (iOS Version Bump Recheck After User Report "1.1.2")

### Changed Files
- `frontend/ios/vedamatch.xcodeproj/project.pbxproj`

### Old -> New
- `frontend/ios/vedamatch.xcodeproj/project.pbxproj`:
  - Old: `CURRENT_PROJECT_VERSION = 5;`, `MARKETING_VERSION = 1.1.3;`
  - New: `CURRENT_PROJECT_VERSION = 6;`, `MARKETING_VERSION = 1.1.4;`

### Code Snippet

`frontend/ios/vedamatch.xcodeproj/project.pbxproj`:
```pbxproj
CURRENT_PROJECT_VERSION = 6;
MARKETING_VERSION = 1.1.4;
```

### Validation
- iOS release install:
  - `xcodebuild -workspace vedamatch.xcworkspace -scheme vedamatch -configuration Release -destination 'id=00008101-000C78913E87001E' -derivedDataPath /Users/mamu/Library/Developer/Xcode/DerivedData/vedamatch-dsoltsxeayyfdqdhtfxuopvbotum install`
  - Result: `** INSTALL SUCCEEDED **`
- Built app info:
  - `/Users/mamu/Library/Developer/Xcode/DerivedData/vedamatch-dsoltsxeayyfdqdhtfxuopvbotum/Build/Intermediates.noindex/ArchiveIntermediates/vedamatch/InstallationBuildProductsLocation/Applications/vedamatch.app/Info.plist`
  - `CFBundleShortVersionString = 1.1.4`
  - `CFBundleVersion = 6`

## 2026-02-24 (Unified Saffron-Gold Screen Styling Layer)

### Changed Files
- `frontend/theme/brandPalette.ts`
- `frontend/theme/screenTheme.ts`
- `frontend/theme/screenEffects.ts`
- `frontend/theme/ModernVedicTheme.ts`
- `frontend/theme/semanticTokens.ts`
- `frontend/theme/componentTokens.ts`
- `frontend/hooks/useRoleTheme.ts`
- `frontend/components/chat/ChatConstants.ts`
- `frontend/components/theme/ScreenAuraBackground.tsx`
- `frontend/components/theme/ScreenScaffold.tsx`
- `frontend/context/SettingsContext.tsx`
- `frontend/screens/portal/PortalMainScreen.tsx`
- `frontend/screens/portal/WidgetSelectionScreen.tsx`
- `frontend/screens/portal/chat/PortalChatScreen.tsx`
- `frontend/screens/portal/contacts/ContactsScreen.tsx`
- `frontend/screens/settings/AppSettingsScreen.tsx`
- `frontend/screens/portal/shops/MarketHomeScreen.tsx`
- `frontend/screens/multimedia/MultimediaHubScreen.tsx`
- `frontend/screens/library/LibraryHomeScreen.tsx`
- `frontend/screens/LoginScreen.tsx`
- `frontend/__tests__/theme/screenTheme.test.ts`
- `frontend/__tests__/theme/componentTokens.test.ts`

### Old -> New
- Theme source of truth:
  - Old: split visual tokens across `ModernVedicTheme`, `ChatConstants`, and forced-dark role tokens.
  - New: unified screen layer (`brandPalette`, `screenTheme`, `screenEffects`) with saffron-gold anchors and shared semantic/component usage.
- Role theme behavior:
  - Old: `useRoleTheme` forced dark semantic tokens regardless of current mode.
  - New: `useRoleTheme` uses actual light/dark `ScreenTheme`, keeping role accent only.
- Shared screen visual container:
  - Old: each screen managed background and overlays separately.
  - New: reusable `ScreenScaffold` + `ScreenAuraBackground` integrated into key screens.
- Backward compatibility:
  - Old: no style-version marker.
  - New: soft migration marker `theme_style_version=2` in settings load.

### Code Snippets

`frontend/theme/brandPalette.ts`:
```ts
export const BRAND_COLORS = {
  saffron: '#FF9933',
  gold: '#F4C542',
  base: '#FAF7F0',
};
```

`frontend/components/theme/ScreenScaffold.tsx`:
```tsx
<ScreenAuraBackground
  mode={mode}
  intensity={auraConfig.intensity}
  disableHeavyEffects={auraConfig.disableHeavyEffects}
  variant={variant}
/>
```

`frontend/hooks/useRoleTheme.ts`:
```ts
const screenTheme = isDarkMode ? ScreenThemeDark : ScreenThemeLight;
const colors = buildSemanticTokensWithScreenTheme(roleTheme, screenTheme);
```

`frontend/context/SettingsContext.tsx`:
```ts
const THEME_STYLE_VERSION_KEY = 'theme_style_version';
const THEME_STYLE_VERSION = '2';
```

### Validation
- TypeScript: `npx tsc --noEmit -p tsconfig.json` — success.
- Tests:
  - `__tests__/theme/screenTheme.test.ts` — pass.
  - `__tests__/theme/componentTokens.test.ts` — pass.
  - Portal/widget regression suites — pass.

## 2026-02-24 (Contrast Fix for Light Theme in Service Screens)

### Changed Files
- `frontend/screens/portal/chat/PortalChatScreen.tsx`
- `frontend/screens/portal/contacts/ContactsScreen.tsx`
- `frontend/screens/library/LibraryHomeScreen.tsx`
- `frontend/screens/calls/CallHistoryScreen.tsx`

### Old -> New
- Old: `isPhotoBg` was enabled whenever `portalBackgroundType === 'image'`, which forced white text/icon styles even in light-theme surfaces.
- New: `isPhotoBg` now applies only in dark mode:
  - `portalBackgroundType === 'image' && isDarkMode`

### Code Snippet

```ts
const isPhotoBg = portalBackgroundType === 'image' && isDarkMode;
```

### Validation
- `npx tsc --noEmit -p tsconfig.json` — success.

## 2026-02-26 (Widget screen UX cleanup + long-press add flow + drag fix)

### Changed Files
- `frontend/components/portal/widgets/WidgetCanvasGrid.tsx`
- `frontend/screens/portal/WidgetSelectionScreen.tsx`
- `frontend/components/portal/DraggablePortalItem.tsx`

### Old -> New
- `WidgetSelectionScreen`:
  - Old: на экране была отдельная карточка «Как открыть меню виджетов» + кнопка «Открыть меню виджетов».
  - New: карточка полностью удалена; UX оставлен через long-press на canvas.
- Empty state текста:
  - Old: подсказка требовала нажать `+` для добавления виджета.
  - New: подсказка изменена на удержание пальца для открытия меню добавления.
- Контраст в empty state:
  - Old: палитра для `image`-фона применялась даже в светлых стилях, из-за чего текст мог быть слишком светлым.
  - New: `photo`-палитра включается только в `classic + image + dark`, остальное берет контрастные theme-цвета.
- Drag & Drop:
  - Old: drag-gesture мог не стартовать стабильно из-за схемы `manualActivation`/комбинации long-press+pan.
  - New: перетаскивание переведено на `Pan.activateAfterLongPress(260)`; добавлен `collapsable={false}` у измеряемого widget-container для стабильного hit-target расчета.

### Code Snippets

`frontend/components/portal/widgets/WidgetCanvasGrid.tsx`:
```tsx
const isPhotoBg = screenVisualStyle === 'classic' && portalBackgroundType === 'image' && isDarkMode;
...
onSetEditMode(true);
onRequestWidgetMenu?.();
...
Удерживайте палец на экране, чтобы открыть меню добавления виджетов
```

`frontend/screens/portal/WidgetSelectionScreen.tsx`:
```tsx
<WidgetCanvasGrid
  ...
  onRequestWidgetMenu={openWidgetMenu}
/>
```

`frontend/components/portal/DraggablePortalItem.tsx`:
```tsx
const panGesture = Gesture.Pan()
  .activateAfterLongPress(260)
  .onStart(() => {
    runOnJS(onDragStart)();
  });
```

### Validation
- `npx tsc --noEmit -p tsconfig.json` — success.
- `npx jest __tests__/screens/portal/WidgetCanvasGrid.test.tsx --runInBand --watchman=false` — pass.

## 2026-02-26 (Widget drag rollback fix + single-widget drop positioning)

### Changed Files
- `frontend/components/portal/widgets/WidgetCanvasGrid.tsx`
- `frontend/context/widgetCanvasLayout.ts`
- `frontend/components/portal/hooks/useGridReorderDnd.ts`
- `frontend/context/__tests__/portalLayout.widgetCanvas.test.ts`
- `frontend/__tests__/screens/portal/WidgetCanvasGrid.test.tsx`

### Old -> New
- `WidgetCanvasGrid`:
  - Old: при одном виджете drag-drop не имел валидной цели reorder и визуально откатывался в исходную позицию.
  - New: для single-widget добавлен drop-snap по координатам canvas (по long-press + drag), позиция сохраняется через `reorderWidgets`.
- `widgetCanvasLayout`:
  - Old: `reorderWidgetCanvas` всегда нормализовал позиции в непрерывную последовательность, для одного виджета это фиксировало позицию в `0`.
  - New: для `widgets.length === 1` сохраняется явная целевая `position` (без авто-сброса в `0`).
- `useGridReorderDnd`:
  - Old: если drop пересекал собственный элемент, reorder мог преждевременно отменяться.
  - New: отмена происходит только если нет ни targetId, ни closestTarget.

### Code Snippets

`frontend/components/portal/widgets/WidgetCanvasGrid.tsx`:
```tsx
if (singleWidget && singleWidget.id === id && canvasBoundsRef.current.width > 0) {
  // compute targetPosition from drop point in canvas
  onReorderWidgets(0, targetPosition);
  return;
}
```

`frontend/context/widgetCanvasLayout.ts`:
```ts
if (orderedWidgets.length === 1 && fromIndex === 0 && toIndex >= 0) {
  const [singleWidget] = orderedWidgets;
  return [{ ...singleWidget, position: toIndex }];
}
```

`frontend/components/portal/hooks/useGridReorderDnd.ts`:
```ts
if (droppedOnOwnItem && !targetId && !closestTarget) return;
```

### Validation
- `npx tsc --noEmit -p tsconfig.json` — success.
- `npx jest __tests__/screens/portal/WidgetCanvasGrid.test.tsx context/__tests__/portalLayout.widgetCanvas.test.ts --runInBand --watchman=false` — pass.
- `npx jest __tests__/screens/portal/WidgetSelectionScreen.test.tsx --runInBand --watchman=false` — pass.

## 2026-02-26 (Widget empty canvas: long-press on full placement area)

### Changed Files
- `frontend/components/portal/widgets/WidgetCanvasGrid.tsx`
- `frontend/__tests__/screens/portal/WidgetCanvasGrid.test.tsx`

### Old -> New
- Old:
  - в empty-state long-press обрабатывался только на карточке «Пока нет виджетов».
  - удержание в остальной области canvas могло не открывать меню виджетов.
- New:
  - added full-size pressable zone (`widget-canvas-empty-zone`) на всю область размещения виджетов;
  - карточка empty-state оставлена визуально, но `pointerEvents="none"` (жесты обрабатывает вся зона);
  - long-press теперь стабильно работает по всей рабочей области canvas.

### Code Snippets

`frontend/components/portal/widgets/WidgetCanvasGrid.tsx`:
```tsx
<Pressable
  testID="widget-canvas-empty-zone"
  style={styles.emptyCanvasPressable}
  onLongPress={handleCanvasLongPress}
>
  <View style={styles.emptyState} pointerEvents="none">
```

`frontend/__tests__/screens/portal/WidgetCanvasGrid.test.tsx`:
```tsx
fireEvent(screen.getByTestId('widget-canvas-empty-zone'), 'onLongPress');
```

### Validation
- `npx tsc --noEmit -p tsconfig.json` — success.
- `npx jest __tests__/screens/portal/WidgetCanvasGrid.test.tsx --runInBand --watchman=false` — pass.
- `xcodebuild -workspace vedamatch.xcworkspace -scheme vedamatch -configuration Debug -destination 'generic/platform=iOS Simulator' build` — `BUILD SUCCEEDED`.

## 2026-02-25 (iOS DEV login: Firebase init + offline fallback)

### Changed Files
- `frontend/ios/vedamatch/AppDelegate.mm`
- `frontend/index.js`
- `frontend/screens/LoginScreen.tsx`

### Old -> New
- `frontend/ios/vedamatch/AppDelegate.mm`:
  - Old: default Firebase app не инициализировался явно при старте iOS, из-за чего в JS возникал warning `No Firebase App '[DEFAULT]' has been created`.
  - New: добавлен guarded native-init `if ([FIRApp defaultApp] == nil) { [FIRApp configure]; }` в `didFinishLaunchingWithOptions`.
- `frontend/index.js`:
  - Old: background handler всегда вызывал `getMessaging()`, даже если Firebase app еще не доступен.
  - New: перед регистрацией background handler добавлена проверка `getApps().length > 0`; при отсутствии app handler пропускается без шумного warning.
- `frontend/screens/LoginScreen.tsx`:
  - Old: DEV quick login завершался ошибкой при полном сетевом отказе (`Network request failed`), вход блокировался.
  - New: при сетевом отказе добавлен локальный DEV fallback (создание локального профиля + технический токен) и вход продолжается; для несетевых ошибок alert дополнительно показывает список базовых URL, по которым шли попытки.

### Code Snippets

`frontend/ios/vedamatch/AppDelegate.mm`:
```mm
if ([FIRApp defaultApp] == nil) {
  [FIRApp configure];
}
```

`frontend/index.js`:
```js
const { getApps } = require('@react-native-firebase/app');
const firebaseApps = getApps();
if (firebaseApps.length > 0) {
  const messaging = getMessaging(firebaseApps[0]);
  setBackgroundMessageHandler(messaging, async remoteMessage => {
    await notificationService.handleBackgroundMessage(remoteMessage);
  });
}
```

`frontend/screens/LoginScreen.tsx`:
```ts
if (isLikelyNetworkFailure(fallbackError) || isLikelyNetworkFailure(regError)) {
    await doLocalDevLogin();
    return;
}
```

```ts
await login(localDevProfile, {
    accessToken: 'dev-offline-access-token',
    token: 'dev-offline-access-token',
});
```

### Validation
- `npx tsc --noEmit -p tsconfig.json` — success.

## 2026-02-25 (DEV Quick Login: direct fetch + API base fallback)

### Changed Files
- `frontend/screens/LoginScreen.tsx`

### Old -> New
- Old:
  - `Быстрый вход (DEV)` опирался только на axios-path через текущий `API_PATH`;
  - при сетевых проблемах в axios (`Network Error`) fallback был недостаточно надежным, ошибка не давала понимания, какой endpoint упал.
- New:
  - `Быстрый вход (DEV)` переведен на прямой `fetch` для auth-операций;
  - добавлен fallback по базовым API URL:
    - `API_PATH` (текущий env),
    - `https://api.vedamatch.ru/api` (жесткий резерв);
  - для финального fail добавлен вывод `URL` в alert, чтобы сразу видеть проблемный endpoint на устройстве.

### Code Snippets

`frontend/screens/LoginScreen.tsx`:
```ts
const devAuthBases = Array.from(new Set([
  API_PATH.replace(/\/+$/, ''),
  'https://api.vedamatch.ru/api',
]));
```

```ts
const devRequest = async <T,>(method, path, payload, token?) => {
  // fetch + JSON parse + fallback by base URL
};
```

```ts
const failedUrl = fallbackError?.url || regError?.url;
Alert.alert('Dev Error', `Failed to create/login dev user: ${errorMsg}${debugSuffix}`);
```

### Validation
- `npx tsc --noEmit -p tsconfig.json` — success.

## 2026-02-24 (DEV Login: resilient fallback user creation)

### Changed Files
- `frontend/screens/LoginScreen.tsx`

### Old -> New
- Old:
  - `Быстрый вход (DEV)` использовал только фиксированный email `dev_admin_yatra@example.com`;
  - если пользователь с этим email уже существовал с другим паролем, логин падал, а регистрация повторно падала на конфликте (`user exists`), и DEV-вход оставался недоступен.
- New:
  - сохранен первичный сценарий входа через статичный dev-email;
  - при неуспехе добавлен fallback: регистрация и вход через уникальный email `dev_admin_yatra_${Date.now()}@example.com`, что устраняет конфликт существующего пользователя.

### Code Snippets

`frontend/screens/LoginScreen.tsx`:
```ts
const devEmail = 'dev_admin_yatra@example.com';
const fallbackDevEmail = `dev_admin_yatra_${Date.now()}@example.com`;
```

```ts
const fallbackUser = { ...devUser, email: fallbackDevEmail };
await apiClient.post('/register', { ...fallbackUser, deviceId }, ...);
const fallbackLoginRes = await apiClient.post('/login', { email: fallbackDevEmail, password: devPassword, deviceId }, ...);
```

### Validation
- Логика fallback проверена по коду: после fail статичного dev-аккаунта выполняется отдельный path с уникальным email.

## 2026-02-24 (iOS API Runtime Guard: prevent localhost network errors)

### Changed Files
- `frontend/config/api.config.ts`

### Old -> New
- Old:
  - `DEFAULT_URL` для iOS был `http://127.0.0.1:8000`;
  - при проблемном/устаревшем env iOS запросы уходили на localhost устройства и падали с `Network Error`.
- New:
  - iOS/default fallback переключен на `https://api.vedamatch.ru`;
  - добавлена защита `sanitizeApiBaseUrl`: если на iOS приходит `localhost`/`127.0.0.1`, URL автоматически заменяется на production API.

### Code Snippets

`frontend/config/api.config.ts`:
```ts
const PROD_API_URL = 'https://api.vedamatch.ru';
const DEFAULT_URL = Platform.select({
  android: 'http://10.0.2.2:8000',
  ios: PROD_API_URL,
  default: PROD_API_URL,
}) as string;
```

```ts
const sanitizeApiBaseUrl = (url: string): string => {
  if (Platform.OS === 'ios' && /127\.0\.0\.1|localhost/i.test(url)) {
    return PROD_API_URL;
  }
  return url;
};
```

### Validation
- Логика проверена по коду: iOS runtime больше не использует localhost как API endpoint.

## 2026-02-24 (iOS Launch Target Fix: remove duplicate app confusion)

### Changed Files
- `run-ios.js`

### Old -> New
- Old:
  - скрипт запускал bundle id `org.reactjs.native.example.vedamatch` (legacy);
  - на симуляторе/виртуалке могли существовать два приложения `VedaMatch` с разными bundle id, и запускался старый экземпляр с устаревшим env.
- New:
  - launch id обновлен на актуальный `com.VedaMatch.vedamatch` (как в `frontend/ios/vedamatch.xcodeproj/project.pbxproj`).

### Code Snippets

`run-ios.js`:
```js
execSync(`xcrun simctl launch "${targetDevice.udid}" com.VedaMatch.vedamatch`, { stdio: 'inherit' });
```

### Validation
- Проверено по конфигу iOS target: `PRODUCT_BUNDLE_IDENTIFIER = com.VedaMatch.vedamatch`.
- Portal/widget regression tests — success.

## 2026-02-24 (Top Bar Contrast Fix: Rooms/Service Header + Widget Header)

### Changed Files
- `frontend/screens/portal/PortalMainScreen.tsx`
- `frontend/screens/portal/WidgetSelectionScreen.tsx`

### Old -> New
- Old: header icon/text color decisions depended on `effectiveBgType === 'image'`, causing white icons/text on light saffron backgrounds in service screens (notably Rooms).
- New: introduced dark-aware condition:
  - `useLightHeaderIcons = isDarkMode && effectiveBgType === 'image'`
  - header icon/text/border/blur states now use `useLightHeaderIcons`, keeping high contrast in light mode.
- Widget header alignment:
  - `isPhotoBg` in widget header is now dark-aware (`... && isDarkMode`) to prevent white icon forcing in light mode.

### Code Snippet
```ts
const useLightHeaderIcons = isDarkMode && effectiveBgType === 'image';
```

### Validation
- `npx tsc --noEmit -p tsconfig.json` — success.
- `PortalMainScreen` + `WidgetSelectionScreen` tests — pass.

## 2026-02-24 (Settings Toggle: Classic Wallpapers vs Saffron Style)

### Changed Files
- `frontend/context/SettingsContext.tsx`
- `frontend/components/theme/ScreenScaffold.tsx`
- `frontend/screens/settings/AppSettingsScreen.tsx`
- `frontend/screens/portal/PortalMainScreen.tsx`
- `frontend/screens/portal/WidgetSelectionScreen.tsx`

### Old -> New
- Old: no visual-style switch in settings; new saffron layer could visually overshadow wallpaper/slideshow perception on portal screens.
- New:
  - added persisted setting `screenVisualStyle` (`classic` / `saffron`);
  - settings UI now includes style switcher in Appearance section;
  - `ScreenScaffold` respects style (`classic` disables aura/glass overlays);
  - portal and widget screens explicitly keep aura disabled so `PortalBackgroundLayer` wallpapers/slideshow remain clearly visible.

### Code Snippets

`frontend/context/SettingsContext.tsx`:
```ts
export type ScreenVisualStyle = 'classic' | 'saffron';
const SCREEN_VISUAL_STYLE_KEY = 'screen_visual_style_v1';
```

`frontend/components/theme/ScreenScaffold.tsx`:
```ts
const isSaffronStyle = screenVisualStyle === 'saffron';
const shouldRenderAura = enableAura && isSaffronStyle;
```

`frontend/screens/settings/AppSettingsScreen.tsx`:
```tsx
SCREEN_VISUAL_STYLE_OPTIONS: classic / saffron
```

### Validation
- `npx tsc --noEmit -p tsconfig.json` — success.
- Portal/widget regression tests — success.

## 2026-02-24 (Classic Visual Style: Wallpaper Visibility Fix)

### Changed Files
- `frontend/components/theme/ScreenScaffold.tsx`
- `frontend/screens/portal/PortalMainScreen.tsx`
- `frontend/screens/portal/WidgetSelectionScreen.tsx`

### Old -> New
- Old: `ScreenScaffold` always applied opaque `backgroundColor`, so when style switched to `classic`, this layer could visually cover `PortalBackgroundLayer` wallpapers/slideshow.
- New:
  - added `transparentBackground?: boolean` prop in `ScreenScaffold`;
  - for portal and widget screens, scaffold is now rendered with `transparentBackground`, so wallpapers remain visible in classic mode.

### Code Snippets

`frontend/components/theme/ScreenScaffold.tsx`:
```tsx
type ScreenScaffoldProps = {
  transparentBackground?: boolean;
};

<View style={[styles.root, { backgroundColor: transparentBackground ? 'transparent' : vTheme.colors.background }]}>
```

`frontend/screens/portal/PortalMainScreen.tsx`:
```tsx
<ScreenScaffold variant="portal" enableAura={false} transparentBackground>
```

`frontend/screens/portal/WidgetSelectionScreen.tsx`:
```tsx
<ScreenScaffold variant="portal" enableAura={false} transparentBackground>
```

### Validation
- `npx tsc --noEmit -p tsconfig.json` — success.

## 2026-02-24 (Visual Style Switch Fix: Saffron no longer keeps wallpapers)

### Changed Files
- `frontend/screens/portal/PortalMainScreen.tsx`
- `frontend/screens/portal/WidgetSelectionScreen.tsx`

### Old -> New
- Old:
  - при переключении на `saffron` экраны продолжали использовать `PortalBackgroundLayer` с пользовательскими обоями/слайдшоу;
  - визуально интерфейс почти не менялся, потому что оставался wallpaper-подложка.
- New:
  - добавлено явное разделение режимов:
    - `classic`: используются сохраненные `portalBackground`/`portalBackgroundType`/`activeWallpaper`/`isSlideshowEnabled`;
    - `saffron`: фон принудительно `color` (`vTheme.colors.background`), слайдшоу/обои не применяются;
  - `ScreenScaffold`:
    - `classic` -> `transparentBackground=true`, `enableAura=false`;
    - `saffron` -> `transparentBackground=false`, `enableAura=true`.

### Code Snippets

`frontend/screens/portal/PortalMainScreen.tsx`:
```ts
const useClassicWallpaper = screenVisualStyle === 'classic';
const layerBackgroundType = useClassicWallpaper ? portalBackgroundType : 'color';
const layerBackground = useClassicWallpaper ? portalBackground : vTheme.colors.background;
```

```tsx
<ScreenScaffold
  variant="portal"
  enableAura={!useClassicWallpaper}
  transparentBackground={useClassicWallpaper}
>
```

`frontend/screens/portal/WidgetSelectionScreen.tsx`:
```ts
const useClassicWallpaper = screenVisualStyle === 'classic';
const layerOverlayColor = useClassicWallpaper ? 'rgba(0,0,0,0.25)' : 'transparent';
```

### Validation
- `npx tsc --noEmit -p tsconfig.json` — success.

## 2026-02-25 (Feed v2 + Portal Feed Widgets + Yandex CDN env)

### Changed Files
- `frontend/types/portal.ts`
- `frontend/screens/portal/WidgetSelectionScreen.tsx`
- `frontend/components/portal/widgets/widgetCatalog.tsx`
- `frontend/components/portal/FeedQuickWidget.tsx`
- `frontend/components/portal/FeedMixWidget.tsx`
- `frontend/services/feedService.ts`
- `.env.example`

### Old -> New
- Old:
  - portal widget canvas поддерживал только `clock/calendar/circles_*`;
  - не было feed-виджетов и клиентского сервиса `feed v2`;
  - env-шаблон был ориентирован на другой S3-провайдер без целевого CDN домена VedaMatch.
- New:
  - добавлены новые типы виджетов `feed_quick` и `feed_mix`;
  - добавлены UI-компоненты feed-виджетов (быстрый переход и мини-лента с prefetch);
  - добавлен клиентский сервис `GET /api/v2/feed`;
  - `.env.example` переведен на Yandex Object Storage + CDN (`cdn.vedamatch.ru`).

### Code Snippets

`frontend/types/portal.ts`:
```ts
export interface PortalWidget {
  type: 'clock' | 'calendar' | 'circles_quick' | 'circles_panel' | 'feed_quick' | 'feed_mix';
}
```

`frontend/components/portal/widgets/widgetCatalog.tsx`:
```tsx
{
  type: 'feed_quick',
  size: '1x1',
  render: () => <FeedQuickWidget />,
},
{
  type: 'feed_mix',
  size: '2x2',
  render: () => <FeedMixWidget />,
}
```

`frontend/services/feedService.ts`:
```ts
const response = await apiClient.get<FeedV2Response>('/v2/feed', { params });
```

`.env.example`:
```env
S3_ENDPOINT=storage.yandexcloud.net
S3_REGION=ru-central1
S3_PUBLIC_URL=https://cdn.vedamatch.ru
CDN_ENABLED=true
CDN_BASE_URL=https://cdn.vedamatch.ru
```

### Validation
- `pnpm -C frontend exec tsc --noEmit` — success.

## 2026-03-11 (Android AI Chat: disable native-stack transition to reduce blank screen on exit)

### Измененные файлы
- `frontend/App.tsx`

### Суть правки (от старого к новому)
- Было:
  - экран `Chat` на Android наследовал глобальную stack-анимацию `fade`;
  - при возврате из AI Chat на Android возможен transition race/blank screen, несмотря на уже отключенный `freezeOnBlur`.
- Стало:
  - для `Stack.Screen name="Chat"` на Android принудительно задано `animation: 'none'`;
  - для `Chat` добавлен явный `contentStyle.backgroundColor`, чтобы экран не зависел от прозрачных слоев во время pop transition.

### Сниппеты кода

`frontend/App.tsx`:
```ts
options={{
  animation: Platform.OS === 'android' ? 'none' : 'slide_from_right',
  freezeOnBlur: Platform.OS === 'android' ? false : undefined,
  contentStyle: { backgroundColor: Platform.OS === 'android' ? (theme.background || '#000000') : 'transparent' },
}}
```

### Validation
- `pnpm -C frontend exec tsc --noEmit` — not clean due to pre-existing unrelated TS errors in `App.tsx`, `VKAuthModal.tsx`, `PortalMainScreen.tsx`, `EditProfileScreen.tsx`, `PortalLayoutContext.tsx`.

## 2026-03-11 (PolzaService: ignore masked DB key and fallback to env secret)

### Измененные файлы
- `server/internal/services/polza_service.go`

### Суть правки (от старого к новому)
- Было:
  - `PolzaService` читал `POLZA_API_KEY` из БД как есть;
  - если админка сохраняла замаскированное значение `************...`, backend использовал его как реальный ключ и AI chat падал с `502 -> upstream 401 UNAUTHORIZED`.
- Стало:
  - добавлена проверка masked-sensitive значения;
  - `PolzaService` теперь предпочитает реальный env secret (`POLZA_API_KEY`, затем `API_OPEN_AI`) и игнорирует masked DB value;
  - та же логика применена и в `ReloadFromDB()`, чтобы runtime reload не ломал рабочий ключ.

### Сниппеты кода

`server/internal/services/polza_service.go`:
```go
func isMaskedSensitiveValue(value string) bool { ... }

func resolvePolzaAPIKey() string {
  if envKey := strings.TrimSpace(os.Getenv("POLZA_API_KEY")); envKey != "" {
    return envKey
  }
  if fallbackKey := strings.TrimSpace(os.Getenv("API_OPEN_AI")); fallbackKey != "" {
    return fallbackKey
  }
  ...
}
```

```go
if dbValue := strings.TrimSpace(apiKeySetting.Value); dbValue != "" && !isMaskedSensitiveValue(dbValue) {
  s.apiKey = dbValue
} else {
  s.apiKey = resolvePolzaAPIKey()
}
```

### Validation
- `gofmt -w server/internal/services/polza_service.go` — success.
- `go test ./internal/services -run '^$'` (from `server/`) — success.
- Прод-проверка до фикса: `POST /api/v1/chat/completions` -> `502` with upstream `401 Некорректный API ключ`, while `API_OPEN_AI` in container env is valid (`/v1/models -> 200`).

## 2026-03-11 (AI chat: sanitize technical error text shown to end users)

### Измененные файлы
- `frontend/context/ChatContext.tsx`

### Суть правки (от старого к новому)
- Было:
  - при сбое AI backend/provider чат показывал пользователю сырой текст ошибки (`502`, `401`, `UNAUTHORIZED`, `trace_id`, детали upstream);
  - это светило внутренние технические детали и выглядело как системная утечка.
- Стало:
  - для технических AI/server/provider ошибок добавлен клиентский sanitize;
  - вместо сырого ответа пользователь видит нейтральное сообщение: что произошла техническая ошибка и ведутся работы по устранению;
  - обычные не-технические ошибки остаются как прежде.

### Сниппеты кода

`frontend/context/ChatContext.tsx`:
```ts
const shouldMaskAssistantError = (message: string): boolean => {
  return (
    normalized.includes('ai service error') ||
    normalized.includes('api error') ||
    normalized.includes('trace_id') ||
    normalized.includes('unauthorized') ||
    normalized.includes('api key')
  );
};
```

```ts
const userSafeMessage = shouldMaskAssistantError(message)
  ? getAssistantTechnicalErrorText(i18n.language)
  : (message || t('chat.errorFetch'));
```

### Validation
- `pnpm -C frontend exec tsc --noEmit` — not clean due to pre-existing unrelated TS errors in `App.tsx`, `VKAuthModal.tsx`, `PortalMainScreen.tsx`, `EditProfileScreen.tsx`, `PortalLayoutContext.tsx`.

## 2026-02-25 (Feed v2 materialization: rebuild + read from feed_items)

### Changed Files
- `server/internal/services/feed_v2_service.go`
- `server/internal/handlers/admin_feed_handler.go`

### Old -> New
- Old:
  - `POST /api/admin/feed/rebuild` был stub (accept-only, без фактической materialization);
  - `GET /api/v2/feed` всегда строил выдачу runtime pull-логикой.
- New:
  - реализованы рабочие rebuild-операции `RebuildForUser`, `RebuildForOrg`, `RebuildAll` с записью в `feed_items`;
  - `/api/admin/feed/rebuild` теперь выполняет реальный rebuild (по `userId`, `orgId` или по всем);
  - `GET /api/v2/feed` использует materialized fast-path (`feed_items`) для первой страницы без cursor, с fallback на pull-расчет.

### Code Snippets

`server/internal/services/feed_v2_service.go`:
```go
func (s *FeedV2Service) RebuildForUser(userID uint, limit int) (int, error) { ... }
func (s *FeedV2Service) RebuildForOrg(orgTypeID uint, limit int) (int, error) { ... }
func (s *FeedV2Service) RebuildAll(limit int) (int, error) { ... }
```

```go
if cursor == nil {
  materialized, err := s.loadMaterializedFeed(userID, filters.Limit+1)
  ...
}
```

`server/internal/handlers/admin_feed_handler.go`:
```go
count, err := feedService.RebuildForUser(uint(userID), limit)
```

### Validation
- `go test ./cmd/api ./internal/handlers ./internal/services` — success.
- `pnpm -C admin exec tsc --noEmit` — success.
- `pnpm -C frontend exec tsc --noEmit` — success.

## 2026-02-25 (Worker deployment layer: feed-worker + media-worker)

### Changed Files
- `server/internal/workers/feed_rebuild_worker.go`
- `server/internal/workers/media_pipeline_worker.go`
- `server/cmd/feed_worker/main.go`
- `server/cmd/media_worker/main.go`
- `server/Dockerfile`
- `docker-compose.prod.yml`
- `.env.example`

### Old -> New
- Old:
  - периодический rebuild/feed materialization требовал ручного admin trigger;
  - выделенных worker контейнеров не было;
  - Docker image собирал только `api` binary.
- New:
  - добавлен `feed-worker` (периодический rebuild `feed_items`);
  - добавлен `media-worker` (операционный heartbeat-каркас под media pipeline);
  - Dockerfile собирает 3 binary: `server`, `feed-worker`, `media-worker`;
  - `docker-compose.prod.yml` содержит два новых сервиса;
  - `.env.example` расширен worker env-параметрами.

### Code Snippets

`server/Dockerfile`:
```dockerfile
RUN CGO_ENABLED=0 GOOS=linux go build -o /app/feed-worker ./cmd/feed_worker/main.go
RUN CGO_ENABLED=0 GOOS=linux go build -o /app/media-worker ./cmd/media_worker/main.go
```

`docker-compose.prod.yml`:
```yaml
feed-worker:
  command: ["./feed-worker"]
media-worker:
  command: ["./media-worker"]
```

`.env.example`:
```env
FEED_WORKER_ENABLED=true
FEED_REBUILD_INTERVAL_SEC=300
FEED_REBUILD_LIMIT=120
MEDIA_WORKER_ENABLED=true
MEDIA_WORKER_INTERVAL_SEC=60
```

### Validation
- `go test ./cmd/api ./cmd/feed_worker ./cmd/media_worker ./internal/workers ./internal/services` — success.

## 2026-02-25 (Dev compose workers + media queue consumer)

### Changed Files
- `server/internal/workers/media_pipeline_worker.go`
- `docker-compose.yml`

### Old -> New
- Old:
  - `media-worker` работал как heartbeat/no-op;
  - dev docker-compose не содержал `redis`, `feed-worker`, `media-worker`.
- New:
  - `media-worker` стал реальным consumer очереди `transcoding:queue` (Redis), выполняет транскодирование через `TranscodingService`, обновляет `video_transcoding_jobs` и `media_tracks` статусы;
  - `docker-compose.yml` (dev) расширен сервисами `redis`, `feed-worker`, `media-worker`, а `server` получил Redis env для единого локального контура.

### Code Snippets

`server/internal/workers/media_pipeline_worker.go`:
```go
job, err := w.redis.GetNextTranscodingJob()
if err := w.transcoder.TranscodeVideo(ctx, job); err != nil { ... }
_ = database.DB.Model(&models.MediaTrack{}).Where("id = ?", job.VideoID).Updates(...)
```

`docker-compose.yml`:
```yaml
redis:
  image: redis:7-alpine
feed-worker:
  command: ["./feed-worker"]
media-worker:
  command: ["./media-worker"]
```

### Validation
- `go test ./cmd/feed_worker ./cmd/media_worker ./internal/workers ./internal/services` — success.

## 2026-02-25 (Rolling feed worker + workers health endpoint + smoke)

### Changed Files
- `server/internal/services/feed_v2_service.go`
- `server/internal/workers/feed_rebuild_worker.go`
- `server/internal/workers/media_pipeline_worker.go`
- `server/internal/handlers/admin_feed_handler.go`
- `server/cmd/api/main.go`
- `docker-compose.yml`
- `docker-compose.prod.yml`
- `admin/src/app/feed-control/page.tsx`
- `.env.example`

### Old -> New
- Old:
  - feed-worker делал полный `RebuildAll` за один проход;
  - не было API проверки здоровья воркеров;
  - media-worker не публиковал health/status в `system_settings`.
- New:
  - feed-worker переведен на rolling rebuild батчами (`FEED_REBUILD_BATCH_SIZE`) с курсором `FEED_WORKER_LAST_USER_ID`;
  - добавлен endpoint `GET /api/admin/feed/workers-health`;
  - media-worker обновляет heartbeat/status в `system_settings`;
  - admin `Feed Control` отображает блок `Workers health`.

### Code Snippets

`server/internal/services/feed_v2_service.go`:
```go
RebuildBatchByUserID(startAfterUserID uint, batchSize int, limit int)
```

`server/internal/workers/feed_rebuild_worker.go`:
```go
count, users, lastUserID, wrapped, err := w.service.RebuildBatchByUserID(startCursor, w.batchSize, w.limit)
```

`server/cmd/api/main.go`:
```go
admin.Get("/feed/workers-health", adminFeedHandler.GetWorkersHealth)
```

### Smoke Commands
```bash
# Start local stack with workers
docker compose up -d postgres redis server feed-worker media-worker

# Check worker health
curl -H "Authorization: Bearer <admin_token>" \
  https://api.vedamatch.ru/api/admin/feed/workers-health

# Trigger manual rebuild for one user
curl -X POST -H "Authorization: Bearer <admin_token>" \
  "https://api.vedamatch.ru/api/admin/feed/rebuild?userId=123&limit=120"

# Tail worker logs
docker compose logs -f feed-worker media-worker
```

### Validation
- `go test ./cmd/api ./cmd/feed_worker ./cmd/media_worker ./internal/workers ./internal/services ./internal/handlers` — success.
- `pnpm -C admin exec tsc --noEmit` — success.
- `pnpm -C frontend exec tsc --noEmit` — success.

## 2026-02-25 (Feed v2 rollout gate + media retry policy)

### Changed Files
- `server/internal/handlers/feed_v2_handler.go`
- `server/internal/services/redis_service.go`
- `server/internal/services/transcoding_service.go`
- `server/internal/workers/media_pipeline_worker.go`
- `.env.example`
- `docker-compose.yml`
- `docker-compose.prod.yml`

### Old -> New
- Old:
  - `GET /api/v2/feed` не имел централизованного feature-flag/rollout guard;
  - media-worker при ошибке транскодинга завершал job без retry;
  - job payload не хранил номер попытки.
- New:
  - добавлен rollout gate для `feed v2` по `FEED_V2_ENABLED` + `FEED_V2_ROLLOUT_PERCENT` (stable bucket per user);
  - `TranscodingJob` расширен полем `attempt`;
  - media-worker получил retry policy (`MEDIA_WORKER_MAX_RETRIES`), requeue в Redis и корректные статусы `pending/failed` на `media_tracks`.

### Code Snippets

`server/internal/handlers/feed_v2_handler.go`:
```go
if !h.isFeedV2EnabledForUser(userID) {
  return c.Status(fiber.StatusServiceUnavailable).JSON(...)
}
```

`server/internal/workers/media_pipeline_worker.go`:
```go
if job.Attempt < w.maxRetries {
  retryJob.Attempt++
  _ = w.redis.AddTranscodingJob(&retryJob)
}
```

`.env.example`:
```env
MEDIA_WORKER_MAX_RETRIES=2
```

### Validation
- `go test ./cmd/api ./cmd/feed_worker ./cmd/media_worker ./internal/handlers ./internal/services ./internal/workers` — success.
- `pnpm -C admin exec tsc --noEmit` — success.
- `pnpm -C frontend exec tsc --noEmit` — success.

## 2026-02-25 (Sync local S3 env from remote production server)

### Changed Files
- `.env`

### Old -> New
- Old:
  - локальный `.env` содержал устаревшие/заглушечные S3 значения (`twcstorage` + `PLEASE_ROTATE_*`).
- New:
  - S3 конфиг синхронизирован с фактическими значениями из running контейнера `vedamatch-server-*` на удаленном сервере;
  - endpoint/bucket/public URL теперь соответствуют текущему прод-контру.

### Code Snippets

`.env`:
```env
S3_ENDPOINT=https://s3.firstvds.ru
S3_REGION=default
S3_ACCESS_KEY=<synced-from-remote>
S3_SECRET_KEY=<synced-from-remote>
S3_BUCKET_NAME=<synced-from-remote>
S3_PUBLIC_URL=https://s3.firstvds.ru/<synced-from-remote>
```

### Validation
- Remote source: `docker inspect vedamatch-server-... | egrep '^(S3_|CDN_)'`.

## 2026-02-26 (iOS dev: suppress RedBox on handled assistant send errors)

### Changed Files
- `frontend/context/ChatContext.tsx`
- `frontend/services/openaiService.ts`

### Old -> New
- Old:
  - при сетевой ошибке отправки сообщения ассистенту код логировал `console.error(...)` в обработанном `catch`;
  - в iOS dev это поднимало Console Error/RedBox, хотя ошибка уже была обработана и показана пользователю.
- New:
  - в обработанных `catch` заменено логирование на `console.warn(...)` с текстовым сообщением;
  - пользователь продолжает видеть чатовый fallback/error message, но без dev RedBox из-за обработанной ошибки.

### Code Snippets

`frontend/context/ChatContext.tsx`:
```ts
// Old
console.error('Ошибка при отправке сообщения:', error);

// New
console.warn('Ошибка при отправке сообщения:', message || 'unknown error');
```

`frontend/services/openaiService.ts`:
```ts
// Old
console.error('Ошибка в sendMessage:', error);

// New
console.warn('Ошибка в sendMessage:', error?.message || 'unknown error');
```

### Validation
- Локальная проверка: отправка сообщения ассистенту при недоступном API больше не должна открывать RedBox только из-за `console.error` в обработанном `catch`.

## 2026-02-26 (Admin web: legacy avatar filename fallback to avoid 404)

### Changed Files
- `admin/src/components/landing/UnionPresentationSection.tsx`
- `admin/src/app/dating/page.tsx`
- `admin/src/app/ads/page.tsx`

### Old -> New
- Old:
  - при `avatarUrl/photoUrl` в legacy-формате только с именем файла (`7_1767761761.jpg`) админка строила URL в корне домена (`https://.../7_176...jpg`);
  - это приводило к `404` в браузерной консоли.
- New:
  - для bare filename (без `/` и с image-расширением) добавлен fallback в `/uploads/avatars/<filename>`;
  - для обычных путей/абсолютных URL поведение сохранено.

### Code Snippets

`admin/src/components/landing/UnionPresentationSection.tsx`:
```ts
const normalizedPath = trimmedUrl.startsWith('/') ? trimmedUrl : `/${trimmedUrl}`;
if (/^\/[^/]+\.(?:jpg|jpeg|png|webp|gif|heic|heif)$/i.test(normalizedPath)) {
  return `${origin}/uploads/avatars${normalizedPath}`;
}
return `${origin}${normalizedPath}`;
```

`admin/src/app/dating/page.tsx` and `admin/src/app/ads/page.tsx`:
```ts
const normalizedPath = normalizedUrl.startsWith('/') ? normalizedUrl : `/${normalizedUrl}`;
if (/^\/[^/]+\.(?:jpg|jpeg|png|webp|gif|heic|heif)$/i.test(normalizedPath)) {
  return `${apiOrigin}/uploads/avatars${normalizedPath}`;
}
return `${apiOrigin}${normalizedPath}`;
```

### Validation
- `pnpm -C admin exec tsc --noEmit` — success.

## 2026-02-27 (Channels/Feed v1: 24h edit window, cover upload, post action bar)

### Changed Files
- `server/internal/models/channel.go`
- `server/internal/database/database.go`
- `server/internal/services/channel_service.go`
- `server/internal/services/metrics_service.go`
- `server/internal/handlers/channel_handler.go`
- `server/internal/handlers/channel_handler_test.go`
- `server/cmd/api/main.go`
- `frontend/types/channel.ts`
- `frontend/services/channelService.ts`
- `frontend/screens/portal/services/channels/ChannelsHubScreen.tsx`
- `frontend/screens/portal/services/channels/ChannelManageScreen.tsx`

### Old -> New
- Old:
  - у channel posts не было счетчиков `views/reactions/comments/shares`, API для реакций/комментариев/share/view отсутствовали;
  - автор-редактор не имел отдельного окна редактирования опубликованного поста на 24 часа;
  - обложка канала редактировалась только URL-строкой, без загрузки изображения;
  - в карточке поста ленты не было action bar с интеракциями.
- New:
  - добавлены поля счетчиков в `channel_posts` и таблицы `channel_post_reactions`, `channel_post_comments`;
  - добавлены endpoints:
    - `POST /api/channels/:channelId/posts/:postId/view`
    - `POST /api/channels/:channelId/posts/:postId/share`
    - `POST/DELETE /api/channels/:channelId/posts/:postId/reactions`
    - `GET/POST /api/channels/:channelId/posts/:postId/comments`
  - добавлено правило редактирования: для `editor`-автора опубликованного поста окно 24ч; после этого `400` + `POST_EDIT_WINDOW_EXPIRED`;
  - добавлен upload обложки `POST /api/channels/:id/cover/upload` (owner/admin) с backend auto center-crop 16:9, resize `1600x900`, JPEG optimize и загрузкой в S3/CDN;
  - на iOS/RN в `ChannelsHubScreen` добавлен action bar (emoji reaction, comments, share, views), в `ChannelManageScreen` — загрузка cover с preview.

### Code Snippets

`server/internal/services/channel_service.go`:
```go
if post.Status == models.ChannelPostStatusPublished {
	if post.PublishedAt == nil {
		return ErrPostEditWindow
	}
	if time.Since(post.PublishedAt.UTC()) <= postAuthorEditWindow {
		return nil
	}
	return ErrPostEditWindow
}
```

```go
func (s *ChannelService) TrackPostView(channelID, postID, viewerID uint) error {
	...
	return s.db.Model(&models.ChannelPost{}).
		Where("id = ?", post.ID).
		Update("view_count", gorm.Expr("view_count + 1")).Error
}
```

`frontend/screens/portal/services/channels/ChannelManageScreen.tsx`:
```ts
const updated = await channelService.uploadCover(channelId, {
  uri: asset.uri,
  name: asset.fileName || `channel-cover-${Date.now()}.jpg`,
  type: asset.type || 'image/jpeg',
});
setCoverUrl(updated.coverUrl || '');
```

`frontend/screens/portal/services/channels/ChannelsHubScreen.tsx`:
```tsx
<View style={styles.actionRow}>
  <TouchableOpacity style={styles.actionItem} onPress={() => toggleReaction(item)}>
    <Smile size={14} color={colors.textSecondary} />
    <Text style={styles.actionText}>{item.myReaction || '❤️'} {getPostStats(item).reactions}</Text>
  </TouchableOpacity>
  ...
</View>
```

### Validation
- `cd server && go test ./...` — success.
- `cd frontend && npx tsc --noEmit` — success.

## 2026-02-27 (iOS emulator: channels feed no longer forced-empty for offline dev user)

### Changed Files
- `frontend/screens/portal/services/channels/ChannelsHubScreen.tsx`

### Old -> New
- Old:
  - для `user.ID === 999999` (`OFFLINE_DEV_USER_ID`) экран `ChannelsHub` делал ранний `return` без сетевых запросов;
  - результат: в эмуляторе лента и список каналов выглядели пустыми даже при наличии постов на backend.
- New:
  - удален hardcoded offline guard;
  - `loadFeed` и `loadMyChannels` всегда выполняют запросы к API.

### Code Snippet

`frontend/screens/portal/services/channels/ChannelsHubScreen.tsx`:
```ts
// removed:
// if (user?.ID === OFFLINE_DEV_USER_ID) { ... return; }
```

### Validation
- `cd frontend && npx tsc --noEmit` — success.

## 2026-02-27 (iOS Push: fix messaging/unregistered before APNS/FCM token fetch)

### Changed Files
- `frontend/services/notificationService.ts`

### Old -> New
- Old:
  - `getFcmToken()` на iOS вызывал `getAPNSToken()`/`getToken()` без явной проверки/регистрации устройства в remote messages;
  - в некоторых dev/profile сценариях это давало warning/error `[messaging/unregistered] You must be registered for remote messages...`.
- New:
  - добавлен шаг `ensureIosRemoteMessageRegistration()`:
    - проверка `isDeviceRegisteredForRemoteMessages`;
    - `registerDeviceForRemoteMessages` только при необходимости;
  - добавлен `waitForIosApnsToken()` с короткими ретраями для APNS race;
  - добавлен retry-path при `messaging/unregistered` (одна повторная попытка после регистрации).

### Code Snippets

`frontend/services/notificationService.ts`:
```ts
const ensureIosRemoteMessageRegistration = async (messaging: any): Promise<void> => {
  if (Platform.OS !== 'ios') return;
  const alreadyRegistered = !!isDeviceRegisteredForRemoteMessages(messaging);
  if (alreadyRegistered) return;
  await registerDeviceForRemoteMessages(messaging);
};
```

```ts
if (Platform.OS === 'ios') {
  await ensureIosRemoteMessageRegistration(messaging);
  const apnsToken = await waitForIosApnsToken(messaging);
  if (!apnsToken) return null;
}
```

### Validation
- `cd frontend && npx tsc --noEmit` — success.

## 2026-02-26 (Admin TV Series: bypass Next image optimizer for external S3 covers)

### Changed Files
- `admin/src/app/series/page.tsx`

### Old -> New
- Old:
  - карточка сериала рендерила cover через `next/image` оптимизатор (`/_next/image?...`);
  - для части внешних S3 URL это приводило к `400 Bad Request` в админке.
- New:
  - для `series.coverImageURL` включен `unoptimized`, чтобы использовать прямой remote URL без `/_next/image` проксирования.

### Code Snippets

`admin/src/app/series/page.tsx`:
```tsx
<Image
  src={series.coverImageURL}
  alt={series.title}
  width={80}
  height={112}
  unoptimized
  className="w-20 h-28 object-cover rounded-lg"
/>
```

### Validation
- `pnpm -C admin exec tsc --noEmit` — success.

## 2026-02-26 (Union Management: prevent repeated 404 requests for broken avatars)

### Changed Files
- `admin/src/app/dating/page.tsx`

### Old -> New
- Old:
  - при битом `avatarUrl` (например S3 `.../avatars/7_1767761761.jpg` -> `404`) компонент на ререндерах продолжал пытаться загрузить тот же URL;
  - в консоли накапливались повторные `GET ... 404`.
- New:
  - добавлен in-memory blacklist `brokenMediaUrls` на уровне страницы;
  - после первого `onError` URL помечается как broken и повторно не рендерится как `<img>`, вместо него показывается fallback-аватар.

### Code Snippets

`admin/src/app/dating/page.tsx`:
```ts
const [brokenMediaUrls, setBrokenMediaUrls] = useState<Record<string, true>>({});
const markMediaBroken = (url?: string) => {
  if (!url) return;
  setBrokenMediaUrls((prev) => (prev[url] ? prev : { ...prev, [url]: true }));
};
```

```tsx
<img src={avatarUrl} ... onError={() => markMediaBroken(avatarUrl)} />
```

### Validation
- `pnpm -C admin exec tsc --noEmit` — success.

## 2026-02-27 (iOS production version bump for release install)

### Измененные файлы
- `frontend/ios/vedamatch.xcodeproj/project.pbxproj`

### Суть правки (от старого к новому)
- Версия iOS production перед установкой на устройство:
  - Было: `MARKETING_VERSION = 1.1.15`, `CURRENT_PROJECT_VERSION = 7`
  - Стало: `MARKETING_VERSION = 1.1.16`, `CURRENT_PROJECT_VERSION = 8`

### Сниппеты кода

`frontend/ios/vedamatch.xcodeproj/project.pbxproj`:
```pbxproj
MARKETING_VERSION = 1.1.15;
CURRENT_PROJECT_VERSION = 7;
```

```pbxproj
MARKETING_VERSION = 1.1.16;
CURRENT_PROJECT_VERSION = 8;
```

## 2026-02-27 (Channels v1.1: post media upload, comments sheet, edit discoverability)

### Измененные файлы
- `frontend/screens/portal/services/channels/ChannelPostComposerScreen.tsx`
- `frontend/screens/portal/services/channels/ChannelsHubScreen.tsx`
- `frontend/screens/portal/services/channels/ChannelDetailsScreen.tsx`
- `frontend/services/channelService.ts`
- `frontend/services/videoCirclesService.ts`
- `frontend/types/channel.ts`
- `frontend/types/navigation.ts`
- `server/internal/handlers/channel_handler.go`
- `server/internal/services/channel_service.go`
- `server/internal/handlers/video_circle_handler.go`
- `server/internal/services/video_circle_service.go`
- `server/cmd/api/main.go`

### Суть правки (от старого к новому)
- Было:
  - композер поста поддерживал только текст/CTA;
  - в ленте комментарии открывались через `Alert` preview;
  - у автора не было явной точки входа в редактирование поста;
  - backend не имел upload endpoint для фото поста и строгой валидации `mediaJson` (лимиты/принадлежность кружков каналу);
  - `/api/video-circles/my` не поддерживал `channelId/status` фильтры.
- Стало:
  - композер поддерживает `create/edit`, до 5 фото и до 10 кружков, picker кружков + переход в создание кружка;
  - `ChannelsHub` и `ChannelDetails` показывают `⋯` (только автору), action bar и bottom-sheet комментариев с отправкой;
  - backend добавил `POST /api/channels/:id/posts/media/upload` (image/jpeg|png|webp, max 8MB, авто-crop/resize 1080x1350 jpeg);
  - `CreatePost/UpdatePost` валидируют `mediaJson`: `images<=5`, `circles<=10`, уникальные `circle.id`, проверка принадлежности `circle.id` к `channelId`;
  - `/api/video-circles/my` принимает `channelId` и `status`.

### Сниппеты кода

`server/cmd/api/main.go`:
```go
protected.Post("/channels/:id/posts/media/upload", channelHandler.UploadPostMedia)
```

`server/internal/services/channel_service.go`:
```go
func (s *ChannelService) UploadPostMedia(channelID, actorID uint, fileHeader *multipart.FileHeader) (*models.ChannelPostMediaUploadResponse, error)
```

```go
const (
    channelPostMediaMaxBytes = 8 << 20
    channelPostImageWidth    = 1080
    channelPostImageHeight   = 1350
)
```

`frontend/screens/portal/services/channels/ChannelsHubScreen.tsx`:
```tsx
<TouchableOpacity testID={`post-menu-${item.ID}`} onPress={() => openPostMenu(item)}>
  <MoreHorizontal size={16} color={colors.textSecondary} />
</TouchableOpacity>
```

`frontend/screens/portal/services/channels/ChannelPostComposerScreen.tsx`:
```tsx
<Text style={styles.label}>Фото {images.length}/5</Text>
<Text style={styles.label}>Кружки {circles.length}/10</Text>
```

`frontend/services/videoCirclesService.ts`:
```ts
getMyVideoCircles(page, limit, { channelId, status })
```

## 2026-03-01 (Sadhu Sanga Stage B: live runtime moderation)

### Измененные файлы
- `server/internal/models/channel_live.go`
- `server/internal/database/database.go`
- `server/internal/services/channel_service.go`
- `server/internal/handlers/channel_handler.go`
- `server/internal/handlers/channel_handler_test.go`
- `server/cmd/api/main.go`
- `frontend/types/channel.ts`
- `frontend/services/channelService.ts`
- `frontend/screens/portal/services/channels/ChannelDetailsScreen.tsx`

### Суть правки (от старого к новому)
- Было:
  - Stage B поддерживал lifecycle live-сессии и join/leave, но без runtime-модерации участников в канале.
  - В API не было endpoint’ов списка live-участников и moderation action.
  - В RN-экране канала не было UI управления участниками эфира для owner/admin/editor.
- Стало:
  - Добавлена модель `ChannelLiveModeration` (mute/block flags + reason + updatedBy) и DTO для участников live.
  - В backend добавлены API:
    - `GET /api/channels/:id/live/:liveId/participants`
    - `POST /api/channels/:id/live/:liveId/moderation`
  - `JoinLiveSession` учитывает live-block (`IsBlocked`) и возвращает `403` для заблокированного участника.
  - В RN `ChannelDetailsScreen` (режим `sadhu_sanga`) добавлен блок `Участники эфира` с действиями `mute/unmute/block/unblock/kick` для `editor+`.

### Сниппеты кода

`server/cmd/api/main.go`:
```go
protected.Get("/channels/:id/live/:liveId/participants", channelHandler.ListLiveParticipants)
protected.Post("/channels/:id/live/:liveId/moderation", channelHandler.ModerateLiveParticipant)
```

`server/internal/services/channel_service.go`:
```go
var moderation models.ChannelLiveModeration
if err := s.db.Where("session_id = ? AND user_id = ?", session.ID, actorID).First(&moderation).Error; err == nil {
    if moderation.IsBlocked {
        return nil, ErrChannelForbidden
    }
}
```

`frontend/services/channelService.ts`:
```ts
async listChannelLiveParticipants(channelId: number, liveId: number): Promise<ChannelLiveParticipantsResponse>
async moderateChannelLiveParticipant(channelId: number, liveId: number, payload: { targetUserId: number; action: ChannelLiveModerationAction; reason?: string }): Promise<ChannelLiveParticipantsResponse>
```

`frontend/screens/portal/services/channels/ChannelDetailsScreen.tsx`:
```tsx
<TouchableOpacity
  key={`live-participant-${participant.userId}`}
  style={styles.liveParticipantRow}
  onPress={() => openParticipantModerationMenu(participant)}
>
```

### Validation
- `go test ./internal/handlers -run Channel -count=1` — success.
- `go test ./internal/services -run Channel -count=1` — success.
- `pnpm --dir frontend exec tsc --noEmit` — success.

## 2026-03-01 (Sadhu Sanga Stage B: live metrics + audit logging)

### Измененные файлы
- `server/internal/services/metrics_service.go`
- `server/internal/services/channel_service.go`

### Суть правки (от старого к новому)
- Было:
  - в live-сценариях Sadhu Sanga не было отдельных продуктовых счетчиков `sadhu_live_*`;
  - отсутствовал единый audit-log на действия lifecycle/join/moderation.
- Стало:
  - добавлены метрики:
    - `sadhu_live_created_total`
    - `sadhu_live_started_total`
    - `sadhu_live_join_denied_total`
    - `sadhu_live_join_success_total`
    - `sadhu_live_ended_total`
  - live-поток теперь пишет структурированные логи:
    - create/start/end,
    - join_success/join_denied (с reason),
    - moderation action (`mute/unmute/block/unblock/kick`).
  - новые ключи включены в `GetMetricsSnapshot()` канального сервиса.

### Сниппеты кода

`server/internal/services/metrics_service.go`:
```go
MetricSadhuLiveCreatedTotal     = "sadhu_live_created_total"
MetricSadhuLiveStartedTotal     = "sadhu_live_started_total"
MetricSadhuLiveJoinDeniedTotal  = "sadhu_live_join_denied_total"
MetricSadhuLiveJoinSuccessTotal = "sadhu_live_join_success_total"
MetricSadhuLiveEndedTotal       = "sadhu_live_ended_total"
```

`server/internal/services/channel_service.go`:
```go
s.incrementMetricSafe(MetricSadhuLiveJoinDeniedTotal, 1)
log.Printf("[SadhuLive] join_denied channel_id=%d live_id=%d actor_id=%d reason=blocked", channelID, liveID, actorID)
```

```go
log.Printf("[SadhuLive] moderation channel_id=%d live_id=%d actor_id=%d actor_role=%s target_user_id=%d action=%s muted=%t blocked=%t", ...)
```

### Validation
- `go test ./internal/services -run Channel -count=1` — success.
- `go test ./internal/handlers -run Channel -count=1` — success.
- `pnpm --dir frontend exec tsc --noEmit` — success.

## 2026-03-01 (Sadhu Sanga Stage B: live rollout gating)

### Измененные файлы
- `server/internal/services/channel_service.go`

### Суть правки (от старого к новому)
- Было:
  - включение live Stage B определялось только общим флагом `SADHU_SANGA_LIVE_ENABLED`.
- Стало:
  - добавлен user-level rollout для live через системные настройки:
    - `SADHU_SANGA_LIVE_ROLLOUT_ALLOWLIST`
    - `SADHU_SANGA_LIVE_ROLLOUT_DENYLIST`
    - `SADHU_SANGA_LIVE_ROLLOUT_PERCENT`
  - все live-методы используют `IsSadhuSangaLiveEnabledForUser(userID)`.

### Сниппеты кода

`server/internal/services/channel_service.go`:
```go
func (s *ChannelService) IsSadhuSangaLiveEnabledForUser(userID uint) bool {
    denylist := parseUintAllowlist(s.getSystemSettingValue("SADHU_SANGA_LIVE_ROLLOUT_DENYLIST", ""))
    allowlist := parseUintAllowlist(s.getSystemSettingValue("SADHU_SANGA_LIVE_ROLLOUT_ALLOWLIST", ""))
    rolloutPercent := parseChannelIntWithDefault(s.getSystemSettingValue("SADHU_SANGA_LIVE_ROLLOUT_PERCENT", "100"), 100)
    return isUserEnabledByRollout(userID, denylist, allowlist, rolloutPercent)
}
```

### Validation
- `go test ./internal/services -run Channel -count=1` — success.
- `go test ./internal/handlers -run Channel -count=1` — success.

## 2026-03-01 (Sadhu Sanga Stage B: push dedupe smoke-guard)

### Измененные файлы
- `server/internal/services/channel_service.go`
- `server/internal/services/channel_service_test.go`

### Суть правки (от старого к новому)
- Было:
  - live push-рассылка итерировалась по списку membership напрямую;
  - при потенциально неконсистентных данных списка подписчиков теоретически возможны дубли отправки по `user_id`.
- Стало:
  - добавлена функция `uniqueChannelMemberUserIDs(...)` с дедупликацией и пропуском `user_id=0`;
  - `sendLivePushToSubscribers(...)` отправляет push только по уникальному массиву `userIDs`;
  - добавлен тест `TestUniqueChannelMemberUserIDs_DeduplicatesAndSkipsZero` (1k пользователей + дубли) как smoke-check для сценария массовой рассылки без дублей.

### Сниппеты кода

`server/internal/services/channel_service.go`:
```go
userIDs := uniqueChannelMemberUserIDs(subscribers)
for _, userID := range userIDs {
    if err := GetPushService().SendToUser(userID, pushMessage); err != nil {
        ...
    }
}
```

`server/internal/services/channel_service_test.go`:
```go
func TestUniqueChannelMemberUserIDs_DeduplicatesAndSkipsZero(t *testing.T) {
    // 1000 unique + duplicates -> expect exactly 1000 ids
}
```

### Validation
- `go test ./internal/services -run "Channel|UniqueChannelMemberUserIDs" -count=1` — success.

## 2026-03-01 (Sadhu Sanga UI refresh: reference-aligned hub design)

### Измененные файлы
- `frontend/screens/portal/services/channels/SadhuSangaHubScreen.tsx`

### Суть правки (от старого к новому)
- Было:
  - экран `SadhuSangaHub` имел функциональные блоки, но визуально выглядел утилитарно и слабо соответствовал референсу (hero/карточки-возможности/навигационные сценарии).
- Стало:
  - добавлен выразительный hero-блок с CTA;
  - добавлена сетка карточек `Возможности Садху Санга` (эфиры/семинары/вопросы/расписание) с привязкой к текущей логике;
  - добавлена панель быстрых сценариев `Главная/Расписание/Эфиры/Профиль` (без удаления существующих флоу);
  - улучшена визуальная подача карточек проповедников (аватар + типографика + акценты);
  - блок `Умные пуши` сделан сворачиваемым/разворачиваемым для cleaner UX.

### Сниппеты кода

`frontend/screens/portal/services/channels/SadhuSangaHubScreen.tsx`:
```tsx
<View style={styles.heroCard}>
  <Text style={styles.heroTitle}>Пространство общения</Text>
  <TouchableOpacity style={styles.heroActionButton} ...>
    <Text style={styles.heroActionText}>Узнать больше</Text>
  </TouchableOpacity>
</View>
```

```tsx
<View style={styles.featuresGrid}>
  <TouchableOpacity ... onPress={() => openFeatureCard('live')} />
  <TouchableOpacity ... onPress={() => openFeatureCard('seminars')} />
  <TouchableOpacity ... onPress={() => openFeatureCard('qa')} />
  <TouchableOpacity ... onPress={() => openFeatureCard('schedule')} />
</View>
```

```tsx
{item.avatarUrl ? (
  <Image source={{ uri: item.avatarUrl }} style={styles.channelAvatar} />
) : (
  <View style={styles.channelAvatar} />
)}
```

### Validation
- `pnpm --dir frontend exec tsc --noEmit` — success.

## 2026-03-01 (Sadhu Sanga UI: multi-tab scenarios from references)

### Измененные файлы
- `frontend/screens/portal/services/channels/SadhuSangaHubScreen.tsx`

### Суть правки (от старого к новому)
- Было:
  - в `SadhuSangaHub` были только общий hub-флоу и секции home;
  - сценарии из референса `Расписание / Эфиры(архив) / Профиль` не были представлены как отдельные UX-поверхности.
- Стало:
  - добавлены реальные сервисные табы в хабе: `home`, `schedule`, `live`, `profile`;
  - `Расписание`: day chips + карточки событий + CTA «Включить уведомления»;
  - `Эфиры`: блок «Архив лекций» с медиа-карточками и таймкодами;
  - `Профиль`: карточки «Мои подписки / Сохраненные лекции / Мои вопросы / Мой город» + донат-card;
  - сохранена и связана существующая логика (follow/live/join/seminars/smart-push/support), ничего не вырезано.

### Сниппеты кода

`frontend/screens/portal/services/channels/SadhuSangaHubScreen.tsx`:
```tsx
const [activeTab, setActiveTab] = useState<ServiceTab>('home');
```

```tsx
{activeTab === 'schedule' ? <View style={styles.tabPaneWrap}>...</View> : null}
{activeTab === 'live' ? <View style={styles.tabPaneWrap}>...</View> : null}
{activeTab === 'profile' ? <View style={styles.tabPaneWrap}>...</View> : null}
```

### Validation
- `pnpm --dir frontend exec tsc --noEmit` — success.

## 2026-03-01 (Sadhu Sanga UI polish: compact mobile tuning)

### Измененные файлы
- `frontend/screens/portal/services/channels/SadhuSangaHubScreen.tsx`

### Суть правки (от старого к новому)
- Было:
  - после расширения табов интерфейс был визуально «тяжелым» на небольших экранах: слишком крупные заголовки/карточки и потенциальная нехватка вертикальной прокрутки для tab-pane экранов.
- Стало:
  - уменьшены ключевые размеры типографики и карточек для compact mobile-ритма;
  - вкладки `Расписание`, `Эфиры`, `Профиль` обернуты в `ScrollView` с нижним отступом контента;
  - выровнены визуальные пропорции (hero/profile/archive/schedule cards) для лучшей читабельности.

### Сниппеты кода

`frontend/screens/portal/services/channels/SadhuSangaHubScreen.tsx`:
```tsx
<ScrollView contentContainerStyle={styles.tabScrollContent} showsVerticalScrollIndicator={false}>
  <View style={styles.tabPaneWrap}>...</View>
</ScrollView>
```

```ts
headerTitle: { fontSize: 30 }
heroTitle: { fontSize: 30, lineHeight: 34 }
profileName: { fontSize: 34 }
```

### Validation
- `pnpm --dir frontend exec tsc --noEmit` — success.

## 2026-03-01 (Sadhu Sanga hotfix: scroll lock + blue background + missing bottom menu)

### Измененные файлы
- `frontend/screens/portal/services/channels/SadhuSangaHubScreen.tsx`

### Суть правки (от старого к новому)
- Было:
  - из-за структуры контента (крупный верхний блок + локальные скроллы) экран мог не листаться вниз;
  - фоновый градиент давал темно-синий фон «сзади»;
  - отсутствовал фиксированный нижний сервисный бар на экране.
- Стало:
  - введен единый верхнеуровневый `ScrollView` (`mainScroll`) для всей контентной зоны;
  - конфликтные вложенные скроллы убраны, список проповедников в home переведен на map-render внутри общего скролла;
  - фон экрана переведен на ровный `colors.background` (без темно-синего оттенка);
  - добавлен фиксированный нижний бар `Главная/Расписание/Эфиры/Профиль`.

### Сниппеты кода

`frontend/screens/portal/services/channels/SadhuSangaHubScreen.tsx`:
```tsx
<LinearGradient colors={screenGradient} style={styles.gradient}>
```

```tsx
<ScrollView style={styles.mainScroll} contentContainerStyle={styles.mainScrollContent} ...>
```

```tsx
<View style={styles.bottomNavBar}> ... </View>
```

### Validation
- `pnpm --dir frontend exec tsc --noEmit` — success.

## 2026-03-01 (Global @nickname: единый публичный ID пользователя)

### Измененные файлы
- `server/internal/models/user.go`
- `server/internal/services/nickname_service.go`
- `server/internal/handlers/auth_handler.go`
- `server/internal/handlers/user_handler.go`
- `server/internal/models/channel.go`
- `server/internal/services/channel_service.go`
- `server/internal/handlers/channel_handler.go`
- `server/internal/database/database.go`
- `server/cmd/api/main.go`
- `frontend/types/channel.ts`
- `frontend/context/UserContext.tsx`
- `frontend/services/contactService.ts`
- `frontend/services/accountService.ts`
- `frontend/screens/portal/services/channels/ChannelTeamScreen.tsx`
- `frontend/screens/portal/contacts/ContactsScreen.tsx`
- `frontend/screens/portal/contacts/ContactProfileScreen.tsx`
- `frontend/screens/settings/EditProfileScreen.tsx`
- `frontend/screens/RegistrationScreen.tsx`

### Суть правки (от старого к новому)
- Раньше:
  - у пользователя не было единого глобального `@nickname`;
  - добавление участника канала выполнялось только по `userId`;
  - поиск контактов не учитывал username-style идентификатор.
- Сейчас:
  - добавлены поля пользователя `nickname`, `nicknameSetManually`, `nicknameChangedAt`, `nicknameChangeCooldownUntil`;
  - при регистрации nickname назначается автоматически (или валидируется, если передан вручную);
  - добавлен endpoint `PATCH /api/profile/nickname` с cooldown (30 дней) и ошибками `NICKNAME_INVALID/NICKNAME_TAKEN/NICKNAME_COOLDOWN_ACTIVE`;
  - добавлен endpoint `GET /api/users/by-nickname/:nickname`;
  - `GET /api/contacts` ищет также по `nickname`;
  - `POST /api/channels/:id/members` поддерживает альтернативный вход `nickname` (с сохранением `userId` для backward compatibility);
  - RN-компоненты показывают и используют `@nickname` (контакты, профиль, команда канала, регистрационный chip).

### Сниппеты кода

`server/internal/handlers/auth_handler.go`:
```go
func (h *AuthHandler) UpdateNickname(c *fiber.Ctx) error {
  // PATCH /api/profile/nickname
}
```

`server/internal/services/channel_service.go`:
```go
if memberUserID == 0 {
  targetUser, findErr := nicknameService.FindUserByNickname(req.Nickname)
  memberUserID = targetUser.ID
}
```

`frontend/screens/portal/services/channels/ChannelTeamScreen.tsx`:
```tsx
await channelService.addMember(channelId, {
  userId: userId > 0 ? userId : undefined,
  nickname: userId > 0 ? undefined : nicknameCandidate,
  role: memberRoleInput,
});
```

`frontend/screens/settings/EditProfileScreen.tsx`:
```tsx
const nickResponse = await accountService.updateNickname(normalizedNickname);
```

## 2026-03-01 (Channel Team: фикс дергающегося поиска участников)

### Измененные файлы
- `frontend/screens/portal/services/channels/ChannelTeamScreen.tsx`

### Суть правки (от старого к новому)
- Было:
  - поиск участников в блоке `Добавить участника` запускался слишком часто;
  - из-за зависимости `loadingContacts` в `useCallback` и `useEffect` происходили повторные триггеры/перерисовки;
  - UI визуально «дергался», а поиск по `@nickname` работал нестабильно.
- Стало:
  - добавлен debounce ввода (220ms);
  - добавлена защита от гонок запросов через `latestContactsRequestRef`;
  - устаревшие ответы больше не перезаписывают актуальные результаты;
  - очистка таймера и отмена устаревших запросов при unmount/смене строки.

### Сниппеты кода

`frontend/screens/portal/services/channels/ChannelTeamScreen.tsx`:
```tsx
const latestContactsRequestRef = useRef(0);
const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
```

```tsx
searchDebounceRef.current = setTimeout(() => {
  void loadContactsForSearch(normalized);
}, 220);
```

```tsx
if (mountedRef.current && requestId === latestContactsRequestRef.current) {
  setContacts(response.items || []);
}
```

## 2026-03-01 (Sadhu Sanga Schedule: фикс переноса времени в карточке)

### Измененные файлы
- `frontend/screens/portal/services/channels/SadhuSangaScheduleScreen.tsx`

### Суть правки (от старого к новому)
- Было:
  - время в карточке расписания (`09:00`) могло переноситься на две строки из-за узкой колонки времени и крупного жирного шрифта.
- Стало:
  - колонка времени расширена (`78 -> 98`),
  - время рендерится строго в одну строку (`numberOfLines=1` + `adjustsFontSizeToFit`),
  - включены табличные цифры (`fontVariant: ['tabular-nums']`) и выровнен lineHeight.

### Сниппеты кода

`frontend/screens/portal/services/channels/SadhuSangaScheduleScreen.tsx`:
```tsx
<Text style={styles.scheduleTimeMain} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.9}>
  {item.nextAt ? item.nextAt.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }) : '--:--'}
</Text>
```

```ts
scheduleTimeCol: {
  width: 98,
  paddingRight: 12,
},
scheduleTimeMain: {
  fontSize: 22,
  lineHeight: 26,
  fontVariant: ['tabular-nums'],
}
```

## 2026-03-01 (EditProfile: диагностируемое сохранение + серверные trace-логи)

### Измененные файлы
- `frontend/screens/settings/EditProfileScreen.tsx`
- `server/internal/handlers/auth_handler.go`

### Суть правки (от старого к новому)
- Сохранение профиля в RN (`EditProfile`):
  - Было: любая ошибка в цепочке `PUT /update-profile` + `PATCH /profile/nickname` попадала в общий `catch` с generic alert `Failed to update profile`.
  - Стало: добавлен разбор `status/message/url` для ошибок запроса, подробный `console.warn`, и точный текст ошибки в alert.
- Обновление никнейма после успешного обновления профиля:
  - Было: ошибка никнейма ломала весь save flow и показывалась как ошибка профиля.
  - Стало: ошибка никнейма обрабатывается отдельно как warning (профиль сохраняется, пользователю показывается успех + предупреждение по никнейму).
- Серверный endpoint `PUT /api/update-profile`:
  - Было: почти без trace-логов, сложно понять, дошел ли запрос до backend и на каком шаге упал.
  - Стало: добавлены логи `begin/parse_error/unauthorized/user_lookup_failed/save_failed/success` с `X-Request-ID` и `userID`.

### Сниппеты кода

`frontend/screens/settings/EditProfileScreen.tsx`:
```tsx
console.log(`[EditProfile] Saving profile user=${user.ID} endpoint=/update-profile`);
```

```tsx
const message = getRequestErrorMessage(error, 'Failed to update profile');
const statusTag = getRequestStatusTag(error);
const urlTag = typeof error?.config?.url === 'string' ? error.config.url : '/update-profile';
console.warn(`[EditProfile] Error saving profile status=${statusTag} url=${urlTag} user=${user?.ID}: ${message}`);
```

```tsx
catch (nicknameError: any) {
  const nicknameMessage = getRequestErrorMessage(nicknameError, 'Failed to update nickname');
  nicknameWarning = nicknameMessage;
}
```

`server/internal/handlers/auth_handler.go`:
```go
requestID := strings.TrimSpace(c.Get("X-Request-ID"))
log.Printf("[UpdateProfile] begin rid=%s user=%d", requestID, userId)
```

```go
log.Printf("[UpdateProfile] save_failed rid=%s user=%d requested_role=%q err=%v", requestID, userId, updateData.Role, err)
```

```go
log.Printf("[UpdateProfile] success rid=%s user=%d role=%s city=%q", requestID, userId, user.Role, user.City)
```

## 2026-03-01 (Sadhu Sanga: фильтры без ручного ввода через facets picker)

### Измененные файлы
- `server/internal/models/channel.go`
- `server/internal/services/channel_service.go`
- `server/internal/handlers/channel_handler.go`
- `server/internal/handlers/channel_handler_test.go`
- `server/cmd/api/main.go`
- `frontend/types/channel.ts`
- `frontend/services/channelService.ts`
- `frontend/screens/portal/services/channels/SadhuSangaHubScreen.tsx`

### Суть правки (от старого к новому)
- Было:
  - в Sadhu Sanga фильтры `Город/Язык/Тема` были text-input полями;
  - пользователь должен был вводить значения вручную, что создавало ошибки ввода и плохой UX.
- Стало:
  - добавлен backend endpoint `GET /api/channels/sadhu-sanga/facets`, который отдает агрегированные справочники `cities/languages/topics` с `count`;
  - `SadhuSangaHubScreen` заменил ручной ввод на кнопки-селекторы + modal picker с вариантами из facets;
  - поддержаны быстрые сценарии `Все` (сброс фильтра) и `Мой город` (из профиля пользователя).

### Сниппеты кода

`server/cmd/api/main.go`:
```go
protected.Get("/channels/sadhu-sanga/facets", channelHandler.GetSadhuSangaFacets)
```

`server/internal/services/channel_service.go`:
```go
func (s *ChannelService) GetSadhuSangaFacets() (*models.ChannelFacetsResponse, error) {
  // cities from users.city, languages from users.language, topics from tags via channel owners
}
```

`frontend/services/channelService.ts`:
```ts
async getSadhuSangaFacets(): Promise<ChannelFacetsResponse> {
  const response = await apiClient.get('/channels/sadhu-sanga/facets');
  return response.data;
}
```

`frontend/screens/portal/services/channels/SadhuSangaHubScreen.tsx`:
```tsx
<TouchableOpacity
  style={[styles.inlineFilterButton, city && styles.inlineFilterButtonActive]}
  onPress={() => setActiveFacetPicker('city')}
>
  <Text style={[styles.inlineFilterButtonText, city && styles.inlineFilterButtonTextActive]}>
    {city ? formatFacetLabel(city, 'city') : 'Город'}
  </Text>
</TouchableOpacity>
```

```tsx
<Modal visible={activeFacetPicker !== null} transparent animationType="fade">
  <View style={styles.filterModalBackdrop}>
    <View style={styles.filterModalCard}>
      {/* options from facets with count */}
    </View>
  </View>
</Modal>
```

## 2026-03-01 (Sadhu Sanga: Этап C2 — «Дорожная карта проповедника»)

### Измененные файлы
- `server/internal/models/channel_roadmap.go`
- `server/internal/database/database.go`
- `server/internal/services/channel_service.go`
- `server/internal/handlers/channel_handler.go`
- `server/internal/handlers/channel_handler_test.go`
- `server/cmd/api/main.go`
- `frontend/types/channel.ts`
- `frontend/services/channelService.ts`
- `frontend/types/navigation.ts`
- `frontend/screens/portal/services/channels/ChannelDetailsScreen.tsx`
- `frontend/screens/portal/services/channels/ChannelRoadmapManageScreen.tsx`
- `frontend/screens/portal/services/channels/index.ts`
- `frontend/screens/portal/services/index.ts`
- `frontend/App.tsx`

### Суть правки (от старого к новому)
- Было:
  - у канала проповедника не было отдельной «дорожной карты» с точками `был/сейчас/будет`;
  - не было канального API для ручного управления маршрутом.
- Стало:
  - добавлена новая модель `channel_roadmap_points` с координатами/адресом, статусом точки и ручным `position`;
  - добавлен roadmap API (CRUD + `set-current` + `reorder`);
  - добавлено DB-ограничение «ровно одна current точка на канал» через partial unique index;
  - в `ChannelDetailsScreen` (Sadhu Sanga) добавлен публичный блок таймлайна с кнопкой `Открыть на карте`;
  - добавлен отдельный экран `ChannelRoadmapManageScreen` для `owner/admin/editor` с:
    - созданием/редактированием/удалением точек,
    - установкой текущей точки,
    - up/down reorder,
    - подсказками локации через `map/autocomplete`.

### Сниппеты кода

`server/cmd/api/main.go`:
```go
protected.Get("/channels/:id/roadmap", channelHandler.GetRoadmap)
protected.Post("/channels/:id/roadmap", channelHandler.CreateRoadmapPoint)
protected.Patch("/channels/:id/roadmap/:pointId", channelHandler.UpdateRoadmapPoint)
protected.Delete("/channels/:id/roadmap/:pointId", channelHandler.DeleteRoadmapPoint)
protected.Post("/channels/:id/roadmap/:pointId/set-current", channelHandler.SetCurrentRoadmapPoint)
protected.Put("/channels/:id/roadmap/reorder", channelHandler.ReorderRoadmapPoints)
```

`server/internal/database/database.go`:
```go
DB.Exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_channel_roadmap_one_current_per_channel
  ON channel_roadmap_points (channel_id)
  WHERE status = 'current' AND deleted_at IS NULL`)
```

`frontend/services/channelService.ts`:
```ts
async getRoadmap(channelId: number): Promise<ChannelRoadmapResponse> {
  const response = await apiClient.get(`/channels/${channelId}/roadmap`);
  return response.data;
}
```

`frontend/screens/portal/services/channels/ChannelDetailsScreen.tsx`:
```tsx
{isSadhuSangaMode ? (
  <View style={styles.roadmapSection}>
    <Text style={styles.roadmapTitle}>Дорожная карта проповедника</Text>
  </View>
) : null}
```

`frontend/screens/portal/services/channels/ChannelRoadmapManageScreen.tsx`:
```tsx
const response = await mapService.autocomplete(normalized, undefined, undefined, 6);
setLocationSuggestions(parseAutocompleteSuggestions(response));
```

## 2026-03-02 (Sadhu Sanga: фикc скролла ChannelDetails)

### Измененные файлы
- `frontend/screens/portal/services/channels/ChannelDetailsScreen.tsx`

### Суть правки (от старого к новому)
- Было:
  - экран `ChannelDetails` рендерил большие Sadhu Sanga блоки (`live`, `roadmap`, `analytics`, `questions`, `seminars`) как обычные `View` вне основного скролл-контейнера;
  - внизу был отдельный `FlatList` только для постов, из-за чего верхняя часть экрана могла не прокручиваться целиком.
- Стало:
  - контент под header переведен в единый `ScrollView` с `RefreshControl`;
  - список постов рендерится внутри общего scroll-контента;
  - программная прокрутка к секции семинаров переведена с `scrollToOffset(...)` на `scrollTo(...)` для нового контейнера.

### Сниппеты кода

`frontend/screens/portal/services/channels/ChannelDetailsScreen.tsx`:
```tsx
const contentListRef = useRef<ScrollView | null>(null);
```

```tsx
<ScrollView
  ref={(instance) => {
    contentListRef.current = instance;
  }}
  style={styles.contentScroll}
  contentContainerStyle={styles.contentScrollContainer}
  refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.accent} />}
>
```

```tsx
contentListRef.current?.scrollTo({
  y: Math.max(0, seminarsSectionYRef.current - 110),
  animated: true,
});
```

## 2026-03-02 (Sadhu Sanga: правка заголовков секций)

### Измененные файлы
- `frontend/screens/portal/services/channels/ChannelDetailsScreen.tsx`

### Суть правки (от старого к новому)
- Было:
  - заголовки секций отображались как фиксированные: `Вопросы последователей` и `Семинары проповедника`.
- Стало:
  - заголовки стали персонализированными по имени канала:
    - `Вопросы {Название канала}`
    - `Семинары {Название канала}`
  - слово `проповедника` убрано, как требовалось.

### Сниппеты кода

`frontend/screens/portal/services/channels/ChannelDetailsScreen.tsx`:
```tsx
const channelNameLabel = useMemo(() => {
  const title = String(channel?.title || '').trim();
  return title.length > 0 ? title : 'канала';
}, [channel?.title]);
```

```tsx
<Text style={styles.preacherQuestionsTitle}>{`Вопросы ${channelNameLabel}`}</Text>
<Text style={styles.preacherSeminarsTitle}>{`Семинары ${channelNameLabel}`}</Text>
```

## 2026-03-02 (Sadhu Sanga: правка заголовка аналитики)

### Измененные файлы
- `frontend/screens/portal/services/channels/ChannelDetailsScreen.tsx`

### Суть правки (от старого к новому)
- Было:
  - заголовок аналитики отображался как `Аналитика проповедника`.
- Стало:
  - заголовок аналитики персонализирован: `Аналитика {Название канала}`.
  - слово `проповедника` убрано.

### Сниппеты кода

`frontend/screens/portal/services/channels/ChannelDetailsScreen.tsx`:
```tsx
<Text style={styles.preacherAnalyticsTitle}>{`Аналитика ${channelNameLabel}`}</Text>
```

## 2026-03-02 (Sadhu Sanga: правка заголовка дорожной карты)

### Измененные файлы
- `frontend/screens/portal/services/channels/ChannelDetailsScreen.tsx`

### Суть правки (от старого к новому)
- Было:
  - заголовок roadmap отображался как `Дорожная карта проповедника`.
- Стало:
  - заголовок roadmap персонализирован: `Дорожная карта {Название канала}`.
  - слово `проповедника` убрано.

### Сниппеты кода

`frontend/screens/portal/services/channels/ChannelDetailsScreen.tsx`:
```tsx
<Text style={styles.roadmapTitle}>{`Дорожная карта ${channelNameLabel}`}</Text>
```

## 2026-03-02 (Sadhu Sanga: Smart Push — выбор city/language/topics из facets)

### Измененные файлы
- `frontend/screens/portal/services/channels/SadhuSangaSmartPushScreen.tsx`

### Суть правки (от старого к новому)
- Было:
  - в экране `Умные пуши` фильтры аудитории вводились вручную через `TextInput`:
    - `Город`
    - `Язык`
    - `Темы (через запятую)`
- Стало:
  - фильтры переведены на выбор из справочников (`/channels/sadhu-sanga/facets`);
  - для `Город` и `Язык` — single-select modal (`Все`/конкретное значение), для города добавлен быстрый вариант `Мой город`;
  - для `Темы` — multi-select modal (`Все темы` + множественный выбор);
  - выбранные темы отображаются чипами, в payload уходят как массив `topics[]` (без ручного CSV).

### Сниппеты кода

`frontend/screens/portal/services/channels/SadhuSangaSmartPushScreen.tsx`:
```tsx
const [facets, setFacets] = useState<ChannelFacetsResponse>({ cities: [], languages: [], topics: [] });
const [activeFacetPicker, setActiveFacetPicker] = useState<FacetType | null>(null);
```

```tsx
const [preference, facetPayload] = await Promise.all([
  channelService.getSadhuSangaPushPreference(),
  channelService.getSadhuSangaFacets().catch(() => ({ cities: [], languages: [], topics: [] })),
]);
```

```tsx
<TouchableOpacity style={styles.inputRow} onPress={() => setActiveFacetPicker('topic')}>
  <Sparkles size={16} color={colors.textSecondary} />
  <Text style={[styles.inputValue, topics.length === 0 && styles.inputPlaceholder]}>
    {topics.length > 0 ? `Темы выбраны: ${topics.length}` : 'Темы'}
  </Text>
</TouchableOpacity>
```

## 2026-03-02 (Sadhu Sanga: Smart Push — поиск в picker-модалках)

### Измененные файлы
- `frontend/screens/portal/services/channels/SadhuSangaSmartPushScreen.tsx`

### Суть правки (от старого к новому)
- Было:
  - модалки выбора `город/язык/темы` показывали полный список без поиска.
- Стало:
  - в модалках добавлена строка `Поиск`;
  - фильтрация работает по raw-значению и по форматированному отображению;
  - при открытии/закрытии модалки строка поиска сбрасывается.

### Сниппеты кода

`frontend/screens/portal/services/channels/SadhuSangaSmartPushScreen.tsx`:
```tsx
const [facetSearch, setFacetSearch] = useState('');
```

```tsx
const filteredFacetOptions = useMemo(() => {
  const needle = facetSearch.trim().toLowerCase();
  if (!needle) return activeFacetOptions;
  return activeFacetOptions.filter((option) => {
    const raw = String(option.value || '').toLowerCase();
    const pretty = formatFacetLabel(option.value, activeFacetPicker || 'city').toLowerCase();
    return raw.includes(needle) || pretty.includes(needle);
  });
}, [activeFacetOptions, activeFacetPicker, facetSearch]);
```

## 2026-03-02 (Sadhu Sanga: Smart Push — выбранные темы вверху списка)

### Измененные файлы
- `frontend/screens/portal/services/channels/SadhuSangaSmartPushScreen.tsx`

### Суть правки (от старого к новому)
- Было:
  - в модалке выбора `Темы` выбранные и невыбранные элементы шли в общем порядке.
- Стало:
  - при открытой модалке `Темы` выбранные значения сортируются в начало списка;
  - внутри групп сохраняется алфавитная сортировка.

### Сниппеты кода

`frontend/screens/portal/services/channels/SadhuSangaSmartPushScreen.tsx`:
```tsx
if (activeFacetPicker !== 'topic') {
  return base;
}
return [...base].sort((a, b) => {
  const aSelected = selectedTopicsSet.has(a.value) ? 1 : 0;
  const bSelected = selectedTopicsSet.has(b.value) ? 1 : 0;
  if (aSelected !== bSelected) return bSelected - aSelected;
  return a.value.localeCompare(b.value, 'ru');
});
```

## 2026-03-02 (Sadhu Sanga: ChannelDetails — сегменты для читателя)

### Измененные файлы
- `frontend/screens/portal/services/channels/ChannelDetailsScreen.tsx`

### Суть правки (от старого к новому)
- Было:
  - для читателя все секции (`эфир/дорожная карта/вопросы/семинары/посты`) отображались одной длинной лентой на одном экране.
- Стало:
  - добавлены сегменты переключения: `Обзор`, `Эфиры`, `Семинары`, `Вопросы`, `Маршрут`, `Посты`;
  - `Обзор` показывает сокращенные блоки (вопросы/семинары/маршрут/посты), с CTA `Показать все...`;
  - в профильных сегментах показываются полные списки;
  - блок аналитики для Sadhu Sanga оставлен в `Обзоре` (owner/admin).

### Сниппеты кода

`frontend/screens/portal/services/channels/ChannelDetailsScreen.tsx`:
```tsx
type SadhuSection = 'overview' | 'live' | 'seminars' | 'questions' | 'roadmap' | 'posts';
const SADHU_SECTIONS = [
  { key: 'overview', label: 'Обзор' },
  { key: 'live', label: 'Эфиры' },
  { key: 'seminars', label: 'Семинары' },
  { key: 'questions', label: 'Вопросы' },
  { key: 'roadmap', label: 'Маршрут' },
  { key: 'posts', label: 'Посты' },
] as const;
```

```tsx
<ScrollView horizontal contentContainerStyle={styles.sadhuSectionsRow}>
  {SADHU_SECTIONS.map((section) => (
    <TouchableOpacity onPress={() => setActiveSadhuSection(section.key)}>
      <Text>{section.label}</Text>
    </TouchableOpacity>
  ))}
</ScrollView>
```

## 2026-03-02 (Sadhu Sanga: ChannelDetails — sticky CTA для читателя)

### Измененные файлы
- `frontend/screens/portal/services/channels/ChannelDetailsScreen.tsx`

### Суть правки (от старого к новому)
- Было:
  - на экране канала у читателя не было закрепленного главного действия внизу.
- Стало:
  - добавлена sticky-кнопка для читателя (`canFollow`) в Sadhu Sanga:
    - если не подписан: `Подписаться`;
    - если уже подписан: `Открыть расписание` (`SadhuSangaSchedule`).
  - добавлен увеличенный нижний отступ скролла, чтобы кнопка не перекрывала контент.

### Сниппеты кода

`frontend/screens/portal/services/channels/ChannelDetailsScreen.tsx`:
```tsx
const showStickySadhuCta = isSadhuSangaMode && canFollow;
const stickySadhuCtaLabel = channel?.isFollowing ? 'Открыть расписание' : 'Подписаться';
```

```tsx
{showStickySadhuCta ? (
  <View style={styles.stickySadhuCtaWrap}>
    <TouchableOpacity style={styles.stickySadhuCtaButton} onPress={handleStickySadhuCta}>
      <Text style={styles.stickySadhuCtaText}>{stickySadhuCtaLabel}</Text>
    </TouchableOpacity>
  </View>
) : null}
```

## 2026-03-02 (Sadhu Sanga: ChannelDetails — hero-блок и быстрые действия)

### Измененные файлы
- `frontend/screens/portal/services/channels/ChannelDetailsScreen.tsx`

### Суть правки (от старого к новому)
- Было:
  - в верхней карточке канала не было компактного блока статуса с приоритетными действиями;
  - действие `Задать вопрос` дублировалось отдельной кнопкой ниже.
- Стало:
  - добавлен `hero`-блок в intro карточке с динамичным статусом:
    - `LIVE` / `Запланированный эфир` / `Ближайший семинар` / fallback;
  - добавлены быстрые CTA в одном ряду: `Эфир`, `Семинары`, `Вопрос`;
  - удалена дублирующая отдельная кнопка `Задать вопрос проповеднику` для более чистого UI.

### Сниппеты кода

`frontend/screens/portal/services/channels/ChannelDetailsScreen.tsx`:
```tsx
const sadhuHeroStatus = useMemo(() => {
  if (liveSession?.status === 'live') return `LIVE сейчас • ${resolveLiveLanguageLabel(liveSession.broadcastLanguage)}`;
  if (liveSession?.status === 'scheduled' && liveSession.scheduledAt) return `Эфир запланирован: ...`;
  if (nextSeminarPreview?.nextAt) return `Ближайший семинар: ...`;
  return 'Подпишитесь, чтобы получать анонсы эфиров и семинаров';
}, [...]);
```

```tsx
<View style={styles.sadhuHeroActionsRow}>
  <TouchableOpacity onPress={handleSadhuQuickLive}><Text>Эфиры</Text></TouchableOpacity>
  <TouchableOpacity onPress={handleSadhuQuickSeminars}><Text>Семинары</Text></TouchableOpacity>
  <TouchableOpacity onPress={openSadhuQuestionForm}><Text>Вопрос</Text></TouchableOpacity>
</View>
```

## 2026-03-02 (Sadhu Sanga: ChannelDetails — обзор 2x2 вместо длинной простыни)

### Измененные файлы
- `frontend/screens/portal/services/channels/ChannelDetailsScreen.tsx`

### Суть правки (от старого к новому)
- Было:
  - в сегменте `Обзор` одновременно показывались большие секции (`Эфир/Маршрут/Вопросы/Семинары`) и экран оставался визуально длинным.
- Стало:
  - в `Обзоре` добавлена компактная сетка 2x2 `Быстрый доступ`:
    - `Эфир`
    - `Семинары`
    - `Вопросы`
    - `Маршрут`
  - большие секции теперь рендерятся только в профильных сегментах (`Эфиры/Семинары/Вопросы/Маршрут`);
  - `Обзор` стал легче и быстрее для первого касания.

### Сниппеты кода

`frontend/screens/portal/services/channels/ChannelDetailsScreen.tsx`:
```tsx
{isSadhuSangaMode && activeSadhuSection === 'overview' ? (
  <View style={styles.overviewGridSection}>
    <View style={styles.overviewGrid}>
      <TouchableOpacity style={styles.overviewCard} onPress={handleSadhuQuickLive}>...</TouchableOpacity>
      <TouchableOpacity style={styles.overviewCard} onPress={handleSadhuQuickSeminars}>...</TouchableOpacity>
      <TouchableOpacity style={styles.overviewCard} onPress={() => setActiveSadhuSection('questions')}>...</TouchableOpacity>
      <TouchableOpacity style={styles.overviewCard} onPress={() => setActiveSadhuSection('roadmap')}>...</TouchableOpacity>
    </View>
  </View>
) : null}
```

## 2026-03-02 (Sadhu Sanga: Bio Manage UX — modern dates + единый Матх/Организация)

### Измененные файлы
- `frontend/screens/portal/services/channels/ChannelPreacherBioManageScreen.tsx`
- `frontend/screens/portal/services/channels/ChannelDetailsScreen.tsx`

### Суть правки (от старого к новому)
- Было:
  - в экране редактирования био даты вводились вручную строкой `YYYY-MM-DD`;
  - `Организация` и `Матх` были двумя отдельными полями, что дублировало данные;
  - дата ухода всегда была в форме как обычный текстовый input.
- Стало:
  - `Дата рождения`, `Дата ухода`, даты событий переведены на нативный `DatePicker` (модальный выбор даты);
  - добавлен переключатель `Указать / Не указывать` для `Даты ухода`, при `Не указывать` поле скрывается и не отправляется в payload;
  - `Организация / Матх` объединено в одно поле с выбором из существующего списка (fallback: `DATING_TRADITIONS`) + поиск в модальном списке;
  - в `ChannelDetails` объединено отображение в одну строку `Организация / Матх`, чтобы не было дублей.

### Сниппеты кода

`frontend/screens/portal/services/channels/ChannelPreacherBioManageScreen.tsx`:
```tsx
<DatePicker
  modal
  open={openBirthDatePicker}
  date={parseIsoDate(birthDate) || new Date()}
  mode="date"
  maximumDate={new Date()}
  onConfirm={(value) => setBirthDate(toIsoDate(value))}
/>
```

```tsx
<View style={styles.rowBetween}>
  <Text style={styles.label}>Дата ухода</Text>
  <View style={styles.toggleGroup}>
    <TouchableOpacity onPress={() => setHasDepartureDate(true)}><Text>Указать</Text></TouchableOpacity>
    <TouchableOpacity onPress={() => { setHasDepartureDate(false); setDepartureDate(''); }}><Text>Не указывать</Text></TouchableOpacity>
  </View>
</View>
```

```tsx
await channelService.updatePreacherProfile(channelId, {
  organizationName: normalizedOrganizationMath || undefined,
  mathKey: normalizedOrganizationMath || undefined,
  departureDate: hasDepartureDate ? normalizedDepartureDate : undefined,
  ...
});
```

`frontend/screens/portal/services/channels/ChannelDetailsScreen.tsx`:
```tsx
{String(preacherProfile?.organizationName || preacherProfile?.mathKey || '').trim() ? (
  <Text style={styles.preacherBioMetaRow}>
    {`Организация / Матх: ${String(preacherProfile?.organizationName || preacherProfile?.mathKey || '').trim()}`}
  </Text>
) : null}
```

## 2026-03-02 (Sadhu Sanga Bio: явный ISKCON в селекторе организации/матха)

### Измененные файлы
- `frontend/screens/portal/services/channels/ChannelPreacherBioManageScreen.tsx`

### Суть правки (от старого к новому)
- Было:
  - в модальном списке `Организация / Матх` пункт `ISKCON` мог отсутствовать визуально (зависел от facets/fallback).
- Стало:
  - добавлены обязательные варианты `ISKCON`, `ИСККОН`, `ИССКОН`;
  - добавлена приоритетная сортировка, чтобы эти варианты всегда были в верхней части списка.

### Сниппеты кода

`frontend/screens/portal/services/channels/ChannelPreacherBioManageScreen.tsx`:
```tsx
const REQUIRED_MATH_OPTIONS = ['ISKCON', 'ИСККОН', 'ИССКОН'];
const PRIORITY_MATH_ORDER = ['ISKCON', 'ИСККОН', 'ИССКОН'];
```

```tsx
const normalizedMathOptions = Array.from(
  new Set([...REQUIRED_MATH_OPTIONS, ...DEFAULT_MATH_OPTIONS, ...facetMathOptions, profileOrganizationMath].filter(Boolean)),
).sort((a, b) => {
  const rankA = PRIORITY_MATH_ORDER.indexOf(a);
  const rankB = PRIORITY_MATH_ORDER.indexOf(b);
  if (rankA >= 0 && rankB >= 0) return rankA - rankB;
  if (rankA >= 0) return -1;
  if (rankB >= 0) return 1;
  return a.localeCompare(b, 'ru');
});
```

## 2026-03-02 (Profile Madh picker: добавлен ISKCON)

### Измененные файлы
- `frontend/constants/DatingConstants.ts`

### Суть правки (от старого к новому)
- Было:
  - в глобальном списке `DATING_TRADITIONS` отсутствовал явный пункт `ISKCON`, из-за чего в модальном выборе матха на экране профиля не было нужного варианта.
- Стало:
  - в `DATING_TRADITIONS` добавлены варианты `ISKCON`, `ИСККОН`, `ИССКОН`.

### Сниппеты кода

`frontend/constants/DatingConstants.ts`:
```ts
export const DATING_TRADITIONS = [
  'ISKCON',
  'ИСККОН',
  'ИССКОН',
  'Brahma-Madhva-Gaudiya',
  ...
];
```

## 2026-03-02 (Madh options cleanup: оставить только ISKCON)

### Измененные файлы
- `frontend/constants/DatingConstants.ts`
- `frontend/screens/portal/services/channels/ChannelPreacherBioManageScreen.tsx`

### Суть правки (от старого к новому)
- Было:
  - в списках выбора матха одновременно показывались `ISKCON`, `ИСККОН`, `ИССКОН`.
- Стало:
  - оставлен только один вариант: `ISKCON`.

### Сниппеты кода

`frontend/constants/DatingConstants.ts`:
```ts
export const DATING_TRADITIONS = [
  'ISKCON',
  'Brahma-Madhva-Gaudiya',
  ...
];
```

`frontend/screens/portal/services/channels/ChannelPreacherBioManageScreen.tsx`:
```ts
const REQUIRED_MATH_OPTIONS = ['ISKCON'];
const PRIORITY_MATH_ORDER = ['ISKCON'];
```

## 2026-03-02 (Profile save UX + PRO math filters sync)

### Измененные файлы
- `frontend/screens/settings/EditProfileScreen.tsx`
- `server/internal/handlers/portal_blueprints.go`

### Суть правки (от старого к новому)
- Было:
  - переключатель `Режим PRO` в `EditProfile` был интерактивным для всех ролей, но backend разрешает изменение только `admin/superadmin`; это выглядело как "профиль не сохраняется".
  - список фильтров в `PRO` (`/system/god-mode-math-filters`) не полностью совпадал со списком организаций/матхов из пользовательского picker.
- Стало:
  - `Режим PRO` в профиле сделан read-only для не-админов (`disabled`), с подписью `Доступно только администратору`;
  - в payload `update-profile` для не-админов отправляется текущее значение `godModeEnabled`, без ложного локального изменения;
  - backend `defaultMathFilters` синхронизирован: добавлены все элементы из списка mat(h)-picker, включая `ISKCON`, и сохранены существующие org-фильтры.

### Сниппеты кода

`frontend/screens/settings/EditProfileScreen.tsx`:
```tsx
const canManageProMode = user?.role === 'admin' || user?.role === 'superadmin';
...
godModeEnabled: canManageProMode ? godModeEnabled : !!user?.godModeEnabled,
...
<Switch
  value={godModeEnabled}
  onValueChange={setGodModeEnabled}
  disabled={!canManageProMode}
/>
```

`server/internal/handlers/portal_blueprints.go`:
```go
var defaultMathFilters = []MathFilter{
  {MathID: "iskcon", MathName: "ISKCON", ...},
  {MathID: "brahma-madhva-gaudiya", MathName: "Brahma-Madhva-Gaudiya", ...},
  {MathID: "sri-sampradaya-ramanuja", MathName: "Sri Sampradaya (Ramanuja)", ...},
  ...
}
```

## 2026-03-02 (PRO за LKM: тарифы, покупка, экран управления)

### Измененные файлы
- `server/internal/services/pro_service.go`
- `server/internal/handlers/pro_handler.go`
- `server/cmd/api/main.go`
- `server/internal/handlers/auth_handler.go`
- `server/internal/services/metrics_service.go`
- `server/internal/database/seed.go`
- `server/internal/models/feed_v2.go`
- `frontend/services/proService.ts`
- `frontend/screens/settings/ProPlansScreen.tsx`
- `frontend/screens/settings/EditProfileScreen.tsx`
- `frontend/App.tsx`
- `frontend/types/navigation.ts`

### Суть правки (от старого к новому)
- Было:
  - у обычных пользователей не было платежного потока PRO по LKM;
  - в профиле был toggle PRO, который не решал сценарий покупки пакетов;
  - не было публичного API `/api/pro/*` для планов/статуса/покупки.
- Стало:
  - добавлен backend `ProService` с пакетами `pro_7d/pro_30d/pro_90d` и оплатой только regular LKM (`AllowBonus=false`);
  - добавлены endpoint'ы:
    - `GET /api/pro/plans`
    - `GET /api/pro/status`
    - `POST /api/pro/purchase`
  - для `admin/superadmin` PRO бесплатный по роли (покупка блокируется `409 PRO_ALREADY_FREE_BY_ROLE`);
  - добавлен scheduler истечения подписок (`pro_subscription_expiry`, каждые 10 минут) + sync entitlement в `users.god_mode_enabled`;
  - в мобильном приложении добавлен экран `ProPlansScreen` и переход из `EditProfile` (`Управлять PRO`), после покупки entitlement обновляется без relogin.

### Сниппеты кода

`server/internal/handlers/pro_handler.go`:
```go
func (h *ProHandler) GetPlans(c *fiber.Ctx) error { ... }
func (h *ProHandler) GetStatus(c *fiber.Ctx) error { ... }
func (h *ProHandler) Purchase(c *fiber.Ctx) error { ... }
```

`server/cmd/api/main.go`:
```go
services.StartProSubscriptionScheduler(nil)
...
proHandler := handlers.NewProHandler(walletService)
...
protected.Get("/pro/plans", proHandler.GetPlans)
protected.Get("/pro/status", proHandler.GetStatus)
protected.Post("/pro/purchase", proHandler.Purchase)
```

`server/internal/services/pro_service.go`:
```go
spendErr := s.wallet.SpendWithOptions(userID, plan.PriceLKM, dedupKey, description, SpendOptions{AllowBonus: false})
...
if models.IsAdminRole(strings.TrimSpace(strings.ToLower(user.Role))) {
    return nil, ErrProAlreadyFreeByRole
}
```

`frontend/screens/settings/EditProfileScreen.tsx`:
```tsx
<View style={styles.proCard}>
  <Text style={styles.label}>{t('settings.proMode')}</Text>
  {!canManageProMode && (
    <TouchableOpacity onPress={() => navigation.navigate('ProPlans')}>
      <Text>Управлять PRO</Text>
    </TouchableOpacity>
  )}
</View>
```

`frontend/screens/settings/ProPlansScreen.tsx`:
```tsx
const [plans, setPlans] = useState<ProPlan[]>([]);
const [status, setStatus] = useState<ProStatus | null>(null);
...
const result = await proService.purchase(plan.code);
setStatus(result.status);
await login({ ...user, godModeEnabled: !!result.status.isProEffective });
```

## 2026-03-02 (ChannelManage readability: removed dark photo/gradient background)

### Измененные файлы
- `frontend/screens/portal/services/channels/ChannelManageScreen.tsx`

### Суть правки (от старого к новому)
- Было:
  - экран `Управление каналом` рендерился на темном градиенте (`roleTheme.gradient`), из-за чего заголовки и текст секций визуально терялись.
- Стало:
  - обертка экрана переведена с `LinearGradient` на обычный `View` со светлым фоном `#F5F2E8`, контент стал читаемым;
  - убран неиспользуемый `roleTheme` из хука темы.

### Сниппеты кода

`frontend/screens/portal/services/channels/ChannelManageScreen.tsx`:
```tsx
// было
<LinearGradient colors={roleTheme.gradient} style={styles.gradient}>...</LinearGradient>

// стало
<View style={styles.screenBackground}>...</View>
```

```tsx
screenBackground: {
  flex: 1,
  backgroundColor: '#F5F2E8',
}
```

## 2026-03-02 (ChannelManage UX: removed URL fields + fixed cover preview fallback)

### Измененные файлы
- `frontend/screens/portal/services/channels/ChannelManageScreen.tsx`

### Суть правки (от старого к новому)
- Было:
  - в блоке брендирования отображались технические поля `URL аватарки` и `URL обложки` (не нужны конечному пользователю);
  - при ошибке загрузки cover по URL пользователь видел пустой/белый прямоугольник.
- Стало:
  - поля URL полностью убраны из UI;
  - `saveBranding` сохраняет только описание, обложка меняется только через кнопку загрузки;
  - превью обложки стало устойчивым: добавлен cache-busting параметр к URI, обработка `onError/onLoad`, и fallback-плашка с текстом при сбое загрузки.

### Сниппеты кода

`frontend/screens/portal/services/channels/ChannelManageScreen.tsx`:
```tsx
// Убрано из payload:
await channelService.updateBranding(channelId, {
  description: description.trim(),
});
```

```tsx
{coverPreviewUri && !coverPreviewError ? (
  <Image source={{ uri: coverPreviewUri }} onError={() => setCoverPreviewError(true)} ... />
) : (
  <View style={[styles.coverPreview, styles.coverPreviewPlaceholder]}>
    <Text style={styles.coverPreviewPlaceholderText}>...</Text>
  </View>
)}
```

## 2026-03-02 (Calls: заменен mock history на реальные записи звонков)

### Измененные файлы
- `frontend/services/callHistoryService.ts`
- `frontend/screens/calls/CallScreen.tsx`
- `frontend/screens/calls/CallHistoryScreen.tsx`
- `frontend/i18n/locales/ru.ts`
- `frontend/i18n/locales/en.ts`

### Суть правки (от старого к новому)
- Было:
  - `CallHistoryScreen` рендерил статический массив `calls` (mock), не связанный с реальными звонками;
  - `CallScreen` не сохранял историю вызовов.
- Стало:
  - добавлен `callHistoryService` (AsyncStorage key `call_history_v1`) с типизированными записями (`incoming/outgoing/missed`);
  - при завершении звонка `CallScreen` сохраняет запись в историю (тип, имя, `userId`, `durationSec`, время);
  - `CallHistoryScreen` загружает реальные записи из хранилища на фокусе экрана и при pull-to-refresh;
  - для callback-кнопки добавлен guard: кнопка неактивна, если нет валидного `userId`;
  - добавлены i18n-ключи пустого состояния: `calls.empty` (`ru`/`en`).

### Сниппеты кода

`frontend/services/callHistoryService.ts`:
```ts
export const callHistoryService = {
  async getHistory(): Promise<CallHistoryEntry[]> { ... },
  async addEntry(entry: NewCallHistoryEntry): Promise<CallHistoryEntry[]> { ... },
};
```

`frontend/screens/calls/CallScreen.tsx`:
```tsx
const resolvedType: CallHistoryType = isIncoming
  ? (hasAcceptedRef.current ? 'incoming' : 'missed')
  : 'outgoing';

await callHistoryService.addEntry({
  userId: typeof targetId === 'number' ? targetId : undefined,
  name: resolvedName,
  type: resolvedType,
  durationSec,
});
```

`frontend/screens/calls/CallHistoryScreen.tsx`:
```tsx
useFocusEffect(
  React.useCallback(() => {
    void loadCalls();
  }, [loadCalls]),
);

<FlatList
  data={calls}
  onRefresh={() => void loadCalls(true)}
  refreshing={isRefreshing}
/>
```

## 2026-03-02 (Calls: обогащение истории данными из контактов)

### Измененные файлы
- `frontend/screens/calls/CallHistoryScreen.tsx`
- `frontend/i18n/locales/ru.ts`
- `frontend/i18n/locales/en.ts`

### Суть правки (от старого к новому)
- Было:
  - карточка истории звонков показывала только локальные поля (`name`, `time/type`) и иконку-заглушку вместо реального аватара;
  - отсутствовал переход из карточки истории в профиль контакта;
  - не использовались `nickname/lastSeen/city/country` из сервиса контактов.
- Стало:
  - реализован lazy-enrichment по `userId`: `CallHistoryScreen` догружает контакты через `contactService.getUserById` с кешем (`contactsById`) и ограничением параллельности;
  - карточка рендерит реальный аватар (`getMediaUrl(contact.avatarUrl)`), online-dot (порог 5 минут), и подзаголовок `@nickname · online/lastSeen` с fallback на `city/country`;
  - добавлен `onPress` по карточке: переход в `ContactProfile` при наличии валидного `userId`;
  - добавлен i18n ключ `calls.onlineNow` для `ru/en`.

### Сниппеты кода

`frontend/screens/calls/CallHistoryScreen.tsx`:
```tsx
const missingIds = userIds.filter((id) => !(id in contactsByIdRef.current));
...
const chunkResults = await Promise.all(
  chunk.map(async (userId) => {
    const contact = await contactService.getUserById(userId);
    return [userId, contact] as const;
  }),
);
```

```tsx
const enrichedItem: EnrichedCallHistoryItem = {
  ...item,
  displayName: (contact?.spiritualName || contact?.karmicName || item.name || '').trim() || 'User',
  avatarUrl: getMediaUrl(contact?.avatarUrl),
  isOnline: online,
  subtitle: buildSubtitle(contact, online),
};
```

```tsx
<TouchableOpacity
  onPress={() => navigation.navigate('ContactProfile', { userId: item.userId })}
  disabled={!canOpenProfile}
>
```

## 2026-03-02 (Portal header shortcut: Contacts <-> Call History switch)

### Измененные файлы
- `frontend/screens/portal/PortalMainScreen.tsx`
- `frontend/types/portal.ts`

### Суть правки (от старого к новому)
- Было:
  - в режиме сервиса `Контакты` header-кнопка справа открывала меню/историю чатов (`setIsMenuOpen(true)`), что не соответствовало ожидаемой связке `Контакты <-> Звонки`;
  - в режиме сервиса `История звонков` эта же кнопка не возвращала в `Контакты`.
- Стало:
  - добавлен контекстный shortcut в `PortalMainScreen`:
    - если активен `contacts` → иконка `Phone`, переход в `calls`;
    - если активен `calls` → иконка `Contact`, переход в `contacts`;
    - для остальных сервисов сохранен fallback: иконка `MessageSquare` + `setIsMenuOpen(true)`;
  - в grid-header (когда открыт основной портал) иконка меню оставлена `MessageSquare`.
  - сервис `Контакты` в `DEFAULT_SERVICES` продолжает использовать иконку `MessageSquare` (из предыдущего swap).

### Сниппеты кода

`frontend/screens/portal/PortalMainScreen.tsx`:
```tsx
const handleLinkedCallContactPress = useCallback(() => {
  if (activeTab === 'contacts') return setActiveTab('calls');
  if (activeTab === 'calls') return setActiveTab('contacts');
  setIsMenuOpen(true);
}, [activeTab, setIsMenuOpen]);

const LinkedCallContactIcon = activeTab === 'contacts'
  ? Phone
  : activeTab === 'calls'
    ? Contact
    : MessageSquare;
```

`frontend/types/portal.ts`:
```ts
{ id: 'contacts', label: 'Контакты', icon: 'MessageSquare', color: '#3B82F6' },
```

## 2026-03-02 (iOS WebRTC crash fix: avoid enumerateDevices in call flow)

### Измененные файлы
- `frontend/services/webRTCService.ts`

### Суть правки (от старого к новому)
- Было:
  - `startLocalStream()` всегда вызывал `mediaDevices.enumerateDevices()`;
  - на iOS это могло привести к native crash в `WebRTCModule enumerateDevices` (`NSPlaceholderDictionary ... attempt to insert nil object`).
- Стало:
  - для iOS вызов `enumerateDevices()` полностью отключен;
  - `getUserMedia` запускается по `facingMode` без `deviceId`;
  - для non-iOS добавлен `try/catch` вокруг `enumerateDevices` с fallback на constraints без `deviceId`.

### Сниппеты кода

`frontend/services/webRTCService.ts`:
```ts
if (Platform.OS !== 'ios') {
  try {
    const devices = await mediaDevices.enumerateDevices();
    videoSourceId = this.getPreferredVideoSource(devices, isFront);
  } catch (error) {
    console.warn('[WebRTC] enumerateDevices failed, falling back...', error);
    videoSourceId = undefined;
  }
}
```

## 2026-03-02 (Call camera switch fix on real iOS devices)

### Измененные файлы
- `frontend/services/webRTCService.ts`
- `frontend/screens/calls/CallScreen.tsx`

### Суть правки (от старого к новому)
- Было:
  - `CallScreen` переключал камеру только через legacy `track._switchCamera()`;
  - на части реальных iOS устройств/сборок этот метод отсутствовал или не приводил к реальному переключению, UI оставался на прежней/черной камере;
  - при переключении не было fallback-механизма с переинициализацией видеотрека.
- Стало:
  - в `webRTCService` добавлен метод `switchCamera()`:
    - сначала пробует `track._switchCamera()` или `track.switchCamera()`;
    - если не сработало — делает stream-level fallback: перезапрашивает локальный stream с противоположным `facingMode`, заменяет audio/video tracks в `RTCPeerConnection` через `sender.replaceTrack`, обновляет `localStream`;
  - `startLocalStream()` теперь учитывает `isFrontCamera` (а не фиксированно front);
  - `endCall()` сбрасывает состояние камеры на front для следующего звонка;
  - `CallScreen` переключен на `await webRTCService.switchCamera()` и форсирует refresh локального `RTCView` (`key` с `streamVersion`).

### Сниппеты кода

`frontend/services/webRTCService.ts`:
```ts
async switchCamera(): Promise<{ success: boolean; stream?: MediaStream; reason?: string }> {
  const legacySwitchFn = typeof videoTrack._switchCamera === 'function'
    ? videoTrack._switchCamera.bind(videoTrack)
    : typeof videoTrack.switchCamera === 'function'
      ? videoTrack.switchCamera.bind(videoTrack)
      : null;

  if (legacySwitchFn) {
    legacySwitchFn();
    this.isFrontCamera = !this.isFrontCamera;
    return { success: true, stream };
  }

  const nextStream = await this.restartLocalStreamWithFacing(!this.isFrontCamera);
  return { success: true, stream: nextStream };
}
```

`frontend/screens/calls/CallScreen.tsx`:
```tsx
const result = await webRTCService.switchCamera();
...
setStreamVersion(v => v + 1);
...
key={`${localStream.toURL()}-${streamVersion}`}
```

## 2026-03-03 (Union profile crash hotfix: `data.find` on non-array)

### Измененные файлы
- `frontend/screens/portal/dating/EditDatingProfileScreen.tsx`

### Суть правки (от старого к новому)
- Было:
  - при входе в редактирование профиля «Союза» экран загружал данные через `datingService.getUsers()` (`/contacts`);
  - код ожидал массив и выполнял `data.find(...)`;
  - при object-ответе (пагинация) возникал RedBox: `TypeError: data.find is not a function`.
- Стало:
  - экран загружает профиль напрямую через `datingService.getProfile(userId)` (`/dating/profile/:id`);
  - убрана зависимость от формата `/contacts`;
  - добавлен защитный парсинг `intentions` (поддержка CSV-строки и массива).

### Сниппеты кода

`frontend/screens/portal/dating/EditDatingProfileScreen.tsx`:
```tsx
const me = await datingService.getProfile(userId);

const normalizedIntentions = Array.isArray(me.intentions)
  ? me.intentions.map((intention: unknown) => String(intention).trim()).filter(Boolean)
  : typeof me.intentions === 'string'
    ? me.intentions.split(',').map((intention: string) => intention.trim()).filter(Boolean)
    : [];
```

## 2026-03-03 (Channels comments: keyboard-safe composer above iOS keyboard)

### Измененные файлы
- `frontend/screens/portal/services/channels/ChannelsHubScreen.tsx`
- `frontend/screens/portal/services/channels/ChannelDetailsScreen.tsx`

### Суть правки (от старого к новому)
- Было:
  - comments bottom sheet рендерился в `Modal` без `KeyboardAvoidingView`;
  - при фокусе в `TextInput` на iOS клавиатура перекрывала composer, поле ввода частично/полностью уходило под клавиатуру;
  - список комментариев имел фиксированный `maxHeight: 320`, что ухудшало адаптацию по высоте при открытой клавиатуре.
- Стало:
  - comments sheet обернут в `KeyboardAvoidingView` c iOS `behavior='padding'` и safe-area offset (`useSafeAreaInsets`);
  - `FlatList` комментариев переведен на `flex: 1` для адаптивного ресайза вместе с листом;
  - добавлен `keyboardShouldPersistTaps='handled'` у `FlatList`, чтобы тапы по списку/кнопкам не ломали фокусный сценарий ввода.

### Сниппеты кода

`frontend/screens/portal/services/channels/ChannelsHubScreen.tsx`:
```tsx
<KeyboardAvoidingView
  style={styles.commentsKeyboardAvoid}
  behavior={Platform.OS === 'ios' ? 'padding' : undefined}
  keyboardVerticalOffset={Platform.OS === 'ios' ? insets.bottom : 0}
>
  <View style={styles.commentsSheet}>...</View>
</KeyboardAvoidingView>
```

`frontend/screens/portal/services/channels/ChannelDetailsScreen.tsx`:
```tsx
<FlatList
  data={commentsSheetItems}
  style={styles.commentsList}
  keyboardShouldPersistTaps="handled"
  ...
/>
```

## 2026-03-03 (Sadhu Sanga: search-only preacher results + PRO/math bypass consistency)

### Измененные файлы
- `frontend/screens/portal/services/channels/SadhuSangaHubScreen.tsx`
- `frontend/screens/portal/services/channels/SadhuSangaScheduleScreen.tsx`
- `frontend/screens/portal/services/channels/SadhuSangaLiveScreen.tsx`
- `frontend/context/UserContext.tsx`
- `server/internal/services/channel_service.go`

### Суть правки (от старого к новому)
- Было:
  - на `SadhuSangaHub` при вводе в поиск одновременно оставались hero/фичи/эфиры/семинары/рекомендации, из-за чего поиск проповедников визуально терялся;
  - bypass матх-фильтра Sadhu Sanga в сервисе каналов в основном ориентировался на `god_mode_enabled` и `superadmin`, что могло не совпадать с текущим `current_plan` (`pro`) и ролью `admin`;
  - фронт Sadhu-экранов (`Hub/Schedule/Live`) в `isBypassMode` учитывал только `godModeEnabled` и `superadmin`.
- Стало:
  - `SadhuSangaHub` при активном поиске показывает только блок результатов проповедников (hero/фичи/эфиры/семинары/рекомендации скрываются);
  - backend `channel_service` расширил bypass-логику: `admin/superadmin`, `god_mode_enabled`, а также `current_plan` с признаком `pro/admin`;
  - frontend `Hub/Schedule/Live` синхронизирован с этой логикой (`admin` + `currentPlan`), чтобы подсказки и поведение совпадали с серверной фильтрацией;
  - `UserContext` расширен полем `currentPlan` для типобезопасного доступа в RN.

### Сниппеты кода

`frontend/screens/portal/services/channels/SadhuSangaHubScreen.tsx`:
```tsx
const isSearchMode = search.trim().length > 0;

{!isSearchMode ? (
  <>
    <View style={styles.heroCard}>...</View>
    <View style={styles.featuresSection}>...</View>
  </>
) : null}
```

`frontend/screens/portal/services/channels/SadhuSangaHubScreen.tsx`:
```tsx
<Text style={styles.preachersTitle}>
  {isSearchMode ? 'Результаты поиска' : 'Проповедники'}
</Text>
```

`server/internal/services/channel_service.go`:
```go
if models.IsAdminRole(effectiveRole) || viewer.GodModeEnabled || isProPlanBypass(viewer.CurrentPlan) {
  return "", true, false
}
```

`frontend/context/UserContext.tsx`:
```tsx
interface UserProfile {
  ...
  currentPlan?: string;
}
```

## 2026-03-03 (Sadhu Sanga ChannelDetails: removed bottom sticky subscribe CTA)

### Измененные файлы
- `frontend/screens/portal/services/channels/ChannelDetailsScreen.tsx`

### Суть правки (от старого к новому)
- Было:
  - в `Sadhu Sanga` на экране канала дополнительно показывалась нижняя фиксированная кнопка `Подписаться` / `Открыть расписание` поверх контента;
  - из-за дублирования с верхней кнопкой подписки UX выглядел перегруженным.
- Стало:
  - нижняя sticky CTA полностью удалена;
  - осталась только основная кнопка подписки в header-блоке;
  - `ScrollView` вернулся к обычному `contentContainerStyle` без доп. отступа под sticky-кнопку.

### Сниппеты кода

`frontend/screens/portal/services/channels/ChannelDetailsScreen.tsx`:
```tsx
<ScrollView
  ...
  contentContainerStyle={styles.contentScrollContainer}
>
```

```tsx
// Удален блок:
// {showStickySadhuCta ? (
//   <View style={styles.stickySadhuCtaWrap}>...</View>
// ) : null}
```

## 2026-03-03 (Channels comments: reduce gap, composer almost flush to keyboard)

### Измененные файлы
- `frontend/screens/portal/services/channels/ChannelsHubScreen.tsx`
- `frontend/screens/portal/services/channels/ChannelDetailsScreen.tsx`

### Суть правки (от старого к новому)
- Было:
  - после первого keyboard-fix composer оставался слишком высоко над iOS-клавиатурой в comments modal.
- Стало:
  - `KeyboardAvoidingView` переключен с `behavior='padding'` на `behavior='height'`, что убирает лишний вертикальный зазор;
  - контейнер `commentsKeyboardAvoid` получил `flex: 1` + `justifyContent: 'flex-end'`, чтобы sheet прижимался к клавиатуре.

### Сниппеты кода

`frontend/screens/portal/services/channels/ChannelsHubScreen.tsx`:
```tsx
<KeyboardAvoidingView
  style={styles.commentsKeyboardAvoid}
  behavior={Platform.OS === 'ios' ? 'height' : undefined}
  keyboardVerticalOffset={0}
>
```

`frontend/screens/portal/services/channels/ChannelDetailsScreen.tsx`:
```ts
commentsKeyboardAvoid: {
  flex: 1,
  justifyContent: 'flex-end',
},
```

## 2026-03-03 (Channels comments: dynamic keyboard-offset calculation like AI chat)

### Измененные файлы
- `frontend/screens/portal/services/channels/ChannelsHubScreen.tsx`
- `frontend/screens/portal/services/channels/ChannelDetailsScreen.tsx`

### Суть правки (от старого к новому)
- Было:
  - отступ comments sheet от клавиатуры регулировался только `KeyboardAvoidingView` и оставался нестабильным (иногда клавиатура перекрывала composer).
- Стало:
  - добавлен расчет фактической высоты клавиатуры через iOS событие `keyboardWillChangeFrame`;
  - offset вычисляется как `screenHeight - keyboardScreenY` (с fallback на `endCoordinates.height`);
  - comments sheet получает динамический `marginBottom` на основе рассчитанного keyboard-height, поэтому composer поднимается ровно над клавиатурой.

### Сниппеты кода

`frontend/screens/portal/services/channels/ChannelsHubScreen.tsx`:
```tsx
const frameSub = Keyboard.addListener('keyboardWillChangeFrame', updateKeyboardHeight);
...
const keyboardHeight = Math.max(0, screenHeight - screenY);
...
style={[
  styles.commentsKeyboardAvoid,
  commentsKeyboardHeight > 0 ? { marginBottom: Math.max(0, commentsKeyboardHeight - 4) } : null,
]}
```

`frontend/screens/portal/services/channels/ChannelDetailsScreen.tsx`:
```tsx
const [commentsKeyboardHeight, setCommentsKeyboardHeight] = useState(0);
...
const hideSub = Keyboard.addListener('keyboardWillHide', () => setCommentsKeyboardHeight(0));
```

## 2026-03-03 (Portal header menu bar: remove top glass background)

### Измененные файлы
- `frontend/screens/portal/PortalMainScreen.tsx`

### Суть правки (от старого к новому)
- Было:
  - `ScreenScaffold` в `PortalMainScreen` рендерил верхний `headerGlass` слой с `vTheme.colors.topBar`.
  - Визуально у menu bar в шапке оставалась фоновая подложка.
- Стало:
  - Для `ScreenScaffold` в обоих режимах `PortalMainScreen` (`grid` и `active service`) передан `headerStyle` с прозрачным фоном и прозрачной нижней границей.
  - Фон menu bar header убран, шапка стала без верхней подложки.

### Сниппеты кода

`frontend/screens/portal/PortalMainScreen.tsx`:
```tsx
<ScreenScaffold
  variant="portal"
  enableAura={!useClassicWallpaper}
  transparentBackground={useClassicWallpaper}
  headerStyle={{ backgroundColor: 'transparent', borderBottomColor: 'transparent' }}
>
```

## 2026-03-03 (Education service: disable photo wallpaper in portal shell)

### Измененные файлы
- `frontend/screens/portal/PortalMainScreen.tsx`

### Суть правки (от старого к новому)
- Было:
  - экран сервиса `education` использовал тот же `PortalBackgroundLayer`, что и остальные встроенные сервисы;
  - при `portalBackgroundType='image'` в шапке сервиса показывалось фото-обои;
  - цвет иконок хедера выбирался как для фото-фона (`useLightHeaderIcons`), что привязывало UI к обоям.
- Стало:
  - для активного таба `education` фон принудительно переключается на однотонный (`color`) с `vTheme.colors.background`;
  - `slideshow`/`activeWallpaper` для этого таба отключены;
  - иконки service-header в `education` используют обычную (не photo/light) палитру через `useLightServiceHeaderIcons=false`.

### Сниппеты кода

`frontend/screens/portal/PortalMainScreen.tsx`:
```tsx
const isEducationTabActive = activeTab === 'education';
const serviceLayerBackgroundType = isEducationTabActive ? 'color' : layerBackgroundType;
const serviceLayerBackground = isEducationTabActive ? vTheme.colors.background : layerBackground;
const serviceLayerActiveWallpaper = isEducationTabActive ? '' : layerActiveWallpaper;
const serviceLayerSlideshowEnabled = isEducationTabActive ? false : layerSlideshowEnabled;
const useLightServiceHeaderIcons = isEducationTabActive ? false : useLightHeaderIcons;
```

```tsx
<PortalBackgroundLayer
  portalBackgroundType={serviceLayerBackgroundType}
  portalBackground={serviceLayerBackground}
  activeWallpaper={serviceLayerActiveWallpaper}
  isSlideshowEnabled={serviceLayerSlideshowEnabled}
  ...
/>
```

## 2026-03-04 (Ads: новый Festival-раздел с гибридным календарем Ads + Sadhu Sanga)

### Измененные файлы
- `server/cmd/api/main.go`
- `server/internal/models/ad.go`
- `server/internal/database/database.go`
- `server/internal/handlers/ads_handler.go`
- `server/internal/handlers/ads_handler_test.go`
- `server/internal/services/service_service.go`
- `server/internal/services/channel_service.go`
- `frontend/types/ads.ts`
- `frontend/services/adsService.ts`
- `frontend/components/ads/FestivalSectionSwitch.tsx`
- `frontend/components/ads/FestivalMonthCalendar.tsx`
- `frontend/components/ads/FestivalAgendaList.tsx`
- `frontend/components/ads/FestivalPreacherPickerModal.tsx`
- `frontend/components/ads/FestivalServicePickerModal.tsx`
- `frontend/screens/portal/ads/AdsScreen.tsx`
- `frontend/screens/portal/ads/CreateAdScreen.tsx`
- `frontend/screens/portal/ads/AdDetailScreen.tsx`
- `frontend/i18n/locales/ru.ts`
- `frontend/i18n/locales/en.ts`
- `admin/src/app/ads/page.tsx`

### Суть правки (от старого к новому)
- Было:
  - Ads работал только как list/filters объявлений без отдельного календарного режима фестивалей;
  - event-объявления не имели структурированных festival-полей (start/end/timezone/organizer/venue/preachers/linked services);
  - не было единого backend-агрегатора `Ads + Sadhu Sanga` с дедупом по `linkedServiceIds`;
  - в админке отсутствовали сортировка по дате фестиваля и индикатор количества проповедников.
- Стало:
  - добавлен гибридный API фестивалей:
    - `GET /api/ads/festivals/calendar`
    - `GET /api/ads/festivals`
    с фильтрами `month/date, city, search, preacherChannelId, includeSadhu, myOnly`;
  - `POST/PUT /api/ads` и `GET /api/ads/:id` расширены festival-полями и `resolvedPreachers`;
  - event-поля валидируются: обязательный `festivalStartAt` для `category=events`, проверка диапазона дат, ограничение массивов `preacherChannelIds/linkedServiceIds`;
  - добавлен гибридный merge Ads + Sadhu Service occurrences с приоритетом Ads (дедуп виртуальных sadhu-элементов, если ad покрывает linked occurrence);
  - RN Ads получил переключатель секций `Объявления | Фестивали`, Month-календарь и Agenda-список;
  - Create/Edit Ads для `events` получил festival-блок: date-time, organizer/venue, manual preachers picker и linked services picker;
  - Ad Detail для event выводит блоки «О фестивале» и «Проповедники»;
  - админка Ads показывает `festivalStartAt`, count `resolvedPreachers` и sort по festival date.

### Сниппеты кода

`server/cmd/api/main.go`:
```go
api.Get("/ads/festivals/calendar", middleware.OptionalAuth(), adsHandler.GetFestivalCalendar)
api.Get("/ads/festivals", middleware.OptionalAuth(), adsHandler.GetFestivals)
```

`server/internal/handlers/ads_handler.go`:
```go
func (h *AdsHandler) GetFestivals(c *fiber.Ctx) error {
  _, rangeStart, rangeEnd, err := parseFestivalDateRange(c.Query("date"))
  ...
  items, err := h.buildFestivalItems(c, rangeStart, rangeEnd, ...)
  return c.JSON(models.FestivalListResponse{Items: items[offset:end], Total: total, ...})
}
```

`server/internal/services/service_service.go`:
```go
func (s *ServiceService) ListFestivalOccurrences(filters FestivalServiceOccurrenceFilters) ([]FestivalServiceOccurrence, error) {
  // active services + format=event + schedules -> occurrence list (specificDate/dayOfWeek)
}
```

`frontend/screens/portal/ads/AdsScreen.tsx`:
```tsx
<FestivalSectionSwitch mode={sectionMode} onChange={setSectionMode} />
{sectionMode === 'festivals' ? (
  <>
    <FestivalMonthCalendar ... />
    <FestivalAgendaList items={festivalItems} ... />
  </>
) : (
  <FlatList ... />
)}
```

`frontend/screens/portal/ads/CreateAdScreen.tsx`:
```tsx
{category === 'events' && (
  <View>
    <DatePicker modal open={startPickerOpen} ... />
    <FestivalPreacherPickerModal ... />
    <FestivalServicePickerModal ... />
  </View>
)}
```

## 2026-03-04 (Sattva Cafe: оптимизация ререндеров списка и хедера)

### Измененные файлы
- `frontend/screens/portal/cafe/CafeListScreen.tsx`

### Суть правки (от старого к новому)
- Было:
  - при переключении `Рейтинг/Популярные/Новые` происходили лишние ререндеры из-за двойного обновления `filters` и пересоздания тяжелых UI-узлов;
  - карточки кафе ререндерились на любые изменения в родителе (поиск/сортировка/пагинация);
  - `FlatList` не использовал базовые настройки виртуализации для снижения нагрузки.
- Стало:
  - основной список кафе переведен с `FlatList` на `FlashList` (`@shopify/flash-list`) с `estimatedItemSize/drawDistance`;
  - сортировка теперь обновляет состояние один раз и игнорирует повторный клик по уже активному фильтру;
  - горизонтальный сорт-блок заменен с вложенного `FlatList` на обычный `View + map` (3 элемента), чтобы убрать лишнюю виртуализацию;
  - добавлен debounce поиска `350ms` (при вводе), плюс мгновенный submit без ожидания таймера;
  - изображения карточек (`cover/logo`) переведены на `react-native-fast-image` с immutable cache;
  - карточка вынесена в `React.memo` (`CafeCard`) c compare-функцией для пропсов;
  - хедер списка стабилизирован через `useMemo`, обработчики через `useCallback`;
  - при reset-запросах `loading` включается только когда список пуст, без лишних state-триггеров на уже загруженном экране.

### Сниппеты кода

`frontend/screens/portal/cafe/CafeListScreen.tsx`:
```tsx
const CafeCard = React.memo<CafeCardProps>(..., (prevProps, nextProps) => (
  prevProps.item === nextProps.item &&
  prevProps.styles === nextProps.styles &&
  prevProps.accentColor === nextProps.accentColor &&
  prevProps.textSecondaryColor === nextProps.textSecondaryColor &&
  prevProps.deliveryLabel === nextProps.deliveryLabel &&
  prevProps.minLabel === nextProps.minLabel &&
  prevProps.onPress === nextProps.onPress
));
```

```tsx
const handleSortChange = useCallback((sort: CafeSortType) => {
  const currentSort = filters.sort ?? 'rating';
  if (currentSort === sort) return;

  setFilters(prev => ({ ...prev, sort, page: 1 }));
  loadCafes(true, { sort, page: 1 });
}, [filters.sort, loadCafes]);
```

```tsx
const handleSearchInput = useCallback((text: string) => {
  setSearch(text);
  if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
  searchDebounceRef.current = setTimeout(() => triggerSearch(text), 350);
}, [triggerSearch]);
```

```tsx
<FastImage
  source={{ uri: item.coverUrl, cache: FastImage.cacheControl.immutable }}
  resizeMode={FastImage.resizeMode.cover}
  style={styles.cardImage}
/>
```

```tsx
<FlashList
  data={cafes}
  renderItem={renderCafeCard}
  ListHeaderComponent={fullHeaderComponent}
  estimatedItemSize={208}
  drawDistance={900}
  onRefresh={handleRefresh}
  refreshing={refreshing}
  ...
/>
```

```tsx
<View style={styles.sortList}>
  {sortOptions.map(item => (
    <TouchableOpacity key={item.type} onPress={() => handleSortChange(item.type)}>
      ...
    </TouchableOpacity>
  ))}
</View>
```

## 2026-03-04 (Cafe crash fix on iOS old architecture: FlashList v2 -> FlatList fallback)

### Измененные файлы
- `frontend/screens/portal/cafe/CafeListScreen.tsx`

### Суть правки (от старого к новому)
- Было:
  - основной список кафе использовал `FlashList` v2;
  - на iOS со старой архитектурой экран падал с ошибкой: `FlashList v2 is only supported on new architecture`.
- Стало:
  - список возвращен на `FlatList` с виртуализацией (`removeClippedSubviews`, `initialNumToRender`, `maxToRenderPerBatch`, `windowSize`, `updateCellsBatchingPeriod`);
  - остальные оптимизации сохранены (`React.memo` карточек, debounce поиска, `FastImage` cache).

### Сниппеты кода

`frontend/screens/portal/cafe/CafeListScreen.tsx`:
```tsx
import { FlatList } from 'react-native';
// import { FlashList } from '@shopify/flash-list'; // removed
```

```tsx
<FlatList
  data={cafes}
  renderItem={renderCafeCard}
  ListHeaderComponent={fullHeaderComponent}
  removeClippedSubviews
  initialNumToRender={6}
  maxToRenderPerBatch={8}
  windowSize={7}
  updateCellsBatchingPeriod={50}
  ...
/>
```

## 2026-03-04 (Cafe rerender reduction: local search state + no full-screen reload after initial load)

### Измененные файлы
- `frontend/screens/portal/cafe/CafeListScreen.tsx`

### Суть правки (от старого к новому)
- Было:
  - поле поиска было контролируемым state родительского `CafeListScreen`, из-за чего весь экран пересчитывался на каждый ввод символа;
  - при `reset`-запросах на пустом списке снова включался глобальный `loading`, что визуально давало “полное обновление экрана”;
  - даже когда `page` уже `1`, выполнялся лишний `setFilters`.
- Стало:
  - поиск вынесен в локальный memo-компонент `CafeSearchInput` со своим state и debounce; родитель обновляется только по commit (debounce/submit/clear);
  - глобальный full-screen loader показывается только до завершения первого запроса (`initialLoadCompleted`);
  - обновление `filters.page` выполняется только если страница действительно меняется.

### Сниппеты кода

`frontend/screens/portal/cafe/CafeListScreen.tsx`:
```tsx
const [initialLoadCompleted, setInitialLoadCompleted] = useState(false);
...
if (reset && isMountedRef.current && !initialLoadCompleted) {
  setLoading(true);
}
...
if (!initialLoadCompleted) setInitialLoadCompleted(true);
```

```tsx
const CafeSearchInput = React.memo((...) => {
  const [value, setValue] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  ...
  debounceRef.current = setTimeout(() => commitSearch(text), 350);
});
```

```tsx
{loading && !initialLoadCompleted ? (
  <ActivityIndicator ... />
) : (
  <FlatList ... />
)}
```

## 2026-03-04 (Default Quick Access: Contacts + Calls + AI Chat)

### Changed Files
- `frontend/types/portal.ts`
- `frontend/constants/portalRoles.ts`
- `server/internal/handlers/portal_blueprints.go`

### Old -> New
- Old default quick access on install could resolve to non-target combinations (e.g. `calls/services/rooms` or role-specific shortcuts from blueprint).
- New default quick access on install is unified to:
  - `contacts`
  - `calls`
  - `services` (AI-chat shortcut)

### Code Snippets

`frontend/types/portal.ts`:
```ts
export const DEFAULT_QUICK_ACCESS_SERVICE_IDS = ['contacts', 'calls', 'services'] as const;
```

`frontend/constants/portalRoles.ts`:
```ts
quickAccess: ['contacts', 'calls', 'services'],
```

`server/internal/handlers/portal_blueprints.go`:
```go
QuickAccess: []string{"contacts", "calls", "services"},
```

### Validation
- Frontend typecheck attempt:
  - `npx tsc --noEmit -p tsconfig.json` -> fails on pre-existing unrelated `FlashList` typing in `frontend/screens/portal/cafe/CafeListScreen.tsx` (`columnWrapperStyle`).
- Frontend targeted test attempt:
  - `npx jest __tests__/services/portalLayoutService.test.ts --runInBand --watchman=false` -> fails due pre-existing RN test env mock issue (`NativeEventEmitter requires a non-null argument` from `react-native-device-info` import chain).
- Server package test attempt:
  - `go test ./internal/handlers/...` -> fails on pre-existing integration tests/auth & env-dependent cases, unrelated to quick-access constant change.

## 2026-03-04 (iOS Push: remove manual RNFirebase registration warning + reduce entitlement log noise)

### Измененные файлы
- `frontend/services/notificationService.ts`

### Суть правки (от старого к новому)
- iOS FCM registration flow:
  - Было: сервис вызывал `registerDeviceForRemoteMessages()` через `ensureIosRemoteMessageRegistration()`, что в текущей конфигурации auto-registration давало warning `Usage of ... is not required`.
  - Стало: ручная регистрация удалена; используется только стандартный auto-registration путь RNFirebase.
- Шум логов при отсутствии push-entitlement:
  - Было: warning про `aps-environment` и `APNS token unavailable` мог повторяться при каждом запуске.
  - Стало: эти warning-сообщения ограничены одноразовым выводом за сессию (`hasLoggedMissingApsEntitlement`, `hasLoggedApnsUnavailable`), telemetry сохраняется.
- Поведение при `messaging/unregistered`:
  - Было: выполнялся retry с ручной регистрацией девайса для remote messages.
  - Стало: ручной retry удален, событие маркируется как `token_register_skipped: messaging_unregistered` без лишнего шума.

### Сниппеты кода

`frontend/services/notificationService.ts`:
```ts
// removed imports
// registerDeviceForRemoteMessages,
// isDeviceRegisteredForRemoteMessages,
```

```ts
if (Platform.OS === 'ios') {
  const apnsToken = await waitForIosApnsToken(messaging);
  if (!apnsToken) {
    if (!hasLoggedApnsUnavailable) {
      hasLoggedApnsUnavailable = true;
      console.warn('[NotificationService] APNS token unavailable on iOS; skipping FCM token request. Check push capability/profile if this persists.');
    }
    logPushTelemetry('token_register_skipped', { reason: 'apns_token_unavailable' });
    return null;
  }
}
```

```ts
if (isMissingApsEnvironmentEntitlement(error)) {
  if (!hasLoggedMissingApsEntitlement) {
    hasLoggedMissingApsEntitlement = true;
    console.warn('[NotificationService] FCM token unavailable: missing aps-environment entitlement in current iOS signing profile.');
  }
  logPushTelemetry('token_register_skipped', { reason: 'missing_aps_environment' });
  return null;
}
```

## 2026-03-04 (Ads Festivals: graceful fallback when feed/facets endpoints return 404)

### Измененные файлы
- `frontend/services/adsService.ts`
- `frontend/screens/portal/ads/AdsScreen.tsx`

### Суть правки (от старого к новому)
- Было:
  - при открытии режима `Фестивали -> Лента` клиент вызывал `/api/ads/festivals/feed` и `/api/ads/festivals/facets`;
  - если backend еще не обновлен и отвечает `404`, в dev-режиме появлялся `Console Error`/redbox (`Failed to load festival feed ... 404`).
- Стало:
  - `adsService.getFestivalFeed()` при `404` автоматически делает fallback на `/api/ads/festivals?date=today`;
  - `adsService.getFestivalFacets()` при `404` делает fallback на `/api/ads/cities`;
  - в `AdsScreen` для ожидаемых `404` убран `console.error`, вместо этого используется тихий fallback (пустые данные) без падения экрана.

### Сниппеты кода

`frontend/services/adsService.ts`:
```ts
if (error?.response?.status === 404) {
  const today = new Date().toISOString().slice(0, 10);
  const fallbackResponse = await apiClient.get('/ads/festivals', { params: { date: today, ... } });
  return fallbackResponse.data;
}
```

`frontend/screens/portal/ads/AdsScreen.tsx`:
```ts
if (status === 404) {
  setFestivalFeedItems([]);
  setFestivalFeedHasMore(false);
} else {
  console.warn('Failed to load festival feed', error?.message || error);
}
```

## 2026-03-04 (Ads Festivals: created festival not visible in feed)

### Измененные файлы
- `frontend/services/adsService.ts`
- `frontend/screens/portal/ads/AdsScreen.tsx`

### Суть правки (от старого к новому)
- Было:
  - дефолтный период фестивальной ленты был `30d`;
  - при отсутствии `/api/ads/festivals/feed` fallback был на `/api/ads/festivals?date=today`, поэтому будущие фестивали после создания могли не отображаться.
- Стало:
  - дефолт периода в ленте изменен на `upcoming`;
  - fallback `getFestivalFeed` при `404` теперь берет `category=events` из обычного Ads API и строит фестивальные карточки на клиенте с фильтрацией по периоду/источнику;
  - новый фестиваль появляется в ленте сразу после создания (если он в будущем).

### Сниппеты кода

`frontend/screens/portal/ads/AdsScreen.tsx`:
```ts
const DEFAULT_PERIOD: FestivalFeedPeriod = 'upcoming';
```

`frontend/services/adsService.ts`:
```ts
const adsResponse = await this.getAds({ category: 'events', status: 'active', ... });
const filtered = (adsResponse.ads || []).map(mapAdToFestivalItem).filter(...period/source...);
return { items, total, page, totalPages };
```

## 2026-03-04 (Ads FAB in Festivals mode opens CreateAd with events preset)

### Измененные файлы
- `frontend/types/navigation.ts`
- `frontend/screens/portal/ads/AdsScreen.tsx`
- `frontend/screens/portal/ads/CreateAdScreen.tsx`

### Суть правки (от старого к новому)
- Было:
  - FAB `+` в разделе `Фестивали` всегда открывал универсальный `CreateAd` без пресета категории;
  - пользователь попадал в обычное создание объявления (default `goods`), а не фестиваля.
- Стало:
  - в режиме `sectionMode === 'festivals'` FAB передает `initialCategory: 'events'` в `CreateAd`;
  - `CreateAdScreen` применяет этот пресет для нового объявления (не для edit по `adId`).

### Сниппеты кода

`frontend/screens/portal/ads/AdsScreen.tsx`:
```tsx
onPress={() => navigation.navigate('CreateAd', sectionMode === 'festivals' ? { initialCategory: 'events' } : undefined)}
```

`frontend/screens/portal/ads/CreateAdScreen.tsx`:
```tsx
const initialCategory = route.params?.initialCategory;
if (!adId && initialCategory === 'events') {
  setCategory('events');
}
```

## 2026-03-04 (Festival create UX: hide category chooser, keep only Events)

### Измененные файлы
- `frontend/screens/portal/ads/CreateAdScreen.tsx`

### Суть правки (от старого к новому)
- Было:
  - при открытии формы из вкладки `Фестивали` пользователь видел общий `CategoryPills` со всеми категориями (`Все`, `Йога`, `Аюрведа` и т.д.).
- Стало:
  - если форма открыта как `festival preset` (`initialCategory='events'` и это создание, не edit), общий `CategoryPills` скрывается;
  - отображается только фиксированная категория `Мероприятия`.

### Сниппеты кода

`frontend/screens/portal/ads/CreateAdScreen.tsx`:
```tsx
const isFestivalPresetCreate = !adId && initialCategory === 'events';

{isFestivalPresetCreate ? (
  <View ...><Text ...>{t('ads.categories.events')}</Text></View>
) : (
  <CategoryPills ... />
)}
```

## 2026-03-04 (RuStore legal links: public web pages without auth gate)

### Измененные файлы
- `admin/src/components/AdminLayout.tsx`
- `admin/src/app/terms/page.tsx`
- `admin/src/app/privacy/page.tsx`
- `admin/src/app/delete-account/page.tsx`

### Суть правки (от старого к новому)
- Было:
  - `https://vedamatch.ru/terms`, `https://vedamatch.ru/privacy`, `https://vedamatch.ru/delete-account` на проде не имели публичных страниц;
  - legal URL могли попадать под общий auth-gate admin layout.
- Стало:
  - добавлены публичные Next.js страницы `/terms`, `/privacy`, `/delete-account` с RU-контентом и canonical URL;
  - в `AdminLayout` legal роуты вынесены в публичный allowlist и не редиректятся на `/login` для гостя;
  - проверка маршрутов усилена: учитываются как точные пути, так и варианты с хвостом (`/terms/...`).

### Сниппеты кода

`admin/src/components/AdminLayout.tsx`:
```ts
const publicLegalRoutes = ['/terms', '/privacy', '/delete-account'];
const isPublicLegalRoute = (path: string): boolean =>
  publicLegalRoutes.some((route) => path === route || path.startsWith(`${route}/`));
```

```ts
const isGuestAllowedRoute = pathname === '/feed-posts' || isPublicLegalRoute(pathname);
...
const isPublicRoute = ... || isPublicLegalRoute(pathname);
```

`admin/src/app/terms/page.tsx` (аналогично для `privacy`/`delete-account`):
```ts
export const metadata: Metadata = {
  title: 'Условия использования | VedaMatch',
  alternates: { canonical: 'https://vedamatch.ru/terms' },
};
```

## 2026-03-04 (Account deletion hardening: revoke session enforced for access tokens)

### Измененные файлы
- `server/internal/middleware/auth.go`

### Суть правки (от старого к новому)
- Было:
  - после `DELETE /account` refresh-сессии помечались как revoked, но `Protected()` проверял только валидность JWT;
  - access token мог оставаться рабочим до истечения `exp` (по умолчанию до 15 минут), даже если сессия уже отозвана.
- Стало:
  - `Protected()` теперь дополнительно валидирует `sessionId` из JWT по таблице `auth_sessions` (`revoked_at IS NULL` и `expires_at > now`);
  - отозванная/просроченная сессия немедленно дает `401 Session revoked`;
  - `OptionalAuth()` также игнорирует контекст пользователя при неактивной сессии.

### Сниппеты кода

`server/internal/middleware/auth.go`:
```go
func isActiveAuthSession(userID uint, sessionID uint) (bool, error) {
  return count > 0, nil
}
```

```go
if claims.SessionID > 0 {
  active, sessionErr := isActiveAuthSession(claims.UserID, claims.SessionID)
  if !active {
    return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Session revoked"})
  }
}
```

## 2026-03-04 (RuStore UGC moderation fast-track: report via support ticket + legal/support contacts)

### Измененные файлы
- `server/internal/handlers/support_handler.go`
- `frontend/components/chat/ChatInput.tsx`
- `frontend/screens/ChatScreen.tsx`
- `frontend/types/navigation.ts`
- `frontend/services/supportService.ts`
- `frontend/screens/support/SupportTicketFormScreen.tsx`
- `frontend/screens/support/SupportHomeScreen.tsx`
- `admin/src/app/terms/page.tsx`
- `admin/src/app/privacy/page.tsx`
- `docs/store-submission-packet-p0.md`
- `docs/store-console-field-by-field-wave1.md`

### Суть правки (от старого к новому)
- Было:
  - пункт `Пожаловаться` присутствовал в chat menu, но был отключен (`isImplemented` не включал `contacts.report`);
  - `SupportTicketForm` не принимал/не отправлял UGC report metadata;
  - backend `POST /api/support/tickets` не валидировал `abuse_report` payload и не сохранял report fields в `meta_json`;
  - admin list `/api/admin/support/conversations` не имел фильтра `entryPoint`;
  - legal тексты были общими, без явного перечисления prohibited UGC категорий и отдельного privacy-блока по модерации.
- Стало:
  - `contacts.report` активирован в UI и из личного чата открывает `SupportTicketForm` с `entryPoint=abuse_report` + `reportType=user` + `reportedUserId`;
  - `SupportTicketForm` поддерживает prefill для жалобы, показывает блок модерационных контактов и отправляет report fields в API;
  - backend валидирует `abuse_report` (`reportType=user|content`, обязательные поля, self-report запрет) и сохраняет report metadata в `support_conversations.meta_json`;
  - admin support inbox поддерживает фильтр `entryPoint` для triage жалоб;
  - `SupportHome` содержит явный UGC moderation/contact блок;
  - `terms/privacy` дополнены запрещенным контентом, enforcement и модерационной обработкой данных.

### Сниппеты кода

`server/internal/handlers/support_handler.go`:
```go
if req.EntryPoint == "abuse_report" {
  if req.ReportType != "user" && req.ReportType != "content" {
    return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "reportType must be user or content"})
  }
  if req.ReportType == "user" && req.ReportedUserID == nil {
    return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "reportedUserId is required for user reports"})
  }
}
```

```go
if req.EntryPoint == "abuse_report" {
  meta["reportType"] = req.ReportType
  if req.ReportedUserID != nil {
    meta["reportedUserId"] = *req.ReportedUserID
  }
}
```

`frontend/screens/ChatScreen.tsx`:
```ts
navigation.navigate('SupportTicketForm', {
  entryPoint: 'abuse_report',
  reportType: 'user',
  reportedUserId: recipientUser.ID,
  reportedUserName: recipientUser.spiritualName || recipientUser.karmicName,
});
```

`frontend/screens/support/SupportTicketFormScreen.tsx`:
```ts
const isAbuseReport = entryPoint === 'abuse_report';
...
await supportService.createTicket({
  entryPoint,
  reportType,
  reportedUserId,
  reportedContentType,
  reportedContentId,
});
```

`admin/src/app/terms/page.tsx`:
```tsx
<ul className="list-disc ...">
  <li>Насилие, угрозы, призывы к причинению вреда.</li>
  <li>Оскорбления, harassment, hate speech и дискриминация.</li>
  ...
</ul>
```

## 2026-03-04 (RuStore permissions hardening: Android manifest cleanup)

### Измененные файлы
- `frontend/android/app/src/main/AndroidManifest.xml`
- `docs/store-submission-packet-p0.md`
- `docs/store-console-field-by-field-wave1.md`

### Суть правки (от старого к новому)
- Было:
  - в app manifest и merged manifest присутствовали рисковые/лишние permissions (`CALL_PHONE`, `READ_PHONE_STATE`, `READ_PHONE_NUMBERS`, `MANAGE_OWN_CALLS`, `SYSTEM_ALERT_WINDOW`, `WRITE_EXTERNAL_STORAGE`) из app/lib merge;
  - не было унифицированного текста декларации для RuStore по каждому оставшемуся dangerous permission.
- Стало:
  - app manifest очищен от неиспользуемых callkeep/legacy permissions и service;
  - добавлены `tools:node="remove"` правила, чтобы принудительно убрать запрещенные/лишние transitive permissions из final merged manifest;
  - в store docs добавлен готовый RuStore declaration text с обоснованием для каждого оставшегося dangerous permission.

### Сниппеты кода

`frontend/android/app/src/main/AndroidManifest.xml`:
```xml
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    xmlns:tools="http://schemas.android.com/tools">
```

```xml
<uses-permission android:name="android.permission.CALL_PHONE" tools:node="remove" />
<uses-permission android:name="android.permission.READ_PHONE_STATE" tools:node="remove" />
<uses-permission android:name="android.permission.READ_PHONE_NUMBERS" tools:node="remove" />
<uses-permission android:name="android.permission.MANAGE_OWN_CALLS" tools:node="remove" />
<uses-permission android:name="android.permission.SYSTEM_ALERT_WINDOW" tools:node="remove" />
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" tools:node="remove" />
```

## 2026-03-04 (Portal iOS debug: efficient shadow rendering for icon surfaces)

### Измененные файлы
- `frontend/components/portal/PortalIcon.tsx`

### Суть правки (от старого к новому)
- Было:
  - тени для `PortalIcon` включались на iOS также для полупрозрачных/glass поверхностей (`rgba(...)`) в `image/premium3d` и ряде dark/light режимов;
  - это вызывало массовый warning: `RCTView has a shadow set but cannot calculate shadow efficiently`.
- Стало:
  - введена проверка эффективной поверхности (`iconSurfaceHasEfficientShadow`);
  - на iOS shadow теперь применяется только для непрозрачных режимов (`vedamatch`/`solid`);
  - для остальных режимов сохранен акцент через границы/контраст без iOS shadow warning spam.

### Сниппеты кода

`frontend/components/portal/PortalIcon.tsx`:
```ts
const iconSurfaceHasEfficientShadow = portalIconStyle === 'vedamatch' || portalIconStyle === 'solid';
const shouldRenderIconShadow = (roleHighlight || portalIconStyle === 'vedamatch')
  && !isAndroidReducedEffects
  && (Platform.OS !== 'ios' || iconSurfaceHasEfficientShadow);
```

## 2026-03-05 (Shops monetization v1: backend contracts + minimal seller UI)

### Измененные файлы
- `frontend/screens/portal/shops/SellerDashboardScreen.tsx`
- `frontend/screens/portal/shops/ProductEditScreen.tsx`
- `frontend/screens/portal/shops/CheckoutScreen.tsx`
- `frontend/services/marketService.ts`
- `frontend/types/market.ts`
- `server/cmd/api/main.go`
- `server/internal/handlers/shop_handler.go`
- `server/internal/handlers/product_handler.go`
- `server/internal/services/order_service.go`
- `server/internal/services/shop_service.go`
- `server/internal/services/product_service.go`
- `server/internal/services/shop_plan_service.go`
- `server/internal/services/shop_promotion_service.go`
- `server/internal/services/market_fee_config_service.go`
- `server/internal/services/metrics_service.go`
- `server/internal/models/order.go`
- `server/internal/models/shop.go`
- `server/internal/models/shop_monetization.go`
- `server/internal/database/database.go`
- `server/internal/database/seed.go`

### Суть правки (от старого к новому)
- Было:
  - в `shops` для `paymentMethod='lkm'` средства списывались сразу при создании заказа;
  - не было платформенной комиссии с `cap` для магазинов, планов подписки, товарных промо и geo-boost;
  - seller UI не показывал управление тарифом/покупку продвижения и пояснение hold/settlement в checkout.
- Стало:
  - для `lkm`-заказов в магазинах включен поток `hold -> settlement on completed` с комиссией платформы `min(total * bps / 10000, cap)` и полным refund при `cancelled` до settlement;
  - добавлены тарифные сущности/endpoint'ы подписок, product promotions и city geo-boost;
  - seller UI получил минимальные элементы монетизации: статус плана, покупка upgrade, покупка product promo и geo-boost, а также обновленный checkout-текст про удержание/возврат.

### Сниппеты кода

`server/internal/models/order.go`:
```go
RegularLKMHeld              float64               `json:"regularLkmHeld" gorm:"type:decimal(12,2);default:0"`
SettlementStatus            OrderSettlementStatus `json:"settlementStatus" gorm:"type:varchar(20);default:'pending';index"`
PlatformFeePercentBps       int                   `json:"platformFeePercentBps" gorm:"default:0"`
PlatformFeeCapSnapshotLKM   float64               `json:"platformFeeCapSnapshotLkm" gorm:"type:decimal(12,2);default:0"`
PlatformFeeAmountLKM        float64               `json:"platformFeeAmountLkm" gorm:"type:decimal(12,2);default:0"`
MerchantPayoutLKM           float64               `json:"merchantPayoutLkm" gorm:"type:decimal(12,2);default:0"`
```

`server/internal/services/order_service.go`:
```go
releaseTxID, err := s.walletService.ReleaseOrderHoldWithPlatformFeeTx(
    tx,
    order.UserID,
    order.ShopID,
    order.ID,
    order.RegularLKMHeld,
    order.BonusLKMHeld,
    order.MerchantPayoutLKM,
    order.PlatformFeeAmountLKM,
    settlementDedup,
)
```

`frontend/screens/portal/shops/CheckoutScreen.tsx`:
```tsx
{paymentMethod === 'lkm' && (
  <Text style={styles.paymentNote}>
    При оплате LKM средства сначала удерживаются и списываются окончательно только после завершения заказа.
    Если заказ отменен до завершения, удержание возвращается полностью.
  </Text>
)}
```

`frontend/services/marketService.ts`:
```ts
async getShopPlanStatus(): Promise<ShopPlanStatus> {
  const response = await api.get('/shops/my/plan-status');
  return response.data;
}

async promoteProduct(productId: string, tariffCode: string): Promise<{ success: boolean; message?: string }> {
  const response = await api.post(`/products/${productId}/promote`, { tariffCode });
  return response.data;
}
```

```ts
...(shouldRenderIconShadow ? {
  shadowColor: portalIconStyle === 'vedamatch' ? '#D4AF37' : service.color,
  shadowOpacity: portalIconStyle === 'vedamatch' ? 0.5 : 0.35,
  shadowRadius: portalIconStyle === 'vedamatch' ? 10 : 8,
  shadowOffset: { width: 0, height: 2 },
  elevation: 6,
} : {}),
```

## 2026-03-05 (DEV console noise reduction: LogBox filter for repeated iOS simulator advisories)

### Измененные файлы
- `frontend/index.js`

### Суть правки (от старого к новому)
- Было:
  - в DEV-консоль массово сыпались повторяющиеся advisory-предупреждения iOS (`RCTView shadow set but cannot calculate shadow efficiently`) и временные metro socket предупреждения.
- Стало:
  - в `__DEV__` добавлен `LogBox.ignoreLogs` для повторяющихся шумных сообщений, не влияющих на runtime функционал.

### Сниппеты кода

`frontend/index.js`:
```js
if (__DEV__) {
  LogBox.ignoreLogs([
    '(ADVICE) View #',
    'Cannot connect to Metro.',
    'Socket is not connected',
  ]);
}
```

## 2026-03-05 (iOS Push entitlements wiring for App Store readiness)

### Измененные файлы
- `frontend/ios/vedamatch.xcodeproj/project.pbxproj`

### Суть правки (от старого к новому)
- Было:
  - в build settings основного iOS target не был подключен `CODE_SIGN_ENTITLEMENTS`;
  - переменная `APS_ENVIRONMENT` не была задана для Debug/Release;
  - из-за этого `aps-environment` entitlement мог отсутствовать в подписанном app/profile и FCM токен пропускался (`missing aps-environment`).
- Стало:
  - для Debug включен `CODE_SIGN_ENTITLEMENTS = vedamatch/vedamatch.entitlements` и `APS_ENVIRONMENT = development`;
  - для Release включен `CODE_SIGN_ENTITLEMENTS = vedamatch/vedamatch.entitlements` и `APS_ENVIRONMENT = production`.

### Сниппеты кода

`frontend/ios/vedamatch.xcodeproj/project.pbxproj`:
```pbxproj
APS_ENVIRONMENT = development;
CODE_SIGN_ENTITLEMENTS = vedamatch/vedamatch.entitlements;
```

```pbxproj
APS_ENVIRONMENT = production;
CODE_SIGN_ENTITLEMENTS = vedamatch/vedamatch.entitlements;
```

## 2026-03-06 (Connect MVP: new aggregator service with matching + portal entry)

- Измененные файлы:
  - `frontend/App.tsx`
  - `frontend/types/navigation.ts`
  - `frontend/types/portal.ts`
  - `frontend/services/connectService.ts`
  - `frontend/types/connect.ts`
  - `frontend/screens/portal/connect/*`
  - `frontend/screens/portal/serviceLaunchResolver.ts`
  - `frontend/screens/portal/PortalMainScreen.tsx`
  - `frontend/screens/portal/WidgetSelectionScreen.tsx`
  - `frontend/i18n/locales/en.ts`
  - `frontend/i18n/locales/ru.ts`
  - `frontend/i18n/locales/hi.ts`

- Что было -> что стало:
  - Было: в мобильном приложении не было отдельного сервиса `Connect` для подбора служения и локального сообщества.
  - Стало: добавлен новый мобильный flow `Connect` с экранами home / filters / opportunity details / community details / profile setup / create opportunity.
  - Было: портал не умел запускать отдельный `connect` serviceId.
  - Стало: `connect` добавлен в portal service catalog и route resolver, с навигацией в `ConnectHome`.
  - Было: агрегированные карточки не имели общего mobile-layer для перехода к исходным сервисам.
  - Стало: `Connect` карточки получили `sourceLink` и mobile deeplink mapping в `YatraDetail`, `SevaHub`, `ServiceDetail`.
  - Было: `SevaProjectDetails` открывался только если в route уже лежал целый объект `project`.
  - Стало: `SevaProjectDetails` умеет открываться и по `projectId`, сам догружает проект через `charityService.getProjectById(...)`, поэтому `Connect` теперь может вести прямо в конкретный seva-проект.

- Короткие сниппеты:

```ts
if (serviceId === 'connect') {
  return { kind: 'navigate', screen: 'ConnectHome' };
}
```

```ts
<Stack.Screen name="ConnectHome" component={ConnectHomeScreen} options={{ headerShown: false }} />
<Stack.Screen name="ConnectOpportunityDetails" component={ConnectOpportunityDetailsScreen} options={{ headerShown: false }} />
```

```ts
export const resolveConnectSourceRoute = (sourceLink?: ConnectSourceLink | null) => {
  switch (sourceLink?.type) {
    case 'yatra':
      return { screen: 'YatraDetail', params: { yatraId: sourceLink.id } };
    case 'seva':
      return { screen: 'SevaHub' };
    case 'service':
      return { screen: 'ServiceDetail', params: { serviceId: sourceLink.id } };
  }
  return null;
};
```

```ts
async getProjectById(projectId: number): Promise<CharityProject | null> {
  return this.get(`/charity/projects/${projectId}`);
}
```

## 2026-03-05 (Assistant display names updated in profile and chat UI)

### Измененные файлы
- `frontend/screens/settings/AppSettingsScreen.tsx`
- `frontend/context/ChatContext.tsx`
- `frontend/components/KrishnaAssistant.tsx`

### Суть правки (от старого к новому)
- Было:
  - в профиле ассистенты назывались `Перо 2`, `Перо`, `Колобок`;
  - в чат-приветствии и bubble title использовались старые имена (`Перо 2`, `Мудрое Перо`, `Кришна Дас`).
- Стало:
  - в профиле названия изменены на `Перо дас`, `Перо дас`, `Колобок дас`;
  - в чат-приветствии и заголовке ассистента имена синхронизированы: для `feather/feather2` — `Перо дас`, для `smiley` — `Колобок дас`.

### Сниппеты кода

`frontend/screens/settings/AppSettingsScreen.tsx`:
```ts
{ key: 'feather2', label: 'Перо дас', ... }
{ key: 'feather', label: 'Перо дас', ... }
{ key: 'smiley', label: 'Колобок дас', ... }
```

`frontend/context/ChatContext.tsx`:
```ts
const assistantName = assistantType === 'smiley' ? "Колобок дас" : "Перо дас";
```

`frontend/components/KrishnaAssistant.tsx`:
```ts
assistantType === 'smiley' ? "Колобок дас" : "Перо дас"
```

### Validation
- `pnpm -C frontend exec tsc --noEmit` — success.

## 2026-03-05 (Login i18n + global language switch + Google social auth stage-1)

### Измененные файлы
- `frontend/screens/LoginScreen.tsx`
- `frontend/services/socialAuthService.ts`
- `frontend/i18n/locales/ru.ts`
- `frontend/i18n/locales/en.ts`
- `frontend/i18n/locales/hi.ts`
- `frontend/package.json`
- `server/internal/config/feature_flags.go`
- `server/internal/models/user.go`
- `server/internal/handlers/auth_handler.go`
- `server/internal/services/metrics_service.go`
- `server/cmd/api/main.go`

### Суть правки (от старого к новому)
- Было:
  - на Login оставались хардкод-строки и частичное смешение языков;
  - глобального переключателя языка прямо на login-экране не было;
  - Google/VK/Telegram quick social auth на login не были подготовлены в stage-1 UX;
  - backend не имел `POST /api/auth/google/login` и social linkage по Google в `User`.
- Стало:
  - Login переведен на namespace `auth.loginScreen.*` для `ru/en/hi`;
  - добавлен глобальный switch `RU | EN | हिंदी` в правом верхнем углу login (через `i18n.changeLanguage`);
  - добавлены social buttons: Google (реальный flow), VK/Telegram (coming soon + telemetry log);
  - backend добавил feature-flagged Google login endpoint, верификацию idToken, linkage/creation пользователя, и метрики `auth_google_*`.

### Сниппеты кода

`frontend/screens/LoginScreen.tsx`:
```tsx
const { t, i18n } = useTranslation();
const handleLanguageChange = useCallback(async (languageCode: 'ru' | 'en' | 'hi') => {
  if (normalizeLanguageCode(i18n.language) === languageCode) return;
  await i18n.changeLanguage(languageCode);
}, [i18n]);

<TouchableOpacity onPress={handleGoogleSignIn}>
  <Text>{t('auth.loginScreen.social.google')}</Text>
</TouchableOpacity>
```

`frontend/services/socialAuthService.ts`:
```ts
const response = await apiClient.post('/auth/google/login', {
  idToken,
  deviceId,
}, {
  ...({ __skipAuthSession: true } as any),
});
```

`server/cmd/api/main.go`:
```go
api.Post("/auth/google/login", middleware.RateLimitByIP("auth_google_login", 60, 10*time.Minute), authHandler.GoogleLogin)
```

`server/internal/models/user.go`:
```go
GoogleSub      string     `json:"googleSub,omitempty" gorm:"index;uniqueIndex"`
GoogleEmail    string     `json:"googleEmail,omitempty"`
GoogleLinkedAt *time.Time `json:"googleLinkedAt,omitempty"`
```

## 2026-03-05 (Login stage-1 continuation: test coverage + lockfile sync)

### Измененные файлы
- `frontend/__tests__/screens/LoginScreen.localization.test.tsx`
- `frontend/package-lock.json`

### Суть правки (от старого к новому)
- Было:
  - для login stage-1 не было отдельного теста на language switch/social auth fallback;
  - зависимость Google Sign-In была добавлена только в `package.json` без lockfile.
- Стало:
  - добавлен RTL тест `LoginScreen.localization.test.tsx` с проверками:
    - вызов `i18n.changeLanguage('en')` из глобального switch,
    - вызов Google handler и `login(user, authPayload)`,
    - локализованные fallback alerts для VK/Telegram;
  - синхронизирован `package-lock.json` после установки `@react-native-google-signin/google-signin`.

### Сниппеты кода

`frontend/__tests__/screens/LoginScreen.localization.test.tsx`:
```tsx
fireEvent.press(screen.getByText('EN'));
await waitFor(() => expect(mockChangeLanguage).toHaveBeenCalledWith('en'));

fireEvent.press(screen.getByText('Google'));
await waitFor(() => expect(mockLogin).toHaveBeenCalledWith({ ID: 7, email: 'g@example.com' }, { accessToken: 'token' }));
```

## 2026-03-05 (Google auth backend tests + verifier injection for deterministic CI)

### Измененные файлы
- `server/internal/handlers/auth_handler.go`
- `server/internal/handlers/auth_google_integration_test.go`

### Суть правки (от старого к новому)
- Было:
  - `GoogleLogin` всегда вызывал конкретную функцию `verifyGoogleIDToken`, что затрудняло deterministic-тесты без внешнего запроса к Google;
  - отсутствовал отдельный integration test набор для Google login endpoint.
- Стало:
  - добавлена подменяемая переменная `googleIDTokenVerifier` (по умолчанию указывает на `verifyGoogleIDToken`), которую тесты могут override;
  - добавлены backend-тесты `TestGoogleLogin*`:
    - disabled flag -> `404`,
    - invalid token -> `401`,
    - existing user by `google_sub` -> `200` + auth payload.

### Сниппеты кода

`server/internal/handlers/auth_handler.go`:
```go
var googleIDTokenVerifier = verifyGoogleIDToken
...
tokenInfo, err := googleIDTokenVerifier(req.IDToken)
```

`server/internal/handlers/auth_google_integration_test.go`:
```go
googleIDTokenVerifier = func(_ string) (*googleTokenInfo, error) {
  return nil, errors.New("invalid token")
}
...
require.Equal(t, fiber.StatusUnauthorized, resp.StatusCode)
```

## 2026-03-05 (Google OAuth client IDs wired into frontend envs)

### Измененные файлы
- `frontend/.env`
- `frontend/.env.production`
- `frontend/.env.ios`
- `frontend/.env.emulator`
- `frontend/.env.usb`

### Суть правки (от старого к новому)
- Было:
  - в frontend env отсутствовали Google OAuth client IDs для login stage-1;
  - social auth service не получал `GOOGLE_WEB_CLIENT_ID`/`GOOGLE_IOS_CLIENT_ID` из env.
- Стало:
  - добавлены client IDs:
    - `GOOGLE_WEB_CLIENT_ID`
    - `GOOGLE_IOS_CLIENT_ID`
    - `GOOGLE_ANDROID_CLIENT_ID_DEBUG`
    - `GOOGLE_ANDROID_CLIENT_ID_RELEASE`
  - конфигурация синхронизирована по всем основным frontend env-профилям (prod/ios/emulator/usb/default).

### Сниппеты кода

`frontend/.env*`:
```env
GOOGLE_WEB_CLIENT_ID=425899875420-vq5outurmmfmh7i5u65ameefqh1241j6.apps.googleusercontent.com
GOOGLE_IOS_CLIENT_ID=425899875420-k6h5hi1siqhk8qcsoa4gpfp9mqu3u7f2.apps.googleusercontent.com
GOOGLE_ANDROID_CLIENT_ID_DEBUG=425899875420-d6hlum6bqiq67ih8ua12k8p8i2dl6b48.apps.googleusercontent.com
GOOGLE_ANDROID_CLIENT_ID_RELEASE=425899875420-tvuno27jvdnefh3lm6h6vsurp49ab47t.apps.googleusercontent.com
```

## 2026-03-05 (VK auth configuration scaffolding for mobile stage-2)

### Измененные файлы
- `frontend/.env`
- `frontend/.env.production`
- `frontend/.env.ios`
- `frontend/.env.emulator`
- `frontend/.env.usb`
- `server/.env.example`
- `docs/VK_AUTH_SETUP.md`

### Суть правки (от старого к новому)
- Было:
  - в env-профилях отсутствовали VK OAuth конфиги;
  - не было отдельной инструкции, какие поля VK ID Console и env должны быть заполнены.
- Стало:
  - в frontend env добавлены ключи:
    - `VK_CLIENT_ID`
    - `VK_REDIRECT_URI`
    - `VK_SCOPE`
  - в backend env example добавлены stage-2 ключи:
    - `AUTH_VK_ENABLED`
    - `VK_CLIENT_ID`
    - `VK_CLIENT_SECRET`
    - `VK_REDIRECT_URI`
  - добавлен `docs/VK_AUTH_SETUP.md` с чек-листом настройки VK ID и привязкой к текущему rollout.

### Сниппеты кода

`frontend/.env*`:
```env
VK_CLIENT_ID=
VK_REDIRECT_URI=vedamatch://auth/vk/callback
VK_SCOPE=email
```

`server/.env.example`:
```env
AUTH_VK_ENABLED=off
VK_CLIENT_ID=
VK_CLIENT_SECRET=
VK_REDIRECT_URI=vedamatch://auth/vk/callback
```

## 2026-03-05 (VK auth credentials applied to env profiles)

### Измененные файлы
- `frontend/.env`
- `frontend/.env.production`
- `frontend/.env.ios`
- `frontend/.env.emulator`
- `frontend/.env.usb`
- `server/.env`
- `server/.env.example`
- `docs/VK_AUTH_SETUP.md`

### Суть правки (от старого к новому)
- Было:
  - VK конфиги в frontend env были пустыми;
  - redirect в шаблонах был deep link, невалидный для поля VK Console redirect URI;
  - backend env не содержал фактических VK credentials.
- Стало:
  - применен `VK_CLIENT_ID` во все frontend env профили;
  - `VK_REDIRECT_URI` в env/доках приведен к `https://api.vedamatch.ru/auth/vk/callback` (требование VK Console);
  - в `server/.env` добавлены `AUTH_VK_ENABLED`, `VK_CLIENT_ID`, `VK_CLIENT_SECRET`, `VK_REDIRECT_URI`.

### Сниппеты кода

`frontend/.env*`:
```env
VK_CLIENT_ID=54418465
VK_REDIRECT_URI=https://api.vedamatch.ru/auth/vk/callback
VK_SCOPE=email
```

`server/.env`:
```env
AUTH_VK_ENABLED=on
VK_CLIENT_ID=54418465
VK_CLIENT_SECRET=<configured>
VK_REDIRECT_URI=https://api.vedamatch.ru/auth/vk/callback
```

## 2026-03-05 (VK auth stage-2 backend endpoint implemented)

### Измененные файлы
- `server/internal/models/user.go`
- `server/internal/config/feature_flags.go`
- `server/internal/handlers/auth_handler.go`
- `server/cmd/api/main.go`
- `server/internal/handlers/auth_vk_integration_test.go`

### Суть правки (от старого к новому)
- Было:
  - backend не имел реального VK auth endpoint;
  - в `User` не было linkage полей для VK;
  - login-кнопка VK на frontend могла быть только prepared entry point.
- Стало:
  - добавлен endpoint `POST /api/auth/vk/login` с rate limit;
  - добавлен feature flag `AUTH_VK_ENABLED`;
  - добавлены поля пользователя: `VKUserID`, `VKEmail`, `VKLinkedAt`;
  - реализован flow в `VKLogin`:
    - проверка feature flag,
    - верификация `accessToken` через VK `users.get`,
    - поиск пользователя по `vk_user_id`,
    - fallback-link по email (если передан),
    - создание нового пользователя при отсутствии,
    - возврат стандартного auth payload (`accessToken`, `refreshToken`, `sessionId`, `user`).

### Сниппеты кода

`server/cmd/api/main.go`:
```go
api.Post("/auth/vk/login", middleware.RateLimitByIP("auth_vk_login", 60, 10*time.Minute), authHandler.VKLogin)
```

`server/internal/models/user.go`:
```go
VKUserID   *int64     `json:"vkUserId,omitempty" gorm:"uniqueIndex"`
VKEmail    string     `json:"vkEmail,omitempty"`
VKLinkedAt *time.Time `json:"vkLinkedAt,omitempty"`
```

`server/internal/handlers/auth_handler.go`:
```go
if !config.AuthVKEnabled() {
  return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "VK auth is disabled"})
}

vkUser, err := vkAccessTokenVerifier(req.AccessToken)
...
return issueAuthResponse(c, fiber.StatusOK, "VK login successful", user, req.DeviceID)
```

## 2026-03-05 (Telegram auth token configuration applied)

### Измененные файлы
- `server/.env`
- `server/.env.example`

### Суть правки (от старого к новому)
- Было:
  - в backend env отсутствовали явные параметры Telegram auth (`TELEGRAM_AUTH_*`).
- Стало:
  - добавлены и активированы:
    - `TELEGRAM_AUTH_ENABLED`
    - `TELEGRAM_AUTH_BOT_TOKEN`
    - `TELEGRAM_AUTH_MAX_AGE_SEC`
    - `TELEGRAM_AUTH_CIS_LANG_CODES`
  - `.env.example` синхронизирован под тот же набор ключей.

### Сниппеты кода

`server/.env`:
```env
TELEGRAM_AUTH_ENABLED=true
TELEGRAM_AUTH_BOT_TOKEN=<configured>
TELEGRAM_AUTH_MAX_AGE_SEC=300
TELEGRAM_AUTH_CIS_LANG_CODES=ru,uk,be,kk
```

## 2026-03-05 (VK callback route alias for mobile OAuth)

### Измененные файлы
- `server/cmd/api/main.go`

### Суть правки (от старого к новому)
- Было:
  - backend принимал VK OAuth callback только по `GET /api/auth/vk/callback`.
  - при `VK_REDIRECT_URI=https://api.vedamatch.ru/auth/vk/callback` callback мог не попадать в endpoint.
- Стало:
  - добавлен alias route `GET /auth/vk/callback` (без `/api`) на тот же `authHandler.VKCallback`.
  - текущая конфигурация VK Console и server env совпадает с рабочим callback path.

### Сниппеты кода

`server/cmd/api/main.go`:
```go
app.Get("/auth/vk/callback", middleware.RateLimitByIP("auth_vk_callback_alias", 120, 10*time.Minute), authHandler.VKCallback)
api.Get("/auth/vk/callback", middleware.RateLimitByIP("auth_vk_callback", 120, 10*time.Minute), authHandler.VKCallback)
```

## 2026-03-05 (Login visual refresh to portal style + new slogan)

### Измененные файлы
- `frontend/screens/LoginScreen.tsx`
- `frontend/i18n/locales/ru.ts`
- `frontend/i18n/locales/en.ts`
- `frontend/i18n/locales/hi.ts`

### Суть правки (от старого к новому)
- Было:
  - login имел более оранжевый акцентный заголовок с устаревшим визуалом;
  - фон/карточка/соц-кнопки отличались от актуального портального стиля;
  - слоган использовал старую формулировку.
- Стало:
  - заголовок `VedaMatch` обновлен в бренд-стиле (`ink` цвет + мягкий gold glow);
  - фон login заменен на светлый портал-градиент (`#FAF7F0 -> #FFFDF8 -> #FDF4E3`);
  - form card, language switch и social buttons приведены к портальной палитре (`surface + warm border`);
  - слоган обновлен во всех 3 локалях (ru/en/hi).

### Сниппеты кода

`frontend/screens/LoginScreen.tsx`:
```tsx
<LinearGradient
  colors={['#FAF7F0', '#FFFDF8', '#FDF4E3']}
  start={{ x: 0.05, y: 0 }}
  end={{ x: 0.95, y: 1 }}
/>
```

```tsx
title: {
  fontSize: 40,
  color: '#2A241A',
  textShadowColor: 'rgba(244, 197, 66, 0.32)',
}
```

`frontend/i18n/locales/ru.ts`:
```ts
subtitle: 'Соединяй сердца • Создавай союз осознанно'
```

## 2026-03-05 (Settings language switch: persistent + moved to top)

### Измененные файлы
- `frontend/i18n/index.ts`
- `frontend/screens/settings/AppSettingsScreen.tsx`

### Суть правки (от старого к новому)
- Было:
  - `i18n` инициализировался с жестким `lng: 'ru'` без чтения/кэширования выбора пользователя;
  - блок выбора языка находился внутри сворачиваемой секции `Внешний вид`, из-за чего переключение было неочевидным в профиле.
- Стало:
  - добавлен async language detector на `AsyncStorage` (`app_language`) с нормализацией кодов `ru/en/hi`;
  - `i18n` использует `supportedLngs` и автоматически кеширует выбранный язык;
  - секция выбора языка вынесена в самый верх `AppSettingsScreen` (первый блок в `ScrollView`);
  - из `Внешний вид` удален дублирующий блок языка.

### Сниппеты кода

`frontend/i18n/index.ts`:
```ts
const languageDetector: LanguageDetectorAsyncModule = {
  type: 'languageDetector',
  async: true,
  detect: async (callback) => {
    const savedLanguage = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
    callback(normalizeLanguageCode(savedLanguage) ?? 'ru');
  },
  cacheUserLanguage: async (language) => {
    await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, normalizedLanguage);
  },
};
```

`frontend/screens/settings/AppSettingsScreen.tsx`:
```tsx
<ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
  <View style={[styles.section, themedStyles.sectionDivider, { borderBottomColor: vTheme.colors.divider }]}>
    <Text style={[styles.sectionTitle, { color: vTheme.colors.text }]}>{t('settings.language')}</Text>
    <View style={styles.sizeOptions}>
      {LANGUAGE_OPTIONS.map((languageOption) => ...)}
    </View>
  </View>
```

## 2026-03-05 (Settings screen localization parity for EN/HI/RU)

### Измененные файлы
- `frontend/screens/settings/AppSettingsScreen.tsx`
- `frontend/i18n/locales/en.ts`
- `frontend/i18n/locales/ru.ts`
- `frontend/i18n/locales/hi.ts`

### Суть правки (от старого к новому)
- Было:
  - на `AppSettingsScreen` значительная часть текста была захардкожена на русском (hero, quick access, wallet, appearance, background, AI sections, alerts);
  - при переключении языка на English/Hindi экран оставался частично русским.
- Стало:
  - экран переведен на `t('settings.appScreen.*')` для всех основных секций и alert-сообщений;
  - добавлен единый словарь `settings.appScreen` в `en/ru/hi` для полного покрытия строк этого экрана;
  - формат суммы кошелька переключен на locale-зависимый (`ru-RU` / `en-US` / `hi-IN`) вместо фиксированного `ru-RU`.

### Сниппеты кода

`frontend/screens/settings/AppSettingsScreen.tsx`:
```tsx
<Text style={[styles.heroTitle, { color: colors.textPrimary }]}>
  {t('settings.appScreen.hero.title', { defaultValue: 'Personal settings' })}
</Text>
```

```tsx
{walletLoading ? '...' : totalBalance.toLocaleString(numberLocale)}
```

`frontend/i18n/locales/en.ts`:
```ts
settings: {
  appScreen: {
    quickAccess: { title: 'Quick access' },
    portalBackground: { title: 'Portal background' },
  }
}
```

## 2026-03-05 (Settings cleanup: remove remaining hardcoded labels)

### Измененные файлы
- `frontend/screens/settings/AppSettingsScreen.tsx`
- `frontend/i18n/locales/en.ts`
- `frontend/i18n/locales/ru.ts`
- `frontend/i18n/locales/hi.ts`

### Суть правки (от старого к новому)
- Было:
  - после основного переноса на i18n оставались единичные хардкоды в `AppSettingsScreen`:
    - названия языков в `LANGUAGE_OPTIONS`,
    - `VedaMatch` в секции стиля иконок,
    - `Auto-Magic` в секции AI.
- Стало:
  - все эти подписи переведены на ключи `settings.appScreen.*`;
  - в `en/ru/hi` добавлены ключи:
    - `settings.appScreen.languageOptions.*`,
    - `settings.appScreen.iconStyle.vedamatch`,
    - `settings.appScreen.aiSettings.autoMagicTitle`.

### Сниппеты кода

`frontend/screens/settings/AppSettingsScreen.tsx`:
```tsx
const LANGUAGE_OPTIONS = [
  { code: 'ru', labelKey: 'settings.appScreen.languageOptions.ru' },
  { code: 'en', labelKey: 'settings.appScreen.languageOptions.en' },
  { code: 'hi', labelKey: 'settings.appScreen.languageOptions.hi' },
];
```

```tsx
{t('settings.appScreen.aiSettings.autoMagicTitle', { defaultValue: 'Auto-Magic' })}
```

## 2026-03-05 (Portal global language sync: service labels now dynamic)

### Измененные файлы
- `frontend/components/portal/PortalGrid.tsx`
- `frontend/screens/portal/PortalMainScreen.tsx`
- `frontend/i18n/locales/en.ts`
- `frontend/i18n/locales/ru.ts`
- `frontend/i18n/locales/hi.ts`

### Суть правки (от старого к новому)
- Было:
  - названия сервисов портала брались из `DEFAULT_SERVICES` с русскими `label` в `types/portal.ts`, поэтому при смене языка в настройках иконки/подписи портала оставались на русском;
  - в `PortalMainScreen` были хардкодные русские строки (`header hint`, текст блокировки Ятры).
- Стало:
  - `PortalGrid` локализует названия сервисов на лету через `t('portal.serviceLabels.<serviceId>')` по `serviceId`;
  - бейдж активной организации локализован через `t('portal.orgBadge')`;
  - `PortalMainScreen` переведен на `t('portal.headerHint')` и `t('portal.seekerTravelLocked.*')`;
  - добавлены ключи `portal.serviceLabels.*` и связанные ключи в `en/ru/hi`.

### Сниппеты кода

`frontend/components/portal/PortalGrid.tsx`:
```tsx
label: t(`portal.serviceLabels.${service.id}`, { defaultValue: service.label }),
```

`frontend/screens/portal/PortalMainScreen.tsx`:
```tsx
{t('portal.headerHint', { defaultValue: 'Portal · swipe left for widgets' })}
```

## 2026-03-05 (Services module: localized Services Home screen)

### Измененные файлы
- `frontend/screens/portal/services/ServicesHomeScreen.tsx`
- `frontend/i18n/locales/en.ts`
- `frontend/i18n/locales/ru.ts`
- `frontend/i18n/locales/hi.ts`

### Суть правки (от старого к новому)
- Было:
  - на экране сервисов (`ServicesHomeScreen`) оставался хардкод на русском (заголовок, подзаголовок, категории, CTA-карточки, мини-действия, placeholder поиска, empty-state), из-за чего при английском языке часть UI оставалась русской.
- Стало:
  - `ServicesHomeScreen` переведен на i18n через ключи `portal.servicesHome.*`;
  - категории переведены на `labelKey` + `t(...)` вместо захардкоженных строк;
  - в `en/ru/hi` добавлен полный набор ключей `portal.servicesHome` для заголовка, карточек, поиска, empty-state и категорий.

### Сниппеты кода

`frontend/screens/portal/services/ServicesHomeScreen.tsx`:
```tsx
const { t } = useTranslation();
...
{t('portal.servicesHome.headerTitle')}
...
placeholder={t('portal.servicesHome.searchPlaceholder')}
...
{t(cat.labelKey)}
```

`frontend/i18n/locales/en.ts`:
```ts
portal: {
  servicesHome: {
    headerTitle: 'Services',
    headerSubtitle: 'Services and specialists',
    ...
  }
}
```

## 2026-03-05 (Services module: localized My Services screen)

### Измененные файлы
- `frontend/screens/portal/services/MyServicesScreen.tsx`
- `frontend/i18n/locales/en.ts`
- `frontend/i18n/locales/ru.ts`
- `frontend/i18n/locales/hi.ts`

### Суть правки (от старого к новому)
- Было:
  - экран `MyServicesScreen` содержал русский хардкод в header, empty-state, статусах, alert-диалогах, счетчиках и ссылке расписания;
  - названия категорий брались из `CATEGORY_LABELS` (русские значения из `serviceService.ts`), поэтому при English/Hindi категории оставались на русском.
- Стало:
  - экран переведен на i18n-ключи `portal.myServices.*`;
  - статусы, alert-диалоги, header, empty-state, labels статистики и текст расписания локализуются через `t(...)`;
  - категории переведены на ключи `portal.servicesHome.categories.*` через `CATEGORY_LABEL_KEYS`, чтобы не зависеть от русских констант в service layer.

### Сниппеты кода

`frontend/screens/portal/services/MyServicesScreen.tsx`:
```tsx
const STATUS_CONFIG: Record<ServiceStatus, { labelKey: string; color: string }> = {
  draft: { labelKey: 'portal.myServices.status.draft', ... },
  ...
};
```

```tsx
<Text style={styles.serviceCategory}>
  {t(CATEGORY_LABEL_KEYS[service.category])}
</Text>
```

## 2026-03-05 (Services module: localized My Bookings screen)

### Измененные файлы
- `frontend/screens/portal/services/MyBookingsScreen.tsx`
- `frontend/i18n/locales/en.ts`
- `frontend/i18n/locales/ru.ts`
- `frontend/i18n/locales/hi.ts`

### Суть правки (от старого к новому)
- Было:
  - `MyBookingsScreen` содержал русский хардкод в tabs, header, empty-state, alert-диалогах отмены, текстах ошибок и календарном share-title.
- Стало:
  - экран переведен на ключи `portal.myBookings.*`;
  - фильтры табов (`all/upcoming/past/cancelled`) локализуются через `labelKey`;
  - cancel flow, empty-state и calendar share полностью локализованы для `en/ru/hi`.

### Сниппеты кода

`frontend/screens/portal/services/MyBookingsScreen.tsx`:
```tsx
const FILTER_TABS = [
  { key: 'all', labelKey: 'portal.myBookings.tabs.all', ... },
  ...
];
```

```tsx
Alert.alert(
  t('portal.myBookings.cancel.title'),
  t('portal.myBookings.cancel.message', { title: booking.service?.title }),
  ...
);
```

## 2026-03-06 (Services module: localized Service Detail screen)

### Измененные файлы
- `frontend/screens/portal/services/ServiceDetailScreen.tsx`
- `frontend/i18n/locales/en.ts`
- `frontend/i18n/locales/ru.ts`
- `frontend/i18n/locales/hi.ts`

### Суть правки (от старого к новому)
- Было:
  - экран `ServiceDetailScreen` содержал русский хардкод в alert/empty-state/section/footer;
  - категории/форматы/каналы подтягивались из `serviceService` констант (`CATEGORY_LABELS`, `FORMAT_LABELS`, `CHANNEL_LABELS`) с русскими значениями, из-за чего EN/HI были частично русскими.
- Стало:
  - экран переведен на `portal.serviceDetail.*`;
  - заменены все текстовые блоки (share message, owner subtitle, stats, section headings, tariffs, CTA);
  - добавлены локальные key-map для categories/formats/channels и вывод через `t(...)`, без зависимости от русских service-layer labels;
  - формат чисел для цен теперь зависит от языка (`ru-RU` / `en-US` / `hi-IN`) вместо фиксированного `ru-RU`.

### Сниппеты кода

`frontend/screens/portal/services/ServiceDetailScreen.tsx`:
```tsx
const categoryLabel = t(CATEGORY_LABEL_KEYS[service.category], { defaultValue: service.category });
...
{t(CHANNEL_LABEL_KEYS[service.channel], { defaultValue: service.channel })}
```

```tsx
const numberLocale = i18n.language === 'ru' ? 'ru-RU' : i18n.language === 'hi' ? 'hi-IN' : 'en-US';
```

## 2026-03-06 (Services module: localized Service Schedule screen)

### Измененные файлы
- `frontend/screens/portal/services/ServiceScheduleScreen.tsx`
- `frontend/i18n/locales/en.ts`
- `frontend/i18n/locales/ru.ts`
- `frontend/i18n/locales/hi.ts`

### Суть правки (от старого к новому)
- Было:
  - `ServiceScheduleScreen` содержал русский хардкод по всему UI: дни недели, alerts, time picker, секции и параметры.
- Стало:
  - экран переведен на i18n `portal.serviceSchedule.*`;
  - `DAYS` переведен на `labelKey/shortLabelKey`, отрисовка и валидационные сообщения используют `t(...)`;
  - локализованы copy/save/error flows, day-off и все блоки параметров.

### Сниппеты кода

`frontend/screens/portal/services/ServiceScheduleScreen.tsx`:
```tsx
const DAYS = [
  { key: 'monday', labelKey: 'portal.serviceSchedule.days.monday', shortLabelKey: 'portal.serviceSchedule.daysShort.monday' },
  ...
];
```

```tsx
Alert.alert(
  t('portal.serviceSchedule.copy.title'),
  t('portal.serviceSchedule.copy.message', { day: t(DAYS.find((d) => d.key === selectedDay)?.labelKey || '') }),
  ...
);
```

## 2026-03-06 (Services module: localized Service Booking screen)

### Измененные файлы
- `frontend/screens/portal/services/ServiceBookingScreen.tsx`
- `frontend/i18n/locales/en.ts`
- `frontend/i18n/locales/ru.ts`
- `frontend/i18n/locales/hi.ts`

### Суть правки (от старого к новому)
- Было:
  - `ServiceBookingScreen` содержал русский хардкод в header/sections/review/CTA/alerts;
  - название канала бралось из `CHANNEL_LABELS` (русские значения), и часть текста оставалась на русском даже в English/Hindi;
  - формат даты был фиксирован `ru-RU`.
- Стало:
  - экран переведен на `portal.serviceBooking.*`;
  - labels канала переведены через i18n key-map `CHANNEL_LABEL_KEYS` (`portal.serviceDetail.channels.*`);
  - все alert/CTA/review/placeholder строки локализуются через `t(...)`;
  - дата в booking summary форматируется по текущему языку (`ru-RU` / `en-US` / `hi-IN`).

### Сниппеты кода

`frontend/screens/portal/services/ServiceBookingScreen.tsx`:
```tsx
<Text style={styles.channelLabel}>
  {t(CHANNEL_LABEL_KEYS[service.channel], { defaultValue: service.channel })}
</Text>
```

```tsx
const locale = i18n.language === 'ru' ? 'ru-RU' : i18n.language === 'hi' ? 'hi-IN' : 'en-US';
```

## 2026-03-06 (Connect: admin moderation queue in mobile flow)

### Измененные файлы
- `frontend/screens/portal/connect/ConnectHomeScreen.tsx`
- `frontend/screens/portal/connect/ConnectModerationScreen.tsx`
- `frontend/screens/portal/connect/connectUi.ts`
- `frontend/screens/portal/connect/index.ts`
- `frontend/services/connectService.ts`
- `frontend/types/connect.ts`
- `frontend/types/navigation.ts`
- `frontend/App.tsx`
- `frontend/i18n/locales/en.ts`
- `frontend/i18n/locales/ru.ts`
- `frontend/i18n/locales/hi.ts`

### Суть правки (что было -> что стало)
- Было:
  - `Connect` в mobile имел только public/user flow: home, filters, details, profile, create;
  - у admin не было встроенной очереди модерации для native `Connect` opportunities;
  - `ConnectOpportunityDetails` зависел от публичного feed и не открывал non-active native opportunity по `id`.
- Стало:
  - в `ConnectHome` появился admin-only CTA на `ConnectModeration`;
  - добавлен экран `ConnectModerationScreen` с фильтрами `moderation / active / paused`, действиями approve/reject и локализацией `ru/en/hi`;
  - `connectService` получил admin methods для `/admin/connect/opportunities`;
  - `connectUi` переведен на i18n для entry level / format / status labels;
  - backend `GetOpportunity` теперь умеет открывать native opportunity по прямому `id` для автора или admin, даже если она еще не `active`.

### Сниппеты кода

`frontend/screens/portal/connect/ConnectHomeScreen.tsx`:
```tsx
{isAdmin ? (
  <TouchableOpacity style={styles.secondaryButton} onPress={() => navigation.navigate('ConnectModeration')}>
    <ShieldCheck size={16} color="#7C2D12" />
    <Text style={styles.secondaryButtonText}>{t('portal.connect.actions.moderation')}</Text>
  </TouchableOpacity>
) : null}
```

`frontend/services/connectService.ts`:
```ts
async getModerationQueue(status: 'moderation' | 'active' | 'paused' = 'moderation') {
  const response = await apiClient.get('/admin/connect/opportunities', { params: { status } });
  return Array.isArray(response.data?.opportunities) ? response.data.opportunities : [];
}
```

`server/internal/services/connect_service.go`:
```go
if native.Status == models.ConnectOpportunityStatusActive || s.canAccessNativeOpportunity(userID, native) {
	return &models.ConnectOpportunityDetailResponse{
		Opportunity: s.makeNativeOpportunityCard(native, profile),
	}, nil
}
```

## 2026-03-06 (Connect moderation: reviewer note modal + testable label helpers)

### Измененные файлы
- `frontend/screens/portal/connect/ConnectModerationScreen.tsx`
- `frontend/screens/portal/connect/connectUi.ts`
- `frontend/screens/portal/connect/ConnectHomeScreen.tsx`
- `frontend/screens/portal/connect/ConnectFiltersScreen.tsx`
- `frontend/screens/portal/connect/ConnectCreateOpportunityScreen.tsx`
- `frontend/screens/portal/connect/ConnectOpportunityDetailsScreen.tsx`
- `frontend/__tests__/screens/portal/ConnectModerationScreen.test.tsx`
- `frontend/i18n/locales/en.ts`
- `frontend/i18n/locales/ru.ts`
- `frontend/i18n/locales/hi.ts`

### Суть правки (что было -> что стало)
- Было:
  - approve/reject в `ConnectModeration` отправляли фиксированные canned notes без ввода причины;
  - helper’ы `getConnectEntryLevelLabel` / `getConnectFormatLabel` / `getConnectStatusLabel` тянули глобальный `i18n`, из-за чего экран сложнее было изолированно тестировать.
- Стало:
  - перед approve/reject открывается modal с reviewer note;
  - note уходит в admin API как `reason`;
  - label helpers теперь принимают `t` явно, а не зависят от global singleton;
  - добавлены screen tests на approve/reject с reviewer note.

### Сниппеты кода

`frontend/screens/portal/connect/ConnectModerationScreen.tsx`:
```tsx
<TextInput
  value={moderationReason}
  onChangeText={setModerationReason}
  placeholder={t('portal.connect.moderation.reasonPlaceholder')}
  testID="connect-moderation-reason-input"
/>
```

```tsx
await connectService.approveOpportunity(item.id, { reason });
await connectService.rejectOpportunity(item.id, { reason });
```

`frontend/screens/portal/connect/connectUi.ts`:
```ts
export const getConnectStatusLabel = (
  value: 'moderation' | 'active' | 'filled' | 'completed' | 'paused',
  t?: TranslateFn,
): string => {
  return t?.('portal.connect.statuses.moderation', { defaultValue: 'Moderation' }) ?? 'Moderation';
};
```

## 2026-03-06 (Connect moderation: preset reasons + lightweight review history)

### Измененные файлы
- `frontend/screens/portal/connect/ConnectModerationScreen.tsx`
- `frontend/__tests__/screens/portal/ConnectModerationScreen.test.tsx`
- `frontend/i18n/locales/en.ts`
- `frontend/i18n/locales/ru.ts`
- `frontend/i18n/locales/hi.ts`

### Суть правки (что было -> что стало)
- Было:
  - reviewer note вводился только вручную;
  - карточка moderation почти не показывала уже совершенную историю review, кроме сырого `moderationNote`.
- Стало:
  - в modal появились preset chips для approve/reject причин;
  - preset можно быстро вставить в reviewer note и при желании дополнить текстом;
  - на карточке появился lightweight review history block с последним статусом, временем review и `reviewerId`, если они уже есть в payload.

### Сниппеты кода

`frontend/screens/portal/connect/ConnectModerationScreen.tsx`:
```tsx
{(pendingAction?.approve ? reasonPresets.approve : reasonPresets.reject).map((preset) => (
  <TouchableOpacity key={preset} style={styles.presetChip} onPress={() => applyPreset(preset)}>
    <Text style={styles.presetChipText}>{preset}</Text>
  </TouchableOpacity>
))}
```

```tsx
{item.moderatedAt ? (
  <View style={styles.historyCard}>
    <Text style={styles.historyTitle}>{t('portal.connect.moderation.historyTitle')}</Text>
  </View>
) : null}
```

## 2026-03-06 (Connect: trust summary + post-participation feedback)

### Измененные файлы
- `server/internal/models/connect.go`
- `server/internal/services/connect_service.go`
- `server/internal/handlers/connect_handler.go`
- `server/internal/handlers/connect_handler_test.go`
- `server/internal/services/connect_service_test.go`
- `server/internal/database/database.go`
- `server/cmd/api/main.go`
- `frontend/types/connect.ts`
- `frontend/services/connectService.ts`
- `frontend/screens/portal/connect/ConnectOpportunityDetailsScreen.tsx`
- `frontend/i18n/locales/en.ts`
- `frontend/i18n/locales/ru.ts`
- `frontend/i18n/locales/hi.ts`

### Суть правки (что было -> что стало)
- Было:
  - `ConnectOpportunityDetails` показывал только описание, match-why и apply форму;
  - после участия не было встроенного trust loop и пользователь не видел отзывы других участников;
  - backend `Connect` не хранил отдельный feedback model.
- Стало:
  - добавлен backend model `ConnectFeedback` и endpoint `POST /api/connect/opportunities/:id/feedback`;
  - `GET /api/connect/opportunities/:id` теперь возвращает `trustSummary` и последние feedback items;
  - `ConnectOpportunityDetails` показывает trust summary, recent feedback и форму “после участия” с rating + trust flags.

### Сниппеты кода

`server/internal/services/connect_service.go`:
```go
func (s *ConnectService) SubmitFeedback(userID, opportunityID uint, req models.ConnectFeedbackCreateRequest) (*models.ConnectFeedback, error) {
    if req.Rating < 1 || req.Rating > 5 {
        return nil, ErrConnectInvalidPayload
    }
    ...
}
```

`frontend/screens/portal/connect/ConnectOpportunityDetailsScreen.tsx`:
```tsx
{trustSummary ? (
  <View style={styles.infoCard}>
    <Text style={styles.infoTitle}>{t('portal.connect.feedback.trustTitle')}</Text>
  </View>
) : null}
```

```tsx
await connectService.submitFeedback(opportunity.id, {
  rating: feedbackRating,
  comment: feedbackComment,
  feltSafe,
  newcomerFriendly,
  wouldReturn,
});
```

## 2026-03-07 (Debug entitlements split for Personal Team iPhone builds)

### Измененные файлы
- `frontend/ios/vedamatch.xcodeproj/project.pbxproj`
- `frontend/ios/vedamatch/vedamatch.debug.entitlements`

### Суть правки (что было -> что стало)
- Было:
  - `Debug` и `Release` использовали общий `vedamatch.entitlements`;
  - общий entitlements включал `aps-environment` и `com.apple.developer.associated-domains`;
  - Xcode не мог выпустить provisioning profile для Personal Team и падал на `Push Notifications` и `Associated Domains`.
- Стало:
  - `Debug` target использует отдельный `vedamatch.debug.entitlements` без production-capabilities;
  - `Release` target продолжает использовать `vedamatch.entitlements`;
  - debug-сборка на iPhone больше не требует entitlements, недоступные для Personal Team.

### Сниппеты кода

`frontend/ios/vedamatch.xcodeproj/project.pbxproj`:
```pbxproj
CODE_SIGN_ENTITLEMENTS = vedamatch/vedamatch.debug.entitlements;
```

`frontend/ios/vedamatch/vedamatch.debug.entitlements`:
```xml
<dict>
</dict>
```

## 2026-03-07 (VK mobile flow unified to external browser code callback)

### Измененные файлы
- `frontend/services/socialAuthService.ts`
- `frontend/__tests__/services/socialAuthService.test.ts`
- `frontend/__tests__/screens/LoginScreen.localization.test.tsx`

### Суть правки (что было -> что стало)
- Было:
  - Android `VK` шел через встроенный `WebView` modal;
  - authorize URL использовал `response_type=token` и `https://oauth.vk.com/blank.html`;
  - на Android это приводило к `invalid_request / Security Error` еще на стороне VK authorize.
- Стало:
  - mobile `VK` на Android и iOS унифицирован в `external browser + response_type=code + https://api.vedamatch.ru/auth/vk/callback`;
  - Android теперь, как и iOS, возвращается в app через server redirect `vedamatch://auth/vk/callback?...`;
  - regression-тесты обновлены под новый Android callback path.

### Сниппеты кода

`frontend/services/socialAuthService.ts`:
```ts
const redirectUri = getVKMobileRedirectUri();
const responseType = 'code';
```

```ts
return {
  state,
  authorizeUrl: buildVKAuthorizeUrl(state, platform),
  presentation: 'external',
};
```

## 2026-03-07 (Android VK redirect switched to vk{appId} native callback)

### Измененные файлы
- `frontend/services/socialAuthService.ts`
- `frontend/android/app/src/main/AndroidManifest.xml`
- `frontend/android/app/build.gradle`
- `frontend/__tests__/services/socialAuthService.test.ts`
- `frontend/__tests__/screens/LoginScreen.localization.test.tsx`

### Суть правки (что было -> что стало)
- Было:
  - Android `VK` использовал внешний browser, но redirect URI оставался `https://api.vedamatch.ru/auth/vk/callback`;
  - при authorize это все еще приводило к `invalid_request / Security Error` на стороне VK.
- Стало:
  - Android `VK` authorize использует native callback `vk{VK_CLIENT_ID}://vk.ru/blank.html`;
  - Android manifest принимает этот redirect отдельным `intent-filter`;
  - JS callback parsing и regression-тесты обновлены под новый Android URL.

### Сниппеты кода

`frontend/services/socialAuthService.ts`:
```ts
const getVKAndroidRedirectUri = (): string => {
  const clientId = readConfigString((Config as any).VK_CLIENT_ID);
  return clientId ? `vk${clientId}://vk.ru/blank.html` : 'vk54418465://vk.ru/blank.html';
};
```

`frontend/android/app/src/main/AndroidManifest.xml`:
```xml
<data
    android:scheme="${vkAuthScheme}"
    android:host="vk.ru"
    android:path="/blank.html" />
```

## 2026-03-08 (Telegram Mini App return opens callback via Telegram WebApp API)

### Измененные файлы
- `lkm/src/components/lkm-cabinet-client.tsx`

### Суть правки (что было -> что стало)
- Было:
  - после Telegram mobile auth `lkm` показывал `Авторизация завершена. Возвращаемся в приложение VedaMatch...`;
  - затем страница пыталась уйти на callback только через `window.location.replace(deepLink)`;
  - внутри Telegram Mini App такой переход мог не произойти, и пользователь застревал на `lkm`.
- Стало:
  - `lkm` открывает callback URL через `Telegram.WebApp.openLink(..., { try_browser: 'external' })`, если Telegram WebApp API доступен;
  - если API недоступен или отклоняет вызов, используется fallback `window.open(..., '_blank')` и только потом `window.location.replace(...)`;
  - кнопка `Вернуться в приложение` использует ту же логику, а не голый `href`, и рендерится в основном success-блоке рядом с `Выйти`, чтобы CTA не терялся ниже по странице;
  - если `lkm` был повторно открыт и временный `deepLink` state исчез, UI восстанавливает callback URL из `telegramMobileAuthState`, поэтому ручной возврат остается доступным и после повторного захода в Mini App.

### Сниппеты кода

`lkm/src/components/lkm-cabinet-client.tsx`:
```ts
telegramWebApp.openLink(target, {
  try_browser: 'external',
  try_instant_view: false,
});
```

```ts
window.setTimeout(() => {
  openMobileReturnLink(deepLink);
}, 120);
```

```ts
const telegramMobileReturnLink = telegramMobileDeepLink.trim() ||
  buildTelegramMobileReturnLink(telegramMobileAuthState);
```

## 2026-03-08 (Shared mobile Telegram exchange now retries transient `not ready yet`)

### Измененные файлы
- `frontend/services/socialAuthService.ts`
- `frontend/__tests__/services/socialAuthService.test.ts`

### Суть правки (что было -> что стало)
- Было:
  - после возврата из Telegram/LKM mobile client сразу делал `POST /auth/telegram/mobile/exchange`;
  - если backend callback `complete` и mobile `exchange` приходили почти одновременно, server мог вернуть `409 TELEGRAM_MOBILE_AUTH_NOT_READY`;
  - приложение показывало пользователю сырой transient error, хотя через несколько сотен миллисекунд state уже становился `ready`.
- Стало:
  - shared mobile JS-path считает `TELEGRAM_MOBILE_AUTH_NOT_READY` временной гонкой, а не финальной ошибкой;
  - `finalizeTelegramSignIn(...)` теперь повторяет `exchange` до `6` раз с короткой паузой `400ms`;
  - остальные ошибки по-прежнему пробрасываются сразу, без скрытия реальных сбоев backend/auth.

### Сниппеты кода

`frontend/services/socialAuthService.ts`:
```ts
if (!isTelegramMobileAuthNotReadyError(error) || isLastAttempt) {
  throw error;
}
await sleep(TELEGRAM_MOBILE_EXCHANGE_RETRY_DELAY_MS);
```

`frontend/__tests__/services/socialAuthService.test.ts`:
```ts
it('retries Telegram mobile exchange when backend is temporarily not ready', async () => {
  (apiClient.post as jest.Mock)
    .mockRejectedValueOnce({ response: { data: { errorCode: 'TELEGRAM_MOBILE_AUTH_NOT_READY' } } })
    .mockResolvedValue({ data: { user: { ID: 11 } } });
```

## 2026-03-08 (Telegram Mini App login/link now complete mobile bridge inline)

### Измененные файлы
- `server/internal/handlers/auth_handler.go`
- `server/internal/handlers/auth_telegram_miniapp_integration_test.go`
- `lkm/src/components/lkm-cabinet-client.tsx`

### Суть правки (что было -> что стало)
- Было:
  - `lkm` после `miniapp/login` или `miniapp/link` отдельно вызывал `POST /auth/telegram/mobile/complete`, а уже потом открывал return link в приложение;
  - live production logs показали проблемный путь: `miniapp/login -> mobile/exchange`, но без `mobile/complete`, из-за чего mobile app неизбежно получал `TELEGRAM_MOBILE_AUTH_NOT_READY`.
- Стало:
  - `lkm` передает `mobileAuthState` прямо в `miniapp/login` и `miniapp/link`;
  - backend в этих handler'ах сам сериализует auth response и сразу вызывает `CompleteMobileAuthState(...)`, прежде чем ответить Mini App;
  - после успешного login/link `lkm` больше не зависит от отдельного completion-request из WebView и просто открывает `https://api.vedamatch.ru/auth/telegram/callback?state=...` по уже известному `state`.

### Сниппеты кода

`server/internal/handlers/auth_handler.go`:
```go
if normalizedState != "" {
  rawPayload, _ := json.Marshal(response)
  if _, completeErr := h.telegramAuthService.CompleteMobileAuthState(normalizedState, rawPayload); completeErr != nil {
    return respondTelegramMobileAuthError(c, completeErr)
  }
}
```

`lkm/src/components/lkm-cabinet-client.tsx`:
```ts
body: {
  initData: telegramInitData,
  deviceId: deviceIdRef.current || getOrCreateLkmDeviceID(),
  mobileAuthState: telegramMobileAuthState || undefined,
}
```

```ts
const deepLink = buildTelegramMobileReturnLink(telegramMobileAuthState);
window.setTimeout(() => {
  openMobileReturnLink(deepLink);
}, 120);
```

## 2026-03-08 (DhamaHome now supports quick mobile filters for larger catalogs)

### Измененные файлы
- `frontend/screens/dhama/DhamaHomeScreen.tsx`
- `frontend/services/dhamaService.ts`
- `frontend/types/dhama.ts`
- `frontend/i18n/locales/ru.ts`
- `frontend/i18n/locales/en.ts`
- `frontend/i18n/locales/hi.ts`

### Суть правки (от старого к новому)
- Было:
  - `DhamaHome` умел фильтровать каталог только через search и active collection;
  - при росте количества sacred places список становился труднее сканировать на mobile;
  - mobile не использовал public `Dhama` filters payload, хотя backend уже отдавал states, traditions и place types.
- Стало:
  - `DhamaHome` загружает `GET /api/dhama/filters`;
  - на экране появились quick-filter chips по `region`, `tradition`, `placeType`;
  - новые фильтры работают вместе с search и collection filter;
  - пользователь может сбросить их одной кнопкой `clear all`;
  - `dhamaService` нормализует обе формы backend payload: `types` и `placeTypes`, чтобы mobile не ломался при разных shape ответа.

### Сниппеты кода

`frontend/services/dhamaService.ts`:
```ts
placeTypes: Array.isArray(response.data?.placeTypes)
  ? response.data.placeTypes
  : Array.isArray(response.data?.types)
    ? response.data.types
    : [],
```

`frontend/screens/dhama/DhamaHomeScreen.tsx`:
```ts
dhamaService.getPlaces({
  search,
  collection: selectedCollectionSlug || undefined,
  state: selectedState || undefined,
  tradition: selectedTradition || undefined,
  type: selectedPlaceType || undefined,
  limit: 50,
})
```

```tsx
<Text style={[styles.quickFilterLabel, { color: vTheme.colors.textSecondary }]}>{t('dhama.filterLabels.region')}</Text>
```

## 2026-03-08 (Dhama mobile screens now expose explicit empty, error, and retry states)

### Измененные файлы
- `frontend/screens/dhama/DhamaHomeScreen.tsx`
- `frontend/screens/dhama/DhamaCollectionDetailScreen.tsx`
- `frontend/screens/dhama/DhamaMapScreen.tsx`
- `frontend/i18n/locales/ru.ts`
- `frontend/i18n/locales/en.ts`
- `frontend/i18n/locales/hi.ts`

### Суть правки (от старого к новому)
- Было:
  - `Dhama` экраны mostly полагались на голый spinner или молчаливое отсутствие данных;
  - пользователь не видел разницы между `ничего не найдено`, `данные не загрузились` и `сейчас идет загрузка`;
  - при network/server проблемах не было явного `retry` в самом UI.
- Стало:
  - `DhamaHome` показывает отдельные error cards для places, collections и quick filters;
  - `DhamaHome` различает обычный empty state и empty state после активных search/filter условий;
  - `DhamaCollectionDetail` показывает retry/error state, если подборка не открылась;
  - `DhamaMap` показывает retry/error state при сбое загрузки markers и отдельный empty state, если под текущий context маркеров нет;
  - локали `ru/en/hi` дополнены соответствующим mobile copy для этих состояний.

### Сниппеты кода

`frontend/screens/dhama/DhamaHomeScreen.tsx`:
```tsx
{hasAnyActiveFilter ? t('dhama.emptyFilteredTitle') : t('dhama.empty')}
```

```tsx
<TouchableOpacity onPress={retryAll} style={[styles.feedbackButton, { borderColor: vTheme.colors.primary }]}>
  <Text style={[styles.feedbackButtonText, { color: vTheme.colors.primary }]}>{t('common.retry', 'Retry')}</Text>
</TouchableOpacity>
```

`frontend/screens/dhama/DhamaMapScreen.tsx`:
```tsx
{loadError ? (
  <View style={[styles.feedbackCard, { backgroundColor: vTheme.colors.surfaceElevated, borderColor: vTheme.colors.divider }]}>
```

## 2026-03-08 (Dhama loading flow now uses skeleton layouts instead of bare spinners)

### Измененные файлы
- `frontend/screens/dhama/DhamaSkeleton.tsx`
- `frontend/screens/dhama/DhamaHomeScreen.tsx`
- `frontend/screens/dhama/DhamaCollectionDetailScreen.tsx`
- `frontend/screens/dhama/DhamaMapScreen.tsx`

### Суть правки (от старого к новому)
- Было:
  - `DhamaHome`, `DhamaCollectionDetail` и `DhamaMap` во время загрузки в основном показывали только `ActivityIndicator`;
  - первый вход и refresh выглядели как пустой экран со спиннером без понимания будущей структуры;
  - на shared mobile UI происходил резкий скачок от пустого loading-state к финальному layout.
- Стало:
  - добавлен локальный reusable helper `DhamaSkeletonBlock`;
  - `DhamaHome` показывает skeleton для quick filters, collections, featured rail и списка мест;
  - `DhamaCollectionDetail` показывает skeleton hero/header/stats/buttons/lead-card;
  - `DhamaMap` показывает skeleton map-frame и skeleton списка marker cards до загрузки реальных данных;
  - общее поведение загрузки на iOS и Android стало более предсказуемым и визуально цельным.

### Сниппеты кода

`frontend/screens/dhama/DhamaSkeleton.tsx`:
```tsx
export const DhamaSkeletonBlock: React.FC<Props> = ({ color, style }) => (
  <View style={[styles.base, { backgroundColor: color }, style]} />
);
```

`frontend/screens/dhama/DhamaMapScreen.tsx`:
```tsx
{loading ? (
  <View style={styles.mapLoadingSurface}>
    <DhamaSkeletonBlock color={skeletonColor} style={styles.mapLoadingBlock} />
  </View>
) : (
  <WebView source={{ html }} style={styles.webview} />
)}
```

## 2026-03-08 (DhamaMap WebView lifecycle hardened with mapReady handshake and crash-safe reload path)

### Измененные файлы
- `frontend/screens/dhama/DhamaMapScreen.tsx`

### Суть правки (от старого к новому)
- Было:
  - `DhamaMap` считал карту готовой сразу после завершения загрузки markers с backend;
  - если `Leaflet` CDN не догружался, `L` оказывался undefined и экран мог зависнуть в неопределенном состоянии;
  - у `WebView` не было собственного timeout и не обрабатывались `onHttpError`, `render process gone` и похожие platform-level сбои.
- Стало:
  - HTML карты отправляет `mapReady` после успешной инициализации `Leaflet`;
  - HTML также отправляет `mapError`, если `Leaflet` не загрузился или map-script упал в runtime;
  - RN-экран держит skeleton поверх карты, пока не придет `mapReady`;
  - добавлен timeout `map_init_timeout` и контролируемый reload через `webViewReloadKey`;
  - подключены `onError`, `onHttpError`, `onRenderProcessGone`, `onContentProcessDidTerminate`, чтобы iOS/Android сбои `WebView` не оставляли карту в зависшем состоянии.

### Сниппеты кода

`frontend/screens/dhama/DhamaMapScreen.tsx`:
```tsx
if (payload?.type === 'mapReady') {
  setMapReady(true);
  setWebViewError(null);
  return;
}
```

```tsx
onRenderProcessGone={() => {
  setWebViewError('render_process_gone');
  return true;
}}
```

## 2026-03-08 (Dhama quick filters now render localized labels instead of raw enum values)

### Измененные файлы
- `frontend/screens/dhama/DhamaHomeScreen.tsx`
- `frontend/i18n/locales/ru.ts`
- `frontend/i18n/locales/en.ts`
- `frontend/i18n/locales/hi.ts`

### Суть правки (от старого к новому)
- Было:
  - quick filters на `DhamaHome` показывали raw backend values вроде `gaudiya_vaishnava`, `holy_town`, `temple_city`;
  - на локализованном UI это выглядело как сломанный перевод и технический enum leakage;
  - для неизвестных значений не было даже базового human-readable fallback.
- Стало:
  - `tradition` и `placeType` теперь проходят через локализованные `dhama.filterValues.*` labels;
  - если конкретного translation key нет, UI показывает humanized fallback вместо `snake_case` / `kebab-case`;
  - `region` оставлен как server-provided human label.

### Сниппеты кода

`frontend/screens/dhama/DhamaHomeScreen.tsx`:
```tsx
const translated = t(key);
return translated === key ? fallback : translated;
```

`frontend/i18n/locales/ru.ts`:
```ts
filterValues: {
  tradition: {
    'gaudiya-vaishnava': 'Гаудия-вайшнавизм',
  },
}
```

## 2026-03-08 (DhamaMap waits longer for WebView readiness and separates marker errors from map-engine errors)

### Измененные файлы
- `frontend/screens/dhama/DhamaMapScreen.tsx`
- `frontend/i18n/locales/ru.ts`
- `frontend/i18n/locales/en.ts`
- `frontend/i18n/locales/hi.ts`

### Суть правки (от старого к новому)
- Было:
  - `DhamaMap` переходил в `map_init_timeout` слишком рано, через `4.5s`;
  - timeout мог сработать еще до нормальной инициализации `WebView` на медленном устройстве/симуляторе;
  - UI показывал один и тот же текст ошибки и для `markers not loaded`, и для `Leaflet/WebView` failure.
- Стало:
  - timeout увеличен до `9s`;
  - countdown начинается только после реального `WebView onLoadStart/onLoadEnd`, а не просто после завершения backend fetch;
  - добавлены `allowFileAccess`, `allowUniversalAccessFromFileURLs`, `cacheEnabled` для более устойчивого `WebView` path;
  - пользователь теперь видит разный текст для `markers failed` и `map engine failed`.

### Сниппеты кода

`frontend/screens/dhama/DhamaMapScreen.tsx`:
```tsx
if (loading || loadError || webViewError || mapReady || !webViewStarted) {
  return;
}
```

```tsx
const mapErrorBody = loadError
  ? t('dhama.mapErrorBody')
  : t('dhama.mapWebViewErrorBody');
```

## 2026-03-08 (DhamaHome header upgraded to a gradient hero instead of a flat text block)

### Измененные файлы
- `frontend/screens/dhama/DhamaHomeScreen.tsx`

### Суть правки (от старого к новому)
- Было:
  - верх `DhamaHome` был обычным блоком `title + subtitle + map button`;
  - экран был рабочим, но сверху не имел сильной visual identity;
  - пока у мест нет полноценного hero-media, верх сервиса выглядел слишком плоско.
- Стало:
  - верхний блок заменен на gradient hero-card;
  - CTA карты встроен прямо в hero;
  - добавлены теплые glow-формы и более выразительная иерархия текста;
  - active collection context теперь тоже читается внутри hero без отдельного сухого title-блока.

### Сниппеты кода

`frontend/screens/dhama/DhamaHomeScreen.tsx`:
```tsx
<LinearGradient
  colors={['#1C214A', '#8D4B24', '#E4B66B']}
  style={styles.heroShell}
>
```

```tsx
<TouchableOpacity
  onPress={() => navigation.navigate('DhamaMap', selectedCollectionSlug ? { collectionSlug: selectedCollectionSlug } : undefined)}
  style={styles.heroMapButton}
>
```

## 2026-03-08 (Portal locked-service banner now links to profile completion)

### Измененные файлы
- `frontend/screens/portal/PortalMainScreen.tsx`
- `frontend/i18n/locales/ru.ts`
- `frontend/i18n/locales/en.ts`
- `frontend/__tests__/screens/portal/PortalMainScreen.test.tsx`

### Суть правки (что было -> что стало)
- Было:
  - при первом входе через social login пользователь мог попасть в `Portal` с незавершенным профилем;
  - locked-banner для `Yatra` только сообщал, что сервис откроется после завершения профиля;
  - прямого перехода в экран выбора роли/категории не было.
- Стало:
  - в banner добавлена CTA-кнопка перехода в `EditProfile`;
  - текст кнопки вынесен в i18n (`portal.seekerTravelLocked.action`);
  - добавлен regression test на отображение CTA и навигацию в профиль.

### Короткий сниппет

`frontend/screens/portal/PortalMainScreen.tsx`:
```tsx
<TouchableOpacity
  style={styles.lockedServiceHintAction}
  onPress={() => navigation.navigate('EditProfile')}
>
  <Text style={styles.lockedServiceHintActionText}>
    {t('portal.seekerTravelLocked.action')}
  </Text>
</TouchableOpacity>
```

## 2026-03-09 (WidgetSelection page indicator moved below the bottom dock)

### Измененные файлы
- `frontend/screens/portal/WidgetSelectionScreen.tsx`

### Суть правки (что было -> что стало)
- Было:
  - индикатор текущего экрана (`dots` + `Виджеты · свайп вправо...`) стоял над нижним quick-access dock;
  - визуально он конкурировал с canvas и баром, и воспринимался как часть верхнего контента.
- Стало:
  - индикатор перенесен ниже нижнего dock-бара;
  - dock и edit-toolbar синхронно смещены, чтобы не было наложений и чтобы layout оставался стабильным на iOS/Android.

### Короткий сниппет

`frontend/screens/portal/WidgetSelectionScreen.tsx`:
```tsx
const WIDGET_DOCK_BOTTOM = 52;
const WIDGET_DOCK_HEIGHT = 108;
const WIDGET_DOCK_GAP = 10;
const PAGE_INDICATOR_BOTTOM = 14;
```

```tsx
bottom: WIDGET_DOCK_BOTTOM + WIDGET_DOCK_HEIGHT + WIDGET_DOCK_GAP,
```

```tsx
bottom: PAGE_INDICATOR_BOTTOM,
```

## 2026-03-10 (Portal and WidgetSelection swipe hint moved under bottom dock layer)

### Измененные файлы
- `frontend/screens/portal/PortalMainScreen.tsx`
- `frontend/screens/portal/WidgetSelectionScreen.tsx`

### Суть правки (что было -> что стало)
- Было:
  - swipe-hint (`page dots` + текст-подсказка) на `Portal` и частично в `WidgetSelection` визуально находился над нижним bar/dock;
  - подсказка конкурировала с нижней навигацией и воспринималась как более верхний UI-слой.
- Стало:
  - swipe-hint на обоих экранах закреплен как нижний overlay под dock/bar;
  - в `PortalMainScreen` hint рендерится раньше `PortalGrid`, поэтому нижний dock всегда лежит поверх него;
  - в `WidgetSelectionScreen` hint оставлен под dock и переведен в `pointerEvents="none"`, чтобы не перехватывать касания.

### Короткий сниппет

`frontend/screens/portal/PortalMainScreen.tsx`:
```tsx
<View pointerEvents="none" style={styles.pageIndicatorContainer}>
  ...
</View>

<PortalGrid ... />
```

`frontend/screens/portal/WidgetSelectionScreen.tsx`:
```tsx
<View pointerEvents="none" style={styles.pageIndicatorContainer}>
  ...
</View>
```

## 2026-03-10 (Default portal layout now starts with thematic folders)

### Измененные файлы
- `frontend/types/portal.ts`
- `frontend/__tests__/services/portalLayoutService.test.ts`

### Суть правки (что было -> что стало)
- Было:
  - на новой установке первая страница портала создавалась плоским списком почти всех сервисов;
  - пользователь сразу видел перегруженную сетку из множества отдельных иконок.
- Стало:
  - default layout создает 6 тематических папок: `Общение`, `Практика`, `Контент`, `Сервисы`, `Путешествия`, `Профиль`;
  - нижний quick access остается прежним: `Контакты`, `Звонки`, `AI-чат`;
  - структура применяется именно к новому default layout, без автоматической миграции существующих пользовательских раскладок.

### Короткий сниппет

`frontend/types/portal.ts`:
```tsx
const DEFAULT_PORTAL_FOLDER_DEFINITIONS = [
  { id: 'folder-communication', name: 'Общение', serviceIds: ['chat', 'rooms', 'channels', 'connect', 'history'] },
  { id: 'folder-practice', name: 'Практика', serviceIds: ['path_tracker', 'ekadashi_calendar', 'sadhu_sanga', 'seva', 'education', 'library'] },
]
```

```tsx
const defaultItems: PortalFolder[] = DEFAULT_PORTAL_FOLDER_DEFINITIONS.map(...)
```

## 2026-03-10 (Legacy flat portal layout migrates into thematic folders on init)

### Измененные файлы
- `frontend/context/PortalLayoutContext.tsx`
- `frontend/__tests__/services/portalLayoutService.test.ts`

### Суть правки (что было -> что стало)
- Было:
  - если у пользователя уже был сохранен старый flat portal layout, простой рестарт эмулятора не показывал новые папки;
  - новая структура папок применялась только на чистом default layout.
- Стало:
  - при инициализации портала legacy single-page layout без папок автоматически группируется в тематические папки;
  - миграция затрагивает только простой старый layout без папок и не перестраивает уже кастомизированные папочные / многосекционные раскладки;
  - seeker locked-folder logic обновлена для работы с сервисами внутри обычных папок.

### Короткий сниппет

`frontend/context/PortalLayoutContext.tsx`:
```tsx
if (hasAnyFolder || !hasOnlyServices) {
  return { layout: inputLayout, changed: false };
}
```

```tsx
const groupedFolders: PortalFolder[] = DEFAULT_PORTAL_FOLDER_DEFINITIONS
  .map((folder) => ...)
  .filter(Boolean);
```

## 2026-03-10 (PRO mode no longer flattens portal folders)

### Измененные файлы
- `frontend/components/portal/PortalGrid.tsx`

### Суть правки (что было -> что стало)
- Было:
  - при `godModeEnabled` / `PRO` portal grid специально разворачивал папки в плоский список сервисов;
  - из-за этого даже после успешной миграции layout пользователь визуально не видел папки.
- Стало:
  - `PortalGrid` рендерит реальные `page.items` и в `PRO`-режиме тоже;
  - папки остаются видимыми для аккаунтов с `PRO`/god mode и больше не маскируются плоским списком.

### Короткий сниппет

`frontend/components/portal/PortalGrid.tsx`:
```tsx
const items = useMemo(() => {
  return page?.items ?? [];
}, [page]);
```
## 2026-03-08 (Support ticket form: add back button)

- Измененные файлы:
  - `frontend/screens/support/SupportTicketFormScreen.tsx`
- Суть правки:
  - Было: экран создания тикета открывался без явной кнопки возврата в левом верхнем углу.
  - Стало: в верхней части формы добавлена кнопка `←`, которая делает `goBack()`, а при отсутствии back stack возвращает в `SupportHome`.
- Код:
```tsx
<TouchableOpacity
  style={styles.backButton}
  onPress={() => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('SupportHome', { entryPoint }))}
>
  <Text style={styles.backButtonText}>←</Text>
</TouchableOpacity>
```

## 2026-03-08 (Marketplace home: Axios 500 no longer triggers iOS RedBox)

### Измененные файлы
- `frontend/screens/portal/shops/MarketHomeScreen.tsx`
- `frontend/services/marketService.ts`
- `server/internal/services/product_service.go`

### Суть правки (что было -> что стало)
- Было:
  - `GET /api/products` мог падать на сервере из-за SQL `COUNT("products"."*")`;
  - `MarketHomeScreen` и `marketService` прокидывали сырой `AxiosError` в `console.error(...)`;
  - на iOS dev это поднимало RedBox `Error loading market data: AxiosError 500`.
- Стало:
  - server query больше не использует `Select("products.*")` перед `Count()`, поэтому `/api/products` не генерирует некорректный SQL;
  - mobile logging переведен на короткий summary без передачи полного `AxiosError` объекта;
  - recoverable API error больше не выглядит как crash на iOS dev.

### Короткие сниппеты кода

`server/internal/services/product_service.go`:
```go
query := database.DB.Model(&models.Product{}).
    Joins("JOIN shops ON shops.id = products.shop_id")
```

`frontend/screens/portal/shops/MarketHomeScreen.tsx`:
```tsx
const summary = getRequestErrorSummary(error, 'Failed to load market data');
const logger = __DEV__ ? console.log : console.warn;
logger(`[MarketHomeScreen] ${summary}`);
```

## 2026-03-09 (Services portal screen: lighter list mount for Android and shared mobile navigation)

### Измененные файлы
- `frontend/screens/portal/services/ServicesHomeScreen.tsx`

### Суть правки (что было -> что стало)
- Было:
  - при открытии `ServicesHomeScreen` и возврате в портал список сервисов заново проходил через более дорогой mount/render path;
  - callbacks навигации и `renderItem` пересоздавались на каждый рендер;
  - Android-список использовал базовую виртуализацию без дополнительной настройки batching/window.
- Стало:
  - navigation/list callbacks стабилизированы через `useCallback`;
  - `renderItem` вынесен в memoized callback;
  - для Android добавлены более агрессивные параметры виртуализации (`windowSize`, `initialNumToRender`, `maxToRenderPerBatch`, `updateCellsBatchingPeriod`) для более быстрого отклика при входе в сервисы и возврате к портальному сценарию.

### Короткий сниппет

`frontend/screens/portal/services/ServicesHomeScreen.tsx`:
```tsx
const renderServiceItem = useCallback(({ item }: { item: Service }) => (
  <ServiceCard service={item} onPress={handleServicePress} compact={isAndroidReducedEffects} />
), [handleServicePress, isAndroidReducedEffects]);

const listTuningProps = useMemo(() => (
  Platform.OS === 'android'
    ? {
        removeClippedSubviews: true,
        windowSize: isAndroidReducedEffects ? 5 : 7,
        initialNumToRender: isAndroidReducedEffects ? 4 : 6,
        maxToRenderPerBatch: isAndroidReducedEffects ? 4 : 6,
        updateCellsBatchingPeriod: isAndroidReducedEffects ? 34 : 24,
      }
    : {}
), [isAndroidReducedEffects]);
```

## 2026-03-09 (Portal Services keep-alive rollback after portal interaction blocking)

### Измененные файлы
- `frontend/screens/portal/PortalMainScreen.tsx`

### Суть правки (что было -> что стало)
- Было:
  - для ускорения возврата `services -> portal` `ServicesHomeScreen` держался скрыто смонтированным внутри `Portal`;
  - на практике это дало побочный эффект: после возврата на портал grid/swipe/tap могли блокироваться на несколько секунд.
- Стало:
  - keep-alive для `ServicesHomeScreen` откатан;
  - `PortalMainScreen` снова возвращается к обычному mount/unmount поведению для `services`;
  - в силе оставлена только более безопасная оптимизация списка в самом `ServicesHomeScreen`.

### Короткий сниппет

`frontend/screens/portal/PortalMainScreen.tsx`:
```tsx
case 'services':
  return <ServicesHomeScreen onBack={backToGrid} />;
```

## 2026-03-09 (PortalGrid Android fast-path after ANR on portal return)

### Измененные файлы
- `frontend/components/portal/PortalGrid.tsx`

### Суть правки (что было -> что стало)
- Было:
  - `PortalGrid` на Android мог входить в тяжелый render path с glass/blur/decorative dock layers и `CylinderRow` эффектами;
  - при возврате из части сервисов это совпадало с main-thread stall и могло доходить до ANR `Application Not Responding`.
- Стало:
  - для Android включен более жесткий fast-path: тяжелые portal effects принудительно отключаются независимо от `high_quality`;
  - `measureInWindow` для grid/dock не выполняется на обычном входе и остается только для edit mode;
  - dock на Android рендерится через почти непрозрачный solid background вместо прозрачного glass-композита, чтобы снизить overdraw и стоимость первого интерактивного кадра.

### Короткий сниппет

`frontend/components/portal/PortalGrid.tsx`:
```tsx
const isAndroidPortalFastPath = Platform.OS === 'android';
const allowHeavyPortalEffects = !isAndroidPortalFastPath && !isAndroidReducedEffects;

if (isAndroidPortalFastPath && !isEditMode) {
  return;
}
```

## 2026-03-09 (Contacts and Services catalog moved from embedded portal tabs to native stack flow)

### Измененные файлы
- `frontend/App.tsx`
- `frontend/types/navigation.ts`
- `frontend/screens/portal/serviceLaunchResolver.ts`
- `frontend/screens/portal/PortalMainScreen.tsx`

### Суть правки (что было -> что стало)
- Было:
  - `contacts` и `services_catalog` запускались как embedded `activeTab` внутри `PortalMainScreen`;
  - возврат на портал требовал тяжелого внутреннего rerender большого portal tree, из-за чего на Android могли быть фризы и блокировки после части сервисов.
- Стало:
  - `contacts` вынесен в отдельный stack route `ContactsHome`;
  - `services_catalog` теперь открывает уже существующий stack route `ServicesHome`;
  - launch resolver и связанный переход `calls -> contacts` теперь используют native stack navigation, как `Dhama`, вместо возврата в embedded portal tab.

### Короткий сниппет

`frontend/screens/portal/serviceLaunchResolver.ts`:
```tsx
if (serviceId === 'services_catalog') {
  return { kind: 'navigate', screen: 'ServicesHome' };
}

if (serviceId === 'contacts') {
  return { kind: 'navigate', screen: 'ContactsHome' };
}
```

## 2026-03-09 (ContactsHome Android stabilization after stack migration)

### Измененные файлы
- `frontend/screens/portal/contacts/ContactsScreen.tsx`

### Суть правки (что было -> что стало)
- Было:
  - после перевода `contacts` в отдельный stack route экран оставался без явной back button;
  - на Android `ContactsScreen` продолжал использовать тяжелый visual/list path и мог доходить до ANR при входе во `FocusEvent`.
- Стало:
  - в `ContactsScreen` добавлена явная верхняя back button с fallback `goBack -> Portal`;
  - для Android reduced-effects отключается photo/glass visual path, aura у scaffold и включается более агрессивная виртуализация списка (`windowSize`, `initialNumToRender`, `maxToRenderPerBatch`, `updateCellsBatchingPeriod`, `estimatedItemSize/getItemLayout`);
  - модальное окно выбора городов на Android больше не тянет лишний blur-path по умолчанию.

### Короткий сниппет

`frontend/screens/portal/contacts/ContactsScreen.tsx`:
```tsx
const isAndroidReducedEffects = Platform.OS === 'android' && effectivePerformanceMode !== 'high_quality';
const usePhotoBg = isPhotoBg && !isAndroidReducedEffects;

<TouchableOpacity
  onPress={() => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Portal'))}
>
  <ArrowLeft size={20} color={usePhotoBg ? '#FFFFFF' : vTheme.colors.text} />
</TouchableOpacity>
```
## 2026-03-10 (Role carousel swipe reliability on mobile profile screen)

- Измененные файлы:
  - `frontend/components/roles/RoleSelectionSection.tsx`
  - `frontend/screens/settings/EditProfileScreen.tsx`
- Суть правки:
  - Было: на Android горизонтальный свайп карточек ролей внутри `EditProfile` часто перехватывался родительским вертикальным `ScrollView`, из-за чего листание ролей вправо/влево не срабатывало.
  - Стало: `RoleSelectionSection` сообщает о старте/окончании горизонтального жеста, а `EditProfileScreen` на это время отключает вертикальный скролл родителя.
- Код:
```tsx
<RoleSelectionSection
  selectedRole={role}
  onSelectRole={setRole}
  onHorizontalSwipeActiveChange={setIsRoleCarouselInteracting}
/>

<ScrollView scrollEnabled={!isRoleCarouselInteracting} ... />
```

## 2026-03-10 (Registration role carousel: Android horizontal swipe conflict fix)

- Измененные файлы:
  - `frontend/screens/RegistrationScreen.tsx`
- Суть правки:
  - Было: в profile-phase регистрации горизонтальный свайп ролей на Android мог перехватываться родительским вертикальным `ScrollView`.
  - Стало: `RegistrationScreen` подписан на `onHorizontalSwipeActiveChange` из `RoleSelectionSection` и временно выключает вертикальный скролл формы при активном горизонтальном жесте.
- Код:
```tsx
<RoleSelectionSection
  selectedRole={role}
  onSelectRole={setRole}
  onHorizontalSwipeActiveChange={setIsRoleCarouselInteracting}
/>

<ScrollView scrollEnabled={!isRoleCarouselInteracting} ... />
```

## 2026-03-10 (Rooms stack migration and invite/back flow)

### Измененные файлы
- `frontend/App.tsx`
- `frontend/types/navigation.ts`
- `frontend/screens/portal/serviceLaunchResolver.ts`
- `frontend/screens/portal/PortalMainScreen.tsx`
- `frontend/screens/portal/chat/PortalChatScreen.tsx`
- `frontend/screens/portal/chat/RoomsHomeScreen.tsx`
- `frontend/screens/portal/chat/RoomInviteEntryScreen.tsx`

### Суть правки (что было -> что стало)
- Было:
  - `rooms` открывался как embedded `activeTab` внутри `PortalMainScreen`;
  - `RoomInviteEntryScreen` после join/invalid token возвращал в `Portal` с `initialTab: 'rooms'`;
  - back из `RoomChat` в итоге мог возвращать пользователя в тяжелый portal-shell path.
- Стало:
  - `rooms` открывается отдельным stack route `RoomsHome`;
  - `PortalMainScreen` больше не держит `rooms` как embedded-tab;
  - `RoomInviteEntryScreen` теперь ведет в `RoomsHome`, а `reset()` после join строит стек `RoomsHome -> RoomChat`;
  - для `RoomsHome` добавлен собственный back path `goBack -> Portal`.

### Короткий сниппет

`frontend/screens/portal/serviceLaunchResolver.ts`:
```tsx
if (serviceId === 'rooms') {
  return { kind: 'navigate', screen: 'RoomsHome' };
}
```

`frontend/screens/portal/chat/RoomInviteEntryScreen.tsx`:
```tsx
navigation.reset({
  index: 1,
  routes: [
    { name: 'RoomsHome' },
    { name: 'RoomChat', params: { roomId: joinedRoomID, roomName: joinedRoomName } },
  ],
});
```

## 2026-03-10 (Portal chat shortcut aligned with assistant flow)

### Измененные файлы
- `frontend/screens/portal/serviceLaunchResolver.ts`
- `frontend/screens/portal/PortalMainScreen.tsx`

### Суть правки (что было -> что стало)
- Было:
  - portal shortcut `chat` открывал embedded `PortalChatScreen`, который фактически показывал комнаты;
  - это не совпадало с продуктовым смыслом `chat` как AI assistant shortcut и держало лишний embedded path в `PortalMainScreen`.
- Стало:
  - `chat` теперь резолвится в `assistant_chat`, как и `services`;
  - `PortalMainScreen` больше не рендерит embedded `chat` tab;
  - тур/shortcut `chat` теперь всегда открывает route `Chat`, а не screen комнат.

### Короткий сниппет

`frontend/screens/portal/serviceLaunchResolver.ts`:
```tsx
if (serviceId === 'chat') {
  return { kind: 'assistant_chat' };
}
```

## 2026-03-10 (Deferred ChatContext startup work)

### Измененные файлы
- `frontend/context/ChatContext.tsx`

### Суть правки (что было -> что стало)
- Было:
  - `ChatProvider` на старте сразу читал `chat_history` из `AsyncStorage`;
  - сразу же выполнял `ragService.getDomains()`;
  - сохранение AI chat history писалось в storage прямо в горячем path открытия assistant/new chat.
- Стало:
  - первичное чтение `chat_history` и загрузка RAG domains перенесены в `InteractionManager.runAfterInteractions`;
  - запись истории теперь батчится через `persistChatHistory()` и тоже откладывается до завершения текущих UI interactions;
  - это снижает конкуренцию за main-thread/bridge в момент входа на портал и первого открытия assistant.

### Короткий сниппет

`frontend/context/ChatContext.tsx`:
```tsx
const task = InteractionManager.runAfterInteractions(async () => {
  const savedHistory = await AsyncStorage.getItem('chat_history');
  ...
});

const persistChatHistory = useCallback((nextHistory: ChatHistory[]) => {
  historyPersistTimeoutRef.current = setTimeout(() => {
    InteractionManager.runAfterInteractions(() => {
      AsyncStorage.setItem('chat_history', JSON.stringify(nextHistory));
    });
  }, 120);
}, []);
```

## 2026-03-10 (One-shot portal boot loader after interactive login)

### Измененные файлы
- `frontend/context/UserContext.tsx`
- `frontend/components/portal/PortalGrid.tsx`
- `frontend/screens/portal/PortalMainScreen.tsx`

### Суть правки (что было -> что стало)
- Было:
  - после нового login пользователь сразу видел `PortalMainScreen`, пока `PortalLayoutProvider` еще догружал layout/visibility;
  - при remote wallpaper первый кадр портала мог появляться раньше прогрева background;
  - портал не имел отдельного session-scoped gate между `login()` и первым готовым paint.
- Стало:
  - `UserContext` хранит одноразовый флаг `shouldShowPortalBootLoader`, который ставится только при новом `login()` и сбрасывается после первого готового portal paint;
  - `PortalMainScreen` монтирует портал сразу, но держит поверх full-screen `SplashScreen` overlay, пока не готовы layout, background и первый layout кадр;
  - `PortalGrid` отдает одноразовый `onInitialLayoutReady`, чтобы overlay снимался после реального первого layout, а не только после auth-state change;
  - добавлен fail-safe timeout `2000ms`, чтобы loader не зависал при ошибке preload background.

### Короткие сниппеты кода

`frontend/context/UserContext.tsx`:
```tsx
const [shouldShowPortalBootLoader, setShouldShowPortalBootLoader] = useState(false);

const completePortalBootLoader = useCallback(() => {
  setShouldShowPortalBootLoader(false);
}, []);
```

`frontend/screens/portal/PortalMainScreen.tsx`:
```tsx
if (portalBootBackgroundType === 'image' && /^https?:\/\//i.test(portalBootBackground)) {
  Image.prefetch(portalBootBackground).catch(() => undefined).finally(() => {
    setIsPortalBackgroundReady(true);
  });
}
```

## 2026-03-10 (Native launch screen de-branded, JS splash switched to tilak logo)

### Измененные файлы
- `frontend/components/ui/SplashScreen.tsx`
- `frontend/android/app/src/main/res/drawable/launch_screen.xml`
- `frontend/ios/vedamatch/LaunchScreen.storyboard`

### Суть правки (что было -> что стало)
- Было:
  - на старте показывались два бренд-экрана подряд: native launch screen и затем JS `SplashScreen`;
  - JS splash использовал `logo_vedamatch.png`;
  - iOS launch screen содержал текстовый branding, Android launch screen рендерил logo bitmap.
- Стало:
  - native launch screen на iOS и Android оставлен как спокойный однотонный фон без первого логотипа/текста;
  - второй, уже JS-level splash, теперь использует `logo_tilak.png`;
  - фон native launch screen выровнен под цвет JS splash (`#F8F3EA`) для более мягкого перехода без визуального дубля.

### Короткие сниппеты кода

`frontend/components/ui/SplashScreen.tsx`:
```tsx
<Animated.Image
  source={require('../../assets/logo_tilak.png')}
  style={[styles.logo, animatedStyle]}
  resizeMode="contain"
/>
```

`frontend/android/app/src/main/res/drawable/launch_screen.xml`:
```xml
<layer-list xmlns:android="http://schemas.android.com/apk/res/android">
    <item android:drawable="#F8F3EA" />
</layer-list>
```

## 2026-03-10 (Android portal startup fast-path after social login)

### Измененные файлы
- `frontend/screens/portal/PortalMainScreen.tsx`

### Суть правки (что было -> что стало)
- Было:
  - на Android после успешного `VK` login `PortalMainScreen` продолжал монтировать тяжелый portal tree под full-screen boot overlay;
  - пользователь видел уже успешную авторизацию, но main thread мог зависнуть на первом portal mount и система показывала `Application Not Responding`.
- Стало:
  - в Android startup-path `PortalMainScreen` сначала рендерит облегченный shell с `ActivityIndicator`;
  - полноценный `PortalGrid` откладывается через `InteractionManager.runAfterInteractions()` и монтируется только после завершения boot overlay и layout init;
  - первый portal paint после social login идет в reduced-chrome режиме: без wallpaper/slideshow, blur и тяжелых панелей, пока стартовые interactions не закончатся;
  - iOS-поведение не менялось, но shared mobile navigation/boot logic теперь безопаснее для Android social-login startup.

### Короткие сниппеты кода

`frontend/screens/portal/PortalMainScreen.tsx`:
```tsx
const [isPortalGridMounted, setIsPortalGridMounted] = useState(Platform.OS !== 'android');
```

```tsx
const interactionTask = InteractionManager.runAfterInteractions(() => {
  requestAnimationFrame(() => {
    setIsPortalGridMounted(true);
  });
});
```

```tsx
if (shouldUsePortalStartupFastPath || shouldUsePortalStartupPlainChrome) {
  return (
    <PortalBackgroundLayer portalBackgroundType="color" ...>
      <View style={styles.portalStartupShell}>
        <ActivityIndicator size="large" color={vTheme.colors.primary} />
      </View>
    </PortalBackgroundLayer>
  );
}
```

## 2026-03-10 (Shared social auth UX + Telegram first login)

### Измененные файлы
- `frontend/screens/LoginScreen.tsx`
- `frontend/i18n/locales/ru.ts`
- `frontend/i18n/locales/en.ts`
- `frontend/i18n/locales/hi.ts`
- `server/internal/handlers/auth_handler.go`

### Суть правки (что было -> что стало)
- Было:
  - после возврата из `VK` / `Telegram` пользователь видел только долгий переход без явного статуса;
  - `Google` на Android при `DEVELOPER_ERROR` показывал общий fallback alert;
  - `TelegramMiniAppLogin` возвращал `TELEGRAM_LINK_REQUIRED`, если `telegram_user_id` еще не был привязан к существующему пользователю.
- Стало:
  - `LoginScreen` показывает shared progress overlay для `Google` / `VK` / `Telegram`, пока social auth flow еще завершается;
  - `Google` `DEVELOPER_ERROR` теперь маппится в отдельное user-facing сообщение про OAuth configuration mismatch;
  - backend `TelegramMiniAppLogin` на первом успешном входе через Telegram создает нового пользователя автоматически и возвращает стандартный auth payload, как `Google` / `VK`.
  - `2026-03-10` device verify: `Google` login проходит на Android release-сборке `1.1.26 (28)`;
  - `2026-03-10` production verify: backend Telegram first-login fix задеплоен на `Vedamatch -> Server` (commit `ad7c6b6e4b473f9d2561032012e079c54c8e1f54`).

### Короткие сниппеты кода

`frontend/screens/LoginScreen.tsx`:
```tsx
{socialProgressText && !vkAuthUrl && (
  <View pointerEvents="none" style={styles.socialLoadingOverlay}>
    <ActivityIndicator color={ModernVedicTheme.colors.primary} size="large" />
    <Text style={styles.socialLoadingTitle}>{socialProgressText.title}</Text>
  </View>
)}
```

`server/internal/handlers/auth_handler.go`:
```go
if errors.Is(err, gorm.ErrRecordNotFound) {
    newUser := models.User{
        Email: buildTelegramFallbackEmail(telegramUser.ID),
        TelegramUserID: &telegramUserID,
        Language: normalizeTelegramLocale(telegramUser.LanguageCode),
    }
    if err := createAuthUser(&newUser); err != nil { ... }
    user = newUser
}
```

## 2026-03-10 (LKM Telegram launch params bootstrap hardening)

### Измененные файлы
- `lkm/src/components/lkm-cabinet-client.tsx`
- `lkm/package.json`

### Суть правки (что было -> что стало)
- Было:
  - `lkm` Mini App определял Telegram-контекст почти только через `window.Telegram.WebApp.initData`;
  - если клиент Telegram не успевал отдать `initData` в глобальный объект, экран падал в обычный email-login вместо auto login;
  - production build `lkm` шел через дефолтный `next build`, который локально падал на Turbopack panic.
- Стало:
  - bootstrap `lkm` читает `tgWebAppData` и `tgWebAppStartParam` из URL hash/search, что соответствует официальной модели launch params Telegram Mini Apps;
  - launch params сразу сохраняются в `sessionStorage`, чтобы не теряться на redirect/reload внутри Mini App;
  - production build `lkm` закреплен на `next build --webpack`, потому что этот путь стабильно собирается и локально, и в Dokploy.

### Короткие сниппеты кода

`lkm/src/components/lkm-cabinet-client.tsx`:
```tsx
const locationLaunchParams = extractTelegramLaunchParamsFromLocation(window.location);
const telegramInitDataValue = (
  telegramWebApp?.initData?.trim()
  || locationLaunchParams.initData
  || savedLaunchParams.initData
);
```

```tsx
persistTelegramLaunchParams({
  initData: telegramInitDataValue,
  startParam: telegramStartParam,
  user: telegramMiniAppUser || null,
});
```

`lkm/package.json`:
```json
"build": "next build --webpack"
```

## 2026-03-10 (Shared Telegram auth settings hardening against masked secret overwrite)

### Измененные файлы
- `server/internal/handlers/admin_handler.go`
- `server/internal/handlers/admin_handler_test.go`
- `server/internal/services/telegram_auth_service.go`
- `server/internal/services/telegram_auth_service_test.go`

### Суть правки (что было -> что стало)
- Было:
  - admin backend маскировал чувствительные `system_settings` как `********`, но при сохранении принимал эти masked placeholders как реальные значения и писал их обратно в БД;
  - из-за этого production `TELEGRAM_BOT_TOKEN` / `SUPPORT_TELEGRAM_BOT_TOKEN` могли быть уничтожены маской;
  - Telegram auth service брал первый непустой token без попытки отличить masked placeholder от реального bot token.
- Стало:
  - `UpdateSystemSettings` игнорирует masked значения для чувствительных ключей и не затирает реальные секреты звездочками;
  - `ResolveAuthBotToken()` игнорирует masked Telegram token values и ищет первый usable candidate среди `TELEGRAM_AUTH_BOT_TOKEN`, `TELEGRAM_BOT_TOKEN`, `SUPPORT_TELEGRAM_BOT_TOKEN`;
  - shared mobile Telegram auth больше не должен ломаться после обычного открытия/сохранения admin settings.

### Короткие сниппеты кода

`server/internal/handlers/admin_handler.go`:
```go
if isMaskedSensitiveSystemSettingValue(k, v) {
    continue
}
setting.Value = v
```

`server/internal/services/telegram_auth_service.go`:
```go
for _, candidate := range []string{
    s.getSetting("TELEGRAM_AUTH_BOT_TOKEN"),
    s.getSetting("TELEGRAM_BOT_TOKEN"),
    s.getSetting("SUPPORT_TELEGRAM_BOT_TOKEN"),
} {
    if token := normalizeTelegramBotToken(candidate); token != "" {
        return token
    }
}
```

## 2026-03-10 (Telegram Mini App graceful fallback + env token fallback)

### Измененные файлы
- `lkm/src/components/lkm-cabinet-client.tsx`
- `lkm/src/lib/cabinet-i18n.ts`
- `server/internal/services/telegram_auth_service.go`
- `server/internal/services/telegram_auth_service_test.go`

### Суть правки (что было -> что стало)
- Было:
  - если Telegram Mini App login падал из-за отсутствующего bot token или из-за timeout, `lkm` уводил пользователя в misleading `Telegram not linked` flow;
  - `Continue manually` тоже принудительно включал linking-state вместо обычной формы входа;
  - `ResolveAuthBotToken()` умел игнорировать masked значения, но не пробовал env fallback после испорченного stored setting.
- Стало:
  - `lkm` различает `TELEGRAM_AUTH_BOT_TOKEN_MISSING` / `TELEGRAM_AUTH_DISABLED` и показывает честное сообщение о временной недоступности Telegram, оставляя обычные варианты входа;
  - `Continue manually` и watchdog timeout теперь возвращают пользователя в normal login fallback, без ложной привязки Telegram;
  - backend `ResolveAuthBotToken()` перебирает кандидаты по каждому ключу из settings и затем из env, чтобы переживать masked/corrupted stored values, если валидный token есть в environment.

### Короткие сниппеты кода

`lkm/src/components/lkm-cabinet-client.tsx`:
```tsx
if (rawMessage.includes('TELEGRAM_AUTH_BOT_TOKEN_MISSING') || rawMessage.includes('TELEGRAM_AUTH_DISABLED')) {
  setTelegramLinkRequired(false);
  setError(copy.errorTelegramUnavailable);
}
```

```tsx
onClick={() => {
  setIsTelegramAuthLoading(false);
  setTelegramLinkRequired(false);
  setError(copy.errorTelegramFallbackLogin);
}}
```

`server/internal/services/telegram_auth_service.go`:
```go
for _, key := range []string{
    "TELEGRAM_AUTH_BOT_TOKEN",
    "TELEGRAM_BOT_TOKEN",
    "SUPPORT_TELEGRAM_BOT_TOKEN",
} {
    for _, candidate := range s.telegramSettingCandidates(key) {
        if token := normalizeTelegramBotToken(candidate); token != "" {
            return token
        }
    }
}
```

## 2026-03-10 (Portal folders: shared icon chrome + portal-style modal sheet)

### Измененные файлы
- `frontend/components/portal/portalIconShared.tsx`
- `frontend/components/portal/PortalIcon.tsx`
- `frontend/components/portal/PortalFolder.tsx`
- `frontend/components/portal/FolderModal.tsx`
- `frontend/i18n/locales/ru.ts`
- `frontend/i18n/locales/en.ts`
- `frontend/i18n/locales/hi.ts`
- `frontend/__tests__/components/portal/portalIconShared.test.ts`
- `frontend/__tests__/components/portal/FolderModal.test.tsx`

### Суть правки (что было -> что стало)
- Было:
  - закрытая папка рисовала preview иконок своей отдельной логикой и визуально расходилась с обычными portal icons;
  - смена `portalIconStyle` и background mode не полностью применялась к preview внутри папки и к содержимому открытой папки;
  - открытая папка показывала иконки без подписей сервисов;
  - folder modal был более узким и менее согласованным с portal-shell.
- Стало:
  - theme-aware рендер иконок вынесен в shared слой `portalIconShared`, который используют и `PortalIcon`, и `PortalFolder`;
  - закрытая папка, preview-иконки, label pill и veda/glass chrome синхронно реагируют на `portalIconStyle`, `portalBackgroundType` и dark/light режим;
  - открытая папка осталась modal, но стала portal-style bottom sheet с адаптивной 3-column grid и локализованными названиями сервисов под иконками;
  - reduced Android path использует более легкий visual fallback без обязательного тяжелого blur.

### Короткие сниппеты кода

`frontend/components/portal/PortalIcon.tsx`:
```tsx
const iconChrome = useMemo(
  () => getPortalIconChrome({
    accentColor: service.color,
    portalIconStyle,
    portalBackgroundType,
    isDarkMode,
    reducedEffects: isAndroidReducedEffects,
    roleHighlight,
  }),
  [isAndroidReducedEffects, isDarkMode, portalBackgroundType, portalIconStyle, roleHighlight, service.color],
);
```

`frontend/components/portal/PortalFolder.tsx`:
```tsx
<PortalServiceGlyph
  service={service}
  iconSize={Math.max(10, previewTileSize - 8)}
  portalIconStyle={portalIconStyle}
  portalBackgroundType={portalBackgroundType}
  chrome={previewChrome}
/>
```

`frontend/components/portal/FolderModal.tsx`:
```tsx
<PortalIcon
  service={service}
  isEditMode={false}
  onPress={() => onItemPress(item)}
  onLongPress={() => onRemoveItem(item.id)}
  size="medium"
  showLabel
  labelNumberOfLines={2}
  labelMaxWidth={92}
/>
```

## 2026-03-10 (Portal folder modal: dynamic sheet height to avoid clipped bottom row)

### Измененные файлы
- `frontend/components/portal/FolderModal.tsx`

### Суть правки (что было -> что стало)
- Было:
  - для папок с 4-5 сервисами нижний ряд иконок в modal-sheet мог визуально обрезаться нижней границей sheet на iPhone, потому что scroll-area и минимальная высота контейнера не подстраивались под реальное число рядов.
- Стало:
  - `FolderModal` теперь рассчитывает целевую минимальную высоту sheet от количества рядов (`3` колонки), увеличивает доступную высоту до `86%` экрана и добавляет больший нижний padding для scroll content/grid, чтобы нижний ряд полностью помещался или корректно скроллился без визуального обрезания.

### Короткие сниппеты кода

`frontend/components/portal/FolderModal.tsx`:
```tsx
const maxSheetHeight = Math.round(windowHeight * 0.86);
const gridRowCount = Math.max(1, Math.ceil(displayItems.length / 3));
const estimatedContentHeight = displayItems.length > 0 ? 212 + gridRowCount * 154 : 360;
```

```tsx
style={[
  styles.container,
  {
    backgroundColor: modalSurfaceColor,
    borderColor: modalBorderColor,
    maxHeight: maxSheetHeight,
    minHeight: Math.max(320, targetSheetHeight),
  },
]}
```

## 2026-03-10 (Vedic calendar: shared events model + multi-event mobile UI)

### Измененные файлы
- `server/internal/models/ekadashi.go`
- `server/internal/services/ekadashi_service.go`
- `frontend/types/ekadashi.ts`
- `frontend/utils/ekadashiCalendar.ts`
- `frontend/screens/portal/services/EkadashiCalendarScreen.tsx`
- `frontend/components/portal/CalendarWidget.tsx`
- `frontend/i18n/locales/ru.ts`
- `frontend/i18n/locales/en.ts`
- `frontend/i18n/locales/hi.ts`
- `frontend/types/portal.ts`
- `frontend/constants/portalRoles.ts`

### Суть правки (что было -> что стало)
- Было:
  - backend-календарь отдавал только `days[]` с Экадаши/Махадвадаши;
  - mobile screen и widget умели показывать только одно событие на дату;
  - user-facing service label в портале был `Ekadashi` / `Экадаши`.
- Стало:
  - backend `/ekadashi/*` отдает общий `events[]` для ведического календаря и сохраняет `days[]` как совместимое legacy-поле только для экадаши-событий;
  - в `events[]` вошли `ekadashi`, `mahadvadashi`, `appearance`, `disappearance`, все под единым фильтром организации;
  - mobile screen и widget показывают несколько событий в один день и рендерят разные marker styles для разных типов событий;
  - сервис в user-facing UI переименован в `Calendar` / `Календарь` / `कैलेंडर` без жесткого rename внутренних route/service ids.

### Короткие сниппеты кода

`server/internal/models/ekadashi.go`:
```go
type EkadashiCalendarResponse struct {
    Month  string        `json:"month"`
    Days   []EkadashiDay `json:"days"`
    Events []EkadashiDay `json:"events"`
}
```

`server/internal/services/ekadashi_service.go`:
```go
events, days, generatedFrom, providerDecision := s.resolveMonthCalendar(monthStart, locData, org)
```

`frontend/screens/portal/services/EkadashiCalendarScreen.tsx`:
```tsx
const dayEvents = findCalendarEventsForCell(events, currentMonth, day);
setSelectedDate(buildIsoDate(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day)));
```

`frontend/components/portal/CalendarWidget.tsx`:
```tsx
const dayEvents = findCalendarEventsForCell(calendarEvents, currentMonth, day);
{dayEvents.length > 1 ? <View style={styles.countBadge}><Text>{dayEvents.length}</Text></View> : null}
```

## 2026-03-10 (Portal folder modal: lifted above quick-access dock on iOS and Android)

### Измененные файлы
- `frontend/components/portal/FolderModal.tsx`
- `frontend/__tests__/components/portal/FolderModal.test.tsx`

### Суть правки (что было -> что стало)
- Было:
  - modal папки стоял слишком низко над экраном, визуально конфликтовал с нижним quick-access dock и на Android/iPhone мог не оставлять достаточного пространства для нижнего ряда сервисов.
- Стало:
  - `FolderModal` использует `safe-area insets`, увеличенный bottom offset над dock и более щедрый `maxHeight/minHeight` расчет по числу рядов;
  - sheet теперь поднимается выше нижнего бара на обеих платформах и лучше растягивается под папки с несколькими рядами сервисов.

### Короткие сниппеты кода

`frontend/components/portal/FolderModal.tsx`:
```tsx
const bottomDockGap = Platform.OS === 'android' ? 140 : 124;
const rowLiftBonus = gridRowCount > 1 ? (Platform.OS === 'android' ? 20 : 12) : 0;
const sheetBottomOffset = bottomDockGap + Math.max(insets.bottom, 8) + rowLiftBonus;
```

```tsx
<Animated.View
  style={[
    styles.sheetWrapper,
    animatedContainerStyle,
    { paddingBottom: sheetBottomOffset },
  ]}
>
```

## 2026-03-10 (Portal folder modal: slightly lower anchor above quick-access dock)

### Измененные файлы
- `frontend/components/portal/FolderModal.tsx`

### Суть правки (что было -> что стало)
- Было:
  - после предыдущего подъема modal папки располагался слишком высоко относительно нижнего quick-access dock.
- Стало:
  - уменьшен базовый `bottomDockGap`, поэтому modal опускается немного ниже, оставаясь выше нижнего бара и не обрезая иконки в папках.

### Короткие сниппеты кода

`frontend/components/portal/FolderModal.tsx`:
```tsx
const bottomDockGap = Platform.OS === 'android' ? 124 : 108;
```

## 2026-03-10 (Portal folder modal: reduced internal bottom whitespace)

### Измененные файлы
- `frontend/components/portal/FolderModal.tsx`

### Суть правки (что было -> что стало)
- Было:
  - внутри modal папки был заметный пустой нижний хвост из-за завышенной расчетной высоты и избыточных нижних padding/margin у scroll/grid.
- Стало:
  - уменьшена оценка `estimatedContentHeight`, ослаблен `minHeight`, и сокращены нижние отступы (`container`, `scrollContent`, `itemsGrid`, `iconWrapper`), чтобы контент заканчивался плотнее без лишней пустоты.

### Короткие сниппеты кода

`frontend/components/portal/FolderModal.tsx`:
```tsx
const estimatedContentHeight = displayItems.length > 0 ? 186 + gridRowCount * 146 : 320;
...
minHeight: Math.max(280, targetSheetHeight),
```

## 2026-03-10 (Portal folder modal: compact-screen coefficients for tighter bottom spacing)

### Измененные файлы
- `frontend/components/portal/FolderModal.tsx`

### Суть правки (что было -> что стало)
- Было:
  - для маленьких экранов modal папки использовал те же коэффициенты высоты/offset, что и для обычных экранов, из-за чего мог оставаться заметный нижний пустой зазор.
- Стало:
  - добавлен `isCompactScreen (height < 780)` и отдельные коэффициенты для `bottomDockGap`, `rowLiftBonus`, `maxSheetHeight`, `estimatedContentHeight`, `minHeight` и внутренних bottom padding/margin;
  - на compact-экранах окно папки рендерится плотнее, без лишнего свободного пространства внизу.

### Короткие сниппеты кода

`frontend/components/portal/FolderModal.tsx`:
```tsx
const isCompactScreen = windowHeight < 780;
const bottomDockGap = Platform.OS === 'android'
  ? (isCompactScreen ? 110 : 124)
  : (isCompactScreen ? 74 : 85);
```

```tsx
const contentBottomPadding = isCompactScreen ? 10 : 18;
const gridBottomPadding = isCompactScreen ? 4 : 8;
const iconRowGap = isCompactScreen ? 10 : 14;
```

## 2026-03-10 (Portal header chrome: softer Android reduced-performance icon shadows)

### Измененные файлы
- `frontend/screens/portal/PortalMainScreen.tsx`

### Суть правки (что было -> что стало)
- Было:
  - в `Adaptive` / `Battery Saver` на Android верхние круглые иконки portal header использовали почти тот же chrome, что и обычный режим, из-за чего translucent surface + elevation давали грубые и некрасивые тени.
- Стало:
  - для Android low-performance path введен отдельный reduced header chrome: более мягкий фон, спокойнее border и почти убранный shadow/elevation для header-кнопок;
  - high-quality Android, iOS и `vedamatch` path не менялись по общему поведению.

### Короткие сниппеты кода

`frontend/screens/portal/PortalMainScreen.tsx`:
```tsx
const isAndroidReducedHeaderChrome = Platform.OS === 'android' && !androidVisualPolicy.enableBlur;
const headerCircleSurfaceColor = portalIconStyle === 'vedamatch'
  ? '#121212'
  : isAndroidReducedHeaderChrome
    ? (useLightHeaderIcons ? 'rgba(255,255,255,0.14)' : 'rgba(250,247,240,0.92)')
    : 'rgba(255, 255, 255, 0.25)';
```

```tsx
headerCircularButtonReduced: {
  shadowOpacity: 0,
  shadowRadius: 0,
  elevation: 1,
},
```

## 2026-03-10 (Contacts: memory cache + MMKV warm snapshot + immutable avatar cache)

### Измененные файлы
- `frontend/lib/contactCache.ts`
- `frontend/screens/portal/contacts/ContactsScreen.tsx`
- `frontend/screens/portal/contacts/ContactProfileScreen.tsx`
- `frontend/context/UserContext.tsx`
- `frontend/screens/RegistrationScreen.tsx`
- `frontend/screens/ChatScreen.tsx`

### Суть правки (что было -> что стало)
- Было:
  - при каждом повторном заходе в `Contacts` экран заново дергал `/contacts`, а mount-эффекты отдельно вызывали `/friends`, `/blocks` и `/dating/cities`;
  - базовые списки контактов не восстанавливались после cold start;
  - аватарки в списке и профиле использовали обычный `Image`, поэтому повторные открытия чаще заново прогревали сеть/диск;
  - logout и mutation-пути (`block/unblock`, `add/remove friend`, `uploadAvatar`) не чистили общий cache contacts-flow.
- Стало:
  - для `Contacts` настроен отдельный query-policy: `staleTime=5m`, `gcTime=60m`, `refetchOnMount=true`, `refetchOnReconnect=true`, `refetchOnWindowFocus=false`;
  - базовые query-варианты `all/friends/blocked` сохраняются в MMKV snapshot на `24h` и прогревают query cache на старте экрана;
  - `friends`/`blocked` переведены на `useQuery(['contacts-meta', ...])`, `cities` грузятся lazy и кэшируются на `24h`;
  - список контактов и профиль контакта используют `FastImage` с `immutable` cache; список дополнительно preload-ит верхние `12` аватаров;
  - logout и contact-mutations инвалидируют/очищают contacts cache и snapshots, чтобы не держать stale data между сессиями и после мутаций.

### Короткие сниппеты кода

`frontend/screens/portal/contacts/ContactsScreen.tsx`:
```tsx
const allContactsQuery = useInfiniteQuery({
  queryKey: ['contacts', 'all', debouncedSearch, filterCities.join(',')],
  initialData: !debouncedSearch && filterCities.length === 0
    ? buildContactsSnapshotInitialData(allSnapshot)
    : undefined,
  initialDataUpdatedAt: !debouncedSearch && filterCities.length === 0
    ? allSnapshot?.updatedAt
    : undefined,
  staleTime: CONTACTS_CACHE_STALE_TIME_MS,
  gcTime: CONTACTS_CACHE_GC_TIME_MS,
  refetchOnMount: true,
  refetchOnWindowFocus: false,
  refetchOnReconnect: true,
  ...
});
```

`frontend/screens/portal/contacts/ContactsScreen.tsx`:
```tsx
<FastImage
  source={{
    uri: avatarUrl,
    priority: FastImage.priority.normal,
    cache: FastImage.cacheControl.immutable,
  }}
  style={styles.avatar}
/>
```

`frontend/lib/contactCache.ts`:
```ts
export const invalidateContactsCaches = async (queryClient: QueryClient): Promise<void> => {
  clearContactsSnapshots();
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ['contacts'], refetchType: 'none' }),
    queryClient.invalidateQueries({ queryKey: ['contacts-meta'], refetchType: 'none' }),
  ]);
};
```

## 2026-03-11 (Chat bubbles: softer geometry and cleaner edge treatment)

### Измененные файлы
- `frontend/components/chat/MessageList.tsx`

### Суть правки (что было -> что стало)
- Было:
  - bubble в чате имели общий `borderRadius: 22` и почти прямой срез на нижнем углу (`8`), из-за чего края выглядели жестко и немного коробочно;
  - shadow-shell не повторял точную геометрию пузыря, поэтому контур и тень читались грубее, чем нужно.
- Стало:
  - bubble переведены на более мягкую асимметричную форму с крупным радиусом `28` и маленьким conversational corner `12`;
  - shadow-shell теперь повторяет форму пузыря;
  - добавлен тонкий inner stroke, мягкий верхний highlight и нижний edge-shade, чтобы контур выглядел чище и объемнее без изменения layout сообщений.

### Короткие сниппеты кода

`frontend/components/chat/MessageList.tsx`:
```tsx
bubble: {
  borderRadius: 28,
  minWidth: 108,
  paddingVertical: 13,
  paddingHorizontal: 16,
},
userBubble: {
  borderTopLeftRadius: 28,
  borderTopRightRadius: 28,
  borderBottomLeftRadius: 28,
  borderBottomRightRadius: 12,
},
botBubble: {
  borderTopLeftRadius: 28,
  borderTopRightRadius: 28,
  borderBottomLeftRadius: 12,
  borderBottomRightRadius: 28,
},
```

`frontend/components/chat/MessageList.tsx`:
```tsx
<View style={[bubbleShadowStyle, bubbleShellStyle]}>
  <View style={bubbleStyle}>
    <View style={[styles.bubbleInnerStroke, ...]} />
    <View style={[styles.bubbleEdgeShade, ...]} />
    <View style={isUser ? styles.userBubbleHighlight : styles.botBubbleHighlight} />
    {innerContent}
  </View>
</View>
```

## 2026-03-10 (Portal calendar service icon: explicit CalendarDays glyph mapping)

### Измененные файлы
- `frontend/components/portal/portalIconShared.tsx`

### Суть правки (что было -> что стало)
- Было: сервис `ekadashi_calendar` имел `icon: 'CalendarDays'` в каталоге сервисов, но в `PortalServiceGlyph` не было соответствующего импорта/маппинга иконки, из-за чего включался fallback-глиф.
- Стало: `CalendarDays` добавлен в lucide imports и в `IconComponents`, плюс добавлен emoji fallback `📅` для `premium3d` path.

### Короткие сниппеты кода
`frontend/components/portal/portalIconShared.tsx`:
```tsx
import {
  ...,
  Landmark,
  CalendarDays,
} from 'lucide-react-native';

const IconComponents: Record<string, any> = {
  ...,
  Landmark,
  CalendarDays,
};

const SERVICE_EMOJIS: Record<string, string> = {
  ...,
  ekadashi_calendar: '📅',
};
```

## 2026-03-10 (Portal calendar folder persistence: avoid role fallback race)

### Измененные файлы
- `frontend/context/PortalLayoutContext.tsx`
- `frontend/services/portalLayoutService.ts`

### Суть правки (что было -> что стало)
- Было: при init/refresh в `PortalLayoutContext` роль принудительно подставлялась как `user`, если `user.role` еще не успел загрузиться; далее `initializeLayout` применял role-filter и вырезал `ekadashi_calendar`, после чего папка `Календарь` могла исчезать как пустая.
- Стало: если роль еще не определена, в init/refresh передается `undefined` (без fallback к `user`), а `filterLayoutByRole` в сервисе не применяется до появления валидной роли.

### Короткие сниппеты кода
`frontend/context/PortalLayoutContext.tsx`:
```tsx
const normalizedRole = typeof user?.role === 'string' ? user.role.trim() : '';
const role = normalizedRole.length > 0 ? normalizedRole : undefined;
const savedLayout = await initializeLayout(role, blueprint, visibilityMap);
```

`frontend/services/portalLayoutService.ts`:
```ts
const filterLayoutByRole = (layout: PortalLayout, role?: string): PortalLayout => {
  const normalizedRole = (role || '').trim().toLowerCase();
  if (!normalizedRole) {
    return layout;
  }
  ...
};
```

## 2026-03-10 (Vedic calendar access: allow internal admin roles on mobile)

### Измененные файлы
- `frontend/types/portal.ts`
- `frontend/utils/ekadashiCalendar.ts`
- `frontend/screens/portal/services/EkadashiCalendarScreen.tsx`
- `frontend/components/portal/CalendarWidget.tsx`
- `frontend/i18n/locales/en.ts`
- `frontend/i18n/locales/ru.ts`
- `frontend/i18n/locales/hi.ts`
- `server/internal/services/ekadashi_service.go`

### Суть правки (что было -> что стало)
- Было: календарь был доступен только при `role=devotee`, поэтому `admin/superadmin` не видели папку `Календарь` в портале, widget не включал ведический режим, а backend `/ekadashi/*` отвечал `forbidden`.
- Стало: доступ расширен до `devotee | admin | superadmin` во frontend role-gating и backend guard, при этом обычные роли по-прежнему не имеют доступа.

### Короткие сниппеты кода
`frontend/types/portal.ts`:
```ts
const VEDIC_CALENDAR_ALLOWED_ROLES = new Set(['devotee', 'admin', 'superadmin']);

export const canAccessVedicCalendarRole = (role?: string | null): boolean => (
  VEDIC_CALENDAR_ALLOWED_ROLES.has(String(role || '').trim().toLowerCase())
);
```

`server/internal/services/ekadashi_service.go`:
```go
func (s *EkadashiService) ensureCalendarAccess(role string) error {
	normalizedRole := strings.TrimSpace(strings.ToLower(role))
	if normalizedRole == models.RoleDevotee || models.IsAdminRole(normalizedRole) {
		return nil
	}
	return ErrEkadashiForbidden
}
```

## 2026-03-10 (Vedic calendar access: allow PRO mode and Vaishnava users with bypass)

### Измененные файлы
- `frontend/types/portal.ts`
- `frontend/services/portalLayoutService.ts`
- `frontend/context/PortalLayoutContext.tsx`
- `frontend/screens/portal/services/EkadashiCalendarScreen.tsx`
- `frontend/components/portal/CalendarWidget.tsx`
- `frontend/i18n/locales/en.ts`
- `frontend/i18n/locales/ru.ts`
- `frontend/i18n/locales/hi.ts`
- `server/internal/services/ekadashi_service.go`
- `server/internal/services/ekadashi_service_test.go`
- `server/internal/handlers/ekadashi_handler.go`
- `server/internal/handlers/ekadashi_handler_test.go`

### Суть правки (что было -> что стало)
- Было: даже после открытия доступа для `admin/superadmin` календарь все еще скрывался для обычной роли `user` в `PRO` режиме, потому что portal gating смотрел только на `role`, seeker-lock не знал про `currentPlan/godModeEnabled`, а backend `/ekadashi/organizations` и `/ekadashi/calendar` не считали `PRO` валидным доступом.
- Стало: календарь доступен также при `godModeEnabled=true` или `currentPlan`, содержащем `pro`/`admin`; это правило применяется одинаково в portal layout, screen, widget и backend guard, включая загрузку списка организаций.

### Короткие сниппеты кода
`frontend/types/portal.ts`:
```ts
export const canAccessVedicCalendarRole = (role?: string | null, options?: PortalServiceAccessOptions): boolean => (
  VEDIC_CALENDAR_ALLOWED_ROLES.has(String(role || '').trim().toLowerCase())
  || Boolean(options?.godModeEnabled)
  || hasProPlanBypass(options?.currentPlan)
);
```

`frontend/context/PortalLayoutContext.tsx`:
```ts
const { layout: adjustedLayout, changed } = hasPortalBypass(user?.godModeEnabled, user?.currentPlan)
  ? { layout: sanitizedLayout, changed: false }
  : groupLockedServicesForSeeker(sanitizedLayout, user?.role, user?.isProfileComplete);
```

`server/internal/services/ekadashi_service.go`:
```go
func hasEkadashiCalendarAccess(user models.User, role string) bool {
	if normalizedRole == models.RoleDevotee || models.IsAdminRole(normalizedRole) {
		return true
	}
	return user.GodModeEnabled || isProPlanBypass(user.CurrentPlan)
}
```

## 2026-03-10 (Portal calendar launch fix: handle EkadashiCalendar route in PortalMainScreen)

### Измененные файлы
- `frontend/screens/portal/PortalMainScreen.tsx`
- `frontend/__tests__/screens/portal/PortalMainScreen.test.tsx`

### Суть правки (что было -> что стало)
- Было: portal service resolver уже возвращал `{ kind: 'navigate', screen: 'EkadashiCalendar' }` для `ekadashi_calendar`, но `PortalMainScreen.navigateResolvedScreen(...)` не содержал ветку для `EkadashiCalendar`. В результате на iOS/Android тап по папке `Календарь`/ярлыку календаря визуально ничего не делал.
- Стало: `PortalMainScreen` явно обрабатывает `EkadashiCalendar` и открывает экран календаря; добавлен regression test на `onServicePress('ekadashi_calendar')`.

### Короткие сниппеты кода
`frontend/screens/portal/PortalMainScreen.tsx`:
```ts
if (screen === 'EkadashiCalendar') {
  navigation.navigate('EkadashiCalendar');
  return;
}
```

`frontend/__tests__/screens/portal/PortalMainScreen.test.tsx`:
```ts
act(() => {
  latestOnServicePress?.('ekadashi_calendar');
});

expect(navigation.navigate).toHaveBeenCalledWith('EkadashiCalendar');
```

## 2026-03-10 (ISKCON live calendar parser: preserve inline markup text for iOS/Android fallback removal)

### Измененные файлы
- `server/internal/services/ekadashi_iskcon_provider.go`
- `server/internal/services/ekadashi_iskcon_provider_test.go`

### Суть правки (что было -> что стало)
- Было: `extractHTMLTextLines(...)` разбирал HTML по отдельным `TextToken`. На актуальном `vaishnavacalendar.org` день месяца, слово `Ekadashi` и `Fast` обернуты в `<b>/<strong>`, поэтому строка вроде `15. (Sun) Krishna Ekadashi...` разваливалась на отдельные фрагменты и live-parser `ISKCON` возвращал `no ekadashi days parsed`. На iOS/Android это проявлялось как notice `Live-источник временно недоступен...` при валидном upstream.
- Стало: строки собираются по block-level DOM nodes (`h1-h6`, `p`, `li`, `td`, `th`) с полным descendant text content; inline markup больше не ломает regex-разбор дней и live `ISKCON`-календарь снова должен приходить без ложного fallback.

### Короткие сниппеты кода
`server/internal/services/ekadashi_iskcon_provider.go`:
```go
if node.Type == xhtml.ElementNode && isHTMLLineNode(node.Data) {
	text := strings.TrimSpace(extractNodeText(node))
	text = strings.Join(strings.Fields(text), " ")
	...
}
```

`server/internal/services/ekadashi_iskcon_provider.go`:
```go
func extractNodeText(node *xhtml.Node) string {
	var builder strings.Builder
	...
	if current.Type == xhtml.TextNode {
		builder.WriteString(stdhtml.UnescapeString(current.Data))
	}
}
```

`server/internal/services/ekadashi_iskcon_provider_test.go`:
```go
<p class='m3 text-start fs-5'><b>15</b>. (Sun) Krishna Ekadashi. Papa Vimochani <b>Ekadashi</b>. <b>Fast</b> .</p>
```

## 2026-03-10 (Ekadashi runtime moved to published DB import model for shared mobile behavior)

### Измененные файлы
- `server/internal/models/calendar.go`
- `server/internal/database/database.go`
- `server/internal/services/ekadashi_import_service.go`
- `server/internal/services/ekadashi_service.go`
- `server/internal/services/ekadashi_reminder_scheduler_service.go`
- `server/internal/handlers/admin_handler.go`
- `server/cmd/api/main.go`

### Суть правки (что было -> что стало)
- Было: mobile calendar screen/widget зависели от runtime backend-модели `live provider -> fallback`, а push-scheduler Экадаши и экран календаря могли читать разные источники. При деградации donor source пользователь видел notice вроде `Live-источник временно недоступен...`, даже если сама бизнес-логика календаря уже могла быть импортирована заранее.
- Стало: backend переводится на `import -> normalize -> store -> publish -> serve`. Экран `/ekadashi/calendar`, `/ekadashi/day` и scheduler напоминаний читают только опубликованные данные из БД. Donor source нужен для import job, а не для runtime mobile-запросов. Это меняет shared mobile semantics источника данных: при наличии publication клиент не должен зависеть от доступности donor сайта.

### Короткие сниппеты кода
`server/internal/services/ekadashi_service.go`:
```go
func (s *EkadashiService) resolveMonthCalendar(monthStart time.Time, locData locationSnapshot, org models.EkadashiOrganization) ([]models.EkadashiDay, []models.EkadashiDay, string, models.EkadashiProviderDecision) {
	return NewCalendarImportService().LoadPublishedMonth(monthStart, org, locData)
}
```

`server/internal/services/ekadashi_import_service.go`:
```go
const (
	calendarProviderModeDBImported = "db_imported"
	calendarProviderModeDBCurated  = "db_curated"
	calendarProviderModeDBMissing  = "db_missing"
)
```

`server/internal/services/ekadashi_reminder_scheduler_service.go`:
```go
day, err := s.ekadashi.GetDay(
	pref.UserID,
	models.RoleDevotee,
	candidateDate.Format("2006-01-02"),
	pref.OrganizationID,
	locData.TimeZone,
	locData.City,
	locData.Country,
)
```

`server/internal/handlers/admin_handler.go`:
```go
run, err := importService.ImportAndPublish(
	organization.ID,
	city,
	timezone,
	country,
	24,
)
```

## 2026-03-11 (Portal system folders now follow app language on iOS/Android)

### Измененные файлы
- `frontend/components/portal/PortalFolder.tsx`
- `frontend/components/portal/FolderModal.tsx`
- `frontend/components/portal/resolvePortalFolderName.ts`
- `frontend/i18n/locales/en.ts`
- `frontend/i18n/locales/ru.ts`
- `frontend/i18n/locales/hi.ts`

### Суть правки (что было -> что стало)
- Было: системные папки портала хранились с русскими именами в layout и продолжали отображаться на русском после переключения приложения на английский или хинди.
- Стало: системные папки резолвятся по `folder.id` через i18n-ключи в рантайме. Grid-подписи и заголовок `FolderModal` теперь меняют язык вместе с приложением. Пользовательские переименования папок сохраняются без перезаписи.

### Короткие сниппеты кода
`frontend/components/portal/resolvePortalFolderName.ts`:
```ts
const FOLDER_TRANSLATION_KEY_BY_ID: Record<string, string> = {
  'folder-communication': 'portal.folderLabels.communication',
  'folder-seeker-locked': 'portal.folderLabels.lockedAfterProfile',
};
```

`frontend/components/portal/PortalFolder.tsx`:
```tsx
const folderDisplayName = resolvePortalFolderName(folder, t);
...
<Text>{folderDisplayName}</Text>
```

`frontend/components/portal/FolderModal.tsx`:
```tsx
const folderDisplayName = resolvePortalFolderName(folder, t);
const [editName, setEditName] = useState(folderDisplayName);
```

## 2026-03-11 (Polza runtime refresh after admin key updates)

### Измененные файлы
- `server/internal/handlers/admin_handler.go`
- `server/internal/handlers/admin_handler_test.go`

### Суть правки (что было -> что стало)
- Было: при обновлении `POLZA_*` через общую админку значение сохранялось в БД, но runtime `PolzaService` не перезагружался сразу. Из-за этого mobile AI chat и support bot могли продолжать работать на старом ключе до рестарта сервера.
- Стало: после обновления `POLZA_API_KEY`, `POLZA_FAST_MODEL`, `POLZA_REASONING_MODEL`, `POLZA_BASE_URL` админка теперь сразу вызывает `ReloadFromDB()` для `PolzaService`, чтобы shared mobile/backend AI-поведение обновлялось без рестарта.

### Короткие сниппеты кода
`server/internal/handlers/admin_handler.go`:
```go
if k == "POLZA_API_KEY" && v != "" {
	os.Setenv("POLZA_API_KEY", v)
	shouldReloadPolza = true
}

if shouldReloadPolza {
	services.GetPolzaService().ReloadFromDB()
}
```

`server/internal/handlers/admin_handler_test.go`:
```go
if !isPolzaSystemSettingKey("polza_fast_model") {
	t.Fatalf("expected polza_fast_model to be treated as polza setting")
}
```

## 2026-03-11 (AI chat header raised and explicit portal back button)

### Измененные файлы
- `frontend/screens/ChatScreen.tsx`
- `frontend/components/chat/ChatHeader.tsx`
- `frontend/i18n/locales/ru.ts`
- `frontend/i18n/locales/en.ts`
- `frontend/i18n/locales/hi.ts`

### Суть правки (что было -> что стало)
- Было: в AI-чате верхняя панель визуально сидела слишком низко из-за лишнего safe-area отступа, а в assistant mode не было явной кнопки возврата на портал.
- Стало: header поднят выше, AI chat получил отдельную back-кнопку с возвратом именно в `Portal`, а не только menu affordance. Подсказка для кнопки локализована в `ru/en/hi`. Позже title-chip `ИИ-помощник` из header был убран как лишний визуальный шум.
- Также увеличен зазор между `back` и `menu` и расширены сами hit targets, чтобы уменьшить промахи по соседней кнопке на mobile.

### Короткие сниппеты кода
`frontend/screens/ChatScreen.tsx`:
```tsx
const handleBackToPortal = React.useCallback(() => {
  navigation.reset({ index: 0, routes: [{ name: 'Portal' }] });
}, [navigation]);
```

`frontend/components/chat/ChatHeader.tsx`:
```tsx
const headerTopInset = Platform.OS === 'ios' ? Math.max(topInset - 28, 0) : 0;
...
<TouchableOpacity onPress={onBackPress} accessibilityHint={t('chat.backToPortal')}>
  <ChevronLeft color={iconColor} size={20} />
</TouchableOpacity>
```

```tsx
<View style={styles.titleContainer}>
  {recipientUser ? <Text ... /> : null}
</View>
```

```tsx
backButton: { width: 32, height: 32, marginRight: 10 }
menuButton: { width: 32, height: 32 }
```

## 2026-03-11 (AI chat bubbles and source actions refined)

### Измененные файлы
- `frontend/components/chat/MessageList.tsx`

### Суть правки (что было -> что стало)
- Было: AI bubble выглядел утилитарно, в ответах показывались служебные RAG-чипы `Поиск: vector` и `Уверенность`, а переход по источнику из alert-модалки мог не срабатывать из-за прямого `Linking.openURL`.
- Стало: bubble переведен в более теплый glass/paper стиль с мягкой тенью, увеличенным радиусом, более деликатным highlight и улучшенными source cards; служебные retriever/confidence метки убраны из пользовательского UI.
- Стало: открытие внешнего источника теперь проходит через нормализацию URL, `Linking.canOpenURL` и `InteractionManager.runAfterInteractions`, чтобы переход после alert action был стабильнее на iOS/Android.

### Короткие сниппеты кода
`frontend/components/chat/MessageList.tsx`:
```tsx
const normalizedUrl = normalizeExternalUrl(rawUrl);
const supported = await Linking.canOpenURL(normalizedUrl);
InteractionManager.runAfterInteractions(() => {
  Linking.openURL(normalizedUrl)
})
```

```tsx
{!isUser ? <View style={styles.botBubbleHighlight} /> : null}
```

```tsx
sourceCard: {
  borderRadius: 14,
  paddingVertical: 10,
  backgroundColor: 'rgba(255,255,255,0.36)',
}
```

## 2026-03-11 (AI citations now route library sources into Reader)

### Измененные файлы
- `frontend/components/chat/MessageList.tsx`
- `frontend/screens/library/ReaderScreen.tsx`
- `frontend/types/navigation.ts`
- `server/internal/services/domain_assistant_service.go`

### Суть правки (что было -> что стало)
- Было: если AI source указывал внутренний library path вроде `/library/verses?...`, фронт пытался открыть его как внешний URL и показывал `Детали источника недоступны`.
- Стало: `MessageList` распознает internal library citations и открывает их через app navigation в `Reader`, а не через `Linking`.
- Было: `Reader` принимал только `bookCode` и `title`, поэтому citation нельзя было направить на конкретный стих.
- Стало: `Reader` принимает optional `chapter`, `verse`, `canto` и после загрузки главы прокручивается к нужному стиху.
- Дополнительно: backend для новых library verse documents сохраняет `canto` в metadata и формирует `SourceURL` с `verse` query param, чтобы citation оставался точным.

### Короткие сниппеты кода
`frontend/components/chat/MessageList.tsx`:
```tsx
if (readerTarget) {
  navigation.navigate('Reader', readerTarget);
  return true;
}
```

`frontend/types/navigation.ts`:
```ts
Reader: { bookCode: string; title: string; chapter?: number; verse?: string; canto?: number };
```

`frontend/screens/library/ReaderScreen.tsx`:
```tsx
const { bookCode, title, chapter: initialChapterParam, verse: initialVerseParam, canto: initialCantoParam } = route.params;
```

`server/internal/services/domain_assistant_service.go`:
```go
sourceURL := fmt.Sprintf("/library/verses?bookCode=%s&chapter=%d&verse=%s", v.BookCode, v.Chapter, url.QueryEscape(v.Verse))
```

## 2026-03-11 (AI search tabs now constrain RAG domain and open internal app routes)

### Измененные файлы
- `frontend/context/ChatContext.tsx`
- `frontend/components/chat/ChatConstants.ts`
- `frontend/components/chat/MessageList.tsx`
- `frontend/i18n/locales/ru.ts`
- `frontend/i18n/locales/en.ts`
- `frontend/i18n/locales/hi.ts`

### Суть правки (что было -> что стало)
- Было: при выборе `Магазины` AI chat отправлял в RAG сразу все enabled domains, поэтому retrieval мог вернуть library citations вместо market results.
- Стало: `ChatContext` вычисляет requested RAG domains из активного search tab и передает их в `queryHybrid` (`shops -> market`, `services -> services`, `knowledge_base -> library`, и т.д.), чтобы поиск не смешивал разделы.
- Было: в меню `Найти в ...` не было отдельного `services` search tab.
- Стало: `services` добавлен в menu options и локализован в `ru/en/hi`.
- Было: internal citations вида `/products/:id`, `/services/:id`, `/news/:id`, `/ads/:id` и другие наши app-routes не открывались из AI chat.
- Стало: `MessageList` распознает внутренние VedaMatch routes и ведет пользователя прямо на соответствующий экран приложения.

### Короткие сниппеты кода
`frontend/context/ChatContext.tsx`:
```tsx
const requestedDomains = getRequestedRagDomains(messages, ragDomains);
domains: requestedDomains,
```

`frontend/components/chat/ChatConstants.ts`:
```ts
'chat.searchTabs.services',
```

`frontend/components/chat/MessageList.tsx`:
```tsx
match = path.match(/^\/products\/(\d+)$/);
return { screen: 'ProductDetails', params: { productId: Number(match[1]) } };
```

## 2026-03-11 (AI reply bubble widened for readability)

### Измененные файлы
- `frontend/components/chat/MessageList.tsx`

### Суть правки (что было -> что стало)
- Было: AI bubble ограничивался `maxWidth: 85%`, поэтому длинные ответы слишком рано переносились на новую строку и выглядели зажато.
- Стало: bubble и его shadow wrappers расширены до `maxWidth: 92%`, чтобы текст лучше вмещался и ответ читался спокойнее на мобильных экранах.

### Короткие сниппеты кода
`frontend/components/chat/MessageList.tsx`:
```tsx
bubble: { maxWidth: '92%' }
userGlassShadow: { maxWidth: '92%' }
botGlassShadow: { maxWidth: '92%' }
```

## 2026-03-11 (AI chat history list flattened to contacts-style rows)

### Измененные файлы
- `frontend/SettingsDrawer.tsx`

### Суть правки (что было -> что стало)
- Было: история AI-чата в drawer выглядела как набор округлых толстых карточек с blur/background card.
- Стало: элементы истории облегчены относительно старых толстых карточек, но вместо жестких полос-разделителей используются мягкие светлые row-cards с небольшой тенью, чтобы список не выглядел рамочным.
- Дополнительно: CTA `Новый чат` уменьшен и переведен из тяжелой full-width кнопки в более компактную capsule-кнопку, чтобы верх drawer не выглядел перегруженным.
- Дополнительно: drawer получил более выраженный art direction для истории чатов: теплые светлые карточки, мягкие тени, amber-акцент для активной строки и более собранную typography.

### Короткие сниппеты кода
`frontend/SettingsDrawer.tsx`:
```tsx
historyItem: {
  backgroundColor: 'rgba(255,255,255,0.72)',
  borderRadius: 14,
  marginBottom: 8,
  shadowOpacity: 0.08,
}
```

```tsx
newChatButtonWrap: {
  alignSelf: 'flex-start',
  shadowOpacity: 0.1,
}
```

```tsx
historyItem: {
  borderRadius: 18,
  borderWidth: 1,
  shadowOpacity: 0.12,
}
```

## 2026-03-11 (Portal service visibility admin bypass + Android test-group version bump)

### Измененные файлы
- `server/internal/handlers/portal_service_visibility.go`
- `server/internal/handlers/portal_service_visibility_test.go`
- `frontend/services/portalLayoutService.ts`
- `frontend/context/PortalLayoutContext.tsx`
- `frontend/__tests__/services/portalLayoutService.test.ts`
- `frontend/android/app/build.gradle`

### Суть правки (что было -> что стало)
- Было: runtime visibility map `/api/system/portal-services-visibility` рассчитывалась только по `userID`, поэтому `admin/superadmin` так же теряли `hidden` и `beta` сервисы, как и обычные пользователи.
- Стало: backend runtime visibility получил role-aware bypass; для `admin/superadmin` все portal services остаются `Visible=true` независимо от `hidden/beta` политики и allowlist.
- Было: shared mobile filtering в `portalLayoutService` и `PortalLayoutContext` не принимал роль пользователя, поэтому layout/quick access и `isServiceVisible()` жестко следовали runtime `visible`.
- Стало: shared mobile visibility filter принимает `role` и не вырезает сервисы у `admin/superadmin`, сохраняя единое поведение для grid, folders, quick access и service launch checks.
- Было: Android release build был `versionName 1.1.26`, `versionCode 28`.
- Стало: для test-group APK версия повышена до `1.1.27 / 29`, release APK пересобран.

### Короткие сниппеты кода
`server/internal/handlers/portal_service_visibility.go`:
```go
if isAdmin {
	entry.Visible = true
	result[serviceID] = entry
	continue
}
```

`frontend/services/portalLayoutService.ts`:
```ts
export const isPortalVisibilityBypassedForRole = (role?: string | null): boolean =>
    ['admin', 'superadmin'].includes(String(role || '').trim().toLowerCase());
```

`frontend/android/app/build.gradle`:
```gradle
versionName "1.1.27"
versionCode 29
```

## 2026-03-11 (Telegram Mini App auth-only page for mobile sign-in)

### Измененные файлы
- `lkm/src/app/auth/telegram/page.tsx`
- `lkm/src/components/telegram-auth-mini-app-client.tsx`
- `lkm/src/components/lkm-cabinet-client.tsx`
- `lkm/src/lib/telegram-mini-app.ts`
- `lkm/src/lib/cabinet-i18n.ts`
- `lkm/src/app/globals.css`

### Суть правки (что было -> что стало)
- Было: flow `vm_auth_<state>` открывал обычный root `lkm` cabinet/login экран, и при некоторых Telegram auth ошибках или fallback-сценариях пользователь видел `email/password`, `Google`, `VK` или forced link UI, хотя пришел из native app уже через Telegram Mini App.
- Стало: root `lkm` сохраняет Telegram launch params, запрашивает `GET /auth/telegram/mobile/state/:state` и для обычного sign-in purpose делает внутренний redirect на отдельный route `/auth/telegram`.
- Было: Telegram bootstrap helpers были зашиты внутрь `lkm-cabinet-client.tsx`, из-за чего auth-only screen пришлось бы дублировать вручную.
- Стало: launch params, `sessionStorage` persistence, `vm_auth_` parsing, return deep link и Mini App host-resolution вынесены в shared `lkm/src/lib/telegram-mini-app.ts`.
- Было: sign-in и link flow смешивались на одном экране.
- Стало: `/auth/telegram` обслуживает только mobile sign-in из приложения и вызывает `POST /auth/telegram/miniapp/login`; `purpose=link` остается на основном `lkm` route и не уходит на auth-only screen.
- Было: на отдельном Telegram flow не было чистого fallback surface.
- Стало: auth-only page показывает только Telegram-specific status, кнопку `Вернуться в приложение` после success и кнопку `Открыть основную страницу` при ошибке, без `email/password`, `Google` и `VK`.

### Короткие сниппеты кода
`lkm/src/components/lkm-cabinet-client.tsx`:
```tsx
if (!isTelegramMobileAuthFlow || !isTelegramMobileFlowContextResolved || isTelegramMobileLinkFlow) {
  return;
}
router.replace(`/auth/telegram?${nextParams.toString()}`);
```

`lkm/src/components/telegram-auth-mini-app-client.tsx`:
```tsx
await requestPublicJSON(normalizedApiBaseUrl, '/auth/telegram/miniapp/login', {
  method: 'POST',
  body: {
    initData: telegramInitData,
    deviceId: getOrCreateLkmDeviceID(),
    mobileAuthState: telegramMobileAuthState,
  },
});
```

`lkm/src/lib/telegram-mini-app.ts`:
```ts
export function resolveTelegramBootstrapContext(location: Location): TelegramBootstrapContext {
  // WebApp initData + URL hash/search + sessionStorage fallback
}
```

## 2026-03-11 (Portal/Widgets shared pager shell)

### Измененные файлы
- `frontend/screens/portal/PortalMainScreen.tsx`
- `frontend/screens/portal/WidgetSelectionScreen.tsx`
- `frontend/components/portal/PortalGrid.tsx`
- `frontend/components/portal/PortalQuickAccessDock.tsx`
- `frontend/components/portal/widgets/WidgetPageContent.tsx`
- `frontend/components/portal/widgets/WidgetCanvasGrid.tsx`
- `frontend/components/portal/portalWorkspaceConstants.ts`
- `frontend/types/navigation.ts`
- `frontend/App.tsx`
- `frontend/jest.setup.js`
- `frontend/package.json`
- `frontend/package-lock.json`

### Суть правки (что было -> что стало)
- Было: свайп `Portal -> WidgetSelection` открывал второй полноценный screen с повторным mount `PortalBackgroundLayer`, `ScreenScaffold`, header, dock и widget state.
- Стало: `PortalMainScreen` стал единым workspace-shell, а `Portal` и `Widgets` переключаются как две страницы `react-native-pager-view`.
- Было: `WidgetSelectionScreen` рендерил собственный shell.
- Стало: `WidgetSelectionScreen` оставлен только как compat-wrapper и сразу делает `replace('Portal', { initialPage: 'widgets', returnToWidget: true })`.
- Было: нижний dock существовал отдельно в `PortalGrid` и отдельно в screen виджетов.
- Стало: общий dock вынесен в `frontend/components/portal/PortalQuickAccessDock.tsx`; на widget page он работает в read-only режиме.
- Было: drag/edit overlay состояния не были частью shell-level swipe policy.
- Стало: pager swipe блокируется при `edit mode`, DnD, `WidgetPickerSheet` и открытом portal folder modal.
- Было: сервис `travel` резолвился в `TravelHome`, но route отсутствовал в stack/navigation types.
- Стало: `TravelHome` добавлен в `RootStackParamList` и `App.tsx`, чтобы resolver и navigation были согласованы.

### Короткие сниппеты кода
`frontend/screens/portal/PortalMainScreen.tsx`:
```tsx
<PagerView
  ref={pagerRef}
  initialPage={workspacePage === 'widgets' ? 1 : 0}
  scrollEnabled={workspaceSwipeEnabled}
  offscreenPageLimit={1}
  onPageSelected={handleWorkspacePageSelected}
  onPageScrollStateChanged={handleWorkspacePageScrollStateChanged}
>
```

`frontend/screens/portal/WidgetSelectionScreen.tsx`:
```tsx
navigation.replace('Portal', {
  initialPage: 'widgets',
  returnToWidget: true,
});
```

`frontend/components/portal/PortalQuickAccessDock.tsx`:
```tsx
const effectiveIsEditMode = forceReadOnly ? false : isEditMode;
```

`frontend/App.tsx`:
```tsx
<Stack.Screen name="TravelHome" component={TravelHomeScreen} options={{ headerShown: false }} />
```

## 2026-03-11

### Измененные файлы
- `frontend/screens/portal/PortalMainScreen.tsx`
- `frontend/components/portal/PortalQuickAccessDock.tsx`
- `frontend/android/app/build.gradle`
- `frontend/ios/vedamatch.xcodeproj/project.pbxproj`

### Суть правки
- Было: `Portal ↔ Widgets` после перехода на shared `PagerView` вел себя по-разному на iOS и Android:
  - на iOS header и нижний dock оставались визуально неподвижными, двигался только центральный workspace;
  - на Android native `PagerView` компоновался агрессивнее, а свайп ощущался менее чувствительным.
- Стало:
  - Android overlays (`header`, page indicator, quick-access dock) подняты отдельным слоем над pager через явные `zIndex/elevation`;
  - на Android чувствительность переключения workspace вынесена в shell-level `RNGH Pan`, потому что `react-native-pager-view` не имеет публичных настроек `touch slop`/drag threshold;
  - iOS сохранен на штатном interactive pager-swipe;
  - подняты версии сборок:
    - Android: `1.1.27 (29)` -> `1.1.28 (30)`
    - iOS: `1.1.17 (9)` -> `1.1.18 (10)`

### Короткие сниппеты кода
`frontend/screens/portal/PortalMainScreen.tsx`:
```tsx
const pagerScrollEnabled = isAndroidWorkspaceGestureSwipe ? false : workspaceSwipeEnabled;

const workspaceSwipeGesture = Gesture.Pan()
  .enabled(isAndroidWorkspaceGestureSwipe && workspaceSwipeEnabled)
  .activeOffsetX([-8, 8])
  .failOffsetY([-12, 12])
  .minDistance(6)
  .runOnJS(true)
  .onEnd((event) => {
    handleAndroidWorkspaceSwipeEnd(event.translationX, event.velocityX);
  });
```

`frontend/components/portal/PortalQuickAccessDock.tsx`:
```tsx
quickAccessDock: {
  position: 'absolute',
  zIndex: 18,
  elevation: 18,
}
```

### Измененные файлы
- `frontend/ios/Podfile.lock`

### Суть правки
- Было: после перевода `Portal ↔ Widgets` на `react-native-pager-view` iOS runtime падал с `No component found for view with name "RNCViewPager"`, потому что native pod еще не был установлен в workspace.
- Стало: в `frontend/ios` выполнен `pod install`, `react-native-pager-view` добавлен в CocoaPods graph и iOS debug build успешно линкует `react_native_pager_view.framework`.

### Короткие сниппеты кода
`frontend/ios/Podfile.lock`:
```txt
- react-native-pager-view (6.9.1):
- react-native-pager-view (from `../node_modules/react-native-pager-view`)
react-native-pager-view:
  :path: "../node_modules/react-native-pager-view"
```

### Проверка
- `pod install` в `frontend/ios` завершился успешно.
- `xcodebuild -workspace vedamatch.xcworkspace -scheme vedamatch -configuration Debug -sdk iphonesimulator ... build` -> `BUILD SUCCEEDED`.

## 2026-03-11

### Измененные файлы
- `frontend/ios/vedamatch.xcodeproj/project.pbxproj`

### Суть правки
- Было: у app target `vedamatch` в `Debug` был задан `DEVELOPMENT_TEAM = CVW85BZU5Z`, а в `Release` стояла пустая строка.
- Стало: `Release` использует тот же `DEVELOPMENT_TEAM = CVW85BZU5Z`, что и `Debug`, поэтому Xcode больше не должен падать с `Signing for "vedamatch" requires a development team`.

### Короткие сниппеты кода
`frontend/ios/vedamatch.xcodeproj/project.pbxproj`:
```pbxproj
13B07F951A680F5B00A75B9A /* Release */ = {
  buildSettings = {
    DEVELOPMENT_TEAM = CVW85BZU5Z;
  };
};
```

## 2026-03-11

### Измененные файлы
- `frontend/ios/vedamatch.xcodeproj/project.pbxproj`

### Суть правки
- Было: iOS project находился в несогласованном локальном signing state:
  - `Debug` и `Release` app target использовали разные `DEVELOPMENT_TEAM`;
  - tests target оставался на другом team;
  - локальный bundle id был частично изменен и в одном из build configurations стал битым (`com.korobkov.vedamatch-`).
- Стало: app и tests выровнены на один локальный Personal Team и один набор локальных bundle id:
  - `DEVELOPMENT_TEAM = MS49D4HQV9`
  - `com.korobkov.vedamatch`
  - `com.korobkov.vedamatchTests`
- Дополнительно очищено локальное Xcode state:
  - удалены `frontend/ios/build` и app-specific `DerivedData`;
  - повторно выполнен `pod install`;
  - workspace заново открыт через `frontend/ios/vedamatch.xcworkspace`.

### Короткие сниппеты кода
`frontend/ios/vedamatch.xcodeproj/project.pbxproj`:
```pbxproj
DEVELOPMENT_TEAM = MS49D4HQV9;
PRODUCT_BUNDLE_IDENTIFIER = com.korobkov.vedamatch;
```

```pbxproj
DEVELOPMENT_TEAM = MS49D4HQV9;
PRODUCT_BUNDLE_IDENTIFIER = com.korobkov.vedamatchTests;
```

## 2026-03-11

### Измененные файлы
- `frontend/node_modules/react-native-voip-push-notification/ios/RNVoipPushNotification/RNVoipPushNotificationManager.h`
- `frontend/node_modules/react-native-voip-push-notification/ios/RNVoipPushNotification/RNVoipPushNotificationManager.m`

### Суть правки
- Было: на iOS app мог упасть сразу после запуска или при регистрации VoIP push с `NSInvalidArgumentException`:
  - `-[RNVoipPushNotificationManager pushRegistry:didUpdatePushCredentials:forType:]: unrecognized selector`
- Причина: модуль назначал `RNVoipPushNotificationManager` делегатом `PKPushRegistry`, но сам класс не реализовывал instance-методы `PKPushRegistryDelegate`.
- Стало: `RNVoipPushNotificationManager` явно реализует `PKPushRegistryDelegate` и прокидывает instance callbacks в существующие class-level handlers модуля.

### Короткие сниппеты кода
`frontend/node_modules/react-native-voip-push-notification/ios/RNVoipPushNotification/RNVoipPushNotificationManager.h`:
```objc
@interface RNVoipPushNotificationManager : RCTEventEmitter <RCTBridgeModule, PKPushRegistryDelegate>
```

`frontend/node_modules/react-native-voip-push-notification/ios/RNVoipPushNotification/RNVoipPushNotificationManager.m`:
```objc
- (void)pushRegistry:(PKPushRegistry *)registry
didUpdatePushCredentials:(PKPushCredentials *)credentials
             forType:(PKPushType)type
{
    [[self class] didUpdatePushCredentials:credentials forType:(NSString *)type];
}
```

## 2026-03-12

### Измененные файлы
- `frontend/App.tsx`
- `frontend/components/theme/ScreenAuraBackground.tsx`
- `frontend/screens/portal/PortalMainScreen.tsx`

### Суть правки
- Было: `ScreenAuraBackground` практически не различал `variant='portal'` и остальные saffron-экраны. На light + `screenVisualStyle='saffron'` + `high_quality` портал мог выглядеть выбеленным после возврата из настроек, особенно на Android.
- Также было: Android `AppSettings`/`LinkedAccounts` наследовали глобальный stack `fade`, а сам portal light-saffron shell использовал почти белый `vTheme.colors.background`. В результате белая пелена могла проявляться не только после `Settings`, но и после возврата из embedded services вроде `Contacts`.
- Стало:
  - для `variant='portal'` light-аура стала теплее и темнее, а интенсивность glow/rays снижена;
  - `AppSettings` и `LinkedAccounts` на Android переведены с fade на обычный push/slide path;
  - `PortalMainScreen` в light `saffron` теперь использует теплый portal-level gradient вместо почти белой плоскости.

### Короткие сниппеты кода
`frontend/components/theme/ScreenAuraBackground.tsx`:
```tsx
const variantMultiplier = variant === 'portal' ? 0.74 : 1;
```

```tsx
if (variant === 'portal') {
  return ['#F6E9D3', '#F3E1BE', '#EEDAB5'];
}
```

```tsx
return variant === 'portal' ? 0.24 : 0.45;
```

`frontend/App.tsx`:
```tsx
<Stack.Screen
  name="AppSettings"
  options={{ animation: Platform.OS === 'android' ? 'slide_from_right' : 'slide_from_right' }}
/>
```

`frontend/screens/portal/PortalMainScreen.tsx`:
```tsx
const nonClassicPortalBackground = isDarkMode
  ? vTheme.colors.background
  : '#F5E7CA|#E7CF9D';
```

### Измененные файлы
- `frontend/components/roles/RoleSelectionSection.tsx`
- `frontend/screens/portal/services/EkadashiCalendarScreen.tsx`
- `frontend/types/navigation.ts`
- `frontend/utils/aiNavigation.ts`
- `frontend/components/chat/MessageList.tsx`
- `frontend/screens/library/LibraryHomeScreen.tsx`
- `frontend/screens/library/BookListScreen.tsx`
- `frontend/screens/library/ReaderScreen.tsx`

### Суть правки
- Было:
  - в `EditProfile` выбор роли использовал `horizontal ScrollView` и ручные `onTouchStart/onTouchMove`, из-за чего карусель роли листалась тяжело и конфликтовала с вертикальным scroll формы;
  - `EkadashiCalendarScreen` отдавал слишком много высоты вторичным настройкам и слишком мало самой календарной сетке, а светлая тема давала слабый контраст;
  - переходы из AI-чата во внутренние library/details routes не несли общего origin/back-контракта, из-за чего back-flow мог возвращать в несогласованный stack и визуально давать белый экран.
- Стало:
  - `RoleSelectionSection` переведен на `FlatList` со `snapToInterval`, `disableIntervalMomentum`, `getItemLayout` и автоцентрированием выбранной карточки;
  - `EkadashiCalendarScreen` перестроен вокруг крупной календарной сетки, details выбранного дня подняты выше, а `location/notifications` вынесены в accordion-блоки ниже;
  - введен shared AI-origin navigation contract (`origin='ai_chat'`, `returnTo`) и helper для безопасного back-flow в library chain и других internal links.

### Короткие сниппеты кода
`frontend/components/roles/RoleSelectionSection.tsx`:
```tsx
<FlatList
  horizontal
  snapToInterval={snapInterval}
  disableIntervalMomentum
  getItemLayout={getItemLayout}
/>
```

`frontend/screens/portal/services/EkadashiCalendarScreen.tsx`:
```tsx
const calendarCellSize = useMemo(() => {
  const availableWidth = Math.max(280, screenWidth - 68);
  return Math.max(42, Math.min(56, Math.floor(availableWidth / 7) - 4));
}, [screenWidth]);
```

`frontend/utils/aiNavigation.ts`:
```ts
export const withAiNavigationMeta = (params, returnTo = 'chat') => ({
  ...(params || {}),
  origin: 'ai_chat',
  returnTo,
});
```

```ts
export const handleAiBackNavigation = (navigation, meta, portalParams) => {
  const target = resolveAiBackTarget(navigation, meta);
  if (target === 'chat') {
    navigation.dispatch(CommonActions.reset({ index: 0, routes: [{ name: 'Chat' }] }));
  }
};
```

## 2026-03-12

### Измененные файлы
- `frontend/screens/ChatScreen.tsx`
- `frontend/utils/aiNavigation.ts`
- `frontend/screens/portal/contacts/ContactProfileScreen.tsx`

### Суть правки
- Было:
  - `ChatScreen` при back из assistant chat делал `navigation.reset({ routes: [{ name: 'Portal' }] })`, что на Android могло заново пересоздавать portal shell и визуально давать белый экран/пелену;
  - `ContactProfileScreen` в fallback-ветке тоже делал жесткий `reset` в `Portal`;
  - shared `handleAiBackNavigation()` сразу делал `reset` в `Chat`/`Portal`, даже если нужный экран уже лежал предыдущим route в stack.
- Стало:
  - `ChatScreen` теперь сначала возвращается через `goBack()` в уже существующий `Portal`, если он лежит под `Chat`, и использует `navigate('Portal')` только как fallback;
  - `ContactProfileScreen` заменен на `navigate('Portal', { initialTab: 'contacts' })` без полного reset;
  - `handleAiBackNavigation()` сначала проверяет предыдущий route и делает `goBack()` для `Chat`/`Portal`, если целевой экран уже в стеке.

### Короткие сниппеты кода
`frontend/screens/ChatScreen.tsx`:
```tsx
if (navigation.canGoBack() && prevRoute?.name === 'Portal') {
  navigation.goBack();
  return;
}

navigation.navigate('Portal');
```

`frontend/utils/aiNavigation.ts`:
```ts
if (target === 'portal') {
  if (navigation.canGoBack() && previousRouteName === 'Portal') {
    navigation.goBack();
    return;
  }
}
```

## 2026-03-12 (Role selection switched from carousel to 2-column card grid)

### Измененные файлы
- `frontend/components/roles/RoleSelectionSection.tsx`
- `frontend/screens/RegistrationScreen.tsx`
- `frontend/screens/settings/EditProfileScreen.tsx`

### Суть правки
- Было:
  - выбор роли был горизонтальной каруселью (`FlatList horizontal`) и требовал перелистывания;
  - в registration/edit-profile существовал служебный swipe-coordination state для карусели.
- Стало:
  - `RoleSelectionSection` переведен на статичную сетку карточек `2 в ряд` (`flexWrap`), без горизонтального скролла;
  - карточка роли выбирается тапом, а `?` на карточке по-прежнему открывает `RoleInfoModal` с подробностями;
  - в registration/edit-profile удалены legacy props/state, связанные с горизонтальной каруселью (`onHorizontalSwipeActiveChange`, `isRoleCarouselInteracting`).

### Короткий сниппет
`frontend/components/roles/RoleSelectionSection.tsx`:
```tsx
<View style={styles.grid}>
  {ROLE_OPTIONS.map((option) => (
    <View key={option.id} style={styles.cardCell}>
      {renderRoleCard(option)}
    </View>
  ))}
</View>
```

## 2026-03-12 (PRO activation removed from mobile purchase flow)

### Измененные файлы
- `frontend/screens/settings/ProPlansScreen.tsx`
- `frontend/screens/settings/EditProfileScreen.tsx`
- `frontend/screens/multimedia/RadioScreen.tsx`
- `frontend/screens/multimedia/VideoScreen.tsx`
- `frontend/screens/multimedia/MultimediaHubScreen.tsx`
- `frontend/screens/multimedia/AudioScreen.tsx`
- `frontend/screens/multimedia/TVScreen.tsx`
- `frontend/services/proService.ts`
- `frontend/content/legalDocuments.ts`

### Суть правки (от старого к новому)
- Было:
  - мобильное приложение показывало экран планов `PRO`, цены в `LKM`, кнопку покупки и CTA на апгрейд из профиля и мультимедиа;
  - mobile client использовал `GET /pro/plans` и `POST /pro/purchase`;
  - правовые тексты внутри app не отделяли mobile-контур от внешнего web/bot activation flow.
- Стало:
  - `ProPlansScreen` стал read-only экраном статуса доступа;
  - из профиля и locked-state мультимедиа удалены переходы на покупку/апгрейд `PRO`;
  - mobile client использует только `GET /pro/status`;
  - legal copy в app описывает только server-side entitlement и отсутствие покупки `PRO` внутри мобильного приложения.

### Сниппеты кода

`frontend/screens/settings/ProPlansScreen.tsx`:
```tsx
const statusData = await proService.getStatus();
setStatus(statusData);
```

```tsx
<Text style={styles.statusValue}>{status?.isProEffective ? 'Active' : 'Inactive'}</Text>
```

`frontend/screens/multimedia/TVScreen.tsx`:
```tsx
<Text style={[styles.scopeText, { color: roleColors.textSecondary }]}>
  Shared TV content is currently available. Add an organization to your profile. Full catalog access requires an active PRO status on your account.
</Text>
```

`frontend/services/proService.ts`:
```tsx
export const proService = {
  async getStatus(): Promise<ProStatus> {
    const response = await apiClient.get('/pro/status');
    return response.data;
  },
};
```

## 2026-03-12 (iOS Google sign-in resume after app return)

### Измененные файлы
- `frontend/screens/LoginScreen.tsx`
- `frontend/services/socialAuthService.ts`

### Суть правки (от старого к новому)
- Было:
  - на iOS `Google` login мог открыть авторизацию, вернуть пользователя в приложение и оставить его на экране входа без завершения сессии;
  - client ожидал только прямой happy-path `await GoogleSignin.signIn()`, а при пустом `idToken` сразу падал ошибкой.
- Стало:
  - `LoginScreen` отслеживает возврат приложения в `active` и один раз пробует восстановить Google session до завершения auth flow;
  - `socialAuthService` умеет добирать `idToken` не только из результата `signIn()`, но и из `getCurrentUser()`, `getTokens()` и `signInSilently()`;
  - если после возврата из системной Google авторизации native session уже поднята, mobile client завершает backend login без повторного показа auth UI.

### Сниппеты кода

`frontend/screens/LoginScreen.tsx`:
```tsx
const subscription = AppState.addEventListener('change', (nextState) => {
  if (Platform.OS !== 'ios' || socialLoadingProvider !== 'google' || nextState !== 'active') {
    return;
  }

  resumeGoogleSignIn().then((response) => {
    if (response) {
      completeGoogleAuth(response);
    }
  });
});
```

`frontend/services/socialAuthService.ts`:
```tsx
const payload = await resolveGoogleSignInPayload(module, extractGoogleSignInPayload(result));
const idToken = readConfigString(payload?.idToken);
```

```tsx
export const resumeGoogleSignIn = async (): Promise<SocialLoginResult | null> => {
  const module = await ensureGoogleConfigured();
  const payload = await resolveGoogleSignInPayload(module);
  const idToken = readConfigString(payload?.idToken);
  return idToken ? performGoogleBackendLogin(idToken) : null;
};
```

## 2026-03-12 (iOS device signing + Xcode 16 pods module verification fix)

### Измененные файлы
- `frontend/ios/Podfile`
- `frontend/ios/vedamatch.xcodeproj/project.pbxproj`

### Суть правки (от старого к новому)
- Было:
  - debug запуск на физическом iPhone под personal team падал из-за недоступного bundle id `com.korobkov.vedamatch`;
  - на Xcode 16.2 сборка Pods падала на `VerifyModule` (`React-debug`) с ошибками framework header include/glog.
- Стало:
  - debug bundle id приложения и тестов переведен на уникальный id для локальной команды (`com.makstreid.vedamatch.dev`, `com.makstreid.vedamatch.dev.tests`);
  - в `Podfile` отключен strict module verifier для Pods, что устраняет падение `VerifyModule` на device build.

### Сниппеты кода

`frontend/ios/Podfile`:
```ruby
installer.pods_project.targets.each do |target|
  target.build_configurations.each do |build_config|
    build_config.build_settings['CLANG_ENABLE_MODULE_VERIFIER'] = 'NO'
    build_config.build_settings['GCC_WARN_QUOTED_INCLUDE_IN_FRAMEWORK_HEADER'] = 'NO'
  end
end
```

`frontend/ios/vedamatch.xcodeproj/project.pbxproj`:
```pbxproj
PRODUCT_BUNDLE_IDENTIFIER = com.makstreid.vedamatch.dev;
```

## 2026-03-12 (iOS debug signing drift corrected for personal team)

### Измененные файлы
- `frontend/ios/vedamatch.xcodeproj/project.pbxproj`

### Суть правки (от старого к новому)
- Было:
  - `Debug` конфигурации app/test target снова дрейфовали на `com.korobkov.vedamatch` и `com.korobkov...`, из-за чего Xcode под personal team `makstreid@yandex.ru` показывал `No profiles for 'com.korobkov.vedamatch' were found`.
- Стало:
  - `Debug` app target снова использует `com.makstreid.vedamatch.dev`;
  - `Debug` test target снова использует `com.makstreid.vedamatch.dev.tests`;
  - локальный device-debug больше не упирается в чужой bundle id уже на уровне signing settings.

### Сниппеты кода

`frontend/ios/vedamatch.xcodeproj/project.pbxproj`:
```pbxproj
PRODUCT_BUNDLE_IDENTIFIER = com.makstreid.vedamatch.dev.tests;
PRODUCT_BUNDLE_IDENTIFIER = com.makstreid.vedamatch.dev;
```

## 2026-03-12 (iOS social auth canonical bundle restored; VK AASA appID corrected)

### Измененные файлы
- `server/cmd/api/main.go`
- `run-ios.js`
- `MEMORY.md`

### Суть правки (от старого к новому)
- Было:
  - в диагностике локального iPhone-debug временно фигурировал bundle id `com.makstreid.vedamatch.dev`, что конфликтовало с боевой social-auth конфигурацией;
  - backend AASA (`/.well-known/apple-app-site-association`) все еще отдавал iOS appID `CVW85BZU5Z.com.VedaMatch.vedamatch`;
  - пользователь подтвердил, что канонический iOS bundle id приложения должен быть `com.korobkov.vedamatch`.
- Стало:
  - канонический bundle id для iOS Google/VK flow зафиксирован как `com.korobkov.vedamatch`;
  - AASA appID на backend приведен к `CVW85BZU5Z.com.korobkov.vedamatch`, чтобы universal link `https://api.vedamatch.ru/auth/vk/callback` мог открывать именно установленное приложение;
  - локальный iOS launch helper `run-ios.js` теперь запускает `com.korobkov.vedamatch`, а не старый `com.VedaMatch.vedamatch`;
  - в проектной памяти помечено, что Google Auth Platform iOS client с bundle id `com.VedaMatch.vedamatch` является конфигурационной ошибкой и должен быть выровнен на `com.korobkov.vedamatch`.

### Сниппеты кода

`server/cmd/api/main.go`:
```go
"appID": "CVW85BZU5Z.com.korobkov.vedamatch",
```

`run-ios.js`:
```js
execSync(`xcrun simctl launch "${targetDevice.udid}" com.korobkov.vedamatch`, { stdio: 'inherit' });
```

## 2026-03-12 (Profile save + contact display fallback unified)

### Измененные файлы
- `frontend/screens/settings/EditProfileScreen.tsx`
- `frontend/screens/RegistrationScreen.tsx`
- `frontend/screens/portal/contacts/ContactsScreen.tsx`
- `frontend/screens/portal/contacts/ContactProfileScreen.tsx`
- `frontend/screens/calls/CallHistoryScreen.tsx`
- `frontend/screens/ChatScreen.tsx`
- `frontend/utils/userDisplay.ts`
- `server/internal/handlers/auth_handler.go`

### Суть правки (от старого к новому)
- Было:
  - `EditProfileScreen` требовал `nickname`, отдельно дергал `PATCH /profile/nickname` и мог показывать success alert вместе с ошибкой `Invalid nickname`;
  - профиль можно было сохранить без обязательного имени;
  - contact/chat/call surfaces местами строили имя напрямую через `spiritualName || karmicName`, из-за чего пользователь без имени мог попадать в UI с пустым заголовком или небезопасным initial.
- Стало:
  - `nickname` переведен в optional поле профиля и сохраняется через основной `PUT /update-profile`;
  - `karmicName` стал обязательным инвариантом и валидируется и на мобильном клиенте, и на backend;
  - shared helper `frontend/utils/userDisplay.ts` централизует display-name fallback и безопасный avatar initial для contacts/chat/calls.

### Сниппеты кода

`frontend/screens/settings/EditProfileScreen.tsx`:
```tsx
const profileData = {
  ...,
  karmicName: karmicName.trim(),
  nickname: normalizedNickname || undefined,
};
```

```tsx
if (requestCode === 'nickname_invalid') {
  setNicknameError(editProfileCopy.nicknameInvalid);
  return;
}
```

`server/internal/handlers/auth_handler.go`:
```go
if normalizedKarmicName == "" {
  return c.Status(fiber.StatusUnprocessableEntity).JSON(fiber.Map{
    "error": "Karmic name is required",
    "code":  "profile_name_required",
    "field": "karmicName",
  })
}
```

`frontend/utils/userDisplay.ts`:
```tsx
return clean(user.spiritualName)
  || clean(user.karmicName)
  || clean(user.nicknameDisplay)
  || clean(user.nickname)
  || clean(user.email)
  || (user.ID ? `${fallbackLabel} #${user.ID}` : fallbackLabel);
```

## 2026-03-12 (Edit profile nickname input replaced with read-only ID)

### Измененные файлы
- `frontend/screens/settings/EditProfileScreen.tsx`

### Суть правки (от старого к новому)
- Было:
  - в форме редактирования профиля оставался editable input `Nickname`;
  - поле визуально выглядело обязательным, хотя nickname уже генерируется автоматически на registration path.
- Стало:
  - editable input убран из основного profile form;
  - текущий nickname показывается как read-only `ID`, без ручного ввода и без client-side nickname validation в этом экране.

### Сниппеты кода

`frontend/screens/settings/EditProfileScreen.tsx`:
```tsx
<View style={styles.readonlyField}>
  <Text style={styles.readonlyValue}>{nickname || '—'}</Text>
</View>
```

## 2026-03-12 (PRO activation removed from mobile purchase flow)

### Измененные файлы
- `frontend/screens/settings/ProPlansScreen.tsx`
- `frontend/screens/settings/EditProfileScreen.tsx`
- `frontend/screens/multimedia/RadioScreen.tsx`
- `frontend/screens/multimedia/VideoScreen.tsx`
- `frontend/screens/multimedia/MultimediaHubScreen.tsx`
- `frontend/screens/multimedia/AudioScreen.tsx`
- `frontend/screens/multimedia/TVScreen.tsx`
- `frontend/services/proService.ts`
- `frontend/content/legalDocuments.ts`

### Суть правки (от старого к новому)
- Было:
  - мобильное приложение показывало экран планов `PRO`, цены в `LKM`, кнопку покупки и CTA на апгрейд из профиля и мультимедиа;
  - mobile client использовал `GET /pro/plans` и `POST /pro/purchase`;
  - правовые тексты внутри app не отделяли mobile-контур от внешнего web/bot activation flow.
- Стало:
  - `ProPlansScreen` стал read-only экраном статуса доступа;
  - из профиля и locked-state мультимедиа удалены переходы на покупку/апгрейд `PRO`;
  - mobile client использует только `GET /pro/status`;
  - legal copy в app описывает только server-side entitlement и отсутствие покупки `PRO` внутри мобильного приложения.

### Сниппеты кода

`frontend/screens/settings/ProPlansScreen.tsx`:
```tsx
const statusData = await proService.getStatus();
setStatus(statusData);
```

```tsx
<Text style={styles.statusValue}>{status?.isProEffective ? 'Active' : 'Inactive'}</Text>
```

`frontend/screens/multimedia/TVScreen.tsx`:
```tsx
<Text style={[styles.scopeText, { color: roleColors.textSecondary }]}>
  Shared TV content is currently available. Add an organization to your profile. Full catalog access requires an active PRO status on your account.
</Text>
```

`frontend/services/proService.ts`:
```tsx
export const proService = {
  async getStatus(): Promise<ProStatus> {
    const response = await apiClient.get('/pro/status');
    return response.data;
  },
};
```
# 2026-03-13
- Измененные файлы: `frontend/components/chat/MessageList.tsx`
- Суть правки: audio player получал сырой relative media path (`/uploads/...`) -> теперь chat message list нормализует audio URL через `getMediaUrl(...)` перед передачей в `AudioPlayer`, поэтому shared mobile playback работает и для local upload fallback.
- Сниппет:
```ts
const resolved = getMediaUrl(content) || mediaService.getDownloadUrl(content);
return applyAudioHostFallback(resolved);
```
# 2026-03-13
- Измененные файлы: `frontend/components/chat/MessageList.tsx`
- Суть правки: кнопка расшифровки аудио была обычным текстовым CTA под плеером -> стала компактной pill-кнопкой с иконкой `FileText`, заметнее визуально и удобнее рядом с voice message.
- Сниппет:
```tsx
<View style={styles.transcriptButtonContent}>
  <View style={styles.transcriptButtonIconWrap}>
    <FileText size={14} color={theme.primary} />
  </View>
  <Text>{messageListCopy.transcribeShort}</Text>
</View>
```
# 2026-03-13
- Измененные файлы: `frontend/context/ChatContext.tsx`, `frontend/components/chat/ChatInput.tsx`
- Суть правки: при отправке voice/media в эмуляторе и iOS client можно было уйти в upload без адресата и получить red screen `recipientId or roomId is required` -> теперь direct chat берёт fallback `recipientUser.ID`, а в non-direct chat микрофон показывает нормальный alert и не стартует ошибочный upload.
- Сниппет:
```ts
const targetRecipientId = recipientId || recipientUser?.ID || null;
if (!targetRecipientId) {
  Alert.alert(directChatMediaCopy.title, directChatMediaCopy.body);
  return;
}
```
# 2026-03-13
- Измененные файлы: `frontend/components/chat/MessageList.tsx`
- Суть правки: в dev iOS emulator транскриб-аудио показывал LogBox из-за `console.error` на `404` -> теперь для `404/405` показывается user-facing alert `transcribeUnavailable`, а в лог пишется только `warn` для неожиданных ошибок.
- Сниппет:
```ts
if (status === 404 || status === 405) {
  Alert.alert(t('error'), messageListCopy.transcribeUnavailable);
}
```
## 2026-03-13

- Измененные файлы:
  - `server/internal/services/chat_transcription_service.go`
  - `server/internal/services/chat_transcription_service_test.go`
  - `server/internal/handlers/message_chat_features.go`
  - `frontend/components/chat/MessageList.tsx`
- Суть правки:
  - Было: chat transcription для Polza использовал только unprefixed модели (`gpt-4o-mini-transcribe`, `gpt-4o-transcribe`) и при upstream fail возвращал mobile-клиенту общий `502`.
  - Стало: backend для Polza пробует `openai/...` варианты моделей и `whisper-1` как fallback, а mobile-клиент тихо показывает alert на ожидаемый `502` без лишнего dev warning.
- Короткие сниппеты:

```go
modelsToTry := resolveChatTranscriptionModelsForProvider(provider)
```

```go
appendModel("openai/" + trimmed)
appendModel(trimmed)
```

```tsx
} else if (status === 502) {
    Alert.alert(t('error'), messageListCopy.transcribeFailed);
}
```
## 2026-03-13

- Измененные файлы:
  - `server/internal/services/chat_transcription_service.go`
  - `server/internal/services/chat_transcription_service_test.go`
- Суть правки:
  - Было:
    - backend скачивал chat audio для транскриба по исходному CDN URL, а `cdn.vedamatch.ru/messages/audio/...` на production возвращал `403 AccessDenied`;
    - Polza transcription через OpenAI SDK падал на multipart upload без явного audio `Content-Type`, и provider отвечал `400 Invalid file format`.
  - Стало:
    - для chat audio transcription backend сначала пробует direct S3 path-style URL на основе `S3_ENDPOINT + S3_BUCKET_NAME`, а потом уже исходный URL;
    - для Polza backend отправляет отдельный multipart request с корректным `Content-Type` (`audio/mp4` для `.m4a`) и приоритетом `whisper`-моделей.
- Короткие сниппеты:

```go
if key, ok := extractChatTranscriptionAudioObjectKey(normalizedURL); ok {
    appendCandidate(resolveChatTranscriptionDirectS3URL(key))
}
```

```go
partHeader.Set("Content-Type", detectChatTranscriptionMimeType(filePath))
```

```go
endpoint := strings.TrimSuffix(strings.TrimSpace(provider.BaseURL), "/") + "/audio/transcriptions"
```
## 2026-03-13

- Измененные файлы:
  - `server/internal/handlers/turn_handler.go`
  - `server/internal/handlers/turn_handler_test.go`
- Суть правки:
  - Было: `/api/turn-credentials` отдавал одновременно static TURN creds (`TURN_USER/TURN_PASSWORD`) и HMAC creds (`TURN_SECRET`), даже когда production coturn был поднят только в `auth-secret` режиме.
  - Стало: при наличии `TURN_SECRET` backend отдает только HMAC TURN credentials; static creds используются только как fallback, если secret-mode не настроен.
- Короткие сниппеты:

```go
if h.secret != "" {
    ...
    return response.IceServers
}
```

```go
// Static credentials are only returned when auth-secret mode is not configured.
if h.staticUser != "" && h.staticPass != "" {
```
## 2026-03-18

- Измененные файлы:
  - `livekit/README.md`
  - `MEMORY.md`
  - runtime service `vedamatch-livekit-b7uedq` (Dokploy/Swarm)
- Суть правки:
  - Было:
    - production `vedamatch-livekit-b7uedq` пытался стартовать с несуществующего образа `vedamatch-livekit-b7uedq:latest`;
    - `LIVEKIT_KEYS` был сломан сначала пустым secret, затем неверным форматом `key:secret` без пробела;
    - service не передавал `--node-ip`, а media ports для LiveKit не были опубликованы наружу.
  - Стало:
    - service переведен на рабочий образ `livekit/livekit-server:latest`;
    - ключи заданы в формате `key: secret`;
    - runtime args выставлены как `--node-ip 45.150.9.229 --udp-port 7882`;
    - опубликованы media ports `7881/tcp` и `7882/udp`, из-за чего shared mobile room-calls снова получают реальный media path, а не только `wss`.
- Короткие сниппеты:

```text
LIVEKIT_KEYS=<api-key>: <api-secret>
```

```text
--node-ip 45.150.9.229 --udp-port 7882
```

```text
7881/tcp
7882/udp
```
