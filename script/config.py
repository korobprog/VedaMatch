"""
Configuration for Vedabase Scripture Parser
"""
import os
from dotenv import load_dotenv

# Load environment variables from .env file if exists
load_dotenv()

# Check if we should use local SQLite for testing
USE_LOCAL_SQLITE = os.getenv("USE_LOCAL_SQLITE", "false").lower() == "true"

if USE_LOCAL_SQLITE:
    # Use local SQLite for testing without server connection
    DATABASE_URL = "sqlite:///scriptures.db"
else:
    # Database configuration for PostgreSQL
    DATABASE_CONFIG = {
        "host": os.getenv("DB_HOST", "localhost"),  # Use localhost with SSH tunnel
        "port": os.getenv("DB_PORT", "5435"),
        "user": os.getenv("DB_USER", "raguser"),
        "password": os.getenv("DB_PASSWORD", "ragpassword"),
        "database": os.getenv("DB_NAME", "ragdb"),
    }
    
    # Build connection string
    DATABASE_URL = f"postgresql://{DATABASE_CONFIG['user']}:{DATABASE_CONFIG['password']}@{DATABASE_CONFIG['host']}:{DATABASE_CONFIG['port']}/{DATABASE_CONFIG['database']}"


# Parser configuration
PARSER_CONFIG = {
    # Base URL for vedabase.io
    "base_url": "https://vedabase.io",
    
    # Delay between requests in seconds (to be respectful to the server)
    "request_delay": 1.0,
    
    # Languages to parse
    "languages": ["en", "ru"],
    
    # Books configuration
    "books": {
        "bg": {
            "name": "Bhagavad-gita As It Is",
            "name_ru": "Бхагавад-гита",
            "chapters": 18,
            "has_cantos": False,
        },
        "sb": {
            "name": "Srimad-Bhagavatam",
            "name_ru": "Шримад-Бхагаватам",
            "cantos": 12,
            "has_cantos": True,
        },
        "cc": {
            "name": "Sri Caitanya-caritamrita",
            "name_ru": "Шри Чайтанья-чаритамрита",
            "lilas": ["adi", "madhya", "antya"],
            "has_cantos": True,
        },
    },
    
    # Request headers
    "headers": {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5,ru;q=0.3",
    },
}

# Section headers for different languages
SECTION_HEADERS = {
    "en": {
        "devanagari": "Devanagari",
        "verse_text": "Verse text",
        "synonyms": "Synonyms",
        "translation": "Translation",
        "purport": "Purport",
    },
    "ru": {
        "devanagari": "Деванагари",
        "verse_text": "Текст стиха",
        "synonyms": "Пословный перевод",
        "translation": "Перевод",
        "purport": "Комментарий",
    },
}
