// Fuzzy Voice Command intents matching for voice navigation
export const VOICE_COMMANDS = {
  English: {
    dashboard: ["dashboard", "home", "main screen", "go home"],
    reminders: ["reminders", "alarms", "medication", "hydration", "clock"],
    tasks: ["tasks", "todo list", "work", "routine"],
    back: ["back", "exit", "close", "quit"],
    play: ["play game", "start", "play", "game"],
    lang_as: ["assamese", "assam"],
    lang_hi: ["hindi", "india"],
    lang_en: ["english"]
  },
  Assamese: {
    dashboard: ["মুখ্য পৃষ্ঠা", "ঘৰলৈ ব’লা", "ঘৰ"],
    reminders: ["সোঁৱৰণী", "ঘড়ী", "ঔষধ"],
    tasks: ["কাম", "তালিকা"],
    back: ["বাহিৰ", "প্ৰস্থান", "পিছলৈ"],
    play: ["খেল", "খেলক"],
    lang_as: ["অসমীয়া"],
    lang_hi: ["হিন্দী"],
    lang_en: ["ইংৰাজী"]
  }
};

export function parseVoiceCommand(text, currentLang = "English") {
  const tClean = text.toLowerCase().trim();
  const langCommands = VOICE_COMMANDS[currentLang] || VOICE_COMMANDS.English;

  for (const [intent, phrases] of Object.entries(langCommands)) {
    for (const phrase of phrases) {
      if (tClean.includes(phrase.toLowerCase())) {
        return intent;
      }
    }
  }

  // Fallback check against English intents directly
  if (currentLang !== "English") {
    for (const [intent, phrases] of Object.entries(VOICE_COMMANDS.English)) {
      for (const phrase of phrases) {
        if (tClean.includes(phrase.toLowerCase())) {
          return intent;
        }
      }
    }
  }

  return null;
}
