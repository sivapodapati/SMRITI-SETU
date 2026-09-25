from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class AlertBase(BaseModel):
    patient_id: int
    game_id: int
    alert_type: str
    severity: str
    reason: str
    current_level: int
    recommended_action: str
    is_read: bool = False


class AlertCreate(AlertBase):
    pass


class AlertResponse(AlertBase):
    id: int
    timestamp: datetime

    class Config:
        from_attributes = True
