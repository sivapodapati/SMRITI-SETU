import React, { useState, useEffect, useRef } from "react";
import VoiceButton from "../components/VoiceButton";
import { getTranslation } from "../utils/localizations";
import { offlineStore } from "../utils/offlineStore";

const BACKEND_URL = "http://127.0.0.1:8000";

const getRegionalVisual = (region) => {
  switch (region) {
    case "Assam":
      return (
        <div className="flex flex-col items-center justify-center p-4 bg-teal-50 border border-teal-200 rounded-2xl mb-4">
          <span className="text-5xl mb-2">👒 🍵 🦏</span>
          <span className="text-xs font-bold uppercase tracking-wider text-teal-800">Assam Jaapi Hat & Tea Gardens</span>
        </div>
      );
    case "Manipur":
      return (
        <div className="flex flex-col items-center justify-center p-4 bg-emerald-50 border border-emerald-200 rounded-2xl mb-4">
          <span className="text-5xl mb-2">🌸 🦌 🚣</span>
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">Manipur Loktak Lake & Sangai</span>
        </div>
      );
    case "Mizoram":
      return (
        <div className="flex flex-col items-center justify-center p-4 bg-amber-50 border border-amber-200 rounded-2xl mb-4">
          <span className="text-5xl mb-2">🎋 🧣 🥁</span>
          <span className="text-xs font-bold uppercase tracking-wider text-amber-800">Mizoram Cheraw Bamboo Dance</span>
        </div>
      );
    case "Meghalaya":
      return (
        <div className="flex flex-col items-center justify-center p-4 bg-sky-50 border border-sky-200 rounded-2xl mb-4">
          <span className="text-5xl mb-2">🌉 🌧️ 🧺</span>
          <span className="text-xs font-bold uppercase tracking-wider text-sky-850">Meghalaya Living Root Bridge</span>
        </div>
      );
    default:
      return <div className="text-5xl mb-3">📖</div>;
  }
};

export default function MoodMemoryStories({ patientId, patientInfo, levelConfig, supportLevel, locData, onExit }) {
  const lang = locData?.language || "English";
  const state = patientInfo?.state || "Default";

  // Dynamic story content from Content Selection Engine!
  const level = levelConfig?.level || 1;
  const contentId = levelConfig?.content_id || "fallback_story";
  const title = levelConfig?.title || "Mood & Memory Story";
  const storyText = levelConfig?.story_text || "Once upon a time, in the valleys of North East India...";
  const questions = levelConfig?.questions || [
    {
      id: "q1",
      question_text: "What part of India is this story set in?",
      options: ["North East India", "South India", "West India"],
      correct_idx: 0
    }
  ];

  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [selectedOption, setSelectedOption] = useState(null);
  const [moves, setMoves] = useState(0);
  const [score, setScore] = useState(0);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [message, setMessage] = useState("");
  const [gameState, setGameState] = useState("intro"); // intro, reading, questioning, finished, failed
  const [timeLeft, setTimeLeft] = useState(levelConfig?.time_limit || 120);
  const [startTime, setStartTime] = useState(null);
  const [hintActive, setHintActive] = useState(false);

  const timerRef = useRef(null);

  // Reset all game state variables when patient switches
  useEffect(() => {
    setGameState("intro");
    setCurrentQuestionIdx(0);
    setSelectedOption(null);
    setMoves(0);
    setScore(0);
    setHintsUsed(0);
    setMessage("");
    setHintActive(false);
  }, [patientId]);

  const startStory = () => {
    setGameState("reading");
    setStartTime(Date.now());
  };

  const startQuestions = () => {
    setGameState("questioning");
    setCurrentQuestionIdx(0);
    setSelectedOption(null);
    setTimeLeft(levelConfig?.time_limit || 120);
    setMessage("");
  };

  // Timer hook for questions
  useEffect(() => {
    if (gameState === "questioning") {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            finishGame(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [gameState]);

  const handleOptionSelect = (optionIdx) => {
    if (gameState !== "questioning") return;
    setSelectedOption(optionIdx);
  };

  const submitAnswer = () => {
    if (selectedOption === null || gameState !== "questioning") return;
    
    setMoves((prev) => prev + 1);
    const correctIdx = questions[currentQuestionIdx].correct_idx;

    if (selectedOption === correctIdx) {
      setMessage(getTranslation(lang, "correct_match"));
      
      setTimeout(() => {
        if (currentQuestionIdx + 1 >= questions.length) {
          setScore(100);
          finishGame(true);
        } else {
          setCurrentQuestionIdx((prev) => prev + 1);
          setSelectedOption(null);
          setMessage("");
        }
      }, 1000);
    } else {
      setMessage(getTranslation(lang, "wrong_match"));
    }
  };

  const useHint = () => {
    if (gameState !== "questioning") return;
    setHintsUsed((prev) => prev + 1);
    setHintActive(true);

    const correctAnsIdx = questions[currentQuestionIdx].correct_idx;
    const correctText = questions[currentQuestionIdx].options[correctAnsIdx];
    setMessage(`${getTranslation(lang, "next_item_hint")}: "${correctText}" 💡`);
    
    setTimeout(() => {
      setHintActive(false);
      setMessage("");
    }, 3000);
  };

  const finishGame = async (success) => {
    setGameState(success ? "finished" : "failed");
    setMessage(success ? (locData?.feedback_message || getTranslation(lang, "great_job")) : getTranslation(lang, "try_again"));
    if (timerRef.current) clearInterval(timerRef.current);

    const totalTime = startTime ? (Date.now() - startTime) / 1000 : 0;
    const engagementScore = Math.min(100, Math.max(0, 100 - hintsUsed * 5));

    try {
      const performanceData = {
        patient_id: patientId,
        game_id: 5, // Game 5
        score: success ? 100 : Math.round((currentQuestionIdx / questions.length) * 100),
        response_time: Number(totalTime.toFixed(2)),
        attempts: moves,
        correct_answers: currentQuestionIdx + (success ? 1 : 0),
        difficulty: String(level),
        engagement_score: Number(engagementScore.toFixed(2)),
        hints_used: hintsUsed,
        cognitive_support_level: supportLevel,
        previous_difficulty: String(level),
        predicted_difficulty: String(level),
        status: success ? "completed" : "failed",
        content_id: contentId,
        language: lang,
        region: state
      };

      if (navigator.onLine) {
        await fetch(`${BACKEND_URL}/performance/`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(performanceData)
        });
      } else {
        offlineStore.queuePerformance(patientId, {
          ...performanceData,
          timestamp: Date.now()
        });
      }
    } catch (e) {
      console.error("Failed to save performance:", e);
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFBF7] flex items-center justify-center p-4 sm:p-6 select-none">
      <div className="w-full max-w-3xl bg-white rounded-[2rem] border border-[#EBE7DF] shadow-sm p-6 md:p-10 flex flex-col">
        
        {/* Back navigation button */}
        <button 
          onClick={onExit} 
          className="mb-6 bg-slate-50 hover:bg-slate-100 text-slate-700 font-extrabold px-5 py-2.5 rounded-xl text-sm w-fit flex items-center gap-2 cursor-pointer border border-[#EBE7DF] shadow-sm transition-all"
        >
          ← {getTranslation(lang, "back")}
        </button>

        {/* Header */}
        <div className="text-center mb-6">
          {getRegionalVisual(state)}
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900">{title}</h1>
          <p className="text-sm text-slate-500 mt-2 font-bold uppercase tracking-wider">
            {getTranslation(lang, "level")} {level} {supportLevel === "high" && `(${getTranslation(lang, "support_active")})`}
          </p>
        </div>

        {gameState === "intro" ? (
          <div className="text-center">
            <p className="text-lg text-slate-600 mb-6 leading-relaxed">
              Read this beautiful story about your regional landmark, then answer simple memory recall questions about it.
            </p>
            <button onClick={startStory} className="w-full py-4.5 rounded-2xl bg-teal-600 text-white text-lg font-bold hover:bg-teal-700 shadow-sm transition-all cursor-pointer">
              📖 Start Reading Story
            </button>
            <button onClick={onExit} className="w-full mt-3 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition-all cursor-pointer">
              {getTranslation(lang, "cancel")}
            </button>
          </div>
        ) : gameState === "reading" ? (
          <div className="text-center">
            <div className="bg-[#FAF8F5] border border-[#EBE7DF] rounded-3xl p-6 md:p-8 mb-6 text-left shadow-inner">
              <p className="text-lg md:text-xl text-slate-800 leading-relaxed font-medium whitespace-pre-line">
                {storyText}
              </p>
            </div>
            
            <VoiceButton text={storyText} language={lang} className="w-full mb-4" />
            
            <button onClick={startQuestions} className="w-full py-4 rounded-xl bg-teal-600 text-white text-lg font-bold hover:bg-teal-700 shadow-sm transition-all cursor-pointer">
              ❓ Continue to Questions
            </button>
          </div>
        ) : gameState === "questioning" ? (
          <div>
            {/* Indicators */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              <div className="bg-slate-50 rounded-xl p-3 text-center border border-slate-100">
                <p className="text-xs text-slate-400 font-bold uppercase">Time Left</p>
                <p className="text-lg font-bold text-slate-800">{timeLeft}s</p>
              </div>
              <div className="bg-slate-50 rounded-xl p-3 text-center border border-slate-100">
                <p className="text-xs text-slate-400 font-bold uppercase">Question Progress</p>
                <p className="text-lg font-bold text-slate-800">{currentQuestionIdx + 1} / {questions.length}</p>
              </div>
            </div>

            {/* Question Text */}
            <div className="bg-[#FAF8F5] border border-[#EBE7DF] rounded-2xl p-6 mb-6 text-center text-xl font-bold text-slate-800">
              {questions[currentQuestionIdx].question_text}
            </div>

            {/* Hint message banner */}
            {message && (
              <div className="bg-[#FAF8F5] border border-amber-250 rounded-xl p-4 mb-4 text-center font-bold text-amber-800 animate-fadeIn">
                {message}
              </div>
            )}

            {/* Options list */}
            <div className="flex flex-col gap-3 mb-6">
              {questions[currentQuestionIdx].options.map((opt, oIdx) => (
                <button
                  key={oIdx}
                  onClick={() => handleOptionSelect(oIdx)}
                  className={`w-full p-4 rounded-2xl border-2 text-left font-semibold transition-all text-base md:text-lg select-none cursor-pointer ${
                    selectedOption === oIdx
                      ? "bg-teal-50 border-teal-500 text-teal-900"
                      : "bg-white border-[#EBE7DF] hover:border-teal-350 hover:bg-teal-50/10"
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={useHint} 
                className="py-3.5 rounded-xl bg-amber-500 text-white font-bold hover:bg-amber-600 transition-all cursor-pointer"
              >
                💡 {getTranslation(lang, "hints")}
              </button>
              <button 
                onClick={submitAnswer} 
                disabled={selectedOption === null}
                className="py-3.5 rounded-xl bg-teal-600 text-white font-bold hover:bg-teal-700 disabled:bg-slate-200 disabled:text-slate-450 disabled:cursor-default transition-all cursor-pointer"
              >
                Check Answer
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center">
            <div className="text-6xl mb-4">{gameState === "finished" ? "🏆" : "🌱"}</div>
            <h2 className="text-3xl font-extrabold text-slate-800 mb-3">
              {gameState === "finished" ? getTranslation(lang, "great_job") : getTranslation(lang, "try_again")}
            </h2>
            <p className="text-lg text-slate-600 mb-8">{message}</p>

            <button onClick={initializeGame} className="w-full py-4 rounded-xl bg-teal-600 text-white text-lg font-bold hover:bg-teal-700 shadow-sm transition-all cursor-pointer">
              🔄 Read Another Story
            </button>
            <button onClick={onExit} className="w-full mt-3 py-3 rounded-xl bg-slate-150 hover:bg-slate-200 text-slate-750 font-bold transition-all cursor-pointer">
              Return to Dashboard
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
