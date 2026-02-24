# IOS Changes For Migration

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
