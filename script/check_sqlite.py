import sqlite3
import os

db_path = 'script/scriptures.db'
if not os.path.exists(db_path):
    print(f"File {db_path} not found")
else:
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    print("--- SQLite Verse Counts ---")
    cursor.execute('SELECT book_code, count(*) FROM scripture_verses GROUP BY book_code')
    print(cursor.fetchall())
    
    print("\n--- CC Lila/Chapter counts in SQLite ---")
    cursor.execute('SELECT canto, chapter, count(*) FROM scripture_verses WHERE book_code="cc" GROUP BY canto, chapter')
    results = cursor.fetchall()
    for r in results:
        print(f"Canto {r[0]}, Ch {r[1]}: {r[2]} verses")
    
    conn.close()
