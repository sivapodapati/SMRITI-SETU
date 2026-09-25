from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class ReminderBase(BaseModel):
    patient_id: int
    title: str
    description: Optional[str] = None
    reminder_type: str # Medication, Daily Routine, Cognitive Activity, Appointment, General
    scheduled_time: str # "08:00"
    recurrence: Optional[str] = "daily"
    language: Optional[str] = "English"
    active: Optional[bool] = True
    completed: Optional[bool] = False

class ReminderCreate(ReminderBase):
    pass

class ReminderUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    reminder_type: Optional[str] = None
    scheduled_time: Optional[str] = None
    recurrence: Optional[str] = None
    language: Optional[str] = None
    active: Optional[bool] = None
    completed: Optional[bool] = None

class ReminderResponse(ReminderBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True
