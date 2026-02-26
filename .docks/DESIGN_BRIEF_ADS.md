# Design Brief: VedaMatch Объявления

## 🎯 Краткое описание

Сервис объявлений в ведическом стиле с разделами **"Ищу"** и **"Предлагаю"** для 10 категорий.

---

## 🎨 Стиль

**Название темы**: Modern Vedic Theme  
**Концепция**: Теплая, духовная, премиальная эстетика с элементами glassmorphism

### Ключевые цвета
```
Primary:    #D67D3E (Шафран)
Secondary:  #FFB142 (Золото)
Accent:     #9A2A2A (Бордовый)
Background: #FFF8F0 (Кремовый)
Glass:      rgba(255, 255, 255, 0.7)
```

### Шрифты
- **Заголовки**: Playfair Display (serif)
- **Подзаголовки**: Cinzel (decorative serif)
- **Текст**: Nunito (sans-serif)

---

## 📱 Основные экраны (приоритет)

### 1. Главный экран объявлений
- Header с иконками профиля и уведомлений
- **Tab Switcher**: Ищу / Предлагаю (glassmorphic)
- Горизонтальный скролл категорий (emoji + текст)
- Список карточек объявлений
- FAB кнопка "+" (создать объявление)
- Bottom navigation (существующая)

### 2. Карточка объявления
```
[Фото 80x80] | Заголовок
            | 🏢 Категория badge
            | 💰 Цена • 📍 Город
            | 👤 Автор • ⏰ Время
```

### 3. Создание объявления
Модальное окно с полями:
- Тип (radio): Ищу / Предлагаю
- Категория (dropdown)
- Заголовок (text input)
- Описание (textarea)
- Цена (number input + валюта)
- Локация (город + район)
- Фото (до 5 изображений)
- Контакты (toggles + inputs)

### 4. Детальный просмотр
- Галерея фото (swipeable)
- Полная информация
- Кнопки действий: Написать, В избранное, Позвонить, Поделиться

---

## 🏷️ Категории

| Эмодзи | Название | Цвет |
|--------|----------|------|
| 🏢 | Работа | Primary |
| 🏠 | Недвижимость | Accent |
| 🧘 | Духовные практики | Secondary |
| 📚 | Образование | Primary 80% |
| 🛍️ | Товары | Accent 80% |
| 🍃 | Питание | Secondary 80% |
| 🚗 | Транспорт | Primary 60% |
| 🎭 | Мероприятия | Accent 60% |
| 🤝 | Услуги | Secondary 60% |
| 💝 | Благотворительность | Gradient |

---

## ✨ Ключевые компоненты

### Tab Switcher (Ищу/Предлагаю)
```css
Container:
  background: rgba(255, 255, 255, 0.7)
  border-radius: 24px
  padding: 4px
  border: 1px solid rgba(255, 255, 255, 0.9)
  box-shadow: soft

Active Tab:
  background: #D67D3E
  color: white
  box-shadow: glow
```

### Category Pills
```css
Pill:
  background: rgba(255, 255, 255, 0.7)
  border-radius: 32px
  padding: 10px 16px
  display: flex
  align-items: center

Active Pill:
  background: rgba(214, 125, 62, 0.25)
  border: 2px solid #D67D3E
```

### Ad Card
```css
Card:
  background: #FFFDF9
  border-radius: 16px
  padding: 16px
  border: 1px solid rgba(255, 255, 255, 0.9)
  box-shadow: soft
  display: flex
  flex-direction: row
```

### FAB (Floating Action Button)
```css
FAB:
  width: 60px
  height: 60px
  border-radius: 30px
  background: linear-gradient(135deg, #D67D3E, #FFB142)
  box-shadow: glow
  position: fixed
  bottom: 100px
  right: 20px
```

---

## 🎭 Эффекты

### Shadows
```css
Soft:
  shadow-color: #D67D3E
  shadow-offset: 0 4px
  shadow-opacity: 0.1
  shadow-radius: 12px

Glow:
  shadow-color: #D67D3E
  shadow-offset: 0 0
  shadow-opacity: 0.5
  shadow-radius: 20px
```

### Glassmorphism
```css
backdrop-filter: blur(10px)
background: rgba(255, 255, 255, 0.7)
border: 1px solid rgba(255, 255, 255, 0.9)
```

---

## 🎬 Анимации

1. **Card Appear**: fadeInUp (300ms, ease-out)
2. **Card Press**: scale 0.98 (150ms)
3. **FAB Pulse**: scale 1→1.1→1 (2s, loop)
4. **Tab Switch**: slide (250ms, ease-in-out)

---

## 📐 Spacing & Sizing

```
Border Radius:
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px

Spacing:
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
```

---

## 🖼️ Референсы для вдохновения

### Стиль приложения:
- Ведическая эстетика (теплые тона, золото, шафран)
- Glassmorphism iOS 14+
- Tinder-like cards (для профилей знакомств)
- Премиальный минималистичный дизайн

### Примеры интерфейсов:
- Bottom Navigation: Закругленный floating стиль
- Cards: Мягкие тени и скругления
- Gradients: Теплые переходы

---

## ✅ MVP Scope (Фаза 1)

**Обязательные экраны:**
1. ✅ Главный экран со списком
2. ✅ Форма создания
3. ✅ Детальный просмотр

**Обязательные функции:**
- ✅ Переключение Ищу/Предлагаю
- ✅ 3 категории (Работа, Недвижимость, Услуги)
- ✅ Базовая карточка с фото
- ✅ Фильтр по городу

---

## 📦 Deliverables для разработки

### Экспорт из Figma/Sketch:
1. **Screens** (PNG @3x):
   - Main screen (list view)
   - Create ad (form modal)
   - Ad detail (full screen)
   - Filters (modal)

2. **Components** (reusable):
   - AdCard
   - CategoryPill
   - TabSwitcher
   - FAB
   - ImageGallery

3. **Assets**:
   - All icons (SVG)
   - Category emoji (if custom)
   - Placeholder images

4. **Specs** (JSON/CSS):
   - Color palette
   - Typography styles
   - Shadow effects
   - Border radius values
   - Spacing scale

---

## 🔗 Дополнительная документация

Полная спецификация: `DESIGN_SPEC_ADS.md`

---

**Priority**: High  
**Timeline**: MVP - 1 week  
**Platform**: React Native (iOS + Android)
