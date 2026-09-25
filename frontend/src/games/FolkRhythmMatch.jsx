import React, { useState, useEffect, useRef } from "react";
import VoiceButton from "../components/VoiceButton";
import { getTranslation } from "../utils/localizations";
import { offlineStore } from "../utils/offlineStore";

const BACKEND_URL = "http://127.0.0.1:8000";

const INSTRUMENTS = [
  { id: "pepa", name: "Pepa (Assam Buffalo Horn)", emoji: "📯", color: "bg-amber-100 hover:bg-amber-200 border-amber-400 text-amber-900" },
  { id: "dhol", name: "Dhol (Bihu Drum)", emoji: "🥁", color: "bg-orange-100 hover:bg-orange-200 border-orange-400 text-orange-900" },
  { id: "gogona", name: "Gogona (Bamboo Harp)", emoji: "🎋", color: "bg-emerald-100 hover:bg-emerald-200 border-emerald-400 text-emerald-900" },
  { id: "flute", name: "Bamboo Flute", emoji: "🪈", color: "bg-sky-100 hover:bg-sky-200 border-sky-400 text-sky-900" }
];

// Web Audio API Synthesizers for Traditional North Eastern Instruments
function playInstrumentSound(instrumentId) {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();

    if (instrumentId === 'pepa') {
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();

      osc1.type = 'sawtooth';
      osc2.type = 'sawtooth';
      osc1.frequency.setValueAtTime(220, ctx.currentTime);
      osc2.frequency.setValueAtTime(440, ctx.currentTime);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1200, ctx.currentTime);
      filter.Q.setValueAtTime(8, ctx.currentTime);

      gain.gain.setValueAtTime(0.4, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 1.2);

      osc1.connect(filter);
      osc2.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc1.start();
      osc2.start();
      osc1.stop(ctx.currentTime + 1.2);
      osc2.stop(ctx.currentTime + 1.2);

    } else if (instrumentId === 'dhol') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(180, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(30, ctx.currentTime + 0.5);

      gain.gain.setValueAtTime(0.8, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.5);

    } else if (instrumentId === 'gogona') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(330, ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(110, ctx.currentTime + 0.4);

      gain.gain.setValueAtTime(0.5, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.4);

    } else if (instrumentId === 'flute') {
      const osc = ctx.createOscillator();
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, ctx.currentTime);

      lfo.frequency.setValueAtTime(5, ctx.currentTime);
      lfoGain.gain.setValueAtTime(10, ctx.currentTime);

      lfo.connect(osc.frequency);

      gain.gain.setValueAtTime(0.01, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.4, ctx.currentTime + 0.1);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 1.0);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      lfo.start();
      osc.stop(ctx.currentTime + 1.0);
      lfo.stop(ctx.currentTime + 1.0);
    }
  } catch (e) {
    console.error("Synthesizer error:", e);
  }
}

export default function FolkRhythmMatch({ patientId, patientInfo, levelConfig, supportLevel, locData, onExit }) {
  const lang = locData?.language || "English";
  const state = patientInfo?.state || "Default";
  
  // Game parameters from levelConfig
  const level = levelConfig?.level || 1;
  const contentId = levelConfig?.content_id || "fallback_rhythm";
  const sequenceLength = levelConfig?.sequence_length || 3;
  const choicesCount = levelConfig?.choices_count || 4;
  const timeLimit = levelConfig?.time_limit || 90;

  const [sequence, setSequence] = useState([]);
  const [userSequence, setUserSequence] = useState([]);
  const [activePlaybackIndex, setActivePlaybackIndex] = useState(-1);
  const [isPlayingSeq, setIsPlayingSeq] = useState(false);
  const [moves, setMoves] = useState(0);
  const [errors, setErrors] = useState(0);
  const [gameState, setGameState] = useState("intro"); // intro, playing, finished, failed
  const [timeLeft, setTimeLeft] = useState(timeLimit);
  const [startTime, setStartTime] = useState(null);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [activeHint, setActiveHint] = useState(-1);

  const timerRef = useRef(null);

  const initializeGame = () => {
    // Generate random sequence of instrument IDs
    const seq = [];
    const pool = INSTRUMENTS.slice(0, choicesCount);
    for (let i = 0; i < sequenceLength; i++) {
      const item = pool[Math.floor(Math.random() * pool.length)];
      seq.push(item.id);
    }

    setSequence(seq);
    setUserSequence([]);
    setMoves(0);
    setErrors(0);
    setHintsUsed(0);
    setGameState("playing");
    setTimeLeft(timeLimit);
    setStartTime(Date.now());

    // Play sequence for the user to hear
    playSequence(seq);
  };

  const playSequence = (seqToPlay) => {
    setIsPlayingSeq(true);
    setActivePlaybackIndex(-1);

    let idx = 0;
    const interval = setInterval(() => {
      if (idx < seqToPlay.length) {
        const instId = seqToPlay[idx];
        setActivePlaybackIndex(idx);
        playInstrumentSound(instId);
        idx++;
      } else {
        clearInterval(interval);
        setActivePlaybackIndex(-1);
        setIsPlayingSeq(false);
      }
    }, 1200);
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

  const handleInstrumentClick = (instrumentId) => {
    if (isPlayingSeq || gameState !== "playing") return;

    // Play clicked sound
    playInstrumentSound(instrumentId);

    // Evaluate step
    const nextExpectedIndex = userSequence.length;
    const expectedId = sequence[nextExpectedIndex];

    setMoves((prev) => prev + 1);

    if (instrumentId === expectedId) {
      const newSeq = [...userSequence, instrumentId];
      setUserSequence(newSeq);

      if (newSeq.length === sequence.length) {
        finishGame(true);
      }
    } else {
      // Mistake!
      setErrors((prev) => prev + 1);
      setUserSequence([]); // reset current entry
      alert("Wrong pattern sound! Let's listen to the sequence again.");
      playSequence(sequence);
    }
  };

  const useHint = () => {
    if (gameState !== "playing" || isPlayingSeq) return;
    setHintsUsed((prev) => prev + 1);

    // Replay the sequence once
    playSequence(sequence);
  };

  const finishGame = async (success) => {
    setGameState(success ? "finished" : "failed");
    if (timerRef.current) clearInterval(timerRef.current);

    const totalTime = startTime ? (Date.now() - startTime) / 1000 : 0;
    const engagementScore = Math.min(100, Math.max(0, 100 - errors * 10 - hintsUsed * 5));

    try {
      const performanceData = {
        patient_id: patientId,
        game_id: 4, // Game 4
        score: success ? 100 : Math.round((userSequence.length / sequence.length) * 100),
        response_time: Number(totalTime.toFixed(2)),
        attempts: moves,
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
          <div className="text-5xl mb-3">🎵</div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900">Folk Rhythm Match</h1>
          <p className="text-sm text-slate-500 mt-2 font-bold uppercase tracking-wider">
            {getTranslation(lang, "level")} {level} {supportLevel === "high" && `(${getTranslation(lang, "support_active")})`}
          </p>
        </div>

        {gameState === "intro" ? (
          <div className="text-center">
            <p className="text-lg text-slate-600 mb-6 leading-relaxed">
              Listen to the traditional musical instrument sounds and click them in the exact order you heard!
            </p>
            <div className="bg-teal-50/50 border border-teal-150 rounded-2xl p-6 mb-6 text-left">
              <h2 className="text-lg font-bold text-teal-800 mb-2">🥁 Instructions:</h2>
              <p className="text-base text-slate-700 leading-relaxed">
                Watch the instrument panels flash, listen to the tones, and repeat the pattern.
              </p>
            </div>
            
            <VoiceButton 
              text={`Listen to the instrument pattern and repeat. Click start to begin.`} 
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
                <p className="text-xs text-slate-400 font-bold uppercase">Progress</p>
                <p className="text-lg font-bold text-slate-800">{userSequence.length} / {sequence.length}</p>
              </div>
            </div>

            {/* Playback status */}
            <div className={`border rounded-2xl p-4 mb-6 text-center text-lg font-bold ${
              isPlayingSeq ? "bg-amber-50 border-amber-300 text-amber-800 animate-pulse" : "bg-teal-50 border-teal-300 text-teal-800"
            }`}>
              {isPlayingSeq ? "🔊 LISTENING TO RHYTHM..." : "🎮 YOUR TURN — REPEAT PATTERN!"}
            </div>

            {/* Visual Flashing representation */}
            <div className="flex justify-center gap-3 mb-8">
              {sequence.map((_, idx) => (
                <div
                  key={idx}
                  className={`w-6 h-6 rounded-full border transition-all ${
                    idx < userSequence.length
                      ? "bg-teal-500 border-teal-600 scale-105"
                      : idx === activePlaybackIndex
                      ? "bg-amber-500 border-amber-600 scale-110 animate-ping"
                      : "bg-slate-100 border-slate-300"
                  }`}
                />
              ))}
            </div>

            {/* Instrument Buttons grid */}
            <div className="grid grid-cols-2 gap-4 mb-8">
              {INSTRUMENTS.slice(0, choicesCount).map((inst) => {
                const isFlashed = isPlayingSeq && sequence[activePlaybackIndex] === inst.id;

                return (
                  <button
                    key={inst.id}
                    onClick={() => handleInstrumentClick(inst.id)}
                    disabled={isPlayingSeq}
                    className={`h-40 rounded-3xl border-2 flex flex-col items-center justify-center p-4 transition-all shadow-sm select-none ${
                      isFlashed
                        ? "bg-amber-300 border-amber-500 scale-105 ring-4 ring-amber-300 text-amber-950"
                        : inst.color
                    } ${isPlayingSeq ? "cursor-default opacity-80" : "active:scale-95 cursor-pointer"}`}
                  >
                    <span className="text-5xl mb-2">{inst.emoji}</span>
                    <span className="text-sm font-extrabold text-center leading-tight">{inst.name}</span>
                  </button>
                );
              })}
            </div>

            <div className="grid grid-cols-2 gap-3 mt-6">
              <button 
                onClick={useHint} 
                disabled={isPlayingSeq}
                className="py-3.5 rounded-xl bg-amber-500 text-white text-base font-bold hover:bg-amber-600 disabled:bg-slate-300 transition-all cursor-pointer"
              >
                🔊 Listen Again
              </button>
              <button 
                onClick={onExit} 
                className="py-3.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition-all cursor-pointer"
              >
                Exit Game
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center">
            <div className="text-6xl mb-4">{gameState === "finished" ? "🏆" : "🌱"}</div>
            <h2 className="text-3xl font-extrabold text-slate-800 mb-3">
              {gameState === "finished" ? "Wonderful Rhythm Match!" : "Pattern Missed"}
            </h2>
            <p className="text-lg text-slate-600 mb-8">
              {gameState === "finished" ? "You replicated the folk instrument rhythm pattern flawlessly!" : "Let's listen and try matching the drumbeat again."}
            </p>

            <button onClick={initializeGame} className="w-full py-4 rounded-xl bg-teal-600 text-white text-lg font-bold hover:bg-teal-700 shadow-sm transition-all cursor-pointer">
              🔄 Play Again
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
