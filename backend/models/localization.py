from sqlalchemy import Column, Integer, String, Text, ForeignKey, Boolean
from database import Base


class GameLocalization(Base):
    __tablename__ = "game_localizations"

    id = Column(Integer, primary_key=True, index=True)

    game_id = Column(
        Integer,
        ForeignKey("games.id"),
        nullable=False
    )

    language = Column(
        String,
        nullable=False
    )

    title = Column(
        String,
        nullable=False
    )

    description = Column(
        Text,
        nullable=False
    )

    instructions = Column(
        Text,
        nullable=False
    )

    start_button = Column(
        String,
        nullable=False,
        default="Start Game"
    )

    feedback_message = Column(
        Text,
        nullable=False,
        default="Well done!"
    )

    hint_message = Column(
        Text,
        nullable=False,
        default="Take your time and try again."
    )

    voice_enabled = Column(
        Boolean,
        default=True
    )