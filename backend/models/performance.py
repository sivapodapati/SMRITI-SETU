from sqlalchemy import Column, Integer, Float, String, ForeignKey
from database import Base


class GamePerformance(Base):
    __tablename__ = "game_performances"

    id = Column(Integer, primary_key=True, index=True)

    patient_id = Column(
        Integer,
        ForeignKey("patients.id"),
        nullable=False
    )

    game_id = Column(
        Integer,
        ForeignKey("games.id"),
        nullable=False
    )

    # Patient performance
    score = Column(Float, default=0)
    response_time = Column(Float, default=0)
    attempts = Column(Integer, default=1)
    correct_answers = Column(Integer, default=0)

    # Current game difficulty
    difficulty = Column(String, default="easy")

    # Patient engagement
    engagement_score = Column(Float, default=0)
    hints_used = Column(Integer, default=0)

    # Cognitive support level provided by
    # caregiver/healthcare professional
    cognitive_support_level = Column(
        String,
        default="medium"
    )

    # Adaptive learning history
    previous_difficulty = Column(
        String,
        default="easy"
    )

    predicted_difficulty = Column(
        String,
        default="easy"
    )

    status = Column(
        String,
        default="completed"
    )
    reason = Column(
        String,
        nullable=True
    )