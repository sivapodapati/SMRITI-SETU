from sqlalchemy import Column, Integer, String, ForeignKey, Boolean, DateTime
from sqlalchemy.sql import func
from database import Base


class FamilyMember(Base):
    __tablename__ = "family_members"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id", ondelete="CASCADE"), nullable=False, index=True)

    name = Column(String, nullable=False)
    relationship = Column(String, nullable=False)  # Daughter, Son, Brother, Sister, etc.
    photo_url = Column(String, nullable=True)      # Holds base64 photo data or url
    preferred_display_name = Column(String, nullable=True)
    active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
