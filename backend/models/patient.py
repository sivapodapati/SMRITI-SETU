from sqlalchemy import Column, Integer, String, ForeignKey
from database import Base


class Patient(Base):
    __tablename__ = "patients"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    name = Column(String, nullable=False)
    age = Column(Integer, nullable=True)
    gender = Column(String, nullable=True)

    state = Column(String, nullable=True)
    language = Column(String, nullable=False, default="English")

    profile_photo = Column(String, nullable=True)

    emergency_contact = Column(String, nullable=True)
    
    # Clinician difficulty/regimen controls
    max_difficulty_ceiling = Column(Integer, default=10, nullable=False)
    target_sessions = Column(Integer, default=4, nullable=False)