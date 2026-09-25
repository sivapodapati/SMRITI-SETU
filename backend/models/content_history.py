from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, func
from database import Base

class ContentUsageHistory(Base):
    __tablename__ = "content_usage_history"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False)
    game_id = Column(Integer, ForeignKey("games.id"), nullable=False)
    content_id = Column(String, nullable=False, index=True)
    played_at = Column(DateTime, default=func.now(), nullable=False)
