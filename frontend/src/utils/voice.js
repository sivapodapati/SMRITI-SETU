// Multilingual Text-to-Speech utility

const LANGUAGE_VOICE_MAP = {
  English: "en-IN",
  Assamese: "as-IN",
  Meitei: "mni-IN",
  Khasi: "en-IN",
  Mizo: "en-IN",
  Nagamese: "en-IN",
  Nepali: "ne-NP",
  Kokborok: "bn-IN"
};


export function speakText(text, language = "English") {
  if (!text) {
    return;
  }

  if (!("speechSynthesis" in window)) {
    console.warn("Text-to-Speech is not supported by this browser.");
    return;
  }

  // Stop any currently playing speech
  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);

  utterance.lang =
    LANGUAGE_VOICE_MAP[language] || "en-IN";

  utterance.rate = 0.8;
  utterance.pitch = 1;
  utterance.volume = 1;

  window.speechSynthesis.speak(utterance);
}


export function stopSpeaking() {
  if ("speechSynthesis" in window) {
    window.speechSynthesis.cancel();
  }
}