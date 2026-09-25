from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from database import Base, engine

from models.user import User
from models.patient import Patient
from models.caregiver import Caregiver
from models.game import Game
from models.performance import GamePerformance
from models.alert import CaregiverAlert
from models.reminder import Reminder
from models.task import PatientTask
from models.recommendation import RecommendationHistory
from models.game_content import GameContent
from models.content_history import ContentUsageHistory
from models.family_member import FamilyMember

from routes.localization import router as localization_router
from routes.tts import router as tts_router
from routes.auth import router as auth_router
from routes.patient import router as patient_router
from routes.caregiver import router as caregiver_router
from routes.game import router as game_router
from routes.performance import router as performance_router
from routes.family_member import router as family_member_router
from routes.adaptive import router as adaptive_router
from routes.alert import router as alert_router
from routes.reminders import router as reminders_router
from routes.tasks import router as tasks_router
from routes.recommendations import router as recommendations_router
from routes.clinician import router as clinician_router
from routes.bhashini import router as bhashini_router


# =========================================================
# CREATE FASTAPI APP
# =========================================================

app = FastAPI(
    title="Cognitive Assistance Platform",
    description="AI-Based Cognitive Gaming & Memory Assistance Platform",
    version="1.0.0"
)


# =========================================================
# CORS
# =========================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# =========================================================
# DATABASE TABLES
# =========================================================

Base.metadata.create_all(bind=engine)


# =========================================================
# ROUTERS
# =========================================================

app.include_router(auth_router)
app.include_router(patient_router)
app.include_router(caregiver_router)
app.include_router(game_router)
app.include_router(performance_router)
app.include_router(adaptive_router)
app.include_router(alert_router)
app.include_router(reminders_router)
app.include_router(tasks_router)
app.include_router(recommendations_router)
app.include_router(localization_router)
app.include_router(tts_router)
app.include_router(clinician_router)
app.include_router(bhashini_router)
app.include_router(family_member_router)





# =========================================================
# ROOT
# =========================================================

@app.get("/")
def root():
    return {
        "message": "Cognitive Assistance Platform API is running"
    }


# =========================================================
# HEALTH CHECK
# =========================================================

@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "database": "connected"
    }