# IOS Changes For Migration

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
  - launch id обновлен на актуальный `com.vedicai.vedamatch` (как в `frontend/ios/vedamatch.xcodeproj/project.pbxproj`).

### Code Snippets

`run-ios.js`:
```js
execSync(`xcrun simctl launch "${targetDevice.udid}" com.vedicai.vedamatch`, { stdio: 'inherit' });
```

### Validation
- Проверено по конфигу iOS target: `PRODUCT_BUNDLE_IDENTIFIER = com.vedicai.vedamatch`.
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
