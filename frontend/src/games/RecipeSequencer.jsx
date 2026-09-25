import React, { useState, useEffect, useRef } from "react";
import VoiceButton from "../components/VoiceButton";
import { getTranslation } from "../utils/localizations";
import { offlineStore } from "../utils/offlineStore";

const BACKEND_URL = "http://127.0.0.1:8000";

export default function RecipeSequencer({ patientId, patientInfo, levelConfig, supportLevel, locData, onExit }) {
  const lang = locData?.language || "English";
  const state = patientInfo?.state || "Default";
  
  // Recipe parameters from Content Selection Engine!
  const level = levelConfig?.level || 1;
  const contentId = levelConfig?.content_id || "fallback_recipe";
  const recipeTitle = levelConfig?.title || "Traditional Recipe Sequencer";
  const dishIcon = levelConfig?.dishIcon || "🍲";
  const correctSteps = levelConfig?.steps || [
    { id: "s1", emoji: "🍳", text: "1. Prep components" },
    { id: "s2", emoji: "🔥", "text": "2. Cook them on flame" },
    { id: "s3", emoji: "🧂", "text": "3. Season and serve" }
  ];

  const [shuffledSteps, setShuffledSteps] = useState([]);
  const [userSequence, setUserSequence] = useState([]);
  const [errors, setErrors] = useState(0);
  const [gameState, setGameState] = useState("intro"); // intro, playing, finished, failed
  const [startTime, setStartTime] = useState(null);
  const [timeLeft, setTimeLeft] = useState(levelConfig?.time_limit || 90);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [hintActive, setHintActive] = useState(false);

  const timerRef = useRef(null);

  const initializeGame = () => {
    // Shuffle the steps
    const shuffled = [...correctSteps].sort(() => Math.random() - 0.5);
    setShuffledSteps(shuffled);
    setUserSequence([]);
    setErrors(0);
    setHintsUsed(0);
    setHintActive(false);
    setGameState("playing");
    setTimeLeft(levelConfig?.time_limit || 90);
    setStartTime(Date.now());
  };

  // Timer Hook
  useEffect(() => {
    if (gameState === "playing") {
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

  const handleStepClick = (step) => {
    if (gameState !== "playing" || userSequence.some(s => s.id === step.id)) return;

    // Check if this step is the next correct step
    const nextExpectedIndex = userSequence.length;
    const expectedStep = correctSteps[nextExpectedIndex];

    if (step.id === expectedStep.id) {
      // Correct!
      const newSeq = [...userSequence, step];
      setUserSequence(newSeq);
      
      if (newSeq.length === correctSteps.length) {
        finishGame(true);
      }
    } else {
      // Incorrect step clicked
      setErrors((prev) => prev + 1);
      setHintActive(true);
      setTimeout(() => setHintActive(false), 1500);
    }
  };

  const useHint = () => {
    if (gameState !== "playing") return;
    setHintsUsed((prev) => prev + 1);
    
    // Find next expected step
    const nextExpectedIndex = userSequence.length;
    const expectedStep = correctSteps[nextExpectedIndex];

    if (expectedStep) {
      // Highlight this step's ID visually
      setHintActive(expectedStep.id);
      setTimeout(() => setHintActive(null), 2000);
    }
  };

  const finishGame = async (success) => {
    setGameState(success ? "finished" : "failed");
    if (timerRef.current) clearInterval(timerRef.current);

    const totalTime = startTime ? (Date.now() - startTime) / 1000 : 0;
    const engagementScore = Math.min(100, Math.max(0, 100 - errors * 5 - hintsUsed * 10));

    try {
      const performanceData = {
        patient_id: patientId,
        game_id: 3, // Game 3
        score: success ? 100 : Math.round((userSequence.length / correctSteps.length) * 100),
        response_time: Number(totalTime.toFixed(2)),
        attempts: userSequence.length + errors,
        correct_answers: userSequence.length,
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
      <div className="w-full max-w-2xl bg-white rounded-[2rem] border border-[#EBE7DF] shadow-sm p-6 md:p-10 flex flex-col">
        
        {/* Back navigation button */}
        <button 
          onClick={onExit} 
          className="mb-6 bg-slate-50 hover:bg-slate-100 text-slate-700 font-extrabold px-5 py-2.5 rounded-xl text-sm w-fit flex items-center gap-2 cursor-pointer border border-[#EBE7DF] shadow-sm transition-all"
        >
          ← {getTranslation(lang, "back")}
        </button>

        {/* Header */}
        <div className="text-center mb-6">
          <div className="text-5xl mb-3">{dishIcon}</div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900">{recipeTitle}</h1>
          <p className="text-sm text-slate-500 mt-2 font-bold uppercase tracking-wider">
            {getTranslation(lang, "level")} {level} {supportLevel === "high" && `(${getTranslation(lang, "support_active")})`}
          </p>
        </div>

        {gameState === "intro" ? (
          <div className="text-center">
            <p className="text-lg text-slate-600 mb-6 leading-relaxed">
              Arrange the steps in the correct cooking order to prepare a traditional North Eastern recipe!
            </p>
            <div className="bg-teal-50/50 border border-teal-150 rounded-2xl p-6 mb-6 text-left">
              <h2 className="text-lg font-bold text-teal-800 mb-2">🍳 Instructions:</h2>
              <p className="text-base text-slate-700 leading-relaxed">
                Click each preparation step in sequence from first to last to complete the recipe.
              </p>
            </div>
            
            <VoiceButton 
              text={`Arrange the recipe steps in order to cook the dish. Click start to begin.`} 
              language={lang} 
              className="w-full mb-3" 
            />
            
            <button onClick={initializeGame} className="w-full py-4.5 rounded-2xl bg-teal-600 text-white text-lg font-bold hover:bg-teal-700 shadow-sm transition-all cursor-pointer">
              🎮 {getTranslation(lang, "start")}
            </button>
            <button onClick={onExit} className="w-full mt-3 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition-all cursor-pointer">
              {getTranslation(lang, "cancel")}
            </button>
          </div>
        ) : gameState === "playing" ? (
          <div>
            {/* Indicators */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              <div className="bg-slate-50 rounded-xl p-3 text-center border border-slate-100">
                <p className="text-xs text-slate-400 font-bold uppercase">Time Left</p>
                <p className="text-lg font-bold text-slate-800">{timeLeft}s</p>
              </div>
              <div className="bg-slate-50 rounded-xl p-3 text-center border border-slate-100">
                <p className="text-xs text-slate-400 font-bold uppercase">Errors Made</p>
                <p className="text-lg font-bold text-rose-600">{errors}</p>
              </div>
            </div>

            {/* Current Ordered Sequence */}
            <div className="mb-6">
              <h3 className="text-sm font-bold text-slate-400 uppercase mb-3">Your Progress:</h3>
              <div className="flex flex-col gap-2 min-h-[80px] bg-slate-50 border border-dashed border-slate-200 rounded-2xl p-4">
                {userSequence.length === 0 ? (
                  <p className="text-slate-400 font-medium text-center my-auto">Click steps below in order...</p>
                ) : (
                  userSequence.map((step, idx) => (
                    <div key={step.id} className="flex items-center gap-3 bg-teal-50 border border-teal-200 rounded-xl p-3 text-slate-800 animate-fadeIn">
                      <span className="text-lg">{step.emoji}</span>
                      <span className="font-bold text-sm text-teal-800">{idx + 1}.</span>
                      <span className="text-sm font-semibold">{step.text}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Choices Pool */}
            <div className="mb-8">
              <h3 className="text-sm font-bold text-slate-400 uppercase mb-3">Cooking Steps:</h3>
              <div className="flex flex-col gap-3">
                {shuffledSteps.map((step) => {
                  const isSelected = userSequence.some(s => s.id === step.id);
                  const isHintTarget = hintActive === step.id;

                  return (
                    <button
                      key={step.id}
                      onClick={() => handleStepClick(step)}
                      disabled={isSelected}
                      className={`w-full flex items-center gap-4 rounded-2xl border-2 p-4 text-left transition-all ${
                        isSelected
                          ? "bg-slate-50 border-slate-100 opacity-40 cursor-default"
                          : isHintTarget
                          ? "bg-amber-50 border-amber-400 scale-102 animate-bounce"
                          : "bg-white border-[#EBE7DF] hover:border-teal-400 hover:bg-teal-50/20 active:scale-98 cursor-pointer"
                      }`}
                    >
                      <span className="text-2xl">{step.emoji}</span>
                      <span className="font-bold text-slate-700 text-sm md:text-base leading-relaxed">{step.text}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mt-6">
              <button onClick={useHint} className="py-3.5 rounded-xl bg-amber-500 text-white text-base font-bold hover:bg-amber-600 transition-all cursor-pointer">
                💡 Hint expected step
              </button>
              <button onClick={initializeGame} className="py-3.5 rounded-xl bg-teal-600 text-white text-base font-bold hover:bg-teal-700 transition-all cursor-pointer">
                🔄 Re-shuffle steps
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center">
            <div className="text-6xl mb-4">{gameState === "finished" ? "🏆" : "🌱"}</div>
            <h2 className="text-3xl font-extrabold text-slate-800 mb-3">
              {gameState === "finished" ? "Dish Cooked Successfully!" : "Try Again"}
            </h2>
            <p className="text-lg text-slate-600 mb-8">
              {gameState === "finished" ? "You correctly sequenced the cooking process!" : "The recipe steps got mixed up. Let's try again!"}
            </p>

            <button onClick={initializeGame} className="w-full py-4 rounded-xl bg-teal-600 text-white text-lg font-bold hover:bg-teal-700 shadow-sm transition-all cursor-pointer">
              🔄 Cook Again
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
