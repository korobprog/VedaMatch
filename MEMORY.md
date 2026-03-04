# MEMORY

## Collaboration Rules
- Обрабатывать задачи без фоновых процессов и без нескольких агентов.
- Работать с файлами по одному и отчитываться после каждого шага.

## Backend Observability
- Для `server/internal/middleware/observability_prometheus.go` endpoint `/metrics` должен использовать `promhttp.HandlerFor(..., HandlerOpts{ErrorHandling: ContinueOnError})`, а не дефолтный `promhttp.Handler()`.
- Причина: при частичной ошибке одного collector дефолтный режим может отдавать `500` на весь scrape; `ContinueOnError` сохраняет доступность `/metrics` и публикует ошибки в payload без полного падения endpoint.

## Portal Service UI
- Для сервисов объявлений и путешествий (`activeTab === 'ads' || activeTab === 'travel'`) в `frontend/screens/portal/PortalMainScreen.tsx` service-layer принудительно однотонный:
  - `serviceLayerBackgroundType='color'`,
  - `serviceLayerActiveWallpaper=''`,
  - `serviceLayerSlideshowEnabled=false`,
  - `serviceLayerOverlayColor='transparent'`.
- Это убирает фото-фон в верхнем `header` при открытых сервисах объявлений/путешествий и сохраняет стабильную читаемость иконок.
- Для `contacts` и `rooms` в `PortalMainScreen` включен отдельный непрозрачный header:
  - `shouldUseSolidContactsHeader = activeTab === 'contacts'`,
  - `shouldUseSolidRoomsHeader = activeTab === 'rooms'`,
  - `shouldUseSolidServiceHeader = shouldUseSolidContactsHeader || shouldUseSolidRoomsHeader`,
  - `serviceHeaderBackgroundColor = vTheme.colors.surface`,
  - `serviceHeaderBorderColor = vTheme.colors.divider`.
- Для остальных service tabs и портальной сетки header остается прозрачным, система смены обоев портала не отключается.
- iOS debug-предупреждение `RCTView has a shadow set but cannot calculate shadow efficiently` для back-кнопки в `PortalMainScreen` устраняется переносом `shadow*` с прозрачного `View` на `TouchableOpacity` с непрозрачным `backgroundColor`; shadow на внутреннем прозрачном icon-wrapper не использовать.

## Cafe List Performance
- Экран `frontend/screens/portal/cafe/CafeListScreen.tsx` оптимизирован под меньший объем лишних ререндеров:
  - из-за ограничения `FlashList v2` на старой архитектуре iOS используется `FlatList` fallback с виртуализацией: `removeClippedSubviews`, `initialNumToRender`, `maxToRenderPerBatch`, `windowSize`, `updateCellsBatchingPeriod`;
  - изображения карточек (`cover/logo`) переведены на `react-native-fast-image` с `immutable` cache;
  - поиск переведен в локальный `CafeSearchInput` (memo) с внутренним state и debounce `350ms`; это убирает ререндер всего `CafeListScreen` на каждый символ;
  - карточка списка вынесена в `React.memo` (`CafeCard`) с compare по стабильным пропсам;
  - сортировка (`rating/popular/newest`) не триггерит повторную загрузку при клике по уже активному фильтру;
  - блок сортировки (`Рейтинг/Популярные/Новые`) переведен с `FlatList` на `View + map`, чтобы убрать лишнюю виртуализацию для 3 элементов;
  - `ListHeaderComponent` стабилизирован через `useMemo`, ключевые обработчики через `useCallback`;
  - full-screen loader для кафе показывается только до завершения первого загрузочного запроса (`initialLoadCompleted`), поэтому при последующих фильтрах/поиске нет “полной перезагрузки” экрана;
  - `setFilters(...page:1)` защищен проверкой текущей страницы, чтобы не создавать лишние обновления state.

## Ads Festivals (Hybrid Calendar)
- В Ads добавлен отдельный режим секции `Фестивали` (внутри `AdsScreen`), с переключателем `Объявления | Фестивали`.
- Внутри `Фестивали` добавлен второй уровень представления:
  - `Лента | Календарь`, где по умолчанию открыт режим `Лента`;
  - при открытии сервиса Ads дефолтный сценарий: `Фестивали -> Лента`.
- Новый backend API:
  - `GET /api/ads/festivals/calendar`
  - `GET /api/ads/festivals`
  - `GET /api/ads/festivals/feed` (поиск/фильтры/пагинация для карточной ленты)
  - `GET /api/ads/festivals/facets` (фасеты городов для фильтра ленты)
  - оба маршрута зарегистрированы с `middleware.OptionalAuth()` в `server/cmd/api/main.go`.
- Модель `Ad` расширена festival-полями:
  - `festivalStartAt/festivalEndAt/festivalTimezone`
  - `organizerName/organizerContact`
  - `venueName/venueAddress/venueLat/venueLng`
  - `preacherChannelIds/linkedServiceIds`
  - `resolvedPreachers` (runtime, non-persisted).
- Для `category=events` в `ads_handler` действует валидация:
  - `festivalStartAt` обязателен;
  - `festivalEndAt >= festivalStartAt`;
  - лимиты на `preacherChannelIds/linkedServiceIds` (до 20).
- Гибридный merge `Ads + Sadhu`:
  - источник `ad`: активные `events` объявления;
  - источник `sadhu_service`: active services с `formats` содержащим `event` + occurrence из `service_schedules`;
  - дедуп: sadhu occurrence скрывается, если linked `event ad` покрывает тот же интервал (`linkedServiceIds` + time interval).
- Для Sadhu math-правил добавлен reusable scope в `channel_service`:
  - `ResolveSadhuOwnerScope(viewerID)` возвращает `ownerIDs/bypass/showNone`.
- Для расписаний сервисов добавлен reusable метод:
  - `ServiceService.ListFestivalOccurrences(...)` с генерацией событий по `specificDate` и weekly `dayOfWeek`.
- RN-слой:
  - новые компоненты: `FestivalSectionSwitch`, `FestivalMonthCalendar`, `FestivalAgendaList`, `FestivalPreacherPickerModal`, `FestivalServicePickerModal`;
  - добавлены `FestivalViewSwitch` и `FestivalFeedList` для карточной ленты фестивалей;
  - `AdsScreen` разделен на 3 режима рендера:
    - `Объявления` (старый режим),
    - `Фестивали -> Лента` (новый дефолт),
    - `Фестивали -> Календарь` (existing behavior);
  - в ленте работают фильтры `Город/Источник/Период` и поиск по фестивалям;
  - карточка ленты поддерживает CTA `Подробнее` и `На карте`.
  - `CreateAdScreen` для `events` показывает date-time, organizer/venue, ручной picker проповедников и picker linked services;
  - `AdDetailScreen` для event-объявлений показывает блоки «О фестивале» и «Проповедники».
- Admin Ads:
  - добавлена сортировка `festival_date_asc/festival_date_desc`;
  - в таблице выводятся `festivalStartAt` и count `resolvedPreachers`.
- Runtime-совместимость:
  - если backend еще не содержит `/ads/festivals/feed` и `/ads/festivals/facets` (ответ `404`), frontend теперь не падает;
  - `getFestivalFeed` делает fallback на `GET /ads?category=events&status=active` с клиентским mapping в `FestivalItem` и фильтрацией по period/source;
  - `getFestivalFacets` fallback — на `/ads/cities`;
  - в `AdsScreen` `404` обрабатывается тихо (без `console.error` redbox), показываются пустые/fallback-данные.
- UX фильтра периода в ленте фестивалей:
  - default period для feed установлен в `upcoming` (вместо `30d`), чтобы будущие только что созданные фестивали не скрывались по умолчанию.
- FAB поведение в Ads/Festivals:
  - в режиме `sectionMode='festivals'` кнопка `+` должна открывать `CreateAd` с пресетом `initialCategory='events'`;
  - `CreateAdScreen` применяет пресет только для новых объявлений (`!adId`), чтобы не ломать редактирование существующих.
- Category UI в пресете фестиваля:
  - при `initialCategory='events'` (новое создание из фестивалей) в `CreateAdScreen` не показывать `CategoryPills` со всеми категориями;
  - вместо этого показывать только фиксированный pill `Мероприятия`.
- Ad type UI в пресете фестиваля:
  - при `initialCategory='events'` (новое создание из фестивалей) `CreateAdScreen` принудительно ставит `adType='offering'`;
  - переключатель `Ищу/Предлагаю/Мои` (`AdTabSwitcher`) скрыт, чтобы не показывать нерелевантные варианты для создания фестиваля.

## iOS Map Connectivity
- Для iOS окружения `frontend/.env.ios` больше не использовать `127.0.0.1` как `API_BASE_URL` при проверке сервисов на устройстве/удаленном сервере.
- Актуальная настройка: `API_BASE_URL=https://api.vedamatch.ru` в `frontend/.env.ios`, чтобы экран карты (`MapGeoapifyScreen`) и `mapService` могли достучаться до backend API без локального backend на Mac.
- Для production-поведения на iOS при локальной установке в `frontend/.env.ios` должен быть `APP_ENV=production` (не `development`), иначе включается dev-режим клиента.
- Дополнительная runtime-страховка в `frontend/config/api.config.ts`: на iOS любые `localhost/127.0.0.1` автоматически санитизируются в `https://api.vedamatch.ru`, чтобы убрать `Network Error` в login/map при устаревшем env.
- `run-ios.js` должен запускать только `com.VedaMatch.vedamatch`; legacy launch id `org.reactjs.native.example.vedamatch` приводит к дублированию приложения и запуску старой сборки.
- Для пушей iOS default Firebase app инициализируется нативно в `frontend/ios/vedamatch/AppDelegate.mm` (`[FIRApp configure]` с guard), чтобы исключить warning `No Firebase App '[DEFAULT]'`.
- В `frontend/index.js` background-handler пушей регистрируется только если `getApps().length > 0`; при отсутствии default app handler пропускается без шумной ошибки в DEV-консоли.
- `frontend/ios/vedamatch/GoogleService-Info.plist` должен содержать валидный `API_KEY` формата Firebase (`AIza...`, длина 39) и актуальный `BUNDLE_ID=com.VedaMatch.vedamatch`; иначе при запуске на устройстве возможен crash `FirebaseInstallations I-FIS008000` в `[FIRApp configure]`.
- В `frontend/ios/vedamatch/AppDelegate.mm` добавлен runtime-guard для Firebase: при невалидном/пустом `API_KEY` конфигурация Firebase пропускается (`NSLog`) вместо падения приложения.
- При включенном Happ VPN (`su.ffg.happ.plus`) в iOS Simulator возможен `NSURLErrorDomain -1003` на `https://api.vedamatch.ru/api/*` внутри приложения, даже если `curl` из host/simctl работает.
- В Happ не обнаружен явный per-app split tunneling по bundle id для Simulator; рабочий путь — исключать домены/маршруты через routing rules.
- Рабочая настройка Happ: `Настройки` -> `Использовать роутинг` -> `Таблица маршрутов` -> `Редактировать правила` -> секция `НАПРАВИТЬ НАПРЯМУЮ URL ИЛИ IP`; добавить `api.vedamatch.ru`, `cdn.vedamatch.ru`, `vedamatch.ru`, `s3.firstvds.ru`, сохранить и перезапустить TUNNEL.
- Проверка после настройки: в `~/Library/Group Containers/group.su.ffg.happ.plus/Library/Application Support/Xray/logs/access.log` для IP этих хостов должен появляться маршрут `... [socks-in >> direct]` вместо `... [socks-in >> proxy]`.

## iOS Build Troubleshooting
- Сбой `xcodebuild` в Debug для симулятора с ошибкой `FBReactNativeSpec.h: No such file or directory` (target `ReactCodegen`) связан с отсутствующими сгенерированными iOS codegen-артефактами в `frontend/ios/build/generated/ios`.
- Рабочий фикс: выполнить `cd frontend/ios && pod install`, затем перезапустить iOS build (`pnpm run ios:dev` или `xcodebuild ... build`).
- После `pod install` первый прогон может быть очень долгим из-за полного пересбора pod-ов (`React-RCTFabric`, `VisionCamera`, `NitroModules` и др.) без обязательного нового фатального падения.
- Ошибка Xcode `Could not compute dependency graph` / `unable to initiate PIF transfer session` обычно лечится reset build-сервисов:
  `killall Xcode Simulator xcodebuild XCBBuildService SWBBuildService SourceKitService com.apple.dt.SKAgent CoreDeviceService`
  + очистка кэша `~/Library/Developer/Xcode/DerivedData/*`, `~/Library/Developer/Xcode/ModuleCache.noindex/*`, затем повторный запуск `xcodebuild -workspace ... -list`.
- `xcodebuild ... install` в текущем процессе сборки формирует и подписывает `.app`, но не всегда дает ожидаемую "Run-поведение" как в Xcode UI; для гарантированной установки release-бандла на физический iPhone использовать:
  - `xcrun devicectl device install app --device <UDID> <path-to-vedamatch.app>`
  - затем верификацию: `xcrun devicectl device info apps --device <UDID> --bundle-id com.VedaMatch.vedamatch --columns '*'`.
- Если при `xcodebuild` появляется `database is locked`, значит параллельно запущены конкурирующие сборки в одном `DerivedData`; перед повтором оставить только один активный процесс сборки.
- Для iOS video PiP текущий рабочий путь — `react-native-webrtc` (`RTCPIPView` + `startIOSPIP/stopIOSPIP`) в `frontend/screens/calls/CallScreen.tsx`; custom iOS bridge `CallPiPModule` удален из `frontend/ios/vedamatch/AppDelegate.mm`.
- В `frontend/services/callPiPService.ts` iOS путь intentionally no-op для native `CallPiPModule`; Android PiP через `CallPiPModule` остается активным.
- В `frontend/ios/vedamatch/AppDelegate.mm` включен `WebRTCModuleOptions.enableMultitaskingCameraAccess = YES` для стабильной камеры в фоне/мультитаскинге.

## Android Release
- Актуальная Android production-версия:
  - `versionCode=18`
  - `versionName=1.1.16`
  - файл: `frontend/android/app/build.gradle`.
- Для стабильного production-поведения Android в `frontend/android/app/build.gradle` должен быть `project.ext.envConfigFiles` с привязкой `release -> .env.production` (иначе `dotenv.gradle` может взять общий `.env` с `APP_ENV=development`).
- Проверенный порядок выката на физическое устройство:
  - сборка: `cd frontend/android && ./gradlew clean assembleRelease`
  - установка: `adb install -r frontend/android/app/build/outputs/apk/release/app-release.apk`
  - проверка версии: `adb shell dumpsys package com.ragagent | rg "versionCode=|versionName="`.
- Признак release-сборки на устройстве: в `adb shell dumpsys package com.ragagent` отсутствует флаг `DEBUGGABLE`, а `pkgFlags` выглядит как `HAS_CODE ALLOW_CLEAR_USER_DATA`.

## Chat Realtime Reliability
- В `server/internal/websocket/hub.go` исправлен race при reconnect одного и того же пользователя:
  - раньше `Unregister` удалял запись только по `userID` и мог снести уже новый активный сокет;
  - теперь удаление идет только если `current == client`, а при новом `Register` старый сокет того же `userID` закрывается.
- Добавлен тест `server/internal/websocket/hub_test.go` на сценарий `old unregister after new register`, чтобы не допустить регресс пропусков сообщений.
- В `frontend/components/chat/RoomVideoBar.tsx` ожидаемая гонка `connect()/disconnect()` с текстом `Client initiated disconnect` больше не логируется как `console.error`:
  - добавлен фильтр `isExpectedClientDisconnectError(...)`;
  - для этой ситуации выставляется статус `Disconnected` без error-overlay в dev/эмуляторе;
  - остальные ошибки подключения SFU по-прежнему логируются.

## Chat Navigation Reliability (Android)
- Для `frontend/screens/ChatScreen.tsx` аппаратный back переведен на `useFocusEffect` + единый `handleBackNavigation`, чтобы listener был активен только при фокусе экрана.
- В `frontend/App.tsx` для `Stack.Screen name="Chat"` отключен `freezeOnBlur` на Android (`false`) как mitigation против blank/white экрана при возврате.
- В `frontend/android/app/src/main/AndroidManifest.xml` включена совместимость back-поведения с RN-роутингом: `android:enableOnBackInvokedCallback="false"`.
- В `handleBackNavigation` добавлен fallback через `navigation.reset({ routes:[{name:'Portal'}] })`, если безопасного `goBack()` нет; это уменьшает риск белого экрана при нестабильном состоянии стека.
- Для `ContactProfileScreen` back сделан guarded (`goBack` при валидном prev route, иначе `navigation.reset(...Portal contacts...)`), а в `frontend/App.tsx` для `ContactProfile` принудительно `freezeOnBlur: false` для снижения white-screen регрессий.

## Chat UI Reliability
- В `frontend/components/chat/MessageList.tsx` входящие P2P-сообщения (`sender === 'other'`) теперь используют реальный `recipientUser.avatarUrl` (через `getMediaUrl`) вместо ассистент-аватара; при отсутствии фото показывается инициал.
- В `frontend/screens/portal/PortalMainScreen.tsx` `NotificationPanel` рендерится не только в grid-режиме, но и в активных сервисах (`contacts/calls`), чтобы колокольчик открывал историю уведомлений на обоих экранах.
- В `frontend/components/chat/ChatHeader.tsx` и `frontend/screens/ChatScreen.tsx` выровнены отступы/высота шапки под VedaMatch: header получает `topInset`, исправлены line-height/title-subtitle clipping.
- Для голосовых сообщений чата:
  - в `frontend/services/mediaService.ts` запись запускается с явным `audioSet` и выделенным файлом (`createRecorderConfig`) вместо дефолтного `startRecorder()` без параметров;
  - важный iOS нюанс `react-native-audio-recorder-player`: для стабильного старта нужно использовать путь `DEFAULT` (а не абсолютный путь), иначе возможен `Error occured during initiating recorder`;
  - добавлена проверка на `stopRecorder() === "Already stopped"` с понятной ошибкой;
  - в `frontend/context/ChatContext.tsx` ошибки старта/остановки записи показываются пользователю через `Alert`, а не только в консоли.
  - для стабильного отображения аудио-сообщений в `frontend/components/chat/MessageList.tsx` добавлен fallback `resolveAudioUrl`:
    - рендер аудио теперь определяется не только `type==='audio'`, но и по `mimeType`, extension (`fileName/url`) и URL из `text`;
    - если `content` пуст, но аудио-URL есть в `text`, показывается `AudioPlayer`.
  - в `frontend/context/ChatContext.tsx` и `frontend/services/messageService.ts` унифицировано пробрасывание `mimeType` и `content` (`content || text`) для history/ws/local upload.
- Для светлых chat backgrounds добавлен отдельный контрастный режим:
  - `frontend/utils/chatBackgroundContrast.ts` определяет светлый/темный цвет и градиент;
  - `frontend/components/chat/ChatHeader.tsx` для светлого фона использует более темные title/subtitle/icon цвета в VedaMatch-теме;
  - `frontend/components/chat/ChatInput.tsx` адаптирует `inputColor/placeholder/icon` и фон поля ввода под светлый фон чата;
  - `frontend/screens/ChatScreen.tsx` переключает `StatusBar` на `dark-content` при светлом фоне.
- Дополнительно для области переписки:
  - `frontend/components/chat/MessageList.tsx` переведен на `chatBackgroundType/chatBackground` (вместо `portalBackgroundType`);
  - введены раздельные цвета текста/времени для исходящих и входящих bubble;
  - на светлом фоне входящие сообщения рендерятся темным текстом (устранена проблема “не видно букв”).
- Экран истории чатов (`frontend/SettingsDrawer.tsx`) больше не использует фото/градиент portal-фона:
  - фон принудительно однотонный `#F2EFE6`;
  - карточки и текст в истории чатов переведены на контрастные цвета (`textPrimary #1F2937`, `textSecondary #64748B`) для стабильной читаемости.
- Фон чата отделен от portal-фона:
  - в `frontend/context/SettingsContext.tsx` добавлены отдельные chat keys (`chat_background*`, `chat_wallpaper_slides*`);
  - default для чата — нейтральный цвет `#F2EFE6` (`type=color`), без дефолтной фото-обои;
  - в `frontend/screens/settings/AppSettingsScreen.tsx` добавлен отдельный блок “Фон чата” (пресеты/галерея/слайдшоу);
  - `frontend/screens/ChatScreen.tsx` рендерит background только из chat-specific настроек.

## Profile UI Reliability
- `frontend/screens/settings/EditProfileScreen.tsx` больше не наследует `portalBackground`-фотообои:
  - удален рендер `ImageBackground` по `portalBackgroundType`;
  - установлен стабильный однотонный фон `#0E1525` для загрузки и основного контента экрана.
- `frontend/screens/portal/contacts/ContactProfileScreen.tsx` также отключен от `portalBackground`-фотообоев:
  - удалена ветка `portalBackgroundType === 'image'` с `ImageBackground`;
  - для профиля контакта остаются только градиентный фон или однотонный `vTheme.colors.background`.

## Push Notifications
- На Android 13+ (`API 33`) в `frontend/services/notificationService.ts` обязателен runtime-запрос `POST_NOTIFICATIONS` через `PermissionsAndroid`; без этого FCM push в системной шторке не появятся даже при валидном токене.

## Documentation Discipline
- Каждый запрос пользователя фиксировать в `PROMPT_LOG.md` с датой и временем.
- При изменениях, затрагивающих другие платформы, писать запись в `Docs/IOS_CHANGES_FOR_MIGRATION.md`:
  дата, измененные файлы, суть правки (старое -> новое), сниппеты.

## Disk Space / Build Artifacts
- Диагностика от `2026-02-26`:
  - Свободно на `/System/Volumes/Data`: `~4.6GiB` (`df -h`), раздел заполнен на `98%`.
  - Главные потребители: `~/Library` (`81G`), `~/Documents/VedaMatch` (`32G`), `~/.gradle` (`13G`), `~/.android` (`9.1G`).
- Внутри проекта `VedaMatch` основной объем в `frontend`:
  - `frontend/ios` (`20G`): `ios/build` (`9.2G`), `ios/build_release_prod` (`4.7G`), `ios/build_debug_device` (`2.9G`), `ios/build_release` (`2.4G`).
  - `frontend/build` (`5.0G`): временные iOS release build-папки.
  - `frontend/node_modules` (`3.4G`), `frontend/android/app/build` (`1.3G`).
- Крупный внешний dev-кэш iOS:
  - `~/Library/Developer/Xcode/DerivedData` (`38G`), где крупные папки `vedamatch*`.
- Безболезненно удаляемые артефакты (пересобираются автоматически):
  - `frontend/ios/build`, `frontend/ios/build_release*`, `frontend/ios/build_debug_device`.
  - `frontend/build`.
  - `frontend/android/app/build`.
  - `~/Library/Developer/Xcode/DerivedData`.
  - `~/.gradle/caches`, `~/.gradle/wrapper` (с осторожностью: последующий Android build будет дольше).
  - Старые эмуляторы `~/.android/avd` (только неиспользуемые AVD).
- Фактическая очистка от `2026-02-27` выполнена:
  - удалены `frontend/ios/build*`, `frontend/build`, `frontend/android/app/build`, `~/Library/Developer/Xcode/DerivedData`, `~/.gradle/caches`, `~/.gradle/wrapper`, `ragagent-release.apk`;
  - свободное место на `/System/Volumes/Data` выросло с `~4.7GiB` до `~78GiB`.

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

## Monetization & Tariffs
- Текущие video-circles тарифы по умолчанию в backend (`video_tariffs` seed через сервис):
  - `lkm_boost`: `10 LKM` за `60 минут` продления;
  - `city_boost`: `20 LKM` за `120 минут` и городское продвижение;
  - `premium_boost`: `30 LKM` за `180 минут`.
- PRO подписка в LKM:
  - `pro_7d`: `99 LKM`;
  - `pro_30d`: `299 LKM`;
  - `pro_90d`: `799 LKM`.
- Пополнение LKM реализовано через `YooKassa/Stripe` с конфигурируемыми лимитами/пакетами и админ-настройками processing-cost.
- AI монетизация: в AI-room отправка одного сообщения списывает `1 LKM`.
  - `video_circles_upload_s3_fail_total`
  - `video_circles_non_cdn_detected_total`

## Services Platform Fee
- Для `Услуг` добавлен MVP-комиссии платформы с snapshot на уровне `ServiceBooking`:
  - поля: `commissionPercentBps`, `commissionCapLkm`, `platformFeeAmount`, `providerNetAmount`, `feeCalculatedAt`, `feeReleasedAt`.
- Стартовые дефолты в `SystemSetting`:
  - `SERVICES_PLATFORM_FEE_ENABLED=true`
  - `SERVICES_PLATFORM_FEE_PERCENT_BPS=800`
  - `SERVICES_PLATFORM_FEE_CAP_LKM=300`
  - `SERVICES_PLATFORM_FEE_APPLY_NO_SHOW=true`
  - `SERVICES_PLATFORM_FEE_ROLLOUT_PERCENT=100`
- Формула:
  - `fee = min(pricePaid * percentBps / 10000, capLkm)`
  - `providerNet = pricePaid - fee`
- Точки применения:
  - `Create booking`: расчет и фиксация snapshot комиссии;
  - `Complete` и `No-show`: release через split-метод кошелька;
  - `Cancel`: полный refund hold клиенту, комиссии нет.
- Новый wallet-путь:
  - `ReleaseFundsWithPlatformFeeSplit(...)` в `server/internal/services/wallet_service.go`:
    - разморозка у плательщика;
    - зачисление `net` мастеру;
    - зачисление `fee` в `WalletTypePlatform`.
- Метрики комиссии:
  - `services_platform_fee_charged_total`
  - `services_platform_fee_bookings_total`
  - `services_platform_fee_failed_total`
  - `services_provider_net_paid_total`
- UI:
  - На `IncomingBookingsScreen` мастер видит блок `Цена / Комиссия платформы / К получению`;
  - клиентские экраны не менялись.

## Sadhu Sanga Module (MVP Contracts)
- Scope принят как модуль внутри существующего VedaMatch (без отдельного приложения).
- Подписка на проповедника реализуется через `channels`:
  - новая роль `subscriber` в `models.ChannelMemberRole`;
  - self-service API:
    - `POST /api/channels/:id/follow`
    - `DELETE /api/channels/:id/follow`
    - `GET /api/channels/:id/follow-status`
  - DTO канала теперь содержит:
    - `followersCount` (по роли `subscriber`)
    - `isFollowing` (owner/member для текущего viewer).
  - при `PublishPost` и `PublishDuePosts` добавлена push-рассылка по подписчикам (`subscriber`) с дедупликацией на таблице `channel_post_deliveries`.
- Каталог проповедников (`GET /api/channels`) расширен фильтрами:
  - `city` (owner city),
  - `language` (owner language),
  - `topic` (через owner tags).
- UX фильтров Sadhu Sanga переведен на справочники вместо ручного ввода:
  - backend endpoint `GET /api/channels/sadhu-sanga/facets` отдает агрегированные значения `cities/languages/topics` с `count`;
  - в `SadhuSangaHubScreen` фильтры `Город/Язык/Тема` теперь открывают picker-modal с вариантами из facets и опцией `Все`;
  - для города добавлен быстрый вариант `Мой город` (из профиля пользователя), если он задан.
- Этап C2 «Дорожная карта проповедника»:
  - добавлена новая сущность `channel_roadmap_points` (`past/current/future`, city/address/coords, position, note, created_by/updated_by);
  - backend API:
    - `GET /api/channels/:id/roadmap`
    - `POST /api/channels/:id/roadmap`
    - `PATCH /api/channels/:id/roadmap/:pointId`
    - `DELETE /api/channels/:id/roadmap/:pointId`
    - `POST /api/channels/:id/roadmap/:pointId/set-current`
    - `PUT /api/channels/:id/roadmap/reorder`
  - RBAC для управления roadmap: `owner/admin/editor`; чтение — по текущей видимости канала;
  - в `ChannelDetailsScreen` (`source='sadhu_sanga'`) добавлен публичный блок таймлайна (`был/сейчас/будет`) с deeplink `Открыть на карте`;
  - добавлен отдельный экран управления `ChannelRoadmapManageScreen` с CRUD, `set-current`, up/down reorder и подсказками адреса через `map/autocomplete`.
- Семинары/календарь:
  - добавлен экспорт `ICS`: `GET /api/bookings/:id/calendar.ics`;
  - доступ только участнику бронирования или владельцу сервиса.
  - добавлен дополнительный reminder `10m` в worker (`reminder_10m_sent`) помимо существующих `24h` и `1h`.
- Support-вопросы проповеднику:
  - `supportCreateTicketRequest` поддерживает `targetPreacherId`;
  - при наличии target id entry point нормализуется в `sadhu_sanga_question`;
  - metadata сохраняется в `support_conversations.meta_json`.
- Клиентский контракт (RN):
  - `frontend/services/channelService.ts` содержит `followChannel/unfollowChannel/getFollowStatus` + фильтры `city/language/topic`;
  - `frontend/services/bookingService.ts` содержит `exportBookingCalendarIcs`.
  - `frontend/services/supportService.ts` содержит `targetPreacherId` в `CreateSupportTicketPayload`.
- `frontend/screens/portal/services/channels/ChannelsHubScreen.tsx`:
  - добавлен follow/unfollow UX на карточке поста с optimistic update;
  - отображается `Подписчиков: N` для поста/канала.
- `frontend/screens/portal/services/channels/ChannelDetailsScreen.tsx`:
  - добавлен self-service follow/unfollow в header для читателя;
  - добавлена роль-метка `Подписчик` для `subscriber`;
  - добавлен публичный счетчик `Подписчиков: N` в intro блока канала.
- `sadhu_sanga` отделен от общего `ChannelsHub`:
  - добавлен отдельный экран `SadhuSangaHubScreen` (поиск/фильтры `city/language/topic`, каталог проповедников, follow/unfollow, переход в `ChannelDetails`);
  - в карточке проповедника добавлены быстрые CTA:
    - `Вопрос` -> `SupportTicketForm` (`sadhu_sanga_question` + `targetPreacherId`);
    - `Семинары` -> `ChannelDetails` проповедника с `focusSection='seminars'`;
  - добавлен блок `Ближайшие семинары` в верхней части экрана:
    - данные из `getServices` + `getSchedules`;
    - расчет ближайшей даты слота для `specificDate` и weekly `dayOfWeek/timeStart`;
    - карточка содержит формат, дату, место/ссылку и CTA `Записаться` -> `ServiceDetail`;
    - добавлен UI-фильтр `Только с датой` (по умолчанию включен): скрывает элементы без `nextAt`, при этом сортировка остается по ближайшей дате.
    - для `offline` семинаров добавлена кнопка `Маршрут`, открывающая карту по `offlineLat/offlineLng` или `offlineAddress`.
  - настройки `Умных пушей` вынесены в отдельный экран `SadhuSangaSmartPushScreen`:
    - переход по колокольчику в `SadhuSangaHub`,
    - отдельный route `SadhuSangaSmartPush`,
    - сохранение персональных фильтров (`city/language/topics/time window/timezone`) через текущий API без изменения backend-контракта.
  - добавлен отдельный route `SadhuSangaHub` и запуск из `serviceLaunchResolver` для service id `sadhu_sanga`.
  - в `PortalMainScreen.navigateResolvedScreen` добавлен кейс `SadhuSangaHub`; без этого переход по иконке не открывал экран.
- `ChannelDetails` поддерживает режим `source='sadhu_sanga'`:
  - из `SadhuSangaHub` в `ChannelDetails` передается источник;
  - поддерживается `focusSection='seminars'` для автопрокрутки к секции семинаров;
  - в этом режиме скрываются общие канальные секции (CRM CTA, guide prompt, stories, draft toggle, showcases), чтобы экран соответствовал отдельному сервису.
  - добавлена отдельная секция `Семинары проповедника`, которая показывает только услуги владельца текущего канала (`service.ownerId === channel.ownerId`) с ближайшей датой и CTA записи.
  - в карточке семинара проповедника для `offline` добавлена кнопка `Маршрут` (deeplink карты по координатам/адресу).
  - в этом режиме добавлен CTA `Задать вопрос проповеднику` -> `SupportTicketForm` с `entryPoint='sadhu_sanga_question'` и `targetPreacherId`.
- `SupportTicketForm` расширен:
  - принимает route params `targetPreacherId/targetPreacherName`;
  - передает `targetPreacherId` в `supportService.createTicket(...)` для маршрутизации вопроса конкретному проповеднику.
- Голосование за вопросы проповеднику (`MVP+`) реализовано через support:
  - новая модель `support_question_votes` (`conversation_id + user_id`, unique pair);
  - новый API:
    - `GET /api/support/preachers/:preacherId/questions` — список вопросов (`sadhu_sanga_question`) с `voteCount` и `myVote`;
    - `POST /api/support/tickets/:id/vote` — toggle/set голоса за вопрос.
  - `ChannelDetailsScreen` в режиме `source='sadhu_sanga'` показывает секцию `Вопросы последователей` с кнопкой `Поддержать`.
- Умные push-уведомления (`MVP+`) для подписчиков каналов:
  - новая таблица `channel_smart_push_preferences`;
  - API:
    - `GET /api/channels/sadhu-sanga/push-preferences`
    - `PUT /api/channels/sadhu-sanga/push-preferences`
  - при fanout push в `channel_service.deliverPostToSubscribers` применяется фильтрация по настройкам пользователя (enabled, city, language, topics, local hour window).
  - режим «Не пропустить»: в preference добавлены флаги `reminder1h/reminder10m`; booking reminder worker проверяет их перед отправкой push для `reminder_1h` и `reminder_10m`.
  - UI экрана `SadhuSangaSmartPushScreen` переведен с ручного ввода на picker-модель:
    - `Город` и `Язык` выбираются из `facets` (single-select modal, `Все`);
    - `Темы` выбираются из `facets` в режиме multi-select (`Все темы`);
    - выбранные темы отображаются чипами; в API сохраняются массивом `topics[]`, без CSV-ввода.
  - в picker-модалках `Город/Язык/Темы` добавлен встроенный поиск:
    - фильтрация по исходному значению и человекочитаемому label;
    - при открытии/закрытии модалки поисковая строка очищается.
  - в picker `Темы` выбранные темы поднимаются вверх списка (с алфавитной сортировкой внутри групп), чтобы удобнее управлять текущим выбором.
- Аналитика проповедника (`MVP+`) в `ChannelDetails` (`source='sadhu_sanga'`):
  - новый API: `GET /api/channels/:id/preacher-analytics` (роль доступа: owner/admin канала);
  - backend считает:
    - `totalLectureViews` как сумму `view_count` опубликованных постов канала;
    - `seminarRegistrations` как регистрации по `service_bookings` для услуг владельца канала;
    - `activeCities` как топ-5 городов клиентов (`users.city`) по числу регистраций;
  - frontend `ChannelDetailsScreen` показывает блок `Аналитика проповедника` (карточки метрик + активные города) только для owner/admin в режиме Sadhu Sanga.
- `frontend/screens/portal/services/MyBookingsScreen.tsx` + `frontend/screens/portal/services/components/BookingCard.tsx`:
  - добавлена кнопка `Календарь` для upcoming booking;
  - действие вызывает `exportBookingCalendarIcs(bookingId)` и открывает системный share sheet с ICS payload.
- `frontend/screens/portal/services/IncomingBookingsScreen.tsx`:
  - добавлена кнопка `Календарь` для будущих входящих записей специалиста (`!past`);
  - действие вызывает `exportBookingCalendarIcs(bookingId)` и открывает системный share sheet с ICS payload.
- Backend hotfix для старых схем БД:
  - в `channel_service` подсчет подписчиков и subscriber-push выборка больше не используют `role='subscriber'` напрямую;
  - используется фильтр `role NOT IN ('owner','admin','editor')`, чтобы избежать SQL `500` при старом enum роли.
- Hotfix SQL для `ChannelDetails`:
  - в `ListPosts` исправлен `ORDER BY` с `channels.created_at` на `channel_posts.created_at`;
  - это устраняет PostgreSQL ошибку `missing FROM-clause entry for table "channels"` (SQLSTATE 42P01) при открытии канала.
- `ChannelDetailsScreen` dev-лог ошибки переведен с `console.error` на `console.warn`, чтобы не поднимать RedBox при обработанных API-ошибках.
- `ChannelDetailsScreen` загрузка постов сделана устойчивой:
  - падение `listPosts` (например backend SQL 42P01) больше не роняет весь экран;
  - используется fallback на пустой список постов и non-blocking `console.warn`.
- `ChannelDetailsScreen` в режиме Sadhu Sanga снова прокручивается целиком:
  - основной контент переведен в единый `ScrollView` (вместо набора `View` + отдельного нижнего `FlatList`);
  - pull-to-refresh перенесен на общий контейнер;
  - автопрокрутка к секции семинаров использует `scrollTo({ y })` через `ScrollView` ref.
- `ChannelDetailsScreen` для Sadhu Sanga получил сегментацию по читательским задачам:
  - добавлены чипы-переключатели `Обзор / Эфиры / Семинары / Вопросы / Маршрут / Посты`;
  - `Обзор` показывает сокращенный контент (например, первые элементы списков) и CTA для перехода в полный сегмент;
  - полные списки рендерятся в соответствующих сегментах, что снижает перегруз экрана.
- Для читателя в `ChannelDetailsScreen` (Sadhu Sanga) добавлен sticky CTA снизу:
  - `Подписаться` для не-подписанного пользователя;
  - `Открыть расписание` для подписанного;
  - контентный скролл получил дополнительный нижний отступ, чтобы CTA не перекрывал блоки.
- В верхней карточке `ChannelDetailsScreen` (Sadhu Sanga) добавлен компактный hero-блок:
  - динамический статус (live/scheduled/next seminar/fallback);
  - быстрые CTA `Эфир / Семинары / Вопрос`;
  - удалена дублирующая отдельная кнопка `Задать вопрос проповеднику` ниже hero.
- В сегменте `Обзор` `ChannelDetailsScreen` для Sadhu Sanga добавлена компактная сетка 2x2 (`Эфир/Семинары/Вопросы/Маршрут`);
  - тяжелые контентные секции теперь показываются в профильных сегментах (`Эфиры/Семинары/Вопросы/Маршрут`), а не в `Обзоре`.
- Заголовки Sadhu Sanga-секций в `ChannelDetailsScreen` упрощены до нейтральных:
  - `Вопросы`, `Семинары`, `Аналитика`, `Дорожная карта` (без имени канала и без слова `проповедник`).
- Этап C: биография проповедника:
  - backend добавлены сущности `preacher_profiles` и `preacher_profile_events`;
  - API:
    - `GET /api/channels/:id/preacher-profile`
    - `PUT /api/channels/:id/preacher-profile` (`owner/admin/editor`);
  - в `ChannelDetailsScreen` (`source='sadhu_sanga'`) добавлен блок `О {channel.title}`:
    - bio,
    - дата/место рождения,
    - дата ухода,
    - организация,
    - матх,
    - знаковые события.
  - добавлен отдельный экран `ChannelPreacherBioManageScreen` с редактированием био и событий (up/down reorder).
- Матх-фильтр Sadhu Sanga (server-side):
  - `ChannelListFilters` получил флаг `SadhuSanga`;
  - при `SadhuSanga=true` в list/recommendations/facets применяется фильтр по `viewer.madh`;
  - bypass: `viewer.godModeEnabled` или `viewer.role == superadmin`;
  - если `viewer.madh` пустой и bypass нет — Sadhu-выдача пустая;
  - фронтовые экраны `SadhuSangaHub/Live/Schedule/Profile` используют `sadhuSanga=true` и показывают подсказку заполнить `Мой матх`.
- Rollout/feature flags для Sadhu bio и math-filter:
  - bio:
    - `SADHU_SANGA_PREACHER_BIO_ENABLED`
    - `SADHU_SANGA_PREACHER_BIO_ROLLOUT_DENYLIST`
    - `SADHU_SANGA_PREACHER_BIO_ROLLOUT_ALLOWLIST`
    - `SADHU_SANGA_PREACHER_BIO_ROLLOUT_PERCENT`
  - math-filter:
    - `SADHU_SANGA_MATH_FILTER_ENABLED`
    - `SADHU_SANGA_MATH_FILTER_ROLLOUT_DENYLIST`
    - `SADHU_SANGA_MATH_FILTER_ROLLOUT_ALLOWLIST`
    - `SADHU_SANGA_MATH_FILTER_ROLLOUT_PERCENT`
  - фильтры и bio уважают rollout per-user; при отключении math-filter Sadhu-выдачи возвращаются без матх-ограничения.
- Admin controls для rollout Sadhu bio/math:
  - в `admin/src/app/settings/page.tsx` (System tab) есть UI-поля для всех ключей:
    - `SADHU_SANGA_PREACHER_BIO_ENABLED`
    - `SADHU_SANGA_PREACHER_BIO_ROLLOUT_PERCENT`
    - `SADHU_SANGA_PREACHER_BIO_ROLLOUT_ALLOWLIST`
    - `SADHU_SANGA_PREACHER_BIO_ROLLOUT_DENYLIST`
    - `SADHU_SANGA_MATH_FILTER_ENABLED`
    - `SADHU_SANGA_MATH_FILTER_ROLLOUT_PERCENT`
    - `SADHU_SANGA_MATH_FILTER_ROLLOUT_ALLOWLIST`
    - `SADHU_SANGA_MATH_FILTER_ROLLOUT_DENYLIST`
  - ключи также seeded в `server/internal/database/seed.go` с дефолтами (`enabled=true`, `percent=100`, allow/deny empty).
  - в `admin/src/app/settings/page.tsx` добавлен быстрый пресет rollout `0% / 10% / 50% / 100%`, который одновременно обновляет:
    - `SADHU_SANGA_PREACHER_BIO_ROLLOUT_PERCENT`
    - `SADHU_SANGA_MATH_FILTER_ROLLOUT_PERCENT`.

## PRO / LKM Subscriptions
- Источник прав PRO: роль (`admin/superadmin`) или активная запись в `user_pro_subscriptions`; `users.god_mode_enabled` используется как совместимый кэш-флаг entitlement.
- Добавлен backend сервис `ProService` (`server/internal/services/pro_service.go`) с контрактами:
  - `GET /api/pro/plans`
  - `GET /api/pro/status`
  - `POST /api/pro/purchase`
- Зафиксированные тарифы (из `system_settings`, с дефолтами):
  - `PRO_PLAN_7D_LKM=99`
  - `PRO_PLAN_30D_LKM=299`
  - `PRO_PLAN_90D_LKM=799`
- Оплата PRO: только regular LKM (`AllowBonus=false`) через `walletService.SpendWithOptions`.
- Продление ручное: при повторной покупке срок добавляется к `max(now, ends_at)`.
- Legacy sync включен:
  - `admin/superadmin` всегда получают `god_mode_enabled=true`;
  - non-admin entitlement только от активной подписки, устаревший `god_mode_enabled=true` без подписки снимается.
- Добавлен scheduler `pro_subscription_expiry` (каждые 10 минут): переводит просроченные подписки в `expired` и синхронизирует entitlement.
- В `EditProfileScreen` old switch PRO заменен на карточку статуса + переход на `ProPlansScreen`.
- Добавлен экран `ProPlansScreen` с покупкой пакетов и моментальным обновлением `UserContext.godModeEnabled` после успешной оплаты.
- Hotfix RN для экрана `ChannelPreacherBioManageScreen`:
  - если `GET /api/channels/:id/preacher-profile` возвращает 404 (`Cannot GET`), экран редактирования не закрывается и открывается с пустыми полями;
  - если `PUT /api/channels/:id/preacher-profile` недоступен (404/`Cannot PUT`), показывается явный alert `Бэкенд не обновлен`.
- Метрики Sadhu bio/math:
  - `sadhu_preacher_profile_read_total`
  - `sadhu_preacher_profile_upsert_total`
  - `sadhu_math_filter_applied_total`
  - `sadhu_math_filter_bypass_total`
  - `sadhu_math_filter_empty_profile_total`
- Команда канала (UX улучшение):
  - добавлен отдельный экран `ChannelTeamScreen` для управления участниками без перегруженного `ChannelManage`;
  - вход на экран вынесен в `ChannelDetails` отдельной кнопкой в header (`owner/admin`);
  - текущий RBAC сохранен без изменений backend:
    - просмотр состава команды: `owner/admin/editor`;
    - добавление/смена роли/удаление: только `owner` (server-side enforce);
  - поддержаны действия:
    - поиск контактов и подстановка `userId`,
    - добавление роли `editor/admin`,
    - переключение `admin <-> editor`,
    - удаление участника (кроме owner).
- Этап B (live + модерация) для Sadhu Sanga:
  - добавлены модели:
    - `ChannelLiveSession` (scheduled/live/ended/cancelled, room binding, accessPolicy=followers, live aggregates),
    - `ChannelLiveViewer` (join/leave activity + accumulated watch seconds);
  - добавлен live API на `channels`:
    - `GET /api/channels/:id/live`
    - `POST /api/channels/:id/live`
    - `PATCH /api/channels/:id/live/:liveId`
    - `POST /api/channels/:id/live/:liveId/start`
    - `POST /api/channels/:id/live/:liveId/end`
    - `POST /api/channels/:id/live/:liveId/cancel`
    - `POST /api/channels/:id/live/:liveId/join`
    - `POST /api/channels/:id/live/:liveId/leave`
  - RBAC live:
    - `editor+` управляет lifecycle;
    - `subscriber+` может join;
    - не подписчик получает `403`.
  - push:
    - на create/start live отправляется push подписчикам канала с применением текущих smart-push фильтров.
  - channel DTO расширен live-метаданными:
    - `liveStatus`,
    - `currentLiveSession`.
  - `preacher analytics` расширена live-метриками:
    - `liveSessionsTotal`,
    - `liveUniqueViewersTotal`,
    - `liveWatchMinutesTotal`.
  - frontend:
    - `SadhuSangaHubScreen`: добавлен блок `Прямой эфир` с CTA `Смотреть эфир`.
    - `ChannelDetailsScreen` (`source='sadhu_sanga'`): добавлен live-блок с `Анонсировать`, `Старт`, `Завершить`, `Отменить`, `Войти в эфир`.
    - `RoomChatScreen`: поддержка `autoStartCall` и отправка `leave` по закрытию live.
  - runtime moderation live:
    - добавлена модель `ChannelLiveModeration` (`session_id + user_id`, `is_muted`, `is_blocked`, `reason`, `updated_by`);
    - новый API:
      - `GET /api/channels/:id/live/:liveId/participants`
      - `POST /api/channels/:id/live/:liveId/moderation` (`mute|unmute|block|unblock|kick`);
    - join-flow учитывает `is_blocked` и запрещает вход в live (`403`);
    - в `ChannelDetailsScreen` для `editor+` добавлен список участников эфира с быстрыми moderation-действиями.
  - observability Stage B:
    - добавлены счетчики:
      - `sadhu_live_created_total`
      - `sadhu_live_started_total`
      - `sadhu_live_join_denied_total`
      - `sadhu_live_join_success_total`
      - `sadhu_live_ended_total`
    - в live service добавлены audit-логи с контекстом `channel_id/live_id/actor_id/role` для create/start/end, join success/denied и moderation action.
  - нагрузочный smoke-guard push без дублей:
    - в live fanout добавлена явная дедупликация получателей `uniqueChannelMemberUserIDs(...)` (по `user_id`, `0` пропускается);
    - добавлен unit/smoke тест на 1000+ участников с дублями: ожидается ровно 1000 уникальных ID.
  - интеграционный runbook Stage B:
    - добавлен `docs/sadhu-sanga-live-smoke-runbook.md` (API happy path, runtime moderation, push dedupe SQL-check, метрики/логи, RN UI smoke, rollout gates 10/50/100).
  - UI направление (референс-ориентированный refresh):
    - `SadhuSangaHubScreen` получил hero + карточки возможностей + улучшенные карточки проповедников;
    - вся текущая продуктовая логика сохранена (live, seminars, Q&A, smart push, follow), редизайн сделан как визуальная надстройка без удаления функционала.
  - разделение нижнего меню на отдельные экраны:
    - добавлены отдельные route-экраны `SadhuSangaSchedule`, `SadhuSangaLive`, `SadhuSangaProfile`;
    - добавлены отдельные файл-экраны:
      - `frontend/screens/portal/services/channels/SadhuSangaScheduleScreen.tsx`
      - `frontend/screens/portal/services/channels/SadhuSangaLiveScreen.tsx`
      - `frontend/screens/portal/services/channels/SadhuSangaProfileScreen.tsx`
    - нижний бар `Главная/Расписание/Эфиры/Профиль` переключает экраны через navigation `replace`, а не через локальный state табов;
    - верхние внутренние табы из `SadhuSangaHubScreen` убраны, home-блок (поиск/hero/фичи) показывается только на `Главная`.
  - `SadhuSangaProfileScreen` переведен на самостоятельную загрузку данных:
    - `Мои подписки` — из `channelService.getChannels(...).channels[].isFollowing`;
    - `Сохраненные лекции` — из `multimediaService.getFavorites(...).total`;
    - `Мои вопросы` — из `supportService.listMyTickets(...)` c фильтром `entryPoint='sadhu_sanga_question'`;
    - `Мой город` — из `channelService.getSadhuSangaPushPreference().city` c fallback на профиль пользователя.
    - текст CTA в блоке поддержки приведен к модерационно-нейтральному варианту:
      - было: `Пожертвовать` / `Ваше пожертвование помогает...`
      - стало: `Поддержать сервис` / `Ваша поддержка помогает...`.
  - `SadhuSangaScheduleScreen` переведен на самостоятельную загрузку расписания:
    - выборка event/lecture сервисов через `getServices + getSchedules`;
    - собственный фильтр `Только с датой`;
    - собственные CTA `Записаться` и `Маршрут`.
  - `SadhuSangaLiveScreen` переведен на самостоятельную загрузку live/архива:
    - собственная выборка каналов через `channelService.getChannels`;
    - собственный live join flow (`joinChannelLive` -> `RoomChat`);
    - архив лекций формируется на экране без зависимости от Hub-tab state.
  - `SadhuSangaHubScreen` очищен от мертвой tab-логики:
    - удалены ветки рендера `schedule/live/profile` и вычисления `activeTab`;
    - экран стал чистым home-only (hero + live teaser + семинары + каталог проповедников);
    - нижний бар в Hub оставлен только как переход на отдельные экраны.
  - вынесен общий layout для Sadhu Sanga:
    - новый компонент `frontend/screens/portal/services/channels/components/SadhuSangaLayout.tsx` содержит единый shell (gradient + safe area), header и нижний сервисный бар;
    - `SadhuSangaHubScreen`, `SadhuSangaScheduleScreen`, `SadhuSangaLiveScreen`, `SadhuSangaProfileScreen` переведены на этот общий layout;
    - дублирование header/bottom-nav стилей и разметки между экранами сокращено.
  - Этап C (C1 MVP) переведен на backend-рекомендации:
    - добавлен API `GET /api/channels/sadhu-sanga/recommendations` (protected);
    - ранжирование выполняется в `channel_service` по тем же правилам продукта:
      - приоритет live/scheduled каналов,
      - бонус для новых (неподписанных) каналов,
      - дополнительный вес по `followersCount`,
      - релевантность фильтрам (`city/language/topic`);
    - `SadhuSangaHubScreen` получает до 3 рекомендаций с сервера и не считает скоринг локально;
    - в карточке рекомендации сохранены быстрые действия `Открыть` и `Подписаться`.
  - mobile-полировка после редизайна:
    - вкладки `schedule/live/profile` переведены в `ScrollView`, чтобы избежать обрезки контента на низких экранах;
    - крупные заголовки и карточки приведены к compact-диапазону размеров (лучше читаемость и меньше визуальной перегрузки).
  - hotfix UX-регрессии хаба:
    - устранен lock скролла вниз в `SadhuSangaHubScreen` за счет единого `mainScroll` и удаления конфликтных локальных скроллов/FlatList-вложенности;
    - убран темно-синий фон (экран использует нейтральный `colors.background`);
    - добавлен фиксированный нижний сервисный бар `Главная/Расписание/Эфиры/Профиль`.
  - rollout Stage B:
    - добавлен user-level rollout для live:
      - `SADHU_SANGA_LIVE_ROLLOUT_ALLOWLIST`
      - `SADHU_SANGA_LIVE_ROLLOUT_DENYLIST`
      - `SADHU_SANGA_LIVE_ROLLOUT_PERCENT`
    - live endpoints/service теперь проходят через `IsSadhuSangaLiveEnabledForUser(userID)`.
  - Stage B+ (language + retention + YouTube autopublish):
    - live-сессии получили явный `broadcastLanguage` (default `ru`, BCP-47-подобная валидация в `normalizeLiveBroadcastLanguage`);
    - язык эфира пробрасывается в API/DTO и UI (`SadhuSangaHubScreen`, `SadhuSangaLiveScreen`, `ChannelDetailsScreen`) как бейдж `LIVE • XX`;
    - на завершении live (`EndLiveSession`) запускается пост-обработка архива:
      - пометка `media_tracks.source_context='sadhu_live_archive'`,
      - проставление `retention_expires_at = ended_at + retentionDays`,
      - постановка в YouTube очередь (`youtube_status='queued'`) при включенной автопубликации;
    - retention применяется только к `sadhu_live_archive`:
      - scheduler task `sadhu_live_archive_cleanup` (каждые 30 мин),
      - удаляются S3-объекты (включая HLS-префикс) и DB-запись трека,
      - метрика: `sadhu_live_archive_expired_total`;
    - YouTube upload worker:
      - scheduler task `sadhu_live_youtube_upload` (каждые 5 мин),
      - OAuth refresh-token flow (`oauth2.googleapis.com/token`) + `youtube/v3/videos` upload,
      - retry с exponential backoff, max attempts = 10,
      - метрики: `sadhu_youtube_upload_success_total`, `sadhu_youtube_upload_failed_total`, `sadhu_youtube_upload_retry_total`;
    - `media_tracks` расширен полями для архива и YouTube статуса:
      - `source_context`, `retention_expires_at`,
      - `youtube_status`, `youtube_video_id`, `youtube_url`, `youtube_uploaded_at`, `youtube_last_error`, `youtube_attempts`, `youtube_next_retry_at`,
      - link-поля `room_id`, `live_session_id`;
    - API мультимедиа поддерживает фильтр `sourceContext` (`GET /api/multimedia/tracks`) и фронт использует его для вкладки архива эфиров;
    - системные настройки YouTube/retention добавлены в seed и админку;
      - YouTube ключи скрыты для не-`superadmin`,
      - чувствительные `*_SECRET`/`*_TOKEN` всегда маскируются.

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
- Актуальная рабочая позиция по классам:
  - Ядро заявки: `09, 35, 38, 41, 42, 45`.
  - Рекомендуется добавить как фактически используемый в продукте: `39` (travel/transport arrangement).
  - Рекомендуется добавить как фактически используемый в продукте: `43` (temporary accommodation + cafes/restaurants booking/info).
  - `36` оставлять только при реальном запуске финсервиса с отдельным compliance-контуром; не смешивать с мобильной витриной, где LKM описывается как non-monetary internal points.
  - В `42` избегать избыточных формулировок про заказную разработку ПО/B2B-консалтинг, если это не отдельная коммерческая услуга.

## Store Legal Links (RuStore)
- Целевой публичный контракт для стора:
  - `https://vedamatch.ru/terms`
  - `https://vedamatch.ru/privacy`
  - `https://vedamatch.ru/delete-account`
- Источник страниц: Next.js admin (`/Users/mamu/Documents/vedicai/admin`) с публичными app-router page:
  - `src/app/terms/page.tsx`
  - `src/app/privacy/page.tsx`
  - `src/app/delete-account/page.tsx`
- Auth-gate требование:
  - legal-роуты должны быть в public allowlist в `src/components/AdminLayout.tsx`;
  - для гостя без `admin_data` не допускается redirect на `/login` с legal URL.
- Контентный минимум (RU для RuStore):
  - дата обновления;
  - юридический/приватный контакт (`legal@vedamatch.ru`, `privacy@vedamatch.ru`, `support@vedamatch.ru`);
  - описание удаления аккаунта и сроков хранения.
- Проверка готовности:
  - `curl -I` для 3 URL возвращает `200`;
  - без `Location: /login`;
  - в HTML присутствует релевантный заголовок документа, без формы логина.
- Текущий статус на 2026-03-04:
  - `https://vedamatch.ru/terms`, `https://vedamatch.ru/privacy`, `https://vedamatch.ru/delete-account` отдают `200` без auth-редиректа;
  - legal страницы используются как публичные ссылки для RuStore.

## RuStore UGC Moderation (Fast-Track)
- Для релизного контура RuStore используется существующий support pipeline (без новой отдельной UGC-таблицы):
  - мобильный flow: Chat -> `Пожаловаться` -> `SupportTicketForm` (`entryPoint=abuse_report`) -> `POST /api/support/tickets`;
  - backend сохраняет report metadata в `support_conversations.meta_json` (`reportType`, `reportedUserId`, `reportedContentType`, `reportedContentId`, `reportReasonCode`);
  - admin triage выполняется через существующий inbox `GET /api/admin/support/conversations` с фильтром `entryPoint`.
- Блокировка пользователя остается через существующий контракт:
  - `POST /api/blocks/add`, `POST /api/blocks/remove`, `GET /api/blocks`.
- Публичные legal-требования RuStore закреплены в web:
  - `terms` содержит явный список запрещенного контента и меры enforcement;
  - `privacy` содержит раздел по модерационной обработке жалоб и срокам хранения.
- Контакты модерации/поддержки, используемые в app/legal/store-материалах:
  - `support@vedamatch.ru`
  - `privacy@vedamatch.ru`
  - `legal@vedamatch.ru`

## RuStore Android Permissions
- Для публикации в RuStore permissions hardened на уровне `frontend/android/app/src/main/AndroidManifest.xml`:
  - удалены app-level неиспользуемые/рисковые permissions: `READ_MEDIA_VIDEO`, `ACCESS_COARSE_LOCATION`, `BIND_TELECOM_CONNECTION_SERVICE`, `MANAGE_OWN_CALLS`, `FOREGROUND_SERVICE_PHONE_CALL`, `FOREGROUND_SERVICE_CAMERA`, `WRITE_EXTERNAL_STORAGE`.
  - удален app-level `VoiceConnectionService` (`io.wazo.callkeep.VoiceConnectionService`) как неиспользуемый в текущем Android runtime (CallKeep UI инициализируется только для iOS в `App.tsx`).
- Добавлен `tools:node="remove"` для принудительного исключения transitive permissions из merged manifest:
  - `CALL_PHONE`, `READ_PHONE_STATE`, `READ_PHONE_NUMBERS`, `MANAGE_OWN_CALLS`, `SYSTEM_ALERT_WINDOW`, `WRITE_EXTERNAL_STORAGE`.
- Фактически подтверждено после `./gradlew :app:processDebugMainManifest`:
  - указанные запрещенные/опасные системные permissions отсутствуют в final merged manifest debug.
- Оставшиеся dangerous permissions для декларации RuStore:
  - `CAMERA`
  - `READ_MEDIA_IMAGES` (`READ_EXTERNAL_STORAGE` только до Android 12)
  - `RECORD_AUDIO`
  - `ACCESS_FINE_LOCATION`
  - `POST_NOTIFICATIONS`

## Account Deletion / Auth Invalidation
- API удаления аккаунта:
  - `DELETE /api/account` удаляет/анонимизирует аккаунт и ревокает refresh-сессии (`auth_sessions.revoked_at`) + device tokens.
- Критичное усиление (2026-03-04):
  - `server/internal/middleware/auth.go` теперь проверяет `sessionId` из access JWT против `auth_sessions` на каждом `Protected()` запросе;
  - revoked/expired session немедленно блокирует доступ (`401 Session revoked`) без ожидания истечения `exp` токена;
  - аналогичная проверка добавлена в `OptionalAuth()` (неактивная сессия игнорируется как anonymous).
- Пользовательский эффект:
  - после удаления аккаунта приложение чистит локальную сессию;
  - сервер больше не принимает старый access token от отозванной сессии.

## Versioning Notes
- Версии Android вести через `versionName` и `versionCode` в `frontend/android/app/build.gradle`.
- Текущие версии (2026-02-27):
  - Android: `versionCode=17`, `versionName=1.1.15`
  - iOS: `MARKETING_VERSION=1.1.16`, `CURRENT_PROJECT_VERSION=8`
- Статус production-сборок (2026-02-27):
  - Android: `./gradlew assembleRelease` успешно, APK: `frontend/android/app/build/outputs/apk/release/app-release.apk`.
  - Android metadata (`output-metadata.json`): `applicationId=com.ragagent`, `versionCode=17`, `versionName=1.1.15`.
  - iOS: `xcodebuild ... -configuration Release ... install` успешно (`** INSTALL SUCCEEDED **`), собранный `.app`: `.../DerivedData/vedamatch-prod/.../Applications/vedamatch.app`.
  - iOS metadata собранного `.app`: `CFBundleIdentifier=com.VedaMatch.vedamatch`, `CFBundleShortVersionString=1.1.16`, `CFBundleVersion=8`.
  - iOS устройство (`00008101-000C78913E87001E`): через `devicectl` подтверждена установка `com.VedaMatch.vedamatch 1.1.16 (8)`.
  - На устройстве параллельно остается старый пакет `com.vedicai.vedamatch 1.1.15 (7)`; это другой bundle id.
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
- Дефолтный нижний бар (quick access) зафиксирован как `contacts/calls/services`:
  - локальный default layout (`frontend/types/portal.ts`);
  - fallback role blueprints (`frontend/constants/portalRoles.ts`);
  - server role blueprints (`server/internal/handlers/portal_blueprints.go`);
  - нормализация quick access при инициализации layout (`frontend/services/portalLayoutService.ts`), включая автозамену `history -> services`.
- Для существующих layout добавлена миграция `services_catalog` в первую страницу (рядом с `services` или после 1-го ряда при отсутствии `services`) в `frontend/services/portalLayoutService.ts`.
- Добавлен отдельный сервисный ярлык `feed` (`Лента`, `PlayCircle`) в `DEFAULT_SERVICES`; для существующих layout он подтягивается через `ensureDefaultServices` при инициализации.
- Для повышения заметности `feed` добавлена миграция `ensureFeedShortcut` (`frontend/services/portalLayoutService.ts`): если ярлыка нет, он вставляется на первую страницу рядом с `channels`.
- Добавлен ярлык `sadhu_sanga` (`Садху-санга`, `Sparkles`) в `DEFAULT_SERVICES`; для существующих layout подтягивается через текущую миграцию `ensureDefaultServices` при инициализации.
- В `frontend/screens/portal/serviceLaunchResolver.ts` `sadhu_sanga` направляется в `SadhuSangaHub` (отдельный сервисный экран).
- Иконка `sadhu_sanga` заменена с `Sparkles` на `Flame`, чтобы убрать визуальный дубль с сервисом «Союз» в портале.
- В `frontend/screens/portal/serviceLaunchResolver.ts` `feed` направляется в `ChannelsHub` (лента открывается по умолчанию).
- Навигация сервис-ярлыков унифицирована между Portal и Widget Dock через `frontend/screens/portal/serviceLaunchResolver.ts`; в `PortalMainScreen` и `WidgetSelectionScreen` больше нет расхождений по `services`.
- Контрастный фикс экрана создания канала (`frontend/screens/portal/services/channels/CreateChannelScreen.tsx`):
  - для темных role-gradient добавлен `onGradient` режим (`#F8FAFC` / `#E2E8F0`) для `headerTitle`, `label`, `visibilityTitle`, `visibilitySub`, `createButtonText`, чтобы текст не «тонул» на темном фоне в iOS эмуляторе.

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
- В `frontend/services/roomSfuClient.ts` исправлена инициализация LiveKit SDK:
  - `registerGlobals()` берется из `@livekit/react-native` и вызывается единоразово;
  - `Room`/`RoomEvent` берутся из `livekit-client` (а не из `@livekit/react-native`), иначе на iOS/эмуляторе возможен runtime `LiveKit Room SDK is unavailable`.
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
- Прод-инцидент 2026-02-26 (закрыт): `POST /api/v1/chat/completions` возвращал `502` из-за upstream `401 Некорректный API ключ` от Polza.
- Причина и фиксация: в `system_settings.POLZA_API_KEY` была маска вместо реального секрета; после обновления ключа в админке `system_settings` содержит валидный `pza_...`, и продовый `POST /api/v1/chat/completions` снова отвечает `200`.

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
- В `frontend/services/notificationService.ts` добавлен defensive iOS flow против `messaging/unregistered`:
  - перед APNS/FCM запросами вызывается `ensureIosRemoteMessageRegistration()` (через `isDeviceRegisteredForRemoteMessages` + `registerDeviceForRemoteMessages` при необходимости);
  - APNS читается с коротким retry polling (`waitForIosApnsToken`), чтобы избежать race сразу после выдачи permissions;
  - при `messaging/unregistered` выполняется один retry регистрации/получения токена и отдельная telemetry `token_register_retry_success`.

## Profile Runtime Notes
- `frontend/screens/settings/EditProfileScreen.tsx` не должен предполагать, что `/contacts` всегда возвращает массив: backend может вернуть и paginated-формат `{ items: [...] }`.
- Для загрузки собственного профиля в `EditProfile` используется безопасный парсинг:
  - `Array.isArray(response.data) ? response.data : response.data?.items ?? []`.
- В обработанных `catch` ветках экрана `EditProfile` используется `console.warn` (вместо `console.error`), чтобы dev RedBox не блокировал экран при recoverable ошибках.
- Для сохранения профиля (`PUT /update-profile`) добавлен детализированный разбор ошибки на клиенте:
  - в лог пишутся `status/url/user/message` без передачи сырого `AxiosError` объекта;
  - в alert показывается реальное сообщение backend/axios (а не только generic `Failed to update profile`).
- Ошибка шага `PATCH /profile/nickname` больше не должна «маскироваться» как падение сохранения профиля:
  - профиль сохраняется отдельно;
  - ошибка никнейма показывается как warning в success-ответе.
- В backend `AuthHandler.UpdateProfile` добавлены trace-логи с `X-Request-ID`:
  - `begin`, `parse_error`, `unauthorized`, `user_lookup_failed`, `save_failed`, `success`.

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

## Channels Runtime Notes
- В `frontend/screens/portal/services/channels/ChannelsHubScreen.tsx` ошибки загрузки feed/my channels не должны логироваться через `console.error` в DEV (иначе RedBox).
- Для `catch` используется throttled `console.warn` с коротким форматом (`status/message`) без передачи полного объекта `AxiosError`.
- При падении загрузки первой страницы feed устанавливается `feedHasMore=false`, чтобы `onEndReached` не создавал повторный сетевой шторм.
- Реализован v1.1 для постов каналов:
  - backend endpoint `POST /api/channels/:id/posts/media/upload` (editor+) принимает `image/jpeg|png|webp` до 8MB, делает center-crop/resize `1080x1350` и возвращает `url/width/height/mimeType`;
  - в `CreatePost/UpdatePost` введена строгая валидация `mediaJson`:
    - `images` максимум 5;
    - `circles` максимум 10;
    - `circles[].id` уникальны и обязаны принадлежать `channelId` поста;
    - при ошибке возвращается `400 invalid payload`.
- `/api/video-circles/my` теперь поддерживает `channelId` и `status` для picker в композере поста.
- В `ChannelPostComposerScreen` добавлены режимы `create/edit` и медиаблоки:
  - фото до 5 (upload через новый backend endpoint);
  - кружки до 10 (выбор существующих + переход в создание кружка и авто-подхват последнего).
- В `ChannelsHubScreen` и `ChannelDetailsScreen`:
  - добавлен `⋯`-entrypoint редактирования (виден только автору);
  - для published-поста автора действует окно 24 часа (UI учитывает backend-правило `POST_EDIT_WINDOW_EXPIRED`);
  - комментарии работают через bottom sheet (list + send);
  - для iOS keyboard-safe ввода комментариев используется динамический расчет высоты клавиатуры (`keyboardWillChangeFrame`): `keyboardHeight = screenHeight - keyboardScreenY`, и в comments sheet применяется вычисляемый `marginBottom`; это убирает перекрытие инпута клавиатурой и держит composer почти вплотную;
  - `mediaJson` рендерится безопасно (fallback без падения при битом JSON).
- Добавлена загрузка обложки канала:
  - endpoint `POST /api/channels/:id/cover/upload` (owner/admin);
  - сервер делает center-crop 16:9 + resize `1600x900` + JPEG optimize и сохраняет в S3 (`channels/covers/{channelId}/...jpg`);
  - `ChannelManageScreen` получил кнопку выбора изображения и upload обложки с preview.
- Для пустой ленты в эмуляторе:
  - убран старый hardcoded early return для offline-dev пользователя в `ChannelsHubScreen`;
  - feed и my-channels теперь запрашиваются для всех пользователей.

## Storage Runtime Notes
- `frontend/lib/mmkvStorage.ts`: при недоступности native MMKV/NitroModules используется in-memory fallback.
- Чтобы dev-консоль не засыпалась `Error Component Stack` от LogBox, fallback и migration ошибки логируются одной строкой через `console.log` в dev (без передачи объекта `Error` в `console.warn/error`).
- В production остаётся `console.warn`, но тоже без объекта ошибки (только короткое сообщение + первая строка причины).

## Multimedia Runtime Notes
- Org-visibility в multimedia теперь централизована по `madh`:
  - anonymous viewer получает только global-контент (`madh` пустой/NULL);
  - non-PRO получает `global + user.madh`;
  - PRO/Admin/GodMode получает весь контент без org-ограничений.
- Публичные multimedia endpoints (`/api/multimedia/*`) используют `OptionalAuth` для read-персонализации без обязательного логина.
- Совместимость org query в multimedia: сервер принимает алиасы `matha`, `madh`, `math` (приоритет именно такой).
- Админка `admin/src/app/multimedia/page.tsx` унифицирована по полю видимости:
  - `madh=''` = `Для всех`;
  - `madh='<org>'` = контент конкретной организации;
  - create-формы Track/Video/Radio/TV берут default `madh` из `localStorage.admin_data.madh`.
- RN multimedia UI (`Audio/Video/Radio/TV/Hub`) работает в двух режимах:
  - PRO: доступны org-чипы и ручной org-фильтр;
  - non-PRO: org-чипы скрыты, работает ограниченный scope, при пустом `user.madh` показывается мягкий CTA (`Профиль`/`PRO`).
- В RN нельзя полагаться на `URLSearchParams.entries()` для query-объектов в сервисах: на iOS/Hermes это может отсутствовать и давать `params.entries is not a function`.
- В `frontend/services/multimediaService.ts` query параметры для `/multimedia/tracks`, `/multimedia/radio`, `/multimedia/tv` формируются обычным объектом `params`, без `URLSearchParams`.
- В `frontend/screens/multimedia/MultimediaHubScreen.tsx` обработанный сбой загрузки логируется через `console.warn`, чтобы не поднимать RedBox в dev.

## Seva/Charity Runtime Notes
- В `frontend/services/charityService.ts` нельзя использовать `URLSearchParams.set/entries` на iOS/Hermes: возможна ошибка `URLSearchParams.set is not implemented`.
- Для `get()` в charity service query-параметры endpoint (часть после `?`) парсятся в plain object (`parseQueryString`) и передаются в axios как `params`.
- В `frontend/screens/seva/SevaHubScreen.tsx` обработанные ошибки загрузки (`loadProjects`, `loadData`, `onRefresh`) логируются через `console.warn`, чтобы не показывать RedBox при recoverable сбоях.
- Текущий user-flow `Seva Marketplace`:
  - вход через `resolveServiceLaunch('seva') -> navigate('SevaHub')`;
  - `SevaHub` читает проекты из `GET /charity/projects` и кошелек из `WalletContext`;
  - донат отправляется в `POST /charity/donate` c `sourceService='seva'`, `sourceTrigger='donate_modal'`, `sourceContext`.
- Денежная модель Seva на backend:
  - при донате сумма проекта (`amount`) уходит в `frozen_balance` кошелька организации, tips (если включены) — в platform wallet;
  - donation создается в статусе `pending` с `canRefundUntil = +24h`;
  - worker `StartDonationConfirmWorker` (каждые 10 минут) переводит просроченные `pending` в `confirmed` и переносит сумму из `frozen_balance` в `balance` организации.
- Возврат `POST /charity/refund/:id` доступен только для `pending` донатов до дедлайна 24 часа; при refund откатываются user/org/platform балансы и пересчитываются `raised_amount`, `donations_count`, `unique_donors`.
- `frontend/screens/seva/SevaProjectDetailsScreen.tsx` сейчас частично демо: `userBalance=2500` (mock) и `handleDonate` как заглушка; реальный донат-флоу полноценно подключен в `SevaHubScreen`.

## P2P Calls: Known Failure Points
- В `server/internal/websocket/hub.go` сигналинг форвардится только подключенному WS-клиенту; если получатель не в `h.clients`, логируется `Target User X not connected` и звонок не доставляется.
- Если `/turn-credentials` недоступен, клиент (`frontend/services/webRTCService.ts`) уходит в STUN-only fallback, что часто ломает соединение для symmetric NAT/CGNAT.

## P2P Calls: Applied Fixes
- В `frontend/App.tsx` добавлен `incomingCallRef`; `answerCall` теперь передает `targetId/callerName` и `autoAccept=true`, `endCall` отправляет `webRTCService.sendHangup()`.
- Входящий call-flow расширен на push:
  - `frontend/services/notificationService.ts` добавлен `setIncomingCallPushHandler(...)` и маршрут `voip_call` в этот handler;
  - `voip_call` обрабатывается до проверки `navigationRef.isReady()`, чтобы не теряться на cold start;
  - `frontend/App.tsx` использует единый `showIncomingCall(...)` для источников `offer` (WS), `voip_call` (FCM open/foreground) и `react-native-voip-push-notification`;
  - `RNCallKeep.setup` на iOS больше не блокируется только `AppState === active`, чтобы popup входящего звонка поднимался и в фоне.
  - backend fallback: `server/internal/websocket/hub.go` получил `signalFallbackHandler`, а `server/cmd/api/main.go` регистрирует отправку `SendCallNotification(...)` при недоставленном `offer` (offline/full channel target), чтобы входящий вызов не терялся без WebSocket.
- В `frontend/screens/calls/CallScreen.tsx` добавлен авто-accept сценарий для входящего звонка при `autoAccept=true`.
- На `frontend/screens/calls/CallScreen.tsx` добавлены сигналы вызова:
  - входящий экран запускает `InCallManager.startRingtone(...)` до принятия и останавливает при accept/hangup/unmount;
  - исходящий звонок запускает `InCallManager.startRingback(...)` до получения remote stream и останавливает при connect/fail/hangup.
- История звонков переведена с mock на реальные данные:
  - добавлен `frontend/services/callHistoryService.ts` (AsyncStorage `call_history_v1`, типы `incoming/outgoing/missed`, лимит 100 записей);
  - `frontend/screens/calls/CallScreen.tsx` теперь сохраняет запись при завершении/сбросе звонка (включая `missed` для неотвеченного входящего);
  - `frontend/screens/calls/CallHistoryScreen.tsx` загружает историю из сервиса на фокусе экрана и при pull-to-refresh.
- История звонков обогащена данными контактов (lazy по `userId`):
  - `frontend/screens/calls/CallHistoryScreen.tsx` догружает контакт через `contactService.getUserById` с кешем `contactsById` и ограничением параллельности (`4`);
  - карточка звонка показывает real avatar (`getMediaUrl`), online-dot (активность < 5 минут), `@nickname · online/lastSeen` и fallback на `country/city`;
  - tap по карточке ведет в `ContactProfile` при наличии валидного `userId`.
- iOS crash fix (WebRTC enumerateDevices):
  - в `frontend/services/webRTCService.ts` `startLocalStream()` больше не вызывает `mediaDevices.enumerateDevices()` на iOS;
  - для non-iOS `enumerateDevices()` обернут в `try/catch` с fallback на constraints без `deviceId`.
- Переключение камеры на реальных iOS-устройствах:
  - в `frontend/services/webRTCService.ts` `switchCamera()` на iOS принудительно переключает через `restartLocalStreamWithFacing(...)` + `replaceTrack` в `RTCPeerConnection` (без reliance на `_switchCamera`);
  - на Android сохраняется fast-path через `track._switchCamera()`/`track.switchCamera()` с fallback на перезапуск stream.
  - `startLocalStream()` теперь использует `isFrontCamera` (а не hardcoded front), `endCall()` сбрасывает камеру в front.
  - в `frontend/screens/calls/CallScreen.tsx` кнопка камеры вызывает `await webRTCService.switchCamera()` и форсирует repaint локального `RTCView` через версионный key.
- В `frontend/types/navigation.ts` расширен `CallScreen` params новым optional флагом `autoAccept`.
- Mini-window/PiP для звонка при сворачивании:
  - Android:
    - в `frontend/android/app/src/main/AndroidManifest.xml` для `MainActivity` включены `android:supportsPictureInPicture="true"` и `android:resizeableActivity="true"`;
    - добавлен native bridge `CallPiPModule`/`CallPiPPackage` + JS-обертка `frontend/services/callPiPService.ts`;
    - `MainActivity.onUserLeaveHint()` переводит приложение в PiP при активном звонке (`CallPiPState.isCallActive`);
    - `CallScreen` синхронизирует `setCallActive(...)`, пробует auto-enter PiP при `AppState=background` и показывает ручную кнопку PiP (`Minimize2`) в панели звонка.
  - iOS:
    - в `frontend/ios/vedamatch/Info.plist` для `UIBackgroundModes` добавлены `audio` и `voip` (вместе с `remote-notification`) для устойчивости звонка в фоне;
    - в `frontend/screens/calls/CallScreen.tsx` iOS remote-video переведен на `RTCPIPView` с `iosPIP` опциями и `fallbackView`, запуск PiP — через `startIOSPIP(pipViewRef)`;
    - в `frontend/ios/vedamatch/AppDelegate.mm` убран legacy runtime `CallPiPModule`, чтобы исключить повторные `EXC_BAD_ACCESS` в `setCallActive`;
    - `frontend/services/callPiPService.ts` на iOS работает как no-op для native PiP и используется только Android native path;
    - авто-enter PiP по `AppState=background` остается только на Android, на iOS работает ручной сценарий через кнопку сворачивания.
  - Xcode схема:
    - `frontend/ios/vedamatch.xcodeproj/xcshareddata/xcschemes/vedamatch.xcscheme` переведена на `LaunchAction buildConfiguration=Release`, чтобы запуск через кнопку `Run` ставил production, а не debug.
- В `server/internal/handlers/turn_handler.go` выдача ICE сделана совместимой с двумя схемами TURN auth: static credentials (`TURN_USER/TURN_PASSWORD`) и HMAC credentials (`TURN_SECRET`).

## Call Quality Feedback & Support Transfer
- Добавлена модель `CallQualityFeedback` (`server/internal/models/call_feedback.go`) и миграция в `AutoMigrate` (`server/internal/database/database.go`).
- Seed настроек (`server/internal/database/seed.go`) включает:
  - `calls.feedback.enabled`
  - `calls.support_transfer.enabled`
  - `calls.support.wallet_user_id`
- Backend endpoints:
  - `POST /api/calls/feedback`
  - `POST /api/calls/support-transfer`
  - `GET /api/admin/calls/feedback`
  - `GET /api/admin/calls/feedback/:id`
  - регистрация маршрутов: `server/cmd/api/main.go`, реализация: `server/internal/handlers/call_feedback_handler.go`.
- Wallet-path для доната:
  - `TransferRegularOnlyWithDedup(...)` в `server/internal/services/wallet_service.go`;
  - списывает только `regular balance`, bonus не используется;
  - идемпотентность по `dedupKey`, self-transfer запрещен.
- Frontend post-call UX:
  - `frontend/screens/calls/CallScreen.tsx` показывает `CallFeedbackModal` только при `accepted` и длительности >= 10 сек;
  - шаг 1: рейтинг/причины/комментарий -> `POST /calls/feedback`;
  - шаг 2: optional быстрый перевод 20/50/100 или custom -> `POST /calls/support-transfer`;
  - ошибки API не блокируют закрытие вызова.
- Клиентский API вынесен в `frontend/services/callFeedbackService.ts`.
- В админке добавлен экран `/calls` (`admin/src/app/calls/page.tsx`) и пункт меню `Calls Feedback` (`admin/src/components/AdminLayout.tsx`).

## CRM Admin Panel (Next.js)
- Основной UI админки расположен в `admin/` (Next.js App Router, `next@16.1.1-canary`, React 19 RC), backend admin API — в `server/cmd/api/main.go` и `server/internal/handlers/admin_handler.go`.
- Backend admin-маршруты корректно защищены `middleware.Protected()` + `middleware.AdminProtected()` для `/api/admin/*`.
- На фронте контроль доступа реализован клиентски через `localStorage` в `admin/src/components/AdminLayout.tsx`; отдельного `middleware.ts` в `admin/src/` нет.
- Страница `admin/src/app/feed-posts/page.tsx` работает как публичная веб-лента (read-only список постов из `GET /api/feed`), без визуальной обертки админки.
- В `admin/src/components/AdminLayout.tsx` добавлен пункт меню `Feed Posts` (`/feed-posts`) и маршрут внесен в `exclusiveAdminRoutes`.
- `/feed-posts` вынесен в публичный layout-path: в `AdminLayout` этот маршрут входит в `isPublicRoute`, поэтому не рендерятся admin sidebar/header.
- UI `feed-posts` приведен к стилю главной страницы (`LandingPage`): светлый фон `#faf9f6`, брендовый top-nav, округлые карточки постов, акцентные кнопки пагинации.
- В публичном лендинге `admin/src/components/landing/LandingPage.tsx` добавлена ссылка `Лента` (`/feed-posts`) в top-nav (guest state) и в footer, чтобы доступ к ленте был виден без авторизации.
- Legacy media edge-case: если в админку приходит bare filename вида `7_1767761761.jpg` (без `/uploads/...`), нужно нормализовать его в `/uploads/avatars/<filename>`, иначе браузер запрашивает файл из корня домена и получает `404`.
- Для `admin/src/app/dating/page.tsx` добавлен runtime-fallback для битых avatar URL: после первого `img onError` URL попадает в `brokenMediaUrls` и больше не рендерится как `<img>`, что убирает повторные 404-спайки в `Union Management`.
- Для `admin/src/app/series/page.tsx` cover в карточках TV Series рендерится с `next/image unoptimized`, чтобы обойти `/_next/image` 400 для части внешних S3 URL.
- `Welcome Bonus` сделан конфигурируемым через `SystemSetting` ключ `WELCOME_BONUS_LKM`:
  - редактирование в `admin/src/app/referrals/page.tsx` (блок `Economic Pulse`);
  - значение прокинуто в `/api/admin/wallet/global-stats` (`welcomeBonusLKM`);
  - фактическая выдача welcome bonus в `server/internal/services/wallet_service.go` читает `services.GetWelcomeBonusLKM()`.
- Выявленные риски:
  - В `admin/src/app/page.tsx` любой авторизованный пользователь редиректится на `/user/dashboard`, включая `admin/superadmin` (не на `/dashboard`).
  - В `admin/src/app/admins/page.tsx` запрос `/admin/users?role=admin&role=superadmin` логически конфликтует с backend `c.Query("role")` (берется один `role`), список админов неполный.
  - `GET /admin/settings` отдает маскированные секреты `***`, но `admin/src/app/settings/page.tsx` отправляет весь объект обратно в `POST /admin/settings`; есть риск перезаписи реальных секретов маской.
  - Есть небезопасные `JSON.parse(localStorage.admin_data)` без `try/catch` в ряде критичных мест (`AdminLayout`, `login`, `api` interceptor), что может ломать UI при поврежденном localStorage.

## LKM Web (Next.js) Analytics
- Yandex.Metrika (`id=107021597`) подключена в корневом layout `lkm/src/app/layout.tsx` через `next/script` (`strategy="afterInteractive"`), чтобы скрипт инициализировался на клиенте без SSR-ошибок.
- `noscript` fallback-счетчик (`https://mc.yandex.ru/watch/107021597`) добавлен в `<body>` того же layout.

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
- Single-widget drag/drop:
  - в `WidgetCanvasGrid` добавлен drop-snap по координатам canvas для сценария одного виджета (раньше он всегда откатывался);
  - в `widgetCanvasLayout.reorderWidgetCanvas` для `widgets.length===1` сохраняется явная целевая `position`, вместо авто-нормализации в `0`.
- Shared collision rule:
  - в `useGridReorderDnd` условие `droppedOnOwnItem` ослаблено: reorder не отменяется, если найден `targetId` или `closestTarget`.
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
  - для сервиса `education` в `frontend/screens/portal/PortalMainScreen.tsx` фото/слайдшоу фон отключается точечно (`activeTab === 'education'`): слой принудительно переключается на `color` с `vTheme.colors.background`, иконки service-header идут в обычной (не белой) палитре.
  - в `PortalMainScreen` для `ScreenScaffold` задан `headerStyle={{ backgroundColor: 'transparent', borderBottomColor: 'transparent' }}` в grid/service режимах, чтобы убрать верхнюю glass-подложку у menu bar header.
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

## Global Nickname System (`@nickname`)
- Введен единый публичный ID пользователя: `nickname` (lowercase, без `@` в хранении).
- Новые поля пользователя:
  - `nickname`
  - `nicknameSetManually`
  - `nicknameChangedAt`
  - `nicknameChangeCooldownUntil`
  - `nicknameDisplay` (computed, `gorm:"-"`).
- Логин не менялся: вход остается по email/password или Telegram MiniApp.
- Регистрация:
  - `POST /api/register` принимает optional `nickname`;
  - если `nickname` не передан, назначается авто-уникальный.
- Смена ника:
  - `PATCH /api/profile/nickname`;
  - cooldown на смену: 30 дней;
  - коды ошибок: `NICKNAME_INVALID`, `NICKNAME_TAKEN`, `NICKNAME_COOLDOWN_ACTIVE`.
- Поиск и резолв:
  - `GET /api/contacts?q=...` ищет в том числе по `nickname`;
  - `GET /api/users/by-nickname/:nickname` возвращает публичный профиль.
- Каналы:
  - `POST /api/channels/:id/members` поддерживает либо `userId`, либо `nickname`;
  - в `listMembers` добавлены `userInfo.nickname` и `userInfo.nicknameDisplay`.
- Frontend:
  - `UserContext`, `UserContact`, `ChannelMemberUserInfo` расширены `nickname`;
  - `ChannelTeamScreen` поддерживает добавление участника по `@nickname`;
  - `EditProfileScreen` позволяет менять `@nickname` через `accountService.updateNickname`;
  - `RegistrationScreen` в фазе профиля показывает чип `Ваш ID: @nickname`.

## Channel Team Search Stability
- В `ChannelTeamScreen` поиск участников стабилизирован:
  - добавлен debounce `220ms` для `memberSearchQuery`;
  - введен `latestContactsRequestRef` для игнорирования устаревших ответов API;
  - убран триггерный цикл, связанный с зависимостью `loadingContacts` в search callback;
  - при коротком запросе (`<2`) результаты и loading очищаются без лишних запросов.
- Симптом до фикса: при вводе в поиске экран «дергался», а подбор участников (в т.ч. `@nickname`) срабатывал нестабильно.

## Sadhu Sanga Schedule Time Layout
- В `SadhuSangaScheduleScreen` исправлен перенос времени в карточках расписания.
- Причина: узкая time-колонка + большой жирный шрифт времени.
- Фикс:
  - `scheduleTimeCol.width` увеличен до `98`;
  - `scheduleTimeMain` получил `numberOfLines=1`, `adjustsFontSizeToFit`, `fontVariant: ['tabular-nums']`, выровненный `lineHeight`.
- Результат: `09:00` держится в одну строку и не ломает карточку.

## Sadhu Sanga Search Mode (Hub)
- В `SadhuSangaHubScreen` включен отдельный режим поиска проповедников:
  - если `search.trim().length > 0`, скрываются hero/feature/live/seminars/recommendations блоки;
  - остаются строка поиска, фильтры и список найденных проповедников;
  - заголовок списка меняется на `Результаты поиска`.
- Это устраняет UX-конфликт, когда при поиске пользователь видел “другие блоки”, а не чистую выдачу проповедников.

## Sadhu Sanga Channel Details: Subscribe CTA Cleanup
- В `ChannelDetailsScreen` удалена нижняя фиксированная (sticky) кнопка `Подписаться`/`Открыть расписание`.
- Сохранена только верхняя кнопка подписки в шапке карточки канала.
- `ScrollView` больше не использует условный отступ под sticky CTA (`contentScrollContainerWithStickyCta` не применяется).

## Sadhu Sanga Bio UX (Date + Organization/Math)
- Экран `ChannelPreacherBioManageScreen` переведен с ручного ввода дат на нативный `react-native-date-picker`:
  - `Дата рождения`, `Дата ухода`, `Дата события` выбираются модально.
- Для `Дата ухода` добавлен UX-переключатель:
  - `Указать` / `Не указывать`;
  - при `Не указывать` поле скрывается и в payload уходит `departureDate: undefined`.
- `Организация` и `Матх` объединены в один выбор `Организация / Матх`:
  - источник опций: `channels/sadhu-sanga/facets.mathas` + fallback `DATING_TRADITIONS`;
  - выбор через modal с поиском.
- На отображении био в `ChannelDetailsScreen` дубли убраны:
  - вместо отдельных строк `Организация` и `Матх` используется одна строка `Организация / Матх`.
- В селектор `Организация / Матх` добавлены обязательные варианты для совместимости поиска:
  - `ISKCON`, `ИСККОН`, `ИССКОН`;
  - эти варианты закреплены приоритетно вверху списка через сортировку по `PRIORITY_MATH_ORDER`.

## Shared Madh Options
- Глобальный справочник `DATING_TRADITIONS` (используется в `EditProfileScreen` и других формах) обновлен:
  - оставлен один canonical-вариант `ISKCON` (без дублей `ИСККОН/ИССКОН`);
  - это убирает визуальные дубли в picker-модалках выбора матха.
- PRO-фильтры (`/system/god-mode-math-filters`) синхронизированы с пользовательским списком mat(h)-picker:
  - добавлены `ISKCON`, `Brahma-Madhva-Gaudiya`, `Sri Sampradaya (Ramanuja)`, `Brahma Sampradaya (Madhvacharya)`, `Rudra Sampradaya (Vishnuswami)`, `Kumara Sampradaya (Nimbarka)`, `Шри Чайтанья Сарасват Матх`, `Международное Общество Чистой Бхакти-йоги`, `Шри Гопинатх Гаудия`, `Шри Чайтанья Матх`;
  - legacy org-фильтры `Gauranga/Vrindavan/Mayapur` сохранены.

## Edit Profile PRO Toggle Behavior
- Причина жалобы \"профиль не сохраняется\": не-админы могли переключать `Режим PRO` в UI, но backend законно игнорировал изменение.
- Фикс в `EditProfileScreen`:
  - `PRO` toggle заблокирован для ролей, отличных от `admin/superadmin`;
  - показывается пояснение `Доступно только администратору`;
  - в payload отправляется текущее серверное значение `godModeEnabled` для не-админов.
- `ChannelManageScreen` переведен на светлый однотонный фон (`#F5F2E8`) вместо role-gradient, чтобы заголовки/поля были читаемы на iOS/Android.
- `ChannelManageScreen`: убраны пользовательские поля ручного ввода `URL аватарки` и `URL обложки`; брендирование сохраняет только `description`, а обложка обновляется через upload-flow.
- Превью обложки усилено: добавлен cache-busting query-param и fallback-состояние с понятным текстом при ошибке загрузки вместо пустого/белого блока.

## Sadhu Sanga PRO/Math Bypass Consistency
- Backend `channel_service.resolveEffectiveSadhuMathFilter` теперь считает bypass активным, если выполняется одно из условий:
  - роль `admin/superadmin`,
  - `god_mode_enabled=true`,
  - `current_plan` содержит `pro` или равен `admin`.
- `loadSadhuViewer` загружает `current_plan`, чтобы filter-bypass не зависел только от кэш-флага.
- Frontend Sadhu-экранов (`SadhuSangaHubScreen`, `SadhuSangaScheduleScreen`, `SadhuSangaLiveScreen`) синхронизирован с той же bypass-логикой для корректных подсказок при пустом `madh`.

## Portal Icons
- 2026-03-02: для связки `Контакты <-> История звонков` добавлен контекстный header-shortcut в `frontend/screens/portal/PortalMainScreen.tsx`:
  - на `contacts` показывается иконка `Phone`, по нажатию переключает на `calls`;
  - на `calls` показывается иконка `Contact`, по нажатию переключает на `contacts`;
  - на остальных сервисах остается `MessageSquare` и открытие меню (`setIsMenuOpen(true)`).
- `frontend/types/portal.ts`: сервис `contacts` использует иконку `MessageSquare` (из предыдущего UI-swap).

## Union (Dating) Profile Loading
- Экран `frontend/screens/portal/dating/EditDatingProfileScreen.tsx` не должен использовать `datingService.getUsers()` для загрузки собственного профиля: endpoint `/contacts` может вернуть объект пагинации (`items/hasMore/...`), а не массив.
- Рабочий путь: загружать профиль через `datingService.getProfile(userId)` (`GET /dating/profile/:id`), чтобы получать один объект пользователя без `find` по массиву.
- Для поля `intentions` нужен defensive parse: поддерживать и строку CSV, и массив, иначе возможны ошибки при несовпадении формата ответа API.

## Production Observability (Grafana/Loki/Prometheus/Promtail)
- В репозитории добавлен отдельный IaC-каталог: `infra/monitoring` с compose-стеком и provisioning-конфигами.
- Состав production-стека:
  - `prometheus` (retention `30d`, rules + alerts + recording rules);
  - `loki` (TSDB + S3 backend, compactor retention `30d`);
  - `promtail` (docker_sd + journal ingestion);
  - `grafana` (file provisioning datasource/dashboard/alerting, private bind `127.0.0.1:13000`);
  - `node-exporter`, `cadvisor`, `blackbox-exporter`.
- Backend наблюдаемость:
  - добавлен `GET /metrics` с bearer token guard;
  - новые env: `METRICS_ENABLED`, `METRICS_BEARER_TOKEN`;
  - RED-метрики: `http_requests_total`, `http_request_duration_seconds`, `http_in_flight_requests`.
- Скоуп логов в Promtail ограничен для снижения шума/стоимости:
  - keep: `vedamatch-*`, `dokploy-traefik`;
  - исключаются прочие `dokploy-*`/чужие контейнеры.
- Promtail имеет EOL (2026-03-02), поэтому следующая обязательная итерация observability: миграция collector-пайплайнов на Grafana Alloy.
- Для быстрого импорта шаблонов типа `FastAPI Observability` добавлен совместимый dashboard:
  - `infra/monitoring/grafana/dashboards/vedamatch-fastapi-template-compatible.json`
  - он использует текущие Vedamatch метрики `http_*` вместо `fastapi_*`;
  - Loki-запросы переведены с `compose_service` на `service` (`vedamatch-*`, `dokploy-traefik`).
