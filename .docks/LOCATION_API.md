# API Локации и Оптимизация Регистрации

## Текущая реализация

### API локации

#### 1. Страны (REST Countries API)
- **URL**: `https://restcountries.com/v3.1/all?fields=name,capital`
- **Метод**: GET
- **Описание**: Получение списка всех стран
- **Формат ответа**:
```json
[
  {
    "name": {
      "common": "United States",
      "official": "United States of America"
    },
    "capital": ["Washington, D.C."]
  }
]
```
- **Лимиты**: Бесплатный, без ключа, ~250 стран

#### 2. Города (GeoNames API)
- **URL**: `https://secure.geonames.org/searchJSON?country={code}&featureClass=P&maxRows=100&username=demo`
- **Метод**: GET
- **Описание**: Получение списка городов по коду страны
- **Параметры**:
  - `country`: ISO 3166-1 alpha-2 код страны (например, "US", "RU")
  - `featureClass=P`: только населенные пункты
  - `maxRows`: максимальное количество результатов (100)
  - `username=demo`: демо аккаунт (ограничен)
- **Лимиты**: 2000 запросов в день для демо аккаунта

### Backend API

#### Обновление локации
- **URL**: `/api/update-location/:id`
- **Метод**: PUT
- **Тело запроса**:
```json
{
  "country": "Russia",
  "city": "Moscow"
}
```
- **Ответ**:
```json
{
  "message": "Location updated successfully",
  "user": {
    "id": 1,
    "country": "Russia",
    "city": "Moscow",
    ...
  }
}
```

## Оптимизации

### 1. Кеширование

Используйте `locationService` для кеширования данных:

```typescript
import { locationService } from '../services/locationService';

// Получение стран (кешируются в AsyncStorage)
const countries = await locationService.getCountries();

// Получение городов по стране (кешируются в AsyncStorage)
const cities = await locationService.getCities('Russia');

// Очистка кеширования
await locationService.clearCache();
```

**Ключи кеширования**:
- `@vedic_countries_cache`: список стран
- `@vedic_cities_cache`: объект с городами по странам

### 2. Fallback списки

Если API недоступен, используются встроенные списки:
- 50+ популярных стран с столицами
- Основные города для каждой страны

### 3. Компонент LocationPicker

Используйте компонент для выбора локации:

```typescript
import { LocationPicker } from '../components/chat/LocationPicker';

<LocationPicker
    country={country}
    city={city}
    onCountryChange={setCountry}
    onCityChange={setCity}
    theme={theme}
/>
```

**Функции**:
- Выбор страны из списка с поиском
- Автозаполнение столицы при выборе страны
- Выбор города из списка или ручной ввод
- Поиск по странам и городам

## Интеграция этапа локации

### Сценарий 1: Минимальная регистрация

Разделите регистрацию на 3 этапа:

1. **Этап 1 (initial)**: Email, пароль
2. **Этап 2 (location)**: Страна, город (новый)
3. **Этап 3 (profile)**: Остальные данные

#### Реализация этапа location

```typescript
// В RegistrationScreen.tsx
const { phase = 'initial' } = route.params;

if (phase === 'location') {
    return (
        <View>
            <Text>Step 2: Select Your Location</Text>

            <LocationPicker
                country={country}
                city={city}
                onCountryChange={setCountry}
                onCityChange={setCity}
                theme={theme}
            />

            <TouchableOpacity onPress={handleLocationSubmit}>
                <Text>Continue</Text>
            </TouchableOpacity>
        </View>
    );
}

const handleLocationSubmit = async () => {
    if (!country || !city) {
        Alert.alert('Required', 'Please select country and city');
        return;
    }

    try {
        setLoading(true);

        // Обновляем только локацию
        const response = await profileService.updateLocation(user.ID, {
            country,
            city,
        });

        await AsyncStorage.setItem('user', JSON.stringify(response.user));

        // Переходим к следующему этапу
        navigation.setParams({ phase: 'profile' });
    } catch (error) {
        Alert.alert('Error', 'Failed to save location');
    } finally {
        setLoading(false);
    }
};
```

### Сценарий 2: Опциональная локация

Сделайте локацию опциональной:

```typescript
const handleLocationSubmit = async () => {
    try {
        setLoading(true);

        // Локация опциональна - сохраняем если выбрана
        if (country && city) {
            await profileService.updateLocation(user.ID, { country, city });
        }

        // Переходим к следующему этапу или в профиль
        navigation.navigate('Chat');
    } catch (error) {
        Alert.alert('Error', 'Failed to save location');
    } finally {
        setLoading(false);
    }
};
```

## Сервисы

### locationService.ts

Функции:
- `getCountries()`: получить список стран (кеширование)
- `getCities(country)`: получить города страны (кеширование)
- `cacheCities(country, cities)`: кешировать города
- `getFallbackCountries()`: получить fallback список стран
- `getFallbackCities(country)`: получить fallback список городов
- `clearCache()`: очистить кеш

### profileService.ts

Функции:
- `updateLocation(userId, location)`: обновить локацию пользователя

## Пример полного потока

```typescript
// 1. Регистрация (email, password)
await axios.post('/api/register', { email, password });

// 2. Сохранение локации
await profileService.updateLocation(userId, {
    country: 'Russia',
    city: 'Moscow',
});

// 3. Заполнение профиля (опционально)
await axios.put('/api/update-profile/:id', {
    karmicName: 'Ivan',
    spiritualName: 'Das Anu',
    gender: 'Male',
    // ... остальные поля
});
```

## Рекомендации

1. **Кеширование**: Данные кешируются автоматически, ускоряет повторные использования
2. **Fallback списки**: Встроенные списки обеспечивают работу без интернет
3. **Опциональный ввод**: Позвольте вводить город вручную, если API не сработал
4. **Предзагрузка**: Загружайте страны при старте приложения
5. **Очистка кеша**: Добавьте опцию очистки кеша в настройки для обновления данных

## Улучшения для будущего

1. **GeoLocation API**: Автоматическое определение локации пользователя
2. **Лучший API городов**: Замена GeoNames на безлимитный API
3. **Офлайн режим**: Полный офлайн режим с локальными списками
4. **История локаций**: Запись предыдущих локаций пользователя
5. **Поиск по регионам**: Добавление поиска по штатам/регионам
