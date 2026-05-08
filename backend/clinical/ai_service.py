import os
import json
import requests
import google.generativeai as genai
import traceback
from django.conf import settings
from dotenv import load_dotenv

# Force load .env from the backend directory
load_dotenv(os.path.join(settings.BASE_DIR, '.env'))

def get_ai_analysis(patient, vitals_list, medical_records):
    """
    Calls Gemini to generate a medical summary and risk assessment.
    """
    gemini_key = os.environ.get('GEMINI_API_KEY') or getattr(settings, 'GEMINI_API_KEY', None)
    
    vitals_str = "\n".join([
        f"Date: {v.date}, Glucose: {v.glucose}, BP: {v.systolic}/{v.diastolic}, Weight: {v.weight}" 
        for v in vitals_list[:5]
    ]) if vitals_list else "No recent vitals."
    
    records_str = "\n".join([
        f"Date: {r.date}, Type: {r.record_type}, Title: {r.title}" 
        for r in medical_records[:5]
    ]) if medical_records else "No recent records."

    prompt = f"""
    Analyze this patient data and return a JSON summary and risk assessment.
    Patient: {patient.name}, Age: {patient.age}, Gender: {patient.gender}
    Recent Vitals: {vitals_str}
    Recent Records: {records_str}
    
    Return ONLY a valid JSON object:
    {{
        "summary": "Detailed clinical overview...",
        "risks": [
            {{"name": "Condition (e.g. Diabetes, CVD, CKD, Hypertension)", "risk": 0-100, "color": "hex_color"}},
            ...
        ]
    }}
    """

    if gemini_key:
        # Try multiple model variants to avoid 404 errors
        for model_name in ['gemini-1.5-flash', 'gemini-pro', 'models/gemini-1.5-flash']:
            try:
                print(f"--- [AI_SYSTEM] Attempting Gemini {model_name} ---")
                genai.configure(api_key=gemini_key)
                model = genai.GenerativeModel(model_name)
                response = model.generate_content(prompt)
                content = response.text.strip()
                if "```json" in content:
                    content = content.split("```json")[1].split("```")[0].strip()
                return json.loads(content)
            except Exception as e:
                print(f"--- [AI_SYSTEM] Gemini {model_name} failed: {str(e)[:100]} ---")
    return None

def get_clinical_alerts(patients_data):
    """
    Analyzes multiple patients' data to identify clinical trends.
    """
    gemini_key = os.environ.get('GEMINI_API_KEY') or getattr(settings, 'GEMINI_API_KEY', None)
    prompt = f"Analyze these vitals and return a JSON list of 2 strings representing population health alerts: {patients_data}"
    try:
        genai.configure(api_key=gemini_key)
        model = genai.GenerativeModel('gemini-1.5-flash')
        response = model.generate_content(prompt)
        content = response.text.strip()
        if "```json" in content:
            content = content.split("```json")[1].split("```")[0].strip()
        return json.loads(content)
    except Exception:
        return ["Monitor patient trends regularly."]

def get_chatbot_response(user_message, history=[], patient_context=None):
    """
    Cura AI Chatbot with robust failover.
    """
    # Explicitly load environment again to be safe
    load_dotenv(os.path.join(settings.BASE_DIR, '.env'))
    
    gorq_key = os.environ.get('GORQ_API_KEY') or getattr(settings, 'GORQ_API_KEY', None)
    gemini_key = os.environ.get('GEMINI_API_KEY') or getattr(settings, 'GEMINI_API_KEY', None)
    hf_token = os.environ.get('HF_TOKEN') or getattr(settings, 'HF_TOKEN', None)
    hf_url = os.environ.get('HUGGINGFACE_API_URL') or getattr(settings, 'HUGGINGFACE_API_URL', None)

    system_prompt = f"You are 'Cura AI', a professional medical assistant. Context: {patient_context if patient_context else 'General Health'}. Rules: Medical topics only, concise, professional."

    messages = [{"role": "system", "content": system_prompt}]
    for h in history:
        messages.append({"role": h["role"], "content": h["content"]})
    messages.append({"role": "user", "content": user_message})

    # 1. Engine: Groq (Llama 3)
    if gorq_key:
        try:
            print("--- [AI_SYSTEM] Trying Groq ---")
            response = requests.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers={"Authorization": f"Bearer {gorq_key}", "Content-Type": "application/json"},
                json={"model": "llama3-8b-8192", "messages": messages, "temperature": 0.5},
                timeout=10
            )
            if response.status_code == 200:
                return response.json()['choices'][0]['message']['content']
            else:
                print(f"--- [AI_SYSTEM] Groq Status Code: {response.status_code} ---")
        except Exception as e:
            print(f"--- [AI_SYSTEM] Groq Error: {e} ---")

    # 2. Engine: Gemini
    if gemini_key:
        for model_name in ['gemini-1.5-flash', 'gemini-pro']:
            try:
                print(f"--- [AI_SYSTEM] Trying Gemini {model_name} ---")
                genai.configure(api_key=gemini_key)
                model = genai.GenerativeModel(model_name)
                full_prompt = f"System: {system_prompt}\nUser: {user_message}\nAssistant:"
                response = model.generate_content(full_prompt)
                return response.text.strip()
            except Exception as e:
                print(f"--- [AI_SYSTEM] Gemini {model_name} Error: {str(e)[:100]} ---")

    # 3. Engine: Hugging Face
    if hf_token and hf_url:
        try:
            print("--- [AI_SYSTEM] Trying Hugging Face ---")
            hf_prompt = f"Answer this health question: {user_message}"
            response = requests.post(
                hf_url,
                headers={"Authorization": f"Bearer {hf_token}"},
                json={"inputs": hf_prompt},
                timeout=10
            )
            if response.status_code == 200:
                res = response.json()
                return res[0]['generated_text'] if isinstance(res, list) else res.get('generated_text', "Processing...")
        except Exception as e:
            print(f"--- [AI_SYSTEM] HF Error: {e} ---")

    return "Cura AI is currently syncing with medical databases. I can help with simple questions, but for deeper analysis, please check back in a moment."

def get_soap_notes(raw_text):
    """
    Converts raw text into SOAP notes.
    """
    gemini_key = os.environ.get('GEMINI_API_KEY') or getattr(settings, 'GEMINI_API_KEY', None)
    try:
        genai.configure(api_key=gemini_key)
        model = genai.GenerativeModel('gemini-1.5-flash')
        response = model.generate_content(f"Format as SOAP medical note: {raw_text}")
        return response.text.strip()
    except Exception:
        return "SUBJECTIVE: Patient report.\nPLAN: Clinical review."
