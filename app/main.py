from fastapi import FastAPI, Depends, HTTPException, Request
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates
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

# Setup templates
templates = Jinja2Templates(directory="templates")

# --- HTML Routes ---

@app.get("/", response_class=HTMLResponse)
async def read_index(request: Request):
    return templates.TemplateResponse("index.html", {"request": request, "active_page": "home"})

@app.get("/medicines", response_class=HTMLResponse)
async def read_medicines(request: Request):
    return templates.TemplateResponse("medicines.html", {"request": request, "active_page": "medicines"})

@app.get("/objects", response_class=HTMLResponse)
async def read_objects(request: Request):
    return templates.TemplateResponse("objects.html", {"request": request, "active_page": "objects"})

@app.get("/mood", response_class=HTMLResponse)
async def read_mood(request: Request):
    return templates.TemplateResponse("mood.html", {"request": request, "active_page": "mood"})

# --- Helper Functions ---

def is_confirmation(text):
    prompt = f"Does the user confirm or say yes? Text: \"{text}\". Answer only 'yes' or 'no'."
    resp = llm_service.generate_response(prompt).strip().lower()
    return "yes" in resp

def is_rejection(text):
    prompt = f"Does the user reject or say no? Text: \"{text}\". Answer only 'yes' or 'no'."
    resp = llm_service.generate_response(prompt).strip().lower()
    return "yes" in resp

def med_to_dict(med):
    return {
        "id": med.id,
        "name": med.name,
        "dosage": med.dosage,
        "frequency": med.frequency,
        "timing": med.timing,
        "is_active": med.is_active
    }

def obj_to_dict(obj):
    return {
        "id": obj.id,
        "object_name": obj.object_name,
        "location": obj.location,
        "timestamp": obj.timestamp.isoformat()
    }

# --- API Endpoints ---

@app.get("/api/medicines")
async def get_medicines_api(db: Session = Depends(db.get_db)):
    meds = medicine_service.get_medicines(db)
    return {"medicines": [med_to_dict(m) for m in meds]}

@app.post("/api/medicines")
async def add_medicine_api(request: Request, db: Session = Depends(db.get_db)):
    data = await request.json()
    med = medicine_service.add_medicine(db, data)
    return med_to_dict(med)

@app.put("/api/medicines/{med_id}")
async def update_medicine_api(med_id: int, request: Request, db: Session = Depends(db.get_db)):
    data = await request.json()
    med = medicine_service.update_medicine(db, med_id, data)
    if not med:
        raise HTTPException(status_code=404, detail="Medicine not found")
    return med_to_dict(med)

@app.delete("/api/medicines/{med_id}")
async def delete_medicine_api(med_id: int, db: Session = Depends(db.get_db)):
    medicine_service.delete_medicine(db, med_id)
    return {"status": "deleted"}

@app.get("/api/objects")
async def get_objects_api(db: Session = Depends(db.get_db)):
    objs = object_locator_service.get_all_locations(db)
    return {"objects": [obj_to_dict(o) for o in objs]}

@app.post("/api/objects")
async def add_object_api(request: Request, db: Session = Depends(db.get_db)):
    data = await request.json()
    loc = object_locator_service.save_location(db, data.get("object"), data.get("location"))
    return obj_to_dict(loc)

@app.put("/api/objects/{loc_id}")
async def update_object_api(loc_id: int, request: Request, db: Session = Depends(db.get_db)):
    data = await request.json()
    loc = object_locator_service.update_location(db, loc_id, data)
    if not loc:
        raise HTTPException(status_code=404, detail="Object record not found")
    return obj_to_dict(loc)

@app.delete("/api/objects/{loc_id}")
async def delete_object_api(loc_id: int, db: Session = Depends(db.get_db)):
    object_locator_service.delete_location(db, loc_id)
    return {"status": "deleted"}

@app.get("/api/mood-summary")
async def get_mood_summary_api(db: Session = Depends(db.get_db)):
    result = mood_service.get_batch_analysis(db)
    return result

@app.get("/api/mood-history")
async def get_mood_history_api(db: Session = Depends(db.get_db)):
    result = mood_service.get_batch_analysis(db)
    return {"history": result.get("history", [])}

@app.post("/api/mood")
async def log_mood_api(request: Request, db: Session = Depends(db.get_db)):
    data = await request.json()
    sentiment = str(data.get("sentiment"))
    if sentiment not in ["0", "1", "2"]:
        raise HTTPException(status_code=400, detail="Invalid sentiment. Must be 0, 1, or 2.")
    mood_service.log_manual_mood(db, sentiment)
    return {"status": "success"}

@app.delete("/api/chat-history")
async def clear_chat_history_api(db: Session = Depends(db.get_db)):
    db.query(models.Message).delete()
    db.query(models.MoodLog).delete()
    db.query(models.PendingAction).delete()
    db.commit()
    return {"status": "success"}

@app.post("/chat")
async def chat_endpoint(request: Request, db: Session = Depends(db.get_db)):
    data = await request.json()
    user_message = data.get("message")
    
    if not user_message:
        raise HTTPException(status_code=400, detail="Message is required")

    # Save User History (Passive logging removed to completely change focus to batch analysis)
    db_message = models.Message(role="user", content=user_message)
    db.add(db_message)
    db.commit()

    response_content = ""

    # Check for Pending Actions FIRST
    pending = db.query(models.PendingAction).order_by(models.PendingAction.timestamp.desc()).first()
    lang = llm_service.detect_language(user_message)
    
    if pending and (datetime.now() - pending.timestamp) < timedelta(minutes=5):
        if is_confirmation(user_message):
            action_data = json.loads(pending.data)
            if pending.action_type == "MEDICINE_ADD":
                medicine_service.add_medicine(db, action_data)
                response_content = (
                    f"पुष्टि भयो। मैले तपाईंको रेकर्डमा **{action_data.get('name')}** थपेको छु।" 
                    if lang == "ne" else 
                    f"Confirmed. I've added **{action_data.get('name')}** to your records."
                )
            elif pending.action_type == "OBJECT_SAVE":
                object_locator_service.save_location(db, action_data["object"], action_data["location"])
                response_content = (
                    f"पुष्टि भयो। मैले तपाईंको **{action_data['object']}** **{action_data['location']}** मा छ भनेर रेकर्ड गरेको छु।" 
                    if lang == "ne" else 
                    f"Confirmed. I've recorded that your **{action_data['object']}** is **{action_data['location']}**."
                )
            db.delete(pending)
            db.commit()
        elif is_rejection(user_message):
            response_content = "हुन्छ, मैले त्यो रद्द गरेको छु।" if lang == "ne" else "Okay, I've cancelled that."
            db.delete(pending)
            db.commit()
        
        if response_content:
            finish_chat(db, response_content)
            return {"response": response_content, "sentiment": sentiment}

    # Intent Classification
    intent = router_service.classify(user_message)

    # Handlers
    if intent == "MEDICINE_ADD":
        med_data = medicine_service.parse_medicine_data(user_message)
        if med_data.get("name"):
            new_pending = models.PendingAction(
                action_type="MEDICINE_ADD",
                data=json.dumps(med_data)
            )
            db.add(new_pending)
            db.commit()
            response_content = (
                f"तपाईं **{med_data.get('name')}** ({med_data.get('dosage')}) थप्न चाहनुहुन्छ। के म यसलाई बचत गरुँ?" 
                if lang == "ne" else 
                f"You want to add **{med_data.get('name')}** ({med_data.get('dosage')}). Shall I save this?"
            )
        else:
            response_content = (
                "मैले औषधिको नाम राम्रोसँग बुझ्न सकिन। के तपाईं फेरि भन्न सक्नुहुन्छ?" 
                if lang == "ne" else 
                "I couldn't quite catch the medicine name. Could you repeat that?"
            )

    elif intent == "MEDICINE_QUERY":
        meds = medicine_service.get_medicines(db)
        if meds:
            if lang == "ne":
                response_content = "यहाँ तपाईंका औषधिहरू छन्:\n- " + "\n- ".join([f"**{m.name}** ({m.dosage}) - {m.frequency} {m.timing}" for m in meds])
            else:
                response_content = "Here are your medicines:\n- " + "\n- ".join([f"**{m.name}** ({m.dosage}) - {m.frequency} {m.timing}" for m in meds])
        else:
            response_content = "तपाईंले अहिलेसम्म कुनै औषधि थप्नुभएको छैन।" if lang == "ne" else "You haven't added any medicines yet."

    elif intent == "OBJECT_SAVE":
        obj_data = object_locator_service.parse_object_data(user_message)
        if obj_data.get("object") and obj_data.get("location"):
            new_pending = models.PendingAction(
                action_type="OBJECT_SAVE",
                data=json.dumps(obj_data)
            )
            db.add(new_pending)
            db.commit()
            response_content = (
                f"के मैले तपाईंको **{obj_data['object']}** **{obj_data['location']}** मा छ भनेर याद राखूँ?" 
                if lang == "ne" else 
                f"Should I remember that your **{obj_data['object']}** is **{obj_data['location']}**?"
            )
        else:
            response_content = (
                "तपाईंले यसलाई कहाँ राख्नुभयो? मलाई वस्तु र त्यसको स्थान दुवै चाहिन्छ।" 
                if lang == "ne" else 
                "Where did you put it? I need both the item and its location."
            )

    elif intent == "OBJECT_QUERY":
        obj_name_prompt = f"Identify the primary object being asked about in the message: \"{user_message}\". Return ONLY the name of the object (1-2 words). No punctuation."
        obj_name = llm_service.generate_response(obj_name_prompt).strip().rstrip('.')
        loc_obj = object_locator_service.find_location(db, obj_name)
        if loc_obj:
            if lang == "ne":
                response_content = f"भेटियो: तपाईंको **{loc_obj.object_name}** **{loc_obj.location}** मा छ ({loc_obj.timestamp.strftime('%Y-%m-%d %H:%M')} मा रेकर्ड गरिएको)।"
            else:
                response_content = f"Found it: Your **{loc_obj.object_name}** is at **{loc_obj.location}** (recorded on {loc_obj.timestamp.strftime('%Y-%m-%d %H:%M')})."
        else:
            response_content = f"मसँग तपाईंको {obj_name} को कुनै रेकर्ड छैन।" if lang == "ne" else f"I don't have a record of your {obj_name}."

    elif intent == "MOOD_QUERY":
        result = mood_service.get_batch_analysis(db)
        response_content = result.get("summary", "I couldn't analyze your mood right now.")

    elif intent == "HEALTH_QA":
        relevant_chunks = rag_service.retrieve(user_message)
        if not relevant_chunks:
            response_content = (
                "मसँग मेरो ज्ञानकोषमा त्यसको बारेमा कुनै विशिष्ट जानकारी छैन। "
                "कृपया कुनै मान्य स्वास्थ्य पेशेवरसँग परामर्श लिनुहोस् वा तपाईंको नजिकको स्वास्थ्य चौकीमा जानुहोस्।"
                if lang == "ne" else
                "I don't have specific information about that in my knowledge base. "
                "Please consult a qualified healthcare professional or visit your nearest health post."
            )
        else:
            context = "\n\n".join([c["content"] for c in relevant_chunks])
            system_prompt = (
                "तपाईं एक स्वास्थ्य सहायक हुनुहुन्छ। **केवल नेपाली भाषामा मात्र** जवाफ दिनुहोस्। हिन्दी, अंग्रेजी वा अन्य कुनै भाषा प्रयोग गर्नु हुँदैन। केवल प्रदान गरिएको सन्दर्भबाट जवाफ दिनुहोस्। अन्तमा चिकित्सा अस्वीकरण थप्नुहोस्।" 
                if lang == "ne" else 
                "You are a health companion. Respond only in English based on provided context. Add medical disclaimer."
            )
            prompt = f"Context:\n{context}\n\nUser: {user_message}"
            
            history = db.query(models.Message).order_by(models.Message.id.desc()).limit(6).all()
            history = history[::-1]
            chat_messages = [{"role": m.role, "content": m.content} for m in history]
            chat_messages[-1]["content"] = prompt
            response_content = llm_service.chat(chat_messages, system_prompt=system_prompt)

    elif intent == "GENERAL":
        system_prompt = (
            "तपाईं एक स्वास्थ्य सहायक हुनुहुन्छ। **केवल नेपाली भाषामा मात्र** जवाफ दिनुहोस्। हिन्दी, अंग्रेजी वा अन्य कुनै भाषा प्रयोग गर्नु हुँदैन।" 
            if lang == "ne" else 
            "You are Swastha Sathi, a friendly health companion. Respond only in English."
        )
        response_content = llm_service.chat([{"role": "user", "content": user_message}], 
                                          system_prompt=system_prompt)

    # Distress Nudge (Checking recently stored messages instead of explicit logs)
    nudge = mood_service.check_for_distress(db)
    if nudge:
        lang = llm_service.detect_language(user_message)
        if lang == "ne":
            nudge = "मैले याद गरें कि तपाईं आज अलि कम महसुस गर्दै हुनुहुन्छ। कृपया आफ्नो ख्याल राख्नुहोस् र यदि तपाईंलाई सहयोग चाहिन्छ भने कसैसँग कुरा गर्नुहोस्। म यहाँ छु यदि तपाईं थप कुरा गर्न चाहनुहुन्छ भने।"
        response_content += f"\n\n---\n{nudge}"

    finish_chat(db, response_content)
    return {"response": response_content, "sentiment": None}

def finish_chat(db, content):
    db_assistant_message = models.Message(role="assistant", content=content)
    db.add(db_assistant_message)
    db.commit()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
