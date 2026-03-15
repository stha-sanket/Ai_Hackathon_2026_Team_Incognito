import requests
import json

class LLMService:
    def __init__(self, model="gemma3:4b", base_url="http://localhost:11434"):
        self.model = model
        self.base_url = f"{base_url}/api"

    def generate_response(self, prompt, system_prompt=None, model=None):
        payload = {
            "model": model or self.model,
            "prompt": prompt,
            "stream": False,
            "options": {
                "temperature": 0.7,
                "num_predict": 512,
                "repeat_penalty": 1.1
            }
        }
        if system_prompt:
            payload["system"] = system_prompt
            
        try:
            response = requests.post(f"{self.base_url}/generate", json=payload)
            response.raise_for_status()
            return response.json().get("response", "")
        except Exception as e:
            return f"Error connecting to Ollama: {str(e)}"

    def chat(self, messages, system_prompt=None, model=None):
        payload = {
            "model": model or self.model,
            "messages": messages,
            "stream": False,
            "options": {
                "temperature": 0.7,
                "num_predict": 512,
                "repeat_penalty": 1.1
            }
        }
        if system_prompt:
            # Add system prompt as the first message if not already there
            if not messages or messages[0].get("role") != "system":
                messages.insert(0, {"role": "system", "content": system_prompt})
        
        try:
            response = requests.post(f"{self.base_url}/chat", json=payload)
            response.raise_for_status()
            return response.json().get("message", {}).get("content", "")
        except Exception as e:
            return f"Error connecting to Ollama: {str(e)}"

    def detect_language(self, text):
        import re
        # Check Devanagari (Direct Nepali/Hindi script)
        if re.search(r'[\u0900-\u097F]', text):
            return "ne"
        
        # Expanded Romanized Nepali keywords
        roman_nepali_keywords = [
            "mero", "tapai", "chha", "xa", "cha", "ko", "ma", "yo", 
            "hunuhuncha", "garnu", "bhayo", "vayo", "kata", "kaha", "ke", "ho", "hudai",
            "khoi", "rakheko", "rakhe", "xaina", "chaina", "hamro", "timro", "k x", "k xa",
            "ausadhi", "dabaai", "khani", "khanu", "gareko", "gare", "pani", "nai", "halkhavar",
            "thik", "thikxa", "malai", "sab", "ramro", "huncha", "hudaina", "gardai", "garna"
        ]
        words = text.lower().replace('?', ' ').replace('.', ' ').split()
        nepali_hits = sum(1 for w in words if w in roman_nepali_keywords)
        
        # Lower threshold for short commands
        if nepali_hits >= 1 and len(words) <= 3:
            return "ne"
        if nepali_hits >= 2:
            return "ne"
            
        return "en"

llm_service = LLMService()
