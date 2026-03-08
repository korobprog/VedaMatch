# Dhama Import Guide

Стартовый пакет для импорта святых мест лежит в:

- [dhama_places_starter_import.json](/Users/mamu/Documents/vedicai/docs/dhama/dhama_places_starter_import.json)

## Что внутри

- 6 стартовых holy places для `Dhama`
- локализация `ru / en / hi`
- базовые editorial fields
- координаты, тип места, регион и tradition
- статус по умолчанию: `draft`

## Как импортировать

1. Открой admin: раздел `Dhama`
2. Нажми `Import JSON`
3. Либо загрузи файл `docs/dhama/dhama_places_starter_import.json`, либо вставь JSON вручную
4. Нажми `Import places`
5. После импорта проверь карточки, добавь изображения и только потом публикуй

## Формат

Поддерживаются оба варианта:

```json
[
  {
    "titleRu": "Вриндаван",
    "titleEn": "Vrindavan",
    "placeType": "sacred-city",
    "city": "Vrindavan",
    "state": "Uttar Pradesh",
    "country": "India",
    "latitude": 27.5744,
    "longitude": 77.6981
  }
]
```

или

```json
{
  "places": [
    {
      "titleRu": "Вриндаван",
      "titleEn": "Vrindavan",
      "placeType": "sacred-city",
      "city": "Vrindavan",
      "state": "Uttar Pradesh",
      "country": "India",
      "latitude": 27.5744,
      "longitude": 77.6981
    }
  ]
}
```

## Обязательные поля

- `titleRu`
- `placeType`
- `city`
- `state`
- `country`
- `latitude`
- `longitude`

## Поведение импорта

- import работает как `upsert by slug`
- если `slug` уже существует, запись обновится
- если `slug` отсутствует, он будет построен из `slug -> titleEn -> titleRu`
- import возвращает summary с количеством `created / updated`

## Рекомендация

Используй этот starter pack как первую волну наполнения, а не как финальный production dataset. Перед публикацией лучше:

- добавить hero image и gallery
- проверить привязки к `MediaTrack` и `Yatra`
- вычитать тексты `ru / en / hi`
- вручную проверить координаты и editorial copy
