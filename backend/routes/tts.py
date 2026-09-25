import io
import os
import hashlib
import base64
import requests

import torch
import soundfile as sf
from routes.bhashini import is_bhashini_configured, BHASHINI_API_KEY


from fastapi import APIRouter, HTTPException
from fastapi.responses import Response, FileResponse
from pydantic import BaseModel

from parler_tts import ParlerTTSForConditionalGeneration
from transformers import AutoTokenizer


# ==========================================
# ROUTER
# ==========================================

router = APIRouter(
    prefix="/tts",
    tags=["Text to Speech"]
)


# ==========================================
# TTS CACHE
# ==========================================

TTS_CACHE_DIR = "tts_cache"

os.makedirs(TTS_CACHE_DIR, exist_ok=True)


def get_cache_file(text: str, language: str) -> str:
    """
    Creates a unique WAV filename based on
    language + text.
    """

    cache_key = f"{language}:{text}".encode("utf-8")

    filename = hashlib.md5(cache_key).hexdigest() + ".wav"

    return os.path.join(
        TTS_CACHE_DIR,
        filename
    )


# ==========================================
# MODEL CONFIGURATION
# ==========================================

MODEL_NAME = "ai4bharat/indic-parler-tts"

DEVICE = "cuda:0" if torch.cuda.is_available() else "cpu"


print("========================================")
print("Loading Indic Parler-TTS...")
print("Device:", DEVICE)
print("========================================")


# ==========================================
# LOAD MODEL ONCE
# ==========================================

model = ParlerTTSForConditionalGeneration.from_pretrained(
    MODEL_NAME
).to(DEVICE)

model.eval()


tokenizer = AutoTokenizer.from_pretrained(
    MODEL_NAME
)


description_tokenizer = AutoTokenizer.from_pretrained(
    model.config.text_encoder._name_or_path
)


print("========================================")
print("Indic Parler-TTS loaded successfully!")
print("Sampling Rate:", model.config.sampling_rate)
print("Cache Folder:", TTS_CACHE_DIR)
print("========================================")


# ==========================================
# REQUEST SCHEMA
# ==========================================

class TTSRequest(BaseModel):

    text: str

    language: str = "Assamese"


# ==========================================
# VOICE DESCRIPTIONS
# ==========================================

VOICE_DESCRIPTIONS = {

    "Assamese": (
        "A female Assamese speaker speaks clearly and slowly, "
        "with a warm, gentle and friendly voice suitable for an elderly person. "
        "The recording is clear and close with very low background noise."
    ),

    "Bengali": (
        "A female Bengali speaker speaks clearly and slowly, "
        "with a warm, gentle and friendly voice suitable for an elderly person. "
        "The recording is clear and close with very low background noise."
    ),

    "English": (
        "A female Indian English speaker speaks clearly and slowly, "
        "with a warm, gentle and friendly voice suitable for an elderly person. "
        "The recording is clear and close with very low background noise."
    ),

    "Nepali": (
        "A female Nepali speaker speaks clearly and slowly, "
        "with a warm, gentle and friendly voice suitable for an elderly person. "
        "The recording is clear and close with very low background noise."
    ),

    "Mizo": (
        "A female Mizo speaker speaks clearly and slowly, "
        "with a warm, gentle and friendly voice suitable for an elderly person. "
        "The recording is clear and close with very low background noise."
    ),

    "Meitei": (
        "A female Meitei speaker speaks clearly and slowly, "
        "with a warm, gentle and friendly voice suitable for an elderly person. "
        "The recording is clear and close with very low background noise."
    ),

    "Khasi": (
        "A female Khasi speaker speaks clearly and slowly, "
        "with a warm, gentle and friendly voice suitable for an elderly person. "
        "The recording is clear and close with very low background noise."
    ),
    "Garo": (
        "A female Garo speaker speaks clearly and slowly, "
        "with a warm, gentle and friendly voice suitable for an elderly person. "
        "The recording is clear and close with very low background noise."
    ),
}


# ==========================================
# TEXT TO SPEECH ENDPOINT
# ==========================================

@router.post("/speak")
def text_to_speech(request: TTSRequest):

    try:

        # ======================================
        # VALIDATE TEXT
        # ======================================

        text = request.text.strip()

        if not text:

            raise HTTPException(
                status_code=400,
                detail="Text cannot be empty"
            )


        # ======================================
        # LANGUAGE
        # ======================================

        language = request.language


        # ======================================
        # CACHE FILE
        # ======================================

        cache_file = get_cache_file(
            text,
            language
        )


        # ======================================
        # CHECK CACHE
        # ======================================

        if os.path.exists(cache_file):

            print("========================================")
            print("CACHED AUDIO")
            print("Language:", language)
            print("File:", cache_file)
            print("========================================")

            return FileResponse(
                cache_file,
                media_type="audio/wav",
                filename="tts.wav",
                headers={
                    "Cache-Control": "public, max-age=31536000"
                }
            )

        # ======================================
        # BHASHINI API INTERCEPT
        # ======================================
        if is_bhashini_configured():
            try:
                lang_code = "en"
                l_lower = language.lower()
                if "assamese" in l_lower or l_lower == "as":
                    lang_code = "as"
                elif "meitei" in l_lower or "manipuri" in l_lower or l_lower == "mni":
                    lang_code = "mni"
                elif "khasi" in l_lower or l_lower == "kha":
                    lang_code = "kha"
                elif "mizo" in l_lower:
                    lang_code = "en" # Bhashini lacks Mizo TTS, fallback to en/hi
                elif "hindi" in l_lower or l_lower == "hi":
                    lang_code = "hi"
                elif "bengali" in l_lower or l_lower == "bn":
                    lang_code = "bn"

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
                                "language": {"sourceLanguage": lang_code},
                                "gender": "female",
                                "serviceId": f"ai4bharat/indic-tts-{lang_code}"
                            }
                        }
                    ],
                    "inputData": {
                        "input": [{"source": text}]
                    }
                }

                print(f"[Bhashini speak intercept] Requesting TTS for language '{lang_code}': '{text[:30]}...'")
                resp = requests.post(url, headers=headers, json=payload, timeout=8.0)
                if resp.status_code == 200:
                    audio_content_b64 = resp.json()["pipelineResponse"][0]["output"][0]["audioContent"]
                    audio_bytes = base64.b64decode(audio_content_b64)
                    with open(cache_file, "wb") as f:
                        f.write(audio_bytes)
                    print(f"Successfully cached Bhashini TTS output to {cache_file}")
                    return FileResponse(
                        cache_file,
                        media_type="audio/wav",
                        filename="tts.wav"
                    )
                else:
                    print(f"Bhashini TTS API returned status: {resp.status_code}. Falling back to local Parler-TTS.")
            except Exception as e:
                print(f"Failed to get Bhashini TTS output, falling back to local: {str(e)}")

        # ======================================
        # SELECT VOICE DESCRIPTION
        # ======================================


        description = VOICE_DESCRIPTIONS.get(
            language,
            VOICE_DESCRIPTIONS["English"]
        )


        print("========================================")
        print("TTS REQUEST")
        print("Language:", language)
        print("Text:", text.encode("ascii", errors="replace").decode("ascii"))
        print("Generating new audio...")
        print("========================================")


        # ======================================
        # TOKENIZE DESCRIPTION
        # ======================================

        description_inputs = description_tokenizer(
            description,
            return_tensors="pt"
        )


        description_input_ids = (
            description_inputs.input_ids.to(DEVICE)
        )

        description_attention_mask = (
            description_inputs.attention_mask.to(DEVICE)
        )


        # ======================================
        # TOKENIZE TEXT
        # ======================================

        prompt_inputs = tokenizer(
            text,
            return_tensors="pt"
        )


        prompt_input_ids = (
            prompt_inputs.input_ids.to(DEVICE)
        )

        prompt_attention_mask = (
            prompt_inputs.attention_mask.to(DEVICE)
        )


        # ======================================
        # GENERATE AUDIO
        # ======================================

        print("Generating speech...")

        with torch.no_grad():

            generation = model.generate(

                input_ids=description_input_ids,

                attention_mask=description_attention_mask,

                prompt_input_ids=prompt_input_ids,

                prompt_attention_mask=prompt_attention_mask
            )


        # ======================================
        # CONVERT AUDIO
        # ======================================

        audio = (
            generation
            .detach()
            .cpu()
            .numpy()
            .squeeze()
        )


        print("Audio shape:", audio.shape)

        print(
            "Audio samples:",
            len(audio)
        )


        # ======================================
        # VALIDATE AUDIO
        # ======================================

        if audio.size == 0:

            raise RuntimeError(
                "Generated audio is empty"
            )


        # ======================================
        # SAVE AUDIO TO CACHE
        # ======================================

        sf.write(

            cache_file,

            audio,

            samplerate=model.config.sampling_rate,

            format="WAV",

            subtype="PCM_16"
        )


        # ======================================
        # CHECK FILE
        # ======================================

        file_size = os.path.getsize(
            cache_file
        )


        print("========================================")
        print("AUDIO CACHED")
        print("File:", cache_file)
        print("Size:", file_size, "bytes")
        print("========================================")


        # ======================================
        # RETURN AUDIO
        # ======================================

        return FileResponse(

            cache_file,

            media_type="audio/wav",

            filename="tts.wav",

            headers={
                "Cache-Control": "public, max-age=31536000"
            }
        )


    # ==========================================
    # HTTP ERROR
    # ==========================================

    except HTTPException:

        raise


    # ==========================================
    # GENERAL ERROR
    # ==========================================

    except Exception as e:

        print("========================================")
        print("TTS ERROR")
        print(str(e))
        print("========================================")


        raise HTTPException(

            status_code=500,

            detail=f"TTS generation failed: {str(e)}"
        )