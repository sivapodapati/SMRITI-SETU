from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class FamilyMemberCreate(BaseModel):
    name: str
    relationship: str
    photo_url: Optional[str] = None
    preferred_display_name: Optional[str] = None
    active: Optional[bool] = True


class FamilyMemberUpdate(BaseModel):
    name: Optional[str] = None
    relationship: Optional[str] = None
    photo_url: Optional[str] = None
    preferred_display_name: Optional[str] = None
    active: Optional[bool] = None


class FamilyMemberResponse(BaseModel):
    id: int
    patient_id: int
    name: str
    relationship: str
    photo_url: Optional[str] = None
    preferred_display_name: Optional[str] = None
    active: bool
    created_at: datetime

    class Config:
        from_attributes = True
