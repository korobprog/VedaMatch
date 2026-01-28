from parser import VedabaseParser
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def fill_structure():
    parser = VedabaseParser()
    try:
        # Parse structure for Srimad Bhagavatam (RU and EN)
        logger.info("Parsing SB structure...")
        parser.parse_book_structure("sb", "ru")
        parser.parse_book_structure("sb", "en")
        
        # Parse structure for Caitanya Caritamrita (RU and EN)
        logger.info("Parsing CC structure...")
        parser.parse_book_structure("cc", "ru")
        parser.parse_book_structure("cc", "en")
        
        # Parse structure for Bhagavad Gita (RU and EN)
        logger.info("Parsing BG structure...")
        parser.parse_book_structure("bg", "ru")
        parser.parse_book_structure("bg", "en")
        
        logger.info("Titles filled successfully!")
    finally:
        parser.close()

if __name__ == "__main__":
    fill_structure()
