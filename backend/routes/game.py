from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import SessionLocal
from models.game import Game
from schemas.game import GameCreate, GameResponse
from services.content_engine import select_game_content



router = APIRouter(
    prefix="/games",
    tags=["Games"]
)


# Database session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# Create Game
@router.post("/", response_model=GameResponse)
def create_game(
    game_data: GameCreate,
    db: Session = Depends(get_db)
):
    new_game = Game(
        title=game_data.title,
        description=game_data.description,
        game_type=game_data.game_type,
        difficulty=game_data.difficulty,
        language=game_data.language,
        cultural_theme=game_data.cultural_theme,
        instructions=game_data.instructions,
        voice_enabled=game_data.voice_enabled,
        content=game_data.content,
        is_active=game_data.is_active
    )

    db.add(new_game)
    db.commit()
    db.refresh(new_game)

    return new_game


# Get all Games
@router.get("/", response_model=list[GameResponse])
def get_games(
    db: Session = Depends(get_db)
):
    return db.query(Game).all()


# Get Game by ID
@router.get("/{game_id}", response_model=GameResponse)
def get_game(
    game_id: int,
    db: Session = Depends(get_db)
):
    game = (
        db.query(Game)
        .filter(Game.id == game_id)
        .first()
    )

    if not game:
        raise HTTPException(
            status_code=404,
            detail="Game not found"
        )

    return game


# Get Game Levels
@router.get("/{game_id}/levels")
def get_game_levels(
    game_id: int,
    db: Session = Depends(get_db)
):
    game = (
        db.query(Game)
        .filter(Game.id == game_id)
        .first()
    )

    if not game:
        raise HTTPException(
            status_code=404,
            detail="Game not found"
        )

    if not game.content or "levels" not in game.content:
        raise HTTPException(
            status_code=404,
            detail="Levels configuration not found for this game"
        )

    return game.content["levels"]


# Get Specific Level Config
@router.get("/{game_id}/levels/{level}")
def get_game_level_config(
    game_id: int,
    level: str,
    db: Session = Depends(get_db)
):
    game = (
        db.query(Game)
        .filter(Game.id == game_id)
        .first()
    )

    if not game:
        raise HTTPException(
            status_code=404,
            detail="Game not found"
        )

    if not game.content or "levels" not in game.content or level not in game.content["levels"]:
        raise HTTPException(
            status_code=404,
            detail=f"Level {level} configuration not found for this game"
        )

    return game.content["levels"][level]


# Update Game
@router.put("/{game_id}", response_model=GameResponse)
def update_game(
    game_id: int,
    game_data: GameCreate,
    db: Session = Depends(get_db)
):
    game = (
        db.query(Game)
        .filter(Game.id == game_id)
        .first()
    )

    if not game:
        raise HTTPException(
            status_code=404,
            detail="Game not found"
        )

    game.title = game_data.title
    game.description = game_data.description
    game.game_type = game_data.game_type
    game.difficulty = game_data.difficulty
    game.language = game_data.language
    game.cultural_theme = game_data.cultural_theme
    game.instructions = game_data.instructions
    game.voice_enabled = game_data.voice_enabled
    game.content = game_data.content
    game.is_active = game_data.is_active

    db.commit()
    db.refresh(game)

    return game


# Delete Game
@router.delete("/{game_id}")
def delete_game(
    game_id: int,
    db: Session = Depends(get_db)
):
    game = (
        db.query(Game)
        .filter(Game.id == game_id)
        .first()
    )

    if not game:
        raise HTTPException(
            status_code=404,
            detail="Game not found"
        )

    db.delete(game)
    db.commit()

    return {
        "message": "Game deleted successfully",
        "game_id": game_id
    }


# Get Personalized Game Content (Dynamic Content selection engine)
@router.get("/{game_id}/content")
def get_game_content(
    game_id: int,
    patient_id: int,
    level: int,
    db: Session = Depends(get_db)
):
    if game_id == 6:
        import random
        from datetime import datetime
        from models.family_member import FamilyMember

        # Fetch active family members for this patient
        members = (
            db.query(FamilyMember)
            .filter(FamilyMember.patient_id == patient_id, FamilyMember.active == True)
            .all()
        )
        
        # Fallback to defaults if patient has no family members
        if not members:
            svg_avatar_female = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><circle cx='50' cy='50' r='45' fill='%23E6FFFA'/><circle cx='50' cy='35' r='15' fill='%23319795'/><path d='M20 80c0-15 15-20 30-20s30 5 30 20z' fill='%23319795'/></svg>"
            svg_avatar_male = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><circle cx='50' cy='50' r='45' fill='%23EBF8FF'/><circle cx='50' cy='35' r='15' fill='%232B6CB0'/><path d='M20 80c0-15 15-20 30-20s30 5 30 20z' fill='%232B6CB0'/></svg>"
            
            members_list = [
                {"id": -1, "name": "Priya", "relationship": "Daughter", "photo_url": svg_avatar_female, "preferred_display_name": "Priya"},
                {"id": -2, "name": "Aarav", "relationship": "Son", "photo_url": svg_avatar_male, "preferred_display_name": "Aarav"},
                {"id": -3, "name": "Rajesh", "relationship": "Brother", "photo_url": svg_avatar_male, "preferred_display_name": "Rajesh"},
                {"id": -4, "name": "Sunita", "relationship": "Spouse", "photo_url": svg_avatar_female, "preferred_display_name": "Sunita"}
            ]
        else:
            members_list = [
                {
                    "id": m.id,
                    "name": m.name,
                    "relationship": m.relationship,
                    "photo_url": m.photo_url,
                    "preferred_display_name": m.preferred_display_name or m.name
                }
                for m in members
            ]

        # Shuffle members list to guarantee content rotation
        random.seed(datetime.now().timestamp())
        shuffled_list = list(members_list)
        random.shuffle(shuffled_list)

        # Level config mappings:
        choices_count = min(level + 1, len(shuffled_list))
        if choices_count < 2:
            choices_count = min(2, len(shuffled_list))
            
        sampled = shuffled_list[:choices_count]
        
        # Build options pool (all possible relationships)
        all_relationships = list(set([m["relationship"] for m in members_list] + ["Mother", "Father", "Daughter", "Son", "Brother", "Sister", "Grandchild", "Spouse"]))
        
        return {
            "id": 600 + level,
            "game_id": 6,
            "level": level,
            "state": "Default",
            "language": "English",
            "content_id": f"family_g6_l{level}",
            "title": "Family Member Recognition",
            "data": {
                "family_members": sampled,
                "all_relationships": all_relationships,
                "time_limit": 60 - (level * 2)
            }
        }

    content = select_game_content(db, patient_id, game_id, level)
    if not content:
        raise HTTPException(
            status_code=404,
            detail=f"No personalized content found for Game {game_id} Level {level}"
        )
    return content