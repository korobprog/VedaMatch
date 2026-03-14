# ✅ Исправление сохранения профиля в админке (13 марта 2026)

## 🐛 Проблема

**Данные профиля не сохранялись** — при нажатии кнопки "Save Changes" сохранялись только `country` и `city`, все остальные данные игнорировались.

---

## 🔍 Причина

**Неправильный endpoint:**
- ❌ Использовался: `PUT /update-location` (только локация)
- ✅ Нужно: `PUT /update-profile` (все данные профиля)

**Неполные данные:**
```typescript
// БЫЛО (неправильно):
const locationData = {
    country: user.country || '',
    city: user.city || ''
};
await api.put('/update-location', locationData);
```

---

## ✅ Решение

**Отправка полного профиля:**
```typescript
// СТАЛО (правильно):
const profileData = {
    karmicName: user.karmicName || '',
    spiritualName: user.spiritualName || '',
    country: user.country || '',
    city: user.city || '',
    diet: user.diet || '',
    gender: user.gender || '',
    // ... и все остальные поля
};
await api.put('/update-profile', profileData);
```

---

## 📝 Изменения

### Файл: `admin/src/app/profile/page.tsx`

**Изменена функция `handleUpdate`:**

1. **Endpoint:** `/update-location` → `/update-profile`
2. **Данные:** только `{country, city}` → **все поля профиля**
3. **Логирование:** добавлен `console.error` для отладки
4. **Обновление localStorage:** корректное сохранение после обновления

**Поля которые теперь сохраняются:**
- ✅ Karmic Name
- ✅ Spiritual Name
- ✅ Country
- ✅ City
- ✅ Diet (Vegan/Vegetarian/Prasad)
- ✅ Gender
- ✅ Identity
- ✅ Madh (традиция)
- ✅ Yoga Style
- ✅ Guna
- ✅ Mentor
- ✅ Date of Birth
- ✅ Bio
- ✅ Interests
- ✅ Looking For
- ✅ Intentions
- ✅ Skills
- ✅ Industry
- ✅ Looking For Business
- ✅ Dating Enabled
- ✅ Yatra
- ✅ Timezone
- ✅ Marital Status
- ✅ Birth Time

---

## 🧪 Тестирование

### 1. Открыть профиль в админке
```
http://localhost:3005/profile
```

### 2. Изменить данные
- Изменить Karmic Name
- Изменить Spiritual Name
- Изменить Diet
- Изменить Country/City

### 3. Нажать "Save Changes"

### 4. Проверить результат
- ✅ Сообщение "Profile updated successfully!"
- ✅ Данные сохраняются в БД
- ✅ При перезагрузке страницы данные остаются

---

## 🔍 Диагностика на сервере

**Логи сервера при сохранении:**
```bash
ssh root@45.150.9.229 "docker logs vedamatch-server-dnkxc8.1.* 2>&1 | grep -E 'UpdateProfile|update-profile' | tail -20"
```

**Ожидаемые логи:**
```
[UpdateProfile] begin rid=xxx user=4
[UpdateProfile] user updated successfully rid=xxx user=4
```

---

## 📁 Изменённые файлы

| Файл | Изменения |
|------|-----------|
| `admin/src/app/profile/page.tsx` | Исправлено сохранение профиля |

**Коммит:** `cc7956e3`

---

## 🚀 Развёртывание

### Локально (dev):
```bash
cd admin
pnpm run dev
# Открыть http://localhost:3005/profile
```

### Production (Dokploy):
```bash
# Автоматически после git push
# Dokploy соберёт новую версию
```

---

## ✅ Итог

**Было:**
- ❌ Сохранялись только country и city
- ❌ Ошибок не было, но данные не сохранялись

**Стало:**
- ✅ Сохраняются все 23 поля профиля
- ✅ Есть сообщение об успехе
- ✅ Данные обновляются в localStorage
- ✅ Есть логирование ошибок

---

*Документ создан: 13 марта 2026, 23:55 MSK*
*Статус: ✅ Исправлено и закоммичено*
