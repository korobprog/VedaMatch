# Dhama Wave 2 Import Guide

Вторая волна sacred places лежит в:

- [dhama_places_wave2_import.json](/Users/mamu/Documents/vedicai/docs/dhama/dhama_places_wave2_import.json)

## Что внутри

- 7 дополнительных holy places для расширения India-wide карты `Dhama`
- локализация `ru / en / hi`
- базовые editorial fields
- статус по умолчанию: `draft`

Состав второй волны:

- `Dwarka`
- `Udupi`
- `Pandharpur`
- `Srirangam`
- `Melkote`
- `Nathdwara`
- `Ayodhya`

## Как использовать

1. Сначала импортируй starter pack:
   - [dhama_places_starter_import.json](/Users/mamu/Documents/vedicai/docs/dhama/dhama_places_starter_import.json)
2. Затем импортируй `wave 2`
3. После импорта:
   - добавь hero image и gallery
   - проверь тексты
   - привяжи `MediaTrack` и `Yatra`
   - публикуй постепенно, не все сразу

## Зачем эта волна

Этот пакет нужен, чтобы карта `Dhama` перестала выглядеть как каталог только из Браджа и Бенгалии. Он расширяет географию:

- запад Индии
- юг Индии
- центральные паломнические маршруты
- более широкий вайшнавский контекст

## Проверка перед публикацией

Перед publish стоит отдельно просмотреть:

- consistency `ru / en / hi`
- корректность `tradition`
- уместность `placeType`
- качество иконографики и cover images
- связку с collections после расширения каталога
