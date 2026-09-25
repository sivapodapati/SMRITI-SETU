import os
import httpx
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional

router = APIRouter(
    prefix="/bhashini",
    tags=["Bhashini Vernacular Speech AI"]
)

class ASRRequest(BaseModel):
    audio_base64: str
    language: str # e.g. as, mni, hi, en

class TTSRequest(BaseModel):
    text: str
    language: str # e.g. as, mni, hi, en
    gender: Optional[str] = "female"

BHASHINI_API_KEY = os.getenv("BHASHINI_API_KEY", "")
BHASHINI_USER_ID = os.getenv("BHASHINI_USER_ID", "")
BHASHINI_APP_ID = os.getenv("BHASHINI_APP_ID", "")

# Verify credentials are set
def is_bhashini_configured() -> bool:
    return bool(BHASHINI_API_KEY and BHASHINI_USER_ID and BHASHINI_APP_ID)

@router.get("/status")
def get_bhashini_status():
    return {
        "status": "active" if is_bhashini_configured() else "mock_fallback_active",
        "api_configured": is_bhashini_configured()
    }

@router.post("/asr")
async def bhashini_asr(req: ASRRequest):
    """
    Speech-To-Text endpoint. Calls Government Bhashini ULCA API if credentials exist.
    Otherwise returns mock fallback response.
    """
    if not is_bhashini_configured():
        # Mock speech recognition transcription fallback
        transcript_fallback = "खेल" if req.language == "hi" else "মেমৰী"
        return {
            "status": "success",
            "source": "mock_fallback",
            "transcript": transcript_fallback,
            "language": req.language
        }

    # Bhashini API execution (Dhruva pipeline)
    # We call the Government of India Bhashini service proxy
    try:
        url = "https://dhruva-api.bhashini.gov.in/services/inference/pipeline"
        headers = {
            "Authorization": BHASHINI_API_KEY,
            "Content-Type": "application/json"
        }
        
        # Construct BhashiniULCA standard pipeline payload
        payload = {
            "pipelineTasks": [
                {
                    "taskType": "asr",
                    "config": {
                        "language": {"sourceLanguage": req.language},
                        "serviceId": f"ai4bharat/whisper-medium-en-hi-{req.language}"
                    }
                }
            ],
            "inputData": {
                "audio": [{"audioContent": req.audio_base64}]
            }
        }

        async with httpx.AsyncClient() as client:
            resp = await client.post(url, headers=headers, json=payload, timeout=10.0)
            if resp.status_code == 200:
                data = resp.json()
                transcript = data["pipelineResponse"][0]["output"][0]["source"]
                return {
                    "status": "success",
                    "source": "bhashini_api",
                    "transcript": transcript,
                    "language": req.language
                }
            else:
                raise HTTPException(status_code=resp.status_code, detail="Bhashini ASR service error")
    except Exception as e:
        print("Bhashini ASR execution failed, falling back:", str(e))
        return {
            "status": "fallback",
            "source": "error_fallback",
            "transcript": "Reminders" if req.language == "en" else "ঔষধ",
            "language": req.language
        }

@router.post("/tts")
async def bhashini_tts(req: TTSRequest):
    """
    Text-To-Speech endpoint. Generates base64 encoded audio from text.
    Calls Bhashini ULCA API if credentials exist. Otherwise returns mock empty audio.
    """
    if not is_bhashini_configured():
        return {
            "status": "success",
            "source": "mock_fallback",
            "audio_base64": "", # empty indicates client-side SpeechSynthesis fallback
            "language": req.language,
            "text": req.text
        }

    try:
        url = "https://dhruva-api.bhashini.gov.in/services/inference/pipeline"
        headers = {
            "Authorization": BHASHINI_API_KEY,
            "Content-Type": "application/json"
        }

        payload = {
            "pipelineTasks": [
                {
                    "taskType": "tts",
                    "config": {
                        "language": {"sourceLanguage": req.language},
                        "gender": req.gender,
                        "serviceId": f"ai4bharat/indic-tts-{req.language}"
                    }
                }
            ],
            "inputData": {
                "input": [{"source": req.text}]
            }
        }

        async with httpx.AsyncClient() as client:
            resp = await client.post(url, headers=headers, json=payload, timeout=10.0)
            if resp.status_code == 200:
                data = resp.json()
                audio_content = data["pipelineResponse"][0]["output"][0]["audioContent"]
                return {
                    "status": "success",
                    "source": "bhashini_api",
                    "audio_base64": audio_content,
                    "language": req.language,
                    "text": req.text
                }
            else:
                raise HTTPException(status_code=resp.status_code, detail="Bhashini TTS service error")
    except Exception as e:
        print("Bhashini TTS execution failed, falling back:", str(e))
        return {
            "status": "fallback",
            "source": "error_fallback",
            "audio_base64": "",
            "language": req.language,
            "text": req.text
        }
