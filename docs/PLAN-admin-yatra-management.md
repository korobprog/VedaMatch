# План: Админ-панель управления турами (Yatra Travel Management)

**Дата создания:** 2026-02-03  
**Статус:** Planning  
**Приоритет:** High  
**Агенты:** @[backend-specialist], @[frontend-specialist], @[orchestrator]

---

## 📋 PHASE -1: CONTEXT CHECK

### Текущее состояние проекта
- ✅ Backend API для Yatra создан (`/api/yatra`, `/api/shelter`)
- ✅ Frontend для пользователей (создание, просмотр, участие)
- ✅ Базовая админ-панель существует (`admin/` Next.js)
- ✅ Система ролей (`user`, `admin` в БД)
- ⚠️ Нет админских эндпоинтов для управления турами
- ⚠️ Нет UI в админке для модерации туров
- ⚠️ Нет системы жалоб (Reports)

### Технологический стек
- **Backend:** Go (Fiber), PostgreSQL, GORM
- **Admin Frontend:** Next.js 14, TypeScript, Tailwind CSS
- **Существующие паттерны:**
  - Admin endpoints: `/api/admin/*` (защищены middleware)
  - Admin pages: `admin/src/app/*`
  - Компоненты: `admin/src/components/*`

---

## 📊 PHASE 0: REQUIREMENTS ANALYSIS

### Функциональные требования

#### 1. **Роли и доступ**
- Только **Super Admin** (`role = 'admin'`)
- Полный контроль над всеми турами и организаторами

#### 2. **Модерация туров**
| Функция | Описание | Приоритет |
|---------|----------|-----------|
| Просмотр всех туров | Включая draft, cancelled, completed | P0 |
| Одобрение/отклонение | Модерация перед публикацией | P0 |
| Редактирование тура | Исправление ошибок админом | P0 |
| Принудительная отмена | Отмена тура по жалобам | P1 |
| Блокировка организатора | Запрет создания новых туров | P1 |
| Статистика | Количество, тренды, географ | P2 |

#### 3. **Управление участниками**
- Просмотр всех участников тура (pending, approved, rejected)
- Удаление участника админом (как и организатор)
- История действий (кто удалил, почему)

#### 4. **Система жалоб**
```typescript
interface YatraReport {
  id: number;
  reporterUserId: number; // Кто пожаловался
  targetType: 'yatra' | 'organizer'; // На тур или организатора
  targetId: number;
  reason: string; // 'inappropriate', 'scam', 'cancelled_last_minute', etc.
  description: string;
  status: 'pending' | 'reviewing' | 'resolved' | 'dismissed';
  adminNotes: string; // Ответ админа
  createdAt: Date;
  resolvedAt?: Date;
  resolvedBy?: number; // Admin user ID
}
```

**Workflow:**
1. Пользователь жалуется → `status = 'pending'`
2. Админ видит в списке → `status = 'reviewing'`
3. Админ пишет ответ → отправляется репортеру
4. Админ закрывает → `status = 'resolved' | 'dismissed'`

#### 5. **Аналитика**
- **Dashboard виджеты:**
  - Топ-5 организаторов (по количеству туров)
  - Средний рейтинг организаторов
  - Карта популярных направлений (heat map)
  - Тренды по темам (гистограмма: Vrindavan, Mayapur...)
  - Общая статистика (всего туров, активных, завершенных)

#### 6. **Уведомления админу**
```typescript
interface AdminNotification {
  type: 'new_yatra' | 'yatra_report' | 'yatra_cancelled_soon';
  message: string;
  linkTo: string; // URL для перехода
  createdAt: Date;
  read: boolean;
}
```

**Триггеры:**
- Новый тур создан (если включена премодерация)
- Жалоба на тур/организатора
- Тур отменен менее чем за 7 дней до старта

#### 7. **Коммуникация**
- Массовая рассылка всем организаторам (email/push)
- Шаблоны для модерации:
  - "Тур одобрен"
  - "Тур отклонен (причина: ...)"
  - "Требуются изменения"

#### 8. **Задел на бизнес-версию**
```typescript
// Future: Organizer Subscription
interface OrganizerPlan {
  userId: number;
  plan: 'free' | 'business' | 'enterprise';
  maxYatras: number; // free=3, business=unlimited
  features: string[]; // ['verified_badge', 'priority_support', 'custom_branding']
  validUntil?: Date;
}
```
*Пока комментарии в коде, без реализации*

---

## 🏗️ PHASE 1: ARCHITECTURE PLANNING

### 1.1 Database Schema (Новые таблицы)

```sql
-- Жалобы на туры/организаторов
CREATE TABLE yatra_reports (
  id SERIAL PRIMARY KEY,
  reporter_user_id INT NOT NULL REFERENCES users(id),
  target_type VARCHAR(20) NOT NULL, -- 'yatra' or 'organizer'
  target_id INT NOT NULL,
  reason VARCHAR(50) NOT NULL,
  description TEXT,
  status VARCHAR(20) DEFAULT 'pending',
  admin_notes TEXT,
  resolved_by INT REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  resolved_at TIMESTAMP,
  deleted_at TIMESTAMP
);

-- Уведомления админам
CREATE TABLE admin_notifications (
  id SERIAL PRIMARY KEY,
  type VARCHAR(50) NOT NULL,
  message TEXT NOT NULL,
  link_to VARCHAR(500),
  created_at TIMESTAMP DEFAULT NOW(),
  read BOOLEAN DEFAULT false
);

-- Блокировка организаторов
CREATE TABLE organizer_blocks (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id),
  blocked_by INT NOT NULL REFERENCES users(id),
  reason TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP, -- NULL = permanent
  deleted_at TIMESTAMP
);

-- Email шаблоны для модерации
CREATE TABLE moderation_templates (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  subject VARCHAR(200),
  body TEXT NOT NULL,
  type VARCHAR(50), -- 'yatra_approved', 'yatra_rejected', etc.
  created_at TIMESTAMP DEFAULT NOW()
);
```

### 1.2 Backend API Endpoints

#### Admin Yatra Management
```
GET    /api/admin/yatra                    # Все туры (с фильтрами)
GET    /api/admin/yatra/stats               # Статистика
GET    /api/admin/yatra/:id                 # Детали тура
PUT    /api/admin/yatra/:id                 # Редактировать тур
DELETE /api/admin/yatra/:id                 # Удалить тур
POST   /api/admin/yatra/:id/approve         # Одобрить
POST   /api/admin/yatra/:id/reject          # Отклонить (с причиной)
POST   /api/admin/yatra/:id/cancel          # Принудительная отмена
GET    /api/admin/yatra/:id/participants    # Все участники
DELETE /api/admin/yatra/:id/participants/:participantId # Удалить участника

# Организаторы
GET    /api/admin/organizers                # Список организаторов
GET    /api/admin/organizers/:id/stats      # Статистика организатора
POST   /api/admin/organizers/:id/block      # Блокировать
DELETE /api/admin/organizers/:id/block      # Разблокировать

# Жалобы
GET    /api/admin/yatra-reports             # Все жалобы
GET    /api/admin/yatra-reports/:id         # Детали жалобы
PUT    /api/admin/yatra-reports/:id         # Обновить статус/ответ
POST   /api/admin/yatra-reports/:id/resolve # Разрешить жалобу
POST   /api/admin/yatra-reports/:id/dismiss # Отклонить жалобу

# Аналитика
GET    /api/admin/yatra/analytics/top-organizers
GET    /api/admin/yatra/analytics/geography
GET    /api/admin/yatra/analytics/themes
GET    /api/admin/yatra/analytics/trends    # По времени

# Уведомления
GET    /api/admin/notifications              # Список
POST   /api/admin/notifications/:id/read     # Пометить прочитанным

# Коммуникация
GET    /api/admin/templates                  # Email шаблоны
POST   /api/admin/templates                  # Создать шаблон
POST   /api/admin/yatra/broadcast            # Массовая рассылка организаторам
```

#### Public API (для жалоб)
```
POST   /api/yatra/:id/report                 # Пожаловаться на тур
POST   /api/organizer/:id/report             # Пожаловаться на организатора
```

### 1.3 Frontend Structure (Admin Panel)

```
admin/src/app/
├── yatra/                          # Управление турами
│   ├── page.tsx                    # Список всех туров
│   ├── [id]/
│   │   ├── page.tsx                # Детали тура
│   │   └── participants/page.tsx   # Управление участниками
│   ├── reports/
│   │   ├── page.tsx                # Список жалоб
│   │   └── [id]/page.tsx           # Детали жалобы
│   └── analytics/
│       └── page.tsx                # Аналитика и статистика
├── organizers/
│   ├── page.tsx                    # Список организаторов
│   └── [id]/page.tsx               # Профиль организатора

admin/src/components/yatra/
├── YatraTable.tsx                  # Таблица туров (DataGrid)
├── YatraStatusBadge.tsx            # Бейджи статуса
├── YatraApprovalModal.tsx          # Модалка одобрения/отклонения
├── ParticipantsTable.tsx           # Таблица участников
├── ReportCard.tsx                  # Карточка жалобы
├── ReportResolutionForm.tsx        # Форма ответа на жалобу
├── OrganizerStatsCard.tsx          # Статистика организатора
├── AnalyticsDashboard.tsx          # Dashboard с графиками
├── GeographyHeatMap.tsx            # Карта популярных направлений
└── BroadcastEmailForm.tsx          # Форма массовой рассылки
```

---

## 📝 PHASE 2: TASK BREAKDOWN

### Sprint 1: Backend Foundation (Приоритет P0)

#### Task 1.1: Database Models & Migrations
**Agent:** @[backend-specialist]  
**Файлы:**
- `server/internal/models/yatra_report.go` (новый)
- `server/internal/models/organizer_block.go` (новый)
- `server/internal/models/admin_notification.go` (новый)
- `server/internal/database/migrations/` (auto-migration)

**Acceptance Criteria:**
- [ ] Все таблицы созданы
- [ ] Foreign keys работают
- [ ] Индексы на `status`, `created_at`, `target_id`

---

#### Task 1.2: Yatra Admin Service
**Agent:** @[backend-specialist]  
**Файлы:**
- `server/internal/services/yatra_admin_service.go` (новый)

**Методы:**
```go
func (s *YatraAdminService) GetAllYatras(filters AdminYatraFilters) ([]Yatra, int64, error)
func (s *YatraAdminService) GetYatraStats() (*YatraStats, error)
func (s *YatraAdminService) ApproveYatra(yatraID, adminID uint, notes string) error
func (s *YatraAdminService) RejectYatra(yatraID, adminID uint, reason string) error
func (s *YatraAdminService) ForceCancel(yatraID, adminID uint, reason string) error
func (s *YatraAdminService) UpdateYatra(yatraID, adminID uint, updates map[string]interface{}) error
func (s *YatraAdminService) RemoveParticipant(yatraID, participantID, adminID uint, reason string) error
```

---

#### Task 1.3: Report Service
**Agent:** @[backend-specialist]  
**Файлы:**
- `server/internal/services/yatra_report_service.go` (новый)

**Методы:**
```go
func (s *ReportService) CreateReport(userID uint, req ReportCreateRequest) (*YatraReport, error)
func (s *ReportService) GetAllReports(filters ReportFilters) ([]YatraReport, int64, error)
func (s *ReportService) GetReport(reportID uint) (*YatraReport, error)
func (s *ReportService) ResolveReport(reportID, adminID uint, notes string) error
func (s *ReportService) DismissReport(reportID, adminID uint, reason string) error
```

---

#### Task 1.4: Organizer Admin Service
**Agent:** @[backend-specialist]  
**Файлы:**
- `server/internal/services/organizer_admin_service.go` (новый)

**Методы:**
```go
func (s *OrganizerAdminService) GetOrganizers(filters OrganizerFilters) ([]User, int64, error)
func (s *OrganizerAdminService) GetOrganizerStats(userID uint) (*OrganizerDetailedStats, error)
func (s *OrganizerAdminService) BlockOrganizer(userID, adminID uint, reason string, duration *time.Duration) error
func (s *OrganizerAdminService) UnblockOrganizer(userID, adminID uint) error
func (s *OrganizerAdminService) IsBlocked(userID uint) (bool, error)
```

---

#### Task 1.5: Admin API Handlers
**Agent:** @[backend-specialist]  
**Файлы:**
- `server/internal/handlers/yatra_admin_handler.go` (новый)

**Endpoints (см. 1.2):**
- Все `/api/admin/yatra/*` эндпоинты
- Middleware: `AdminProtected()` (уже есть)

---

#### Task 1.6: Analytics Service
**Agent:** @[backend-specialist]  
**Файлы:**
- `server/internal/services/yatra_analytics_service.go` (новый)

**Методы:**
```go
func (s *AnalyticsService) GetTopOrganizers(limit int) ([]OrganizerRanking, error)
func (s *AnalyticsService) GetGeographyData() ([]GeographyPoint, error)
func (s *AnalyticsService) GetThemeTrends() (map[YatraTheme]int, error)
func (s *AnalyticsService) GetTimeTrends(period string) ([]TrendPoint, error)
```

---

### Sprint 2: Admin Frontend (Приоритет P0-P1)

#### Task 2.1: Yatra Management Page
**Agent:** @[frontend-specialist]  
**Файлы:**
- `admin/src/app/yatra/page.tsx`
- `admin/src/components/yatra/YatraTable.tsx`
- `admin/src/components/yatra/YatraStatusBadge.tsx`
- `admin/src/components/yatra/YatraApprovalModal.tsx`

**UI:**
- DataGrid/Table с фильтрами (статус, тема, организатор, даты)
- Поиск по названию/описанию
- Действия: View, Edit, Approve, Reject, Cancel
- Pagination

**Acceptance Criteria:**
- [ ] Отображает все туры с пагинацией
- [ ] Фильтры работают
- [ ] Модалка одобрения/отклонения
- [ ] Статусы обновляются в реальном времени

---

#### Task 2.2: Yatra Detail & Participants
**Agent:** @[frontend-specialist]  
**Файлы:**
- `admin/src/app/yatra/[id]/page.tsx`
- `admin/src/app/yatra/[id]/participants/page.tsx`
- `admin/src/components/yatra/ParticipantsTable.tsx`

**UI:**
- Полная информация о туре (как пользовательская, но с админ-кнопками)
- Редактирование inline
- Табы: Details / Participants / Reviews / History
- Таблица участников с действиями (Remove, Change Status)

---

#### Task 2.3: Reports Management
**Agent:** @[frontend-specialist]  
**Файлы:**
- `admin/src/app/yatra/reports/page.tsx`
- `admin/src/app/yatra/reports/[id]/page.tsx`
- `admin/src/components/yatra/ReportCard.tsx`
- `admin/src/components/yatra/ReportResolutionForm.tsx`

**UI:**
- Список жалоб с фильтрами (pending, resolved, dismissed)
- Цветовые индикаторы важности
- Форма ответа репортеру
- История действий по жалобе

---

#### Task 2.4: Organizer Management
**Agent:** @[frontend-specialist]  
**Файлы:**
- `admin/src/app/organizers/page.tsx`
- `admin/src/app/organizers/[id]/page.tsx`
- `admin/src/components/yatra/OrganizerStatsCard.tsx`

**UI:**
- Список организаторов с рейтингами
- Фильтры (blocked, active, top-rated)
- Профиль организатора: статистика, туры, жалобы
- Кнопка Block/Unblock с модалкой (причина, срок)

---

#### Task 2.5: Analytics Dashboard
**Agent:** @[frontend-specialist]  
**Файлы:**
- `admin/src/app/yatra/analytics/page.tsx`
- `admin/src/components/yatra/AnalyticsDashboard.tsx`
- `admin/src/components/yatra/GeographyHeatMap.tsx`

**UI:**
- Виджеты:
  - Топ организаторов (таблица с аватарами)
  - Карта heat map (использовать `react-leaflet` или `mapbox-gl`)
  - График тем (bar chart)
  - Временные тренды (line chart)
- Использовать `recharts` или `chart.js`

---

#### Task 2.6: Notifications & Communication
**Agent:** @[frontend-specialist]  
**Файлы:**
- `admin/src/components/yatra/BroadcastEmailForm.tsx`
- `admin/src/components/layout/AdminNotificationBell.tsx` (обновить существующий)

**UI:**
- Иконка-колокольчик с счетчиком непрочитанных
- Выпадающий список уведомлений
- Форма массовой рассылки (кому: все организаторы/топ/заблокированные)
- Шаблоны для быстрого заполнения

---

### Sprint 3: Integration & Polish (Приоритет P1-P2)

#### Task 3.1: User-side Report Button
**Agent:** @[frontend-specialist]  
**Файлы:**
- `frontend/screens/portal/travel/YatraDetailScreen.tsx` (обновить)
- `frontend/components/travel/ReportYatraModal.tsx` (новый)

**UI:**
- Кнопка "⚠️ Пожаловаться" в header YatraDetailScreen
- Модалка с выбором причины + текстовое поле
- Toast уведомление об отправке

---

#### Task 3.2: Email Templates System
**Agent:** @[backend-specialist]  
**Файлы:**
- `server/internal/services/email_template_service.go` (новый)
- `server/internal/handlers/email_template_handler.go` (новый)

**Функции:**
- CRUD для шаблонов
- Переменные в шаблонах: `{{organizerName}}`, `{{yatraTitle}}`, `{{rejectionReason}}`
- Рендеринг шаблона перед отправкой

---

#### Task 3.3: Automated Notifications
**Agent:** @[backend-specialist]  
**Файлы:**
- `server/internal/services/admin_notification_service.go` (новый)

**Триггеры:**
- При создании тура → уведомление админам
- При создании жалобы → уведомление админам
- При отмене тура (check: `startDate - now < 7 days`)

---

#### Task 3.4: Business Plan Stub
**Agent:** @[backend-specialist]  
**Файлы:**
- `server/internal/models/organizer_plan.go` (новый, закомментировано)
- `server/internal/services/organizer_plan_service.go` (новый, закомментировано)

**TODO comments:**
```go
// TODO: Implement when monetization is enabled
// - Plan subscription logic
// - Payment integration (Stripe/PayPal)
// - Feature gates (max yatras, verified badge)
```

---

## ✅ PHASE 3: VERIFICATION CHECKLIST

### Backend Tests
- [ ] Unit tests для всех сервисов
- [ ] Integration tests для API endpoints
- [ ] Проверка прав доступа (только admin)
- [ ] Проверка валидации входных данных

### Frontend Tests
- [ ] Компоненты рендерятся без ошибок
- [ ] Фильтры работают корректно
- [ ] Модалки открываются/закрываются
- [ ] API запросы обрабатывают ошибки

### Manual Testing
- [ ] Админ может просмотреть все туры
- [ ] Одобрение/отклонение меняет статус
- [ ] Блокировка организатора работает
- [ ] Жалобы отображаются и резолвятся
- [ ] Аналитика показывает актуальные данные
- [ ] Уведомления приходят при триггерах
- [ ] Массовая рассылка отправляется

### Performance
- [ ] Список туров загружается < 1s (с пагинацией)
- [ ] Аналитика считается < 2s
- [ ] Индексы на БД созданы

### Design Review
- [ ] UI соответствует дизайн-системе админки
- [ ] Цветовая схема консистентна
- [ ] Responsive (desktop only, но корректно)

---

## 🚀 PHASE 4: DEPLOYMENT PLAN

### Pre-deployment
1. **Database migration:**
   ```bash
   # На production сервере
   cd server
   go run cmd/api/main.go # auto-migration запустится
   ```

2. **Seed default templates:**
   ```sql
   INSERT INTO moderation_templates (name, subject, body, type) VALUES
   ('Yatra Approved', 'Your tour has been approved!', 'Congratulations! Your tour "{{yatraTitle}}" is now live.', 'yatra_approved'),
   ('Yatra Rejected', 'Tour requires changes', 'Unfortunately, your tour "{{yatraTitle}}" was not approved. Reason: {{reason}}', 'yatra_rejected');
   ```

### Deployment Steps
1. Deploy backend (Go server)
2. Deploy admin frontend (Next.js)
3. Verify admin can access `/yatra` page
4. Test critical flows (approve, reject, block)

### Rollback Plan
- Database: migrations are additive (new tables), safe to rollback code
- API: versioned endpoints (can keep old `/api/yatra` working)

---

## 📊 SUCCESS METRICS

| Metric | Target |
|--------|--------|
| Admin response time to reports | < 24h |
| Tours requiring moderation | < 10% rejected |
| Organizer recidivism rate | < 5% |
| Analytics dashboard load time | < 2s |

---

## 🔮 FUTURE ENHANCEMENTS (Post-MVP)

1. **Business Plan Implementation**
   - Stripe integration
   - Subscription management
   - Feature gating

2. **Advanced Analytics**
   - Predictive analytics (какие туры популярны)
   - A/B testing для модерации (approval rates)

3. **Mobile Admin App**
   - React Native для модераторов в пути
   - Push notifications для urgent reports

4. **AI Moderation**
   - Auto-detect inappropriate content
   - Suggest rejection reasons
   - Flag suspicious organizers

---

## 📎 APPENDIX

### Related Files
- Existing Yatra API: `server/internal/handlers/yatra_handler.go`
- Existing Yatra Service: `server/internal/services/yatra_service.go`
- Existing Admin Middleware: `server/internal/middleware/admin.go`
- Admin Layout: `admin/src/components/layout/Sidebar.tsx` (add Yatra menu item)

### Dependencies
```json
// admin/package.json
{
  "dependencies": {
    "recharts": "^2.10.0",         // Графики
    "react-leaflet": "^4.2.0",     // Карты
    "leaflet": "^1.9.0",
    "react-hot-toast": "^2.4.1",   // Уведомления (уже есть?)
    "date-fns": "^3.0.0"           // Форматирование дат
  }
}
```

---

**Общее время выполнения:** ~3-4 недели (1 разработчик full-time)  
**Sprint 1:** 1.5 недели ✅ **ЗАВЕРШЕНО**  
**Sprint 2:** 1.5 недели 🟡 **40% ВЫПОЛНЕНО**  
**Sprint 3:** 1 неделя ⏳ **НЕ НАЧАТО**

---

## 📋 SPRINT 2: DETAILED TODO (Remaining 60%)

### ✅ Завершено (40%):

**Pages Created:**
- [x] `/admin/src/app/yatra/page.tsx` - Main yatra management
- [x] `/admin/src/app/yatra/reports/page.tsx` - Reports listing

**Components Created:**
- [x] `YatraTable.tsx` - Table with filters and actions
- [x] `YatraStats.tsx` - Statistics dashboard
- [x] `YatraStatusBadge.tsx` - Status badges
- [x] `YatraApprovalModal.tsx` - Approve/reject/cancel modal

### 🔨 TODO (60%):

#### 1. Yatra Detail Page & Participants Management (P0)
**Files to create:**
- [ ] `/admin/src/app/yatra/[id]/page.tsx` - Main yatra detail page
- [ ] `/admin/src/app/yatra/[id]/participants/page.tsx` - Participants table
- [ ] `/admin/src/components/yatra/ParticipantsTable.tsx` - Participants management table
- [ ] `/admin/src/components/yatra/YatraDetailCard.tsx` - Yatra info display
- [ ] `/admin/src/components/yatra/YatraEditForm.tsx` - Inline edit form

**Features:**
- View full yatra details (dates, route, description, etc.)
- Edit yatra fields inline (admin override)
- View all participants (pending, approved, rejected)
- Remove participants with reason
- Approve/reject pending participants
- View participant profiles

#### 2. Report Detail Page with Resolution (P0)
**Files to create:**
- [ ] `/admin/src/app/yatra/reports/[id]/page.tsx` - Report detail and resolution
- [ ] `/admin/src/components/yatra/ReportCard.tsx` - Report info card
- [ ] `/admin/src/components/yatra/ReportResolutionForm.tsx` - Response form
- [ ] `/admin/src/components/yatra/ReportHistory.tsx` - Timeline of actions

**Features:**
- View full report details (target, reason, description)
- View reporter profile
- View target (yatra or organizer)
- Change report status (pending → reviewing → resolved/dismissed)
- Write admin notes/response to reporter
- Send notification to reporter (TODO comment)

#### 3. Organizer Management (P0)
**Files to create:**
- [ ] `/admin/src/app/organizers/page.tsx` - Organizers list
- [ ] `/admin/src/app/organizers/[id]/page.tsx` - Organizer profile & stats
- [ ] `/admin/src/components/yatra/OrganizerTable.tsx` - Organizers table
- [ ] `/admin/src/components/yatra/OrganizerStatsCard.tsx` - Stats display
- [ ] `/admin/src/components/yatra/BlockOrganizerModal.tsx` - Block/unblock modal

**Features:**
- List all organizers with stats (tours, ratings, participants)
- Filter: blocked only, top rated, min tours
- View organizer profile (all yatras, reviews, reports)
- Block organizer (temporary or permanent)
- Unblock organizer
- View detailed stats (total/active/completed/cancelled yatras)
- View reports against organizer

#### 4. Analytics Dashboard (P1)
**Files to create:**
- [ ] `/admin/src/app/yatra/analytics/page.tsx` - Analytics dashboard
- [ ] `/admin/src/components/yatra/AnalyticsDashboard.tsx` - Main dashboard
- [ ] `/admin/src/components/yatra/TopOrganizersChart.tsx` - Top organizers table
- [ ] `/admin/src/components/yatra/GeographyHeatMap.tsx` - Map with clusters
- [ ] `/admin/src/components/yatra/ThemeTrendsChart.tsx` - Bar/pie chart
- [ ] `/admin/src/components/yatra/TimeTrendsChart.tsx` - Line chart

**Features:**
- Top 10 organizers (by tours, rating, participants)
- Geography heat map (popular destinations)
- Theme trends (Vrindavan, Mayapur, etc.)
- Time trends (last 12 months)
- Average metrics (participants, duration, rating)

**Libraries to install:**
```bash
cd admin
npm install recharts react-leaflet leaflet
npm install -D @types/leaflet
```

#### 5. Notifications Integration (P1)
**Files to create:**
- [ ] `/admin/src/components/yatra/AdminNotificationBell.tsx` - Bell icon with counter
- [ ] `/admin/src/components/yatra/NotificationDropdown.tsx` - Dropdown list
- [ ] `/admin/src/components/yatra/NotificationItem.tsx` - Single notification

**Files to update:**
- [ ] `/admin/src/components/layout/Sidebar.tsx` - Add Yatra menu items
- [ ] `/admin/src/app/layout.tsx` - Add notification bell to header

**Features:**
- Real-time notification counter
- Dropdown with recent notifications
- Click to navigate to related resource
- Mark as read
- Mark all as read
- Auto-refresh every 30s

#### 6. Email Templates Management (P2 - Optional)
**Files to create:**
- [ ] `/admin/src/app/yatra/templates/page.tsx` - Templates CRUD
- [ ] `/admin/src/components/yatra/TemplateEditor.tsx` - Rich text editor
- [ ] `/admin/src/components/yatra/TemplatePreviewer.tsx` - Preview with vars

**Features:**
- List all email templates
- Create/edit/delete templates
- Preview with sample data
- Variable substitution guide ({{organizerName}}, {{yatraTitle}}, etc.)

#### 7. Broadcast Email Form (P2 - Optional)
**Files to create:**
- [ ] `/admin/src/app/yatra/broadcast/page.tsx` - Broadcast interface
- [ ] `/admin/src/components/yatra/BroadcastEmailForm.tsx` - Send form
- [ ] `/admin/src/components/yatra/RecipientSelector.tsx` - Target audience picker

**Features:**
- Select template or write custom
- Choose recipients (all organizers, top organizers, blocked, etc.)
- Preview before send
- Send confirmation
- Track send status

---

## 🎨 UI/UX Improvements TODO

### Design Consistency:
- [ ] Match existing admin panel color scheme
- [ ] Use consistent button styles across all modals
- [ ] Implement loading skeletons instead of spinners
- [ ] Add toast notifications for actions (instead of alerts)
- [ ] Responsive design for mobile (currently desktop-only)

### Accessibility:
- [ ] Add ARIA labels to all interactive elements
- [ ] Keyboard navigation support
- [ ] Focus management in modals
- [ ] Screen reader announcements

### Performance:
- [ ] Implement React Query for data fetching and caching
- [ ] Debounce search inputs (500ms)
- [ ] Virtual scrolling for large tables (react-window)
- [ ] Lazy load analytics components

---

## 🧪 Testing TODO

### Frontend Tests:
- [ ] Unit tests for components (Jest + React Testing Library)
- [ ] Integration tests for pages
- [ ] E2E tests for critical flows (Playwright)

### Backend Tests:
- [ ] Unit tests for services (already partially done)
- [ ] Integration tests for admin endpoints
- [ ] Load testing for analytics endpoints

---

## 📚 Documentation TODO

### Admin Guide:
- [ ] Create `/docs/ADMIN_YATRA_GUIDE.md` - How to use the admin panel
- [ ] Screenshot walkthrough for common tasks
- [ ] FAQ section

### Developer Docs:
- [ ] API endpoint documentation (Swagger/OpenAPI)
- [ ] Component library documentation (Storybook - optional)
- [ ] Deployment instructions

---

## 🚀 Deployment Checklist

### Pre-deployment:
- [ ] Run all linters (eslint, go lint)
- [ ] Fix all TypeScript errors
- [ ] Run security scan (`npm audit`, `go mod tidy`)
- [ ] Update .env.example files

### Database:
- [ ] Run migrations on staging
- [ ] Seed default templates
- [ ] Create indexes (already done in models)

### Production:
- [ ] Deploy backend API
- [ ] Deploy Next.js admin panel
- [ ] Verify all endpoints accessible
- [ ] Test critical flows (approve, reject, block)

---

## 📊 Current Progress Summary

| Component | Status | Priority | Completion |
|-----------|--------|----------|------------|
| Database Models | ✅ Done | P0 | 100% |
| Backend Services | ✅ Done | P0 | 100% |
| Backend API Endpoints | ✅ Done | P0 | 100% |
| Public Report Endpoints | ✅ Done | P0 | 100% |
| Frontend - Yatra List | ✅ Done | P0 | 100% |
| Frontend - Reports List | ✅ Done | P0 | 100% |
| Frontend - Yatra Detail | ⏳ TODO | P0 | 0% |
| Frontend - Report Detail | ⏳ TODO | P0 | 0% |
| Frontend - Organizers | ⏳ TODO | P0 | 0% |
| Frontend - Analytics | ⏳ TODO | P1 | 0% |
| Frontend - Notifications | ⏳ TODO | P1 | 0% |
| Frontend - Templates | ⏳ TODO | P2 | 0% |
| Frontend - Broadcast | ⏳ TODO | P2 | 0% |
| Tests | ⏳ TODO | P1 | 0% |
| Documentation | ⏳ TODO | P1 | 0% |

**Overall Progress: ~35% Complete**
**Estimated Time Remaining: ~2 weeks**

---

## 🎯 Next Immediate Steps (Recommended Order)

1. **Create Report Detail Page** (highest priority for moderation)
2. **Create Yatra Detail Page** (needed for viewing/editing)
3. **Add Organizer Pages** (blocking functionality)
4. **Integrate Notifications** (UX improvement)
5. **Add Analytics Dashboard** (polish)
6. **Write Tests** (quality assurance)
7. **Documentation** (handoff preparation)

---

