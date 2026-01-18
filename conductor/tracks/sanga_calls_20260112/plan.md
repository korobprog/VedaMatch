# План: Санга (Звонки и Контакты)

## Фаза 1: Бэкенд - Сигнализация и Профиль (Go)
- [x] Задача: Обновление модели User.
    - [x] Подзадача: Добавить поля `Yatra` и `Timezone`.
    - [x] Подзадача: Миграция БД.
- [x] Задача: WebSocket Сигнализация (Signaling Server).
    - [x] Подзадача: Реализовать типы сообщений для WebRTC: `offer`, `answer`, `ice-candidate`, `hangup`.
    - [x] Подзадача: Логика маршрутизации сигнальных сообщений между пирами.
- [x] Задача: Поддержка VoIP Push-уведомлений.
    - [x] Подзадача: Добавить тип пуша `voip_call` с payload для CallKeep.
- [x] Задача: Conductor - User Manual Verification 'Backend Signaling' (Protocol in workflow.md)

## Фаза 2: Мобильное Приложение - Ядро WebRTC (React Native)
- [x] Задача: Установка зависимостей.
    - [x] Подзадача: `react-native-webrtc`, `react-native-incall-manager`.
    - [x] Подзадача: Настройка Permissions (Camera, Mic) для iOS и Android.
- [x] Задача: Сервис WebRTC (WebRTCService).
    - [x] Подзадача: Инициализация PeerConnection.
    - [x] Подзадача: Обработка потоков (Local/Remote Stream).
    - [x] Подзадача: Интеграция с WebSocketService для обмена SDP.
- [x] Задача: UI Экрана звонка.
    - [x] Подзадача: Компонент `CallScreen` (Видео, Кнопки Mute/End/Switch Camera).
    - [x] Подзадача: Обработка состояний (Calling, Ringing, Connected, Ended).
- [x] Задача: Conductor - User Manual Verification 'WebRTC Core' (Protocol in workflow.md)

## Фаза 3: Мобильное Приложение - Нативные Звонки (CallKeep)
- [x] Задача: Интеграция CallKeep.
    - [x] Подзадача: Настройка для iOS (VoIP push) и Android (ConnectionService).
    - [x] Подзадача: Обработка входящего вызова в фоновом режиме.
- [x] Задача: UI Истории и Запуска.
    - [x] Подзадача: Кнопки звонка в хедере чата.
    - [x] Подзадача: Вкладка "Звонки" с историей.
- [x] Задача: Conductor - User Manual Verification 'Native Calls' (Protocol in workflow.md)

## Фаза 4: Профиль и Совместное чтение (Подготовка)
- [x] Задача: Редактирование профиля.
    - [x] Подзадача: Выбор Ятры и Часового пояса.
- [x] Задача: Улучшение поиска контактов.
    - [x] Подзадача: Фильтр по Ятре.
    - [x] Подзадача: Отображение локального времени пользователя в профиле.
- [x] Задача: Conductor - User Manual Verification 'Profile & Sanga' (Protocol in workflow.md)
