const languageCodes = {
  English: "en-IN",
  Assamese: "as-IN",
  Bengali: "bn-IN",
  Meitei: "mni-IN",
  Nepali: "ne-NP",
  Mizo: "lus-IN",
  Khasi: "en-IN",
};

export function speak(text, language) {
  if (!text) return;

  if (!window.speechSynthesis) {
    console.log("Speech synthesis not supported");
    return;
  }

  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);

  utterance.lang = languageCodes[language] || "en-IN";
  utterance.rate = 0.8;
  utterance.pitch = 1;
  utterance.volume = 1;

  window.speechSynthesis.speak(utterance);
}

export function stopSpeaking() {
  if (window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
}