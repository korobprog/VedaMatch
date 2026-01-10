# Vedabase Scripture Parser

Парсер священных писаний с сайта vedabase.io для загрузки в базу данных PostgreSQL.

## Поддерживаемые книги

- **BG** - Bhagavad-gita As It Is / Бхагавад-гита как она есть
- **SB** - Srimad-Bhagavatam / Шримад-Бхагаватам  
- **CC** - Sri Caitanya-caritamrita / Шри Чайтанья-чаритамрита

## Установка

```bash
cd C:\Rag-agent\script
pip install -r requirements.txt
```

## Использование

### Тестовый запуск (локальный SQLite)

```bash
# Тест парсинга одного стиха (BG 1.1) с сохранением в локальный SQLite
python run_parser.py --test
```

### Парсинг Bhagavad-gita

```bash
# Только английский
python run_parser.py --book bg --lang en

# Только русский
python run_parser.py --book bg --lang ru

# Оба языка
python run_parser.py --book bg --lang all

# Только одна глава
python run_parser.py --book bg --chapter 1 --lang en
```

### Парсинг Srimad-Bhagavatam

```bash
# Весь SB (очень долго!)
python run_parser.py --book sb --lang all

# Только конкретная Песнь (Canto)
python run_parser.py --book sb --canto 1 --lang en
```

### Парсинг Caitanya-caritamrita

```bash
# Весь CC
python run_parser.py --book cc --lang all

# Только конкретная лила
python run_parser.py --book cc --lila adi --lang en
```

## Подключение к PostgreSQL

### Вариант 1: Запуск на сервере

Скопируйте папку `script` на сервер и запустите:

```bash
# На сервере 45.150.9.229
export USE_LOCAL_SQLITE=false
export DB_HOST=vedamatch-ragdatabase-cog4dx
export DB_PORT=5432
export DB_USER=raguser
export DB_PASSWORD=krishna1284radha
export DB_NAME=ragdb

python run_parser.py --book bg --lang all
```

### Вариант 2: SSH туннель (локально)

```bash
# Создать SSH туннель в отдельном терминале
ssh -L 5432:vedamatch-ragdatabase-cog4dx:5432 root@45.150.9.229

# Затем в основном терминале
export USE_LOCAL_SQLITE=false
export DB_HOST=localhost
export DB_PORT=5432
python run_parser.py --book bg --lang all
```

## Структура базы данных

### Таблица `scripture_verses`

| Колонка | Тип | Описание |
|---------|-----|----------|
| id | SERIAL | Primary key |
| book_code | VARCHAR(10) | bg, sb, cc |
| canto | INTEGER | Номер песни (для SB/CC) |
| chapter | INTEGER | Номер главы |
| verse | VARCHAR(20) | Номер стиха |
| language | VARCHAR(5) | en или ru |
| devanagari | TEXT | Санскрит |
| transliteration | TEXT | Транслитерация |
| synonyms | TEXT | Пословный перевод |
| translation | TEXT | Перевод |
| purport | TEXT | Комментарий |
| source_url | TEXT | URL источника |

## Логи

Логи сохраняются в файл `parser.log` в текущей директории.
