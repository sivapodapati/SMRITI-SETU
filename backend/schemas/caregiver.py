from pydantic import BaseModel
from typing import Optional


class CaregiverCreate(BaseModel):
    user_id: int
    name: str
    relationship: Optional[str] = None
    phone: Optional[str] = None
    language: str = "English"


class CaregiverResponse(BaseModel):
    id: int
    user_id: int
    name: str
    relationship: Optional[str] = None
    phone: Optional[str] = None
    language: str

    class Config:
        from_attributes = True