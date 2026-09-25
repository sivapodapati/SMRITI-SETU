import React, { useState, useEffect, useRef } from "react";
import { getTranslation } from "../utils/localizations";

const BACKEND_URL = "http://127.0.0.1:8000";

// Global audio tracking to prevent overlapping speech
let globalAudio = null;
let globalAudioUrl = null;
let globalCancelFn = null;

export default function VoiceButton({ text, language = "English", className = "" }) {
  const [status, setStatus] = useState("idle"); // idle, generating, playing, error
  const [hasPlayed, setHasPlayed] = useState(false);
  const currentAudioRef = useRef(null);
  const currentAudioUrlRef = useRef(null);

  const stopCurrent = () => {
    // Clear global audio if it's playing
    if (globalAudio) {
      try {
        globalAudio.pause();
        globalAudio.currentTime = 0;
      } catch (e) {
        console.error("Error pausing global audio", e);
      }
      globalAudio = null;
    }
    if (globalAudioUrl) {
      try {
        URL.revokeObjectURL(globalAudioUrl);
      } catch (e) {}
      globalAudioUrl = null;
    }
    if (globalCancelFn) {
      globalCancelFn();
      globalCancelFn = null;
    }

    setStatus("idle");
  };

  const handleSpeak = async (e) => {
    e.stopPropagation();
    if (status === "generating" || status === "playing") {
      stopCurrent();
      return;
    }

    // Stop whatever else is playing
    stopCurrent();

    if (!text) return;

    setStatus("generating");

    let active = true;
    globalCancelFn = () => {
      active = false;
    };

    try {
      console.log(`[TTS Request] Lang: ${language}, Text: ${text}`);
      const response = await fetch(`${BACKEND_URL}/tts/speak`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: text,
          language: language,
        }),
      });

      if (!active) return;

      if (!response.ok) {
        throw new Error(`TTS failed with status: ${response.status}`);
      }

      const blob = await response.blob();
      if (!active) return;

      if (!blob || blob.size === 0) {
        throw new Error("TTS returned empty audio blob.");
      }

      const audioUrl = URL.createObjectURL(blob);
      const audio = new Audio(audioUrl);
      audio.preload = "auto";

      currentAudioRef.current = audio;
      currentAudioUrlRef.current = audioUrl;

      // Assign to global tracker
      globalAudio = audio;
      globalAudioUrl = audioUrl;

      audio.onplay = () => {
        if (active) setStatus("playing");
      };

      audio.onended = () => {
        if (active) {
          setStatus("idle");
          setHasPlayed(true);
          URL.revokeObjectURL(audioUrl);
          if (globalAudio === audio) globalAudio = null;
          if (globalAudioUrl === audioUrl) globalAudioUrl = null;
        }
      };

      audio.onerror = (err) => {
        console.error("Audio play error", err);
        if (active) {
          setStatus("error");
          setTimeout(() => setStatus("idle"), 2000);
        }
      };

      await audio.play();
    } catch (err) {
      console.error("TTS speech error:", err);
      if (active) {
        setStatus("error");
        setTimeout(() => setStatus("idle"), 2000);
      }
    }
  };

  // Cleanup and prop change monitoring
  useEffect(() => {
    setStatus("idle");
    setHasPlayed(false);
    if (currentAudioRef.current && globalAudio === currentAudioRef.current) {
      stopCurrent();
    }
  }, [text, language]);

  useEffect(() => {
    return () => {
      // Only stop if this specific button was playing
      if (currentAudioRef.current && globalAudio === currentAudioRef.current) {
        stopCurrent();
      }
    };
  }, []);

  const getButtonText = () => {
    switch (status) {
      case "generating":
        return `⏳ PREPARING VOICE...`;
      case "playing":
        return `🔊 PLAYING...`;
      case "error":
        return `⚠️ ERROR`;
      default:
        return hasPlayed ? `🔊 LISTEN AGAIN` : `🔊 LISTEN`;
    }
  };

  const getButtonClass = () => {
    switch (status) {
      case "generating":
        return "bg-amber-500 hover:bg-amber-600 text-white animate-pulse";
      case "playing":
        return "bg-rose-500 hover:bg-rose-600 text-white shadow-inner";
      case "error":
        return "bg-slate-400 text-white cursor-not-allowed";
      default:
        return "bg-teal-600 hover:bg-teal-700 text-white active:scale-95";
    }
  };

  return (
    <button
      onClick={handleSpeak}
      disabled={status === "error"}
      className={`px-6 py-4 rounded-2xl text-lg font-bold transition-all shadow-sm select-none ${getButtonClass()} ${className}`}
    >
      {getButtonText()}
    </button>
  );
}
