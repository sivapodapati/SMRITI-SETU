from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import SessionLocal
from models.patient import Patient
from schemas.patient import PatientCreate, PatientResponse , PatientUpdate


router = APIRouter(
    prefix="/patients",
    tags=["Patients"]
)


# Database session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# Create Patient
@router.post("/", response_model=PatientResponse)
def create_patient(
    patient_data: PatientCreate,
    db: Session = Depends(get_db)
):
    new_patient = Patient(
        user_id=patient_data.user_id,
        age=patient_data.age,
        gender=patient_data.gender,
        state=patient_data.state,
        language=patient_data.language,
        emergency_contact=patient_data.emergency_contact
    )

    db.add(new_patient)
    db.commit()
    db.refresh(new_patient)

    return new_patient


# Get all Patients
@router.get("/", response_model=list[PatientResponse])
def get_patients(
    db: Session = Depends(get_db)
):
    return db.query(Patient).all()


# Get Patient by ID
@router.get("/{patient_id}", response_model=PatientResponse)
def get_patient(
    patient_id: int,
    db: Session = Depends(get_db)
):
    patient = (
        db.query(Patient)
        .filter(Patient.id == patient_id)
        .first()
    )

    if not patient:
        raise HTTPException(
            status_code=404,
            detail="Patient not found"
        )

    return patient

# Update Patient
@router.put("/{patient_id}", response_model=PatientResponse)
def update_patient(
    patient_id: int,
    patient_data: PatientUpdate,
    db: Session = Depends(get_db)
):
    patient = (
        db.query(Patient)
        .filter(Patient.id == patient_id)
        .first()
    )

    if not patient:
        raise HTTPException(
            status_code=404,
            detail="Patient not found"
        )

    if patient_data.age is not None:
        patient.age = patient_data.age

    if patient_data.gender is not None:
        patient.gender = patient_data.gender

    if patient_data.state is not None:
        patient.state = patient_data.state

    if patient_data.language is not None:
        patient.language = patient_data.language

    if patient_data.emergency_contact is not None:
        patient.emergency_contact = patient_data.emergency_contact

    if patient_data.profile_photo is not None:
        patient.profile_photo = patient_data.profile_photo

    db.commit()
    db.refresh(patient)

    return patient