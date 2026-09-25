from sqlalchemy.orm import Session
from sqlalchemy import desc
from models.game_content import GameContent
from models.content_history import ContentUsageHistory
from models.patient import Patient
from datetime import datetime

def select_game_content(db: Session, patient_id: int, game_id: int, level: int) -> dict:
    """
    Intelligent Content Selection Engine.
    Resolves patient,preferred language, state/region, game_id, level, and content history
    to choose a personalized game content variant.
    """
    # 1. Fetch patient profile
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        patient_state = "Default"
        patient_lang = "English"
    else:
        patient_state = patient.state or "Default"
        patient_lang = patient.language or "English"

    print(f"Content Selection Engine: Patient {patient_id} ({patient_state}, {patient_lang}) Game {game_id} Level {level}")

    # 2. Get available contents for this game
    all_game_contents = (
        db.query(GameContent)
        .filter(
            GameContent.game_id == game_id,
            GameContent.is_active == True
        )
        .all()
    )

    if not all_game_contents:
        print(f"No content found for Game {game_id}. Defaulting.")
        return None

    # State hierarchy: Specific State -> "Default"
    state_matches = [c for c in all_game_contents if c.state.lower() == patient_state.lower()]
    if state_matches:
        level_state_matches = [c for c in state_matches if c.level == level]
        candidate_contents = level_state_matches if level_state_matches else state_matches
    else:
        level_matches = [c for c in all_game_contents if c.level == level]
        default_matches = [c for c in (level_matches or all_game_contents) if c.state.lower() == "default"]
        candidate_contents = default_matches if default_matches else (level_matches or all_game_contents)

    # Language hierarchy: Specific Language -> "English" -> Any
    lang_matches = [c for c in candidate_contents if c.language.lower() == patient_lang.lower()]
    if not lang_matches:
        lang_matches = [c for c in candidate_contents if c.language.lower() == "english"]
    if not lang_matches:
        lang_matches = candidate_contents

    # 3. Apply rotation based on ContentUsageHistory
    history = (
        db.query(ContentUsageHistory)
        .filter(
            ContentUsageHistory.patient_id == patient_id,
            ContentUsageHistory.game_id == game_id
        )
        .order_by(desc(ContentUsageHistory.played_at))
        .limit(10)
        .all()
    )
    recently_played_ids = [h.content_id for h in history]

    # Find the least recently played content
    unplayed = [c for c in lang_matches if c.content_id not in recently_played_ids]
    if unplayed:
        selected_content = unplayed[0]
    else:
        # If all have been played, find the one played longest ago
        # (the one that appears furthest down or last in the recently_played list)
        history_map = {content_id: idx for idx, content_id in enumerate(reversed(recently_played_ids))}
        selected_content = min(lang_matches, key=lambda c: history_map.get(c.content_id, -1))

    # Log this play in content usage history
    log_content_usage(db, patient_id, game_id, selected_content.content_id)

    return {
        "id": selected_content.id,
        "game_id": selected_content.game_id,
        "level": selected_content.level,
        "state": selected_content.state,
        "language": selected_content.language,
        "content_id": selected_content.content_id,
        "title": selected_content.title,
        "data": selected_content.data
    }

def log_content_usage(db: Session, patient_id: int, game_id: int, content_id: str):
    """
    Log content play in ContentUsageHistory
    """
    history_entry = ContentUsageHistory(
        patient_id=patient_id,
        game_id=game_id,
        content_id=content_id,
        played_at=datetime.utcnow()
    )
    db.add(history_entry)
    db.commit()
