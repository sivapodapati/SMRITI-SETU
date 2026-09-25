import React, { useEffect, useState, useRef } from "react";
import VoiceButton from "../components/VoiceButton";
import { getTranslation, getRegionalAssets } from "../utils/localizations";
import { offlineStore } from "../utils/offlineStore";

const BACKEND_URL = "http://127.0.0.1:8000";

// Regional landmark cards pool to integrate reference landmarks match concept
const LANDMARKS_POOL = [
  { id: "majuli", emoji: "🏝️", name: "Majuli Island", desc: "Assam River Island" },
  { id: "kaziranga", emoji: "🦏", name: "Kaziranga Park", desc: "Assam Rhino Sanctuary" },
  { id: "loktak", emoji: "🦌", name: "Loktak Lake", desc: "Manipur Floating Lake" },
  { id: "kangla", emoji: "🏰", name: "Kangla Fort", desc: "Manipur Royal Palace" },
  { id: "rootbridge", emoji: "🌉", name: "Root Bridges", desc: "Meghalaya Living Bridges" },
  { id: "mawlynnong", emoji: "🏡", name: "Mawlynnong", desc: "Cleanest Village" },
  { id: "reiek", emoji: "⛰️", name: "Reiek Peak", desc: "Mizoram Scenic Hills" },
  { id: "vantawng", emoji: "🌊", name: "Vantawng Falls", desc: "Mizoram Waterfall" }
];

export default function FamiliarPictureMatching({ patientId, patientInfo, levelConfig, supportLevel, locData, onExit }) {
  const lang = locData?.language || "English";
  const state = patientInfo?.state || "Default";
  const EMOJIS_POOL = getRegionalAssets(state, lang);
  
  // Resolve config from levelConfig
  const pairsCount = levelConfig?.pairs || 4;
  const timeLimit = levelConfig?.time_limit || 120;
  const cardShowTime = levelConfig?.card_show_time || 2.0;
  const useSimilar = levelConfig?.use_similar || false;
  const contentId = levelConfig?.content_id || "fallback";

  const [cards, setCards] = useState([]);
  const [flippedCards, setFlippedCards] = useState([]);
  const [matchedCards, setMatchedCards] = useState([]);
  const [moves, setMoves] = useState(0);
  const [score, setScore] = useState(0);
  const [isChecking, setIsChecking] = useState(false);
  const [startTime, setStartTime] = useState(null);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [message, setMessage] = useState("");
  const [gameState, setGameState] = useState("intro"); // intro, playing, finished, failed
  const [timeLeft, setTimeLeft] = useState(timeLimit);
  const [hintHighlit, setHintHighlit] = useState([]);

  const timerRef = useRef(null);

  const initializeGame = () => {
    // Select pairs from either Emojis Pool or Landmarks Pool depending on difficulty level
    let items = [];
    
    // Higher levels (>= 5) or similar-flagged levels use high quality landmarks matching!
    if (levelConfig.level >= 5 || useSimilar) {
      items = [...LANDMARKS_POOL].sort(() => Math.random() - 0.5).slice(0, pairsCount);
    } else {
      items = [...EMOJIS_POOL].sort(() => Math.random() - 0.5).slice(0, pairsCount);
    }

    // Duplicate and shuffle to create matching pairs
    const gridCards = [];
    items.forEach((item, index) => {
      gridCards.push({ ...item, uniqueId: `${item.id}_a_${index}` });
      gridCards.push({ ...item, uniqueId: `${item.id}_b_${index}` });
    });

    const shuffledCards = gridCards.sort(() => Math.random() - 0.5);

    setCards(shuffledCards);
    setFlippedCards([]);
    setMatchedCards([]);
    setMoves(0);
    setScore(0);
    setHintsUsed(0);
    setHintHighlit([]);
    setGameState("playing");
    setTimeLeft(timeLimit);
    setStartTime(Date.now());
    setMessage(getTranslation(lang, "watch_carefully"));

    // Elderly support feature: Peek on Start
    if (cardShowTime > 0) {
      // Show all cards initially
      const allIds = shuffledCards.map(c => c.uniqueId);
      setFlippedCards(allIds);
      setIsChecking(true);

      setTimeout(() => {
        setFlippedCards([]);
        setIsChecking(false);
        setMessage(getTranslation(lang, "repeat_pattern"));
      }, cardShowTime * 1000);
    } else {
      setMessage(getTranslation(lang, "repeat_pattern"));
    }
  };

  // Timer hook
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

  const handleCardClick = (card) => {
    if (isChecking || gameState !== "playing") return;
    if (flippedCards.includes(card.uniqueId) || matchedCards.includes(card.uniqueId)) return;

    const newFlipped = [...flippedCards, card.uniqueId];
    setFlippedCards(newFlipped);

    if (newFlipped.length === 2) {
      setMoves((prev) => prev + 1);
      setIsChecking(true);

      const firstCard = cards.find(c => c.uniqueId === newFlipped[0]);
      const secondCard = card;

      if (firstCard.id === secondCard.id) {
        // Match!
        const newMatched = [...matchedCards, newFlipped[0], newFlipped[1]];
        setMatchedCards(newMatched);
        setFlippedCards([]);
        setIsChecking(false);
        setMessage(getTranslation(lang, "correct_match"));

        // Check if finished
        if (newMatched.length === cards.length) {
          setScore(100);
          finishGame(true);
        }
      } else {
        // No match
        setMessage(getTranslation(lang, "wrong_match"));
        setTimeout(() => {
          setFlippedCards([]);
          setIsChecking(false);
        }, 1000);
      }
    }
  };

  const useHint = () => {
    if (gameState !== "playing" || isChecking) return;
    setHintsUsed((prev) => prev + 1);

    // Find first unmatched card
    const unmatched = cards.filter(c => !matchedCards.includes(c.uniqueId));
    if (unmatched.length < 2) return;

    // Pick one unmatched card, and highlight its pair partner
    const target = unmatched[0];
    const partner = unmatched.find(c => c.id === target.id && c.uniqueId !== target.uniqueId);

    if (target && partner) {
      setHintHighlit([target.uniqueId, partner.uniqueId]);
      setTimeout(() => {
        setHintHighlit([]);
      }, 2000);
    }
  };

  const finishGame = async (success) => {
    setGameState(success ? "finished" : "failed");
    setMessage(success ? (locData?.feedback_message || getTranslation(lang, "great_job")) : getTranslation(lang, "try_again"));
    
    if (timerRef.current) clearInterval(timerRef.current);

    const totalTime = startTime ? (Date.now() - startTime) / 1000 : 0;
    const engagementScore = Math.min(100, Math.max(0, 100 - moves * 2 - hintsUsed * 5));

    try {
      const performanceData = {
        patient_id: patientId,
        game_id: 2, // Game 2
        score: success ? 100 : score,
        response_time: Number(totalTime.toFixed(2)),
        attempts: moves,
        correct_answers: matchedCards.length,
        difficulty: String(levelConfig.level),
        engagement_score: Number(engagementScore.toFixed(2)),
        hints_used: hintsUsed,
        cognitive_support_level: supportLevel,
        previous_difficulty: String(levelConfig.level),
        predicted_difficulty: String(levelConfig.level),
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
          <div className="text-5xl mb-3">🖼️</div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900">{locData?.title || "Familiar Landmark & Picture Match"}</h1>
          <p className="text-sm text-slate-500 mt-2 font-bold uppercase tracking-wider">
            {getTranslation(lang, "level")} {levelConfig.level} {supportLevel === "high" && `(${getTranslation(lang, "support_active")})`}
          </p>
        </div>

        {gameState === "intro" ? (
          <div className="text-center">
            <p className="text-lg text-slate-600 mb-6 leading-relaxed">
              Match identical regional cards or North Eastern landmarks. Memorize the layout during the preview!
            </p>
            <div className="bg-teal-50/50 border border-teal-150 rounded-2xl p-6 mb-6 text-left">
              <h2 className="text-lg font-bold text-teal-800 mb-2">🧠 Instructions:</h2>
              <p className="text-base text-slate-700 mb-3 leading-relaxed">
                Click a card to flip it, then find its match. Complete all pairs before the timer runs out.
              </p>
              <p className="text-sm font-semibold text-slate-500">Pairs to find: {pairsCount}</p>
            </div>
            
            <VoiceButton 
              text={`Match landmarks and pictures. Click the start button below.`} 
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
                <p className="text-xl font-bold text-slate-800 mt-1">{matchedCards.length / 2} / {pairsCount}</p>
              </div>
            </div>

            {/* Instruction Message */}
            <div className="bg-[#FAF8F5] border border-[#EBE7DF] rounded-2xl p-4 mb-6 text-center text-lg font-bold text-slate-700">
              {message}
            </div>

            {/* Cards Grid */}
            <div className={`grid gap-4 mb-8 justify-center ${pairsCount <= 4 ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-3 sm:grid-cols-4"}`}>
              {cards.map((card) => {
                const isFlipped = flippedCards.includes(card.uniqueId);
                const isMatched = matchedCards.includes(card.uniqueId);
                const isHinted = hintHighlit.includes(card.uniqueId);
                const show = isFlipped || isMatched;

                return (
                  <button
                    key={card.uniqueId}
                    onClick={() => handleCardClick(card)}
                    disabled={isChecking || isMatched || isFlipped}
                    className={`aspect-square rounded-2xl border-2 flex flex-col items-center justify-center p-2 transition-all select-none ${
                      isMatched
                        ? "bg-emerald-50 border-emerald-350"
                        : show
                        ? "bg-teal-50 border-teal-350 scale-105"
                        : isHinted
                        ? "bg-amber-50 border-amber-350 animate-pulse scale-105"
                        : "bg-[#FAF8F5] border-[#EBE7DF] hover:bg-[#F3EFE9] hover:scale-105 cursor-pointer"
                    }`}
                  >
                    {show ? (
                      <>
                        <span className="text-4xl mb-1">{card.emoji}</span>
                        {card.name && (
                          <span className="text-[10px] sm:text-xs font-bold text-slate-800 text-center leading-tight">
                            {card.name}
                          </span>
                        )}
                      </>
                    ) : (
                      <span className="text-3xl font-black text-slate-400">❓</span>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="grid grid-cols-2 gap-3 mt-6">
              <button onClick={useHint} className="py-3.5 rounded-xl bg-amber-500 text-white text-base font-bold hover:bg-amber-600 transition-all cursor-pointer">
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