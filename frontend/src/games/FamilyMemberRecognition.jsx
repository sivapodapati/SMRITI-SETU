import React, { useState, useEffect, useRef } from "react";
import { getTranslation } from "../utils/localizations";

const BACKEND_URL = "http://127.0.0.1:8000";

// Global audio tracking to prevent overlapping speech
let globalAudio = null;
let globalAudioUrl = null;

export default function FamilyMemberRecognition({
  patientId,
  patientInfo,
  levelConfig,
  supportLevel,
  locData,
  onExit
}) {
  const lang = locData?.language || "English";

  // State configurations
  const [gameState, setGameState] = useState("intro"); // intro, playing, feedback, summary
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [isCorrect, setIsCorrect] = useState(false);
  const [selectedChoice, setSelectedChoice] = useState("");
  const [choices, setChoices] = useState([]);
  const [startTime, setStartTime] = useState(null);
  const [timeLeft, setTimeLeft] = useState(60);
  const [voicePlaying, setVoicePlaying] = useState(false);

  const timerRef = useRef(null);

  // Extract variables safely from levelConfig
  const config = levelConfig || {};
  const familyMembers = config.family_members || [];
  const allRelationships = config.all_relationships || [
    "Mother", "Father", "Daughter", "Son", "Brother", "Sister", "Grandchild", "Spouse"
  ];
  const timeLimit = config.time_limit || 60;
  const currentLevel = config.level || 1;

  const currentMember = familyMembers[currentIndex] || null;

  // Speak feedback or prompts
  const speakText = async (textToSpeak) => {
    if (!textToSpeak) return;
    try {
      // Stop currently playing audio
      if (globalAudio) {
        try {
          globalAudio.pause();
        } catch (e) {}
        globalAudio = null;
      }
      if (globalAudioUrl) {
        try {
          URL.revokeObjectURL(globalAudioUrl);
        } catch (e) {}
        globalAudioUrl = null;
      }

      setVoicePlaying(true);
      const res = await fetch(`${BACKEND_URL}/tts/speak`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: textToSpeak, language: lang })
      });

      if (!res.ok) throw new Error("TTS failed");
      const blob = await res.blob();
      const audioUrl = URL.createObjectURL(blob);
      const audio = new Audio(audioUrl);
      
      globalAudio = audio;
      globalAudioUrl = audioUrl;

      audio.onended = () => {
        setVoicePlaying(false);
        if (globalAudio === audio) globalAudio = null;
      };
      audio.onerror = () => {
        setVoicePlaying(false);
      };

      await audio.play().catch(() => {
        // Handle blocked autoplay gracefully
        setVoicePlaying(false);
      });
    } catch (e) {
      console.error("Voice TTS failed:", e);
      setVoicePlaying(false);
    }
  };

  // Generate options/choices for the current family member
  const generateChoices = () => {
    if (!currentMember) return;

    const correctRelation = currentMember.relationship;
    const correctName = currentMember.name;

    // Distractor relationships
    const otherRelations = allRelationships.filter(r => r !== correctRelation);
    
    // Determine choices based on level
    let tempChoices = [];
    if (currentLevel >= 3) {
      // Level 3+: ask name + relationship
      const correctOption = `${correctName} (${getTranslation(lang, correctRelation.toLowerCase())})`;
      tempChoices.push(correctOption);

      // Generate distractors with names or random relationships
      const mockNames = ["Rohit", "Ananya", "Preeti", "Sanjay", "Karan", "Nisha"];
      const shuffledNames = [...mockNames].sort(() => Math.random() - 0.5);
      const shuffledRels = [...otherRelations].sort(() => Math.random() - 0.5);

      const limit = Math.min(3, currentLevel); // limit option count
      for (let i = 0; i < limit; i++) {
        const dName = shuffledNames[i] || "Family Member";
        const dRel = shuffledRels[i] || "Other";
        tempChoices.push(`${dName} (${getTranslation(lang, dRel.toLowerCase())})`);
      }
    } else {
      // Level 1-2: simple relationship options
      const correctOption = getTranslation(lang, correctRelation.toLowerCase());
      tempChoices.push(correctOption);

      const shuffledRels = [...otherRelations].sort(() => Math.random() - 0.5);
      const limit = currentLevel === 1 ? 1 : 2; // Level 1 shows 2 choices, Level 2 shows 3 choices
      for (let i = 0; i < limit; i++) {
        const dRel = shuffledRels[i];
        if (dRel) {
          tempChoices.push(getTranslation(lang, dRel.toLowerCase()));
        }
      }
    }

    // Shuffle final choices list
    setChoices(tempChoices.sort(() => Math.random() - 0.5));
  };

  // Trigger when a member changes or game starts
  useEffect(() => {
    if (gameState === "playing" && currentMember) {
      generateChoices();
      // Speak the prompt question in preferred language
      const questionText = getTranslation(lang, "who_is_this_person");
      speakText(questionText);
    }
  }, [currentIndex, gameState]);

  // Timer logic
  useEffect(() => {
    if (gameState === "playing") {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            // Move to summary directly or auto-submit incorrect
            handleAnswerSubmit("");
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [gameState, currentIndex]);

  const handleStartGame = () => {
    setGameState("playing");
    setCurrentIndex(0);
    setScore(0);
    setAttempts(0);
    setTimeLeft(timeLimit);
    setStartTime(Date.now());
  };

  const handleAnswerSubmit = (choice) => {
    if (gameState !== "playing" || !currentMember) return;
    
    if (timerRef.current) clearInterval(timerRef.current);
    setSelectedChoice(choice);

    let correct = false;
    const correctRelation = currentMember.relationship;
    const correctName = currentMember.name;

    if (currentLevel >= 3) {
      const correctOption = `${correctName} (${getTranslation(lang, correctRelation.toLowerCase())})`;
      correct = choice === correctOption;
    } else {
      const correctOption = getTranslation(lang, correctRelation.toLowerCase());
      correct = choice === correctOption;
    }

    setIsCorrect(correct);
    setAttempts(prev => prev + 1);
    if (correct) {
      setScore(prev => prev + 1);
    }

    setGameState("feedback");

    // Dynamic translation feedback
    const relTranslated = getTranslation(lang, correctRelation.toLowerCase());
    let feedbackText = "";
    if (correct) {
      feedbackText = getTranslation(lang, "correct_family_feedback").replace("{relation}", relTranslated);
    } else {
      feedbackText = getTranslation(lang, "incorrect_family_feedback").replace("{relation}", relTranslated);
    }

    speakText(feedbackText);
  };

  const handleNext = () => {
    if (currentIndex + 1 < familyMembers.length) {
      setCurrentIndex(prev => prev + 1);
      setGameState("playing");
      setTimeLeft(timeLimit);
    } else {
      setGameState("summary");
      submitPerformance(true);
    }
  };

  const submitPerformance = async (completed) => {
    if (timerRef.current) clearInterval(timerRef.current);
    const totalTime = startTime ? (Date.now() - startTime) / 1000 : 0;
    const accuracy = attempts > 0 ? (score / attempts) * 100 : 0;
    const engagementScore = Math.min(100, Math.max(0, 100 - (attempts - score) * 10));

    const telemetryData = {
      patient_id: patientId,
      game_id: 6, // Game 6
      score: Math.round(accuracy),
      response_time: Number(totalTime.toFixed(2)),
      attempts: attempts,
      correct_answers: score,
      difficulty: String(currentLevel),
      engagement_score: Number(engagementScore.toFixed(2)),
      hints_used: 0,
      cognitive_support_level: supportLevel,
      previous_difficulty: String(currentLevel),
      predicted_difficulty: String(currentLevel),
      status: completed ? "completed" : "failed"
    };

    try {
      if (navigator.onLine) {
        await fetch(`${BACKEND_URL}/performance/`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(telemetryData)
        });
      } else {
        // Fallback offline queue
        const val = localStorage.getItem(`patient_${patientId}_performance_queue`);
        const queue = val ? JSON.parse(val) : [];
        queue.push({ ...telemetryData, timestamp: Date.now() });
        localStorage.setItem(`patient_${patientId}_performance_queue`, JSON.stringify(queue));
      }
    } catch (e) {
      console.error("Telemetry submit error:", e);
    }
  };

  // Exit game
  const handleExit = () => {
    if (globalAudio) {
      try {
        globalAudio.pause();
      } catch (e) {}
    }
    onExit();
  };

  if (gameState === "intro") {
    return (
      <div className="min-h-screen bg-[#FDFBF7] flex items-center justify-center p-4 sm:p-6 select-none font-sans">
        <div className="w-full max-w-2xl bg-white rounded-[2rem] border border-[#EBE7DF] shadow-sm p-8 text-center flex flex-col items-center">
          <div className="w-20 h-20 rounded-full bg-teal-50 text-teal-600 flex items-center justify-center font-bold text-4xl shadow-sm mb-6">📸</div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight mb-4">
            {locData?.title || getTranslation(lang, "family_member_recognition")}
          </h1>
          <p className="text-slate-600 text-lg font-medium leading-relaxed mb-8 max-w-md">
            {locData?.description || "Practice recognizing your family members and relationships to support memory recall."}
          </p>
          <div className="bg-slate-50 border border-[#EBE7DF] rounded-2xl p-5 mb-8 text-left w-full">
            <h3 className="font-bold text-slate-800 text-sm mb-2 uppercase tracking-wider">💡 How to Play:</h3>
            <p className="text-slate-600 text-base leading-relaxed">
              {locData?.instructions || "Look at the photo of your family member and choose their correct relationship to you."}
            </p>
          </div>
          <div className="flex gap-4 w-full">
            <button
              onClick={handleExit}
              className="flex-1 py-4 rounded-xl border border-[#EBE7DF] text-slate-700 font-bold hover:bg-slate-50 active:scale-95 transition-all cursor-pointer text-lg"
            >
              {getTranslation(lang, "back")}
            </button>
            <button
              onClick={handleStartGame}
              className="flex-1 py-4 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-extrabold shadow-sm active:scale-95 transition-all cursor-pointer text-lg"
            >
              🎮 {locData?.start_button || getTranslation(lang, "start")}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (gameState === "playing" || gameState === "feedback") {
    if (!currentMember) {
      return (
        <div className="min-h-screen bg-[#FDFBF7] flex items-center justify-center p-4 text-center font-sans">
          <p className="text-slate-600 text-lg font-bold">Loading family members...</p>
        </div>
      );
    }

    const correctRelation = currentMember.relationship;
    const relTranslated = getTranslation(lang, correctRelation.toLowerCase());
    const feedbackText = isCorrect
      ? getTranslation(lang, "correct_family_feedback").replace("{relation}", relTranslated)
      : getTranslation(lang, "incorrect_family_feedback").replace("{relation}", relTranslated);

    return (
      <div className="min-h-screen bg-[#FDFBF7] flex items-center justify-center p-4 sm:p-6 select-none font-sans">
        <div className="w-full max-w-3xl bg-white rounded-[2rem] border border-[#EBE7DF] shadow-sm p-6 md:p-10 flex flex-col">
          
          {/* Header Info */}
          <div className="flex justify-between items-center mb-6 pb-4 border-b border-[#EBE7DF]">
            <span className="bg-slate-100 border border-[#EBE7DF] text-slate-700 px-3.5 py-1.5 rounded-full text-sm font-black uppercase tracking-wider">
              {getTranslation(lang, "level")} {currentLevel}
            </span>
            <div className="flex items-center gap-4">
              <span className="text-slate-600 font-bold text-sm">
                Progress: <span className="text-slate-900 font-black">{currentIndex + 1}/{familyMembers.length}</span>
              </span>
              <span className="bg-rose-50 border border-rose-100 text-rose-700 px-3.5 py-1.5 rounded-xl text-sm font-black flex items-center gap-1.5">
                ⏱️ {timeLeft}s
              </span>
            </div>
          </div>

          {/* Photo and Question Area */}
          <div className="flex flex-col items-center text-center my-6 flex-1">
            <div className="w-64 h-64 md:w-72 md:h-72 rounded-3xl overflow-hidden border border-[#EBE7DF] bg-slate-100 shadow-md mb-6 relative">
              <img
                src={currentMember.photo_url}
                alt="Family Member"
                className="w-full h-full object-cover"
              />
            </div>
            
            <h2 className="text-2xl font-black text-slate-900 mb-6 px-4">
              {getTranslation(lang, "who_is_this_person")}
            </h2>
          </div>

          {/* Answer/Feedback State */}
          {gameState === "playing" ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
              {choices.map((choice, idx) => (
                <button
                  key={idx}
                  onClick={() => handleAnswerSubmit(choice)}
                  className="bg-slate-50 hover:bg-[#F3EFE9] border-2 border-[#EBE7DF] text-slate-800 font-extrabold text-xl py-5 px-6 rounded-2xl transition-all active:scale-95 shadow-sm text-center cursor-pointer"
                >
                  {choice}
                </button>
              ))}
            </div>
          ) : (
            <div className="mt-4 p-6 rounded-2xl border-2 flex flex-col items-center gap-4 text-center transition-all bg-slate-50 border-teal-200">
              <span className={`text-4xl ${isCorrect ? "text-emerald-600" : "text-amber-600"}`}>
                {isCorrect ? "✅" : "ℹ️"}
              </span>
              <p className="text-xl font-bold text-slate-800 max-w-lg leading-relaxed">
                {feedbackText}
              </p>
              <button
                onClick={handleNext}
                className="mt-2 bg-teal-600 hover:bg-teal-700 text-white font-extrabold px-10 py-4 rounded-xl text-lg shadow-sm active:scale-95 transition-all cursor-pointer w-full sm:w-auto"
              >
                {getTranslation(lang, "next")} ➡️
              </button>
            </div>
          )}

          {/* Quick Exit option */}
          <div className="mt-8 text-center">
            <button
              onClick={handleExit}
              className="text-slate-400 hover:text-slate-600 text-sm font-semibold underline cursor-pointer"
            >
              Exit & Return to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (gameState === "summary") {
    const accuracy = attempts > 0 ? Math.round((score / attempts) * 100) : 0;
    return (
      <div className="min-h-screen bg-[#FDFBF7] flex items-center justify-center p-4 sm:p-6 select-none font-sans">
        <div className="w-full max-w-2xl bg-white rounded-[2rem] border border-[#EBE7DF] shadow-sm p-8 text-center flex flex-col items-center">
          <div className="w-24 h-24 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-5xl shadow-sm mb-6">🎉</div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight mb-2">
            Activity Completed!
          </h1>
          <p className="text-slate-500 text-lg font-medium mb-8">
            You've successfully completed the Family Member Recognition activity.
          </p>

          <div className="grid grid-cols-2 gap-4 w-full mb-8">
            <div className="bg-slate-50 border border-[#EBE7DF] rounded-2xl p-5">
              <span className="text-xs font-black text-slate-400 uppercase tracking-widest block mb-1">Accuracy</span>
              <span className="text-3xl font-black text-slate-800">{accuracy}%</span>
            </div>
            <div className="bg-slate-50 border border-[#EBE7DF] rounded-2xl p-5">
              <span className="text-xs font-black text-slate-400 uppercase tracking-widest block mb-1">Score</span>
              <span className="text-3xl font-black text-slate-850">{score} / {attempts}</span>
            </div>
          </div>

          <button
            onClick={handleExit}
            className="w-full py-4.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-extrabold text-lg shadow-sm active:scale-95 transition-all cursor-pointer"
          >
            🏠 {getTranslation(lang, "return_dashboard")}
          </button>
        </div>
      </div>
    );
  }

  return null;
}
