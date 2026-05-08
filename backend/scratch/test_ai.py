import os
import google.generativeai as genai
from dotenv import load_dotenv

# Load env from parent dir
load_dotenv('../.env')

key = os.environ.get('GEMINI_API_KEY')
print(f"Testing Gemini Key: {key[:10]}...")

try:
    genai.configure(api_key=key)
    # Use the most basic model for testing
    model = genai.GenerativeModel('gemini-1.5-flash')
    response = model.generate_content("Hello, this is a test. Reply with 'Success'.")
    print(f"RESULT: {response.text}")
except Exception as e:
    print(f"ERROR: {e}")
