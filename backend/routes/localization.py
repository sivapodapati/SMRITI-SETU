from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func

from database import SessionLocal
from models.localization import GameLocalization
from models.game import Game
from schemas.localization import (
    LocalizationCreate,
    LocalizationResponse
)
from models.patient import Patient


router = APIRouter(
    prefix="/localizations",
    tags=["Game Localization"]
)


# Database session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# =========================================================
# CREATE LOCALIZED GAME CONTENT
# =========================================================

@router.post("/", response_model=LocalizationResponse)
def create_localization(
    localization_data: LocalizationCreate,
    db: Session = Depends(get_db)
):
    # Check whether game exists
    game = (
        db.query(Game)
        .filter(Game.id == localization_data.game_id)
        .first()
    )

    if not game:
        raise HTTPException(
            status_code=404,
            detail=f"Game with id {localization_data.game_id} not found"
        )

    # Create localized content
    new_localization = GameLocalization(
        game_id=localization_data.game_id,
        language=localization_data.language,
        title=localization_data.title,
        description=localization_data.description,
        instructions=localization_data.instructions,
        start_button=localization_data.start_button,
        feedback_message=localization_data.feedback_message,
        hint_message=localization_data.hint_message,
        voice_enabled=localization_data.voice_enabled
    )

    db.add(new_localization)
    db.commit()
    db.refresh(new_localization)

    return new_localization


# =========================================================
# GET ALL LOCALIZED CONTENT
# =========================================================

@router.get("/", response_model=list[LocalizationResponse])
def get_localizations(
    db: Session = Depends(get_db)
):
    return db.query(GameLocalization).all()


# =========================================================
# GET LOCALIZATION BY ID
# =========================================================

@router.get("/{localization_id}", response_model=LocalizationResponse)
def get_localization(
    localization_id: int,
    db: Session = Depends(get_db)
):
    localization = (
        db.query(GameLocalization)
        .filter(GameLocalization.id == localization_id)
        .first()
    )

    if not localization:
        raise HTTPException(
            status_code=404,
            detail="Localization not found"
        )

    return localization
@router.get("/game/{game_id}/language/{language}")
def get_game_localization(
    game_id: int,
    language: str,
    db: Session = Depends(get_db)
):
    localization = (
    db.query(GameLocalization)
    .filter(
        GameLocalization.game_id == game_id,
        func.lower(GameLocalization.language) == language.lower()
    )
    .first()
)

    if not localization:
        raise HTTPException(
            status_code=404,
            detail="Localization not found for this game and language"
        )

    return localization

@router.get("/patient/{patient_id}/game/{game_id}")
def get_patient_game_localization(
    patient_id: int,
    game_id: int,
    db: Session = Depends(get_db)
):
    # Get patient
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

    # Get patient's preferred language
    language = patient.language

    if not language:
        language = "English"

    # Find localization using patient's language
    localization = (
        db.query(GameLocalization)
        .filter(
            GameLocalization.game_id == game_id,
            func.lower(GameLocalization.language)
            == func.lower(language)
        )
        .first()
    )

    if not localization:
        # Fallback to English
        localization = (
            db.query(GameLocalization)
            .filter(
                GameLocalization.game_id == game_id,
                func.lower(GameLocalization.language) == "english"
            )
            .first()
        )

    if not localization:
        raise HTTPException(
            status_code=404,
            detail="Game localization not found"
        )

    return localization