from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import SessionLocal
from models.performance import GamePerformance
from models.patient import Patient
from models.game import Game
from schemas.performance import PerformanceCreate, PerformanceResponse
from services.adaptive_engine import calculate_next_level
from services.alert_service import check_and_generate_alerts
from services.recommendation_engine import get_patient_recommendation


router = APIRouter(
    prefix="/performance",
    tags=["Game Performance"]
)


# Database session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# =========================================================
# CREATE GAME PERFORMANCE
# =========================================================

@router.post("/", response_model=PerformanceResponse)
def create_performance(
    performance_data: PerformanceCreate,
    db: Session = Depends(get_db)
):
    # Check patient
    patient = (
        db.query(Patient)
        .filter(Patient.id == performance_data.patient_id)
        .first()
    )

    if not patient:
        raise HTTPException(
            status_code=404,
            detail=f"Patient with id {performance_data.patient_id} not found"
        )

    # Check game
    game = (
        db.query(Game)
        .filter(Game.id == performance_data.game_id)
        .first()
    )

    if not game:
        raise HTTPException(
            status_code=404,
            detail=f"Game with id {performance_data.game_id} not found"
        )

    # Create performance record
    new_performance = GamePerformance(
        patient_id=performance_data.patient_id,
        game_id=performance_data.game_id,
        score=performance_data.score,
        response_time=performance_data.response_time,
        attempts=performance_data.attempts,
        correct_answers=performance_data.correct_answers,
        difficulty=performance_data.difficulty,
        engagement_score=performance_data.engagement_score,
        hints_used=performance_data.hints_used,
        cognitive_support_level=performance_data.cognitive_support_level,
        previous_difficulty=performance_data.previous_difficulty,
        predicted_difficulty=performance_data.predicted_difficulty,
        status=performance_data.status,
        reason=performance_data.reason
    )

    db.add(new_performance)
    db.commit()
    db.refresh(new_performance)

    # Automatically calculate adaptive level recommendation
    adapt_res = calculate_next_level(db, new_performance.patient_id, new_performance.game_id)
    new_performance.predicted_difficulty = str(adapt_res["next_level"])
    new_performance.cognitive_support_level = adapt_res["support_level"]
    new_performance.reason = adapt_res["reason"]
    db.commit()
    db.refresh(new_performance)

    # Generate caregiver alerts if any conditions met
    try:
        check_and_generate_alerts(db, new_performance, adapt_res)
    except Exception as ex:
        print("Error generating caregiver alerts:", ex)

    return new_performance


# =========================================================
# GET ALL PERFORMANCE RECORDS
# =========================================================

@router.get("/", response_model=list[PerformanceResponse])
def get_performances(
    db: Session = Depends(get_db)
):
    return db.query(GamePerformance).all()


# =========================================================
# NEXT DIFFICULTY
# =========================================================

@router.get("/patient/{patient_id}/next-difficulty")
def get_next_difficulty(
    patient_id: int,
    db: Session = Depends(get_db)
):
    latest_perf = (
        db.query(GamePerformance)
        .filter(GamePerformance.patient_id == patient_id)
        .order_by(GamePerformance.id.desc())
        .first()
    )
    game_id = latest_perf.game_id if latest_perf else 2
    
    result = calculate_next_level(db, patient_id, game_id)
    return {
        "patient_id": patient_id,
        "next_difficulty": str(result["next_level"]),
        "game_id": game_id,
        "decision": result["decision"],
        "support_level": result["support_level"],
        "reason": result["reason"]
    }





@router.get("/patient/{patient_id}/game/{game_id}/history")
def get_patient_game_history(
    patient_id: int,
    game_id: int,
    db: Session = Depends(get_db)
):
    history = (
        db.query(GamePerformance)
        .filter(
            GamePerformance.patient_id == patient_id,
            GamePerformance.game_id == game_id
        )
        .order_by(GamePerformance.id.desc())
        .limit(10)
        .all()
    )
    return history


# =========================================================
# RECOMMENDED GAME
# =========================================================

@router.get("/patient/{patient_id}/recommended-game")
def get_recommended_game(
    patient_id: int,
    db: Session = Depends(get_db)
):
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(
            status_code=404,
            detail=f"Patient with id {patient_id} not found"
        )
    return get_patient_recommendation(db, patient_id)


# =========================================================
# GET PERFORMANCE BY ID
# =========================================================

@router.get("/{performance_id}", response_model=PerformanceResponse)
def get_performance(
    performance_id: int,
    db: Session = Depends(get_db)
):
    performance = (
        db.query(GamePerformance)
        .filter(GamePerformance.id == performance_id)
        .first()
    )

    if not performance:
        raise HTTPException(
            status_code=404,
            detail="Performance record not found"
        )

    return performance