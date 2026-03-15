from .llm import llm_service
from ..database import models
from sqlalchemy.orm import Session
import re

class MoodService:
    def get_batch_analysis(self, db: Session):
        from collections import defaultdict
        
        # Fetch more context for better trend analysis
        messages = db.query(models.Message).order_by(models.Message.timestamp.desc()).limit(150).all()
        messages = messages[::-1] # Chronological order
        
        if not messages:
            return {
                "summary": "You haven't shared much yet. I'll be able to analyze your mood once we've had our first conversation!",
                "overall_score": 1,
                "history": []
            }
            
        # Group messages by date
        daily_conversations = defaultdict(list)
        for m in messages:
            date_str = m.timestamp.strftime("%Y-%m-%d")
            role_name = "User" if m.role == "user" else "Assistant"
            daily_conversations[date_str].append(f"{role_name}: {m.content}")
            
        sorted_dates = sorted(daily_conversations.keys())
        
        # Format history for LLM
        history_input = ""
        for date in sorted_dates:
            history_input += f"--- DATE: {date} ---\n"
            history_input += "\n".join(daily_conversations[date]) + "\n\n"
            
        prompt = f"""
        Analyze the following conversation history grouped by date.
        Based strictly on the USER'S messages, perform these tasks:
        1. Summarize their overall emotional state and health trend.
        2. Assign a single overall sentiment score where:
           0 = Negative/Distressed/Anxious/Suicidal/Sad
           1 = Neutral/Stable/Informational/Greeting
           2 = Positive/Happy/Grateful/Satisfied
        3. Assign a sentiment score (0, 1, or 2) for EACH specific date.
           
        CRITICAL: If the user expresses pain, overwhelming work, or severe distress, the score MUST be 0.
           
        Format your response exactly like this:
        OVERALL_SCORE: [digit]
        DAILY_SCORES:
        {sorted_dates[0]}: [score]
        ...
        SUMMARY: [Your multi-line summary here]
        
        HISTORY:
        {history_input}
        """
        
        response = llm_service.generate_response(prompt, model="gemma3:4b")
        
        # Parse overall score
        overall_score_res = re.search(r'OVERALL_SCORE:\s*([0-2])', response)
        overall_score = int(overall_score_res.group(1)) if overall_score_res else 1
        
        history_plot = []
        for date in sorted_dates:
            # More flexible regex to match date even if inside brackets or markdown
            # Looks for date then anything then colon then score
            day_match = re.search(fr'{date}.*?:\s*([0-2])', response)
            score = int(day_match.group(1)) if day_match else 1
            history_plot.append({
                "timestamp": date,
                "score": score
            })

        summary_res = re.search(r'SUMMARY:\s*(.*)', response, re.DOTALL)
        summary = summary_res.group(1).strip() if summary_res else response
        
        return {
            "summary": summary,
            "overall_score": overall_score,
            "history": history_plot
        }

    def check_for_distress(self, db: Session):
        # We can still check for distressed keywords in recent messages for the nudge
        from datetime import datetime, timedelta
        recent_messages = db.query(models.Message).filter(
            models.Message.role == "user",
            models.Message.timestamp >= datetime.now() - timedelta(hours=1)
        ).all()
        
        if not recent_messages: return None
        
        # Simple keyword check for urgent nudge
        distress_keywords = ["bad", "sad", "help", "pain", "दुख", "मद्दत", "गाह्रो"]
        curr_text = " ".join([m.content.lower() for m in recent_messages])
        
        if any(kw in curr_text for kw in distress_keywords):
            # Check for cooldown
            recent_nudge = db.query(models.Message).filter(
                models.Message.role == "assistant",
                models.Message.content.contains("I noticed you've been feeling a bit down"),
                models.Message.timestamp >= datetime.now() - timedelta(minutes=30)
            ).first()
            
            if not recent_nudge:
                return "I noticed you've been feeling a bit down. Remember, I'm here to listen, but please talk to a professional if you need immediate support."
        
        return None

    def log_manual_mood(self, db: Session, sentiment):
        # We still allow manual logs for the timeline view
        mood_log = models.MoodLog(sentiment=sentiment)
        db.add(mood_log)
        db.commit()
        return mood_log

mood_service = MoodService()
