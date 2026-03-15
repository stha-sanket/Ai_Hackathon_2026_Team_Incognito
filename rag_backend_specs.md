# RAG Backend Specifications (For the Python Backend Engineer)

Hello! As you're working on the `app` directory (FastAPI), here is what you need to focus on. Since you have **Ollama (or another local LLM)** running locally, your main goal is to improve the RAG pipeline and wire it to communicate with the newly created Node.js user backend (`server1`).

Here is a breakdown of what needs to change in your python code:

## 1. Environment & Dependencies

- Ensure your `requirements.txt` includes anything needed for vector databases (e.g., `chromadb`, `faiss-cpu`) or RAG frameworks (e.g., `langchain` if you choose to use it).

## 2. Update `app/services/llm.py`

You are already using `requests` to call the local Ollama instance (`llama3:8b`). Ensure the `LLMService` is robust enough to handle structured generation or function calling required to parse user intents (e.g. recognizing when a user says "I took my medicine").

## 3. Update `app/services/rag.py` (Vector Embeddings)

Replace the basic keyword matching in `rag.py` with actual vector embeddings.

- **Option A:** Use an in-memory vector store like `ChromaDB` or `FAISS` and embed using a local embedding model via Ollama (e.g., `nomic-embed-text` or `all-minilm`).
- **Option B:** If the medical knowledge base is small enough, you can handle it directly by passing the data in the context window.

## 4. Integrate with `server1` Node.js Backend

Currently, `app/main.py` directly handles SQLite DB interactions for medicines and mood. Since we migrated these to Mongoose/Express in `server1`, the Python script must act as a **service layer** that communicates with the Node APIs rather than the database directly.

- **Mood Logging:** Instead of `mood_service.log_mood(db, sentiment)`, use HTTP POST requests (via `requests` or `httpx`) to `http://localhost:3000/api/moods`.
- **Medicine Logging:** Instead of `medicine_service.add_medicine(action_data)`, make a POST call to `http://localhost:3000/api/medicines`.
- **Removing SQLAlchemy:** You can deprecate `app/database/models.py` since data is now managed by `server1`.

## 5. Exposing Endpoints for the Frontend

The React Native application currently expects to send Audio/Text to a backend. Ensure `app/main.py` exposes a robust `/api/chat` endpoint that:

1. Receives STT Text (or Audio files to be transcribed locally via a Whisper model if you choose).
2. Processes Intent (via function calling or structured generation with your local LLM).
3. If an action is taken (e.g. logging a mood), it POSTs to `server1`.
4. Returns the AI response text to the Expo app.
