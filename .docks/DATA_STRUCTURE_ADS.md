# Структура данных для сервиса объявлений

## 📊 Database Schema

### Таблица: `ads`

```sql
CREATE TABLE ads (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Тип объявления
    ad_type VARCHAR(10) NOT NULL CHECK (ad_type IN ('looking', 'offering')),
    
    -- Категория
    category VARCHAR(50) NOT NULL CHECK (category IN (
        'work',
        'real_estate',
        'spiritual',
        'education',
        'goods',
        'food',
        'transport',
        'events',
        'services',
        'charity'
    )),
    
    -- Основная информация
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    
    -- Цена
    price DECIMAL(10, 2),
    currency VARCHAR(10) DEFAULT 'RUB',
    is_negotiable BOOLEAN DEFAULT false,
    is_free BOOLEAN DEFAULT false,
    
    -- Локация
    city VARCHAR(100) NOT NULL,
    district VARCHAR(100),
    
    -- Контакты
    show_profile BOOLEAN DEFAULT true,
    phone VARCHAR(20),
    email VARCHAR(100),
    
    -- Статус
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN (
        'pending',    -- На модерации
        'active',     -- Активно
        'rejected',   -- Отклонено
        'archived'    -- В архиве
    )),
    
    -- Модерация
    moderation_comment TEXT,
    moderated_by INTEGER REFERENCES users(id),
    moderated_at TIMESTAMP,
    
    -- Статистика
    views_count INTEGER DEFAULT 0,
    favorites_count INTEGER DEFAULT 0,
    
    -- Временные метки
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP DEFAULT (CURRENT_TIMESTAMP + INTERVAL '30 days'),
    
    -- Индексы
    INDEX idx_ads_user_id (user_id),
    INDEX idx_ads_type (ad_type),
    INDEX idx_ads_category (category),
    INDEX idx_ads_city (city),
    INDEX idx_ads_status (status),
    INDEX idx_ads_created_at (created_at DESC)
);
```

### Таблица: `ad_photos`

```sql
CREATE TABLE ad_photos (
    id SERIAL PRIMARY KEY,
    ad_id INTEGER NOT NULL REFERENCES ads(id) ON DELETE CASCADE,
    photo_url VARCHAR(500) NOT NULL,
    position INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_ad_photos_ad_id (ad_id),
    INDEX idx_ad_photos_position (position)
);
```

### Таблица: `ad_favorites`

```sql
CREATE TABLE ad_favorites (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    ad_id INTEGER NOT NULL REFERENCES ads(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE KEY unique_favorite (user_id, ad_id),
    INDEX idx_favorites_user_id (user_id),
    INDEX idx_favorites_ad_id (ad_id)
);
```

### Таблица: `ad_reports`

```sql
CREATE TABLE ad_reports (
    id SERIAL PRIMARY KEY,
    ad_id INTEGER NOT NULL REFERENCES ads(id) ON DELETE CASCADE,
    reporter_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reason VARCHAR(50) NOT NULL CHECK (reason IN (
        'spam',
        'inappropriate',
        'fraud',
        'duplicate',
        'other'
    )),
    comment TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_reports_ad_id (ad_id),
    INDEX idx_reports_reporter_id (reporter_id)
);
```

---

## 🔌 API Endpoints

### GET `/api/ads`
Получить список объявлений

**Query Parameters:**
```typescript
{
  ad_type?: 'looking' | 'offering',
  category?: string,
  city?: string,
  min_price?: number,
  max_price?: number,
  is_free?: boolean,
  page?: number,
  limit?: number,
  sort?: 'newest' | 'price_asc' | 'price_desc'
}
```

**Response:**
```typescript
{
  ads: Ad[],
  total: number,
  page: number,
  totalPages: number
}
```

### GET `/api/ads/:id`
Получить детали объявления

**Response:**
```typescript
{
  id: number,
  user: {
    id: number,
    spiritualName: string,
    avatarUrl: string
  },
  ad_type: 'looking' | 'offering',
  category: string,
  title: string,
  description: string,
  price: number,
  currency: string,
  is_negotiable: boolean,
  is_free: boolean,
  city: string,
  district: string,
  photos: string[],
  contacts: {
    show_profile: boolean,
    phone?: string,
    email?: string
  },
  views_count: number,
  favorites_count: number,
  is_favorite: boolean,
  created_at: string,
  updated_at: string
}
```

### POST `/api/ads`
Создать объявление

**Request Body:**
```typescript
{
  ad_type: 'looking' | 'offering',
  category: string,
  title: string,
  description: string,
  price?: number,
  currency?: string,
  is_negotiable?: boolean,
  is_free?: boolean,
  city: string,
  district?: string,
  photos?: string[], // URLs or base64
  contacts: {
    show_profile?: boolean,
    phone?: string,
    email?: string
  }
}
```

**Response:**
```typescript
{
  id: number,
  status: 'pending',
  message: 'Ad created and sent for moderation'
}
```

### PUT `/api/ads/:id`
Обновить объявление

**Request Body:** (same as POST)

**Response:**
```typescript
{
  success: boolean,
  message: string
}
```

### DELETE `/api/ads/:id`
Удалить объявление

**Response:**
```typescript
{
  success: boolean,
  message: string
}
```

### POST `/api/ads/:id/favorite`
Добавить в избранное

**Response:**
```typescript
{
  is_favorite: boolean
}
```

### DELETE `/api/ads/:id/favorite`
Убрать из избранного

**Response:**
```typescript
{
  is_favorite: boolean
}
```

### GET `/api/ads/favorites`
Получить избранные объявления

**Response:**
```typescript
{
  ads: Ad[]
}
```

### POST `/api/ads/:id/report`
Пожаловаться на объявление

**Request Body:**
```typescript
{
  reason: 'spam' | 'inappropriate' | 'fraud' | 'duplicate' | 'other',
  comment?: string
}
```

**Response:**
```typescript
{
  success: boolean,
  message: string
}
```

### GET `/api/ads/my`
Получить мои объявления

**Response:**
```typescript
{
  ads: Ad[]
}
```

### GET `/api/ads/stats`
Получить статистику

**Response:**
```typescript
{
  total_ads: number,
  active_ads: number,
  by_category: {
    [category: string]: number
  },
  by_type: {
    looking: number,
    offering: number
  }
}
```

---

## 📱 TypeScript Interfaces

### Ad Type
```typescript
export type AdType = 'looking' | 'offering';

export type AdCategory = 
  | 'work'
  | 'real_estate'
  | 'spiritual'
  | 'education'
  | 'goods'
  | 'food'
  | 'transport'
  | 'events'
  | 'services'
  | 'charity';

export type AdStatus = 'pending' | 'active' | 'rejected' | 'archived';

export interface AdPhoto {
  id: number;
  url: string;
  position: number;
}

export interface AdContact {
  show_profile: boolean;
  phone?: string;
  email?: string;
}

export interface Ad {
  id: number;
  user_id: number;
  ad_type: AdType;
  category: AdCategory;
  title: string;
  description: string;
  price?: number;
  currency: string;
  is_negotiable: boolean;
  is_free: boolean;
  city: string;
  district?: string;
  photos: AdPhoto[];
  contacts: AdContact;
  status: AdStatus;
  views_count: number;
  favorites_count: number;
  is_favorite: boolean;
  created_at: string;
  updated_at: string;
  expires_at: string;
}

export interface AdFormData {
  ad_type: AdType;
  category: AdCategory;
  title: string;
  description: string;
  price?: number;
  currency?: string;
  is_negotiable?: boolean;
  is_free?: boolean;
  city: string;
  district?: string;
  photos?: File[] | string[];
  contacts: AdContact;
}

export interface AdFilters {
  ad_type?: AdType;
  category?: AdCategory;
  city?: string;
  min_price?: number;
  max_price?: number;
  is_free?: boolean;
}
```

### Category Config
```typescript
export interface CategoryConfig {
  id: AdCategory;
  emoji: string;
  label: {
    ru: string;
    en: string;
  };
  color: string;
}

export const AD_CATEGORIES: CategoryConfig[] = [
  {
    id: 'work',
    emoji: '🏢',
    label: { ru: 'Работа', en: 'Work' },
    color: '#D67D3E'
  },
  {
    id: 'real_estate',
    emoji: '🏠',
    label: { ru: 'Недвижимость', en: 'Real Estate' },
    color: '#9A2A2A'
  },
  {
    id: 'spiritual',
    emoji: '🧘',
    label: { ru: 'Духовные практики', en: 'Spiritual' },
    color: '#FFB142'
  },
  {
    id: 'education',
    emoji: '📚',
    label: { ru: 'Образование', en: 'Education' },
    color: 'rgba(214, 125, 62, 0.8)'
  },
  {
    id: 'goods',
    emoji: '🛍️',
    label: { ru: 'Товары', en: 'Goods' },
    color: 'rgba(154, 42, 42, 0.8)'
  },
  {
    id: 'food',
    emoji: '🍃',
    label: { ru: 'Питание', en: 'Food' },
    color: 'rgba(255, 177, 66, 0.8)'
  },
  {
    id: 'transport',
    emoji: '🚗',
    label: { ru: 'Транспорт', en: 'Transport' },
    color: 'rgba(214, 125, 62, 0.6)'
  },
  {
    id: 'events',
    emoji: '🎭',
    label: { ru: 'Мероприятия', en: 'Events' },
    color: 'rgba(154, 42, 42, 0.6)'
  },
  {
    id: 'services',
    emoji: '🤝',
    label: { ru: 'Услуги', en: 'Services' },
    color: 'rgba(255, 177, 66, 0.6)'
  },
  {
    id: 'charity',
    emoji: '💝',
    label: { ru: 'Благотворительность', en: 'Charity' },
    color: 'linear-gradient(135deg, #D67D3E, #FFB142)'
  }
];
```

---

## 🔐 Permissions & Validation

### Create Ad
- ✅ User must be logged in
- ✅ User profile must be complete
- ✅ Title: 10-200 characters
- ✅ Description: 50-2000 characters
- ✅ Max 5 photos
- ✅ Phone format validation (if provided)
- ✅ Email format validation (if provided)

### Edit Ad
- ✅ Only ad owner can edit
- ✅ Can't edit if status is 'rejected'
- ✅ Editing sends to moderation again

### Delete Ad
- ✅ Only ad owner can delete
- ✅ Or admin can delete

### Report Ad
- ✅ User must be logged in
- ✅ Can't report own ads
- ✅ One report per user per ad

---

## 🔄 State Management (React Native)

### Context Structure
```typescript
interface AdsContextType {
  ads: Ad[];
  loading: boolean;
  error: string | null;
  filters: AdFilters;
  
  // Actions
  fetchAds: (filters?: AdFilters) => Promise<void>;
  fetchAdById: (id: number) => Promise<Ad>;
  createAd: (data: AdFormData) => Promise<number>;
  updateAd: (id: number, data: AdFormData) => Promise<void>;
  deleteAd: (id: number) => Promise<void>;
  toggleFavorite: (id: number) => Promise<void>;
  reportAd: (id: number, reason: string, comment?: string) => Promise<void>;
  
  // Filters
  setFilters: (filters: AdFilters) => void;
  resetFilters: () => void;
}
```

---

## 📸 Image Upload

### Client Side
```typescript
interface ImageUploadConfig {
  maxSize: 5 * 1024 * 1024, // 5MB
  maxImages: 5,
  acceptedFormats: ['image/jpeg', 'image/png', 'image/webp'],
  compression: {
    maxWidth: 1200,
    maxHeight: 1200,
    quality: 0.8
  }
}
```

### Server Side
```go
type ImageUploadHandler struct {
    MaxSize       int64
    AllowedTypes  []string
    StoragePath   string
    S3Bucket      string
}

func (h *ImageUploadHandler) UploadAdPhoto(file multipart.File) (string, error) {
    // 1. Validate file size
    // 2. Validate file type
    // 3. Generate unique filename
    // 4. Compress/resize if needed
    // 5. Upload to S3 or local storage
    // 6. Return URL
}
```

---

## 🔔 Notifications

### Notification Types
```typescript
type AdNotificationType = 
  | 'ad_approved'           // Объявление одобрено
  | 'ad_rejected'           // Объявление отклонено
  | 'ad_expires_soon'       // Скоро истечет
  | 'new_message_on_ad'     // Новое сообщение
  | 'ad_favorited'          // Добавлено в избранное
  | 'new_ad_in_category';   // Новое объявление в категории

interface AdNotification {
  id: number;
  user_id: number;
  ad_id: number;
  type: AdNotificationType;
  title: string;
  body: string;
  read: boolean;
  created_at: string;
}
```

---

## 🧪 Test Data

### Mock Ads
```typescript
export const MOCK_ADS: Ad[] = [
  {
    id: 1,
    user_id: 1,
    ad_type: 'looking',
    category: 'real_estate',
    title: 'Ищу квартиру в Москве',
    description: 'Ищу однокомнатную квартиру для аренды...',
    price: 20000,
    currency: 'RUB',
    is_negotiable: true,
    is_free: false,
    city: 'Москва',
    district: 'Центр',
    photos: [],
    contacts: { show_profile: true },
    status: 'active',
    views_count: 15,
    favorites_count: 3,
    is_favorite: false,
    created_at: '2026-01-08T10:00:00Z',
    updated_at: '2026-01-08T10:00:00Z',
    expires_at: '2026-02-07T10:00:00Z'
  },
  // ... more mock data
];
```

---

**Версия**: 1.0  
**Последнее обновление**: 2026-01-08
