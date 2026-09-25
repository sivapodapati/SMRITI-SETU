from sqlalchemy import Column, Integer, String, Text, Boolean, JSON
from database import Base


class Game(Base):
    __tablename__ = "games"

    id = Column(Integer, primary_key=True, index=True)

    title = Column(String, nullable=False)

    description = Column(Text, nullable=True)

    game_type = Column(String, nullable=False)

    difficulty = Column(String, default="easy")

    language = Column(String, default="English")

    cultural_theme = Column(String, nullable=True)

    instructions = Column(Text, nullable=True)

    voice_enabled = Column(Boolean, default=True)

    content = Column(JSON, nullable=True)

    is_active = Column(Boolean, default=True)