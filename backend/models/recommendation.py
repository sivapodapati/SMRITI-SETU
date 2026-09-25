from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Float
from sqlalchemy.sql import func
from database import Base

class RecommendationHistory(Base):
    __tablename__ = "recommendation_history"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False)
    recommended_game_id = Column(Integer, ForeignKey("games.id"), nullable=False)
    target_domain = Column(String, nullable=False)
    recommended_level = Column(Integer, default=1)
    support_level = Column(String, default="medium")
    reason = Column(String, nullable=True)
    flow_zone = Column(String, default="comfortable_challenge")
    confidence = Column(Float, default=1.0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
