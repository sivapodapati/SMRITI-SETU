from pydantic import BaseModel, EmailStr
from typing import Optional


class UserCreate(BaseModel):
    name: str
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    password: str
    role: str
    state: Optional[str] = None
    language: str = "English"


class UserResponse(BaseModel):
    id: int
    name: str
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    role: str
    state: Optional[str] = None
    language: str
    profile_photo: Optional[str] = None

    class Config:
        from_attributes = True

class UserLogin(BaseModel):
    email: EmailStr
    password: str