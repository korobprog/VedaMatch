# IOS Changes For Migration

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

```ts
...(shouldRenderIconShadow ? {
  shadowColor: portalIconStyle === 'vedamatch' ? '#D4AF37' : service.color,
  shadowOpacity: portalIconStyle === 'vedamatch' ? 0.5 : 0.35,
  shadowRadius: portalIconStyle === 'vedamatch' ? 10 : 8,
  shadowOffset: { width: 0, height: 2 },
  elevation: 6,
} : {}),
```
