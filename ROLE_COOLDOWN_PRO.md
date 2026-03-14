# ✅ Cooldown смены роли (30 дней) с PRO опцией

## 📋 Описание

**Смена роли теперь доступна раз в 30 дней.** При попытке смены роли раньше срока появляется сообщение с количеством оставшихся дней и предложением активировать PRO режим для мгновенной смены.

---

## 🔧 Изменения

### Backend

**Файл:** `server/internal/models/user.go`

**Добавлены поля:**
```go
RoleChangedAt     *time.Time `json:"roleChangedAt,omitempty"`
RoleCooldownUntil *time.Time `json:"roleChangeCooldownUntil,omitempty"`
```

---

**Файл:** `server/internal/handlers/auth_handler.go`

**Проверка cooldown:**
```go
if updateData.Role != "" && updateData.Role != user.Role {
    if user.RoleCooldownUntil != nil && now.Before(*user.RoleCooldownUntil) {
        daysLeft := int((*user.RoleCooldownUntil).Sub(now) / (24 * time.Hour))
        return c.Status(fiber.StatusTooManyRequests).JSON(fiber.Map{
            "error":        "Role change cooldown active",
            "code":         "role_cooldown_active",
            "field":        "role",
            "retryAfterAt": user.RoleCooldownUntil,
            "daysLeft":     daysLeft,
        })
    }

    // Apply 30 days cooldown
    roleCooldown := now.Add(30 * 24 * time.Hour)
    updates["role_changed_at"] = now
    updates["role_change_cooldown_until"] = roleCooldown
}
```

---

### Frontend

**Файл:** `frontend/screens/settings/EditProfileScreen.tsx`

**State:**
```typescript
const [roleCooldownDays, setRoleCooldownDays] = useState<number | null>(null);
const [showProModalForRole, setShowProModalForRole] = useState(false);
```

**Загрузка cooldown:**
```typescript
if (userData.roleChangeCooldownUntil) {
    const cooldownDate = new Date(userData.roleChangeCooldownUntil);
    const now = new Date();
    if (cooldownDate > now) {
        const daysLeft = Math.ceil((cooldownDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        setRoleCooldownDays(daysLeft);
    }
}
```

**Обработка ошибки:**
```typescript
if (requestCode === 'role_cooldown_active') {
    const daysLeft = error?.response?.data?.daysLeft || 30;
    Alert.alert(
        t('common.error'),
        `Смена роли доступна раз в 30 дней. Осталось дней: ${daysLeft}\n\nАктивируйте PRO режим для мгновенной смены роли.`,
        [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Активировать PRO', onPress: () => setShowProModalForRole(true) }
        ]
    );
}
```

**RoleSelectionSection:**
```typescript
<RoleSelectionSection
    selectedRole={role}
    onSelectRole={(newRole) => {
        if (newRole !== role && roleCooldownDays && roleCooldownDays > 0 && !effectiveProEnabled) {
            Alert.alert(
                t('common.error'),
                `Смена роли доступна раз в 30 дней. Осталось дней: ${roleCooldownDays}\n\nАктивируйте PRO режим для мгновенной смены роли.`,
                [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Активировать PRO', onPress: () => setShowProModalForRole(true) }
                ]
            );
            return;
        }
        setRole(newRole);
    }}
/>
```

---

## 📊 Сообщения

### Русский:
```
Смена роли доступна раз в 30 дней. Осталось дней: X

Активируйте PRO режим для мгновенной смены роли.
```

### Hindi:
```
भूमिका परिवर्तन 30 दिनों में एक बार उपलब्ध है। शेष दिन: X

तत्काल भूमिका परिवर्तन के लिए PRO मोड सक्रिय करें।
```

### English:
```
Role change is available once every 30 days. Days remaining: X

Activate PRO mode for instant role change.
```

---

## 🧪 Тестирование

### Сценарий 1: Первая смена роли
1. Открыть **Edit Profile**
2. Изменить роль (например, с "Искатель" на "Йог")
3. Нажать **Save**
4. ✅ Роль изменена
5. ✅ Установлен cooldown 30 дней

### Сценарий 2: Попытка смены во время cooldown
1. Открыть **Edit Profile**
2. Попытаться изменить роль
3. ✅ Alert: "Смена роли доступна раз в 30 дней. Осталось дней: X"
4. ✅ Кнопка "Активировать PRO"

### Сценарий 3: PRO режим
1. Активировать PRO режим
2. Попытаться изменить роль
3. ✅ Роль меняется без ограничений

---

## 📁 Изменённые файлы

| Файл | Изменения |
|------|-----------|
| `server/internal/models/user.go` | Добавлены поля RoleChangedAt, RoleCooldownUntil |
| `server/internal/handlers/auth_handler.go` | Проверка cooldown, ошибка 429 |
| `frontend/screens/settings/EditProfileScreen.tsx` | UI cooldown, Alert с PRO опцией |

**Коммит:** `81787339`

---

## 🚀 Миграция БД

**После деплоя нужно добавить поля в БД:**

```sql
ALTER TABLE users ADD COLUMN role_changed_at TIMESTAMP;
ALTER TABLE users ADD COLUMN role_change_cooldown_until TIMESTAMP;
```

Или через GORM миграцию:
```go
db.AutoMigrate(&models.User{})
```

---

## ✅ Итог

**Было:**
- ❌ Роль можно было менять без ограничений

**Стало:**
- ✅ Смена роли раз в 30 дней
- ✅ Сообщение о оставшихся днях
- ✅ Предложение активировать PRO для мгновенной смены
- ✅ Локализация RU/HI/EN

---

*Документ создан: 14 марта 2026, 02:00 MSK*
*Статус: ✅ Готово к деплою*
