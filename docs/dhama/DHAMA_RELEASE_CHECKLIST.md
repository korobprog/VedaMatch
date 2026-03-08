# Dhama Release Checklist

Этот чеклист нужен, чтобы довести `Dhama` от текущего рабочего MVP до реально готового production-релиза.

## 1. Импорт базового каталога

Импортировать в таком порядке:

1. [dhama_places_starter_import.json](/Users/mamu/Documents/vedicai/docs/dhama/dhama_places_starter_import.json)
2. [dhama_places_wave2_import.json](/Users/mamu/Documents/vedicai/docs/dhama/dhama_places_wave2_import.json)
3. [dhama_collections_starter_import.json](/Users/mamu/Documents/vedicai/docs/dhama/dhama_collections_starter_import.json)
4. [dhama_collections_wave2_import.json](/Users/mamu/Documents/vedicai/docs/dhama/dhama_collections_wave2_import.json)

Проверить после импорта:

- все `slug` создались корректно;
- нет дублей по одному и тому же месту;
- коллекции действительно привязались к существующим `place slug`;
- все записи остаются в `draft`, пока не пройдена ручная редактура.

## 2. Наполнение карточек мест

Для каждого `HolyPlace` проверить и заполнить:

- `titleRu`, `titleEn`, `titleHi`;
- `shortDescriptionRu`, `shortDescriptionEn`, `shortDescriptionHi`;
- `contentRu`, `contentEn`, `contentHi`;
- `placeType`, `tradition`, `city`, `state`, `country`;
- `latitude`, `longitude`;
- `heroImageUrl`;
- gallery;
- `visitingRules`;
- `bestTimeToVisit`;
- `etiquette`;
- `pilgrimageGuidance`.

Минимум перед `publish`:

- есть hero image;
- не пустой `shortDescription`;
- не пустой основной контент хотя бы в основной целевой локали;
- координаты указывают на реальное место;
- нет явных битых ссылок на фото.

## 3. Связи с другими модулями

Для каждого ключевого места проверить:

- привязаны ли релевантные `MediaTrack`;
- привязаны ли релевантные `Yatra`;
- нет ли дублирующихся связей;
- открываются ли связанные сущности из mobile detail screen.

Минимальный релизный стандарт:

- у featured places есть хотя бы 1 media link или 1 yatra link;
- у крупных collections есть хотя бы 2-3 полноценно оформленных места;
- на detail экранах не остается пустых “мертвых” секций.

## 4. Collections quality check

Для каждой `DhamaCollection` проверить:

- есть ли понятный `title` и `description` в `ru/en/hi`;
- порядок мест через `sortOrder`;
- нет ли слабых подборок с 1 местом без editorial смысла;
- выбран ли небольшой набор реально важных `featured collections`.

Рекомендация:

- не включать слишком много `featured collections` на `DhamaHome`;
- оставить 3-5 сильных подборок, а не весь каталог.

## 5. Admin workflow smoke

Проверить в admin:

- создание нового place вручную;
- редактирование существующего place;
- upload hero image;
- upload gallery item;
- import JSON мест;
- import JSON collections;
- attach/detach media;
- attach/detach yatra;
- publish / archive сценарии.

Отдельно проверить:

- валидация не дает публиковать явно пустую карточку;
- import summary показывает `created / updated`;
- повторный import не создает дубли там, где ожидается `upsert by slug`.

## 6. Mobile smoke

Прогнать на Android и iPhone:

- вход в `Dhama` из portal;
- `DhamaHome` открывается без падения;
- search работает;
- quick filters работают;
- collection card открывает `DhamaCollectionDetail`;
- collection CTA открывает карту и список мест;
- `DhamaMap` открывается;
- marker tap открывает `HolyPlaceDetail`;
- empty/error/retry states выглядят корректно;
- back navigation работает на всех экранах.

Отдельно проверить:

- поведение при медленном интернете;
- повторное открытие `DhamaMap` после retry;
- реальные hero/gallery изображения загружаются без заметных артефактов.

## 7. Контентная вычитка

Перед публикацией пройти вручную:

- `ru` тексты на естественность;
- `en` тексты на нормальный editorial tone;
- `hi` тексты на отсутствие пустых полей и грубых несоответствий;
- единый стиль названий штатов, городов, традиций и типов мест.

Нельзя выпускать:

- место с заполненным только `ru`, если на продукте заявлены `ru/en/hi`;
- коллекцию с “псевдо-локализацией” и пустым editorial смыслом;
- карточку, где gallery и hero ведут на битые URL.

## 8. Технический релизный минимум

Перед production:

- `Dhama`-specific screen tests должны быть зелеными;
- `Dhama` service tests должны быть зелеными;
- проверить, что новые `Dhama` правки не внесли lint errors;
- отдельно зафиксировать старые не связанные с `Dhama` проблемы, если они еще живы.

Известный текущий хвост:

- полный frontend typecheck все еще может упираться в pre-existing проблему вне `Dhama`, например [VKAuthModal.tsx](/Users/mamu/Documents/vedicai/frontend/components/auth/VKAuthModal.tsx).

## 9. Что считаем “готово к релизу”

`Dhama` можно считать готовым к production, если одновременно выполнено:

- импортированы и вычитаны как минимум 10-12 реальных святых мест;
- есть 3-5 качественных collections;
- у ключевых мест есть изображения;
- есть хотя бы базовые media/yatra связи;
- admin workflow проверен вручную;
- Android и iPhone smoke пройдены;
- `DhamaHome`, `DhamaCollectionDetail`, `DhamaMap`, `HolyPlaceDetail` не падают в основных сценариях.
