import psycopg2

try:
    conn = psycopg2.connect(
        host="45.150.9.229",
        port="5435",
        user="raguser",
        password="ragpassword",
        database="ragdb",
        connect_timeout=10
    )
    print("Successfully connected to the production database!")
    cur = conn.cursor()
    cur.execute("SELECT code, name_ru FROM scripture_books")
    print("Books in Prod DB:", cur.fetchall())
    conn.close()
except Exception as e:
    print(f"Failed to connect to production DB: {e}")
