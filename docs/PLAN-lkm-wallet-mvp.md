# План: Интеграция кошелька Лакшмани (LKM Wallet MVP)

> **Статус:** ✅ Завершено (MVP)  
> **Дата обновления:** 2026-02-05  
> **Связанные документы:**  
> - [Стратегия монетизации](./monetization-lakshmani.md)  
> - [Диаграмма потоков](./lkm-flow-diagram.md)

---

## 1. Обзор (Overview)

**Цель:** Реализовать MVP кошелька Лакшмани (LKM) с возможностью:
1.  Отображения баланса (Active / Pending). ✅
2.  Истории транзакций с функцией "Поделиться чеком". ✅
3.  Интеграции списания в AI Chat (микро-транзакции). ✅
4.  Ручного управления балансами через Админку (Начислить/Списать). ✅

**Тип проекта:** FULLSTACK (Go Backend + React Native Mobile)

---

## 2. Критерии успеха (Success Criteria)

| # | Критерий | Статус | Как проверить |
|---|----------|--------|---------------|
| 1 | Пользователь видит свой баланс на экране Кошелька | ✅ | UI Test: Открыть WalletScreen, баланс отображается |
| 2 | Пользователь видит историю транзакций | ✅ | API Test: GET /wallet/transactions возвращает список |
| 3 | Пользователь может поделиться чеком | ✅ | Manual Test: Кнопка "Share" открывает Share Sheet с картинкой |
| 4 | AI Chat списывает 1 LKM за сообщение | ✅ | Integration Test: Отправить сообщение -> баланс уменьшился |
| 5 | Админ может начислить/списать LKM | ✅ | Admin UI Test: Кнопка работает, транзакция в логе |

---

## 3. Технологический стек (Tech Stack)

| Компонент | Технология | Статус |
|-----------|------------|--------|
| **Backend** | Go + Fiber | ✅ Интегрировано |
| **Database** | PostgreSQL + GORM | ✅ Интегрировано |
| **Frontend** | React Native | ✅ Интегрировано |
| **State** | WalletContext (React Context) | ✅ Обновлено |
| **Admin** | Yatra Admin (Next.js) | ✅ Реализовано |

---

## 4. Файловая структура (File Structure)

### Backend (server/)
```
server/
├── internal/
│   ├── models/
│   │   └── wallet.go              # ✅ Обновлено (PendingBalance, FrozenBalance)
│   ├── services/
│   │   └── wallet_service.go      # ✅ Методы Spend, AdminCharge, AdminSeize
│   └── handlers/
│       └── wallet_handler.go      # ✅ Admin endpoints реализованы
├── cmd/
│   └── main.go                    # ✅ Роуты зарегистрированы
```

### Frontend (frontend/)
```
frontend/
├── screens/
│   └── wallet/
│       ├── WalletScreen.tsx       # ✅ Реализовано
│       └── components/
│           └── ReceiptModal.tsx   # ✅ Создано (Share as Image)
├── context/
│   └── WalletContext.tsx          # ✅ Обновлено
└── services/
    └── walletService.ts           # ✅ Методы с новыми типами транзакций
```

### Admin (admin/)
```
admin/
├── src/
│   └── app/
│       └── users/
│           └── [id]/
│               └── wallet/
│                   └── page.tsx   # ✅ Создано (Admin Wallet Panel)
```

---

## 5. Разбивка задач (Task Breakdown)

### Фаза 1: Фундамент (Backend Core)

#### Task 1.1: Расширить модель Wallet ✅
- **OUTPUT:** Добавлены поля `PendingBalance`, `FrozenBalance`, `DedupKey`, `AdminID`
- **VERIFY:** `go build` успешно

#### Task 1.2: Метод Spend (Списание) ✅
- **OUTPUT:** Метод `Spend` с идемпотентностью через `dedup_key`
- **VERIFY:** Блокировка `FOR UPDATE` добавлена

#### Task 1.3: Метод AdminCharge/AdminSeize ✅
- **OUTPUT:** Методы для управления балансом со стороны админа
- **VERIFY:** Транзакции логируются корректно

#### Task 1.4: API Endpoints для Админки ✅
- **OUTPUT:** Роуты `/admin/wallet/*` зарегистрированы и работают

---

### Фаза 2: Frontend UI (Wallet Screen)

#### Task 2.1: BalanceCard Component ✅
- **OUTPUT:** Динамическое отображение Active и Pending балансов в `WalletScreen`

#### Task 2.2: TransactionList Component ✅
- **OUTPUT:** История транзакций с поддержкой новых типов (hold, release, admin)

#### Task 2.3: ReceiptShare (Чек) ✅
- **OUTPUT:** `ReceiptModal` с использованием `react-native-view-shot`
- **VERIFY:** Генерация чека работает

#### Task 2.4: WalletScreen Assembly ✅
- **OUTPUT:** Финальная сборка экрана кошелька

---

### Фаза 3: Интеграция (AI Chat Billing)

#### Task 3.1: Billing в AI Chat ✅
- **OUTPUT:** Списание 1 LKM перед обработкой сообщения в AI-комнатах
- **VERIFY:** Возврат 402 при нехватке средств

#### Task 3.2: Frontend обработка 402 ✅
- **OUTPUT:** Alert с переходом в кошелек при ошибке списания

#### Task 3.3: UI индикация баланса в чате ✅
- **OUTPUT:** BalancePill в хедере AI-чата
- **VERIFY:** Отображается только в AI режимах, скрывается в P2P

---

### Фаза 4: Админка (God Mode)

#### Task 4.1: Admin Wallet Panel ✅
- **OUTPUT:** Next.js страница для управления кошельком конкретного пользователя
- **VERIFY:** Charge/Seize/Activate функции проверены

---

## 6. Финальная верификация

- [x] `go build` — Backend компилируется успешно
- [ ] `npm run lint` — Требуется финальная проверка
- [ ] Unit Tests — **ОТЛОЖЕНО** (по просьбе пользователя)
- [x] Integration Test: AI Chat -> Списание работает
- [x] Manual Test: WalletScreen отображает данные
- [x] Manual Test: Share Receipt генерирует картинку
- [x] UI Test: Модалки справки ("О валюте", "Заморозка") работают
- [x] UI Test: Баланс виден в Header, Profile, Chat
- [x] Admin Test: Charge/Seize работают

---

## ✅ ПЛАН ВЫПОЛНЕН
