import sqlite3

db_path = 'c:/Rag-agent/script/scriptures.db'
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

cursor.execute("SELECT DISTINCT book_code FROM scripture_verses")
codes = cursor.fetchall()
print("Book Codes:", codes)

conn.close()
