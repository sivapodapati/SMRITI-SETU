from pydantic import BaseModel
from typing import Optional, Any


class GameBase(BaseModel):
    title: str
    description: Optional[str] = None
    game_type: str
    difficulty: str = "easy"
    language: str = "English"
    cultural_theme: Optional[str] = None
    instructions: Optional[str] = None
    voice_enabled: bool = True
    content: Optional[Any] = None
    is_active: bool = True


class GameCreate(GameBase):
    pass


class GameResponse(GameBase):
    id: int

    class Config:
        from_attributes = True