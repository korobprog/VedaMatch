from sqlalchemy import create_engine, Table, MetaData, select, func

DATABASE_URL = "postgresql://raguser:ragpassword@localhost:5435/ragdb"
engine = create_engine(DATABASE_URL)
metadata = MetaData()
verses = Table('scripture_verses', metadata, autoload_with=engine)

def count_verses():
    with engine.connect() as conn:
        print("\n--- CC Verse Counts per Canto/Chapter ---")
        q = select(verses.c.canto, verses.c.chapter, func.count(verses.c.id)).where(verses.c.book_code == 'cc').group_by(verses.c.canto, verses.c.chapter).order_by(verses.c.canto, verses.c.chapter)
        results = conn.execute(q).fetchall()
        if not results:
            print("No verses found for CC.")
        for r in results:
            print(f"Canto {r.canto}, Ch {r.chapter}: {r[2]} verses")

if __name__ == "__main__":
    count_verses()
