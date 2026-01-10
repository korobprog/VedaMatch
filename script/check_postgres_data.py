import psycopg2
import os

DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = os.getenv("DB_PORT", "5435")
DB_USER = os.getenv("DB_USER", "raguser")
DB_PASSWORD = os.getenv("DB_PASSWORD", "ragpassword")
DB_NAME = os.getenv("DB_NAME", "ragdb")

conn = psycopg2.connect(
    host=DB_HOST,
    port=DB_PORT,
    user=DB_USER,
    password=DB_PASSWORD,
    dbname=DB_NAME,
    client_encoding='UTF8'
)

cursor = conn.cursor()

print("=== CHECKING PostgreSQL DATA ===")
print("\n1. Books:")
cursor.execute("SELECT code, name_ru FROM scripture_books LIMIT 1")
for row in cursor.fetchall():
    print(f"Code: {row[0]}, Name RU: {row[1]}")

print("\n2. Verses RU (first verse):")
cursor.execute("SELECT chapter, verse, translation FROM scripture_verses WHERE book_code='bg' AND language='ru' ORDER BY id LIMIT 1")
for row in cursor.fetchall():
    print(f"Chapter: {row[0]}, Verse: {row[1]}")
    print(f"Translation: {row[2][:200]}")

print("\n3. Verses EN (first verse):")
cursor.execute("SELECT chapter, verse, translation FROM scripture_verses WHERE book_code='bg' AND language='en' ORDER BY id LIMIT 1")
for row in cursor.fetchall():
    print(f"Chapter: {row[0]}, Verse: {row[1]}")
    print(f"Translation: {row[2][:200]}")

print("\n4. Count by language:")
cursor.execute("SELECT language, COUNT(*) FROM scripture_verses GROUP BY language ORDER BY language")
for row in cursor.fetchall():
    print(f"{row[0]}: {row[1]} verses")

conn.close()
