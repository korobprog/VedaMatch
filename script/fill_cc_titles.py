from parser import VedabaseParser
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def fill_cc_structure():
    parser = VedabaseParser()
    try:
        # Parse structure for Caitanya Caritamrita (RU and EN)
        logger.info("Parsing CC structure (RU)...")
        parser.parse_book_structure("cc", "ru")
        logger.info("Parsing CC structure (EN)...")
        parser.parse_book_structure("cc", "en")
        
        logger.info("CC structure filled successfully!")
    finally:
        parser.close()

if __name__ == "__main__":
    fill_cc_structure()
