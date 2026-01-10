import sqlite3

conn = sqlite3.connect('c:/Rag-agent/script/scriptures.db')
conn.text_factory = lambda x: x.decode('utf-8', errors='replace')
cursor = conn.cursor()

# Check books
print("=== BOOKS ===")
cursor.execute("SELECT code, name_ru FROM scripture_books LIMIT 1")
books = cursor.fetchall()
for book in books:
    print(f"Code: {book[0]}, Name RU: {book[1]}")

# Check verses
print("\n=== VERSES (RU) ===")
cursor.execute("SELECT translation FROM scripture_verses WHERE language='ru' LIMIT 1")
verses = cursor.fetchall()
for verse in verses:
    print(f"Translation: {verse[0][:200]}")

# Check verses EN
print("\n=== VERSES (EN) ===")
cursor.execute("SELECT translation FROM scripture_verses WHERE language='en' LIMIT 1")
verses_en = cursor.fetchall()
for verse in verses_en:
    print(f"Translation: {verse[0][:200]}")

conn.close()
