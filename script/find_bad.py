from sqlalchemy import create_engine, Table, MetaData, select

DATABASE_URL = "postgresql://raguser:ragpassword@localhost:5435/ragdb"
engine = create_engine(DATABASE_URL)
metadata = MetaData()
chapters = Table('scripture_chapters', metadata, autoload_with=engine)

def find_bad_titles():
    with engine.connect() as conn:
        query = select(chapters).where(
            (chapters.c.title_ru.like('%Песнь%')) | (chapters.c.title_ru.like('%Глава%'))
        )
        results = conn.execute(query).fetchall()
        print("--- Potential Bad Titles ---")
        for r in results:
            print(f"Book: {r.book_code}, Canto: {r.canto}, Ch: {r.chapter}, Title: {r.title_ru}")

if __name__ == "__main__":
    find_bad_titles()
