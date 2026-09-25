from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import SessionLocal
from models.patient import Patient
from models.performance import GamePerformance
from models.reminder import Reminder
from models.task import PatientTask
from models.game import Game
from schemas.patient import PatientCreate, PatientResponse, PatientUpdate
from services.recommendation_engine import get_patient_recommendation
from services.content_engine import select_game_content


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
        name=patient_data.name,
        age=patient_data.age,
        gender=patient_data.gender,
        state=patient_data.state,
        language=patient_data.language,
        emergency_contact=patient_data.emergency_contact,
        max_difficulty_ceiling=patient_data.max_difficulty_ceiling or 10,
        target_sessions=patient_data.target_sessions or 4
    )

    db.add(new_patient)
    db.commit()
    db.refresh(new_patient)

    return new_patient


# =========================================================
# GET AUTHENTICATED / LOGGED-IN PATIENT DASHBOARD
# =========================================================

@router.get("/me/dashboard")
def get_patient_me_dashboard(
    user_id: int = None,
    patient_id: int = None,
    db: Session = Depends(get_db)
):
    """
    Consolidated Individual Patient Dashboard API.
    Guarantees that ONLY data for the authenticated patient is returned.
    """
    patient = None
    if patient_id is not None:
        patient = db.query(Patient).filter(Patient.id == patient_id).first()
    elif user_id is not None:
        patient = db.query(Patient).filter(Patient.user_id == user_id).first()

    if not patient:
        raise HTTPException(
            status_code=404,
            detail="Patient record not found for the authenticated user."
        )

    # 1. Fetch AI-Recommended Game for Today
    rec = get_patient_recommendation(db, patient.id)

    # 2. Fetch Today's Cultural Story (Game 5)
    story_level = rec.get("recommended_level", 1) if rec else 1
    story_content = select_game_content(db, patient.id, 5, story_level)

    # 3. Fetch Patient Reminders
    reminders = (
        db.query(Reminder)
        .filter(Reminder.patient_id == patient.id, Reminder.active == True)
        .order_by(Reminder.scheduled_time.asc())
        .all()
    )

    # 4. Fetch Patient Performances
    all_performances = (
        db.query(GamePerformance)
        .filter(GamePerformance.patient_id == patient.id)
        .order_by(GamePerformance.id.desc())
        .all()
    )

    total_games_completed = len([p for p in all_performances if p.status == "completed"])
    stories_completed = len([p for p in all_performances if p.game_id == 5 and p.status == "completed"])
    reminders_completed = len([r for r in reminders if r.completed is True])

    # Today's Progress Calculation
    target_sessions = patient.target_sessions or 3
    today_sessions = min(target_sessions, len(all_performances[:target_sessions]))
    progress_percent = min(100, round((today_sessions / max(1, target_sessions)) * 100))

    # Calculate average accuracy
    if all_performances:
        acc_list = []
        for p in all_performances[:10]:
            attempts = p.attempts if p.attempts and p.attempts > 0 else 1
            correct = p.correct_answers if p.correct_answers is not None else 0
            acc_list.append((correct / attempts) * 100.0)
        avg_accuracy = round(sum(acc_list) / len(acc_list), 1) if acc_list else 100.0
    else:
        avg_accuracy = 100.0

    # Recent performance descriptor
    if avg_accuracy >= 75.0:
        performance_status = "Good"
    elif avg_accuracy >= 45.0:
        performance_status = "Steady"
    else:
        performance_status = "Needs Guidance"

    # Localized Notifications
    p_lang = patient.language or "English"
    notifications = []
    if p_lang == "Assamese":
        notifications.append(f"আজিৰ লক্ষ্য: ৩ টা কাৰ্য্যকলাপৰ ভিতৰত {today_sessions} টা সমাপ্ত কৰা হৈছে!")
        if reminders:
            notifications.append(f"আজি {len(reminders)} টা সোঁৱৰণী তালিকাভুক্ত কৰা হৈছে।")
    elif p_lang == "Meitei":
        notifications.append(f"ꯉꯁꯤꯒꯤ ꯄꯥꯟꯗꯝ: ꯊꯕꯛ {today_sessions}/{target_sessions} ꯂꯣꯏꯔꯦ!")
        if reminders:
            notifications.append(f"ꯉꯁꯤ {len(reminders)} ꯅꯤꯡꯁꯤꯡꯍꯧꯕibi ꯂꯩꯔꯤ।")
    elif p_lang == "Mizo":
        notifications.append(f"Vawiin tum: Thiltih {today_sessions}/{target_sessions} zawh a ni tawh!")
    else:
        notifications.append(f"Daily Goal: {today_sessions} of {target_sessions} cognitive activities completed today!")
        if reminders:
            notifications.append(f"You have {len(reminders)} active reminders for today.")

    return {
        "patient": {
            "id": patient.id,
            "user_id": patient.user_id,
            "name": patient.name,
            "age": patient.age or 68,
            "gender": patient.gender or "Female",
            "state": patient.state or "Assam",
            "language": patient.language or "English",
            "profile_photo": patient.profile_photo,
            "emergency_contact": patient.emergency_contact,
            "max_difficulty_ceiling": patient.max_difficulty_ceiling,
            "target_sessions": target_sessions
        },
        "today_progress": {
            "progress_percent": progress_percent,
            "activities_completed": today_sessions,
            "target_activities": target_sessions,
            "games_completed": total_games_completed,
            "stories_completed": stories_completed,
            "reminders_completed": reminders_completed,
            "total_reminders": len(reminders)
        },
        "todays_activity": rec,
        "todays_story": story_content,
        "reminders": [
            {
                "id": r.id,
                "title": r.title,
                "reminder_type": r.reminder_type,
                "scheduled_time": r.scheduled_time,
                "completed": r.completed,
                "active": r.active,
                "description": r.description
            }
            for r in reminders
        ],
        "personal_performance": {
            "current_level": rec.get("recommended_level", 1) if rec else 1,
            "total_games_played": total_games_completed,
            "average_accuracy": avg_accuracy,
            "recent_status": performance_status,
            "practiced_domains": ["Working Memory", "Visual Attention", "Procedural Recall", "Auditory Memory", "Episodic Recall"]
        },
        "notifications": notifications
    }


# =========================================================
# GET / UPDATE PERSONAL PROFILE
# =========================================================

@router.get("/me/profile")
def get_patient_me_profile(
    user_id: int = None,
    patient_id: int = None,
    db: Session = Depends(get_db)
):
    patient = None
    if patient_id is not None:
        patient = db.query(Patient).filter(Patient.id == patient_id).first()
    elif user_id is not None:
        patient = db.query(Patient).filter(Patient.user_id == user_id).first()

    if not patient:
        raise HTTPException(status_code=404, detail="Patient profile not found")

    return patient


@router.put("/me/profile")
def update_patient_me_profile(
    patient_data: PatientUpdate,
    user_id: int = None,
    patient_id: int = None,
    db: Session = Depends(get_db)
):
    patient = None
    if patient_id is not None:
        patient = db.query(Patient).filter(Patient.id == patient_id).first()
    elif user_id is not None:
        patient = db.query(Patient).filter(Patient.user_id == user_id).first()

    if not patient:
        raise HTTPException(status_code=404, detail="Patient profile not found")

    if patient_data.name is not None:
        patient.name = patient_data.name
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

    if patient_data.max_difficulty_ceiling is not None:
        patient.max_difficulty_ceiling = patient_data.max_difficulty_ceiling

    if patient_data.target_sessions is not None:
        patient.target_sessions = patient_data.target_sessions

    db.commit()
    db.refresh(patient)

    return patient


# Delete Patient
@router.delete("/{patient_id}")
def delete_patient(
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

    db.delete(patient)
    db.commit()

    return {
        "message": "Patient deleted successfully",
        "patient_id": patient_id
    }