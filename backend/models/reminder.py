from sqlalchemy import Column, Integer, String, ForeignKey, Boolean, DateTime, func
from database import Base

class Reminder(Base):
    __tablename__ = "reminders"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False)
    
    title = Column(String, nullable=False)
    description = Column(String, nullable=True)
    
    # Types: Medication, Daily Routine, Cognitive Activity, Appointment, General
    reminder_type = Column(String, nullable=False)
    
    scheduled_time = Column(String, nullable=False) # e.g. "08:00"
    recurrence = Column(String, nullable=True) # e.g. "daily"
    
    language = Column(String, nullable=False, default="English")
    active = Column(Boolean, default=True)
    completed = Column(Boolean, default=False)
    
    created_at = Column(DateTime, default=func.now())
