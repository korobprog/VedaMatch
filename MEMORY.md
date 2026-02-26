# MEMORY

## Collaboration Rules
- Обрабатывать задачи без фоновых процессов и без нескольких агентов.
- Работать с файлами по одному и отчитываться после каждого шага.

## iOS Map Connectivity
- Для iOS окружения `frontend/.env.ios` больше не использовать `127.0.0.1` как `API_BASE_URL` при проверке сервисов на устройстве/удаленном сервере.
- Актуальная настройка: `API_BASE_URL=https://api.vedamatch.ru` в `frontend/.env.ios`, чтобы экран карты (`MapGeoapifyScreen`) и `mapService` могли достучаться до backend API без локального backend на Mac.
- Дополнительная runtime-страховка в `frontend/config/api.config.ts`: на iOS любые `localhost/127.0.0.1` автоматически санитизируются в `https://api.vedamatch.ru`, чтобы убрать `Network Error` в login/map при устаревшем env.
- `run-ios.js` должен запускать только `com.vedicai.vedamatch`; legacy launch id `org.reactjs.native.example.vedamatch` приводит к дублированию приложения и запуску старой сборки.
- Для пушей iOS default Firebase app инициализируется нативно в `frontend/ios/vedamatch/AppDelegate.mm` (`[FIRApp configure]` с guard), чтобы исключить warning `No Firebase App '[DEFAULT]'`.
- В `frontend/index.js` background-handler пушей регистрируется только если `getApps().length > 0`; при отсутствии default app handler пропускается без шумной ошибки в DEV-консоли.
- `frontend/ios/vedamatch/GoogleService-Info.plist` должен содержать валидный `API_KEY` формата Firebase (`AIza...`, длина 39) и актуальный `BUNDLE_ID=com.vedicai.vedamatch`; иначе при запуске на устройстве возможен crash `FirebaseInstallations I-FIS008000` в `[FIRApp configure]`.
- В `frontend/ios/vedamatch/AppDelegate.mm` добавлен runtime-guard для Firebase: при невалидном/пустом `API_KEY` конфигурация Firebase пропускается (`NSLog`) вместо падения приложения.

## Documentation Discipline
- Каждый запрос пользователя фиксировать в `PROMPT_LOG.md` с датой и временем.
- При изменениях, затрагивающих другие платформы, писать запись в `Docs/IOS_CHANGES_FOR_MIGRATION.md`:
  дата, измененные файлы, суть правки (старое -> новое), сниппеты.

## Feed V2 Service
- Публичные маршруты ленты (protected): `GET /api/v2/feed`, `GET /api/v2/feed/item/:type/:id`, `POST /api/v2/feed/item/:type/:id/impression`, `POST /api/v2/feed/item/:type/:id/reactions`, `GET/POST /api/v2/feed/item/:type/:id/comments` (`server/cmd/api/main.go`, `server/internal/handlers/feed_v2_handler.go`).
- Вход в `GetFeed` закрыт feature-flag rollout'ом через `FEED_V2_ENABLED` и `FEED_V2_ROLLOUT_PERCENT` (берутся из `system_settings` с fallback в env).
- Лента смешивает `posts` и `video_circles`, считает score по формуле recency + engagement + proBoost, затем сортирует и выдает cursor-based пагинацию (`server/internal/services/feed_v2_service.go`).
- Для первой страницы есть быстрый путь из материализованной таблицы `feed_items`; пересчет materialized-данных выполняет `FeedRebuildWorker` батчами пользователей (`server/internal/workers/feed_rebuild_worker.go`, `server/cmd/feed_worker/main.go`).
- Админ-контур управления: `GET/PUT /api/admin/feed/config`, `GET /api/admin/feed/metrics`, `POST /api/admin/feed/rebuild`, `GET /api/admin/feed/cdn-health`, `GET /api/admin/feed/workers-health` (`server/internal/handlers/admin_feed_handler.go`).
- На мобильном клиенте прямой вызов `feed v2` сейчас используется в `FeedMixWidget` (`frontend/components/portal/FeedMixWidget.tsx`) через `frontend/services/feedService.ts`.
- CDN для feed-контента берется из `media_assets.cdn_url` как есть; отдельного rewrite внутри `FeedV2Service` нет. Rewrite по `CDN_ENABLED/CDN_BASE_URL` реализован в `VideoService` для multimedia URL.
- Для `video_circles` в feed превью-видео берется напрямую из `video_circles.media_url` (`loadCircleCandidates`), без дополнительного CDN-rewrite.
- Для video circles введена policy `cdn_only`:
  - `POST /video-circles` принимает только `CDN_BASE_URL` или `S3_PUBLIC_URL` (S3 нормализуется в CDN);
  - `POST /video-circles/upload` работает в fail-fast режиме (без fallback в локальный `/uploads`).
- Для мониторинга добавлены метрики:
  - `video_circles_created_total`
  - `video_circles_create_rejected_non_cdn_total`
  - `video_circles_upload_s3_fail_total`
  - `video_circles_non_cdn_detected_total`

## Trademark / MKTU Coverage
- Проверка классов МКТУ (запрос 2026-02-26) должна опираться на фактические сервисы `server/cmd/api/main.go` и модели `server/internal/models/*`.
- Подтвержденные направления по продукту:
  - Соцсеть/коммуникации/контент: чаты, каналы, форумы-like фиды, стриминг/мультимедиа (`/channels`, `/support`, `/multimedia`, `/feed`).
  - Коммерция: маркетплейс/магазины/товары/объявления/реклама (`/shops`, `/products`, `/ads`, promoted ads).
  - Образование: курсы, экзамены, AI-tutor (`/education`).
  - Путешествия и размещение: yatra/shelter/cafe (`/yatra`, `/shelter`, `/cafes`).
  - Консультационные сервисы в приложении (в т.ч. духовные/астро) через модуль `services`.
- Важная правовая оговорка по LKM:
  - Для сторов зафиксирована позиция "LKM — внутренняя неплатежная единица, не legal tender/не payment instrument" (`docs/store-submission-packet-p0.md`).
  - Формулировки МКТУ 36 про "выпуск/обмен/торговлю цифровой валютой" потенциально конфликтны с этой позицией и требуют узкой юридической корректировки.
- Если 36 класс реализуется вне приложения (сайт/Telegram-бот), для стора сохранять политику "в приложении нет обмена/торговли цифровой валютой", а 36 класс формулировать отдельно под внешний сервис.

## Versioning Notes
- Версии Android вести через `versionName` и `versionCode` в `frontend/android/app/build.gradle`.
- Текущие версии (2026-02-26):
  - Android: `versionCode=16`, `versionName=1.1.14`
  - iOS: `MARKETING_VERSION=1.1.15`, `CURRENT_PROJECT_VERSION=7`
- Статус production-сборок (2026-02-26):
  - Android: `./gradlew assembleRelease` успешно, APK: `frontend/android/app/build/outputs/apk/release/app-release.apk`.
  - Android устройство (`com.ragagent`): установлена версия `versionCode=16`, `versionName=1.1.14`.
  - iOS: `xcodebuild ... -configuration Release ... install` формирует подписанный `.app` в локальном `InstallationBuildProductsLocation`, но не гарантирует выкладку на устройство.
  - Для фактической установки на iPhone использовать отдельный deploy-шаг (`ios-deploy --bundle <...>.app` или `devicectl device install app`).
  - iOS устройство (`00008101-000C78913E87001E`, iPhone 12): `ios-deploy --bundle .../vedamatch.app --justlaunch` показал `InstallComplete` и `Installed package .../vedamatch.app`; финальный warning про `DeveloperDiskImage.dmg` относится к debug-attach и не отменяет успешную установку.
- Критичная настройка для iOS сборок с RN bundle script:
  - В `frontend/ios/vedamatch.xcodeproj/project.pbxproj` для `Debug/Release` должно быть `ENABLE_USER_SCRIPT_SANDBOXING = NO`.
  - При `YES` возможен сбой `Bundle React Native code and images` с `Operation not permitted` на записи `vedamatch.app/ip.txt` и итогом `** INSTALL FAILED **`.
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
- Добавлен отдельный сервисный ярлык `feed` (`Лента`, `PlayCircle`) в `DEFAULT_SERVICES`; для существующих layout он подтягивается через `ensureDefaultServices` при инициализации.
- Для повышения заметности `feed` добавлена миграция `ensureFeedShortcut` (`frontend/services/portalLayoutService.ts`): если ярлыка нет, он вставляется на первую страницу рядом с `channels`.
- В `frontend/screens/portal/serviceLaunchResolver.ts` `feed` направляется в `ChannelsHub` (лента открывается по умолчанию).
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
- Для AI-отправки в `frontend/context/ChatContext.tsx` и `frontend/services/openaiService.ts` обработанные сетевые ошибки (`Connection error` и т.п.) логируются через `console.warn`, а не `console.error`, чтобы в iOS dev не поднимать RedBox при уже обработанном fallback.

## AI Assistant (Krishna Das) Runtime
- Персона «Кришна Дас» в мобильном UI — это режим `assistantType='smiley'`, выбирается в `frontend/screens/settings/AppSettingsScreen.tsx` и сохраняется в `AsyncStorage` ключом `assistant_type` через `frontend/context/SettingsContext.tsx`.
- Бизнес-логика ответа ассистента находится в `frontend/context/ChatContext.tsx`: перед LLM-запросом вызывается `ragService.queryHybrid('/rag/query-hybrid')`, затем отправка в LLM идет через `sendMessage()` -> `POST /v1/chat/completions`.
- Источники RAG и метаданные (`retrieverPath`, `confidence`) прикрепляются к сообщению как `assistantContext` и отображаются в `frontend/components/chat/MessageList.tsx`.
- Текущий дефолт text-stack зафиксирован как `model='auto'`, `provider='PolzaAI'` (`frontend/config/models.config.ts` + фиксация в `SettingsContext.fetchModels`).

## Auth Login Notes
- В `server/internal/handlers/auth_handler.go` логин поддерживает legacy-формат пароля:
  если пароль в БД не похож на bcrypt-хеш, сравнение выполняется как plaintext fallback.
- При успешном входе через legacy fallback пароль автоматически мигрируется в bcrypt и сохраняется в БД.
- Это устраняет кейс “верный пароль, но Invalid password” для пользователей со старыми/нехешированными записями.
- DEV-login устойчивость (`frontend/screens/LoginScreen.tsx`):
  - `Быстрый вход (DEV)` сначала пробует статичный аккаунт `dev_admin_yatra@example.com`.
  - Для регистрации через публичный `/register` используется только обычная роль (`role: user`, `identity: Dev`), потому что backend блокирует `role: admin/superadmin`.
  - При конфликте/ошибке добавлен fallback на уникальный email `dev_admin_yatra_${Date.now()}@example.com` с регистрацией + логином, чтобы вход в dev не блокировался существующим пользователем.
  - Для обхода `Axios Network Error` на iOS dev-flow auth переведен на прямой `fetch` с fallback по базовым URL:
    - `API_PATH` (текущий env),
    - `https://api.vedamatch.ru/api` (резерв).
  - При полном сетевом отказе (`Network request failed/Network Error`) включается локальный DEV fallback:
    - создается локальный профиль admin;
    - сохраняется технический access token (`dev-offline-access-token`);
    - вход продолжается без backend, чтобы не блокировать DEV-проверки UI.
  - В финальном alert DEV-login выводятся `URL` и список базовых `Bases` для быстрой диагностики endpoint на устройстве.
  - Для локального offline fallback (`dev-offline-access-token`) добавлена централизованная проверка `isOfflineDevAccessToken()` в `frontend/services/authSessionService.ts`.
  - В offline DEV режиме realtime/WebSocket теперь не запускается (`frontend/services/websocketService.ts`), чтобы не создавать reconnect storm на iOS (`kCFErrorDomainCFNetwork error 2`).
  - В offline DEV режиме часть стартовых сетевых загрузок отключена:
    - `WalletContext` не запрашивает `/wallet` для `user.ID=999999`;
    - `ChatContext` не загружает RAG domains для `user.ID=999999`;
    - `PortalMainScreen` не запрашивает support unread count для `user.ID=999999`;
    - `portalLayoutService` работает через локальный fallback без `Authorization` header для offline токена.

## Auth Runtime Notes
- При просроченной/невалидной сессии на старте приложения WebSocket/heartbeat должны логировать ожидаемый auth-fallback через `console.warn`, а не `console.error`, иначе React Native dev mode показывает RedBox и мешает автологауту/refresh-потоку.
- Применено в:
  - `frontend/services/websocketService.ts` (`[WebSocket] AUTH_FAILURE: Token expired or invalid`)
  - `frontend/context/WebSocketContext.tsx` (`Auth refresh failed, logging out...`)
  - `frontend/context/UserContext.tsx` (`Heartbeat auth refresh failed, logging out`)

## Push Runtime Notes
- На iOS в debug/dev окружении возможна recoverable ошибка FCM `[messaging/unknown] ... aps-environment ... not found` (нет push-entitlement в текущем signing profile/capabilities).
- В `frontend/services/notificationService.ts` такие ошибки не должны поднимать RedBox:
  - для `aps-environment` используется `console.warn` + telemetry `token_register_skipped: missing_aps_environment`;
  - recoverable catch-ветки сервиса логируют через `console.warn`, а не `console.error`.
- В текущей конфигурации RNFirebase для iOS используется auto-registration; ручной вызов `registerDeviceForRemoteMessages()` удален как избыточный (убирает warning `Usage of ... is not required`).
- Для iOS добавлен early-skip: если `getAPNSToken()` вернул `null`, `getToken()` не вызывается, и пишется telemetry `token_register_skipped: apns_token_unavailable`.

## Profile Runtime Notes
- `frontend/screens/settings/EditProfileScreen.tsx` не должен предполагать, что `/contacts` всегда возвращает массив: backend может вернуть и paginated-формат `{ items: [...] }`.
- Для загрузки собственного профиля в `EditProfile` используется безопасный парсинг:
  - `Array.isArray(response.data) ? response.data : response.data?.items ?? []`.
- В обработанных `catch` ветках экрана `EditProfile` используется `console.warn` (вместо `console.error`), чтобы dev RedBox не блокировал экран при recoverable ошибках.

## Seller Orders Runtime Notes
- В `frontend/screens/portal/shops/SellerOrdersScreen.tsx` загрузка CRM-заказов больше не должна поднимать RedBox при обработанном backend-сбое:
  - вместо `console.error` используется `console.warn`,
  - добавлено UI-состояние `ordersLoadError` с баннером на экране.
- Для `HTTP 500` в режиме фильтра канала (`sourceChannelId`) выводится понятный fallback-текст: проверить наличие магазина у аккаунта и повторить загрузку.
- Backend-контракт `GET /orders/seller` обновлен:
  - в `server/internal/services/order_service.go` добавлен sentinel `ErrSellerShopNotFound`;
  - в `server/internal/handlers/order_handler.go` при этой ошибке возвращается `404` (`Seller shop not found`) вместо generic `500`.
- В `frontend/services/marketService.ts` для `getSellerOrders` логирование переведено на безопасный режим (`console.log` в dev / `console.warn` в prod) без передачи объекта `AxiosError`, чтобы не поднимать RedBox на `404`.
- В `frontend/screens/portal/shops/SellerOrdersScreen.tsx` для `404` показывается явный UX-текст: CRM-заказы доступны после создания магазина у аккаунта.

## Storage Runtime Notes
- `frontend/lib/mmkvStorage.ts`: при недоступности native MMKV/NitroModules используется in-memory fallback.
- Чтобы dev-консоль не засыпалась `Error Component Stack` от LogBox, fallback и migration ошибки логируются одной строкой через `console.log` в dev (без передачи объекта `Error` в `console.warn/error`).
- В production остаётся `console.warn`, но тоже без объекта ошибки (только короткое сообщение + первая строка причины).

## Multimedia Runtime Notes
- В RN нельзя полагаться на `URLSearchParams.entries()` для query-объектов в сервисах: на iOS/Hermes это может отсутствовать и давать `params.entries is not a function`.
- В `frontend/services/multimediaService.ts` query параметры для `/multimedia/tracks`, `/multimedia/radio`, `/multimedia/tv` формируются обычным объектом `params`, без `URLSearchParams`.
- В `frontend/screens/multimedia/MultimediaHubScreen.tsx` обработанный сбой загрузки логируется через `console.warn`, чтобы не поднимать RedBox в dev.

## Seva/Charity Runtime Notes
- В `frontend/services/charityService.ts` нельзя использовать `URLSearchParams.set/entries` на iOS/Hermes: возможна ошибка `URLSearchParams.set is not implemented`.
- Для `get()` в charity service query-параметры endpoint (часть после `?`) парсятся в plain object (`parseQueryString`) и передаются в axios как `params`.
- В `frontend/screens/seva/SevaHubScreen.tsx` обработанные ошибки загрузки (`loadProjects`, `loadData`, `onRefresh`) логируются через `console.warn`, чтобы не показывать RedBox при recoverable сбоях.

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
- UX для меню виджетов упрощен:
  - удалена отдельная инфо-карточка «Как открыть меню виджетов»;
  - добавление виджетов открывается по long-press на canvas (включается edit-mode и сразу открывается picker).
- Empty state виджетов:
  - подсказка обновлена с `+`-кнопки на удержание пальца;
  - цвет текста адаптирован к светлым режимам (без ложной `photo`-палитры в light).
- Empty canvas long-press:
  - в `WidgetCanvasGrid` long-press для открытия меню виджетов теперь работает по всей области размещения (а не только по карточке «Пока нет виджетов»);
  - empty-state карточка переведена в `pointerEvents="none"`, жесты обрабатывает общий pressable canvas.
- DnD виджетов стабилизирован:
  - `DraggablePortalItem` переведен на `Pan.activateAfterLongPress(260)` вместо `manualActivation`;
  - для измеряемого контейнера виджета используется `collapsable={false}`, чтобы hit-тест reorder корректно работал на iOS/Android.
- Контрастный фикс `ChannelDetailsScreen` (`frontend/screens/portal/services/channels/ChannelDetailsScreen.tsx`):
  - gradient теперь зависит от темы (`dark -> roleTheme.gradient`, `light -> colors.background/surface/background`);
  - это убирает кейс "темный текст на темном фоне" в light mode на экране деталей канала.
- Навигация `Portal` ↔ `WidgetSelection`:
  - на главной портала добавлен свайп влево (right-to-left) для открытия `WidgetSelection`;
  - на экране виджетов добавлен свайп вправо (left-to-right) для возврата в портал;
  - на обоих экранах показаны 2 точки пагинации с активным состоянием текущего экрана и подписью направления свайпа.
  - реализация свайпа переведена с `onTouchStart/onTouchEnd` на `react-native-gesture-handler` (`GestureDetector + Gesture.Pan` с `activeOffsetX/failOffsetY`) для более стабильной работы на iOS.
- UX меню виджетов (`WidgetSelectionScreen`):
  - добавлена отдельная карточка-подсказка `Как открыть меню виджетов` с явной кнопкой `Открыть меню виджетов`;
  - улучшен контраст текста и рамок toolbar/подсказок в light theme (явные темные цвета текста и мягкая светлая подложка).

## Unified Screen Styling
- Введен единый шафран‑золотой screen-layer:
  - `frontend/theme/brandPalette.ts` (`#FF9933`, `#F4C542`, `#FAF7F0`);
  - `frontend/theme/screenTheme.ts` (light/dark screen tokens);
  - `frontend/theme/screenEffects.ts` (degrade policy для aura/glow по performance mode).
- `frontend/theme/ModernVedicTheme.ts` теперь проксирует `ScreenThemeLight/ScreenThemeDark`, чтобы старые импорты не ломались.
- `frontend/hooks/useRoleTheme.ts` больше не форсит dark; role accent применяются поверх текущего light/dark screen theme.
- `frontend/components/theme/ScreenAuraBackground.tsx` + `frontend/components/theme/ScreenScaffold.tsx` добавлены как общий reusable слой фона/ореола/стеклянных поверхностей.
- `ScreenScaffold` подключен к ключевым экранам:
  - `frontend/screens/portal/PortalMainScreen.tsx`
  - `frontend/screens/portal/WidgetSelectionScreen.tsx`
  - `frontend/screens/portal/chat/PortalChatScreen.tsx`
  - `frontend/screens/portal/contacts/ContactsScreen.tsx`
  - `frontend/screens/settings/AppSettingsScreen.tsx`
  - `frontend/screens/portal/shops/MarketHomeScreen.tsx`
  - `frontend/screens/multimedia/MultimediaHubScreen.tsx`
  - `frontend/screens/library/LibraryHomeScreen.tsx`
  - `frontend/screens/LoginScreen.tsx`
- Добавлена мягкая совместимость по настройкам темы:
  - в `frontend/context/SettingsContext.tsx` установлен маркер `theme_style_version=2` без сброса старых ключей.
- Контрастный hotfix для light theme:
  - в `PortalChatScreen`, `ContactsScreen`, `LibraryHomeScreen`, `CallHistoryScreen` правило `isPhotoBg` ограничено до `portalBackgroundType === 'image' && isDarkMode`, чтобы не форсить белый текст на светлых поверхностях.
  - в `PortalMainScreen` (service header, включая Rooms) и `WidgetSelectionScreen` добавлено dark-aware условие для светлых иконок/бордеров (`useLightHeaderIcons = isDarkMode && effectiveBgType === 'image'`), чтобы верхний бар не становился белым на светлом фоне.
- В Settings добавлен переключатель визуального режима экранов:
  - `screenVisualStyle: 'classic' | 'saffron'` (ключ `screen_visual_style_v1`) в `frontend/context/SettingsContext.tsx`;
  - UI переключателя в `frontend/screens/settings/AppSettingsScreen.tsx`.
- `ScreenScaffold` учитывает `screenVisualStyle`:
  - в `classic` выключает aura/glass overlays, чтобы обои и интервал слайд-шоу визуально работали как в классическом режиме.
- Дополнительный фикс видимости обоев в `classic`:
  - в `frontend/components/theme/ScreenScaffold.tsx` добавлен проп `transparentBackground`, чтобы scaffold не перекрывал слой `PortalBackgroundLayer` сплошным цветом;
  - в `frontend/screens/portal/PortalMainScreen.tsx` и `frontend/screens/portal/WidgetSelectionScreen.tsx` `ScreenScaffold` используется с `transparentBackground`, обои/слайдшоу снова видимы.
- Финальная развязка режимов `classic/saffron`:
  - `classic`: экраны `PortalMainScreen` и `WidgetSelectionScreen` используют реальные обои/слайдшоу (`portalBackground*`) и прозрачный scaffold (`transparentBackground=true`, `enableAura=false`);
  - `saffron`: эти же экраны принудительно используют цветной фон (`portalBackgroundType='color'`, `portalBackground=vTheme.colors.background`), без wallpaper/slideshow, и включают aura-слой (`enableAura=true`) для заметного изменения интерфейса.

## Portal PRO / Org / Roles
- Блок из шапки портала с бейджем `PRO` реализован в `frontend/components/portal/god-mode/GodModeFiltersPanel.tsx`.
- Панель показывается только при `user.godModeEnabled === true` (см. `frontend/screens/portal/PortalMainScreen.tsx`).
- Источник списка орг.: `GET /api/system/god-mode-math-filters` (protected route), загрузка через `fetchGodModeMathFilters()` в `frontend/services/portalLayoutService.ts`.
- Дефолтные орг. на сервере (`server/internal/handlers/portal_blueprints.go`):
  - `gauranga` → `Gauranga Org.`
  - `vrindavan` → `Vrindavan Org.`
  - `mayapur` → `Mayapur Org.`
  - `iskcon-global` → `ISKCON Global Org.`
  - `scsm` → `Шри Чайтанья Сарасват Орг. (SCSM)`
  - `pure-bhakti-yoga` → `Международное Общество Чистой Бхакти-йоги`
  - `sri-gopinath-gaudiya` → `Шри Гопинатх Гаудия`
  - `sri-chaitanya-math` → `Шри Чайтанья Орг.`
- В UI добавлена нормализация названий `Math/Matha/Матх -> Org./Орг.` в:
  - `frontend/components/portal/god-mode/GodModeFiltersPanel.tsx`
  - `frontend/components/portal/god-mode/GodModeStatusBanner.tsx`
- Активная орг. хранится в `active_math_id` (MMKV + AsyncStorage) через `frontend/context/UserContext.tsx`.
- Ролевая модель:
  - Portal roles: `user`, `in_goodness`, `yogi`, `devotee`
  - Admin roles: `admin`, `superadmin`
  - Источник: `server/internal/models/roles.go`.
- Ограничение безопасности по God Mode:
  - обычные пользователи не могут включить `godModeEnabled` через `update-profile`;
  - управление флагом допускается только для admin/superadmin-ролей (см. `resolveGodModeForUpdate` в `server/internal/handlers/auth_handler.go`).

## Feed V2 / Org-Pro / CDN
- В backend добавлен `feed v2` namespace (`/api/v2/feed`) с cursor-пагинацией и unified items (`post` + `video_circle`).
- Добавлены новые модели/таблицы: `org_types`, `org_profiles`, `user_org_matches`, `user_pro_subscriptions`, `posts`, `media_assets`, `feed_items`, `feed_cursor_state`, `post_reactions`, `post_comments`.
- В `api/main.go` подключены новые protected endpoints:
  - `GET /api/v2/feed`
  - `GET /api/v2/feed/item/:type/:id`
  - `POST /api/v2/feed/item/:type/:id/impression`
  - `POST /api/v2/feed/item/:type/:id/reactions`
  - `GET/POST /api/v2/feed/item/:type/:id/comments`
- Добавлен admin control-plane для ленты:
  - `GET/PUT /api/admin/feed/config`
  - `GET /api/admin/feed/metrics`
  - `POST /api/admin/feed/rebuild`
  - `GET /api/admin/feed/cdn-health`
- В админке добавлена страница `Feed Control`: `admin/src/app/feed-control/page.tsx` + пункт меню в `AdminLayout`.
- На мобильном портале добавлены feed-виджеты:
  - `feed_quick` (1x1) — быстрый переход в ленту;
  - `feed_mix` (2x2) — мини-превью unified feed.
- `frontend/services/feedService.ts` использует `GET /v2/feed`.
- `.env.example` приведен к Yandex Object Storage/CDN defaults:
  - `S3_ENDPOINT=storage.yandexcloud.net`
  - `S3_REGION=ru-central1`
  - `S3_PUBLIC_URL=https://cdn.vedamatch.ru`
  - `CDN_ENABLED=true`, `CDN_BASE_URL=https://cdn.vedamatch.ru`

## Feed V2 Materialization
- `feed_v2_service` теперь поддерживает materialized read path:
  - для первой страницы (`cursor` пуст) приоритетно читается `feed_items`;
  - при отсутствии rows используется fallback runtime pull-расчет.
- Реализованы rebuild-операции:
  - `RebuildForUser(userID, limit)`
  - `RebuildForOrg(orgTypeID, limit)`
  - `RebuildAll(limit)`
- `admin/feed/rebuild` больше не stub: фактически пересобирает `feed_items` и возвращает `builtItems`.

## Feed/Media Workers (Docker)
- Добавлены отдельные worker процессы:
  - `server/cmd/feed_worker/main.go` -> периодический rebuild `feed_items`.
  - `server/cmd/media_worker/main.go` -> каркас media pipeline worker (heartbeat).
- Worker логика:
  - `server/internal/workers/feed_rebuild_worker.go`
  - `server/internal/workers/media_pipeline_worker.go`
- `server/Dockerfile` теперь собирает 3 binary (`server`, `feed-worker`, `media-worker`).
- `docker-compose.prod.yml` обновлен сервисами `feed-worker` и `media-worker`.
- Новые env-параметры в `.env.example`:
  - `FEED_WORKER_ENABLED`, `FEED_REBUILD_INTERVAL_SEC`, `FEED_REBUILD_LIMIT`
  - `MEDIA_WORKER_ENABLED`, `MEDIA_WORKER_INTERVAL_SEC`

## Media Worker Queue Consumer
- `media-worker` теперь читает Redis очередь `transcoding:queue` через `RedisService.GetNextTranscodingJob()`.
- На каждом job:
  - ставит статус `processing` в `video_transcoding_jobs` (upsert по `job_id`);
  - выполняет `TranscodingService.TranscodeVideo`;
  - при успехе обновляет `media_tracks` (`transcoding_status=completed`, `hls_url/url`, `thumbnail_url`, `is_active=true`, `published_at`);
  - при ошибке помечает `video_transcoding_jobs` и `media_tracks` как `failed`.
- Dev compose (`docker-compose.yml`) теперь содержит единый локальный контур: `postgres + redis + server + feed-worker + media-worker`.

## Feed Worker Rolling Mode
- feed-worker больше не делает `RebuildAll` в каждом тике.
- Используется rolling режим:
  - курсор `FEED_WORKER_LAST_USER_ID` хранится в `system_settings`;
  - обрабатывается batch `FEED_REBUILD_BATCH_SIZE` пользователей за тик;
  - при окончании диапазона курсор сбрасывается в `0` (wrap).
- heartbeat/status feed-worker сохраняются в `system_settings`:
  - `FEED_WORKER_LAST_HEARTBEAT`
  - `FEED_WORKER_LAST_STATUS`
  - `FEED_WORKER_LAST_STATS`

## Workers Health API
- Новый admin endpoint: `GET /api/admin/feed/workers-health`.
- Возвращает heartbeat/status для:
  - `feedWorker`
  - `mediaWorker`
- Используется в `admin/src/app/feed-control/page.tsx` (блок `Workers health`).

## Smoke Commands (workers)
- Запуск:
  - `docker compose up -d postgres redis server feed-worker media-worker`
- Логи:
  - `docker compose logs -f feed-worker media-worker`
- Health:
  - `GET /api/admin/feed/workers-health`

## Feed V2 Rollout Gate
- `feed_v2_handler` теперь блокирует endpoint при выключенном флаге:
  - `FEED_V2_ENABLED` must be true;
  - `FEED_V2_ROLLOUT_PERCENT` применяется по стабильному bucket (`userID % 100`).
- Это позволяет держать endpoint в коде, но поэтапно включать пользователей без redeploy.

## Media Worker Retry Policy
- `TranscodingJob` содержит `attempt` (Redis queue payload).
- `media-worker` применяет `MEDIA_WORKER_MAX_RETRIES`:
  - при неудаче requeue с `attempt+1` пока не достигнут лимит;
  - при retry держит `media_tracks.transcoding_status=pending`;
  - только после исчерпания retry ставит `failed`.

## Remote S3 Key Sync
- Доступ к удаленному серверу подтвержден, ключи считаны из runtime контейнера:
  - контейнер: `vedamatch-server-dnkxc8...`
  - источник: `docker inspect ... .Config.Env`.
- Локальный `.env` синхронизирован с продовыми `S3_*` значениями.
- Важно: текущий прод-контур использует `s3.firstvds.ru` (не Yandex Object Storage).
- `CDN_` переменные в контейнере не были заданы (явный CDN endpoint не найден).
