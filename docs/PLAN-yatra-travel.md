# PLAN-yatra-travel: Сервис Духовных Путешествий "Yatra Seva"

> **Статус:** DRAFT
> **Приоритет:** High
> **Цель:** Создать платформу для организации паломничеств, поиска жилья и координации групп. Community-driven подход (без процессинга платежей на старте).

## 1. Концепция и Архитектура

### Философия
Сервис, где преданные помогают друг другу в духовных путешествиях.
- **Yatra (Тур):** Событие с датами, маршрутом и организатором.
- **Shelter (Жилье):** Место для ночлега (от ашрама до комнаты), предлагаемое хостами.
- **Sanga (Группа):** Закрытое пространство общения участников конкретного тура.

### Роли
1.  **Pilgrim (Пользователь):** Ищет туры/жилье, подает заявки, пишет отзывы.
2.  **Organizer (Лидер группы):** Создает туры, модерирует заявки, управляет групповым чатом, строит маршрут.
3.  **Host (Владелец жилья):** Публикует объявления о ночлеге, отвечает на запросы.

---

## 2. База Данных (Schema Design)

Новые таблицы в PostgreSQL.

### 2.1 Tours (Ятры)
- `Theme` (Vrindavan, Mayapur, Jagannath Puri, etc.)
- `OrganizerID` (FK User)
- `StartDate`, `EndDate`
- `Description`, `Requirements`, `CostEstimate` (инфо поле)
- `MaxParticipants`
- `Status` (Planning, Active, Completed)
- `RoutePoints` (JSONB: массив координат и описаний точек)

### 2.2 TourParticipants (Участники)
- `TourID`, `UserID`
- `Status` (Pending, Approved, Rejected)
- `Role` (Member, Assistant)

### 2.3 Shelters (Жилье)
- `HostID` (FK User)
- `Type` (Ashram, GuestHouse, HomeStay, Room)
- `Location` (City, Geo Coordinates)
- `Amenities` (JSONB: AC, Wifi, Prasadam, NearTemple)
- `Photos` (Array of URLs)
- `PricePerNight` (инфо поле)
- `Capacity`

### 2.4 ShelterReviews (Отзывы)
- `ShelterID`, `AuthorID`
- `Rating` (1-5)
- `Comment`
- `Photos`

### 2.5 Integration
- **Chat:** Создание `Room` (существующая модель) автоматически при создании Тура. Доступ только у `Approved` участников.
- **Map:** Использование существующего MapService для геокодинга и отображения.

---

## 3. API Endpoints (Backend)

### Yatra Management
- `POST /api/yatra` - Создать тур (с маршрутом).
- `GET /api/yatra` - Поиск туров (фильтры: даты, место).
- `GET /api/yatra/:id` - Детали + публичные точки маршрута.
- `POST /api/yatra/:id/join` - Подать заявку.
- `POST /api/yatra/:id/approve` - (Admin) Одобрить участника.

### Shelter Management
- `POST /api/shelter` - Добавить жилье.
- `GET /api/shelter` - Поиск на карте/списком.
- `POST /api/shelter/:id/review` - Оставить отзыв.

### Group Features
- `GET /api/yatra/:id/chat` - Получить ID чат-комнаты группы.
- `POST /api/yatra/:id/broadcast` - (Admin) Важное объявление (Push notification) всем участникам.

---

## 4. Frontend (Mobile App)

Новый раздел "Travel" (Иконка чемодана/глобуса) в PortalDrawer.

### Экраны
1.  **YatraHome:**
    - Табы: "Найти Тур", "Найти Жилье", "Мои Ятры".
    - Карта с пинами (Тур - один цвет, Жилье - другой).
2.  **CreateYatraScreen:**
    - Форма создания.
    - **RouteBuilder:** Инструмент добавления точек на карту (Start, End, Waypoints).
3.  **YatraDetailScreen:**
    - Информация, Кнопка "Join".
    - Таб "Маршрут" (карта).
    - Таб "Участники" (для админа/мемберов).
    - Кнопка "Войти в Чат" (если одобрен).
4.  **ShelterDetailScreen:**
    - Фото галерея (карусель).
    - Удобства.
    - Отзывы.
    - Кнопка "Связаться с Хостом" (открывает личный чат).
5.  **MyTripsScreen:**
    - Активные и прошлые поездки.

---

## 5. План Реализации (Phases)

### Phase 1: Backend Core & Models ✅ COMPLETED
- [x] Создать модели GORM (`Yatra`, `YatraParticipant`, `Shelter`, `ShelterReview`).
- [x] Написать миграции.
- [x] Реализовать `YatraService` и `ShelterService`.
- [x] API Handlers + Routing.

### Phase 2: Frontend Basic Screens & Navigation (Completed ✅)
- [x] Create Types & Interfaces (`frontend/types/yatra.ts`)
- [x] Create YatraService (`frontend/services/yatraService.ts`)
- [x] Create Screens:
  - [x] `TravelHomeScreen`: Tabs for Yatras/Shelters, Search.
  - [x] `YatraDetailScreen`: Info, Route, Join button.
  - [x] `ShelterDetailScreen`: Info, Reviews, Contact buttons.
  - [x] `CreateYatraScreen`, `CreateShelterScreen` (Basic Skeletons).
- [x] Setup Navigation (`App.tsx`, `PortalMainScreen`).
- [x] Integrate with Portal (Icon, Menu).

### Phase 3: Organizer Tools & UGC ✅ COMPLETED
- [x] **Create Yatra Form**:
  - [x] Multi-step form (Basic Info, Route, Logistics).
  - [x] Image upload (Unsplash or simple Picker).
  - [x] Edit functionality.
- [x] **Create Shelter Form**:
  - [x] Accommodation details, amenities, seva options.
  - [x] Image upload.
- [x] **Organizer Dashboard**:
  - [x] Manage participants (Approve/Reject requests). (Integrated into Yatra Detail)
- [x] **TypeScript Fixes**: 
  - [x] Fixed navigation imports (native-stack instead of stack).
  - [x] Fixed FlatList type safety with generic components.
- [ ] **Group Chats**:
  - [ ] Auto-create chat for Yatra members. (Backend dependent, link added in frontend)

### Phase 4: Polish & Integration ✅ COMPLETED
- [x] **Отзывы и рейтинги**:
  - [x] Types: `YatraReview`, `YatraReviewCreateData` in `yatra.ts`.
  - [x] API Methods: `getYatraReviews`, `createYatraReview`, `getOrganizerStats` in `yatraService.ts`.
  - [x] `YatraReviewsSection` component (modal with ratings).
  - [x] Integration into `YatraDetailScreen`.
  - [x] Shelter reviews (already existed in `ShelterDetailScreen`).
- [x] **Интеграция с профилем пользователя (бейджи "Организатор")**:
  - [x] `OrganizerBadge` component with tier system (Новичок → Мастер Ятры).
  - [x] Badge displayed in organizer section of `YatraDetailScreen`.
  - [x] Badge displayed on `ContactProfileScreen` (full variant).
- [x] **Оффлайн кэширование данных**:
  - [x] `yatraCacheService.ts` with AsyncStorage backend.
  - [x] Cache expiration: 15min (lists), 1h (details), 5min (user data).
  - [x] Integrated into `getYatras`, `getYatra`, `getShelters`, `getShelter`.
  - [x] Automatic fallback to cache on network errors.
  - [x] Invalidation methods for updates.

---

## 6. Агентские задачи
- **@backend-specialist:** Создание моделей БД и API.
- **@frontend-specialist:** UI экранов, работа с картой, формы.
- **@mobile-developer:** Интеграция геолокации, оптимизация списков.
