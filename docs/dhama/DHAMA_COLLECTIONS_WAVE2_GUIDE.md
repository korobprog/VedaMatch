# Dhama Collections Wave 2 Guide

Вторая волна тематических подборок лежит в:

- [dhama_collections_wave2_import.json](/Users/mamu/Documents/vedicai/docs/dhama/dhama_collections_wave2_import.json)

## Что это дает

Этот пакет усиливает не только карту, но и `discovery` внутри `Dhama`:

- более осмысленные thematic rails на home screen
- лучшие входы для новичка
- более богатый контекст для detail screen и collections browsing

## Состав второй волны collections

- `Krishna Sacred Geography`
- `Chaitanya Pilgrimage Route`
- `Rama and Royal Dharma`
- `South Indian Vaishnava Centers`
- `Bhakti Beyond One Region`

## Важное условие

Перед импортом этой волны должны уже существовать места из:

- [dhama_places_starter_import.json](/Users/mamu/Documents/vedicai/docs/dhama/dhama_places_starter_import.json)
- [dhama_places_wave2_import.json](/Users/mamu/Documents/vedicai/docs/dhama/dhama_places_wave2_import.json)

Потому что подборки линкуются по `linkedPlaceSlugs`.

## Как импортировать

1. Импортируй `places starter pack`
2. Импортируй `places wave 2`
3. Импортируй `collections starter pack`
4. Импортируй `collections wave 2`
5. Проверь `featured`, `sortOrder` и descriptions

## Практическая рекомендация

После импорта этой волны стоит:

- выбрать 2-3 подборки как основные для `DhamaHome`
- проверить, не перегружен ли home screen количеством rails
- скорректировать тексты под продуктовый tone of voice
- затем уже переходить к `wave 3 places` или `pilgrimage guide blocks`
