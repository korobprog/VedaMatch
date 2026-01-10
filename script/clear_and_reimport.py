import psycopg2
import os
import sys

# PostgreSQL Connection
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
    print("Connected to PostgreSQL")
    
    # Clear existing scripture data
    print("Clearing scripture_verses...")
    pg_cursor.execute("DELETE FROM scripture_verses")
    pg_conn.commit()
    print(f"Deleted all verses")
    
    print("Clearing scripture_books...")
    pg_cursor.execute("DELETE FROM scripture_books")
    pg_conn.commit()
    print(f"Deleted all books")
    
    print("Data cleared successfully!")
    
except Exception as e:
    print(f"Error: {e}")
    pg_conn.rollback()
finally:
    pg_conn.close()
