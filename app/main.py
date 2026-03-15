from fastapi import FastAPI, Depends, HTTPException, Request
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse
from sqlalchemy.orm import Session
from .database import db, models
from .services.llm import llm_service
from .services.rag import rag_service
from .services.medicine import medicine_service
from .services.object_locator import object_locator_service
from .services.mood import mood_service
from .services.router import router_service
import os
import json
from datetime import datetime, timedelta

# Create tables
models.Base.metadata.create_all(bind=db.engine)

app = FastAPI(title="Swastha Sathi (Health Companion)")

# Mount static files
app.mount("/static", StaticFiles(directory="static"), name="static")

@app.get("/", response_class=HTMLResponse)
async def read_index():
    with open("static/index.html", "r") as f:
        return f.read()

def is_confirmation(text):
    prompt = f"Does the user confirm or say yes? Text: \"{text}\". Answer only 'yes' or 'no'."
    resp = llm_service.generate_response(prompt).strip().lower()
    return "yes" in resp

def is_rejection(text):
    prompt = f"Does the user reject or say no? Text: \"{text}\". Answer only 'yes' or 'no'."
    resp = llm_service.generate_response(prompt).strip().lower()
    return "yes" in resp

@app.post("/chat")
async def chat_endpoint(request: Request, db: Session = Depends(db.get_db)):
    data = await request.json()
    user_message = data.get("message")
    
    if not user_message:
        raise HTTPException(status_code=400, detail="Message is required")

    # 1. Passive Mood Logging
    sentiment = mood_service.analyze_sentiment(user_message)
    mood_service.log_mood(db, sentiment)
    
    # Save User History
    db_message = models.Message(role="user", content=user_message, sentiment=sentiment)
    db.add(db_message)
    db.commit()

    response_content = ""

    # Fix 4: Check for Pending Actions FIRST
    pending = db.query(models.PendingAction).order_by(models.PendingAction.timestamp.desc()).first()
    if pending and (datetime.now() - pending.timestamp) < timedelta(minutes=5):
        if is_confirmation(user_message):
            action_data = json.loads(pending.data)
            if pending.action_type == "MEDICINE_ADD":
                medicine_service.add_medicine(action_data)
                response_content = f"Confirmed. I've added **{action_data.get('name')}** to your records."
            elif pending.action_type == "OBJECT_SAVE":
                object_locator_service.save_location(action_data["object"], action_data["location"])
                response_content = f"Confirmed. I've recorded that your **{action_data['object']}** is **{action_data['location']}**."
            db.delete(pending)
            db.commit()
        elif is_rejection(user_message):
            response_content = "Okay, I've cancelled that."
            db.delete(pending)
            db.commit()
        
        if response_content:
            finish_chat(db, response_content)
            return {"response": response_content, "sentiment": sentiment}

    # Fix 1: Strict Intent Classification
    intent = router_service.classify(user_message)

    # Fix 2: Split Handlers
    if intent == "MEDICINE_ADD":
        med_data = medicine_service.parse_medicine_data(user_message)
        if med_data.get("name"):
            new_pending = models.PendingAction(
                action_type="MEDICINE_ADD",
                data=json.dumps(med_data)
            )
            db.add(new_pending)
            db.commit()
            response_content = f"You want to add **{med_data.get('name')}** ({med_data.get('dosage')}). Shall I save this?"
        else:
            response_content = "I couldn't quite catch the medicine name. Could you repeat that?"

    elif intent == "MEDICINE_QUERY":
        meds = medicine_service.get_medicines()
        if meds:
            response_content = "Here are your medicines:\n- " + "\n- ".join(meds)
        else:
            # Fix 3: Improved empty state message
            response_content = "You haven't added any medicines yet."

    elif intent == "OBJECT_SAVE":
        obj_data = object_locator_service.parse_object_data(user_message)
        if obj_data.get("object") and obj_data.get("location"):
            new_pending = models.PendingAction(
                action_type="OBJECT_SAVE",
                data=json.dumps(obj_data)
            )
            db.add(new_pending)
            db.commit()
            response_content = f"Should I remember that your **{obj_data['object']}** is **{obj_data['location']}**?"
        else:
            response_content = "Where did you put it? I need both the item and its location."

    elif intent == "OBJECT_QUERY":
        # Extract object name for query
        obj_name_prompt = f"Extract the object name being searched for in: \"{user_message}\". Return only the name."
        obj_name = llm_service.generate_response(obj_name_prompt).strip()
        loc = object_locator_service.find_location(obj_name)
        if loc:
            response_content = f"Found it: {loc}"
        else:
            response_content = f"I don't have a record of your {obj_name}."

    elif intent == "MOOD_QUERY":
        response_content = mood_service.get_mood_summary(db)

    elif intent == "HEALTH_QA":
        # Fix 5: RAG fallback for unknown health topics
        relevant_chunks = rag_service.retrieve(user_message)
        if not relevant_chunks:
            response_content = (
                "I don't have specific information about that in my knowledge base. "
                "Please consult a qualified healthcare professional or visit your nearest health post."
            )
        else:
            context = "\n\n".join([c["content"] for c in relevant_chunks])
            system_prompt = "You are Swastha Sathi. Use English. Only answer from context. Add medical disclaimer."
            prompt = f"Context:\n{context}\n\nUser: {user_message}"
            
            history = db.query(models.Message).order_by(models.Message.id.desc()).limit(6).all()
            history = history[::-1]
            chat_messages = [{"role": m.role, "content": m.content} for m in history]
            chat_messages[-1]["content"] = prompt
            response_content = llm_service.chat(chat_messages, system_prompt=system_prompt)

    elif intent == "GENERAL":
        response_content = llm_service.chat([{"role": "user", "content": user_message}], 
                                          system_prompt="You are Swastha Sathi, a friendly health companion. Say hello or help the user.")

    # 6. Distress Nudge
    nudge = mood_service.check_for_distress(db)
    if nudge: response_content += f"\n\n---\n{nudge}"

    finish_chat(db, response_content)
    return {"response": response_content, "sentiment": sentiment}

def finish_chat(db, content):
    db_assistant_message = models.Message(role="assistant", content=content)
    db.add(db_assistant_message)
    db.commit()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
