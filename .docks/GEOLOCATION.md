# Геолокация в приложении

## 🎯 Реализация гибридной системы

### Два способа определения локации:

1. **Автоматическое (GPS)** - быстрая регистрация
2. **Ручной ввод** - полный контроль пользователя

---

## 📱 Frontend

### Сервисы

#### 1. geoLocationService.ts

Автоматическое определение локации с использованием GPS и обратного геокодирования.

```typescript
import { geoLocationService } from '../services/geoLocationService';

// Определение текущей локации
const location = await geoLocationService.detectLocation();
// Возвращает: { country: "Russia", city: "Moscow", latitude: 55.7558, longitude: 37.6173 }

// Получение только координат
const coords = await geoLocationService.getCurrentPosition();
// Возвращает: { latitude: 55.7558, longitude: 37.6173 }

// Обратное геокодирование (координаты → адрес)
const address = await geoLocationService.reverseGeocode(55.7558, 37.6173);
// Возвращает: { country: "Russia", city: "Moscow", latitude: 55.7558, longitude: 37.6173 }

// Расчет расстояния между двумя точками (в км)
const distance = await geoLocationService.calculateDistance(55.7558, 37.6173, 55.6938, 37.4942);
// Возвращает: 15.2 (км)

// Поиск локации по названию
const results = await geoLocationService.searchLocation("New York");
// Возвращает: [{ country: "United States", city: "New York", latitude: ..., longitude: ... }, ...]

// Форматирование локации для отображения
const formatted = geoLocationService.formatLocation(location);
// Возвращает: "Moscow, Russia"
```

#### 2. nearbyService.ts

Поиск пользователей поблизости и по локации.

```typescript
import { nearbyService } from '../services/nearbyService';

// Поиск пользователей в радиусе 50 км от координат
const result = await nearbyService.getNearbyUsers(55.7558, 37.6173, 50);
// Возвращает: { users: [...], count: 10, radiusKm: 50 }

// Поиск по городу
const cityUsers = await nearbyService.searchByCity("Moscow");
// Возвращает: { users: [...], count: 25 }

// Поиск по стране
const countryUsers = await nearbyService.getUsersByCountry("Russia");
// Возвращает: { users: [...], count: 150 }

// Форматирование расстояния
const distanceText = nearbyService.formatDistance(15.2);
// Возвращает: "15.2 km"
```

### Компоненты

#### 1. AutoLocationButton

Кнопка автоматического определения локации.

```typescript
import { AutoLocationButton } from '../components/chat/AutoLocationButton';

<AutoLocationButton
    onLocationDetected={(country, city, lat, lon) => {
        setCountry(country);
        setCity(city);
        setLatitude(lat);
        setLongitude(lon);
    }}
    theme={theme}
/>
```

#### 2. LocationPicker

Комплексный компонент выбора локации с автоматическим определением.

```typescript
import { LocationPicker } from '../components/chat/LocationPicker';

<LocationPicker
    country={country}
    city={city}
    onCountryChange={setCountry}
    onCityChange={setCity}
    onCoordinatesChange={(lat, lon) => {
        setLatitude(lat);
        setLongitude(lon);
    }}
    theme={theme}
    showAutoDetect={true} // Показывать кнопку автоопределения
/>
```

#### 3. NearbyUsers

Список пользователей поблизости с расстоянием.

```typescript
import { NearbyUsers } from '../components/chat/NearbyUsers';

<NearbyUsers
    latitude={55.7558}
    longitude={37.6173}
    theme={theme}
/>
```

---

## 🔧 Backend

### API Endpoints

#### 1. Обновление локации

```
PUT /api/update-location/:id
Content-Type: application/json

{
    "country": "Russia",
    "city": "Moscow",
    "latitude": 55.7558,
    "longitude": 37.6173
}
```

#### 2. Обновление координат

```
PUT /api/update-coordinates/:id
Content-Type: application/json

{
    "latitude": 55.7558,
    "longitude": 37.6173
}
```

#### 3. Поиск пользователей поблизости

```
POST /api/location/nearby
Content-Type: application/json

{
    "latitude": 55.7558,
    "longitude": 37.6173,
    "radiusKm": 50
}
```

**Ответ:**
```json
{
    "users": [
        {
            "id": 1,
            "karmicName": "John Doe",
            "spiritualName": "Das Anu",
            "city": "Moscow",
            "country": "Russia",
            "latitude": 55.7558,
            "longitude": 37.6173,
            "distance": 5.2
        }
    ],
    "count": 10,
    "radiusKm": 50
}
```

#### 4. Поиск по городу

```
GET /api/location/by-city?city=Moscow
```

#### 5. Поиск по стране

```
GET /api/location/by-country?country=Russia
```

### База данных

#### Модель User

```go
type User struct {
    // ... остальные поля
    Country    string   `json:"country"`
    City       string   `json:"city"`
    Latitude   *float64 `json:"latitude" gorm:"column:latitude"`
    Longitude  *float64 `json:"longitude" gorm:"column:longitude"`
    // ... остальные поля
}
```

#### Миграция

```bash
cd server
go run cmd/migrate_location/main.go
```

---

## 🚀 Интеграция

### Регистрация с локацией

```typescript
// Шаг 1: Email, пароль
await axios.post('/api/register', { email, password });

// Шаг 2: Локация (авто или вручную)
const location = await geoLocationService.detectLocation();

if (location) {
    // Автоматическое определение
    await profileService.updateLocation(userId, {
        country: location.country,
        city: location.city,
        latitude: location.latitude,
        longitude: location.longitude,
    });
} else {
    // Ручной ввод через LocationPicker
}

// Шаг 3: Остальные поля профиля
await axios.put('/api/update-profile/:id', {
    karmicName: 'Ivan',
    spiritualName: 'Das Anu',
    // ...
});
```

### Поиск пользователей поблизости

```typescript
// Получить координаты пользователя
const user = await getUser(userId);

// Найти пользователей поблизости
const nearby = await nearbyService.getNearbyUsers(
    user.latitude,
    user.longitude,
    50 // радиус в км
);

// Отобразить через NearbyUsers компонент
<NearbyUsers
    latitude={user.latitude}
    longitude={user.longitude}
    theme={theme}
/>
```

---

## ⚙️ Настройки

### Разрешения

#### Android

```xml
<!-- AndroidManifest.xml -->
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
```

#### iOS

```xml
<!-- Info.plist -->
<key>NSLocationWhenInUseUsageDescription</key>
<string>We need your location to find devotees near you</string>
```

---

## 📊 Статистика

### API для геолокации

| API | Тип | Использование |
|-----|-----|--------------|
| REST Countries | GET | Список стран |
| GeoNames | GET | Список городов |
| OpenStreetMap Nominatim | GET | Обратное геокодирование |
| OpenStreetMap Nominatim | GET | Поиск по названию |

### Лимиты API

| API | Лимит | Стоимость |
|-----|-------|-----------|
| REST Countries | Нет | Бесплатно |
| GeoNames | 2000/день | Бесплатно |
| OpenStreetMap Nominatim | 1 req/с | Бесплатно |

---

## 🎨 UI/UX

### Поток выбора локации

```
┌─────────────────────────────────────┐
│  Choose Your Location               │
├─────────────────────────────────────┤
│  [📍 Auto-detect my location]       │
│     Uses GPS for accuracy           │
│                                     │
│  OR                                 │
│                                     │
│  Country: [Select country ▼]        │
│  City:    [Select city ▼]           │
│           Or enter manually         │
│                                     │
│  [Continue]         [Skip]         │
└─────────────────────────────────────┘
```

### Пользователи поблизости

```
┌─────────────────────────────────────┐
│  Nearby Devotees          10 found   │
├─────────────────────────────────────┤
│  Search Radius: 50 km               │
│  [━━━━━━━━━━━━━━━━━━━━━]            │
├─────────────────────────────────────┤
│  👤 Das Anu                        │
│     Moscow, Russia                  │
│                          [5.2 km]  │
├─────────────────────────────────────┤
│  👤 Sita Devi                      │
│     Moscow, Russia                  │
│                          [8.7 km]  │
└─────────────────────────────────────┘
```

---

## 🔒 Приватность

### Рекомендации

1. **Опционально**: Сделайте геолокацию опциональной
2. **Четко**: Объясните зачем нужна локация
3. **Контроль**: Позвольте пользователям отключить
4. **Анонимно**: Не показывайте точные координаты другим
5. **Безопасно**: Используйте HTTPS для всех запросов

---

## 🚧 TODO

### Функции для будущего

- [ ] Офлайн кеширование карт
- [ ] Геозоны (ашрамы, храмы)
- [ ] История перемещений
- [ ] Уведомления о поблизости
- [ ] Фильтр по типу мест (город, деревня, ашрам)
- [ ] Автоматическое определение часового пояса
- [ ] Отображение на карте
- [ ] Поиск по маршруту/пути
