"""
SQLAlchemy models for scripture storage
"""
from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime, UniqueConstraint, Index, create_engine, func
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

Base = declarative_base()


class ScriptureBook(Base):
    """Table for scripture books (BG, SB, CC)"""
    __tablename__ = "scripture_books"
    
    id = Column(Integer, primary_key=True)
    code = Column(String(10), unique=True, nullable=False)  # bg, sb, cc
    name_en = Column(String(255), nullable=False)
    name_ru = Column(String(255), nullable=False)
    description_en = Column(Text)
    description_ru = Column(Text)
    created_at = Column(DateTime, default=func.now())
    
    def __repr__(self):
        return f"<ScriptureBook(code='{self.code}', name='{self.name_en}')>"


class ScriptureCanto(Base):
    """Metadata for book cantos"""
    __tablename__ = "scripture_cantos"
    
    id = Column(Integer, primary_key=True)
    book_code = Column(String(10), nullable=False, index=True)
    canto = Column(Integer, nullable=False, index=True)
    title_en = Column(String(255))
    title_ru = Column(String(255))
    created_at = Column(DateTime, default=func.now())


class ScriptureChapter(Base):
    """Metadata for book chapters"""
    __tablename__ = "scripture_chapters"
    
    id = Column(Integer, primary_key=True)
    book_code = Column(String(10), nullable=False, index=True)
    canto = Column(Integer, nullable=False, index=True)
    chapter = Column(Integer, nullable=False, index=True)
    title_en = Column(String(255))
    title_ru = Column(String(255))
    created_at = Column(DateTime, default=func.now())


class ScriptureVerse(Base):
    """Main table for storing scripture verses"""
    __tablename__ = "scripture_verses"
    
    id = Column(Integer, primary_key=True)
    
    # Book identification
    book_code = Column(String(10), nullable=False, index=True)  # bg, sb, cc
    canto = Column(Integer, nullable=True)  # For SB (1-12) or CC lila (encoded as number)
    chapter = Column(Integer, nullable=False)
    verse = Column(String(20), nullable=False)  # Can be "1", "16-18", etc.
    
    # Language
    language = Column(String(5), nullable=False, index=True)  # en, ru
    
    # Content
    devanagari = Column(Text)  # Sanskrit in Devanagari script
    transliteration = Column(Text)  # Sanskrit transliteration
    synonyms = Column(Text)  # Word-for-word translation
    translation = Column(Text)  # Full translation
    purport = Column(Text)  # Commentary/purport
    
    # Metadata
    source_url = Column(Text)
    verse_reference = Column(String(50))  # e.g., "BG 1.1", "SB 1.1.1"
    
    # Timestamps
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    # Unique constraint to prevent duplicates
    __table_args__ = (
        UniqueConstraint('book_code', 'canto', 'chapter', 'verse', 'language', 
                        name='uq_scripture_verse'),
        Index('ix_scripture_lookup', 'book_code', 'canto', 'chapter', 'verse'),
    )
    
    def __repr__(self):
        return f"<ScriptureVerse(ref='{self.verse_reference}', lang='{self.language}')>"


def get_engine(database_url: str):
    """Create database engine"""
    return create_engine(database_url, echo=False)


def create_tables(engine):
    """Create all tables in the database"""
    Base.metadata.create_all(engine)
    print("✓ Database tables created successfully")


def get_session(engine):
    """Create a new database session"""
    Session = sessionmaker(bind=engine)
    return Session()


# Lila encoding for CC
CC_LILA_CODES = {
    "adi": 1,
    "madhya": 2,
    "antya": 3,
}

CC_LILA_NAMES = {
    1: "adi",
    2: "madhya",
    3: "antya",
}
