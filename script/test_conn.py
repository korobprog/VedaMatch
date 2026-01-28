import requests
import time

url = "https://vedabase.io/ru/library/bg/1/1/"
headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
}

print(f"Testing access to {url}...")
try:
    response = requests.get(url, headers=headers, timeout=15)
    print(f"Status Code: {response.status_code}")
    if response.status_code == 200:
        print("Success! Page content length:", len(response.text))
except Exception as e:
    print(f"Connection failed: {e}")
