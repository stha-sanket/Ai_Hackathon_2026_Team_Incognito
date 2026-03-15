from .llm import llm_service

class RouterService:
    INTENT_PROMPT = """
    You are an intent classifier. Read the user message and return ONLY one of these exact labels:
    - HEALTH_QA         (asking about symptoms, diseases, treatments, first aid)
    - MEDICINE_ADD      (wants to add, save, or register a new medicine)
    - MEDICINE_QUERY    (asking about existing medicines, reminders, what they take)
    - OBJECT_SAVE       (telling you where they placed or put something)
    - OBJECT_QUERY      (asking where something is)
    - MOOD_QUERY        (asking about their mood or feelings history)
    - GENERAL           (greetings, thanks, anything else)

    User message: "{message}"

    Reply with only the label, nothing else.
    """

    def classify(self, message):
        prompt = self.INTENT_PROMPT.format(message=message)
        label = llm_service.generate_response(prompt).strip().upper()
        
        # Cleanup in case LLM adds extra text
        valid_labels = [
            "HEALTH_QA", "MEDICINE_ADD", "MEDICINE_QUERY", 
            "OBJECT_SAVE", "OBJECT_QUERY", "MOOD_QUERY", "GENERAL"
        ]
        for v in valid_labels:
            if v in label:
                return v
        return "GENERAL"

router_service = RouterService()
