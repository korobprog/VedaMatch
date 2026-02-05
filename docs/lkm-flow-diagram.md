# Схема движения средств Lakshmani (LKM Flow)

> **Тип:** Архитектурная диаграмма  
> **Связь:** `monetization-lakshmani.md`

## 1. Общая схема циркуляции (Ecosystem Flow)

```mermaid
graph TD
    %% Участники
    User((Пользователь))
    Master((Мастер/Специалист))
    Fund((Фонд Сева))
    Owner((Владелец))

    %% Внешние системы
    WebStore[Web Store (Stripe/Bank)]
    WalletDB[(Единый Кошелек LKM)]
    
    %% Сервисы
    AI_Service[AI Астролог]
    Booking_Service[Бронирование Услуг]
    Media_Service[Медиа Контент]
    Charity_Service[Сева / Благотворительность]

    %% Потоки ввода денег
    User -- "1. Покупка (Fiat)" --> WebStore
    WebStore -- "2. Начисление (Webhook)" --> WalletDB
    
    %% Потоки трат (Расходы пользователя)
    WalletDB -- "3. Списание (1 LKM/msg)" --> AI_Service
    WalletDB -- "4. Hold (Заморозка)" --> Booking_Service
    WalletDB -- "5. Донат" --> Charity_Service
    
    %% Потоки доходов (Заработки Мастера)
    Booking_Service -- "6. Release (Разморозка после услуги)" --> Master
    
    %% Вывод и Комиссии
    AI_Service -.-> Owner
    Master -- "7. Комиссия (10%)" --> Owner
    Charity_Service -- "8. Tips (Чаевые)" --> Owner
    Charity_Service -- "9. Пожертвование (100%)" --> Fund
    
    %% Payouts
    Master -- "10. Запрос на вывод (Fiat)" --> Owner
```

---

## 2. Детальный поток транзакции услуги (Booking Transaction)

```mermaid
sequenceDiagram
    participant User
    participant AppUI
    participant BookingService
    participant WalletService
    participant Master

    Note over User, Master: Этап 1: Бронирование
    User->>AppUI: Нажимает "Записаться" (Price: 1000 LKM)
    AppUI->>BookingService: CreateOrder()
    BookingService->>WalletService: HoldFunds(User, 1000)
    
    alt Баланс OK
        WalletService-->>BookingService: Success (HoldID: 123)
        BookingService-->>AppUI: "Заявка отправлена"
        BookingService->>Master: New Request Notification
    else Не хватает средств
        WalletService-->>BookingService: Error (Low Balance)
        BookingService-->>AppUI: Show "Пополните баланс"
    end

    Note over User, Master: Этап 2: Подтверждение
    Master->>BookingService: ConfirmOrder()
    BookingService->>User: "Мастер подтвердил запись"
    
    Note over User, Master: Этап 3: Завершение
    Master->>BookingService: CompleteService()
    BookingService->>WalletService: ReleaseFunds(HoldID: 123)
    WalletService->>WalletService: Transfer(User->Master, 900)
    WalletService->>WalletService: Transfer(User->Owner, 100)
    WalletService-->>BookingService: Done
```

---

## 3. Реферальный поток (Referral Loop)

```mermaid
stateDiagram-v2
    [*] --> Registered: User B registers via Link A
    Registered --> BonusPending: System gives 50 LKM (Locked)
    
    state "Pending (Заморожено)" as BonusPending {
        [*] --> WaitingForProfile
        WaitingForProfile --> ProfileCompleted: Заполнил профиль
        ProfileCompleted --> WaitingForAction: Ждем "Полезное действие"
    }

    WaitingForAction --> BonusActive: User B купил LKM или услугу
    BonusActive --> [*]: User A получает +100 LKM
```
