from sqlalchemy import create_engine, Table, MetaData, select, func

DATABASE_URL = "postgresql://raguser:ragpassword@localhost:5435/ragdb"
engine = create_engine(DATABASE_URL)
metadata = MetaData()
chapters = Table('scripture_chapters', metadata, autoload_with=engine)

def check_duplicates():
    with engine.connect() as conn:
        query = select(
            chapters.c.book_code, 
            chapters.c.canto, 
            chapters.c.chapter, 
            func.count().label('count')
        ).group_by(
            chapters.c.book_code, 
            chapters.c.canto, 
            chapters.c.chapter
        ).having(func.count() > 1)
        
        results = conn.execute(query).fetchall()
        print("--- Duplicates Found ---")
        for r in results:
            print(f"Book: {r.book_code}, Canto: {r.canto}, Ch: {r.chapter}, Count: {r.count}")
            # Show the titles for these duplicates
            sub_q = select(chapters).where(
                (chapters.c.book_code == r.book_code) & 
                (chapters.c.canto == r.canto) & 
                (chapters.c.chapter == r.chapter)
            )
            sub_res = conn.execute(sub_q).fetchall()
            for sr in sub_res:
                print(f"  - {sr.title_ru}")

if __name__ == "__main__":
    check_duplicates()
