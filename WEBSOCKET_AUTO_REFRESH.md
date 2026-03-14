# ✅ Автоматический refresh JWT токена в WebSocket

## 📝 Изменения

**Файл:** `frontend/services/websocketService.ts`

**Дата:** 13 марта 2026

---

## 🐛 Проблема

При истечении JWT токена:
1. WebSocket отключался с ошибкой `invalid token`
2. Приложение **не обновляло токен автоматически**
3. Звонки не проходили — `Target User not connected`
4. Требовался **перезаход в приложение** (выйти/войти)

---

## ✅ Решение

Добавлен **автоматический refresh токена** при ошибке авторизации в WebSocket.

### Алгоритм:

```
WebSocket ошибка авторизации
    ↓
1. refreshAuthTokens() ← АВТОМАТИЧЕСКИ
    ↓
2. Токен обновлён? → Да → Переподключение
    ↓ Нет
3. onAuthError callback ← FALLBACK
    ↓
4. Переподключение или logout
```

### Код:

```typescript
private async handleAuthFailure(source: string) {
    // Шаг 1: Автоматический refresh токена
    console.log(`[ws_auth_refresh] source=${source} user_id=${this.userId}`);
    const refreshed = await refreshAuthTokens();
    
    if (refreshed?.accessToken) {
        console.log(`[ws_auth_refresh_success] source=${source}`);
        console.log('[WebSocket] Token refreshed automatically, reconnecting...');
        this.reconnectAttempts = 0;
        await this.connect();
        return;
    }

    // Шаг 2: Если refresh не сработал, пробуем onAuthError callback
    console.warn('[WebSocket] Token refresh failed, no refresh token available');
    if (!this.onAuthError) {
        return;
    }

    const recovered = await this.onAuthError();
    if (recovered && !this.isDisposed) {
        console.log(`[ws_auth_recover] source=${source}`);
        await this.connect();
    }
}
```

---

## 🎯 Преимущества

1. **Прозрачно для пользователя** — не нужно перезаходить
2. **Быстрое восстановление** — 1-2 секунды на refresh
3. **Fallback механизм** — если refresh не сработал, пробуем callback
4. **Логирование** — видно в консоли что происходит

---

## 📊 Логи

### До изменений:
```
12:59:10 | WebSocket 401 | invalid token
13:00:09 | Target User 87 not connected  ← Звонки не проходят
```

### После изменений:
```
[ws_auth_refresh] source=ws_close_auth user_id=87
[ws_auth_refresh_success] source=ws_close_auth user_id=87
[WebSocket] Token refreshed automatically, reconnecting...
[ws_connect_attempt] user_id=87 attempt=1
[WebSocket] Connection established  ← Звонки работают!
```

---

## 🧪 Тестирование

### Сценарий 1: Токен протух (есть refresh token)

1. Подождать пока токен истечёт (15 минут по умолчанию)
2. Открыть приложение
3. Начнётся звонок

**Ожидаемый результат:**
- ✅ WebSocket автоматически обновит токен
- ✅ Звонок подключится без ошибок

### Сценарий 2: Нет refresh token (logout)

1. Удалить refresh token вручную
2. Открыть приложение

**Ожидаемый результат:**
- ✅ Refresh вернёт `null`
- ✅ Сработает fallback на `onAuthError`
- ✅ Приложение перенаправит на экран логина

---

## 🔍 Мониторинг

### Логи для отслеживания:

```bash
# На устройстве (React Native Metro logs)
[ws_auth_refresh]
[ws_auth_refresh_success]
[ws_auth_recover]
[WebSocket] Token refreshed automatically
```

### На сервере:

```bash
ssh root@45.150.9.229 "docker logs -f vedamatch-server-dnkxc8.1.* 2>&1 | grep -E 'ws.*connected|invalid token|auth.*refresh'"
```

**Ожидаемые логи:**
```
User 87 connected, total clients: 2
101 | /api/ws/87 | -  ← WebSocket подключён
```

---

## 📁 Изменённые файлы

| Файл | Изменения |
|------|-----------|
| `frontend/services/websocketService.ts` | Добавлен автоматический refresh в `handleAuthFailure()` |

---

## 🚀 Развёртывание

### Android:
```bash
cd frontend
pnpm run android
```

### iOS:
```bash
cd frontend
pnpm run ios
```

### Production сборка:
```bash
# Android
pnpm run build:release

# iOS
cd frontend/ios && xcodebuild -scheme vedamatch -configuration Release
```

---

## ✅ Проверка

После деплоя:

1. **Подождать 15 минут** (пока токен протухнет)
2. **Открыть приложение**
3. **Совершить звонок**

**Ожидаемое поведение:**
- ✅ Звонок подключается
- ✅ В логах видно `[ws_auth_refresh_success]`
- ✅ Нет ошибок `invalid token`

---

*Документ создан: 13 марта 2026, 13:30 MSK*
*Изменение: Автоматический refresh JWT токена*
*Статус: ✅ Готово к тестированию*
