from sqlalchemy import create_engine, Table, MetaData, select

DATABASE_URL = "postgresql://raguser:ragpassword@localhost:5435/ragdb"
engine = create_engine(DATABASE_URL)
metadata = MetaData()
cantos = Table('scripture_cantos', metadata, autoload_with=engine)

def check_cantos():
    with engine.connect() as conn:
        query = select(cantos).where(cantos.c.book_code == 'sb').order_by(cantos.c.canto)
        results = conn.execute(query).fetchall()
        print("--- SB Cantos ---")
        for r in results:
            print(f"Canto {r.canto}: {r.title_ru}")

if __name__ == "__main__":
    check_cantos()
