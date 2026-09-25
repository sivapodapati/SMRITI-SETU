from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import SessionLocal
from models.caregiver import Caregiver
from schemas.caregiver import CaregiverCreate, CaregiverResponse


router = APIRouter(
    prefix="/caregivers",
    tags=["Caregivers"]
)


# Database session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# Create Caregiver
@router.post("/", response_model=CaregiverResponse)
def create_caregiver(
    caregiver_data: CaregiverCreate,
    db: Session = Depends(get_db)
):
    new_caregiver = Caregiver(
        user_id=caregiver_data.user_id,
        name=caregiver_data.name,
        relationship=caregiver_data.relationship,
        phone=caregiver_data.phone,
        language=caregiver_data.language
    )

    db.add(new_caregiver)
    db.commit()
    db.refresh(new_caregiver)

    return new_caregiver


# Get all Caregivers
@router.get("/", response_model=list[CaregiverResponse])
def get_caregivers(
    db: Session = Depends(get_db)
):
    return db.query(Caregiver).all()


# Get Caregiver by ID
@router.get("/{caregiver_id}", response_model=CaregiverResponse)
def get_caregiver(
    caregiver_id: int,
    db: Session = Depends(get_db)
):
    caregiver = (
        db.query(Caregiver)
        .filter(Caregiver.id == caregiver_id)
        .first()
    )

    if not caregiver:
        raise HTTPException(
            status_code=404,
            detail="Caregiver not found"
        )

    return caregiver

# Update Caregiver
@router.put("/{caregiver_id}", response_model=CaregiverResponse)
def update_caregiver(
    caregiver_id: int,
    caregiver_data: CaregiverCreate,
    db: Session = Depends(get_db)
):
    caregiver = (
        db.query(Caregiver)
        .filter(Caregiver.id == caregiver_id)
        .first()
    )

    if not caregiver:
        raise HTTPException(
            status_code=404,
            detail="Caregiver not found"
        )

    caregiver.user_id = caregiver_data.user_id
    caregiver.name = caregiver_data.name
    caregiver.relationship = caregiver_data.relationship
    caregiver.phone = caregiver_data.phone
    caregiver.language = caregiver_data.language

    db.commit()
    db.refresh(caregiver)

    return caregiver


# Delete Caregiver
@router.delete("/{caregiver_id}")
def delete_caregiver(
    caregiver_id: int,
    db: Session = Depends(get_db)
):
    caregiver = (
        db.query(Caregiver)
        .filter(Caregiver.id == caregiver_id)
        .first()
    )

    if not caregiver:
        raise HTTPException(
            status_code=404,
            detail="Caregiver not found"
        )

    db.delete(caregiver)
    db.commit()

    return {
        "message": "Caregiver deleted successfully",
        "caregiver_id": caregiver_id
    }