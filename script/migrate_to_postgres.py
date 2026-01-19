import sqlite3
import psycopg2
import os
import sys

# SQLite Source
SQLITE_DB_PATH = 'c:/Rag-agent/script/scriptures.db'

# PostgreSQL Destination (Getting from Env or Default)
DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = os.getenv("DB_PORT", "5435")
DB_USER = os.getenv("DB_USER", "raguser")
DB_PASSWORD = os.getenv("DB_PASSWORD", "ragpassword")
DB_NAME = os.getenv("DB_NAME", "ragdb")

try:
    pg_conn = psycopg2.connect(
        host=DB_HOST,
        port=DB_PORT,
        user=DB_USER,
        password=DB_PASSWORD,
        dbname=DB_NAME,
        client_encoding='UTF8'
    )
    pg_cursor = pg_conn.cursor()
    print("Connected to PostgreSQL with UTF-8 encoding")
except Exception as e:
    print(f"Failed to connect to PostgreSQL: {e}")
    sys.exit(1)

if not os.path.exists(SQLITE_DB_PATH):
    print(f"SQLite file not found: {SQLITE_DB_PATH}")
    sys.exit(1)

sqlite_conn = sqlite3.connect(SQLITE_DB_PATH)
sqlite_conn.text_factory = str  # Ensure UTF-8 handling
sqlite_cursor = sqlite_conn.cursor()
print(f"Connected to SQLite: {SQLITE_DB_PATH} with UTF-8 support")

def migrate_books():
    print("Migrating Books...")
    sqlite_cursor.execute("SELECT code, name_en, name_ru, description_en, description_ru FROM scripture_books")
    books = sqlite_cursor.fetchall()

    if not books:
        print("No books found in SQLite. Checking for distinct codes in verses...")
        sqlite_cursor.execute("SELECT DISTINCT book_code FROM scripture_verses")
        codes = sqlite_cursor.fetchall()
        for code_tuple in codes:
            code = code_tuple[0]
            if code == 'bg':
                books.append(('bg', 'Bhagavad-gita As It Is', 'Бхагавад-гита', 'The Song of God', 'Песнь Бога'))
            else:
                 books.append((code, f'Book {code}', f'Книга {code}', '', ''))
    
    for book in books:
        code, name_en, name_ru, desc_en, desc_ru = book
        # Insert or Update
        pg_cursor.execute("""
            INSERT INTO scripture_books (code, name_en, name_ru, description_en, description_ru, created_at, updated_at)
            VALUES (%s, %s, %s, %s, %s, NOW(), NOW())
            ON CONFLICT (code) DO UPDATE SET
                name_en = EXCLUDED.name_en,
                name_ru = EXCLUDED.name_ru,
                description_en = EXCLUDED.description_en,
                description_ru = EXCLUDED.description_ru,
                updated_at = NOW();
        """, (code, name_en, name_ru, desc_en, desc_ru))
    
    pg_conn.commit()
    print(f"Migrated {len(books)} books.")

def migrate_verses():
    print("Migrating Verses (this might take a while)...")
    # Fetching necessary fields from sqlite
    # Note: SQLite `id` is ignored, we let Postgres generate new IDs or use a composite key logic if needed. 
    # But usually we just import data.
    # Schema: id, book_code, canto, chapter, verse, language, devanagari, transliteration, synonyms, translation, purport, source_url, verse_reference
    
    sqlite_cursor.execute("""
        SELECT book_code, canto, chapter, verse, language, devanagari, transliteration, synonyms, translation, purport, source_url, verse_reference 
        FROM scripture_verses
    """)
    
    verses = sqlite_cursor.fetchall()
    count = 0
    BATCH_SIZE = 1000
    
    for verse_data in verses:
        pg_cursor.execute("""
            INSERT INTO scripture_verses (
                book_code, canto, chapter, verse, language, 
                devanagari, transliteration, synonyms, translation, purport, 
                source_url, verse_reference, created_at, updated_at
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW(), NOW())
        """, verse_data)
        count += 1
        if count % BATCH_SIZE == 0:
            pg_conn.commit()
            print(f"Migrated {count} verses...")

    pg_conn.commit()
    print(f"Finished migrating {count} verses.")

if __name__ == "__main__":
    try:
        migrate_books()
        migrate_verses()
        print("Migration completed successfully!")
    except Exception as e:
        print(f"An error occurred: {e}")
        pg_conn.rollback()
    finally:
        sqlite_conn.close()
        pg_conn.close()
