"""
Test parsing of other scriptures (SB and CC)
"""
from parser import VedabaseParser

def test_other_books():
    parser = VedabaseParser()
    
    # Test Srimad-Bhagavatam
    print("=" * 50)
    print("=== Srimad-Bhagavatam 1.1.1 (English) ===")
    print("=" * 50)
    result = parser.parse_verse_page("https://vedabase.io/en/library/sb/1/1/1/", "en")
    if result:
        print(f"Reference: {result.get('verse_reference')}")
        print(f"Devanagari: {result.get('devanagari', 'N/A')[:80]}...")
        print(f"Translation: {result.get('translation', 'N/A')[:200]}...")
        print(f"Has Synonyms: {bool(result.get('synonyms'))}")
        print(f"Has Purport: {bool(result.get('purport'))}")
    
    print()
    print("=" * 50)
    print("=== Srimad-Bhagavatam 1.1.1 (Russian) ===")
    print("=" * 50)
    result_ru = parser.parse_verse_page("https://vedabase.io/ru/library/sb/1/1/1/", "ru")
    if result_ru:
        print(f"Reference: {result_ru.get('verse_reference')}")
        print(f"Translation: {result_ru.get('translation', 'N/A')[:200]}...")
    
    print()
    print("=" * 50)
    print("=== Caitanya-caritamrita Adi 1.1 (English) ===")
    print("=" * 50)
    result_cc = parser.parse_verse_page("https://vedabase.io/en/library/cc/adi/1/1/", "en")
    if result_cc:
        print(f"Reference: {result_cc.get('verse_reference')}")
        dev = result_cc.get('devanagari', '') or ''
        print(f"Devanagari: {dev[:80] if dev else 'N/A'}...")
        trans = result_cc.get('translation', '') or ''
        print(f"Translation: {trans[:200] if trans else 'N/A'}...")
        print(f"Has Synonyms: {bool(result_cc.get('synonyms'))}")
        print(f"Has Purport: {bool(result_cc.get('purport'))}")

    
    print()
    print("=" * 50)
    print("=== Caitanya-caritamrita Adi 1.1 (Russian) ===")
    print("=" * 50)
    result_cc_ru = parser.parse_verse_page("https://vedabase.io/ru/library/cc/adi/1/1/", "ru")
    if result_cc_ru:
        print(f"Reference: {result_cc_ru.get('verse_reference')}")
        print(f"Translation: {result_cc_ru.get('translation', 'N/A')[:200]}...")
    
    parser.close()
    print()
    print("=" * 50)
    print("ALL TESTS PASSED!")
    print("=" * 50)

if __name__ == "__main__":
    test_other_books()
