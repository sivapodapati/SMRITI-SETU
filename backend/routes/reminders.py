from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional

from database import SessionLocal
from models.reminder import Reminder
from schemas.reminder import ReminderCreate, ReminderResponse, ReminderUpdate

router = APIRouter(
    prefix="/reminders",
    tags=["Reminders"]
)

# Database session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Create Reminder
@router.post("/", response_model=ReminderResponse)
def create_reminder(
    reminder_data: ReminderCreate,
    db: Session = Depends(get_db)
):
    new_reminder = Reminder(
        patient_id=reminder_data.patient_id,
        title=reminder_data.title,
        description=reminder_data.description,
        reminder_type=reminder_data.reminder_type,
        scheduled_time=reminder_data.scheduled_time,
        recurrence=reminder_data.recurrence,
        language=reminder_data.language,
        active=reminder_data.active,
        completed=reminder_data.completed
    )
    db.add(new_reminder)
    db.commit()
    db.refresh(new_reminder)
    return new_reminder

# Get all Reminders (optionally filtered by patient)
@router.get("/", response_model=List[ReminderResponse])
def get_reminders(
    patient_id: Optional[int] = None,
    active: Optional[bool] = None,
    completed: Optional[bool] = None,
    db: Session = Depends(get_db)
):
    query = db.query(Reminder)
    if patient_id is not None:
        query = query.filter(Reminder.patient_id == patient_id)
    if active is not None:
        query = query.filter(Reminder.active == active)
    if completed is not None:
        query = query.filter(Reminder.completed == completed)
    return query.all()

# Get Reminder by ID
@router.get("/{reminder_id}", response_model=ReminderResponse)
def get_reminder(
    reminder_id: int,
    db: Session = Depends(get_db)
):
    reminder = db.query(Reminder).filter(Reminder.id == reminder_id).first()
    if not reminder:
        raise HTTPException(status_code=404, detail="Reminder not found")
    return reminder

# Update Reminder
@router.put("/{reminder_id}", response_model=ReminderResponse)
def update_reminder(
    reminder_id: int,
    reminder_data: ReminderUpdate,
    db: Session = Depends(get_db)
):
    reminder = db.query(Reminder).filter(Reminder.id == reminder_id).first()
    if not reminder:
        raise HTTPException(status_code=404, detail="Reminder not found")
    
    # Apply updates
    for field, value in reminder_data.dict(exclude_unset=True).items():
        setattr(reminder, field, value)
        
    db.commit()
    db.refresh(reminder)
    return reminder

# Toggle complete
@router.put("/{reminder_id}/complete", response_model=ReminderResponse)
def toggle_complete(
    reminder_id: int,
    completed: bool,
    db: Session = Depends(get_db)
):
    reminder = db.query(Reminder).filter(Reminder.id == reminder_id).first()
    if not reminder:
        raise HTTPException(status_code=404, detail="Reminder not found")
    reminder.completed = completed
    db.commit()
    db.refresh(reminder)
    return reminder

# Delete Reminder
@router.delete("/{reminder_id}")
def delete_reminder(
    reminder_id: int,
    db: Session = Depends(get_db)
):
    reminder = db.query(Reminder).filter(Reminder.id == reminder_id).first()
    if not reminder:
        raise HTTPException(status_code=404, detail="Reminder not found")
    db.delete(reminder)
    db.commit()
    return {"message": "Reminder deleted successfully", "id": reminder_id}
