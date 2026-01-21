# План: Sattva Ads (Доска Объявлений)

## Фаза 1: Бэкенд - Ядро и API (Go)
- [x] Задача: Модели данных и Миграции.
    - [x] Подзадача: Модели `Ad`, `AdPhoto`, `AdFavorite`, `AdReport`.
    - [x] Подзадача: Настройка GORM миграций.
- [x] Задача: Public API для поиска и фильтрации.
    - [x] Подзадача: Эндпоинт `GET /ads` с фильтрами (Category, City, Price, Type).
    - [x] Подзадача: Поиск по заголовку и описанию.
    - [x] Подзадача: Получение деталей объявления `GET /ads/:id`.
- [x] Задача: User API (CRUD).
    - [x] Подзадача: Создание `POST /ads`, Редактирование `PUT /ads/:id`, Удаление `DELETE /ads/:id`.
    - [x] Подзадача: Загрузка фото (S3/Local).
    - [x] Подзадача: Управление избранным (`ToggleFavorite`).
- [x] Задача: Admin/Moderation API.
    - [x] Подзадача: Репортинг объявлений (`ReportAd`).
    - [x] Подзадача: Админский список и модерация статусов.
- [ ] Задача: Conductor - User Manual Verification 'Ads Backend' (Protocol in workflow.md)

## Фаза 2: Мобильное Приложение (React Native)
- [x] Задача: Экран Списка Объявлений.
    - [x] Подзадача: `AdsScreen` с поиском и табами (Ищу/Предлагаю).
    - [x] Подзадача: Экран фильтров `AdsFiltersScreen`.
- [x] Задача: Создание и Редактирование.
    - [x] Подзадача: `CreateAdScreen` с формой и загрузкой фото.
- [x] Задача: Детальный просмотр.
    - [x] Подзадача: `AdDetailScreen` с галереей и информацией об авторе.
    - [x] Подзадача: Кнопка "Связаться" (интеграция с чатами).
- [x] Задача: Сервис и Интеграция.
    - [x] Подзадача: `adsService.ts` (API Client).
    - [x] Подзадача: Типизация (`types/ads.ts`).
- [ ] Задача: Conductor - User Manual Verification 'Ads Mobile' (Protocol in workflow.md)

## Фаза 3: Финализация
- [ ] Задача: UI/UX Полировка.
    - [ ] Подзадача: Проверка отображения на разных экранах.
    - [ ] Подзадача: Empty states и лоадеры.
- [ ] Задача: Conductor - User Manual Verification 'Final Polish' (Protocol in workflow.md)
