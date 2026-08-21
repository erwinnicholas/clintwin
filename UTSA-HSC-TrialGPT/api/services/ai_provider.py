import os
from google import genai
from groq import Groq
from dotenv import load_dotenv

load_dotenv()

def _call_gemini(prompt: str, system_prompt: str) -> str:
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        raise ValueError("GEMINI_API_KEY is not set.")
    
    # We pass the system_prompt directly into the contents for Gemini
    client = genai.Client(api_key=api_key)
    model = os.environ.get("GEMINI_MODEL", "gemini-2.5-pro")
    
    full_prompt = f"System Context:\n{system_prompt}\n\nUser Request:\n{prompt}"
    
    response = client.models.generate_content(
        model=model,
        contents=full_prompt
    )
    if response.text:
        return response.text.strip()
    raise ValueError("Gemini returned an empty response.")


def _call_groq(prompt: str, system_prompt: str) -> str:
    api_key = os.environ.get("GROQ_API_KEY")
    if not api_key:
        raise ValueError("GROQ_API_KEY is not set.")
        
    client = Groq(api_key=api_key)
    model = os.environ.get("GROQ_MODEL", "llama-3.3-70b-versatile")
    
    chat_completion = client.chat.completions.create(
        messages=[
            {
                "role": "system",
                "content": system_prompt,
            },
            {
                "role": "user",
                "content": prompt,
            }
        ],
        model=model,
    )
    
    if chat_completion.choices and chat_completion.choices[0].message:
        return chat_completion.choices[0].message.content.strip()
    raise ValueError("Groq returned an empty response.")


import time

def generate(prompt: str, system_prompt: str) -> str:
    provider = os.environ.get("AI_PROVIDER", "auto").lower()
    
    # If explicitly groq
    if provider == "groq":
        return _call_groq(prompt, system_prompt)
        
    # Default is auto or gemini
    max_retries = 4
    for attempt in range(max_retries):
        try:
            return _call_gemini(prompt, system_prompt)
        except Exception as e:
            err_str = str(e)
            # Retry on rate limits or unavailability
            if "429" in err_str or "503" in err_str:
                if attempt < max_retries - 1:
                    time.sleep(2 ** attempt)  # Exponential backoff: 1s, 2s, 4s...
                    continue
            
            # If we've exhausted retries or hit a non-retryable error, fallback to Groq
            if provider == "auto":
                groq_key = os.environ.get("GROQ_API_KEY", "")
                if groq_key and groq_key != "your_groq_api_key_here":
                    print(f"Gemini failed ({e}), falling back to Groq...")
                    try:
                        return _call_groq(prompt, system_prompt)
                    except Exception as groq_err:
                        raise Exception(f"Gemini failed ({e}) AND Groq fallback failed ({groq_err})")
                else:
                    raise Exception(f"Gemini API failed: {e} (Groq fallback disabled due to missing key)")
            raise e
