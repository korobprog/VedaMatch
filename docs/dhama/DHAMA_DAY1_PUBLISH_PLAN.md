# Dhama Day 1 Publish Plan

Это рабочий план на первый день реального наполнения `Dhama`, если цель не распылиться и получить первый strong release set.

## Что публикуем первым

### Places

1. `vrindavan`
2. `mayapur`
3. `puri`
4. `govardhan`
5. `tirumala`

### Collections

1. `braj-mandal`
2. `navadvipa-dhama`
3. `jagannath-ksetra`

Этого достаточно, чтобы уже выглядели живыми:

- `DhamaHome`
- `DhamaCollectionDetail`
- `DhamaMap`
- `HolyPlaceDetail`

## Почему именно этот набор

- `Vrindavan`, `Mayapur`, `Puri` дают три самых сильных духовных входа в продукт.
- `Govardhan` усиливает `Braj Mandal` и показывает сценарий парикрамы.
- `Tirumala` расширяет каталог за пределы одного региона и делает карту менее “локальной”.
- `Braj Mandal`, `Navadvipa Dhama`, `Jagannath Ksetra` создают понятный discovery flow без перегруза home-экрана.

## Что заполнить в первую очередь по каждому place

Для первого publish не нужно доводить все идеально. Нужен вот этот minimum:

- `titleRu`, `titleEn`, `titleHi`
- `shortDescriptionRu`, `shortDescriptionEn`, `shortDescriptionHi`
- `descriptionRu`, `descriptionEn`, `descriptionHi`
- `city`, `state`, `country`
- `latitude`, `longitude`
- `placeType`
- `tradition`
- `heroImageUrl`
- минимум `2` gallery image
- минимум `1` `MediaTrack` link или `1` `Yatra` link

## Minimum publish standard по первым 5 местам

### Vrindavan

Должно быть:

- сильный hero image с узнаваемым вайшнавским визуалом;
- минимум 3 gallery image;
- хотя бы 1 аудио о Вриндаване;
- хотя бы 1 ятра, если такая уже есть в системе;
- отмечен как `featured`.

### Mayapur

Должно быть:

- hero image, где место легко узнается;
- минимум 3 gallery image;
- хотя бы 1 аудио о Чайтанье / Навадвипе / Маяпуре;
- включение в `navadvipa-dhama`;
- отмечен как `featured`.

### Puri

Должно быть:

- hero image;
- минимум 2 gallery image;
- хотя бы 1 аудио о Джаганнатхе, Пури или Ратха-ятре;
- включение в `jagannath-ksetra`;
- отмечен как `featured`.

### Govardhan

Должно быть:

- hero image;
- минимум 2 gallery image;
- в тексте явно упомянута парикрама;
- включение в `braj-mandal`;
- желательно хотя бы 1 media link.

### Tirumala

Должно быть:

- hero image;
- минимум 2 gallery image;
- аккуратная базовая editorial card в `ru/en/hi`;
- хотя бы одно качественное описание best practices / etiquette;
- не обязательно `featured`, если home уже перегружен.

## Что делать с collections в первый день

### Braj Mandal

Проверить:

- есть `Vrindavan` и `Govardhan`;
- описание не слишком общее;
- стоит `featured = true`.

### Navadvipa Dhama

Проверить:

- есть `Mayapur` и `Nabadwip`;
- хотя бы `Mayapur` доведен до publish-ready состояния;
- стоит `featured = true`.

### Jagannath Ksetra

Проверить:

- есть `Puri`;
- если в первый день коллекция состоит из одного места, это допустимо только как временный релизный компромисс;
- если остается single-place collection, лучше не делать ее слишком доминирующей на home.

## Что можно не делать в первый день

- не нужно сразу публиковать весь wave 2;
- не нужно идеально доводить все collections;
- не нужно закрывать весь India catalog;
- не нужно ждать полных связей у каждого места.

Главное на день 1:

- 5 качественных places;
- 3 понятных collections;
- hero + gallery + локализация + базовые связи;
- ручной mobile smoke.

## Порядок действий на сегодня

1. Импортировать starter + wave2 places.
2. Импортировать starter + wave2 collections.
3. Открыть `vrindavan`, `mayapur`, `puri`, `govardhan`, `tirumala`.
4. Дозалить hero и gallery.
5. Добавить media/yatra links хотя бы на ключевые 3 места.
6. Довести `braj-mandal`, `navadvipa-dhama`, `jagannath-ksetra`.
7. Опубликовать только этот набор.
8. Прогнать mobile smoke.

## Что считать успехом в конце дня

День можно считать успешным, если:

- в `DhamaHome` не стыдно показать первые карточки;
- на карте видно не пустую демо-структуру, а реальные места;
- подборки открываются осмысленно;
- detail screens содержат живой контент, а не заготовки;
- пользователь может пройти путь:
  - `DhamaHome`
  - `Collection`
  - `Map`
  - `Place detail`
  без ощущения незаполненного прототипа.
