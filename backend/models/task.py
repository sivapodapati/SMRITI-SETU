from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, func
from database import Base

class PatientTask(Base):
    __tablename__ = "patient_tasks"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False)
    
    title = Column(String, nullable=False)
    description = Column(String, nullable=True)
    
    # Types: Cognitive Game, Medication, Daily Routine, Reminder, Caregiver-assigned
    task_type = Column(String, nullable=False)
    
    due_time = Column(String, nullable=True) # e.g. "14:00"
    
    # States: Pending, In Progress, Completed, Missed
    status = Column(String, nullable=False, default="Pending")
    
    language = Column(String, nullable=False, default="English")
    created_at = Column(DateTime, default=func.now())
