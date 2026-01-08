# Спецификация дизайна для VedicAI - Сервис объявлений

## 🎨 Текущий дизайн приложения

### Цветовая палитра (Modern Vedic Theme)

**Основные цвета:**
- **Background Primary**: `#FFF8F0` (Soft Cream) - мягкий кремовый фон
- **Background Secondary**: `#FFFDF9` - еще более светлый оттенок
- **Primary**: `#D67D3E` (Saffron Deep) - глубокий шафрановый цвет
- **Secondary**: `#FFB142` (Marigold Gold) - золото бархатцев
- **Accent**: `#9A2A2A` (Sanguine) - акцентный бордовый

**Цвета текста:**
- **Text Primary**: `#2A2A2A` (Dark Grey) - основной темно-серый
- **Text Secondary**: `#6B5B53` (Brownish Grey) - коричневато-серый
- **Text Light**: `#FFFFFF` - белый текст

**Эффекты:**
- **Glass**: `rgba(255, 255, 255, 0.7)` - стекломорфизм с прозрачностью 70%
- **Glass Border**: `rgba(255, 255, 255, 0.9)` - граница стеклянных элементов
- **Shadow**: оттенки `#D67D3E` для создания мягкой тени
- **Gradients**: 
  - Основной: `#D67D3E` → `#FFB142`
  - AI кнопка: `#9A2A2A` → `#D67D3E`

### Типографика

**Шрифты:**
- **Header**: Playfair Display, 28px, bold, letter-spacing: 0.5px
- **Subheader**: Cinzel, 18px, medium, letter-spacing: 2px
- **Body**: Nunito, 16px
- **Caption**: Nunito, 12px

### Тени

1. **Soft Shadow**: 
   - Color: `#D67D3E`
   - Offset: (0, 4)
   - Opacity: 0.1
   - Radius: 12
   - Elevation: 5

2. **Medium Shadow**:
   - Color: `#000`
   - Offset: (0, 4)
   - Opacity: 0.15
   - Radius: 8
   - Elevation: 8

3. **Glow Effect**:
   - Color: `#D67D3E`
   - Offset: (0, 0)
   - Opacity: 0.5
   - Radius: 20
   - Elevation: 10

### Скругления (Border Radius)

- **Small**: 8px
- **Medium**: 16px
- **Large**: 24px
- **Extra Large**: 32px

### Отступы (Spacing)

- **XS**: 4px
- **SM**: 8px
- **MD**: 16px
- **LG**: 24px
- **XL**: 32px

### Компоненты дизайна

#### 1. Glassmorphic Bottom Navigation
- **Фон**: Полупрозрачное стекло с размытием
- **Высота**: 70px
- **Border Radius**: 35px (полностью скругленная)
- **Позиция**: Floating, 30px от низа экрана, 20px от краев
- **Тени**: Soft shadow для эффекта возвышения
- **Иконки**: Emoji с размером 26-28px
- **Активное состояние**: 
  - Background: `rgba(214, 125, 62, 0.15)`
  - Индикатор: точка 5x5px цвета primary

#### 2. Карточки профилей (Dating Cards)
- **Фон**: Theme header color
- **Border**: Theme border color
- **Изображения**: 
  - Размер: full width × 350px
  - Border radius: соответствует карточке
  - Градиент сверху: `rgba(0,0,0,0.4)` → прозрачный
- **Пагинация**: Белые полоски сверху изображения
- **Информация**:
  - Имя: Bold, theme.text
  - Город: theme.subText
  - Путь/традиция: theme.accent
  - Био: theme.text, максимум 3 строки

#### 3. Кнопки действий
- **Основная кнопка**: 
  - Background: theme.button
  - Text: theme.buttonText
  - Padding: 12px 24px
  - Border radius: MD (16px)
  
- **Вторичная кнопка**:
  - Background: transparent
  - Border: 1px solid theme.borderColor
  - Text: theme.text

#### 4. Модальные окна
- **Overlay**: Semi-transparent dark background
- **Content**: 
  - Background: theme.header
  - Border radius: 20px
  - Padding: 20px
  - Max width: 95% экрана
  - Shadows: Medium shadow

#### 5. Хедер
- **Высота**: Адаптивная (iOS: 60px padding-top, Android: 20px)
- **Layout**: Flexbox с space-between
- **Заголовок**: 
  - Font: Cinzel
  - Size: 18px
  - Color: theme.primary
  - Letter-spacing: 1.5px
  - Text: uppercase

---

## 📢 Дизайн сервиса объявлений (ADS)

### Концепция

Сервис объявлений в ведическом стиле с разделением на **"Ищу"** и **"Предлагаю"** для удобства пользователей. Дизайн должен соответствовать общей эстетике приложения с использованием Modern Vedic Theme.

### Структура разделов

#### Основные категории:

1. **🏢 Работа / Карьера**
   - Ищу: Вакансии, проекты, сотрудничество
   - Предлагаю: Услуги, резюме, навыки

2. **🏠 Недвижимость**
   - Ищу: Квартиру, дом, комнату, аренда
   - Предлагаю: Продажа, аренда, обмен

3. **🧘 Духовные практики**
   - Ищу: Учителя, группы, ретриты
   - Предлагаю: Курсы йоги, медитации, консультации

4. **📚 Образование**
   - Ищу: Курсы, наставника, обучение
   - Предлагаю: Преподавание, мастер-классы, вебинары

5. **🛍️ Товары**
   - Ищу: Покупка ведических товаров
   - Предлагаю: Продажа книг, мурти, одежды, благовоний

6. **🍃 Питание**
   - Ищу: Прасад, здоровое питание
   - Предлагаю: Доставка прасада, кулинарные услуги

7. **🚗 Транспорт**
   - Ищу: Попутчиков, аренду авто
   - Предлагаю: Поездки, совместные путешествия

8. **🎭 Мероприятия**
   - Ищу: Участие в киртанах, фестивалях
   - Предлагаю: Организация событий, совместные поездки

9. **🤝 Услуги**
   - Ищу: Помощь, услуги специалистов
   - Предлагаю: Любые услуги (ремонт, уборка, и т.д.)

10. **💝 Благотворительность**
    - Ищу: Помощь нуждающимся
    - Предлагаю: Волонтерство, пожертвования

### Дизайн интерфейса

#### 1. Главный экран объявлений (AdsScreen)

```
┌─────────────────────────────────────┐
│  Header: "ОБЪЯВЛЕНИЯ" (Cinzel)     │
│  [👤]     ОБЪЯВЛЕНИЯ        [🔔]   │
└─────────────────────────────────────┘
│                                     │
│  ┌─── Tab Switcher ────────────┐  │
│  │ [📋 Ищу] [📢 Предлагаю]    │  │
│  └─────────────────────────────┘  │
│                                     │
│  ┌─── Filter Bar ──────────────┐  │
│  │ [🏷️ Все] [По категориям ▼]  │  │
│  │ [📍 Город ▼] [🔍 Поиск]     │  │
│  └─────────────────────────────┘  │
│                                     │
│  ┌─── Category Pills ───────────┐ │
│  │ 🏢 💼 🧘 📚 🛍️ 🍃 🚗 🎭 ... │ │
│  └─────────────────────────────┘  │
│                                     │
│  ┌─────────────────────────────┐  │
│  │ [📷]  Объявление 1          │  │
│  │       Ищу квартиру в Москве │  │
│  │       20,000 ₽ • Москва     │  │
│  │       👤 Имя • 2 часа назад │  │
│  └─────────────────────────────┘  │
│                                     │
│  ┌─────────────────────────────┐  │
│  │ [📷]  Объявление 2          │  │
│  │       Предлагаю уроки йоги  │  │
│  │       1,500 ₽/час • СПб     │  │
│  │       👤 Имя • 5 часов назад│  │
│  └─────────────────────────────┘  │
│                                     │
│  [+ Создать объявление] (FAB)      │
│                                     │
│  [Glassmorphic Bottom Nav]         │
└─────────────────────────────────────┘
```

#### 2. Карточка объявления

**Структура:**

```typescript
Card {
  flexDirection: 'row',
  padding: 16,
  backgroundColor: theme.backgroundSecondary,
  borderRadius: layout.borderRadius.md,
  borderWidth: 1,
  borderColor: theme.glassBorder,
  marginVertical: 8,
  marginHorizontal: 16,
  ...shadows.soft
}

// Левая часть - изображение
ImageContainer {
  width: 80,
  height: 80,
  borderRadius: layout.borderRadius.sm,
  overflow: 'hidden',
  backgroundColor: theme.glass,
  justifyContent: 'center',
  alignItems: 'center'
}

// Правая часть - информация
InfoContainer {
  flex: 1,
  marginLeft: 12,
  justifyContent: 'space-between'
}

// Заголовок
Title {
  fontFamily: typography.body.fontFamily,
  fontSize: 16,
  fontWeight: '600',
  color: theme.text,
  marginBottom: 4
}

// Категория badge
CategoryBadge {
  backgroundColor: 'rgba(214, 125, 62, 0.15)',
  paddingHorizontal: 8,
  paddingVertical: 4,
  borderRadius: 12,
  alignSelf: 'flex-start',
  marginBottom: 6
}

// Цена и локация
MetaRow {
  flexDirection: 'row',
  alignItems: 'center',
  marginBottom: 4
}

Price {
  fontSize: 15,
  fontWeight: 'bold',
  color: theme.accent
}

Location {
  fontSize: 12,
  color: theme.textSecondary,
  marginLeft: 8
}

// Автор и время
Footer {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between'
}

Author {
  fontSize: 12,
  color: theme.textSecondary
}

Time {
  fontSize: 11,
  color: theme.textSecondary
}
```

#### 3. Tab Switcher (Ищу/Предлагаю)

```typescript
TabContainer {
  flexDirection: 'row',
  backgroundColor: theme.glass,
  borderRadius: layout.borderRadius.lg,
  padding: 4,
  marginHorizontal: 16,
  marginVertical: 12,
  borderWidth: 1,
  borderColor: theme.glassBorder,
  ...shadows.soft
}

Tab {
  flex: 1,
  paddingVertical: 12,
  borderRadius: layout.borderRadius.md,
  alignItems: 'center'
}

ActiveTab {
  backgroundColor: theme.primary,
  ...shadows.glow
}

TabText {
  fontFamily: typography.body.fontFamily,
  fontSize: 14,
  fontWeight: '600',
  color: theme.text // или white для активного
}
```

#### 4. Category Pills (Горизонтальный скролл)

```typescript
CategoryPillsContainer {
  paddingHorizontal: 16,
  paddingVertical: 8
}

CategoryPill {
  backgroundColor: theme.glass,
  borderRadius: layout.borderRadius.xl,
  paddingHorizontal: 16,
  paddingVertical: 10,
  marginRight: 8,
  borderWidth: 1,
  borderColor: theme.glassBorder,
  flexDirection: 'row',
  alignItems: 'center'
}

ActiveCategoryPill {
  backgroundColor: 'rgba(214, 125, 62, 0.25)',
  borderColor: theme.primary,
  borderWidth: 2
}

CategoryEmoji {
  fontSize: 20,
  marginRight: 6
}

CategoryLabel {
  fontFamily: typography.body.fontFamily,
  fontSize: 13,
  color: theme.text,
  fontWeight: '500'
}
```

#### 5. Floating Action Button (Создать объявление)

```typescript
FAB {
  position: 'absolute',
  bottom: 100, // Над bottom navigation
  right: 20,
  width: 60,
  height: 60,
  borderRadius: 30,
  backgroundColor: theme.primary,
  justifyContent: 'center',
  alignItems: 'center',
  ...shadows.glow
}

// С градиентом
FABGradient {
  LinearGradient: {
    colors: [theme.gradientStart, theme.gradientEnd],
    start: {x: 0, y: 0},
    end: {x: 1, y: 1}
  }
}

FABIcon {
  fontSize: 28,
  color: theme.textLight
}
```

#### 6. Форма создания объявления (Modal)

```
┌─────────────────────────────────────┐
│  Новое объявление          [✕]     │
├─────────────────────────────────────┤
│                                     │
│  ┌─── Тип объявления ───────────┐ │
│  │ ⚪ Ищу     ⚪ Предлагаю       │ │
│  └─────────────────────────────┘  │
│                                     │
│  Категория                          │
│  [Выберите категорию ▼]            │
│                                     │
│  Заголовок *                        │
│  [____________________________]    │
│                                     │
│  Описание *                         │
│  [____________________________]    │
│  [____________________________]    │
│  [____________________________]    │
│                                     │
│  Цена                               │
│  [________] [₽ ▼]                  │
│  ☐ Договорная  ☐ Бесплатно         │
│                                     │
│  Местоположение                     │
│  [Город ▼]  [Район (опционально)] │
│                                     │
│  Фотографии (до 5)                  │
│  [📷] [📷] [📷] [📷] [📷]          │
│                                     │
│  Контакты                           │
│  ☑ Показать профиль                 │
│  ☐ Добавить телефон                 │
│  [____________________________]    │
│  ☐ Добавить email                   │
│  [____________________________]    │
│                                     │
│  [Отмена]  [Опубликовать]          │
│                                     │
└─────────────────────────────────────┘
```

#### 7. Детальный просмотр объявления

```
┌─────────────────────────────────────┐
│  [←]                        [⋮]     │
│                                     │
│  ┌─────────────────────────────┐  │
│  │                             │  │
│  │    Фото галерея (swipe)     │  │
│  │         [1/5]               │  │
│  │                             │  │
│  └─────────────────────────────┘  │
│                                     │
│  🏢 Категория badge                │
│  Заголовок объявления              │
│  3,500 ₽ • Москва, Центр           │
│                                     │
│  ───────────────────────────────   │
│                                     │
│  Описание                           │
│  Подробная информация об            │
│  объявлении. Может быть             │
│  многострочной и содержать          │
│  все необходимые детали.            │
│                                     │
│  ───────────────────────────────   │
│                                     │
│  👤 Автор: Имя пользователя        │
│     Дата размещения: 2 часа назад  │
│                                     │
│  ───────────────────────────────   │
│                                     │
│  [💬 Написать]  [⭐ В избранное]   │
│  [📞 Позвонить] [↗️ Поделиться]    │
│                                     │
└─────────────────────────────────────┘
```

### Цветовое кодирование категорий

Для улучшения навигации, каждая категория может иметь свой акцентный цвет (на базе основной палитры):

1. **Работа**: `#D67D3E` (Primary)
2. **Недвижимость**: `#9A2A2A` (Accent)
3. **Духовные практики**: `#FFB142` (Secondary)
4. **Образование**: `#D67D3E` с opacity 0.8
5. **Товары**: `#9A2A2A` с opacity 0.8
6. **Питание**: `#FFB142` с opacity 0.8
7. **Транспорт**: `#D67D3E` с opacity 0.6
8. **Мероприятия**: `#9A2A2A` с opacity 0.6
9. **Услуги**: `#FFB142` с opacity 0.6
10. **Благотворительность**: Золотой градиент

### Микро-анимации

#### 1. Появление карточки
```typescript
fadeInUp: {
  from: { opacity: 0, translateY: 20 },
  to: { opacity: 1, translateY: 0 },
  duration: 300,
  easing: 'ease-out'
}
```

#### 2. Нажатие на карточку
```typescript
cardPress: {
  scale: 0.98,
  duration: 150
}
```

#### 3. FAB пульсация (привлечение внимания)
```typescript
pulse: {
  scale: [1, 1.1, 1],
  duration: 2000,
  loop: true
}
```

#### 4. Переключение табов
```typescript
tabSwitch: {
  slideX: true,
  duration: 250,
  easing: 'ease-in-out'
}
```

### Адаптивность

#### Телефон (Portrait)
- Одна колонка карточек
- Горизонтальный скролл для категорий
- FAB в правом нижнем углу

#### Телефон (Landscape)
- Две колонки карточек
- Компактный header
- Фиксированные категории вверху

#### Планшет
- Две-три колонки карточек
- Боковая панель фильтров (опционально)
- Увеличенные карточки

### Особенности UX

1. **Pull-to-refresh**: Обновление списка объявлений
2. **Infinite scroll**: Подгрузка при достижении конца
3. **Skeleton loading**: Плейсхолдеры при загрузке
4. **Error states**: Изображения с fallback
5. **Empty states**: Красивые сообщения "Нет объявлений"
6. **Haptic feedback**: При нажатиях на iOS/Android
7. **Swipe actions**: Свайп влево - в избранное, вправо - поделиться

### Интеграция с существующим функционалом

1. **Чат**: Кнопка "Написать" открывает чат с автором
2. **Профиль**: Показ аватара и имени автора
3. **Локация**: Фильтрация по городу из профиля
4. **AI помощник**: Предложения по улучшению текста объявления
5. **Уведомления**: О новых объявлениях в интересующих категориях

### Модерация и безопасность

1. **Статусы объявлений**:
   - 🟡 На модерации
   - 🟢 Активно
   - 🔴 Отклонено
   - ⚫ Архив

2. **Жалобы**: Кнопка "Пожаловаться" в меню (⋮)

3. **Автоудаление**: Через 30 дней без активности

---

## 🎯 Приоритеты реализации

### Фаза 1 (MVP):
- ✅ Основные категории (Работа, Недвижимость, Услуги)
- ✅ Разделение "Ищу/Предлагаю"
- ✅ Простая карточка объявления
- ✅ Форма создания объявления
- ✅ Базовая фильтрация по городу

### Фаза 2:
- 🔲 Все 10 категорий
- 🔲 Галерея фотографий
- 🔲 Детальный просмотр
- 🔲 Избранное
- 🔲 Расширенные фильтры

### Фаза 3:
- 🔲 Модерация
- 🔲 Уведомления
- 🔲 AI-подсказки
- 🔲 Аналитика просмотров
- 🔲 Продвижение объявлений

---

## 📝 Технические детали для Stitch

### Figma/Sketch файл должен содержать:

1. **Screens**:
   - Главный экран объявлений (список)
   - Создание объявления (форма)
   - Детальный просмотр
   - Фильтры (modal)

2. **Components**:
   - AdCard (карточка объявления)
   - CategoryPill
   - TabSwitcher
   - FAB
   - ImageGallery

3. **Color Palette**:
   - Все цвета из ModernVedicTheme
   - Вариации для категорий

4. **Typography Styles**:
   - Все стили из typography

5. **Effects**:
   - Shadows (soft, medium, glow)
   - Glassmorphism effects

6. **Icons & Emoji**:
   - Используемые эмодзи для категорий
   - UI иконки (стрелки, кнопки)

### Экспорт:
- SVG для иконок
- PNG @1x, @2x, @3x для изображений
- CSS/JSON для стилей
- Спецификация компонентов для разработки

---

**Дата создания**: 2026-01-08  
**Версия**: 1.0  
**Автор**: VedicAI Team
