import requests

# Get Russian version
r_ru = requests.get('http://127.0.0.1:8081/api/library/verses?bookCode=bg&chapter=1&verse=1&language=ru')
# Get English version
r_en = requests.get('http://127.0.0.1:8081/api/library/verses?bookCode=bg&chapter=1&verse=1&language=en')

if r_ru.json() and r_en.json():
    print("=== RUSSIAN (first 200 chars) ===")
    print(r_ru.json()[0]['translation'][:200])
    print("\n=== ENGLISH (first 200 chars) ===")
    print(r_en.json()[0]['translation'][:200])
    print("\n=== ARE THEY DIFFERENT? ===")
    print("Different:", r_ru.json()[0]['translation'] != r_en.json()[0]['translation'])
else:
    print("No data found")
