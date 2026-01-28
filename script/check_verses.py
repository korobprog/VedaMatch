from sqlalchemy import create_engine, Table, MetaData, select

DATABASE_URL = "postgresql://raguser:ragpassword@localhost:5435/ragdb"
engine = create_engine(DATABASE_URL)
metadata = MetaData()
verses = Table('scripture_verses', metadata, autoload_with=engine)

def check_verse_structure():
    with engine.connect() as conn:
        query = select(verses.c.canto, verses.c.chapter).where(verses.c.book_code == 'sb').distinct().order_by(verses.c.canto, verses.c.chapter)
        results = conn.execute(query).fetchall()
        print("--- SB Verse Structure (Distinct Canto/Chapter) ---")
        for r in results:
            print(f"Canto {r.canto}, Ch {r.chapter}")

if __name__ == "__main__":
    check_verse_structure()
