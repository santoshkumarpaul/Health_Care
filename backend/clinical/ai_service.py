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
    
    import PyPDF2
    from django.core.files.storage import default_storage

    records_data = []
    for r in medical_records[:5]:
        r_text = f"Date: {r.date}, Type: {r.record_type}, Title: {r.title}"
        if r.file:
            try:
                with default_storage.open(r.file.name, 'rb') as f:
                    if r.file.name.lower().endswith('.pdf'):
                        pdf_reader = PyPDF2.PdfReader(f)
                        extracted_text = ""
                        for i in range(min(2, len(pdf_reader.pages))):
                            extracted_text += pdf_reader.pages[i].extract_text() + "\n"
                        r_text += f"\n[Extracted PDF Content]:\n{extracted_text[:2000]}..."
                    elif r.file.name.lower().endswith(('.png', '.jpg', '.jpeg')):
                        r_text += f"\n[Note: This record contains an Image file ({r.file.name}).]"
            except Exception as e:
                print(f"--- [AI_SYSTEM] File Read Error: {e} ---")
        records_data.append(r_text)
        
    records_str = "\n\n".join(records_data) if records_data else "No recent records."

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

    # Get API Keys
    gemini_key = os.environ.get('GEMINI_API_KEY') or getattr(settings, 'GEMINI_API_KEY', None)
    grok_key = os.environ.get('GROK_API_KEY') or getattr(settings, 'GROK_API_KEY', None)
    gorq_key = os.environ.get('GORQ_API_KEY') or getattr(settings, 'GORQ_API_KEY', None)

    # 1. Primary Engine for Analysis: Gemini
    if gemini_key:
        # Try multiple model variants to avoid 404 errors
        variants = [
            'gemini-3.1-flash-lite', 
            'gemini-3-flash-preview',
            'gemini-2.5-flash-lite',
            'gemini-1.5-flash', 
            'gemini-pro'
        ]
        for model_name in variants:
            try:
                print(f"--- [AI_SYSTEM] Analysis: Trying Gemini {model_name} ---")
                genai.configure(api_key=gemini_key)
                # Force v1 if possible, though library often defaults to v1beta
                model = genai.GenerativeModel(model_name)
                response = model.generate_content(prompt)
                content = response.text.strip()
                if "```json" in content:
                    content = content.split("```json")[1].split("```")[0].strip()
                return json.loads(content)
            except Exception as e:
                print(f"--- [AI_SYSTEM] Gemini {model_name} Error: {str(e)[:100]} ---")

    # 2. Fallback Engine: xAI (Grok)
    if grok_key:
        for model_name in ['grok-beta', 'grok-vision-beta']:
            try:
                print(f"--- [AI_SYSTEM] Analysis: Trying Grok {model_name} ---")
                response = requests.post(
                    "https://api.x.ai/v1/chat/completions",
                    headers={"Authorization": f"Bearer {grok_key}", "Content-Type": "application/json"},
                    json={
                        "model": model_name, 
                        "messages": [{"role": "system", "content": "You are a clinical analyst. Return ONLY JSON."}, {"role": "user", "content": prompt}],
                        "temperature": 0
                    },
                    timeout=10
                )
                if response.status_code == 200:
                    content = response.json()['choices'][0]['message']['content'].strip()
                    if "```json" in content:
                        content = content.split("```json")[1].split("```")[0].strip()
                    return json.loads(content)
                else:
                    print(f"--- [AI_SYSTEM] Grok {model_name} Error: {response.status_code} ---")
            except Exception as e:
                print(f"--- [AI_SYSTEM] Grok {model_name} Error: {e} ---")

    # 3. Final Fallback Engine: Groq (Since this key is known to work)
    if gorq_key:
        try:
            print("--- [AI_SYSTEM] Analysis: Falling back to Groq ---")
            response = requests.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers={"Authorization": f"Bearer {gorq_key}", "Content-Type": "application/json"},
                json={
                    "model": "llama-3.3-70b-versatile", 
                    "messages": [{"role": "system", "content": "You are a clinical analyst. Return ONLY JSON."}, {"role": "user", "content": prompt}],
                    "response_format": {"type": "json_object"},
                    "temperature": 0.3
                },
                timeout=10
            )
            if response.status_code == 200:
                content = response.json()['choices'][0]['message']['content'].strip()
                if "```json" in content:
                    content = content.split("```json")[1].split("```")[0].strip()
                return json.loads(content)
            else:
                print(f"--- [AI_SYSTEM] Groq Analysis Error: {response.status_code} ---")
        except Exception as e:
            print(f"--- [AI_SYSTEM] Groq Analysis Error: {e} ---")

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

    # Dedicated Chatbot Engine: Groq (Llama 3)
    if gorq_key:
        try:
            print("--- [AI_SYSTEM] Chatbot: Using Groq ---")
            response = requests.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers={"Authorization": f"Bearer {gorq_key}", "Content-Type": "application/json"},
                json={"model": "llama-3.1-8b-instant", "messages": messages, "temperature": 0.5},
                timeout=10
            )
            if response.status_code == 200:
                return response.json()['choices'][0]['message']['content']
            else:
                print(f"--- [AI_SYSTEM] Groq Chatbot Status: {response.status_code} ---")
                print(f"--- [AI_SYSTEM] Groq Chatbot Error: {response.text[:200]} ---")
        except Exception as e:
            print(f"--- [AI_SYSTEM] Groq Chatbot Error: {e} ---")

    # Fallback Chatbot Engine: Gemini
    if gemini_key:
        for model_name in ['gemini-1.5-flash', 'gemini-pro']:
            try:
                print(f"--- [AI_SYSTEM] Chatbot: Fallback to Gemini {model_name} ---")
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
