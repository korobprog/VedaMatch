# Notification Center (Колокольчик)

## Goal
Реализовать полноценный центр уведомлений: анимированный колокольчик в хедере портала с бейджем непрочитанных, bottom sheet с историей, очисткой и навигацией по типу уведомления.

---

## Архитектура

**Источники уведомлений** — всё через Firebase FCM push (уже работает в `notificationService.ts`):
- `new_message` — личный чат  
- `room_message` — чат зала  
- `wallet_bonus`, `wallet_activated` — кошелёк  
- `referral_joined`, `referral_activated` — рефералы  
- `channel_news_personal` — каналы  
- `yatra_*` — ятры  
- `video_circle_publish_result` — видеокружки  
- `news` — новости  

**Хранилище** — `AsyncStorage` (локально, без нового API). Уведомления сохраняются при получении (foreground + background) и читаются из хранилища.

**Новый API на сервере** — НЕ нужен для MVP. Используем уже входящие push-данные.

---

## Tasks

- [x] **T1: Создать `NotificationContext`**  
- [x] **T2: Подключить `NotificationContext` в `App.tsx`**  
- [x] **T3: Перехват push-уведомлений в `notificationService.ts`**  
- [x] **T4: Создать компонент `BellButton`**  
- [x] **T5: Заменить статичный `<Bell>` в `PortalMainScreen.tsx` на `<BellButton>`**  
- [x] **T6: Создать `NotificationPanel` (bottom sheet)**  
- [x] **T7: Иконки по типу уведомления в `NotificationItem`**  
- [ ] **T8: UX-полировка** (swipe-to-delete опционально)
  Файл: `frontend/context/NotificationContext.tsx`  
  - Тип `AppNotification { id, type, title, body, data, receivedAt, isRead }`  
  - Стейт: `notifications[]`, `unreadCount`  
  - Методы: `addNotification`, `markAsRead`, `markAllAsRead`, `clearAll`  
  - Сохранение/загрузка через `AsyncStorage` (ключ `notification_history`, max 100 записей)  
  Verify: `useNotifications()` возвращает массив и счётчик.

- [ ] **T2: Подключить `NotificationContext` в `App.tsx`**  
  Обернуть `<NotificationProvider>` вокруг остального дерева (рядом с `UserProvider`).  
  Verify: контекст доступен в дочерних компонентах.

- [ ] **T3: Перехват push-уведомлений в `notificationService.ts`**  
  В методах `onMessageReceived` и `handleBackgroundMessage` добавить вызов:  
  `addNotification({ id: uuid(), type, title, body, data, receivedAt, isRead: false })`  
  Убрать `Alert.alert` — заменить на запись в историю (foreground push больше не показывает Alert).  
  Verify: при приходе push в foreground запись появляется в `AsyncStorage`.

- [ ] **T4: Создать компонент `BellButton`**  
  Файл: `frontend/components/portal/BellButton.tsx`  
  - Аргументы: `color`, `size`, `circularStyle` (boolean — для vedamatch стиля)  
  - Анимация: при изменении `unreadCount > prevCount` — запускать `Animated.sequence` с `rotate` ±15° × 3 (shake-эффект)  
  - Бейдж: если `unreadCount > 0` — маленький красный круг в правом верхнем углу с числом (max "99+")  
  - `onPress` → `setNotifPanelVisible(true)` через контекст или callback  
  Verify: при добавлении уведомления в стейт иконка трясётся и появляется бейдж.

- [ ] **T5: Заменить статичный `<Bell>` в `PortalMainScreen.tsx` на `<BellButton>`**  
  Строки 589–607 (grid header) и 831–833 (service header).  
  Добавить `onPress` открывающий bottom sheet.  
  Verify: кнопка рендерится, не ломает существующий layout.

- [ ] **T6: Создать `NotificationPanel` (bottom sheet)**  
  Файл: `frontend/components/portal/NotificationPanel.tsx`  
  Использовать `@gorhom/bottom-sheet` (уже установлен в проекте).  
  - Хэдер панели: заголовок "Уведомления", кнопки "Прочитать все" и "Очистить"  
  - Список: `FlatList` с `NotificationItem` (иконка по типу, заголовок, тело, время "5 мин назад")  
  - Пустое состояние: иллюстрация + текст "Уведомлений пока нет"  
  - `onPress` на элемент → `markAsRead(id)` + `notificationService.handleNotificationAction(data)` → закрыть панель  
  Verify: панель открывается, список скроллится, тап на элемент закрывает панель и навигирует.

- [ ] **T7: Иконки по типу уведомления в `NotificationItem`**  
  Маппинг типов на иконки `lucide-react-native`:  
  - `new_message` / `room_message` → `MessageCircle`  
  - `wallet_*` → `Wallet`  
  - `referral_*` → `Users`  
  - `channel_news_personal` → `Rss`  
  - `yatra_*` → `MapPin`  
  - `video_circle_*` → `Video`  
  - `news` → `Newspaper`  
  - default → `Bell`  
  Verify: разные типы показывают разные иконки.

- [ ] **T8: UX-полировка**  
  - Непрочитанные элементы — лёгкий подсвеченный фон (`rgba(255,223,0,0.08)` для vedamatch)  
  - Время — относительное (`dayjs` или кастомный хелпер без новых зависимостей)  
  - Swipe-to-delete на `NotificationItem` (через `Swipeable` из `react-native-gesture-handler`)  
  Verify: в панели непрочитанные визуально отличаются, свайп удаляет запись.

---

## Файлы к изменению

| Файл | Действие |
|------|----------|
| `context/NotificationContext.tsx` | СОЗДАТЬ |
| `components/portal/BellButton.tsx` | СОЗДАТЬ |
| `components/portal/NotificationPanel.tsx` | СОЗДАТЬ |
| `App.tsx` | Добавить `NotificationProvider` |
| `services/notificationService.ts` | Подключить `addNotification`, убрать `Alert` |
| `screens/portal/PortalMainScreen.tsx` | Заменить `<Bell>` на `<BellButton>` |

---

## Done When
- [ ] Колокольчик трясётся при новом уведомлении  
- [ ] Бейдж показывает количество непрочитанных  
- [ ] Bottom sheet открывается по тапу  
- [ ] История хранится между перезапусками приложения  
- [ ] "Очистить всё" и "Прочитать все" работают  
- [ ] Тап на уведомление навигирует в нужный экран  

---

## Notes
- Новый Go API на сервере для этого MVP не нужен — работаем на клиенте с AsyncStorage
- `@gorhom/bottom-sheet` уже есть в `node_modules` ✅
- `react-native-gesture-handler` уже установлен ✅  
- Для shake-анимации используем `Animated.sequence` + `Animated.timing` (без Reanimated)
- UUID для `id` — можно `Date.now().toString() + Math.random()` без установки новых пакетов
