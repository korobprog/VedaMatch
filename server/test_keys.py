#!/usr/bin/env python3
import requests
import json
import time

BASE_URL = "https://mute-waterfall-ef1e.makstreid.workers.dev"

def test_gemini_key(key_name, api_key):
    print(f"\n🔍 Проверка ключа: {key_name}")
    print(f"   Ключ: {api_key}")
    
    url = f"{BASE_URL}/v1beta/models/gemini-1.5-flash:generateContent?key={api_key}"
    
    payload = {
        "contents": [{
            "parts": [{"text": "Привет! Ответь одним словом: работает?"}]
        }]
    }
    
    try:
        start_time = time.time()
        response = requests.post(
            url,
            headers={"Content-Type": "application/json"},
            json=payload,
            timeout=30
        )
        duration = time.time() - start_time
        
        print(f"   📊 HTTP статус: {response.status_code}")
        print(f"   ⏱️  Время ответа: {duration:.2f}s")
        
        data = response.json()
        
        if "error" in data:
            print(f"   ❌ КЛЮЧ НЕ РАБОТАЕТ")
            print(f"   📛 Код ошибки: {data['error'].get('code', 'N/A')}")
            print(f"   📛 Сообщение: {data['error'].get('message', 'N/A')}")
            print(f"   📛 Статус: {data['error'].get('status', 'N/A')}")
        elif "candidates" in data and len(data["candidates"]) > 0:
            text = data["candidates"][0]["content"]["parts"][0]["text"]
            print(f"   ✅ КЛЮЧ РАБОТАЕТ!")
            print(f"   💬 Ответ модели: {text}")
        else:
            print(f"   ⚠️  Получен пустой ответ")
            print(f"   📄 Сырой ответ: {json.dumps(data, ensure_ascii=False, indent=2)}")
            
    except requests.exceptions.Timeout:
        print(f"   ❌ Таймаут запроса (>30s)")
    except requests.exceptions.RequestException as e:
        print(f"   ❌ Ошибка сети: {e}")
    except json.JSONDecodeError as e:
        print(f"   ❌ Ошибка парсинга JSON: {e}")
        print(f"   📄 Сырой ответ: {response.text[:500]}")
    except Exception as e:
        print(f"   ❌ Неожиданная ошибка: {e}")

def main():
    print("🚀 Тестирование Gemini API ключей")
    print(f"🌐 Прокси URL: {BASE_URL}")
    print("=" * 60)
    
    # Тестируем первый ключ
    test_gemini_key("GEMINI", "AIzaSyC0420ZkneTFWOxigmee1q5o3Qt9x7chDU")
    
    # Тестируем второй ключ
    test_gemini_key("GEMINI2", "AIzaSyB3qPUq9Y5FEYjnb70Lol7GOBaBVupz0SY")
    
    print("=" * 60)
    print("✨ Тестирование завершено")

if __name__ == "__main__":
    main()
