from .llm import llm_service
import json
import re
import os
import datetime

OBJECTS_FILE = "data/objects.txt"

class ObjectLocatorService:
    def parse_object_data(self, text):
        prompt = f"""
        Extract object location details from: "{text}"
        Return JSON object with:
        - object: object name
        - location: location description
        
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

    def save_location(self, object_name, location):
        ts = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        line = f"{ts} | {object_name} | {location}\n"
        
        os.makedirs(os.path.dirname(OBJECTS_FILE), exist_ok=True)
        
        with open(OBJECTS_FILE, "a", encoding="utf-8") as f:
            f.write(line)
            f.flush()
        return line.strip()

    def find_location(self, object_name):
        if not os.path.exists(OBJECTS_FILE):
            return None
        with open(OBJECTS_FILE, "r", encoding="utf-8") as f:
            lines = [l.strip() for l in f.readlines() if l.strip()]
            for line in reversed(lines):
                if object_name.lower() in line.lower():
                    return line
        return None

object_locator_service = ObjectLocatorService()
