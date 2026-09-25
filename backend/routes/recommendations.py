from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import SessionLocal, get_db
from models.patient import Patient
from models.recommendation import RecommendationHistory
from services.recommendation_engine import get_patient_recommendation, get_domain_profiles

router = APIRouter(
    prefix="/recommendations",
    tags=["Intelligent Game Selection"]
)

# Database session fallback if get_db from database is not importable
def get_database_session():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.get("/patient/{patient_id}")
def get_patient_intelligent_recommendation(
    patient_id: int,
    db: Session = Depends(get_database_session)
):
    # Verify patient
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(
            status_code=404,
            detail=f"Patient with id {patient_id} not found"
        )
        
    return get_patient_recommendation(db, patient_id)

@router.get("/patient/{patient_id}/domains")
def get_patient_cognitive_domains_profile(
    patient_id: int,
    db: Session = Depends(get_database_session)
):
    # Verify patient
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(
            status_code=404,
            detail=f"Patient with id {patient_id} not found"
        )
        
    return get_domain_profiles(db, patient_id)

@router.get("/patient/{patient_id}/history")
def get_patient_recommendation_history(
    patient_id: int,
    db: Session = Depends(get_database_session)
):
    # Verify patient
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(
            status_code=404,
            detail=f"Patient with id {patient_id} not found"
        )
        
    history = (
        db.query(RecommendationHistory)
        .filter(RecommendationHistory.patient_id == patient_id)
        .order_by(RecommendationHistory.created_at.desc())
        .limit(10)
        .all()
    )
    
    return history
