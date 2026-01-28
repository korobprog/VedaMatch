from parser import VedabaseParser
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def fill_initial_content():
    parser = VedabaseParser()
    try:
        # Import Chapter 1 for each Lila in both languages
        for lang in ["ru", "en"]:
            for lila in ["adi", "madhya", "antya"]:
                logger.info(f"Importing {lila.upper()} Chapter 1 ({lang})...")
                parser.parse_chapter("cc", 1, lang, lila)
        
        logger.info("Initial content import completed!")
    finally:
        parser.close()

if __name__ == "__main__":
    fill_initial_content()
