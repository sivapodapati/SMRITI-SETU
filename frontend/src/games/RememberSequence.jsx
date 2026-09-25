import React, { useState, useEffect, useRef } from "react";
import VoiceButton from "../components/VoiceButton";
import { getTranslation, getRegionalAssets } from "../utils/localizations";
import { offlineStore } from "../utils/offlineStore";

const BACKEND_URL = "http://127.0.0.1:8000";

export default function RememberSequence({ patientId, patientInfo, levelConfig, supportLevel, locData, onExit }) {
  const lang = locData?.language || "English";
  const state = patientInfo?.state || "Default";
  const rawPool = getRegionalAssets(state, lang);
  const EMOJIS_POOL = (rawPool && rawPool.length > 0) ? rawPool : [
    { id: "apple", emoji: "🍎", name: "Apple" },
    { id: "banana", emoji: "🍌", name: "Banana" },
    { id: "cat", emoji: "🐱", name: "Cat" },
    { id: "dog", emoji: "🐶", name: "Dog" }
  ];
  // Use standard or easier_variant depending on supportLevel
  const config = supportLevel === "high"
    ? (levelConfig?.easier_variant || levelConfig)
    : (levelConfig?.standard || levelConfig) || {};
  
  const [items, setItems] = useState([]);
  const [sequence, setSequence] = useState([]);
  const [userSequence, setUserSequence] = useState([]);
  const [flashingIndex, setFlashingIndex] = useState(-1);
  const [isFlashing, setIsFlashing] = useState(false);
  const [moves, setMoves] = useState(0);
  const [score, setScore] = useState(0);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [message, setMessage] = useState("");
  const [gameState, setGameState] = useState("intro"); // intro, playing, finished, failed
  const [timeLeft, setTimeLeft] = useState(config.time_limit || 90);
  const [startTime, setStartTime] = useState(null);

  const timerRef = useRef(null);
  const flashTimeoutRef = useRef(null);

  const initializeGame = () => {
    // Pick choices_count random items
    const shuffled = [...EMOJIS_POOL].sort(() => Math.random() - 0.5);
    const gameItems = shuffled.slice(0, config.choices_count || 3);
    
    // Pick sequence_length items randomly (can repeat)
    const seq = [];
    for (let i = 0; i < (config.sequence_length || 2); i++) {
      const randomItem = gameItems[Math.floor(Math.random() * gameItems.length)];
      seq.push(randomItem.id);
    }

    setItems(gameItems);
    setSequence(seq);
    setUserSequence([]);
    setMoves(0);
    setScore(0);
    setHintsUsed(0);
    setGameState("playing");
    setTimeLeft(config.time_limit || 90);
    setStartTime(Date.now());
    setMessage(getTranslation(lang, "watch_carefully"));

    // Start flash sequence
    triggerFlashSequence(seq, gameItems);
  };

  const triggerFlashSequence = (seq, gameItems) => {
    setIsFlashing(true);
    let index = 0;
    setFlashingIndex(-1);

    const flashInterval = setInterval(() => {
      if (index < seq.length) {
        setFlashingIndex(index);
        index++;
      } else {
        clearInterval(flashInterval);
        setFlashingIndex(-1);
        setIsFlashing(false);
        setMessage(getTranslation(lang, "repeat_pattern"));
      }
    }, (config.flash_speed || 1.5) * 1000);

    flashTimeoutRef.current = flashInterval;
  };

  // Timer hook
  useEffect(() => {
    if (gameState === "playing") {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            finishGame(false); // Game failed due to timeout
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (flashTimeoutRef.current) clearInterval(flashTimeoutRef.current);
    };
  }, [gameState]);

  const handleItemClick = (itemId) => {
    if (isFlashing || gameState !== "playing") return;

    const nextIndex = userSequence.length;
    const expectedId = sequence[nextIndex];

    setMoves((prev) => prev + 1);

    if (itemId === expectedId) {
      const newSeq = [...userSequence, itemId];
      setUserSequence(newSeq);

      if (newSeq.length === sequence.length) {
        // Correct sequence completed!
        setScore(100);
        finishGame(true);
      } else {
        setMessage(`${getTranslation(lang, "keep_going")} (${newSeq.length}/${sequence.length}).`);
      }
    } else {
      // Wrong click
      setMessage(getTranslation(lang, "wrong_seq"));
      setUserSequence([]);
      // Flash again to help them
      triggerFlashSequence(sequence, items);
    }
  };

  const useHint = () => {
    if (isFlashing || gameState !== "playing") return;
    setHintsUsed((prev) => prev + 1);
    
    // Show next correct item index/name
    const nextIndex = userSequence.length;
    const nextCorrectId = sequence[nextIndex];
    const item = items.find((i) => i.id === nextCorrectId);
    
    setMessage(`${getTranslation(lang, "next_item_hint")}: ${item ? item.emoji : "?"}`);
  };

  const finishGame = async (success) => {
    setGameState(success ? "finished" : "failed");
    setMessage(success ? (locData?.feedback_message || getTranslation(lang, "great_job")) : getTranslation(lang, "try_again"));
    
    if (timerRef.current) clearInterval(timerRef.current);

    const totalTime = startTime ? (Date.now() - startTime) / 1000 : 0;
    
    // Calculate engagement
    const engagementScore = Math.min(100, Math.max(0, 100 - moves * 2 - hintsUsed * 5));

    // Submit performance
    try {
      const performanceData = {
        patient_id: patientId,
        game_id: 1, // Game 1
        score: success ? 100 : score,
        response_time: Number(totalTime.toFixed(2)),
        attempts: moves,
        correct_answers: userSequence.length,
        difficulty: String(levelConfig.level),
        engagement_score: Number(engagementScore.toFixed(2)),
        hints_used: hintsUsed,
        cognitive_support_level: supportLevel,
        previous_difficulty: String(levelConfig.level),
        predicted_difficulty: String(levelConfig.level),
        status: success ? "completed" : "failed"
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
          <div className="text-5xl mb-3">🥁</div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900">{locData?.title || "Remember the Sequence"}</h1>
          <p className="text-sm text-slate-500 mt-2 font-bold uppercase tracking-wider">
            {getTranslation(lang, "level")} {levelConfig.level} {supportLevel === "high" && `(${getTranslation(lang, "support_active")})`}
          </p>
        </div>

        {gameState === "intro" ? (
          <div className="text-center">
            <p className="text-lg text-slate-600 mb-6 leading-relaxed">{locData?.description}</p>
            <div className="bg-teal-50/50 border border-teal-150 rounded-2xl p-6 mb-6 text-left">
              <h2 className="text-lg font-bold text-teal-800 mb-2">🧠 {getTranslation(lang, "instructions")}:</h2>
              <p className="text-base text-slate-700 mb-3 leading-relaxed">{locData?.instructions}</p>
              <p className="text-sm font-semibold text-slate-500">Target length: {config?.sequence_length || 3} items</p>
            </div>
            
            {locData && (
              <VoiceButton 
                text={`${locData.title}. ${locData.description}. ${locData.instructions}`} 
                language={locData.language} 
                className="w-full mb-3" 
              />
            )}
            
            <button onClick={initializeGame} className="w-full py-4.5 rounded-2xl bg-teal-600 text-white text-lg font-bold hover:bg-teal-700 shadow-sm transition-all cursor-pointer">
              🎮 {locData?.start_button || getTranslation(lang, "start")}
            </button>
            <button onClick={onExit} className="w-full mt-3 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition-all cursor-pointer">
              {getTranslation(lang, "cancel")}
            </button>
          </div>
        ) : gameState === "playing" ? (
          <div>
            {/* Status indicators */}
            <div className="grid grid-cols-3 gap-3 mb-6">
              <div className="bg-slate-50 rounded-2xl p-3 text-center border border-slate-100">
                <p className="text-xs text-slate-400 font-bold uppercase">{getTranslation(lang, "time_left")}</p>
                <p className={`text-xl font-bold mt-1 ${timeLeft < 15 ? "text-rose-600 animate-pulse" : "text-slate-800"}`}>{timeLeft}s</p>
              </div>
              <div className="bg-slate-50 rounded-2xl p-3 text-center border border-slate-100">
                <p className="text-xs text-slate-400 font-bold uppercase">{getTranslation(lang, "clicks")}</p>
                <p className="text-xl font-bold text-slate-800 mt-1">{moves}</p>
              </div>
              <div className="bg-slate-50 rounded-2xl p-3 text-center border border-slate-100">
                <p className="text-xs text-slate-400 font-bold uppercase">{getTranslation(lang, "progress")}</p>
                <p className="text-xl font-bold text-slate-800 mt-1">{userSequence.length} / {config?.sequence_length || 3}</p>
              </div>
            </div>

            {/* Instruction Message */}
            <div className="bg-[#FAF8F5] border border-[#EBE7DF] rounded-2xl p-4 mb-6 text-center text-lg font-bold text-slate-700">
              {message}
            </div>

            {/* Flashing Display */}
            <div className="flex justify-center gap-4 mb-8 h-24 items-center bg-slate-50 rounded-2xl p-4 border border-slate-100">
              {isFlashing ? (
                flashingIndex !== -1 && (
                  <div className="text-6xl animate-bounce">
                    {items.find(i => i.id === sequence[flashingIndex])?.emoji}
                  </div>
                )
              ) : (
                <div className="text-lg text-slate-400 font-medium">{getTranslation(lang, "repeat_pattern")}</div>
              )}
            </div>

            {/* Choices Grid */}
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-4 mb-8 justify-center">
              {items.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleItemClick(item.id)}
                  disabled={isFlashing}
                  className={`aspect-square rounded-2xl border-2 flex flex-col items-center justify-center transition-all bg-[#FAF8F5] hover:bg-[#F3EFE9] border-[#EBE7DF] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  <span className="text-5xl">{item.emoji}</span>
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-3 mt-6">
              <button onClick={useHint} disabled={isFlashing} className="py-3.5 rounded-xl bg-amber-500 text-white text-base font-bold hover:bg-amber-600 disabled:opacity-50 transition-all cursor-pointer">
                💡 {getTranslation(lang, "hints")}
              </button>
              <button onClick={initializeGame} className="py-3.5 rounded-xl bg-teal-600 text-white text-base font-bold hover:bg-teal-700 transition-all cursor-pointer">
                🔄 {getTranslation(lang, "replay_flash")}
              </button>
            </div>
            
            <button onClick={onExit} className="w-full mt-4 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition-all cursor-pointer">
              {getTranslation(lang, "back")}
            </button>
          </div>
        ) : (
          /* Finished or Failed screen */
          <div className="text-center">
            <div className="text-6xl mb-4">{gameState === "finished" ? "🏆" : "🌱"}</div>
            <h2 className="text-3xl font-extrabold text-slate-800 mb-3">
              {gameState === "finished" ? getTranslation(lang, "great_job") : getTranslation(lang, "try_again")}
            </h2>
            <p className="text-lg text-slate-600 mb-8">{message}</p>

            <button onClick={initializeGame} className="w-full py-4 rounded-xl bg-teal-600 text-white text-lg font-bold hover:bg-teal-700 shadow-sm transition-all cursor-pointer">
              🔄 {getTranslation(lang, "play_again")}
            </button>
            <button onClick={onExit} className="w-full mt-3 py-3 rounded-xl bg-slate-150 hover:bg-slate-200 text-slate-750 font-bold transition-all cursor-pointer">
              {getTranslation(lang, "return_dashboard")}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
