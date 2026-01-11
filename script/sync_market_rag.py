import os
import json
import psycopg2
from psycopg2.extras import RealDictCursor, execute_values
import requests
from dotenv import load_dotenv
import uuid
from datetime import datetime
import time

# Load environment variables
load_dotenv(dotenv_path='../server/.env')

DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = os.getenv("DB_PORT", "5435")
DB_USER = os.getenv("DB_USER", "raguser")
DB_PASSWORD = os.getenv("DB_PASSWORD", "ragpassword")
DB_NAME = os.getenv("DB_NAME", "ragdb")

# API Configs
OPENAI_API_KEY = os.getenv("API_OPEN_AI")
GEMINI_API_KEY = os.getenv("LM_GEMINI")

# Try these URLs for embeddings
EMBEDDING_URLS = [
    "https://api.openai.com/v1/embeddings",
    "https://rvlautoai.ru/webhook/v1/embeddings",
    "https://api.routeway.ai/v1/embeddings",
]

def get_db_connection():
    return psycopg2.connect(
        host=DB_HOST,
        port=DB_PORT,
        user=DB_USER,
        password=DB_PASSWORD,
        dbname=DB_NAME
    )

def get_embedding_openai(text):
    """Fetch embedding using OpenAI-compatible API."""
    for url in EMBEDDING_URLS:
        try:
            # print(f"Trying {url}...")
            response = requests.post(
                url,
                headers={
                    "Authorization": f"Bearer {OPENAI_API_KEY}",
                    "Content-Type": "application/json"
                },
                json={
                    "input": [text],
                    "model": "text-embedding-ada-002"
                },
                timeout=10
            )
            if response.status_code == 200:
                data = response.json()
                return data['data'][0]['embedding']
            else:
                pass # print(f"Failed {url}: {response.status_code}")
        except Exception as e:
            pass # print(f"Error {url}: {e}")
    return None

def get_embedding_gemini(text):
    """Fallback to Gemini embeddings if OpenAI fails."""
    url = f"https://generativelanguage.googleapis.com/v1beta/models/embedding-001:embedContent?key={GEMINI_API_KEY}"
    try:
        response = requests.post(
            url,
            json={
                "model": "models/embedding-001",
                "content": {"parts": [{"text": text}]}
            },
            timeout=10
        )
        if response.status_code == 200:
            return response.json()['values']
    except Exception as e:
        print(f"Gemini embedding error: {e}")
    return None

def sync_products():
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    
    try:
        # 1. Get total products
        cur.execute("SELECT COUNT(*) FROM products WHERE deleted_at IS NULL AND status = 'active'")
        total = cur.fetchone()['count']
        print(f"Found {total} active products to sync.")

        # 2. Get User
        cur.execute("SELECT id FROM users WHERE role = 'superadmin' LIMIT 1")
        admin = cur.fetchone()
        user_id = admin['id'] if admin else None

        # 3. Get or create Document
        market_doc_title = "Sattva Market AI Index"
        cur.execute("SELECT id FROM documents WHERE title = %s", (market_doc_title,))
        doc = cur.fetchone()
        
        if not doc:
            doc_id = str(uuid.uuid4())
            cur.execute("""
                INSERT INTO documents (id, title, file_name, file_path, file_size, mime_type, content, user_id, status, created_at, updated_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, NOW(), NOW())
            """, (doc_id, market_doc_title, 'market_sync.txt', 'internal://market', 0, 'text/plain', 'Marketplace Product Index', user_id, 'ready'))
        else:
            doc_id = doc['id']
            cur.execute("DELETE FROM chunks WHERE document_id = %s", (doc_id,))

        # 4. Fetch products
        cur.execute("""
            SELECT p.id, p.name, p.short_description, p.category, p.base_price, p.currency, s.name as shop_name, s.city
            FROM products p
            JOIN shops s ON p.shop_id = s.id
            WHERE p.deleted_at IS NULL AND p.status = 'active'
        """)
        products = cur.fetchall()

        # 5. Process
        chunks_data = []
        for idx, p in enumerate(products):
            text = f"Товар: {p['name']}. Категория: {p['category']}. Описание: {p['short_description']}. Цена: {p['base_price']} {p['currency']}. Магазин: {p['shop_name']} ({p['city']})."
            
            print(f"[{idx+1}/{len(products)}] Indexing: {p['name']}")
            
            # Try AI providers
            embedding = get_embedding_openai(text)
            if not embedding:
                embedding = get_embedding_gemini(text)
                
            if embedding:
                chunks_data.append((
                    str(uuid.uuid4()),
                    doc_id,
                    text,
                    idx,
                    json.dumps(embedding),
                    json.dumps({"product_id": p['id'], "category": p['category']}),
                    datetime.now(),
                    datetime.now()
                ))
            
            if len(chunks_data) >= 10:
                execute_values(cur, """
                    INSERT INTO chunks (id, document_id, content, index, embedding, metadata, created_at, updated_at)
                    VALUES %s
                """, chunks_data)
                conn.commit()
                chunks_data = []

        if chunks_data:
            execute_values(cur, """
                INSERT INTO chunks (id, document_id, content, index, embedding, metadata, created_at, updated_at)
                VALUES %s
            """, chunks_data)
            conn.commit()

        print("Sync completed successfully!")

    except Exception as e:
        print(f"Sync error: {e}")
        conn.rollback()
    finally:
        cur.close()
        conn.close()

if __name__ == "__main__":
    sync_products()
