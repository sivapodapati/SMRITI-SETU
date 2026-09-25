from sqlalchemy import Column, Integer, String
from database import Base


class User(Base):
    __tablename__ = "users"

    # Basic User Information
    id = Column(Integer, primary_key=True, index=True)

    name = Column(String, nullable=False)

    email = Column(String, unique=True, nullable=True)

    phone = Column(String, unique=True, nullable=True)

    password = Column(String, nullable=False)

    # User Role
    # patient / caregiver
    role = Column(String, nullable=False)

    # NER State
    state = Column(String, nullable=True)

    # Preferred Regional Language
    language = Column(String, default="English")

    # Profile Photo URL/path
    profile_photo = Column(String, nullable=True)