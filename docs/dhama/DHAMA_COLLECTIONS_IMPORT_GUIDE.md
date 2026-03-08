# Dhama Collections Import Guide

Стартовый пакет подборок лежит в:

- [dhama_collections_starter_import.json](/Users/mamu/Documents/vedicai/docs/dhama/dhama_collections_starter_import.json)

## Что внутри

- 4 стартовые тематические подборки для `Dhama`
- локализация `ru / en / hi`
- привязка мест по `linkedPlaceSlugs`
- статус по умолчанию: `draft`

## Важное условие

Сначала импортируй sacred places, и только потом импортируй collections.

Подборки ищут места по `slug`. Если place slug не найден, import вернет ошибку.

## Как импортировать

1. Открой admin: `Dhama -> Collections`
2. Нажми `Import JSON`
3. Загрузи файл `docs/dhama/dhama_collections_starter_import.json` или вставь JSON вручную
4. Нажми `Import collections`
5. После импорта проверь hero image и порядок подборок

## Формат

Поддерживаются оба варианта:

```json
[
  {
    "titleRu": "Брадж-мандал",
    "titleEn": "Braj Mandal",
    "linkedPlaceSlugs": ["vrindavan", "govardhan"]
  }
]
```

или

```json
{
  "collections": [
    {
      "titleRu": "Брадж-мандал",
      "titleEn": "Braj Mandal",
      "linkedPlaceSlugs": ["vrindavan", "govardhan"]
    }
  ]
}
```

## Поведение импорта

- import работает как `upsert by slug`
- если `slug` уже существует, подборка обновится
- если `slug` отсутствует, он будет построен из `slug -> titleEn -> titleRu`
- связанные места резолвятся по `linkedPlaceSlugs`

## Рекомендация

После импорта лучше:

- выбрать `featured` подборки для home screen
- проверить локализованные descriptions
- добавить hero image
- при необходимости скорректировать `sortOrder`
