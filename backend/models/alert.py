from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, func
from database import Base


class CaregiverAlert(Base):
    __tablename__ = "caregiver_alerts"

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

    alert_type = Column(
        String,
        nullable=False
    )

    severity = Column(
        String,
        nullable=False
    )

    reason = Column(
        String,
        nullable=False
    )

    current_level = Column(
        Integer,
        nullable=False,
        default=1
    )

    recommended_action = Column(
        String,
        nullable=False
    )

    timestamp = Column(
        DateTime,
        nullable=False,
        server_default=func.now()
    )

    is_read = Column(
        Boolean,
        nullable=False,
        default=False
    )
