#!/usr/bin/env python3
"""
Vedabase Scripture Parser - CLI Entry Point

Usage:
    python run_parser.py --book bg --lang en          # Parse entire Bhagavad-gita in English
    python run_parser.py --book bg --lang ru          # Parse entire Bhagavad-gita in Russian
    python run_parser.py --book bg --lang all         # Parse BG in both languages
    python run_parser.py --book bg --chapter 1        # Parse only chapter 1
    python run_parser.py --book sb --canto 1          # Parse Srimad-Bhagavatam Canto 1
    python run_parser.py --book cc --lila adi         # Parse CC Adi-lila
    python run_parser.py --test                       # Run test parse on BG 1.1
    python run_parser.py --init-db                    # Initialize database tables only
"""

import argparse
import sys
import logging

from config import DATABASE_URL
from parser import VedabaseParser

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler('parser.log', encoding='utf-8')
    ]
)
logger = logging.getLogger(__name__)


def main():
    parser = argparse.ArgumentParser(
        description='Vedabase.io Scripture Parser',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__
    )
    
    parser.add_argument(
        '--book', '-b',
        choices=['bg', 'sb', 'cc', 'all'],
        help='Book to parse: bg (Bhagavad-gita), sb (Srimad-Bhagavatam), cc (Caitanya-caritamrita), all'
    )
    
    parser.add_argument(
        '--lang', '-l',
        choices=['en', 'ru', 'all'],
        default='en',
        help='Language to parse (default: en)'
    )
    
    parser.add_argument(
        '--chapter', '-c',
        type=int,
        help='Specific chapter to parse (for BG)'
    )
    
    parser.add_argument(
        '--canto',
        type=int,
        choices=range(1, 13),
        metavar='1-12',
        help='Specific canto to parse (for SB, 1-12)'
    )
    
    parser.add_argument(
        '--lila',
        choices=['adi', 'madhya', 'antya'],
        help='Specific lila to parse (for CC)'
    )
    
    parser.add_argument(
        '--start-chapter',
        type=int,
        default=1,
        help='Starting chapter number (default: 1)'
    )
    
    parser.add_argument(
        '--end-chapter',
        type=int,
        help='Ending chapter number (optional)'
    )
    
    parser.add_argument(
        '--test', '-t',
        action='store_true',
        help='Run test parse on BG 1.1'
    )
    
    parser.add_argument(
        '--init-db',
        action='store_true',
        help='Initialize database tables only'
    )
    
    parser.add_argument(
        '--db-url',
        type=str,
        default=DATABASE_URL,
        help='Database URL (default: from config)'
    )
    
    parser.add_argument(
        '--verbose', '-v',
        action='store_true',
        help='Enable verbose logging'
    )
    
    args = parser.parse_args()
    
    if args.verbose:
        logging.getLogger().setLevel(logging.DEBUG)
    
    # Initialize parser
    try:
        vedabase_parser = VedabaseParser(args.db_url)
    except Exception as e:
        logger.error(f"Failed to initialize parser: {e}")
        logger.error("Check your database connection settings in config.py")
        sys.exit(1)
    
    try:
        # Initialize database only
        if args.init_db:
            vedabase_parser.init_books()
            logger.info("Database initialized successfully!")
            vedabase_parser.close()
            return
        
        # Test mode
        if args.test:
            logger.info("Running test parse...")
            from parser import test_parse_single_verse
            test_parse_single_verse()
            return
        
        # Check if book is specified for parsing
        if not args.book:
            parser.print_help()
            sys.exit(1)
        
        # Determine languages to parse
        languages = ['en', 'ru'] if args.lang == 'all' else [args.lang]
        
        # Determine books to parse
        books = ['bg', 'sb', 'cc'] if args.book == 'all' else [args.book]
        
        total_parsed = 0
        
        for book in books:
            for lang in languages:
                logger.info(f"\n{'='*50}")
                logger.info(f"Starting: {book.upper()} ({lang})")
                logger.info(f"{'='*50}")
                
                if book == 'bg':
                    # Bhagavad-gita
                    if args.chapter:
                        count = vedabase_parser.parse_chapter(book, args.chapter, lang)
                    else:
                        count = vedabase_parser.parse_book(
                            book, lang,
                            args.start_chapter,
                            args.end_chapter
                        )
                    total_parsed += count
                
                elif book == 'sb':
                    # Srimad-Bhagavatam
                    if args.canto:
                        # Parse specific canto
                        chapters = vedabase_parser.get_book_chapters(book, lang, args.canto)
                        
                        start_idx = args.start_chapter - 1
                        end_idx = args.end_chapter if args.end_chapter else len(chapters)
                        
                        target_chapters = chapters[start_idx:end_idx]
                        logger.info(f"Targeting chapters {args.start_chapter} to {args.end_chapter or len(chapters)} of Canto {args.canto}")
                        
                        for chapter_url in target_chapters:
                            import re
                            match = re.search(r'/(\d+)/$', chapter_url)
                            if not match: continue
                            chapter_num = int(match.group(1))
                            count = vedabase_parser.parse_chapter(book, chapter_num, lang, args.canto)
                            total_parsed += count
                    else:
                        count = vedabase_parser.parse_book(book, lang)
                        total_parsed += count
                
                elif book == 'cc':
                    # Caitanya-caritamrita
                    if args.lila:
                        # Parse specific lila
                        chapters = vedabase_parser.get_book_chapters(book, lang, args.lila)
                        
                        start_idx = args.start_chapter - 1
                        end_idx = args.end_chapter if args.end_chapter else len(chapters)
                        
                        target_chapters = chapters[start_idx:end_idx]
                        logger.info(f"Targeting chapters {args.start_chapter} to {args.end_chapter or len(chapters)} of Lila {args.lila}")
                        
                        for chapter_url in target_chapters:
                            import re
                            match = re.search(r'/(\d+)/$', chapter_url)
                            if not match: continue
                            chapter_num = int(match.group(1))
                            count = vedabase_parser.parse_chapter(book, chapter_num, lang, args.lila)
                            total_parsed += count
                    else:
                        count = vedabase_parser.parse_book(book, lang)
                        total_parsed += count
        
        logger.info(f"\n{'='*50}")
        logger.info(f"PARSING COMPLETE!")
        logger.info(f"Total verses parsed: {total_parsed}")
        logger.info(f"{'='*50}")
    
    except KeyboardInterrupt:
        logger.info("\nParsing interrupted by user")
    except Exception as e:
        logger.error(f"Error during parsing: {e}")
        raise
    finally:
        vedabase_parser.close()


if __name__ == "__main__":
    main()
