from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import SessionLocal
from models.user import User
from models.patient import Patient
from schemas.user import UserCreate, UserResponse,UserLogin
from pwdlib import PasswordHash


router = APIRouter(
    prefix="/auth",
    tags=["Authentication"]
)

password_hash = PasswordHash.recommended()


# Database session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.post("/register", response_model=UserResponse)
def register_user(
    user_data: UserCreate,
    db: Session = Depends(get_db)
):

    # Check existing email
    if user_data.email:
        existing_email = (
            db.query(User)
            .filter(User.email == user_data.email)
            .first()
        )

        if existing_email:
            raise HTTPException(
                status_code=400,
                detail="Email already registered"
            )

    # Check existing phone
    if user_data.phone:
        existing_phone = (
            db.query(User)
            .filter(User.phone == user_data.phone)
            .first()
        )

        if existing_phone:
            raise HTTPException(
                status_code=400,
                detail="Phone already registered"
            )

    # Hash password
    hashed_password = password_hash.hash(user_data.password)

    # Create user
    new_user = User(
        name=user_data.name,
        email=user_data.email,
        phone=user_data.phone,
        password=hashed_password,
        role=user_data.role,
        state=user_data.state,
        language=user_data.language
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return new_user

@router.post("/login")
def login_user(
    login_data: UserLogin,
    db: Session = Depends(get_db)
):
    # Find user by email
    user = (
        db.query(User)
        .filter(User.email == login_data.email)
        .first()
    )

    # Check user exists
    if not user:
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password"
        )

    # Verify password
    if not password_hash.verify(
        login_data.password,
        user.password
    ):
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password"
        )

    patient_id = None
    patient_age = None
    patient_gender = None
    patient_state = user.state
    patient_language = user.language

    if user.role == "patient":
        patient = db.query(Patient).filter(Patient.user_id == user.id).first()
        if patient:
            patient_id = patient.id
            patient_age = patient.age
            patient_gender = patient.gender
            patient_state = patient.state or user.state
            patient_language = patient.language or user.language

    return {
        "message": "Login successful",
        "user_id": user.id,
        "patient_id": patient_id,
        "name": user.name,
        "email": user.email,
        "role": user.role,
        "age": patient_age,
        "gender": patient_gender,
        "state": patient_state,
        "language": patient_language
    }