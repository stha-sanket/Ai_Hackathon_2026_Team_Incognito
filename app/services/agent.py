import requests
import json
import re
from .llm import llm_service
from .rag import rag_service
from .router import router_service

BUN_API_URL = "http://localhost:3000/api"

class SwasthaAgent:
    def __init__(self):
        # --- System Prompts (Multi-Language Intelligence) ---
        self.PROMPT_QA_NE = (
            "तपाईं एक स्वास्थ्य सहायक हुनुहुन्छ।\n"
            "कडा नियम: केवल नेपाली देवनागरी लिपिमा मात्र जवाफ दिनुहोस्।\n"
            "अंग्रेजी, Romanized Nepali वा कुनै अनुवाद थप्न पाइँदैन।\n"
            "केवल प्रदान गरिएको सन्दर्भबाट जवाफ दिनुहोस्। अन्तमा चिकित्सा अस्वीकरण थप्नुहोस्।"
        )
        self.PROMPT_GENERAL_NE = (
            "तपाईं Swastha Sathi हुनुहुन्छ — एक मैत्रीपूर्ण नेपाली सहायक।\n"
            "कडा नियमहरू:\n"
            "1. केवल नेपाली देवनागरी लिपिमा मात्र जवाफ दिनुहोस्।\n"
            "2. कुनै पनि अंग्रेजी वा Romanized Nepali (जस्तै 'tapai', 'thik xa') लेख्न पाइँदैन।\n"
            "3. कुनै अनुवाद वा translation थप्न पाइँदैन।\n"
            "5. User बिरामी छ भनी कहिल्यै assume नगर्नुहोस्।\n"
            "उदाहरण:\n"
            "Assistant: खुसी लाग्यो! के म तपाईंलाई अरू केही सहयोग गर्न सक्छु? never provide a translation of the text in romanized nepali"
        )
        
        self.PROMPT_QA_EN = "You are a health assistant. Reply only in English. No Nepali or Romanized Nepali. Answer only from provided context. Add medical disclaimer at the end."
        self.PROMPT_GENERAL_EN = (
            "You are Swastha Sathi, a friendly assistant.\n"
            "Strict rules:\n"
            "1. Reply ONLY in plain English. No Nepali, no Romanized Nepali.\n"
            "2. Never add translations or transliterations.\n"
            "3. Never assume the user is sick unless explicitly stated.\n"
            "Example:\n"
            "User: I am fine\n"
            "Assistant: Great to hear! How can I help you today?"
        )

    def is_confirmation(self, text):
        prompt = f"Does the user confirm or say yes? Text: \"{text}\". Answer only 'yes' or 'no'."
        resp = llm_service.generate_response(prompt).strip().lower()
        return "yes" in resp

    def is_rejection(self, text):
        prompt = f"Does the user reject or say no? Text: \"{text}\". Answer only 'yes' or 'no'."
        resp = llm_service.generate_response(prompt).strip().lower()
        return "yes" in resp

    def run_chat(self, user_id, message, history=None):
        lang = llm_service.detect_language(message)
        
        # 1. Intent Classification (The "Brain")
        intent = router_service.classify(message)
        
        # 2. Process Intents
        
        # --- MEDICINE QUERY ---
        if intent == "MEDICINE_QUERY":
            try:
                resp = requests.get(f"{BUN_API_URL}/medicines/user/{user_id}")
                meds = resp.json() if resp.status_code == 200 else []
                if meds:
                    if lang == "ne":
                        res = "यहाँ तपाईंका औषधिहरू छन्:\n" + "\n".join([f"- **{m['name']}** ({m['dosage']}) - {', '.join([s['time'] for s in m['schedule']])}" for m in meds])
                    else:
                        res = "Here are your medicines:\n" + "\n".join([f"- **{m['name']}** ({m['dosage']}) - {', '.join([s['time'] for s in m['schedule']])}" for m in meds])
                    return res
                return "तपाईंले अहिलेसम्म कुनै औषधि थप्नुभएको छैन।" if lang == "ne" else "You haven't added any medicines yet."
            except:
                return "Connecting to health records failed."

        # --- HEALTH QA (RAG System) ---
        elif intent == "HEALTH_QA":
            relevant_chunks = rag_service.retrieve(message)
            if not relevant_chunks:
                return (
                    "मसँग मेरो ज्ञानकोषमा त्यसको बारेमा कुनै विशिष्ट जानकारी छैन। कृपया स्वास्थ्य पेशेवरसँग परामर्श लिनुहोस्।"
                    if lang == "ne" else
                    "I don't have specific information about that. Please consult a professional."
                )
            
            context = "\n\n".join([c["content"] for c in relevant_chunks])
            system_prompt = self.PROMPT_QA_NE if lang == "ne" else self.PROMPT_QA_EN
            prompt = f"Context from Verified Knowledge Base:\n{context}\n\nUser Question: {message}"
            
            chat_messages = history or []
            chat_messages.append({"role": "user", "content": prompt})
            return llm_service.chat(chat_messages, system_prompt=system_prompt)

        # --- OBJECT QUERY ---
        elif intent == "OBJECT_QUERY":
            obj_name_prompt = f"Identify the object name from the user message: \"{message}\". Reply ONLY with the name (1-2 words)."
            obj_name = llm_service.generate_response(obj_name_prompt).strip().rstrip('.')
            
            try:
                # Searching the Bun database for the recorded location
                resp = requests.get(f"{BUN_API_URL}/objects?userId={user_id}&name={obj_name}")
                if resp.status_code == 200:
                    data = resp.json()
                    loc = data.get("location", "unknown")
                    time = data.get("time", "recently")
                    if lang == "ne":
                        return f"भेटियो: तपाईंको **{obj_name}** **{loc}** मा छ ({time} मा रेकर्ड गरिएको)।"
                    else:
                        return f"Found it: Your **{obj_name}** is at **{loc}** (recorded on {time})."
            except: pass
            
            return f"माफ गर्नुहोस्, मसँग तपाईंको {obj_name} को कुनै रेकर्ड छैन।" if lang == "ne" else f"I don't have a record of your {obj_name}."

        # --- OBJECT / MEDICINE SAVE (Confirmation Logic Trigger) ---
        elif intent in ["OBJECT_SAVE", "MEDICINE_ADD"]:
            if lang == "ne":
                return f"के म यसलाई तपाईंको रेकर्डमा बचत गरुँ? (Should I save this to your records?)"
            else:
                return f"I've noted that. Should I save this update to your records?"

        # --- GENERAL ---
        else:
            system_prompt = self.PROMPT_GENERAL_NE if lang == "ne" else self.PROMPT_GENERAL_EN
            chat_messages = history or []
            chat_messages.append({"role": "user", "content": message})
            return llm_service.chat(chat_messages, system_prompt=system_prompt)

    def generate_report(self, user_id, history=None):
        """Generate a daily health report by analyzing chat history."""
        try:
            chat_history = history or []
            
            # Build a readable conversation log
            if chat_history:
                convo_lines = []
                for msg in chat_history[-30:]:  # Last 30 messages
                    role = "User" if msg.get("role") == "patient" else "Assistant"
                    convo_lines.append(f"{role}: {msg.get('content', '')}")
                conversation_text = "\n".join(convo_lines)
            else:
                conversation_text = "No conversation history available."

            # Step 1: Get mood score from LLM
            mood_prompt = (
                f"Analyze this conversation and rate the user's overall mood/wellbeing on a scale of 1 to 10.\n"
                f"1 = very distressed, 5 = neutral, 10 = very happy and healthy.\n\n"
                f"Conversation:\n{conversation_text}\n\n"
                f"Reply with ONLY a single number between 1 and 10. Nothing else."
            )
            mood_raw = llm_service.generate_response(mood_prompt).strip()
            
            # Extract the number
            mood_score = 5  # default
            for char in mood_raw:
                if char.isdigit():
                    val = int(char)
                    if 1 <= val <= 10:
                        mood_score = val
                        break
            # Handle "10" specifically
            if "10" in mood_raw:
                mood_score = 10

            # Step 2: Generate the summary report
            report_prompt = (
                f"You are a health companion AI. Based on the conversation history below, "
                f"write a brief daily wellness summary for the user.\n\n"
                f"Conversation:\n{conversation_text}\n\n"
                f"Rules:\n"
                f"1. Write ONLY in plain English.\n"
                f"2. Do NOT use any markdown formatting (no **, no #, no -, no bullet points).\n"
                f"3. Keep it concise, 5 to 8 sentences.\n"
                f"4. Summarize what topics were discussed.\n"
                f"5. Note the user's apparent mood and emotional state.\n"
                f"6. End with a brief personalized health tip.\n"
                f"7. If there is no conversation history, say so kindly."
            )
            report = llm_service.generate_response(
                report_prompt,
                system_prompt="You are a wellness report writer. Write concise summaries in plain English. Never use markdown."
            )
            
            # Strip any markdown that may have leaked through
            report = re.sub(r'\*\*?', '', report)
            report = re.sub(r'#+\s*', '', report)
            report = re.sub(r'^[-*]\s', '', report, flags=re.MULTILINE)
            
            return {
                "report": report.strip(),
                "moodScore": mood_score
            }
        except Exception as e:
            return {
                "report": f"Could not generate report: {str(e)}",
                "moodScore": 5
            }

swastha_agent = SwasthaAgent()
