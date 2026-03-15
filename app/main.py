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
    prompt = f"Does the following text express confirmation or agreement? (e.g., 'yes', 'ok', 'sure', 'go ahead'). Text: \"{text}\". Answer only 'yes' or 'no'."
    resp = llm_service.generate_response(prompt).strip().lower()
    return "yes" in resp

def is_rejection(text):
    prompt = f"Does the following text express rejection or cancellation? (e.g., 'no', 'stop', 'cancel', 'don't'). Text: \"{text}\". Answer only 'yes' or 'no'."
    resp = llm_service.generate_response(prompt).strip().lower()
    return "yes" in resp

@app.post("/chat")
async def chat_endpoint(request: Request, db: Session = Depends(db.get_db)):
    data = await request.json()
    user_message = data.get("message")
    
    if not user_message:
        raise HTTPException(status_code=400, detail="Message is required")

    # 1. Passive Sentiment Analysis (Mood Tracking)
    sentiment = mood_service.analyze_sentiment(user_message)
    mood_service.log_mood(db, sentiment)

    # 2. Save user message history
    db_message = models.Message(role="user", content=user_message, sentiment=sentiment)
    db.add(db_message)
    db.commit()

    response_content = ""

    # 3. Check for Pending Actions (Confirmation Logic)
    pending = db.query(models.PendingAction).order_by(models.PendingAction.timestamp.desc()).first()
    if pending and (datetime.now() - pending.timestamp) < timedelta(minutes=5):
        if is_confirmation(user_message):
            action_data = json.loads(pending.data)
            if pending.action_type == "medicine_add":
                medicine_service.add_medicine(action_data)
                response_content = f"Confirmed. I've added {action_data.get('name')} to your medicine records."
            elif pending.action_type == "object_save":
                object_locator_service.save_location(action_data["object"], action_data["location"])
                response_content = f"Confirmed. I've recorded that your {action_data['object']} is {action_data['location']}."
            db.delete(pending)
            db.commit()
        elif is_rejection(user_message):
            response_content = "Okay, I've cancelled that action."
            db.delete(pending)
            db.commit()
        
        if response_content:
            # Save assistant response
            db_assistant_message = models.Message(role="assistant", content=response_content)
            db.add(db_assistant_message)
            db.commit()
            return {"response": response_content, "sentiment": sentiment}

    # 4. Intent Routing (Detection only, no execution)
    
    # Check for Mood Summary
    if any(kw in user_message.lower() for kw in ["mood", "how have i been", "emotional", "feeling"]):
        response_content = mood_service.get_mood_summary(db)

    # Medicine Intent
    if not response_content:
        med_intent = medicine_service.parse_medicine_intent(user_message)
        if med_intent["action"] == "add":
            # Store as pending
            new_pending = models.PendingAction(
                action_type="medicine_add",
                data=json.dumps(med_intent)
            )
            db.add(new_pending)
            db.commit()
            response_content = f"I understand you want to add **{med_intent.get('name')}** ({med_intent.get('dosage')}) to your medicine list. Shall I proceed with saving this?"
        elif med_intent["action"] == "query":
            meds = medicine_service.list_medicines()
            response_content = f"Here are your medicine records:\n" + "".join(meds) if meds else "No medicine records found."

    # Object Locator Intent
    if not response_content:
        obj_intent = object_locator_service.parse_intent(user_message)
        if obj_intent["action"] == "save":
            # Store as pending
            new_pending = models.PendingAction(
                action_type="object_save",
                data=json.dumps(obj_intent)
            )
            db.add(new_pending)
            db.commit()
            response_content = f"It sounds like you want me to remember that your **{obj_intent['object']}** is **{obj_intent['location']}**. Is that correct?"
        elif obj_intent["action"] == "find":
            loc_entry = object_locator_service.find_location(obj_intent["object"])
            response_content = f"I found this: {loc_entry}" if loc_entry else f"I don't know where your {obj_intent['object']} is."

    # 5. Fallback to Health RAG
    if not response_content:
        relevant_chunks = rag_service.retrieve(user_message)
        context = "\n\n".join([c["content"] for c in relevant_chunks])
        system_prompt = "You are Swastha Sathi, a health companion. Use English. Always include a medical disclaimer."
        
        if context:
            prompt = f"Context:\n{context}\n\nUser: {user_message}\n\nAnswer based on context. Add disclaimer."
        else:
            prompt = user_message

        history = db.query(models.Message).order_by(models.Message.id.desc()).limit(6).all()
        history = history[::-1]
        chat_messages = [{"role": m.role, "content": m.content} for m in history]
        if context: chat_messages[-1]["content"] = prompt
            
        response_content = llm_service.chat(chat_messages, system_prompt=system_prompt)

    # 6. Distress Nudge
    nudge = mood_service.check_for_distress(db)
    if nudge: response_content += f"\n\n---\n{nudge}"

    # Save assistant response
    db_assistant_message = models.Message(role="assistant", content=response_content)
    db.add(db_assistant_message)
    db.commit()

    return {"response": response_content, "sentiment": sentiment}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
