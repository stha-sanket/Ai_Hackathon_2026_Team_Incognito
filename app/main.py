from fastapi import FastAPI, Request, HTTPException
from .services.agent import swastha_agent
import uvicorn

app = FastAPI(title="Swastha Sathi AI Engine")

@app.post("/api/chat/agent")
async def agent_chat_endpoint(request: Request):
    data = await request.json()
    user_id = data.get("userId")
    message = data.get("message")
    history = data.get("history", [])
    
    if not user_id or not message:
        raise HTTPException(status_code=400, detail="userId and message are required")
        
    response = swastha_agent.run_chat(user_id, message, history)
    return {"reply": response}

@app.post("/api/report")
async def report_endpoint(request: Request):
    data = await request.json()
    user_id = data.get("userId") or request.query_params.get("userId", "")
    history = data.get("history", [])
    
    if not user_id:
        raise HTTPException(status_code=400, detail="userId is required")
        
    result = swastha_agent.generate_report(user_id, history)
    return result

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
