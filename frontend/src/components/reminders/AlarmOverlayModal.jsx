import React, { useState, useEffect } from "react";
import { Bell, Volume2, VolumeX, CheckCircle2, Clock } from "lucide-react";
import { getTranslation } from "../../utils/localizations";

const BACKEND_URL = "http://127.0.0.1:8000";

export default function AlarmOverlayModal({
  activeReminder = null,
  currentLang = "English",
  onComplete = () => {},
  onSnooze = () => {},
  onDismiss = () => {},
}) {
  const [isMuted, setIsMuted] = useState(false);
  const [audioObj, setAudioObj] = useState(null);

  // Trigger TTS voice prompt when active reminder changes
  useEffect(() => {
    if (!activeReminder || isMuted) {
      stopVoice();
      return;
    }

    let spokenPrompt = `Reminder: time for your alert: ${activeReminder.title}.`;
    const rType = (activeReminder.reminder_type || "").toLowerCase();
    if (rType === "hydration") {
      spokenPrompt = `Time to drink water. Hydration is essential.`;
    } else if (rType === "medication") {
      spokenPrompt = `Time to take your scheduled medication: ${activeReminder.title}.`;
    } else if (rType === "appointment") {
      spokenPrompt = `Reminder: You have a scheduled appointment: ${activeReminder.title}.`;
    }

    speakText(spokenPrompt, currentLang);

    return () => {
      stopVoice();
    };
  }, [activeReminder, currentLang, isMuted]);

  const speakText = async (text, language) => {
    stopVoice();
    try {
      // 1. Try Bhashini / Parler-TTS backend speak endpoint
      const response = await fetch(`${BACKEND_URL}/tts/speak`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, language }),
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        setAudioObj(audio);
        audio.play().catch(e => {
          console.error("Audio play blocked, falling back to Web Speech:", e);
          fallbackSpeechSynthesis(text);
        });
      } else {
        fallbackSpeechSynthesis(text);
      }
    } catch (e) {
      console.error("TTS fetch error, falling back:", e);
      fallbackSpeechSynthesis(text);
    }
  };

  const fallbackSpeechSynthesis = (text) => {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      // Try to find regional language voice
      window.speechSynthesis.speak(utterance);
    }
  };

  const stopVoice = () => {
    if (audioObj) {
      try {
        audioObj.pause();
      } catch (e) {}
    }
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  };

  const handleMuteToggle = () => {
    const nextMute = !isMuted;
    setIsMuted(nextMute);
    if (nextMute) {
      stopVoice();
    }
  };

  if (!activeReminder) return null;

  const getEmoji = (type) => {
    const t = (type || "").toLowerCase();
    if (t === "medication") return "💊";
    if (t === "hydration") return "💧";
    if (t === "appointment") return "📅";
    return "🔔";
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="relative max-w-lg w-full bg-white rounded-[2.5rem] p-8 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto border-8 border-amber-400 text-center animate-bounce-subtle">
        
        {/* Header bar */}
        <div className="flex items-center justify-between border-b-2 border-amber-100 pb-4">
          <div className="inline-flex items-center gap-2 bg-rose-600 text-white font-black text-sm md:text-base px-4 py-2 rounded-full shadow-md animate-pulse">
            <Bell className="w-5 h-5 animate-spin" />
            <span>ALARM ALERT!</span>
          </div>

          <button
            type="button"
            onClick={handleMuteToggle}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl font-bold text-sm border-2 cursor-pointer transition-all ${
              isMuted 
                ? "bg-slate-100 text-slate-700 border-slate-350 hover:bg-slate-200" 
                : "bg-amber-100 text-amber-900 border-amber-450 hover:bg-amber-200"
            }`}
          >
            {isMuted ? <VolumeX className="w-5 h-5 text-slate-600" /> : <Volume2 className="w-5 h-5 text-amber-700" />}
            <span>{isMuted ? "Mute Voice" : "Read Out Loud"}</span>
          </button>
        </div>

        {/* Big visual category icon */}
        <div className="w-24 h-24 mx-auto rounded-3xl bg-amber-400 text-amber-950 flex items-center justify-center font-black text-5xl border-4 border-amber-200 shadow-lg">
          {getEmoji(activeReminder.reminder_type)}
        </div>

        {/* Scheduled time & title */}
        <div className="space-y-3">
          <div className="inline-block bg-amber-50 text-amber-950 font-black text-xl px-5 py-1.5 rounded-2xl border border-amber-300">
            ⏰ Time: {activeReminder.scheduled_time}
          </div>

          <h3 className="text-3xl font-black text-slate-900 leading-tight">
            {activeReminder.title}
          </h3>

          {activeReminder.description && (
            <p className="text-base font-bold text-slate-650 bg-amber-50/50 p-4 rounded-2xl border border-amber-150">
              📋 {activeReminder.description}
            </p>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex flex-col gap-3 pt-3">
          {/* Complete */}
          <button
            type="button"
            onClick={() => {
              stopVoice();
              onComplete(activeReminder);
            }}
            className="flex items-center justify-center gap-3 min-h-[64px] rounded-2xl bg-emerald-600 hover:bg-emerald-700 border-4 border-emerald-400 text-white font-black text-xl shadow-lg cursor-pointer"
          >
            <CheckCircle2 className="w-7 h-7" />
            <span>Mark as Completed</span>
          </button>

          {/* Snooze */}
          <button
            type="button"
            onClick={() => {
              stopVoice();
              onSnooze(activeReminder);
            }}
            className="flex items-center justify-center gap-3 min-h-[64px] rounded-2xl bg-amber-400 hover:bg-amber-300 border-4 border-amber-200 text-amber-950 font-black text-xl shadow-lg cursor-pointer"
          >
            <Clock className="w-7 h-7" />
            <span>Snooze 10 Minutes</span>
          </button>
        </div>

        {/* Dismiss alert */}
        <div className="pt-2">
          <button
            type="button"
            onClick={() => {
              stopVoice();
              onDismiss(activeReminder);
            }}
            className="text-slate-500 font-extrabold text-sm hover:underline hover:text-slate-800 cursor-pointer"
          >
            Dismiss Alert
          </button>
        </div>

      </div>
    </div>
  );
}
