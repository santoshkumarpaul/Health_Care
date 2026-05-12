import os
import requests
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'health_core.settings')
django.setup()

from django.conf import settings
import google.generativeai as genai

grok = os.environ.get('GROK_API_KEY') or getattr(settings, 'GROK_API_KEY', None)
gemini = os.environ.get('GEMINI_API_KEY') or getattr(settings, 'GEMINI_API_KEY', None)

print("\n--- CHECKING GROK (xAI) ---")
print(f"Key detected: {'Yes' if grok else 'No'}")
if grok:
    res = requests.post(
        "https://api.x.ai/v1/chat/completions",
        headers={"Authorization": f"Bearer {grok}"},
        json={"model": "grok-beta", "messages": [{"role": "user", "content": "test"}]}
    )
    print(f"Status: {res.status_code}")
    print(f"Response: {res.text[:200]}")

print("\n--- CHECKING GEMINI (Google) ---")
print(f"Key detected: {'Yes' if gemini else 'No'}")
if gemini:
    genai.configure(api_key=gemini)
    try:
        print("Listing available models...")
        for m in genai.list_models():
            if 'generateContent' in m.supported_generation_methods:
                print(f"  - {m.name}")
        
        model = genai.GenerativeModel('gemini-1.5-flash')
        r = model.generate_content('test')
        print("Status: OK - Gemini is working!")
    except Exception as e:
        print(f"Error: {e}")
