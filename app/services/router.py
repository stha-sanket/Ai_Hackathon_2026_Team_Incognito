from .llm import llm_service

class RouterService:
    INTENT_PROMPT = """
    You are an intent classifier. Read the user message and return ONLY one of these exact labels:
    - HEALTH_QA         (asking about symptoms, diseases, treatments, first aid)
    - MEDICINE_ADD      (wants to add, save, or register a new medicine)
    - MEDICINE_QUERY    (asking about existing medicines, reminders, what they take)
    - OBJECT_SAVE       (telling you where they placed or put something)
    - OBJECT_QUERY      (asking where something is)
    - MOOD_QUERY        (ONLY for reviewing history, trends, or asking "how have I been feeling?")
    - GENERAL           (greetings, saying "I feel sad", "I am happy", thanks, small talk)

    Examples:
    - "I feel sad" -> GENERAL (This is an expression, not a query of history)
    - "How was my mood this week?" -> MOOD_QUERY
    - "hello" -> GENERAL
    - "Where are my keys?" -> OBJECT_QUERY

    User message: "{message}"

    Reply with only the label, nothing else.
    """

    def classify(self, message):
        import re
        msg_lower = message.lower()
        
        # Keyword-based override for common Roman/Devanagari Nepali queries
        object_query_keywords = [
            "where", "find", "location", "lost", "kata", "kaha", "khoi", "rakheko", "rakhiya", "rakhey",
            "कता", "कहाँ", "खोई", "राखेको", "varda", "veta", "vettiyena", "vetiena"
        ]
        if any(kw in msg_lower for kw in object_query_keywords) and any(w in msg_lower for w in ["mero", "मेरो", "is", "xa", "chha", "cha", "rakhya", "rakheko"]):
            return "OBJECT_QUERY"

        medicine_keywords = [
            "medicine", "tablet", "dabaai", "ausadhi", "khani", "schedule", "time", "dosage",
            "औषधि", "दबाई", "खाने", "खानी", "talika"
        ]
        if any(kw in msg_lower for kw in medicine_keywords) and any(w in msg_lower for w in ["mero", "मेरो", "k", "ke", "list", "all", "kun", "dekha"]):
            return "MEDICINE_QUERY"
        
        health_keywords = [
            "upachar", "bhayo", "dukhyo", "samsya", "vayo", "garne", "kasari",
            "उपचार", "भयो", "दुख्यो", "समस्या", "कसरी"
        ]
        if any(kw in msg_lower for kw in health_keywords):
            return "HEALTH_QA"

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
