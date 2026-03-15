from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey
from sqlalchemy.sql import func
from .db import Base

class Message(Base):
    __tablename__ = "messages"
    id = Column(Integer, primary_key=True, index=True)
    role = Column(String)  # 'user' or 'assistant'
    content = Column(Text)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())
    sentiment = Column(String, nullable=True) # Passive mood tracking

class Medicine(Base):
    __tablename__ = "medicines"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    dosage = Column(String)
    frequency = Column(String)
    timing = Column(String)
    start_date = Column(DateTime(timezone=True), server_default=func.now())
    is_active = Column(Integer, default=1) # 1 for active, 0 for inactive

class AdherenceLog(Base):
    __tablename__ = "adherence_logs"
    id = Column(Integer, primary_key=True, index=True)
    medicine_id = Column(Integer, ForeignKey("medicines.id"))
    status = Column(String) # 'taken', 'missed', 'snoozed'
    timestamp = Column(DateTime(timezone=True), server_default=func.now())

class ObjectLocation(Base):
    __tablename__ = "object_locations"
    id = Column(Integer, primary_key=True, index=True)
    object_name = Column(String, index=True)
    location = Column(String)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())

class MoodLog(Base):
    __tablename__ = "mood_logs"
    id = Column(Integer, primary_key=True, index=True)
    sentiment = Column(String) # 'positive', 'neutral', 'negative', 'distressed'
    timestamp = Column(DateTime(timezone=True), server_default=func.now())

class PendingAction(Base):
    __tablename__ = "pending_actions"
    id = Column(Integer, primary_key=True, index=True)
    action_type = Column(String) # e.g., 'medicine_add', 'object_save'
    data = Column(Text) # JSON string
    timestamp = Column(DateTime(timezone=True), server_default=func.now())
