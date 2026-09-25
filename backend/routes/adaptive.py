from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import SessionLocal, get_db
from models.patient import Patient
from models.game import Game
from models.performance import GamePerformance
from services.adaptive_engine import calculate_next_level

router = APIRouter(
    prefix="/adaptive",
    tags=["AI Adaptive Engine"]
)

# Database session fallback if get_db from database is not importable
def get_database_session():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.get("/patient/{patient_id}/game/{game_id}")
def get_patient_game_adaptive_difficulty(
    patient_id: int,
    game_id: int,
    db: Session = Depends(get_database_session)
):
    # Verify patient
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(
            status_code=404,
            detail=f"Patient with id {patient_id} not found"
        )
        
    # Verify game
    game = db.query(Game).filter(Game.id == game_id).first()
    if not game:
        raise HTTPException(
            status_code=404,
            detail=f"Game with id {game_id} not found"
        )

    # Calculate recommendation
    result = calculate_next_level(db, patient_id, game_id)
    
    # Fetch recent performances to compute statistics
    recent_perf = (
        db.query(GamePerformance)
        .filter(
            GamePerformance.patient_id == patient_id,
            GamePerformance.game_id == game_id
        )
        .order_by(GamePerformance.id.desc())
        .limit(5)
        .all()
    )

    # Compute statistics
    avg_score = 0
    avg_accuracy = 0
    avg_response_time = 0
    avg_engagement = 0
    total_hints = 0
    attempts_count = len(recent_perf)

    if attempts_count > 0:
        avg_score = sum(p.score for p in recent_perf if p.score is not None) / attempts_count
        avg_response_time = sum(p.response_time for p in recent_perf if p.response_time is not None) / attempts_count
        avg_engagement = sum(p.engagement_score for p in recent_perf if p.engagement_score is not None) / attempts_count
        total_hints = sum(p.hints_used for p in recent_perf if p.hints_used is not None)
        
        acc_values = []
        for p in recent_perf:
            attempts = p.attempts if p.attempts is not None and p.attempts > 0 else 1
            correct = p.correct_answers if p.correct_answers is not None else 0
            acc_values.append((correct / attempts) * 100)
        avg_accuracy = sum(acc_values) / len(acc_values)

    return {
        "patient_id": patient_id,
        "game_id": game_id,
        "current_level": result["current_level"],
        "next_level": result["next_level"],
        "recommended_level": result["next_level"],
        "difficulty": str(result["next_level"]),
        "support_level": result["support_level"],
        "easier_variant": result["support_level"] == "high",
        "reason": result["reason"],
        "statistics": {
            "attempts_analyzed": attempts_count,
            "average_score": round(avg_score, 2),
            "average_accuracy": round(avg_accuracy, 2),
            "average_response_time": round(avg_response_time, 2),
            "average_engagement": round(avg_engagement, 2),
            "total_hints_used": total_hints
        }
    }
