from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional

from database import SessionLocal
from models.task import PatientTask
from schemas.task import TaskCreate, TaskResponse, TaskUpdate

router = APIRouter(
    prefix="/tasks",
    tags=["Patient Tasks"]
)

# Database session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Create Task
@router.post("/", response_model=TaskResponse)
def create_task(
    task_data: TaskCreate,
    db: Session = Depends(get_db)
):
    new_task = PatientTask(
        patient_id=task_data.patient_id,
        title=task_data.title,
        description=task_data.description,
        task_type=task_data.task_type,
        due_time=task_data.due_time,
        status=task_data.status,
        language=task_data.language
    )
    db.add(new_task)
    db.commit()
    db.refresh(new_task)
    return new_task

# Get all Tasks
@router.get("/", response_model=List[TaskResponse])
def get_tasks(
    patient_id: Optional[int] = None,
    status: Optional[str] = None,
    task_type: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(PatientTask)
    if patient_id is not None:
        query = query.filter(PatientTask.patient_id == patient_id)
    if status is not None:
        query = query.filter(PatientTask.status == status)
    if task_type is not None:
        query = query.filter(PatientTask.task_type == task_type)
    return query.all()

# Get Task by ID
@router.get("/{task_id}", response_model=TaskResponse)
def get_task(
    task_id: int,
    db: Session = Depends(get_db)
):
    task = db.query(PatientTask).filter(PatientTask.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return task

# Update Task
@router.put("/{task_id}", response_model=TaskResponse)
def update_task(
    task_id: int,
    task_data: TaskUpdate,
    db: Session = Depends(get_db)
):
    task = db.query(PatientTask).filter(PatientTask.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    for field, value in task_data.dict(exclude_unset=True).items():
        setattr(task, field, value)
        
    db.commit()
    db.refresh(task)
    return task

# Toggle/Update status
@router.put("/{task_id}/status", response_model=TaskResponse)
def update_task_status(
    task_id: int,
    status: str,
    db: Session = Depends(get_db)
):
    task = db.query(PatientTask).filter(PatientTask.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    if status not in ["Pending", "In Progress", "Completed", "Missed"]:
        raise HTTPException(status_code=400, detail="Invalid status value")
    task.status = status
    db.commit()
    db.refresh(task)
    return task

# Delete Task
@router.delete("/{task_id}")
def delete_task(
    task_id: int,
    db: Session = Depends(get_db)
):
    task = db.query(PatientTask).filter(PatientTask.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    db.delete(task)
    db.commit()
    return {"message": "Task deleted successfully", "id": task_id}

# Get task stats / adherence (completed, pending, missed, completion percentage)
@router.get("/adherence/{patient_id}")
def get_task_adherence(
    patient_id: int,
    db: Session = Depends(get_db)
):
    tasks = db.query(PatientTask).filter(PatientTask.patient_id == patient_id).all()
    total = len(tasks)
    if total == 0:
        return {
            "total": 0,
            "completed": 0,
            "pending": 0,
            "missed": 0,
            "in_progress": 0,
            "completion_percentage": 0.0
        }
    
    completed = len([t for t in tasks if t.status == "Completed"])
    pending = len([t for t in tasks if t.status == "Pending"])
    in_progress = len([t for t in tasks if t.status == "In Progress"])
    missed = len([t for t in tasks if t.status == "Missed"])
    
    pct = round((completed / total) * 100, 1)
    
    return {
        "total": total,
        "completed": completed,
        "pending": pending,
        "in_progress": in_progress,
        "missed": missed,
        "completion_percentage": pct
    }
