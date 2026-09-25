from pydantic import BaseModel
from typing import Optional


class PatientCreate(BaseModel):
    user_id: int
    name: str
    age: int
    gender: Optional[str] = None
    state: Optional[str] = None
    language: str = "English"
    emergency_contact: Optional[str] = None
    max_difficulty_ceiling: Optional[int] = 10
    target_sessions: Optional[int] = 4


class PatientResponse(BaseModel):
    id: int
    user_id: int
    name: str
    age: int
    gender: Optional[str] = None
    state: Optional[str] = None
    language: str
    emergency_contact: Optional[str] = None
    max_difficulty_ceiling: int
    target_sessions: int

    class Config:
        from_attributes = True


class PatientUpdate(BaseModel):
    name: Optional[str] = None
    age: Optional[int] = None
    gender: Optional[str] = None
    state: Optional[str] = None
    language: Optional[str] = None
    profile_photo: Optional[str] = None
    emergency_contact: Optional[str] = None
    max_difficulty_ceiling: Optional[int] = None
    target_sessions: Optional[int] = None