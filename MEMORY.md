# MEMORY

## Collaboration Rules
- Обрабатывать задачи без фоновых процессов и без нескольких агентов.
- Работать с файлами по одному и отчитываться после каждого шага.

## Documentation Discipline
- Каждый запрос пользователя фиксировать в `PROMPT_LOG.md` с датой и временем.
- При изменениях, затрагивающих другие платформы, писать запись в `Docs/IOS_CHANGES_FOR_MIGRATION.md`:
  дата, измененные файлы, суть правки (старое -> новое), сниппеты.

## Versioning Notes
- Версии Android вести через `versionName` и `versionCode` в `frontend/android/app/build.gradle`.
- Текущие версии после bump (2026-02-24):
  - Android: `versionCode=16`, `versionName=1.1.14`
  - iOS: `MARKETING_VERSION=1.1.4`, `CURRENT_PROJECT_VERSION=6`
- Статус production-сборок (2026-02-24):
  - Android: `./gradlew assembleRelease` успешно, APK: `frontend/android/app/build/outputs/apk/release/app-release.apk`.
  - Android устройство (`com.ragagent`): установлена версия `versionCode=16`, `versionName=1.1.14`.
  - iOS: `xcodebuild ... -configuration Release ... install` успешно (`** INSTALL SUCCEEDED **`), пакет: `/Users/mamu/Library/Developer/Xcode/DerivedData/vedamatch-dsoltsxeayyfdqdhtfxuopvbotum/Build/Intermediates.noindex/ArchiveIntermediates/vedamatch/InstallationBuildProductsLocation/Applications/vedamatch.app`.
- Ограничение окружения (локально): Android debug build требует установленный Java Runtime (JDK/JRE); без него `./gradlew assembleDebug` не запускается.
- Для текущего хоста Java настроена через JDK Android Studio в `~/.zshrc`:
  - `JAVA_HOME=/Applications/Android Studio.app/Contents/jbr/Contents/Home`
  - `PATH=$JAVA_HOME/bin:$PATH`
- При `adb install` с ошибкой `INSTALL_FAILED_UPDATE_INCOMPATIBLE` (другая подпись уже установленного пакета) рабочая последовательность:
  - `adb uninstall com.ragagent`
  - `adb install frontend/android/app/build/outputs/apk/debug/app-debug.apk`

## Portal Home Layout
- Иконка ассистента в верхнем хедере портала удалена (`frontend/screens/portal/PortalMainScreen.tsx`).
- Ярлык `services` закреплен как AI-ярлык (`Bot` -> открытие `Chat` + `handleNewChat()`), а каталог услуг вынесен в отдельный ярлык `services_catalog` (`Briefcase`) (`frontend/types/portal.ts`, `frontend/screens/portal/serviceLaunchResolver.ts`).
- Дефолтный нижний бар (quick access) зафиксирован как `calls/services/rooms`:
  - локальный default layout (`frontend/types/portal.ts`);
  - fallback role blueprints (`frontend/constants/portalRoles.ts`);
  - нормализация quick access при инициализации layout (`frontend/services/portalLayoutService.ts`), включая автозамену `history -> services`.
- Для существующих layout добавлена миграция `services_catalog` в первую страницу (рядом с `services` или после 1-го ряда при отсутствии `services`) в `frontend/services/portalLayoutService.ts`.
- Навигация сервис-ярлыков унифицирована между Portal и Widget Dock через `frontend/screens/portal/serviceLaunchResolver.ts`; в `PortalMainScreen` и `WidgetSelectionScreen` больше нет расхождений по `services`.

## Portal Widget Canvas (Shared Layer)
- Для виджетов добавлен отдельный top-level слой хранения `layout.widgetCanvas` (`frontend/types/portal.ts`) вместо зависимости от `pages[currentPage].widgets`.
- Единый каталог виджетов вынесен в `frontend/components/portal/widgets/widgetCatalog.tsx`:
  - единый ключ `type:size` (`getWidgetKey`);
  - лимит `maxCount=1` на каждый вариант;
  - единый `render()` для варианта.
- Единый рендер виджетов вынесен в `frontend/components/portal/widgets/renderPortalWidget.tsx`; локальные `switch(widget.type)` больше не нужны.
- Общий DnD-хук коллизий `frontend/components/portal/hooks/useGridReorderDnd.ts` используется и на холсте виджетов, и в сервисной сетке портала (`PortalGrid`), чтобы не дублировать логику reorder.
- Нормализация/миграция `widgetCanvas` сосредоточена в `frontend/context/widgetCanvasLayout.ts`:
  - перенос legacy `pages[].widgets` в `widgetCanvas.widgets`;
  - дедупликация по `type:size` (оставляется первый);
  - пересчет `position`;
  - очистка legacy `page.widgets`.
- `PortalLayoutContext` обновлен:
  - `addWidget` возвращает `{ ok: boolean; reason?: 'duplicate' }`;
  - `add/remove/reorder` работают только с `layout.widgetCanvas.widgets`.
- Экран виджетов переписан в compose-подход (`frontend/screens/portal/WidgetSelectionScreen.tsx` + `WidgetCanvasGrid` + `WidgetPickerSheet`):
  - одна страница виджетов без дока/папок/page dots;
  - long-press edit-mode;
  - добавление через `+` в toolbar;
  - `Готово` выключает edit-mode;
  - открытие сервисов из нижнего dock через `push('Portal', { returnToWidget: true, origin: 'widget_dock' })`.
- UX-фикс для экрана виджетов (2026-02-24):
  - `WidgetCanvasGrid`: убран конфликт tap/drag (без автовыхода из edit-mode по случайному tap), скролл блокируется только в момент drag.
  - `useGridReorderDnd`: добавлен fallback drop на ближайший элемент (если нет точной коллизии), с защитой от reorder при отпускании на исходном элементе.
  - `WidgetPickerSheet`: листание списка работает стабильно (backdrop больше не перехватывает scroll), sheet не закрывается после каждого добавления.
  - `WidgetSelectionScreen`: добавлен нижний dock как на главном портале (3 сервиса из `layout.quickAccess`), edit-toolbar оставлен отдельным слоем (`Виджет`, `Готово`) над dock.
  - `WidgetSelectionScreen`: `LKM` в верхнем баре заменен на круглую кнопку того же размера, что и остальные header-иконки, с компактным форматом суммы (`K/M`).
  - `WidgetCanvasGrid`: зона long-press растянута на весь canvas; drag-start фиксированно включает edit-mode перед перетаскиванием (устранен срыв DnD на Android).
  - `WidgetSelectionScreen` и `PortalMainScreen` используют общий рендер фоновых режимов (`image/gradient/color/slideshow`) через `frontend/components/portal/PortalBackgroundLayer.tsx`.
  - `PortalMainScreen`: при `returnToWidget=true` back из встроенного сервиса возвращает в `WidgetSelection` (UI back, embedded `onBack`, Android hardware back).
- Android white-screen/black-screen на входе в `WidgetSelection` (2026-02-24):
  - Наблюдение: в `adb logcat` нет `FATAL EXCEPTION`/`ReactNativeJS` ошибок после `[portal_widgets_open]`; `MainActivity` остается `mResumed=true`, но поверхность может оставаться пустой.
  - Вероятная причина: transition freeze/race в `native-stack` на Android (глобальные `animation: fade` + `freezeOnBlur`) в сочетании с повторными `navigate` и heavy blur-слоем.
  - Примененные фиксы:
    - Для `WidgetSelection` в `frontend/App.tsx` задано `animation: 'none'` (Android), `freezeOnBlur: false`, явный `contentStyle`.
    - Добавлен navigation-lock (как в кейсе звонков/чатов) перед `navigate('WidgetSelection')` в:
      - `frontend/screens/portal/PortalMainScreen.tsx` (header icon)
      - `frontend/components/portal/PortalGrid.tsx` (edit toolbar)
    - В `frontend/screens/portal/WidgetSelectionScreen.tsx` `BlurView` переведен на `androidVisualPolicy` (без принудительного blur на reduced Android mode).

## Calls Architecture (Contacts + Rooms)
- Контакты: `frontend/services/contactService.ts` не реализует signaling/RTC; звонок стартует из `frontend/screens/portal/contacts/ContactsScreen.tsx` переходом в `CallScreen`.
- 1:1 звонок: `frontend/screens/calls/CallScreen.tsx` + `frontend/services/webRTCService.ts` (P2P WebRTC, WS-типы `offer/answer/candidate/hangup`, TURN creds из `/turn-credentials`).
- Комнаты (совместные звонки): `RoomChatScreen` включает `RoomVideoBar`, который берет SFU config/token через `frontend/services/roomCallService.ts` (`/rooms/:id/sfu/config`, `/rooms/:id/sfu/token`) и подключается через `RoomSfuClient` к LiveKit.
- Сервер SFU: `server/internal/handlers/room_sfu_handler.go`, `server/internal/services/sfu/livekit_service.go`, роуты в `server/cmd/api/main.go`.
- Доступ к комнатному SFU: проверка `ensureRoomAccess` + флаг `RequireMembership` (`server/internal/handlers/room_access.go`, `server/internal/config/sfu_config.go`).
- В проекте также есть legacy room-signaling путь в `webRTCService.startRoomCall` и WS-типы `room_offer/room_answer/room_candidate/room_hangup`, но текущий UI комнатных звонков идет через SFU/LiveKit.

## Calls Risks / Tech Debt
- Hardcoded TURN fallback credentials удалены из `frontend/services/webRTCService.ts`; при недоступности `/turn-credentials` используется STUN-only fallback.
- В `server/internal/handlers/turn_handler.go` TURN-креды выдаются только при наличии `TURN_SECRET` и `TURN_EXTERNAL_IP/TURN_HOST`; иначе API возвращает STUN-only.
- В `GetContacts` есть legacy-режим возврата полного списка при отсутствии query-параметров (`ContactsLegacyModeEnabled`), что может быть тяжелым по перформансу на росте базы.

## Contacts API
- `FF_CONTACTS_LEGACY_MODE` переведен в default `false` (`server/internal/config/feature_flags.go`), чтобы `/contacts` без query не возвращал полный список по умолчанию.
- Для временного rollback legacy-поведение можно явно включить env-переменной `FF_CONTACTS_LEGACY_MODE=true`.

## Chat Runtime Notes
- В P2P-чате (`frontend/context/ChatContext.tsx`) добавлен локальный optimistic append после успешного `POST /messages` с дедупом по `id`; отправитель видит свое сообщение даже при проблемах WS-эхо.
- В `frontend/screens/portal/contacts/ContactsScreen.tsx` переход в чат переведен на guarded flow (`runWithNavigationLock` + единый `openChat`), чтобы избежать двойного `navigate` из вложенных touchable.
- В `frontend/screens/portal/contacts/ContactsScreen.tsx` при открытии чата передаются route params `userId/name`, чтобы `ChatScreen` мог восстановить получателя даже при гонке состояния контекста.
- В `frontend/components/chat/MessageList.tsx` на iOS отключен `maintainVisibleContentPosition` и ограничен blur для bubble (только photo background), что снижает риск пустого/неотрисованного списка сообщений.

## Auth Login Notes
- В `server/internal/handlers/auth_handler.go` логин поддерживает legacy-формат пароля:
  если пароль в БД не похож на bcrypt-хеш, сравнение выполняется как plaintext fallback.
- При успешном входе через legacy fallback пароль автоматически мигрируется в bcrypt и сохраняется в БД.
- Это устраняет кейс “верный пароль, но Invalid password” для пользователей со старыми/нехешированными записями.

## Auth Runtime Notes
- При просроченной/невалидной сессии на старте приложения WebSocket/heartbeat должны логировать ожидаемый auth-fallback через `console.warn`, а не `console.error`, иначе React Native dev mode показывает RedBox и мешает автологауту/refresh-потоку.
- Применено в:
  - `frontend/services/websocketService.ts` (`[WebSocket] AUTH_FAILURE: Token expired or invalid`)
  - `frontend/context/WebSocketContext.tsx` (`Auth refresh failed, logging out...`)
  - `frontend/context/UserContext.tsx` (`Heartbeat auth refresh failed, logging out`)

## Profile Runtime Notes
- `frontend/screens/settings/EditProfileScreen.tsx` не должен предполагать, что `/contacts` всегда возвращает массив: backend может вернуть и paginated-формат `{ items: [...] }`.
- Для загрузки собственного профиля в `EditProfile` используется безопасный парсинг:
  - `Array.isArray(response.data) ? response.data : response.data?.items ?? []`.
- В обработанных `catch` ветках экрана `EditProfile` используется `console.warn` (вместо `console.error`), чтобы dev RedBox не блокировал экран при recoverable ошибках.

## Storage Runtime Notes
- `frontend/lib/mmkvStorage.ts`: при недоступности native MMKV/NitroModules используется in-memory fallback.
- Чтобы dev-консоль не засыпалась длинным stack trace, fallback логируется компактно:
  - краткое предупреждение;
  - первая строка ошибки;
  - подсказка `cd ios && pod install` + rebuild.

## P2P Calls: Known Failure Points
- В `server/internal/websocket/hub.go` сигналинг форвардится только подключенному WS-клиенту; если получатель не в `h.clients`, логируется `Target User X not connected` и звонок не доставляется.
- Если `/turn-credentials` недоступен, клиент (`frontend/services/webRTCService.ts`) уходит в STUN-only fallback, что часто ломает соединение для symmetric NAT/CGNAT.

## P2P Calls: Applied Fixes
- В `frontend/App.tsx` добавлен `incomingCallRef`; `answerCall` теперь передает `targetId/callerName` и `autoAccept=true`, `endCall` отправляет `webRTCService.sendHangup()`.
- В `frontend/screens/calls/CallScreen.tsx` добавлен авто-accept сценарий для входящего звонка при `autoAccept=true`.
- В `frontend/types/navigation.ts` расширен `CallScreen` params новым optional флагом `autoAccept`.
- В `server/internal/handlers/turn_handler.go` выдача ICE сделана совместимой с двумя схемами TURN auth: static credentials (`TURN_USER/TURN_PASSWORD`) и HMAC credentials (`TURN_SECRET`).

## CRM Admin Panel (Next.js)
- Основной UI админки расположен в `admin/` (Next.js App Router, `next@16.1.1-canary`, React 19 RC), backend admin API — в `server/cmd/api/main.go` и `server/internal/handlers/admin_handler.go`.
- Backend admin-маршруты корректно защищены `middleware.Protected()` + `middleware.AdminProtected()` для `/api/admin/*`.
- На фронте контроль доступа реализован клиентски через `localStorage` в `admin/src/components/AdminLayout.tsx`; отдельного `middleware.ts` в `admin/src/` нет.
- `Welcome Bonus` сделан конфигурируемым через `SystemSetting` ключ `WELCOME_BONUS_LKM`:
  - редактирование в `admin/src/app/referrals/page.tsx` (блок `Economic Pulse`);
  - значение прокинуто в `/api/admin/wallet/global-stats` (`welcomeBonusLKM`);
  - фактическая выдача welcome bonus в `server/internal/services/wallet_service.go` читает `services.GetWelcomeBonusLKM()`.
- Выявленные риски:
  - В `admin/src/app/page.tsx` любой авторизованный пользователь редиректится на `/user/dashboard`, включая `admin/superadmin` (не на `/dashboard`).
  - В `admin/src/app/admins/page.tsx` запрос `/admin/users?role=admin&role=superadmin` логически конфликтует с backend `c.Query("role")` (берется один `role`), список админов неполный.
  - `GET /admin/settings` отдает маскированные секреты `***`, но `admin/src/app/settings/page.tsx` отправляет весь объект обратно в `POST /admin/settings`; есть риск перезаписи реальных секретов маской.
  - Есть небезопасные `JSON.parse(localStorage.admin_data)` без `try/catch` в ряде критичных мест (`AdminLayout`, `login`, `api` interceptor), что может ломать UI при поврежденном localStorage.

## Portal UI Notes
- Экран `WidgetSelection` (`frontend/screens/portal/WidgetSelectionScreen.tsx`) приведен к визуалу главной портала:
  - верхняя шапка в портал-стиле (круглые кнопки, быстрые действия, круглая кнопка `LKM`, `BellButton`);
  - фон теперь рендерится тем же shared-слоем, что и на главном портале (`PortalBackgroundLayer`), включая slideshow/crossfade/fallback.

## Portal PRO / Math / Roles
- Блок из шапки портала с бейджем `PRO` реализован в `frontend/components/portal/god-mode/GodModeFiltersPanel.tsx`.
- Панель показывается только при `user.godModeEnabled === true` (см. `frontend/screens/portal/PortalMainScreen.tsx`).
- Источник матхов: `GET /api/system/god-mode-math-filters` (protected route), загрузка через `fetchGodModeMathFilters()` в `frontend/services/portalLayoutService.ts`.
- Дефолтные матхи на сервере (`server/internal/handlers/portal_blueprints.go`):
  - `gauranga` → `Gauranga Math`
  - `vrindavan` → `Vrindavan Math`
  - `mayapur` → `Mayapur Math`
  - `iskcon-global` → `ISKCON Global`
- Активный матх хранится в `active_math_id` (MMKV + AsyncStorage) через `frontend/context/UserContext.tsx`.
- Ролевая модель:
  - Portal roles: `user`, `in_goodness`, `yogi`, `devotee`
  - Admin roles: `admin`, `superadmin`
  - Источник: `server/internal/models/roles.go`.
- Ограничение безопасности по God Mode:
  - обычные пользователи не могут включить `godModeEnabled` через `update-profile`;
  - управление флагом допускается только для admin/superadmin-ролей (см. `resolveGodModeForUpdate` в `server/internal/handlers/auth_handler.go`).
