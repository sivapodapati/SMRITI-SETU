from pydantic import BaseModel


class LocalizationCreate(BaseModel):
    game_id: int
    language: str

    title: str
    description: str
    instructions: str

    start_button: str = "Start Game"
    feedback_message: str = "Well done!"
    hint_message: str = "Take your time and try again."

    voice_enabled: bool = True


class LocalizationResponse(BaseModel):
    id: int
    game_id: int
    language: str

    title: str
    description: str
    instructions: str

    start_button: str
    feedback_message: str
    hint_message: str

    voice_enabled: bool

    class Config:
        from_attributes = True