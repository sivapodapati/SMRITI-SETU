from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional

from database import SessionLocal
from models.alert import CaregiverAlert
from schemas.alert import AlertResponse

router = APIRouter(
    prefix="/alerts",
    tags=["Caregiver Alerts"]
)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.get("/", response_model=list[AlertResponse])
def get_alerts(
    patient_id: Optional[int] = None,
    is_read: Optional[bool] = None,
    db: Session = Depends(get_db)
):
    query = db.query(CaregiverAlert)
    if patient_id is not None:
        query = query.filter(CaregiverAlert.patient_id == patient_id)
    if is_read is not None:
        query = query.filter(CaregiverAlert.is_read == is_read)
        
    return query.order_by(CaregiverAlert.timestamp.desc()).all()


@router.put("/{alert_id}/read", response_model=AlertResponse)
def mark_alert_read(
    alert_id: int,
    db: Session = Depends(get_db)
):
    alert = db.query(CaregiverAlert).filter(CaregiverAlert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
        
    alert.is_read = True
    db.commit()
    db.refresh(alert)
    return alert


@router.put("/read-all")
def mark_all_alerts_read(
    patient_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    query = db.query(CaregiverAlert)
    if patient_id is not None:
        query = query.filter(CaregiverAlert.patient_id == patient_id)
        
    query.update({CaregiverAlert.is_read: True}, synchronize_session=False)
    db.commit()
    return {"message": "All alerts marked as read"}
