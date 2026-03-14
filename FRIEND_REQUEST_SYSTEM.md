# 📋 Система запросов в друзья — Документация

## 🎯 Обзор

Реализована система запросов в друзья с push-уведомлениями и экраном управления запросами.

---

## 📁 Backend (Go)

### Модель FriendRequest

**Файл:** `server/internal/models/friend_request.go`

```go
type FriendRequest struct {
    gorm.Model
    SenderID   uint
    ReceiverID uint
    Status     FriendRequestStatus // pending, accepted, rejected
}
```

### API Endpoints

**Файл:** `server/cmd/api/main.go`

| Endpoint | Method | Описание |
|----------|--------|----------|
| `/friends/request` | POST | Создать запрос в друзья |
| `/friends/requests` | GET | Получить входящие запросы |
| `/friends/request/accept` | POST | Принять запрос |
| `/friends/request/reject` | POST | Отклонить запрос |
| `/friends/request/cancel` | POST | Отозвать запрос |

### Push Notifications

**Файл:** `server/internal/services/push_notification_service.go`

```go
func (s *PushNotificationService) SendFriendRequestNotification(
    receiverID uint, 
    senderName string
) error
```

**Текст уведомления:**
- Title: "Новый запрос в друзья"
- Body: "{Имя} хочет добавить вас в друзья"

---

## 📱 Frontend (React Native)

### FriendRequestService

**Файл:** `frontend/services/friendRequestService.ts`

```typescript
- sendRequest(receiverId: number)
- getIncomingRequests(): Promise<FriendRequest[]>
- acceptRequest(requestId: number)
- rejectRequest(requestId: number)
- cancelRequest(requestId: number)
```

### FriendRequestsScreen

**Файл:** `frontend/screens/portal/contacts/FriendRequestsScreen.tsx`

**Функционал:**
- Список входящих запросов
- Кнопки "Принять" / "Отклонить"
- Нажатие на аватарку → ContactProfileScreen
- Индикатор обработки

### ContactsScreen

**Файл:** `frontend/screens/portal/contacts/ContactsScreen.tsx`

**Изменения:**
- Кнопка "✉️" в header для перехода на экран запросов
- Красный бейдж с количеством запросов
- Автоматическая загрузка количества при открытии

---

## 🎨 UI/UX

### Экран запросов в друзья

```
┌─────────────────────────────────┐
│ ← Запросы в друзья              │
├─────────────────────────────────┤
│ [Avatar] Иван Петров            │
│          Москва, Россия         │
│          14 марта 18:30         │
│            [✓]  [✗]             │
├─────────────────────────────────┤
│ [Avatar] Мария Сидорова         │
│          СПб, Россия            │
│          14 марта 17:15         │
│            [✓]  [✗]             │
└─────────────────────────────────┘
```

### Бейдж в ContactsScreen

```
┌─────────────────────────────────┐
│ ← Contacts           ✉️ 🔴 3     │
├─────────────────────────────────┤
│ [Все] [Друзья] [Заблокированы]  │
```

---

## 🔄 Поток данных

### 1. Отправка запроса

```
User A → POST /friends/request { receiverId: B }
         ↓
       Проверка:
       - Не друзья?
       - Нет активного запроса?
         ↓
       CREATE FriendRequest (status=pending)
         ↓
       Push Notification User B
```

### 2. Принятие запроса

```
User B → POST /friends/request/accept { requestId: X }
         ↓
       Проверка:
       - User B receiver?
       - Request exists?
         ↓
       UPDATE status=accepted
       CREATE Friend (A→B)
       CREATE Friend (B→A)
```

### 3. Отклонение запроса

```
User B → POST /friends/request/reject { requestId: X }
         ↓
       UPDATE status=rejected
```

---

## 💾 Миграция БД

**Файл:** `server/cmd/migrate/main.go`

```bash
cd server
go run cmd/migrate/main.go
```

**SQL (автоматически через GORM):**

```sql
CREATE TABLE friend_requests (
    id integer PRIMARY KEY,
    sender_id integer NOT NULL,
    receiver_id integer NOT NULL,
    status varchar(20) DEFAULT 'pending',
    created_at datetime,
    updated_at datetime,
    FOREIGN KEY (sender_id) REFERENCES users(id),
    FOREIGN KEY (receiver_id) REFERENCES users(id),
    UNIQUE(sender_id, receiver_id)
);

CREATE INDEX idx_friend_requests_receiver ON friend_requests(receiver_id, status);
```

---

## 🧪 Тестирование

### 1. Отправка запроса

```bash
curl -X POST http://localhost:8080/api/friends/request \
  -H "Authorization: Bearer {TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"receiverId": 2}'
```

**Ожидаемый ответ:**
```json
{
  "id": 1,
  "senderId": 1,
  "receiverId": 2,
  "status": "pending",
  "createdAt": "2026-03-14T18:30:00Z",
  "updatedAt": "2026-03-14T18:30:00Z"
}
```

### 2. Получение запросов

```bash
curl -X GET http://localhost:8080/api/friends/requests \
  -H "Authorization: Bearer {TOKEN}"
```

**Ожидаемый ответ:**
```json
[
  {
    "id": 1,
    "senderId": 1,
    "senderName": "Иван Петров",
    "avatarUrl": "/uploads/avatars/1_123.jpg",
    "city": "Москва",
    "country": "Россия",
    "createdAt": "2026-03-14T18:30:00Z"
  }
]
```

### 3. Принятие запроса

```bash
curl -X POST http://localhost:8080/api/friends/request/accept \
  -H "Authorization: Bearer {TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"requestId": 1}'
```

**Ожидаемый ответ:**
```json
{
  "message": "Friend request accepted"
}
```

---

## 📊 Статусы FriendRequest

| Статус | Описание | Действия |
|--------|----------|----------|
| `pending` | Ожидает подтверждения | accept, reject |
| `accepted` | Принят | Созданы Friend записи |
| `rejected` | Отклонён | Нет действий |

---

## 🔒 Безопасность

### Проверки:

1. **Нельзя отправить себе**
2. **Нельзя отправить если уже друзья**
3. **Нельзя отправить если уже есть активный запрос**
4. **Принять может только receiver**
5. **Отклонить может только receiver**
6. **Отозвать может только sender**

---

## 📝 Коммиты

1. `feat: добавить модель FriendRequest` ✅
2. `feat: API для запросов в друзья` ✅
3. `feat: push уведомления для запросов` ✅
4. `feat: FriendRequestService на frontend` ✅
5. `feat: FriendRequestsScreen экран` ✅
6. `feat: обновить ContactsScreen с бейджем` ✅
7. `feat: добавить миграцию БД` ✅

---

## 🚀 Развёртывание

### 1. Backend

```bash
cd server
go run cmd/migrate/main.go
go run cmd/api/main.go
```

### 2. Frontend

```bash
cd frontend
pnpm install
pnpm run android  # или pnpm run ios
```

### 3. Проверка

1. Откройте приложение
2. Перейдите в Контакты
3. Нажмите ✉️ в header
4. Должен открыться экран запросов

---

## ⏱ Оценка времени реализации

**Всего:** 6-8 часов

- Backend: 2-3 часа ✅
- Frontend Services: 1 час ✅
- Frontend UI: 2-3 часа ✅
- Тестирование: 1 час ⏳

---

## 🔜 Следующие шаги

1. ⏳ Зарегистрировать FriendRequestsScreen в навигации
2. ⏳ Обновить ContactProfileScreen (кнопка "Добавить в друзья")
3. ⏳ Обработка push уведомлений на клиенте
4. ⏳ Тестирование end-to-end

---

*Документ создан: 14 марта 2026, 19:00 MSK*  
*Статус: ✅ Backend готово, Frontend в процессе*
