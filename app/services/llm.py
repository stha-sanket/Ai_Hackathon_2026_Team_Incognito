import requests
import json

class LLMService:
    def __init__(self, model="llama3:8b", base_url="http://localhost:11434"):
        self.model = model
        self.base_url = f"{base_url}/api/generate"

    def generate_response(self, prompt, system_prompt=None, model=None):
        payload = {
            "model": model or self.model,
            "prompt": prompt,
            "stream": False
        }
        if system_prompt:
            payload["system"] = system_prompt
            
        try:
            response = requests.post(self.base_url, json=payload)
            response.raise_for_status()
            return response.json().get("response", "")
        except Exception as e:
            return f"Error connecting to Ollama: {str(e)}"

    def chat(self, messages, system_prompt=None, model=None):
        # Ollama /api/chat endpoint
        chat_url = self.base_url.replace("generate", "chat")
        payload = {
            "model": model or self.model,
            "messages": messages,
            "stream": False
        }
        if system_prompt:
            # Add system prompt as the first message if not already there
            if not messages or messages[0].get("role") != "system":
                messages.insert(0, {"role": "system", "content": system_prompt})
        
        try:
            response = requests.post(chat_url, json=payload)
            response.raise_for_status()
            return response.json().get("message", {}).get("content", "")
        except Exception as e:
            return f"Error connecting to Ollama: {str(e)}"

    def detect_language(self, text):
        import re
        # 1. Check Devanagari (Direct Nepali/Hindi script)
        if re.search(r'[\u0900-\u097F]', text):
            return "ne"
        
        # 2. Check Romanized Nepali keywords
        roman_nepali_keywords = [
            "mero", "tapai", "chha", "xa", "cha", "ko", "ma", "yo", 
            "hunuhuncha", "garnu", "bhayo", "kata", "kaha", "ke", "ho", "hudai"
        ]
        words = text.lower().split()
        nepali_hits = sum(1 for w in words if w in roman_nepali_keywords)
        if nepali_hits >= 2:
            return "ne"
            
        return "en"

llm_service = LLMService()
