# План реализации: Сервис Кафе (Sattva Cafe)

## Phase 1: Backend Foundation (Models & API)
- [x] Task: Спроектировать и реализовать модели БД (Cafe, Dish, Category)
    - [x] Создать миграции для таблиц `cafes`, `categories`, `dishes`, `ingredients`
    - [x] Определить GORM модели с учетом типов данных и связей
- [x] Task: Спроектировать и реализовать модели БД для Заказов (Order, Table)
    - [x] Создать миграции для таблиц `tables`, `orders`, `order_items`
    - [x] Реализовать модель `Table` с координатами для визуального редактора
- [x] Task: Реализовать API для управления меню (Admin Side)
    - [x] Endpoint: CRUD для категорий и блюд
    - [x] Endpoint: Управление стоп-листом
    - [ ] Написать unit-тесты для хендлеров меню
- [x] Task: Реализовать API для управления столиками (Admin Side)
    - [x] Endpoint: Сохранение схемы зала (координаты столиков)
    - [x] Endpoint: Получение списка столиков по ID кафе
    - [ ] Написать unit-тесты для управления залом
- [x] Task: Реализовать API для создания заказа (Client Side)
    - [x] Endpoint: Создание заказа (валидация состава, привязка к столу/адресу)
    - [x] Endpoint: Расчет стоимости заказа
    - [ ] Написать unit-тесты для логики заказа
- [x] Task: Интеграция с картой (маркеры кафе на карте)
- [ ] Task: Conductor - User Manual Verification 'Phase 1: Backend Foundation (Models & API)' (Protocol in workflow.md)

## Phase 2: Real-time Communication & Staff Flow
- [x] Task: Настройка WebSocket Hub для кафе
    - [x] Реализовать механизм комнат (rooms) для каждого кафе
    - [x] Аутентификация соединений (Staff vs Client)
- [x] Task: Реализовать отправку событий заказа
    - [x] Event: `new_order` для персонала
    - [x] Event: `order_status_update` для клиента
    - [x] Интеграция событий в API создания/обновления заказа
- [x] Task: Реализовать API для обработки заказов (Staff Side)
    - [x] Endpoint: Получение списка активных заказов
    - [x] Endpoint: Изменение статуса заказа (Принят, Готов, и т.д.)
    - [ ] Написать unit-тесты для смены статусов
- [x] Task: Реализовать API вызова официанта
    - [x] Endpoint / WebSocket Event: Отправка сигнала вызова с причиной
    - [x] Доставка уведомления персоналу через WS
- [ ] Task: Conductor - User Manual Verification 'Phase 2: Real-time Communication & Staff Flow' (Protocol in workflow.md)

## Phase 3: Mobile App - Client Features
- [x] Task: Интеграция карты и поиск кафе
    - [x] Отображение маркеров кафе на карте (Geoapify)
    - [x] Страница профиля кафе (инфо, время работы)
- [x] Task: UI Меню и Конструктора заказа
    - [x] Экран списка категорий и блюд
    - [x] Модальное окно блюда с выбором опций (ингредиенты)
    - [x] Корзина и оформление заказа (выбор типа: в заведении/навынос)
- [x] Task: Сканер QR и привязка к столу
    - [x] Логика обработки deeplink/QR с ID стола
    - [x] Авто-выбор типа заказа "В заведении" при сканировании
- [x] Task: Экран активного заказа и истории
    - [x] Отображение статуса в реальном времени (подключение к WS)
    - [x] Кнопки вызова официанта
    - [x] Список прошлых заказов с кнопкой "Повторить"
- [ ] Task: Conductor - User Manual Verification 'Phase 3: Mobile App - Client Features' (Protocol in workflow.md)

## Phase 4: Mobile App - Staff & Admin Features
- [x] Task: Режим Администратора Кафе (Вход и Навигация)
    - [x] Переключение роли пользователя или отдельный вход
    - [x] Главный дашборд администратора
- [x] Task: Визуальный редактор зала
    - [x] Интерфейс drag-and-drop для расстановки столиков
    - [x] Сохранение координат на сервер
- [x] Task: Управление заказами (Терминал официанта)
    - [x] Экран "Канбан" или список активных заказов
    - [x] Обработка входящих заказов (принять/отклонить)
    - [x] Получение уведомлений о вызове к столику
- [x] Task: Управление меню (Стоп-лист)
    - [x] Быстрое скрытие блюд из меню
- [ ] Task: Conductor - User Manual Verification 'Phase 4: Mobile App - Staff & Admin Features' (Protocol in workflow.md)