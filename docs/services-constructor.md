# ПЛАН: Универсальный сервис-конструктор «Услуги»

> **Статус:** � В разработке (Phase 3 - Frontend)  
> **Дата создания:** 2026-02-04  
> **Последнее обновление:** 2026-02-04  
> **Тип проекта:** MOBILE + WEB (расширение VedaMatch)  
> **Агент:** project-planner → mobile-developer, backend-specialist

---

## � Progress Tracker

| Phase | Status | Progress |
|-------|--------|----------|
| Phase 1: Models | ✅ Done | 100% |
| Phase 2: Backend API | ✅ Done | 100% |
| Phase 3: Frontend Core | ✅ Done | 100% |
| Phase 4: Provider Flow | ✅ Done | 100% |
| Phase 5: Integration | 🚧 In Progress | 80% |

---

## �📌 Overview

«Сервисы» — универсальная система-конструктор для создания и управления онлайн- и офлайн-услугами. Специалисты любых направлений (астролог, психолог, коуч, духовный наставник, организатор ягий, преподаватель) могут самостоятельно настраивать свой сервис без кастомной разработки.

### Ключевой принцип
> **Конфигурация вместо кастомной разработки**

### Интеграция с VedaMatch
- Новый таб «Сервисы» в портале (`PortalMainScreen.tsx`)
- Общая база пользователей (модель `User`)
- Интеграция с существующими: чатами, картами, S3, push-уведомлениями
- Внутренняя валюта **Лакшми** (кошелёк пользователя)

---

## ✅ Success Criteria

| # | Критерий | Метрика |
|---|----------|---------|
| 1 | Специалист может создать сервис | < 5 минут через UI |
| 2 | Клиент может найти и записаться | < 3 клика до бронирования |
| 3 | Календарь работает | Слоты отображаются, конфликты исключены |
| 4 | Кошелёк Лакшми отображает баланс | Транзакции фиксируются |
| 5 | Push-уведомления о записи | Приходят организатору и клиенту |
| 6 | Интеграция с порталом | Таб "Сервисы" появляется в сетке |

---

## 🛠 Tech Stack

| Компонент | Технология | Обоснование |
|-----------|------------|-------------|
| **Backend** | Go + Fiber | Существующий стек VedaMatch |
| **Database** | PostgreSQL + GORM | Уже настроено, миграции авто |
| **Mobile** | React Native 0.76.5 | Существующий frontend |
| **Storage** | S3 (FirstVDS) | Медиа для сервисов |
| **Notifications** | FCM/Expo Push | Уже интегрировано |
| **Real-time** | WebSocket Hub | Для instant updates |
| **Calendar** | Custom (встроенный) | MVP, позже интеграция с Google/Apple |

---

## 📂 File Structure

### Backend (Go)

```
server/internal/
├── models/
│   ├── service.go              # NEW: Service, ServiceFormat, ServiceSchedule
│   ├── service_booking.go      # NEW: Бронирования
│   ├── service_tariff.go       # NEW: Тарифы
│   ├── wallet.go               # NEW: Кошелёк Лакшми
│   └── wallet_transaction.go   # NEW: Транзакции
├── handlers/
│   ├── service_handler.go      # NEW: CRUD сервисов
│   ├── booking_handler.go      # NEW: Бронирования
│   ├── calendar_handler.go     # NEW: Календарь/слоты
│   └── wallet_handler.go       # NEW: Операции с кошельком
├── services/
│   ├── service_service.go      # NEW: Бизнес-логика сервисов
│   ├── booking_service.go      # NEW: Логика бронирований
│   ├── calendar_service.go     # NEW: Расчёт слотов
│   └── wallet_service.go       # NEW: Транзакции Лакшми
└── database/
    └── seed.go                 # UPDATE: Seed для категорий сервисов
```

### Frontend (React Native)

```
frontend/
├── screens/portal/
│   └── services/               # NEW FOLDER
│       ├── index.ts
│       ├── ServicesHomeScreen.tsx       # Главный список сервисов
│       ├── ServiceDetailScreen.tsx      # Детали сервиса
│       ├── ServiceBookingScreen.tsx     # Бронирование
│       ├── CreateServiceScreen.tsx      # Создание/редактирование
│       ├── MyServicesScreen.tsx         # Мои сервисы (для специалиста)
│       ├── MyBookingsScreen.tsx         # Мои записи (для клиента)
│       └── components/
│           ├── ServiceCard.tsx
│           ├── ServiceCalendar.tsx
│           ├── TariffSelector.tsx
│           ├── FormatBadge.tsx
│           └── BookingConfirmation.tsx
├── screens/wallet/             # NEW FOLDER
│   ├── WalletScreen.tsx               # Баланс Лакшми
│   └── TransactionHistoryScreen.tsx   # История транзакций
├── services/
│   ├── serviceService.ts       # NEW: API для сервисов
│   ├── bookingService.ts       # NEW: API для бронирований
│   └── walletService.ts        # NEW: API для кошелька
└── context/
    └── WalletContext.tsx       # NEW: Контекст кошелька
```

### Обновляемые файлы

```
frontend/screens/portal/PortalMainScreen.tsx  # UPDATE: добавить таб 'services'
server/cmd/api/main.go                         # UPDATE: новые роуты
server/internal/database/database.go           # UPDATE: AutoMigrate новых моделей
```

---

## 📊 Database Schema

### Core Tables

```sql
-- Сервис (услуга)
CREATE TABLE services (
    id SERIAL PRIMARY KEY,
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    deleted_at TIMESTAMP,
    
    -- Владелец (специалист)
    owner_id INTEGER NOT NULL REFERENCES users(id),
    
    -- Основная информация
    title VARCHAR(200) NOT NULL,
    description TEXT,
    cover_image_url VARCHAR(500),
    category VARCHAR(50),         -- 'astrology', 'psychology', 'coaching', etc.
    language VARCHAR(10) DEFAULT 'ru',
    
    -- Формат (множественный выбор как JSON)
    formats TEXT,                 -- ["individual", "group", "subscription"]
    
    -- Время и расписание
    schedule_type VARCHAR(30),    -- 'booking', 'fixed', 'live', 'anytime'
    
    -- Канал проведения
    channel VARCHAR(30),          -- 'video', 'zoom', 'youtube', 'telegram', 'offline', 'file'
    channel_link VARCHAR(500),    -- Zoom ID, Telegram link, etc.
    offline_address VARCHAR(500),
    offline_lat DECIMAL(10,8),
    offline_lng DECIMAL(11,8),
    
    -- Доступ
    access_type VARCHAR(20),      -- 'free', 'paid', 'subscription', 'invite'
    
    -- Статус
    status VARCHAR(20) DEFAULT 'draft',  -- 'draft', 'active', 'paused', 'archived'
    
    -- Статистика
    views_count INTEGER DEFAULT 0,
    bookings_count INTEGER DEFAULT 0,
    rating DECIMAL(2,1) DEFAULT 0,
    reviews_count INTEGER DEFAULT 0,
    
    -- Связь с чатом
    chat_room_id INTEGER REFERENCES rooms(id)
);

-- Тарифы
CREATE TABLE service_tariffs (
    id SERIAL PRIMARY KEY,
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    deleted_at TIMESTAMP,
    
    service_id INTEGER NOT NULL REFERENCES services(id),
    
    name VARCHAR(100) NOT NULL,
    price INTEGER NOT NULL,           -- В Лакшми (игровая валюта)
    currency VARCHAR(10) DEFAULT 'LKS',  -- LKS = Лакшми
    
    duration_minutes INTEGER,         -- Длительность сессии
    sessions_count INTEGER DEFAULT 1, -- Количество сессий
    validity_days INTEGER,            -- Срок действия (для подписок)
    
    includes TEXT,                    -- JSON: что включено
    is_default BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    
    sort_order INTEGER DEFAULT 0
);

-- Расписание (слоты)
CREATE TABLE service_schedules (
    id SERIAL PRIMARY KEY,
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    deleted_at TIMESTAMP,
    
    service_id INTEGER NOT NULL REFERENCES services(id),
    
    -- Для type='weekly': день недели + время
    day_of_week INTEGER,              -- 0=Sun, 1=Mon, ...
    time_start TIME,
    time_end TIME,
    
    -- Для type='specific': конкретные даты
    specific_date DATE,
    
    -- Для групповых: лимит
    max_participants INTEGER DEFAULT 1,
    
    is_active BOOLEAN DEFAULT true
);

-- Бронирования
CREATE TABLE service_bookings (
    id SERIAL PRIMARY KEY,
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    deleted_at TIMESTAMP,
    
    service_id INTEGER NOT NULL REFERENCES services(id),
    tariff_id INTEGER NOT NULL REFERENCES service_tariffs(id),
    client_id INTEGER NOT NULL REFERENCES users(id),
    
    -- Время
    scheduled_at TIMESTAMP NOT NULL,
    duration_minutes INTEGER NOT NULL,
    
    -- Статус
    status VARCHAR(20) DEFAULT 'pending',  -- 'pending', 'confirmed', 'cancelled', 'completed', 'no_show'
    
    -- Связь с оплатой (пока игровая)
    transaction_id INTEGER REFERENCES wallet_transactions(id),
    price_paid INTEGER DEFAULT 0,
    
    -- Заметки
    client_note TEXT,
    provider_note TEXT,
    
    -- Напоминания
    reminder_sent BOOLEAN DEFAULT false,
    reminder_24h_sent BOOLEAN DEFAULT false
);

-- Кошелёк Лакшми
CREATE TABLE wallets (
    id SERIAL PRIMARY KEY,
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    
    user_id INTEGER NOT NULL UNIQUE REFERENCES users(id),
    
    balance INTEGER DEFAULT 1000,     -- Начальный баланс при регистрации
    
    total_earned INTEGER DEFAULT 0,   -- Всего заработано
    total_spent INTEGER DEFAULT 0     -- Всего потрачено
);

-- Транзакции
CREATE TABLE wallet_transactions (
    id SERIAL PRIMARY KEY,
    created_at TIMESTAMP,
    
    wallet_id INTEGER NOT NULL REFERENCES wallets(id),
    
    type VARCHAR(20) NOT NULL,        -- 'credit', 'debit', 'bonus', 'refund'
    amount INTEGER NOT NULL,
    
    description VARCHAR(500),
    
    -- Связь с booking (если есть)
    booking_id INTEGER REFERENCES service_bookings(id),
    
    -- Связь с другим кошельком (для переводов)
    related_wallet_id INTEGER REFERENCES wallets(id),
    
    balance_after INTEGER NOT NULL
);
```

---

## 📋 Task Breakdown

### PHASE 1: Database & Models (Backend)

| ID | Task | Agent | Skills | Priority | Deps | Verify |
|----|------|-------|--------|----------|------|--------|
| 1.1 | ✅ Создать `models/service.go` | backend-specialist | database-design | P0 | - | `go build` success |
| 1.2 | ✅ Создать `models/service_tariff.go` | backend-specialist | database-design | P0 | 1.1 | FK constraints work |
| 1.3 | ✅ Создать `models/service_schedule.go` | backend-specialist | database-design | P0 | 1.1 | FK constraints work |
| 1.4 | ✅ Создать `models/service_booking.go` | backend-specialist | database-design | P0 | 1.2 | FK constraints work |
| 1.5 | ✅ Создать `models/wallet.go` + `wallet_transaction.go` | backend-specialist | database-design | P0 | - | `go build` success |
| 1.6 | ✅ Обновить `database.go` AutoMigrate | backend-specialist | - | P0 | 1.1-1.5 | Migrate runs |
| 1.7 | ✅ Seed категорий и тестового Wallet | backend-specialist | - | P1 | 1.6 | Seed data inserted |

**INPUT:** Спецификация схемы выше  
**OUTPUT:** ✅ Модели GORM, миграции применены  
**VERIFY:** ✅ `go run cmd/api/main.go` → таблицы созданы в PostgreSQL

---

### PHASE 2: Backend Services & Handlers

| ID | Task | Agent | Skills | Priority | Deps | Verify |
|----|------|-------|--------|----------|------|--------|
| 2.1 | ✅ `services/wallet_service.go` | backend-specialist | api-patterns | P0 | 1.5 | Unit tests pass |
| 2.2 | ✅ `handlers/wallet_handler.go` (GET balance, POST transfer) | backend-specialist | api-patterns | P0 | 2.1 | API returns 200 |
| 2.3 | ✅ `services/service_service.go` (CRUD) | backend-specialist | api-patterns | P0 | 1.1 | Unit tests pass |
| 2.4 | ✅ `handlers/service_handler.go` | backend-specialist | api-patterns | P0 | 2.3 | API returns 200 |
| 2.5 | ✅ `services/calendar_service.go` (слоты, конфликты) | backend-specialist | api-patterns | P0 | 1.3 | Slot calculation works |
| 2.6 | ✅ `handlers/calendar_handler.go` | backend-specialist | api-patterns | P0 | 2.5 | GET /slots returns array |
| 2.7 | ✅ `services/booking_service.go` | backend-specialist | api-patterns | P0 | 2.1, 2.5 | Booking created with wallet debit |
| 2.8 | ✅ `handlers/booking_handler.go` | backend-specialist | api-patterns | P0 | 2.7 | POST /book works |
| 2.9 | ✅ Роуты в `main.go` | backend-specialist | api-patterns | P0 | 2.2-2.8 | All routes mounted |

**INPUT:** Модели из Phase 1  
**OUTPUT:** ✅ REST API для сервисов, бронирований, кошелька  
**VERIFY:** ✅ `curl localhost:8081/api/services` → 200 OK

### API Endpoints Summary

```
# Wallet
GET    /api/wallet              # Баланс пользователя
GET    /api/wallet/transactions # История транзакций
POST   /api/wallet/transfer     # Перевод организатору (при бронировании)

# Services
GET    /api/services            # Список сервисов (с фильтрами)
GET    /api/services/:id        # Детали сервиса
POST   /api/services            # Создать сервис (для владельца)
PUT    /api/services/:id        # Обновить сервис
DELETE /api/services/:id        # Удалить (soft)
GET    /api/services/my         # Мои сервисы (как владелец)

# Tariffs
GET    /api/services/:id/tariffs
POST   /api/services/:id/tariffs
PUT    /api/tariffs/:id
DELETE /api/tariffs/:id

# Calendar/Schedule
GET    /api/services/:id/schedule      # Расписание сервиса
POST   /api/services/:id/schedule      # Добавить слот
DELETE /api/schedule/:id               # Удалить слот
GET    /api/services/:id/slots         # Доступные слоты для записи (с датой)

# Bookings
POST   /api/services/:id/book          # Записаться
GET    /api/bookings/my                # Мои записи (как клиент)
GET    /api/bookings/incoming          # Входящие записи (как специалист)
PUT    /api/bookings/:id/confirm       # Подтвердить
PUT    /api/bookings/:id/cancel        # Отменить
PUT    /api/bookings/:id/complete      # Завершить
```

---

### PHASE 3: Frontend - Core Screens (Mobile)

| ID | Task | Agent | Skills | Priority | Deps | Verify |
|----|------|-------|--------|----------|------|--------|
| 3.1 | ✅ `services/serviceService.ts` | mobile-developer | api-patterns | P0 | 2.9 | API calls work |
| 3.2 | ✅ `services/walletService.ts` | mobile-developer | api-patterns | P0 | 2.9 | API calls work |
| 3.3 | ✅ `context/WalletContext.tsx` | mobile-developer | - | P0 | 3.2 | Context provides balance |
| 3.4 | ✅ `screens/wallet/WalletScreen.tsx` | mobile-developer | mobile-design | P1 | 3.3 | Balance visible |
| 3.5 | ✅ Обновить `PortalMainScreen.tsx` — добавить таб 'services' | mobile-developer | - | P0 | - | Tab clickable |
| 3.6 | ✅ `screens/portal/services/ServicesHomeScreen.tsx` | mobile-developer | mobile-design | P0 | 3.1 | List renders |
| 3.7 | ✅ `screens/portal/services/components/ServiceCard.tsx` | mobile-developer | mobile-design | P0 | - | UI component |
| 3.8 | ✅ `screens/portal/services/ServiceDetailScreen.tsx` | mobile-developer | mobile-design | P0 | 3.6 | Details render |
| 3.9 | 🔲 `screens/portal/services/components/ServiceCalendar.tsx` | mobile-developer | mobile-design | P0 | - | Calendar UI |
| 3.10 | 🔲 `screens/portal/services/ServiceBookingScreen.tsx` | mobile-developer | mobile-design | P0 | 3.8, 3.9 | Can select slot + tariff |
| 3.11 | 🔲 Push notification on booking | mobile-developer | - | P1 | 3.10 | Notification arrives |

**INPUT:** Backend API (Phase 2)  
**OUTPUT:** 🚧 Работающие экраны записи  
**VERIFY:** Мобильное приложение → Портал → Сервисы → Детали → Записаться

---

### PHASE 4: Frontend - Provider Flow (Mobile)

| ID | Task | Agent | Skills | Priority | Deps | Verify |
|----|------|-------|--------|----------|------|--------|
| 4.1 | `screens/portal/services/CreateServiceScreen.tsx` | mobile-developer | mobile-design | P0 | 3.1 | Service created |
| 4.2 | `screens/portal/services/components/FormatSelector.tsx` | mobile-developer | mobile-design | P0 | - | Multi-select works |
| 4.3 | `screens/portal/services/components/ScheduleEditor.tsx` | mobile-developer | mobile-design | P0 | - | Can add slots |
| 4.4 | `screens/portal/services/components/TariffEditor.tsx` | mobile-developer | mobile-design | P0 | - | Can add tariffs |
| 4.5 | `screens/portal/services/MyServicesScreen.tsx` | mobile-developer | mobile-design | P0 | 4.1 | List of owned services |
| 4.6 | `screens/portal/services/MyBookingsScreen.tsx` (incoming) | mobile-developer | mobile-design | P0 | 3.10 | Incoming bookings visible |
| 4.7 | Confirm/Cancel/Complete booking actions | mobile-developer | - | P0 | 4.6 | Status changes |

**INPUT:** CreateService API, Booking API  
**OUTPUT:** Полный флоу создания сервиса и управления записями  
**VERIFY:** Специалист создаёт сервис → Клиент записывается → Специалист видит и подтверждает

---

### PHASE 5: Integration & Polish

| ID | Task | Agent | Skills | Priority | Deps | Verify |
|----|------|-------|--------|----------|------|--------|
| 5.1 | Chat room auto-create при подтверждении booking | backend-specialist | - | P1 | 4.7 | Room created |
| 5.2 | Push reminder за 24h и за 1h | backend-specialist | - | P1 | 4.7 | Push arrives |
| 5.3 | Map integration — показать offline-сервисы на карте | mobile-developer | - | P2 | 3.6 | Markers visible |
| 5.4 | S3 upload для cover_image_url | mobile-developer | - | P0 | 4.1 | Image uploads |
| 5.5 | Wallet initial seed при регистрации (1000 Лакшми) | backend-specialist | - | P0 | 2.1 | New user has wallet |
| 5.6 | Reviews & ratings | backend-specialist, mobile-developer | - | P2 | 4.7 | TBD |

---

## PHASE X: Verification Checklist

### Pre-Completion Checks

- [x] **Go Build:** `cd server && go build ./...`
- [ ] **Lint & TypeScript:** `cd frontend && npm run lint && npx tsc --noEmit`
- [ ] **Security Scan:** `python .agent/skills/vulnerability-scanner/scripts/security_scan.py .`
- [ ] **API Tests:** Manual testing of all endpoints via curl/Postman
- [ ] **E2E Flow:** Create service → Book → Confirm → Complete

### Final Verification

- [x] Портал показывает таб "Сервисы"
- [ ] Пользователь может создать сервис с тарифами и расписанием
- [ ] Клиент может записаться и оплатить Лакшми
- [ ] Специалист получает push и видит booking
- [ ] Транзакция записывается в wallet_transactions
- [ ] После завершения баланс специалиста увеличивается

---

## 🚀 Estimated Timeline

| Phase | Duration | Cumulative |
|-------|----------|------------|
| Phase 1: Models | ~1 день | 1 день |
| Phase 2: Backend API | ~2 дня | 3 дня |
| Phase 3: Core Screens | ~2 дня | 5 дней |
| Phase 4: Provider Flow | ~2 дня | 7 дней |
| Phase 5: Integration | ~1-2 дня | 8-9 дней |
| Phase X: Testing | ~1 день | 9-10 дней |

**Total MVP:** ~10 рабочих дней

---

## 📝 Notes & Decisions

1. **Валюта Лакшми** — игровая на этапе MVP, не требует интеграции с платёжными системами
2. **Ручной перевод** — организатор самостоятельно связывается с клиентом для фактической оплаты
3. **Календарь** — свой встроенный, синхронизация с Google/Apple запланирована на будущее
4. **Без контента/записей** — функционал архива отложен на следующую итерацию
5. **Категории сервисов:**
   - `astrology` — Астрология
   - `psychology` — Психология
   - `coaching` — Коучинг
   - `spirituality` — Духовные практики
   - `yagya` — Ягьи и ритуалы
   - `education` — Обучение
   - `health` — Здоровье/Аюрведа
   - `other` — Другое

---

## 🔗 Dependencies

| Компонент | Зависимость | Статус |
|-----------|-------------|--------|
| Push Notifications | `PushToken` в User | ✅ Есть |
| S3 Upload | `s3_service.go` | ✅ Есть |
| WebSocket | Hub в `main.go` | ✅ Есть |
| Room (Chat) | `models/room.go` | ✅ Есть |
| Карты | MapGeoapify screen | ✅ Есть |

---

## ✅ PLAN STATUS

**[OK] Plan created:** `services-constructor.md`

---

## Next Steps

1. 📖 Review this plan
2. 🚀 Run `/create` or ask me to start **Phase 1**
3. ✏️ Or modify plan manually if needed

---

*Generated by project-planner agent*
