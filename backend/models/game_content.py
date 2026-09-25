from sqlalchemy import Column, Integer, String, Boolean, JSON, ForeignKey
from database import Base

class GameContent(Base):
    __tablename__ = "game_contents"

    id = Column(Integer, primary_key=True, index=True)
    game_id = Column(Integer, ForeignKey("games.id"), nullable=False)
    level = Column(Integer, nullable=False) # 1-10
    state = Column(String, nullable=False, default="Default") # e.g. Assam, Manipur, Meghalaya, Mizoram, Default
    language = Column(String, nullable=False, default="English") # e.g. English, Assamese, Meitei, Mizo, Khasi, Hindi, Bengali
    content_id = Column(String, nullable=False, index=True) # e.g. story_tea_l1
    title = Column(String, nullable=False)
    data = Column(JSON, nullable=False) # holds the dynamic questions, options, story text, steps, symbols
    is_active = Column(Boolean, default=True, nullable=False)
