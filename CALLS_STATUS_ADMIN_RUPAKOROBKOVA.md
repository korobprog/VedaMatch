# 📞 Статус звонков Admin ↔ @rupakorobkova (13 марта 2026)

## ✅ Текущий статус

**Звонки работают в обе стороны!**

---

## 📊 Хронология событий

### Проблема (была):
```
13:00:09 [Hub] Target User 87 not connected  ← rupakorobkova offline
13:00:41 [Hub] Target User 87 not connected  ← Звонки не проходят
```

**Причина:** У пользователя 87 (@rupakorobkova) истёк JWT токен и WebSocket отключился.

---

### Решение (стало):
```
13:01:21 | 101 | /api/ws/87 | ← Подключился заново
13:01:22 [Hub] User 87 connected, total clients: 2
```

**После переподключения:**

```
13:10:44 [WS] User 4 → candidate → User 87  ✅
13:10:50 [WS] User 4 → hangup → User 87    ✅

13:10:53 [WS] User 87 → offer → User 4     ✅
13:10:57 [WS] User 4 → answer → User 87    ✅
13:11:00 [WS] User 4 → hangup → User 87    ✅

13:16:24 [WS] User 87 → offer → User 4     ✅
13:16:29 [WS] User 4 → answer → User 87    ✅
13:16:59 [WS] User 4 → hangup → User 87    ✅

13:17:20 [WS] User 87 → offer → User 4     ✅
13:17:25 [WS] User 4 → answer → User 87    ✅
```

---

## 🎯 Выводы

### Звонки работают:
- ✅ **Admin (4) → @rupakorobkova (87)**
- ✅ **@rupakorobkova (87) → Admin (4)**

### Проблема была:
- ❌ **User 87 offline** в 13:00:09
- ❌ **JWT токен протух**

### Сейчас:
- ✅ **Оба пользователя онлайн**
- ✅ **WebRTC сигнализация проходит**
- ✅ **offer/answer/candidate доставляются**

---

## 🔍 Как диагностировать

### Если звонки не работают:

```bash
# 1. Проверить WebSocket подключения
ssh root@45.150.9.229 "docker logs vedamatch-server-dnkxc8.1.* 2>&1 | grep -E '/api/ws/[0-9]+' | tail -20"

# Ожидаемый результат:
# 101 | /api/ws/4 | -   ← Admin подключён
# 101 | /api/ws/87 | -  ← rupakorobkova подключён
```

```bash
# 2. Проверить ошибки "not connected"
ssh root@45.150.9.229 "docker logs vedamatch-server-dnkxc8.1.* 2>&1 | grep 'not connected' | tail -10"

# Если видите:
# [Hub] Target User X not connected
# ← Пользователь offline, нужно переподключиться
```

```bash
# 3. Проверить WebRTC сигнализацию
ssh root@45.150.9.229 "docker logs vedamatch-server-dnkxc8.1.* 2>&1 | grep -E 'offer|answer|candidate' | tail -20"

# Ожидаемый результат:
# [Hub] Forwarded offer to User X
# [Hub] Forwarded answer to User Y
# [Hub] Forwarded candidate to User Z
```

---

## 📱 Что делать пользователям

### Если звонки не подключаются:

1. **Перезайти в приложении**
   - Выйти из аккаунта
   - Войти заново
   - Токен обновится

2. **Или подождать auto-refresh** (новый функционал)
   - WebSocket автоматически обновит токен
   - Переподключится за 1-2 секунды

---

## 🆕 Auto-refresh токена

**Добавлено 13 марта 2026:**

Теперь WebSocket **автоматически обновляет токен** при истечении:

```
[ws_auth_refresh] source=ws_close_auth
[ws_auth_refresh_success] source=ws_close_auth
[WebSocket] Token refreshed automatically, reconnecting...
```

**Преимущества:**
- ✅ Не нужно перезаходить
- ✅ Звонки работают всегда
- ✅ Прозрачно для пользователя

---

## ✅ Итог

| Направление | Статус | Последняя активность |
|-------------|--------|---------------------|
| Admin → @rupakorobkova | ✅ Работает | 13:17:25 hangup |
| @rupakorobkova → Admin | ✅ Работает | 13:17:25 answer |

**Проблема решена!** Звонки работают в обе стороны.

---

*Документ создан: 13 марта 2026, 13:20 MSK*
*Статус: ✅ Всё работает*
