import torch
import soundfile as sf

from parler_tts import ParlerTTSForConditionalGeneration
from transformers import AutoTokenizer


MODEL_NAME = "ai4bharat/indic-parler-tts"

device = "cuda:0" if torch.cuda.is_available() else "cpu"

print("Loading model...")
print("Device:", device)

model = ParlerTTSForConditionalGeneration.from_pretrained(
    MODEL_NAME
).to(device)

tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)

description_tokenizer = AutoTokenizer.from_pretrained(
    model.config.text_encoder._name_or_path
)

# Assamese text
prompt = "চিনাকি ছবিবোৰ মিলাই স্মৃতি আৰু মনত পেলোৱাৰ ক্ষমতা উন্নত কৰক।"

# Voice description
description = (
    "A female Assamese speaker speaks clearly and slowly, "
    "with a warm, gentle and friendly voice suitable for an elderly person. "
    "The recording is clear and close with very low background noise."
)

print("Preparing text...")

description_inputs = description_tokenizer(
    description,
    return_tensors="pt"
).to(device)

prompt_inputs = tokenizer(
    prompt,
    return_tensors="pt"
).to(device)

print("Generating Assamese speech...")

generation = model.generate(
    input_ids=description_inputs.input_ids,
    attention_mask=description_inputs.attention_mask,
    prompt_input_ids=prompt_inputs.input_ids,
    prompt_attention_mask=prompt_inputs.attention_mask
)

audio = generation.cpu().numpy().squeeze()

output_file = "assamese_test.wav"

sf.write(
    output_file,
    audio,
    model.config.sampling_rate
)

print("SUCCESS!")
print("Audio saved as:", output_file)