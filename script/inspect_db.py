from sqlalchemy import create_engine, Table, MetaData, select
import binascii

DATABASE_URL = "postgresql://raguser:ragpassword@localhost:5435/ragdb"
engine = create_engine(DATABASE_URL)
metadata = MetaData()
chapters = Table('scripture_chapters', metadata, autoload_with=engine)

def check_titles():
    with engine.connect() as conn:
        query = select(chapters).where(
            (chapters.c.book_code == 'sb') & (chapters.c.canto.in_([1, 2, 3]))
        ).order_by(chapters.c.canto, chapters.c.chapter)
        
        results = conn.execute(query).fetchall()
        print("--- SB Canto 1 Titles (In Hex if weird) ---")
        for r in results:
            title = r.title_ru or ""
            print(f"Ch {r.chapter}: {title}")
            if any(ord(c) < 32 for c in title):
                print(f"  [HEX]: {binascii.hexlify(title.encode('utf-8'))}")

if __name__ == "__main__":
    check_titles()
