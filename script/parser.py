"""
Vedabase.io Scripture Parser

Parses sacred scriptures (Bhagavad-gita, Srimad-Bhagavatam, Sri Caitanya-caritamrita)
from vedabase.io in English and Russian languages.
"""
import re
import time
import logging
from typing import Optional, Dict, List, Any
from urllib.parse import urljoin

import requests
from bs4 import BeautifulSoup

from config import PARSER_CONFIG, SECTION_HEADERS, DATABASE_URL
from models import (
    ScriptureVerse,
    ScriptureBook,
    ScriptureCanto,
    ScriptureChapter,
    get_engine,
    create_tables,
    get_session,
    CC_LILA_CODES,
)

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class VedabaseParser:
    """Parser for vedabase.io scripture content"""
    
    def __init__(self, database_url: str = None):
        self.base_url = PARSER_CONFIG["base_url"]
        self.headers = PARSER_CONFIG["headers"]
        self.delay = PARSER_CONFIG["request_delay"]
        self.session = requests.Session()
        self.session.headers.update(self.headers)
        
        # Database connection
        db_url = database_url or DATABASE_URL
        self.engine = get_engine(db_url)
        create_tables(self.engine)
        self.db_session = get_session(self.engine)
        
        logger.info(f"Parser initialized with database: {db_url.split('@')[1] if '@' in db_url else db_url}")
    
    def fetch_page(self, url: str) -> Optional[BeautifulSoup]:
        """Fetch and parse a webpage"""
        try:
            logger.debug(f"Fetching: {url}")
            response = self.session.get(url, timeout=30)
            response.raise_for_status()
            
            # Respectful delay between requests
            time.sleep(self.delay)
            
            return BeautifulSoup(response.text, 'lxml')
        except requests.RequestException as e:
            logger.error(f"Error fetching {url}: {e}")
            return None
    
    def get_section_content(self, soup: BeautifulSoup, header_text: str) -> Optional[str]:
        """Extract content following a specific header (h2)"""
        # Find the h2 header with the specified text
        headers = soup.find_all('h2')
        
        for header in headers:
            if header.get_text(strip=True) == header_text:
                # Get the next sibling div(s) with content
                content_parts = []
                sibling = header.find_next_sibling()
                
                while sibling:
                    # Stop if we hit another h2 or navigation element
                    if sibling.name == 'h2':
                        break
                    if sibling.name == 'nav':
                        break
                    
                    # Extract text from div elements
                    if sibling.name == 'div':
                        # Check if it's a content container
                        if 'em-leading-8' in sibling.get('class', []):
                            text = sibling.get_text(strip=True)
                            if text:
                                content_parts.append(text)
                    
                    sibling = sibling.find_next_sibling()
                
                if content_parts:
                    return '\n\n'.join(content_parts)
        
        return None
    
    def get_devanagari_and_transliteration(self, soup: BeautifulSoup, language: str) -> tuple:
        """Extract Devanagari text and transliteration"""
        headers = SECTION_HEADERS[language]
        
        devanagari = None
        transliteration = None
        
        # Find Devanagari section
        h2_list = soup.find_all('h2')
        
        for h2 in h2_list:
            h2_text = h2.get_text(strip=True)
            
            if h2_text == headers["devanagari"]:
                next_div = h2.find_next_sibling('div')
                if next_div:
                    devanagari = next_div.get_text(strip=True)
            
            elif h2_text == headers["verse_text"]:
                next_div = h2.find_next_sibling('div')
                if next_div:
                    transliteration = next_div.get_text(strip=True)
        
        return devanagari, transliteration
    
    def parse_verse_page(self, url: str, language: str) -> Optional[Dict[str, Any]]:
        """Parse a single verse page and extract all content"""
        soup = self.fetch_page(url)
        if not soup:
            return None
        
        headers = SECTION_HEADERS[language]
        
        # Extract verse reference from h1
        h1 = soup.find('h1')
        verse_ref = h1.get_text(strip=True) if h1 else None
        
        # Get Devanagari and transliteration
        devanagari, transliteration = self.get_devanagari_and_transliteration(soup, language)
        
        # Get other sections
        synonyms = self.get_section_content(soup, headers["synonyms"])
        translation = self.get_section_content(soup, headers["translation"])
        purport = self.get_section_content(soup, headers["purport"])
        
        return {
            "verse_reference": verse_ref,
            "devanagari": devanagari,
            "transliteration": transliteration,
            "synonyms": synonyms,
            "translation": translation,
            "purport": purport,
            "source_url": url,
        }
    
    def get_chapter_verses(self, chapter_url: str) -> List[str]:
        """Get list of verse URLs from a chapter page"""
        soup = self.fetch_page(chapter_url)
        if not soup:
            return []
        
        verse_urls = []
        
        # Find all links that look like verse links (TEXT X: or ТЕКСТ X:)
        for link in soup.find_all('a', href=True):
            text = link.get_text(strip=True)
            href = link['href']
            
            # Match verse links pattern
            if re.match(r'^(TEXT|ТЕКСТ|TEXTS|ТЕКСТЫ)\s+\d+', text, re.IGNORECASE):
                full_url = urljoin(self.base_url, href)
                if full_url not in verse_urls:
                    verse_urls.append(full_url)
        
        return verse_urls
    
    def get_book_chapters(self, book_code: str, language: str, canto: int = None) -> List[str]:
        """Get list of chapter URLs for a book"""
        if book_code == "bg":
            # Bhagavad-gita: /en/library/bg/1/, /en/library/bg/2/, etc.
            num_chapters = PARSER_CONFIG["books"]["bg"]["chapters"]
            return [
                f"{self.base_url}/{language}/library/bg/{i}/"
                for i in range(1, num_chapters + 1)
            ]
        
        elif book_code == "sb" and canto:
            # Srimad-Bhagavatam: need to fetch canto page to get chapters
            canto_url = f"{self.base_url}/{language}/library/sb/{canto}/"
            soup = self.fetch_page(canto_url)
            if not soup:
                return []
            
            chapter_urls = []
            for link in soup.find_all('a', href=True):
                href = link['href']
                # Match chapter links: /en/library/sb/1/1/, /en/library/sb/1/2/, etc.
                if re.match(rf'^/{language}/library/sb/{canto}/\d+/$', href):
                    full_url = urljoin(self.base_url, href)
                    if full_url not in chapter_urls:
                        chapter_urls.append(full_url)
            
            return sorted(chapter_urls, key=lambda x: int(re.search(r'/(\d+)/$', x).group(1)))
        
        elif book_code == "cc" and canto:
            # Caitanya-caritamrita: canto is lila name (adi, madhya, antya)
            lila_name = canto if isinstance(canto, str) else CC_LILA_CODES.get(canto, "adi")
            lila_url = f"{self.base_url}/{language}/library/cc/{lila_name}/"
            soup = self.fetch_page(lila_url)
            if not soup:
                return []
            
            chapter_urls = []
            for link in soup.find_all('a', href=True):
                href = link['href']
                if re.match(rf'^/{language}/library/cc/{lila_name}/\d+/$', href):
                    full_url = urljoin(self.base_url, href)
                    if full_url not in chapter_urls:
                        chapter_urls.append(full_url)
            
            return sorted(chapter_urls, key=lambda x: int(re.search(r'/(\d+)/$', x).group(1)))
        
        return []
    
    def save_chapter_metadata(self, book_code: str, canto: int, chapter: int, 
                             title: str, language: str) -> bool:
        """Save chapter metadata (title) to the database"""
        try:
            existing = self.db_session.query(ScriptureChapter).filter_by(
                book_code=book_code,
                canto=canto,
                chapter=chapter
            ).first()
            
            if existing:
                if language == "ru":
                    existing.title_ru = title
                else:
                    existing.title_en = title
            else:
                new_chapter = ScriptureChapter(
                    book_code=book_code,
                    canto=canto,
                    chapter=chapter,
                )
                if language == "ru":
                    new_chapter.title_ru = title
                else:
                    new_chapter.title_en = title
                self.db_session.add(new_chapter)
            
            self.db_session.commit()
            return True
        except Exception as e:
            logger.error(f"Error saving chapter metadata: {e}")
            self.db_session.rollback()
            return False

    def save_canto_metadata(self, book_code: str, canto: int, 
                           title: str, language: str) -> bool:
        """Save canto metadata (title) to the database"""
        try:
            existing = self.db_session.query(ScriptureCanto).filter_by(
                book_code=book_code,
                canto=canto
            ).first()
            
            if existing:
                if language == "ru":
                    existing.title_ru = title
                else:
                    existing.title_en = title
            else:
                new_canto = ScriptureCanto(
                    book_code=book_code,
                    canto=canto,
                )
                if language == "ru":
                    new_canto.title_ru = title
                else:
                    new_canto.title_en = title
                self.db_session.add(new_canto)
            
            self.db_session.commit()
            return True
        except Exception as e:
            logger.error(f"Error saving canto metadata: {e}")
            self.db_session.rollback()
            return False

    def parse_book_structure(self, book_code: str, language: str = "ru"):
        """Parse the overall structure of a book (cantos and chapters)"""
        url = urljoin(self.base_url, f"/{language}/library/{book_code}/")
        soup = self.fetch_page(url)
        if not soup:
            return
            
        logger.info(f"Parsing structure for {book_code} in {language}")
        
        # 1. Identify Cantos (for SB, CC)
        cantos_found = {}  # canto_num -> (url, title)
        links = soup.find_all('a', href=True)
        for link in links:
            text = link.get_text(strip=True)
            href = link['href']
            
            canto_num = None
            canto_title = ""

            # Pattern: Песнь 1: Творение OR Canto 1: ...
            match = re.search(r'(?:Песнь|Canto)\s+(\d+)(?::\s*)?(.*)', text, re.IGNORECASE)
            if match:
                canto_num = int(match.group(1))
                canto_title = match.group(2).strip()
                if not canto_title:
                    canto_title = text # If empty text, use "Песнь 1"
            elif book_code == 'cc':
                # Identify CC Lilas from URL or text
                for lila_name, lila_code in CC_LILA_CODES.items():
                    if f"/{lila_name}/" in href.lower() and len(href.split('/')) <= 6:
                        canto_num = lila_code
                        canto_title = text
                        break
                    
            if canto_num:
                canto_url = urljoin(self.base_url, href)
                cantos_found[canto_num] = (canto_url, canto_title)
                self.save_canto_metadata(book_code, canto_num, canto_title, language)

        # 2. Parse chapters
        if cantos_found:
            for canto_num, (canto_url, _) in sorted(cantos_found.items()):
                logger.info(f"Parsing chapters for Canto {canto_num}...")
                self.parse_canto_chapters(book_code, canto_num, canto_url, language)
        else:
            # For books without cantos (like BG)
            self.parse_canto_chapters(book_code, 0, url, language)

    def parse_canto_chapters(self, book_code: str, canto_num: int, canto_url: str, language: str):
        """Parse chapters within a canto/book and their titles"""
        soup = self.fetch_page(canto_url)
        if not soup:
            return
            
        links = soup.find_all('a', href=True)
        for link in links:
            text = link.get_text(strip=True)
            href = link['href']
            
            # 1. Try to match from text (e.g. "Chapter 1: ...")
            match = re.search(r'(?:Глава|Chapter)\s+(\d+)(?::\s*)?(.*)', text, re.IGNORECASE)
            
            ch_num = None
            ch_title = ""
            
            if match:
                ch_num = int(match.group(1))
                ch_title = match.group(2).strip()
            else:
                # 2. Fallback: try to extract number from URL if it's a chapter link
                # SB: /ru/library/sb/1/3/ (5 parts)
                # BG: /ru/library/bg/1/ (4 parts)
                url_parts = [p for p in href.split('/') if p]
                if len(url_parts) >= 4 and url_parts[2] == book_code:
                    # Specific logic for SB/CC (5 parts) vs BG/others (4 parts)
                    is_sb_cc_chapter = ((book_code == 'sb' or book_code == 'cc') and len(url_parts) == 5)
                    is_bg_chapter = (book_code == 'bg' and len(url_parts) == 4)
                    
                    if is_sb_cc_chapter or is_bg_chapter:
                        try:
                            ch_num = int(url_parts[-1])
                            # Clean up title
                            ch_title = text
                            if ':' in ch_title:
                                ch_title = ch_title.split(':', 1)[1].strip()
                            elif 'ГЛАВА' in ch_title.upper():
                                # Remove "ГЛАВА ТРЕТЬЯ" etc
                                parts = re.split(r'(?i)глава\s+[а-я]+\s*', ch_title)
                                if len(parts) > 1:
                                    ch_title = parts[1].strip()
                            
                            # Exclude navigational labels
                            if any(word in ch_title.lower() for word in ['песнь', 'canto', 'next', 'previous']):
                                ch_num = None
                        except (ValueError, IndexError):
                            continue

            if ch_num is not None:
                self.save_chapter_metadata(book_code, canto_num, ch_num, ch_title, language)
                logger.info(f"✓ Found Chapter {canto_num}.{ch_num}: {ch_title}")

    def save_verse(self, verse_data: Dict[str, Any], book_code: str, 
                   canto: int, chapter: int, verse: str, language: str) -> bool:
        """Save a verse to the database"""
        try:
            # Check if verse already exists
            existing = self.db_session.query(ScriptureVerse).filter_by(
                book_code=book_code,
                canto=canto,
                chapter=chapter,
                verse=verse,
                language=language
            ).first()
            
            if existing:
                # Update existing verse
                existing.devanagari = verse_data.get("devanagari")
                existing.transliteration = verse_data.get("transliteration")
                existing.synonyms = verse_data.get("synonyms")
                existing.translation = verse_data.get("translation")
                existing.purport = verse_data.get("purport")
                existing.source_url = verse_data.get("source_url")
                existing.verse_reference = verse_data.get("verse_reference")
                logger.debug(f"Updated existing verse: {verse_data.get('verse_reference')}")
            else:
                # Create new verse
                new_verse = ScriptureVerse(
                    book_code=book_code,
                    canto=canto,
                    chapter=chapter,
                    verse=verse,
                    language=language,
                    devanagari=verse_data.get("devanagari"),
                    transliteration=verse_data.get("transliteration"),
                    synonyms=verse_data.get("synonyms"),
                    translation=verse_data.get("translation"),
                    purport=verse_data.get("purport"),
                    source_url=verse_data.get("source_url"),
                    verse_reference=verse_data.get("verse_reference"),
                )
                self.db_session.add(new_verse)
                logger.debug(f"Created new verse: {verse_data.get('verse_reference')}")
            
            self.db_session.commit()
            return True
            
        except Exception as e:
            logger.error(f"Error saving verse: {e}")
            self.db_session.rollback()
            return False
    
    def parse_chapter(self, book_code: str, chapter: int, language: str, 
                     canto: int = None) -> int:
        """Parse all verses in a chapter"""
        # Build chapter URL
        if book_code == "bg":
            chapter_url = f"{self.base_url}/{language}/library/bg/{chapter}/"
        elif book_code == "sb":
            chapter_url = f"{self.base_url}/{language}/library/sb/{canto}/{chapter}/"
        elif book_code == "cc":
            lila_name = canto if isinstance(canto, str) else ["adi", "madhya", "antya"][canto - 1]
            chapter_url = f"{self.base_url}/{language}/library/cc/{lila_name}/{chapter}/"
        else:
            logger.error(f"Unknown book code: {book_code}")
            return 0
        
        logger.info(f"Parsing chapter: {chapter_url}")
        
        # Get all verse URLs
        verse_urls = self.get_chapter_verses(chapter_url)
        logger.info(f"Found {len(verse_urls)} verses in chapter")
        
        parsed_count = 0
        
        for verse_url in verse_urls:
            # Extract verse number from URL
            verse_match = re.search(r'/(\d+(?:-\d+)?)/\s*$', verse_url)
            if not verse_match:
                logger.warning(f"Could not extract verse number from: {verse_url}")
                continue
            
            verse_num = verse_match.group(1)
            
            # Parse the verse page
            verse_data = self.parse_verse_page(verse_url, language)
            
            if verse_data:
                # Determine canto value for database
                db_canto = canto
                if book_code == "cc" and isinstance(canto, str):
                    db_canto = CC_LILA_CODES.get(canto, 1)
                
                if self.save_verse(verse_data, book_code, db_canto, chapter, verse_num, language):
                    parsed_count += 1
                    logger.info(f"✓ Parsed: {verse_data.get('verse_reference', verse_url)}")
            else:
                logger.warning(f"✗ Failed to parse: {verse_url}")
        
        return parsed_count
    
    def parse_book(self, book_code: str, language: str = "en", 
                   start_chapter: int = 1, end_chapter: int = None) -> int:
        """Parse an entire book or range of chapters"""
        logger.info(f"Starting to parse book: {book_code.upper()} ({language})")
        
        total_parsed = 0
        
        if book_code == "bg":
            # Bhagavad-gita
            max_chapter = PARSER_CONFIG["books"]["bg"]["chapters"]
            end = end_chapter or max_chapter
            
            for chapter in range(start_chapter, end + 1):
                count = self.parse_chapter(book_code, chapter, language)
                total_parsed += count
                logger.info(f"Chapter {chapter} complete: {count} verses")
        
        elif book_code == "sb":
            # Srimad-Bhagavatam - need to iterate through cantos
            for canto in range(1, 13):
                chapters = self.get_book_chapters(book_code, language, canto)
                
                for chapter_url in chapters:
                    chapter_num = int(re.search(r'/(\d+)/$', chapter_url).group(1))
                    count = self.parse_chapter(book_code, chapter_num, language, canto)
                    total_parsed += count
                    logger.info(f"SB {canto}.{chapter_num} complete: {count} verses")
        
        elif book_code == "cc":
            # Caitanya-caritamrita
            for lila in PARSER_CONFIG["books"]["cc"]["lilas"]:
                chapters = self.get_book_chapters(book_code, language, lila)
                
                for chapter_url in chapters:
                    chapter_num = int(re.search(r'/(\d+)/$', chapter_url).group(1))
                    count = self.parse_chapter(book_code, chapter_num, language, lila)
                    total_parsed += count
                    logger.info(f"CC {lila}.{chapter_num} complete: {count} verses")
        
        logger.info(f"Book {book_code.upper()} parsing complete! Total verses: {total_parsed}")
        return total_parsed
    
    def init_books(self):
        """Initialize book records in the database"""
        books_config = PARSER_CONFIG["books"]
        
        for code, info in books_config.items():
            existing = self.db_session.query(ScriptureBook).filter_by(code=code).first()
            
            if not existing:
                book = ScriptureBook(
                    code=code,
                    name_en=info["name"],
                    name_ru=info["name_ru"],
                )
                self.db_session.add(book)
                logger.info(f"Added book: {info['name']}")
        
        self.db_session.commit()
    
    def close(self):
        """Close database connection"""
        self.db_session.close()
        logger.info("Parser closed")


def test_parse_single_verse():
    """Test parsing a single verse"""
    parser = VedabaseParser()
    
    # Test with BG 1.1 in English
    url = "https://vedabase.io/en/library/bg/1/1/"
    result = parser.parse_verse_page(url, "en")
    
    if result:
        print("\n=== Parsed Verse (English) ===")
        print(f"Reference: {result.get('verse_reference')}")
        print(f"Devanagari: {result.get('devanagari', 'N/A')[:100]}...")
        print(f"Transliteration: {result.get('transliteration', 'N/A')[:100]}...")
        print(f"Translation: {result.get('translation', 'N/A')[:200]}...")
        print(f"Synonyms present: {bool(result.get('synonyms'))}")
        print(f"Purport present: {bool(result.get('purport'))}")
    
    # Test with BG 1.1 in Russian
    url_ru = "https://vedabase.io/ru/library/bg/1/1/"
    result_ru = parser.parse_verse_page(url_ru, "ru")
    
    if result_ru:
        print("\n=== Parsed Verse (Russian) ===")
        print(f"Reference: {result_ru.get('verse_reference')}")
        print(f"Translation: {result_ru.get('translation', 'N/A')[:200]}...")
    
    parser.close()


if __name__ == "__main__":
    test_parse_single_verse()
