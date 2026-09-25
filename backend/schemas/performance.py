from pydantic import BaseModel
from typing import Optional


class PerformanceCreate(BaseModel):
    patient_id: int
    game_id: int

    score: float = 0
    response_time: float = 0
    attempts: int = 1
    correct_answers: int = 0

    difficulty: str = "easy"

    engagement_score: float = 0
    hints_used: int = 0

    cognitive_support_level: str = "medium"

    previous_difficulty: str = "easy"
    predicted_difficulty: str = "easy"

    status: str = "completed"
    reason: Optional[str] = None


class PerformanceResponse(BaseModel):
    id: int

    patient_id: int
    game_id: int

    score: float
    response_time: float
    attempts: int
    correct_answers: int

    difficulty: str

    engagement_score: float
    hints_used: int

    cognitive_support_level: str

    previous_difficulty: str
    predicted_difficulty: str

    status: str
    reason: Optional[str] = None

    class Config:
        from_attributes = True