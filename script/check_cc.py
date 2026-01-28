from sqlalchemy import create_engine, Table, MetaData, select

DATABASE_URL = "postgresql://raguser:ragpassword@localhost:5435/ragdb"
engine = create_engine(DATABASE_URL)
metadata = MetaData()
verses = Table('scripture_verses', metadata, autoload_with=engine)
chapters = Table('scripture_chapters', metadata, autoload_with=engine)
cantos = Table('scripture_cantos', metadata, autoload_with=engine)

def check_cc_structure():
    with engine.connect() as conn:
        print("\n--- CC Verse Structure (Distinct Canto/Chapter) ---")
        q_verses = select(verses.c.canto, verses.c.chapter).where(verses.c.book_code == 'cc').distinct().order_by(verses.c.canto, verses.c.chapter)
        res_verses = conn.execute(q_verses).fetchall()
        for r in res_verses:
            print(f"Verse: Canto {r.canto}, Ch {r.chapter}")
        
        print("\n--- CC Chapter Structure ---")
        q_chapters = select(chapters.c.canto, chapters.c.chapter, chapters.c.title_ru).where(chapters.c.book_code == 'cc').order_by(chapters.c.canto, chapters.c.chapter)
        res_chapters = conn.execute(q_chapters).fetchall()
        for r in res_chapters:
            print(f"Chapter Meta: Canto {r.canto}, Ch {r.chapter} - {r.title_ru}")

        print("\n--- CC Canto Structure ---")
        q_cantos = select(cantos.c.canto, cantos.c.title_ru).where(cantos.c.book_code == 'cc').order_by(cantos.c.canto)
        res_cantos = conn.execute(q_cantos).fetchall()
        for r in res_cantos:
            print(f"Canto Meta: {r.canto} - {r.title_ru}")

if __name__ == "__main__":
    check_cc_structure()
