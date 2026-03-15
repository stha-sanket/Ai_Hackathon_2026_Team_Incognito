# Care+

Care+ is a RAG-based agentic carebot designed to assist patients through voice interaction in Nepali.  
The system provides medicine reminders, conversational companionship, mood tracking, and automated daily patient reports.

---

## Overview

Care+ focuses on improving patient wellbeing by combining conversational AI, reminder systems, and mood monitoring.  
The bot interacts with patients using **Nepali speech-to-text and text-to-speech**, making it accessible for elderly users and those who prefer voice communication.

---

## MVP Features

### 1. Nepali Voice Conversation

- Speech-to-Text (Nepali)
- Conversational chatbot interface
- Text-to-Speech response in Nepali

### 2. Medicine Reminder System

- Schedule medicines with time
- Voice and notification reminders
- Patient confirmation (Taken / Skipped)

### 3. Mood Tracking

- Sentiment detection from conversations
- Timestamp-based mood logs
- Daily mood score calculation

### 4. Loneliness Companion

- Friendly conversational interaction
- Emotional check-ins
- Encourages patient engagement

### 5. Daily Patient Report

Automatic report generation including:

- Medicine adherence
- Mood trends
- Conversation activity
- Reported symptoms

### 6. RAG Knowledge Base

Retrieval-Augmented Generation system that answers health-related questions using a curated medical knowledge dataset.

---

## Example Workflow

1. Patient speaks in Nepali
2. Speech is converted to text
3. Care+ processes the query using the RAG system
4. Response is generated
5. Response is converted back to Nepali speech

---

## Architecture (MVP)

User Voice Input  
↓  
Speech-to-Text (Nepali)  
↓  
Care+ Agent  
↓  
RAG Knowledge Base  
↓  
Response Generation  
↓  
Text-to-Speech (Nepali)

---

## Actual Tech Stack

Frontend

- React Native Expo
- NativeWind (Tailwind CSS) for styling
- Mobile-first interface

Backend

- FastAPI (Main AI/Health Services)
- Node.js / Express with Bun (User/Auth Services)

AI / ML

- Local LLM (Ollama, e.g., Llama 3 8B)
- Custom Keyword-Based RAG Pipeline

Voice Processing

- Client-side Speech-to-Text / Text-to-Speech (via React Native APIs/Expo)

Database

- SQLite (via SQLAlchemy for Health Data)
- MongoDB (via Mongoose for User Data)

---

## Future Improvements

- Wearable health data integration
- Emotion-aware AI responses
- Doctor / caregiver dashboard
- Long-term health analytics
- Offline voice processing

---

## Project Goal

The goal of Care+ is to create an AI-powered care companion that helps patients stay healthy, reduces loneliness, and assists caregivers with better insights into patient wellbeing.
