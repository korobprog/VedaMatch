import requests
import json

print("=== CHECKING LOCAL SERVER ===")
try:
    r = requests.get('http://127.0.0.1:8081/api/library/verses', params={
        'bookCode': 'bg',
        'chapter': '1',
        'verse': '1',
        'language': 'ru'
    })
    
    if r.status_code == 200:
        data = r.json()
        if data:
            print(f"Status: OK ({len(data)} verses)")
            print(f"Translation (RU): {data[0]['translation'][:200]}")
        else:
            print("No data returned")
    else:
        print(f"Error: Status {r.status_code}")
        print(r.text[:500])
except Exception as e:
    print(f"Error: {e}")

print("\n=== CHECKING REMOTE SERVER 45.150.9.229 ===")
try:
    r = requests.get('http://45.150.9.229:8081/api/library/verses', params={
        'bookCode': 'bg',
        'chapter': '1',
        'verse': '1',
        'language': 'ru'
    }, timeout=10)
    
    if r.status_code == 200:
        data = r.json()
        if data:
            print(f"Status: OK ({len(data)} verses)")
            print(f"Translation (RU): {data[0]['translation'][:200]}")
        else:
            print("No data returned")
    else:
        print(f"Error: Status {r.status_code}")
        print(r.text[:500])
except Exception as e:
    print(f"Error: {e}")
