import sqlite3
import os

db_path = 'c:/Rag-agent/script/scriptures.db'

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

cursor.execute("SELECT COUNT(*) FROM scripture_books")
count = cursor.fetchone()[0]
print(f"Rows in scripture_books: {count}")

cursor.execute("SELECT * FROM scripture_books LIMIT 5")
rows = cursor.fetchall()
for row in rows:
    print(row)

conn.close()
