# 📞 Проблема со звонками — нет подключения (13 марта 2026)

## 🔍 Диагностика

### События в логах:

```
12:59:10 | 401 | /api/ws/87 | invalid token          ← Токен протух
13:00:09 [Hub] Target User 87 not connected          ← Звонки не проходят
13:01:21 | 101 | /api/ws/87 | ← Подключился заново
13:01:22 [Hub] User 87 connected                     ← Соединение восстановлено

13:03:40 | 200 | /api/turn-credentials | -           ← TURN credentials OK
13:03:43 [Hub] Signaling: candidate from 4 to 87    ← WebRTC сигнализация
13:03:43 [Hub] Forwarded candidate to User 87

13:04:59 | 401 | HEAD /api/turn-credentials | missing_authorization_header ← ОШИБКА!
```

### Найдено проблем:

1. ✅ **CoTurn работает** — TURN credentials выдаются
2. ✅ **LiveKit работает** — запущен и готов
3. ✅ **WebSocket сигнализация работает** — offer/answer/candidate проходят
4. ❌ **WebSocket токен протух** — пользователь 87 отключился
5. ❌ **Приложение не обновляет токен автоматически** — нет refresh

---

## 🎯 Корневая проблема

**Мобильное приложение не обновляет JWT токен автоматически при истечении.**

Когда токен протухает:
1. WebSocket отключается с ошибкой `invalid token`
2. Приложение не вызывает `refreshAuthTokens()`
3. Новые запросы идут без Authorization заголовка
4. Звонки не проходят — `Target User not connected`

---

## 🔧 Решение

### Вариант 1: Перезайти в приложении (быстро)

```
1. Выйти из аккаунта
2. Войти заново
3. Токен обновится
4. Звонки заработают
```

### Вариант 2: Исправить приложение (надёжно)

**Файл:** `frontend/services/websocketService.ts`

**Проблема:** При ошибке авторизации WebSocket не всегда вызывает `refreshAuthTokens()`.

**Решение:** Добавить автоматический refresh при `AUTH_FAILURE`:

```typescript
// websocketService.ts:169
if (event.data.includes('AUTH_FAILURE') || event.data.includes('invalid token')) {
    console.warn('[WebSocket] AUTH_FAILURE: Token expired or invalid');
    
    // Автоматический refresh токена
    try {
        const refreshed = await refreshAuthTokens();
        if (refreshed?.accessToken) {
            console.log('[WebSocket] Token refreshed, reconnecting...');
            setTimeout(() => this.connect(), 1000);
            return;
        }
    } catch (error) {
        console.error('[WebSocket] Token refresh failed:', error);
    }
    
    await this.handleAuthFailure('token_expired');
}
```

### Вариант 3: Увеличить TTL токена (костыль)

**На сервере:**
```env
# Увеличить время жизни access токена
AUTH_ACCESS_TOKEN_TTL_MINUTES=60  # Было: 15
```

---

## ✅ Проверка

**После перезахода в приложение:**

```bash
# Проверить WebSocket подключения
ssh root@45.150.9.229 "docker logs vedamatch-server-dnkxc8.1.* 2>&1 | grep -E 'User.*connected|/api/ws/' | tail -20"

# Ожидаемый результат:
# User 87 connected, total clients: 2
# 101 | /api/ws/87 | -
```

**Тест звонка:**
1. Открыть приложение
2. Совершить тестовый звонок
3. Проверить логи:
   ```
   [Hub] Signaling: offer from X to Y
   [Hub] Signaling: answer from Y to X
   [Hub] Forwarded candidate
   ```

---

## 📊 Статистика звонков

| Время | Событие | Статус |
|-------|---------|--------|
| 12:59:10 | WebSocket 401 | ❌ Токен протух |
| 13:00:09 | Target User 87 not connected | ❌ Звонки не проходят |
| 13:01:21 | WebSocket подключён | ✅ Соединение есть |
| 13:03:43 | WebRTC candidate | ✅ Сигнализация работает |
| 13:04:59 | HEAD 401 missing auth | ❌ Приложение не шлёт токен |

---

## 🎯 Рекомендации

### Для пользователей (сейчас):
- **Перезайти в приложении** — выйти и войти заново
- Токен обновится, звонки заработают

### Для разработки (в релиз):
1. Добавить автоматический refresh токена в WebSocket
2. Обрабатывать 401 ошибки с авторизацией
3. Переподключаться к WebSocket после refresh

### Для мониторинга:
```bash
# Следить за WebSocket ошибками
ssh root@45.150.9.229 "docker logs -f vedamatch-server-dnkxc8.1.* 2>&1 | grep -E 'invalid token|not connected|AUTH_FAILURE'"
```

---

*Документ создан: 13 марта 2026, 13:06 MSK*
*Проблема: JWT токен протух, звонки не проходят*
*Статус: 🔴 Требуется перезаход в приложение*
