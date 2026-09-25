from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class TaskBase(BaseModel):
    patient_id: int
    title: str
    description: Optional[str] = None
    task_type: str # Cognitive Game, Medication, Daily Routine, Reminder, Caregiver-assigned
    due_time: Optional[str] = None
    status: Optional[str] = "Pending" # Pending, In Progress, Completed, Missed
    language: Optional[str] = "English"

class TaskCreate(TaskBase):
    pass

class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    task_type: Optional[str] = None
    due_time: Optional[str] = None
    status: Optional[str] = None
    language: Optional[str] = None

class TaskResponse(TaskBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True
