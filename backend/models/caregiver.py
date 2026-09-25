from sqlalchemy import Column, Integer, String, ForeignKey
from database import Base


class Caregiver(Base):
    __tablename__ = "caregivers"

    id = Column(Integer, primary_key=True, index=True)

    user_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False
    )

    name = Column(String, nullable=False)
    relationship = Column(String, nullable=True)
    phone = Column(String, nullable=True)
    language = Column(String, nullable=False, default="English")