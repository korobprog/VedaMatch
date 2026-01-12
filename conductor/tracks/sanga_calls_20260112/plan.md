# План: Санга (Звонки и Контакты)

## Фаза 1: Бэкенд - Сигнализация и Профиль (Go)
- [ ] Задача: Обновление модели User.
    - [ ] Подзадача: Добавить поля `Yatra` и `Timezone`.
    - [ ] Подзадача: Миграция БД.
- [ ] Задача: WebSocket Сигнализация (Signaling Server).
    - [ ] Подзадача: Реализовать типы сообщений для WebRTC: `offer`, `answer`, `ice-candidate`, `hangup`.
    - [ ] Подзадача: Логика маршрутизации сигнальных сообщений между пирами.
- [ ] Задача: Поддержка VoIP Push-уведомлений.
    - [ ] Подзадача: Добавить тип пуша `voip_call` с payload для CallKeep.
- [ ] Задача: Conductor - User Manual Verification 'Backend Signaling' (Protocol in workflow.md)

## Фаза 2: Мобильное Приложение - Ядро WebRTC (React Native)
- [ ] Задача: Установка зависимостей.
    - [ ] Подзадача: `react-native-webrtc`, `react-native-incall-manager`.
    - [ ] Подзадача: Настройка Permissions (Camera, Mic) для iOS и Android.
- [ ] Задача: Сервис WebRTC (WebRTCService).
    - [ ] Подзадача: Инициализация PeerConnection.
    - [ ] Подзадача: Обработка потоков (Local/Remote Stream).
    - [ ] Подзадача: Интеграция с WebSocketService для обмена SDP.
- [ ] Задача: UI Экрана звонка.
    - [ ] Подзадача: Компонент `CallScreen` (Видео, Кнопки Mute/End/Switch Camera).
    - [ ] Подзадача: Обработка состояний (Calling, Ringing, Connected, Ended).
- [ ] Задача: Conductor - User Manual Verification 'WebRTC Core' (Protocol in workflow.md)

## Фаза 3: Мобильное Приложение - Нативные Звонки (CallKeep)
- [ ] Задача: Интеграция CallKeep.
    - [ ] Подзадача: Настройка для iOS (VoIP push) и Android (ConnectionService).
    - [ ] Подзадача: Обработка входящего вызова в фоновом режиме.
- [ ] Задача: UI Истории и Запуска.
    - [ ] Подзадача: Кнопки звонка в хедере чата.
    - [ ] Подзадача: Вкладка "Звонки" с историей.
- [ ] Задача: Conductor - User Manual Verification 'Native Calls' (Protocol in workflow.md)

## Фаза 4: Профиль и Совместное чтение (Подготовка)
- [ ] Задача: Редактирование профиля.
    - [ ] Подзадача: Выбор Ятры и Часового пояса.
- [ ] Задача: Улучшение поиска контактов.
    - [ ] Подзадача: Фильтр по Ятре.
    - [ ] Подзадача: Отображение локального времени пользователя в профиле.
- [ ] Задача: Conductor - User Manual Verification 'Profile & Sanga' (Protocol in workflow.md)
