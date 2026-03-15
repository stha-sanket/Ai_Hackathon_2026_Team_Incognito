from .llm import llm_service
import json
import re
import os

MEDICINE_FILE = "data/medicines.txt"

class MedicineService:
    def parse_medicine_data(self, text):
        prompt = f"""
        Extract medicine details from the following text: "{text}"
        Return a JSON object with:
        - name: medicine name
        - dosage: dosage (e.g., 500mg)
        - frequency: frequency (e.g., twice a day)
        - timing: timing (e.g., after meals)
        
        Only return the JSON.
        """
        response = llm_service.generate_response(prompt)
        try:
            match = re.search(r'\{.*\}', response, re.DOTALL)
            if match:
                return json.loads(match.group(0))
            return {}
        except:
            return {}

    def add_medicine(self, data):
        name = data.get('name', 'N/A')
        dosage = data.get('dosage', 'N/A')
        freq = data.get('frequency', 'N/A')
        timing = data.get('timing', 'N/A')
        
        line = f"{name} | {dosage} | {freq} {timing}\n"
        
        # Ensure directory exists
        os.makedirs(os.path.dirname(MEDICINE_FILE), exist_ok=True)
        
        with open(MEDICINE_FILE, "a", encoding="utf-8") as f:
            f.write(line)
            f.flush() # Fix 3: Force write to disk
        return data

    def get_medicines(self):
        # Fix 3: Consistent read function
        if not os.path.exists(MEDICINE_FILE):
            return []
        with open(MEDICINE_FILE, "r", encoding="utf-8") as f:
            lines = [l.strip() for l in f.readlines() if l.strip()]
        return lines

medicine_service = MedicineService()
