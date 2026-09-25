import { useEffect, useState } from "react";
import RememberSequence from "./games/RememberSequence";
import FamiliarPictureMatching from "./games/FamiliarPictureMatching";
import RecipeSequencer from "./games/RecipeSequencer";
import FolkRhythmMatch from "./games/FolkRhythmMatch";
import MoodMemoryStories from "./games/MoodMemoryStories";
import FamilyMemberRecognition from "./games/FamilyMemberRecognition";
import CaregiverDashboard from "./pages/CaregiverDashboard";
import DoctorDashboard from "./pages/DoctorDashboard";
import Login from "./components/Login";
import VoiceButton from "./components/VoiceButton";
import AlarmOverlayModal from "./components/reminders/AlarmOverlayModal";
import PatientProfileModal from "./components/PatientProfileModal";
import { offlineStore } from "./utils/offlineStore";
import { getTranslation } from "./utils/localizations";
import { parseVoiceCommand } from "./utils/voiceCommands";

const BACKEND_URL = "http://127.0.0.1:8000";

const GAME_TYPES = {
  1: "sequence_recall",
  2: "memory_recall",
  3: "object_recognition",
  4: "attention_concentration",
  5: "emotional_engagement",
  6: "family_recognition"
};

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [patientLanguage, setPatientLanguage] = useState("English");
  const [view, setView] = useState("login_selection"); // login_selection, dashboard, game, caregiver, doctor
  const [patientId, setPatientId] = useState(null);
  const [patientInfo, setPatientInfo] = useState(null);
  const [activeGameId, setActiveGameId] = useState(null);
  const [levelConfig, setLevelConfig] = useState(null);
  const [supportLevel, setSupportLevel] = useState("medium");
  const [dueReminder, setDueReminder] = useState(null);
  const [voiceListening, setVoiceListening] = useState(false);
  const [voiceText, setVoiceText] = useState("");

  const [locData, setLocData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [gameLevelsMap, setGameLevelsMap] = useState({});
  const [recommendedGame, setRecommendedGame] = useState(null);
  const [todayStory, setTodayStory] = useState(null);
  const [todayProgress, setTodayProgress] = useState({
    progress_percent: 0,
    activities_completed: 0,
    target_activities: 3,
    games_completed: 0,
    stories_completed: 0,
    reminders_completed: 0,
    total_reminders: 0
  });
  const [personalPerformance, setPersonalPerformance] = useState({
    current_level: 1,
    total_games_played: 0,
    average_accuracy: 100.0,
    recent_status: "Good",
    practiced_domains: ["Working Memory", "Visual Attention", "Procedural Recall", "Auditory Memory", "Episodic Recall"]
  });
  const [reminders, setReminders] = useState([]);
  const [dashboardNotifications, setDashboardNotifications] = useState([]);
  const [gameLocalizations, setGameLocalizations] = useState({});
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatusMsg, setSyncStatusMsg] = useState("");

  // Online/Offline listener
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      if (currentUser && userRole === "patient" && patientId) {
        triggerSync(patientId);
      }
    };
    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [currentUser, userRole, patientId]);

  const triggerSync = async (pId) => {
    if (!pId) return;
    setIsSyncing(true);
    setSyncStatusMsg("Syncing data...");
    try {
      const result = await offlineStore.sync(pId);
      if (result.synced > 0) {
        setSyncStatusMsg(`Successfully synchronized ${result.synced} items!`);
        setTimeout(() => setSyncStatusMsg(""), 4000);
        reloadDashboard();
      } else {
        setSyncStatusMsg("");
      }
    } catch (e) {
      console.error(e);
      setSyncStatusMsg("Sync failed. Will retry later.");
      setTimeout(() => setSyncStatusMsg(""), 4000);
    } finally {
      setIsSyncing(false);
    }
  };

  // Background reminder checks loop
  useEffect(() => {
    if (!currentUser || userRole !== "patient" || reminders.length === 0) return;

    const interval = setInterval(() => {
      const now = new Date();
      const curHourMin = now.toTimeString().slice(0, 5); // e.g. "08:30"

      const activeDue = reminders.find(r => {
        return r.active && !r.completed && r.scheduled_time === curHourMin;
      });

      if (activeDue) {
        setDueReminder(activeDue);
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [currentUser, userRole, reminders]);

  // Load Individual Patient Dashboard
  const loadPersonalDashboard = async (pId) => {
    if (!pId) return;
    setLoading(true);
    setError("");
    try {
      if (navigator.onLine) {
        const res = await fetch(`${BACKEND_URL}/patients/me/dashboard?patient_id=${pId}`);
        if (res.ok) {
          const data = await res.json();
          setPatientInfo(data.patient);
          setPatientLanguage(data.patient.language || "English");
          if (data.today_progress) setTodayProgress(data.today_progress);
          if (data.todays_activity) setRecommendedGame(data.todays_activity);
          if (data.todays_story) setTodayStory(data.todays_story);
          if (data.reminders) setReminders(data.reminders);
          if (data.personal_performance) setPersonalPerformance(data.personal_performance);
          if (data.notifications) setDashboardNotifications(data.notifications);

          offlineStore.save(pId, "dashboard_data", data);
          offlineStore.save(pId, "profile", data.patient);
          offlineStore.save(pId, "reminders", data.reminders || []);
          return;
        }
      }
    } catch (e) {
      console.error("Failed to load personal dashboard from server:", e);
    } finally {
      setLoading(false);
    }

    // Offline cache fallback
    const cached = offlineStore.get(pId, "dashboard_data");
    if (cached) {
      setPatientInfo(cached.patient);
      setPatientLanguage(cached.patient?.language || "English");
      if (cached.today_progress) setTodayProgress(cached.today_progress);
      if (cached.todays_activity) setRecommendedGame(cached.todays_activity);
      if (cached.todays_story) setTodayStory(cached.todays_story);
      if (cached.reminders) setReminders(cached.reminders);
      if (cached.personal_performance) setPersonalPerformance(cached.personal_performance);
      if (cached.notifications) setDashboardNotifications(cached.notifications);
    }
  };

  // Load patient current difficulty level for each of the 6 games
  const loadPatientGameLevels = async (pId) => {
    if (!pId) return;
    const levelsMap = {};
    let fallback = false;
    for (let gId = 1; gId <= 6; gId++) {
      try {
        if (navigator.onLine) {
          const res = await fetch(`${BACKEND_URL}/adaptive/patient/${pId}/game/${gId}`);
          if (res.ok) {
            const data = await res.json();
            levelsMap[gId] = data.next_level;
            continue;
          }
        }
      } catch (e) {}
      fallback = true;
    }

    if (!fallback) {
      setGameLevelsMap(levelsMap);
      offlineStore.save(pId, "game_levels_map", levelsMap);
    } else {
      const cached = offlineStore.get(pId, "game_levels_map");
      if (cached) {
        setGameLevelsMap(cached);
      } else {
        setGameLevelsMap({ 1: 1, 2: 1, 3: 1, 4: 1, 5: 1, 6: 1 });
      }
    }
  };

  const loadAllGameLocalizations = async (pId) => {
    if (!pId) return;
    const locMap = {};
    let fallback = false;
    for (let gId = 1; gId <= 6; gId++) {
      try {
        if (navigator.onLine) {
          const res = await fetch(`${BACKEND_URL}/localizations/patient/${pId}/game/${gId}`);
          if (res.ok) {
            const data = await res.json();
            locMap[gId] = data;
            continue;
          }
        }
      } catch (e) {}
      fallback = true;
    }

    if (!fallback) {
      setGameLocalizations(locMap);
      offlineStore.save(pId, "game_localizations_map", locMap);
    } else {
      const cached = offlineStore.get(pId, "game_localizations_map");
      if (cached) {
        setGameLocalizations(cached);
      } else {
        setGameLocalizations({});
      }
    }
  };

  const reloadDashboard = () => {
    if (patientId) {
      loadPersonalDashboard(patientId);
      loadPatientGameLevels(patientId);
      loadAllGameLocalizations(patientId);
    }
  };

  useEffect(() => {
    if (userRole === "patient" && patientId) {
      loadPersonalDashboard(patientId);
      loadPatientGameLevels(patientId);
      loadAllGameLocalizations(patientId);
    }
  }, [patientId, userRole]);

  const handleToggleReminder = async (remId, currentCompleted) => {
    const nextCompleted = !currentCompleted;
    setReminders(prev => prev.map(r => r.id === remId ? { ...r, completed: nextCompleted } : r));

    if (navigator.onLine) {
      try {
        const res = await fetch(`${BACKEND_URL}/reminders/${remId}/complete?completed=${nextCompleted}`, {
          method: "PUT"
        });
        if (res.ok) {
          loadPersonalDashboard(patientId);
        }
      } catch (e) {
        console.error(e);
        offlineStore.queueReminderUpdate(patientId, remId, nextCompleted);
      }
    } else {
      offlineStore.queueReminderUpdate(patientId, remId, nextCompleted);
    }
  };

  const handleCompleteReminderAlarm = (reminder) => {
    handleToggleReminder(reminder.id, false);
    setDueReminder(null);
  };

  const handleSnoozeReminder = (reminder) => {
    const [h, m] = reminder.scheduled_time.split(":").map(Number);
    let nextM = m + 10;
    let nextH = h;
    if (nextM >= 60) {
      nextM -= 60;
      nextH = (nextH + 1) % 24;
    }
    const nextTimeStr = `${String(nextH).padStart(2, "0")}:${String(nextM).padStart(2, "0")}`;
    setReminders(prev => prev.map(r => r.id === reminder.id ? { ...r, scheduled_time: nextTimeStr } : r));
    setDueReminder(null);
  };

  const handleLoginSuccess = (userData, selectedRole, selectedLang) => {
    // Purge previous session caches to ensure strict cross-patient isolation
    offlineStore.clearAllPatientSessions();

    setCurrentUser(userData);
    setUserRole(selectedRole);
    if (selectedRole === "patient") {
      const targetPId = userData.patient_id || userData.id;
      setPatientId(targetPId);
      setPatientLanguage(userData.language || selectedLang || "English");
      setView("dashboard");
      loadPersonalDashboard(targetPId);
      loadPatientGameLevels(targetPId);
      loadAllGameLocalizations(targetPId);
    } else if (selectedRole === "caregiver") {
      setView("caregiver");
    } else if (selectedRole === "doctor") {
      setView("doctor");
    }
  };

  const handleLogout = () => {
    // Purge offline storage and reset all state cleanly
    offlineStore.clearAllPatientSessions();
    setCurrentUser(null);
    setUserRole(null);
    setPatientId(null);
    setPatientInfo(null);
    setTodayStory(null);
    setRecommendedGame(null);
    setTodayProgress({
      progress_percent: 0,
      activities_completed: 0,
      target_activities: 3,
      games_completed: 0,
      stories_completed: 0,
      reminders_completed: 0,
      total_reminders: 0
    });
    setPersonalPerformance({
      current_level: 1,
      total_games_played: 0,
      average_accuracy: 100.0,
      recent_status: "Good",
      practiced_domains: ["Working Memory", "Visual Attention", "Procedural Recall", "Auditory Memory", "Episodic Recall"]
    });
    setReminders([]);
    setDashboardNotifications([]);
    setGameLevelsMap({});
    setGameLocalizations({});
    setView("login_selection");
  };

  const handleToggleVoiceControl = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Browser speech recognition is not supported in this browser. Please use Chrome, Edge, or Safari.");
      return;
    }

    if (voiceListening) {
      setVoiceListening(false);
      return;
    }

    setVoiceListening(true);
    setVoiceText("Listening for navigation commands...");

    const recognition = new SpeechRecognition();
    recognition.lang = patientLanguage === "Assamese" ? "as-IN" : (patientLanguage === "Hindi" ? "hi-IN" : "en-US");
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setVoiceText(`Command: "${transcript}"`);
      
      const intent = parseVoiceCommand(transcript, patientLanguage);
      if (intent) {
        setVoiceText(`Command matched: "${intent.toUpperCase()}"!`);
        setTimeout(() => {
          executeVoiceIntent(intent);
          setVoiceListening(false);
          setVoiceText("");
        }, 1500);
      } else {
        setVoiceText(`No match for: "${transcript}"`);
        setTimeout(() => {
          setVoiceListening(false);
          setVoiceText("");
        }, 2000);
      }
    };

    recognition.onerror = (e) => {
      console.error(e);
      setVoiceListening(false);
      setVoiceText("");
    };

    recognition.onend = () => {
      setVoiceListening(false);
    };

    recognition.start();
  };

  const executeVoiceIntent = (intent) => {
    switch (intent) {
      case "dashboard":
        setView("dashboard");
        break;
      case "play":
        if (recommendedGame) {
          handleLaunchGame(recommendedGame.recommended_game_id || 1);
        } else {
          handleLaunchGame(1);
        }
        break;
      case "lang_as":
        setPatientLanguage("Assamese");
        break;
      case "lang_hi":
        setPatientLanguage("Hindi");
        break;
      case "lang_en":
        setPatientLanguage("English");
        break;
      case "back":
        if (view === "game") setView("dashboard");
        break;
      default:
        break;
    }
  };

  const handleLaunchGame = async (gameId) => {
    setLoading(true);
    setError("");
    setActiveGameId(gameId);

    try {
      if (navigator.onLine) {
        const adaptRes = await fetch(`${BACKEND_URL}/adaptive/patient/${patientId}/game/${gameId}`);
        if (!adaptRes.ok) throw new Error("Failed to load difficulty adaptations from AI engine.");
        const adaptData = await adaptRes.json();
        
        const contentRes = await fetch(`${BACKEND_URL}/games/${gameId}/content?patient_id=${patientId}&level=${adaptData.next_level}`);
        if (!contentRes.ok) throw new Error(`Failed to load personalized content for level ${adaptData.next_level}.`);
        const contentData = await contentRes.json();

        const locRes = await fetch(`${BACKEND_URL}/localizations/patient/${patientId}/game/${gameId}`);
        if (!locRes.ok) throw new Error("Failed to load localization texts for this game.");
        const locDataJson = await locRes.json();

        offlineStore.save(patientId, `adapt_${gameId}`, adaptData);
        offlineStore.save(patientId, `game_content_${gameId}_${adaptData.next_level}`, contentData);
        offlineStore.save(patientId, `localization_${gameId}`, locDataJson);

        setLevelConfig({
          level: adaptData.next_level,
          content_id: contentData.content_id,
          title: contentData.title,
          ...contentData.data
        });
        setSupportLevel(adaptData.support_level);
        setLocData(locDataJson);
        setView("game");
      } else {
        const adaptData = offlineStore.get(patientId, `adapt_${gameId}`);
        if (!adaptData) throw new Error("This game hasn't been cached yet. Please connect to the internet first.");

        const contentData = offlineStore.get(patientId, `game_content_${gameId}_${adaptData.next_level}`);
        if (!contentData) throw new Error(`Cached content for Level ${adaptData.next_level} is missing.`);

        const locDataJson = offlineStore.get(patientId, `localization_${gameId}`);
        if (!locDataJson) throw new Error("Cached localizations are missing.");

        setLevelConfig({
          level: adaptData.next_level,
          content_id: contentData.content_id,
          title: contentData.title,
          ...contentData.data
        });
        setSupportLevel(adaptData.support_level);
        setLocData(locDataJson);
        setView("game");
      }
    } catch (e) {
      console.error(e);
      setError(e.message || "Something went wrong launching the game.");
    } finally {
      setLoading(false);
    }
  };

  const handleExitGame = () => {
    setView("dashboard");
    setActiveGameId(null);
    setLevelConfig(null);
    reloadDashboard();
  };

  // Time-of-day Greeting Helper
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) {
      return getTranslation(patientLanguage, "good_morning") || "Good Morning";
    } else if (hour >= 12 && hour < 17) {
      return getTranslation(patientLanguage, "good_afternoon") || "Good Afternoon";
    } else {
      return getTranslation(patientLanguage, "good_evening") || "Good Evening";
    }
  };

  // State Cultural Banner Helper for Story Card
  const getCulturalBadge = (state) => {
    switch (state) {
      case "Assam":
        return { icon: "👒 🍵 🦏", tag: "Assam Tea & Heritage", bg: "bg-teal-50 border-teal-200 text-teal-800" };
      case "Manipur":
        return { icon: "🌸 🦌 🚣", tag: "Manipur Loktak & Sangai", bg: "bg-emerald-50 border-emerald-200 text-emerald-800" };
      case "Meghalaya":
        return { icon: "🌉 🌧️ 🧺", tag: "Meghalaya Living Root Bridge", bg: "bg-sky-50 border-sky-200 text-sky-800" };
      case "Mizoram":
        return { icon: "🎋 🧣 🥁", tag: "Mizoram Cheraw Bamboo Dance", bg: "bg-amber-50 border-amber-200 text-amber-800" };
      case "Tripura":
        return { icon: "🍍 🛕 🌾", tag: "Tripura Heritage & Culture", bg: "bg-rose-50 border-rose-200 text-rose-800" };
      case "Sikkim":
        return { icon: "🐼 🏔️ 🌺", tag: "Sikkim Kanchenjunga & Red Panda", bg: "bg-indigo-50 border-indigo-200 text-indigo-800" };
      default:
        return { icon: "📖 🌟 🏡", tag: "Cultural Memory Story", bg: "bg-slate-50 border-slate-200 text-slate-800" };
    }
  };

  // Render Role Views
  if (view === "login_selection") {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  if (view === "game") {
    return (
      <div className="min-h-screen bg-[#FDFBF7] flex flex-col font-sans select-none">
        <div className="bg-white border-b border-[#EBE7DF] py-3.5 px-6 flex justify-between items-center shadow-sm">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🧠</span>
            <div>
              <h2 className="font-extrabold text-lg text-slate-800">
                {gameLocalizations[activeGameId]?.title || `Activity #${activeGameId}`}
              </h2>
              <span className="text-xs font-bold text-teal-700 bg-teal-50 border border-teal-200/60 px-2.5 py-0.5 rounded-full">
                {getTranslation(patientLanguage, "level")} {levelConfig?.level || 1} • {patientLanguage}
              </span>
            </div>
          </div>

          <button
            onClick={handleExitGame}
            className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold px-5 py-2 rounded-xl text-sm transition-all active:scale-95 border border-[#EBE7DF] cursor-pointer"
          >
            ← {getTranslation(patientLanguage, "return_dashboard")}
          </button>
        </div>

        <div className="flex-1 flex flex-col justify-center items-center p-4">
          {activeGameId === 1 && (
            <RememberSequence
              patientId={patientId}
              patientInfo={patientInfo}
              levelConfig={levelConfig}
              supportLevel={supportLevel}
              locData={locData}
              onExit={handleExitGame}
            />
          )}

          {activeGameId === 2 && (
            <FamiliarPictureMatching
              patientId={patientId}
              patientInfo={patientInfo}
              levelConfig={levelConfig}
              supportLevel={supportLevel}
              locData={locData}
              onExit={handleExitGame}
            />
          )}

          {activeGameId === 3 && (
            <RecipeSequencer
              patientId={patientId}
              patientInfo={patientInfo}
              levelConfig={levelConfig}
              supportLevel={supportLevel}
              locData={locData}
              onExit={handleExitGame}
            />
          )}

          {activeGameId === 4 && (
            <FolkRhythmMatch
              patientId={patientId}
              patientInfo={patientInfo}
              levelConfig={levelConfig}
              supportLevel={supportLevel}
              locData={locData}
              onExit={handleExitGame}
            />
          )}

          {activeGameId === 5 && (
            <MoodMemoryStories
              patientId={patientId}
              patientInfo={patientInfo}
              levelConfig={levelConfig}
              supportLevel={supportLevel}
              locData={locData}
              onExit={handleExitGame}
            />
          )}

          {activeGameId === 6 && (
            <FamilyMemberRecognition
              patientId={patientId}
              patientInfo={patientInfo}
              levelConfig={levelConfig}
              supportLevel={supportLevel}
              locData={locData}
              onExit={handleExitGame}
            />
          )}
        </div>
      </div>
    );
  }

  if (view === "doctor") {
    if (userRole !== "doctor") {
      return (
        <div className="min-h-screen bg-rose-50 flex flex-col justify-center items-center p-6 text-center">
          <h2 className="text-3xl font-black text-rose-800">⚠️ Access Denied</h2>
          <p className="text-slate-600 mt-2">You do not have clinician privileges.</p>
          <button onClick={handleLogout} className="mt-6 bg-slate-800 text-white px-6 py-3 rounded-2xl font-bold cursor-pointer">
            Return to Login
          </button>
        </div>
      );
    }
    return (
      <div>
        <div className="bg-sky-950 py-3.5 px-6 text-white flex justify-between items-center shadow-md">
          <span className="font-extrabold text-xl tracking-tight">🏥 Clinician Activity Monitor</span>
          <button
            onClick={handleLogout}
            className="bg-rose-600 hover:bg-rose-550 font-bold px-5 py-2.5 rounded-xl text-sm transition-all active:scale-95 shadow cursor-pointer"
          >
            Logout Securely
          </button>
        </div>
        <DoctorDashboard />
      </div>
    );
  }

  if (view === "caregiver") {
    if (userRole !== "caregiver") {
      return (
        <div className="min-h-screen bg-rose-50 flex flex-col justify-center items-center p-6 text-center">
          <h2 className="text-3xl font-black text-rose-800">⚠️ Access Denied</h2>
          <p className="text-slate-600 mt-2">You do not have caregiver privileges.</p>
          <button onClick={handleLogout} className="mt-6 bg-slate-800 text-white px-6 py-3 rounded-2xl font-bold cursor-pointer">
            Return to Login
          </button>
        </div>
      );
    }
    return (
      <div>
        <div className="bg-slate-900 py-3.5 px-6 text-white flex justify-between items-center shadow-md">
          <span className="font-extrabold text-xl tracking-tight">👩‍⚕️ Caregiver Portal</span>
          <button
            onClick={handleLogout}
            className="bg-rose-600 hover:bg-rose-550 font-bold px-5 py-2.5 rounded-xl text-sm transition-all active:scale-95 shadow cursor-pointer"
          >
            Logout Securely
          </button>
        </div>
        <CaregiverDashboard />
      </div>
    );
  }

  // =========================================================
  // PATIENT DASHBOARD (STRICTLY INDIVIDUAL & ELDERLY-FRIENDLY)
  // =========================================================
  const culturalBadge = getCulturalBadge(patientInfo?.state || "Assam");
  const avatarIcon = patientInfo?.profile_photo || "👵";

  return (
    <div className="min-h-screen bg-[#FDFBF7] p-4 sm:p-6 flex flex-col font-sans select-none">
      
      {/* Top Header Banner — Strictly Individual */}
      <header className="max-w-6xl w-full mx-auto bg-white rounded-3xl border border-[#EBE7DF] p-5 mb-6 flex flex-col sm:flex-row justify-between items-center gap-4 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-teal-50 text-teal-700 flex items-center justify-center font-bold text-3xl shadow-sm border border-teal-100">
            {avatarIcon}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                {getGreeting()}, {patientInfo?.name || "Friend"} 👋
              </h1>
              <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-black ${isOnline ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200 animate-pulse'}`}>
                {isOnline ? "🟢 ONLINE" : "🔴 OFFLINE"}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              <span className="text-xs font-extrabold text-teal-800 bg-teal-50 border border-teal-200/60 px-3 py-0.5 rounded-full">
                📍 {patientInfo?.state || "Assam"} • 🗣️ {patientLanguage}
              </span>
              <span className="text-xs font-bold text-slate-500">
                {getTranslation(patientLanguage, "age")}: {patientInfo?.age || 68}
              </span>
            </div>
          </div>
        </div>

        {/* Action Controls (Profile Edit & Logout) */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsProfileModalOpen(true)}
            className="bg-[#F5F8F7] hover:bg-[#EAF2EF] text-teal-800 border border-teal-200/70 px-4 py-2.5 rounded-xl font-bold text-sm shadow-sm transition-all active:scale-95 cursor-pointer flex items-center gap-1.5"
          >
            ⚙️ {getTranslation(patientLanguage, "edit_profile") || "Edit Profile"}
          </button>

          <button
            onClick={handleLogout}
            className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-5 py-2.5 rounded-xl font-bold text-sm shadow-sm transition-all active:scale-95 border border-[#EBE7DF] cursor-pointer"
          >
            Logout
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-6xl w-full mx-auto flex-1 flex flex-col justify-center items-center">
        
        {error && (
          <div className="w-full bg-red-100 border-2 border-red-300 text-red-700 p-5 rounded-2xl mb-6 text-center text-lg font-semibold">
            ⚠️ {error}
          </div>
        )}

        {loading ? (
          <div className="text-center py-20">
            <div className="text-6xl animate-spin mb-4">🧠</div>
            <h2 className="text-2xl font-bold text-slate-700">Loading your personal space...</h2>
            <p className="text-slate-400 mt-2">Connecting with AI cognitive engine</p>
          </div>
        ) : (
          <div className="w-full flex flex-col gap-6">
            
            {/* Notification & Guidance Banner */}
            {dashboardNotifications.length > 0 && (
              <div className="bg-sky-50/70 border border-sky-100 rounded-3xl p-5 shadow-sm w-full">
                <span className="text-xs font-bold text-sky-600 uppercase tracking-widest block mb-2">
                  📢 {getTranslation(patientLanguage, "daily_goal") || "Daily Guidance"}
                </span>
                <div className="flex flex-col gap-2.5">
                  {dashboardNotifications.map((note, index) => (
                    <div key={index} className="flex items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-sky-100 shadow-sm">
                      <span className="text-sky-950 font-extrabold text-base sm:text-lg">{note}</span>
                      <VoiceButton
                        text={note.replace(/🔔|🎉|💊|✨|🌟/g, "").trim()}
                        language={patientLanguage}
                        className="scale-75 !px-3 !py-1.5 !text-xs animate-none cursor-pointer"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Today's Progress Section */}
            <div className="bg-white rounded-[2rem] p-6 sm:p-7 shadow-sm border border-[#EBE7DF] w-full">
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 mb-4">
                <div>
                  <h2 className="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-2">
                    📈 {getTranslation(patientLanguage, "todays_progress")}
                  </h2>
                  <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider mt-0.5">
                    {todayProgress.activities_completed} of {todayProgress.target_activities} daily activities completed
                  </p>
                </div>
                <span className="text-2xl sm:text-3xl font-black text-teal-600 bg-teal-50 px-4 py-1.5 rounded-2xl border border-teal-100 w-fit">
                  {todayProgress.progress_percent}%
                </span>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-slate-100 rounded-full h-4 overflow-hidden border border-slate-200/60 shadow-inner mb-5">
                <div
                  className="bg-gradient-to-r from-teal-500 to-teal-700 h-full rounded-full transition-all duration-700"
                  style={{ width: `${Math.max(5, todayProgress.progress_percent)}%` }}
                />
              </div>

              {/* Mini Stat Badges */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-[#FDFBF7] border border-[#EBE7DF] p-3.5 rounded-2xl text-center">
                  <span className="text-xl block mb-0.5">🎯</span>
                  <span className="text-lg font-black text-slate-800">{todayProgress.activities_completed}/{todayProgress.target_activities}</span>
                  <p className="text-[11px] font-bold text-slate-400 uppercase">{getTranslation(patientLanguage, "activities")}</p>
                </div>
                <div className="bg-[#FDFBF7] border border-[#EBE7DF] p-3.5 rounded-2xl text-center">
                  <span className="text-xl block mb-0.5">🧠</span>
                  <span className="text-lg font-black text-slate-800">{todayProgress.games_completed}</span>
                  <p className="text-[11px] font-bold text-slate-400 uppercase">{getTranslation(patientLanguage, "games_completed")}</p>
                </div>
                <div className="bg-[#FDFBF7] border border-[#EBE7DF] p-3.5 rounded-2xl text-center">
                  <span className="text-xl block mb-0.5">📖</span>
                  <span className="text-lg font-black text-slate-800">{todayProgress.stories_completed}</span>
                  <p className="text-[11px] font-bold text-slate-400 uppercase">{getTranslation(patientLanguage, "stories")}</p>
                </div>
                <div className="bg-[#FDFBF7] border border-[#EBE7DF] p-3.5 rounded-2xl text-center">
                  <span className="text-xl block mb-0.5">⏰</span>
                  <span className="text-lg font-black text-slate-800">{todayProgress.reminders_completed}/{todayProgress.total_reminders}</span>
                  <p className="text-[11px] font-bold text-slate-400 uppercase">{getTranslation(patientLanguage, "reminders")}</p>
                </div>
              </div>
            </div>

            {/* 2-Column Main Section */}
            <div className="w-full grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* LEFT COLUMN: Hero AI Game & Today's Story */}
              <div className="flex flex-col gap-6 w-full">
                
                {/* AI Recommendation Card (Hero Banner) */}
                {recommendedGame && (
                  <div className="bg-gradient-to-br from-teal-600 via-teal-700 to-teal-900 rounded-[2rem] p-7 shadow-sm text-white flex flex-col gap-4 border border-teal-700/50">
                    <div className="flex justify-between items-start gap-4">
                      <div>
                        <span className="bg-white/15 px-3.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider block w-fit border border-white/10">
                          ✨ {getTranslation(patientLanguage, "todays_activity")}
                        </span>
                        <span className="text-white/80 text-sm font-medium block mt-2">
                          {getTranslation(patientLanguage, "recommended_for_you")}
                        </span>
                      </div>
                      <span className="text-5xl block opacity-90 p-2 bg-white/10 rounded-2xl border border-white/10">
                        {(() => {
                          const gId = recommendedGame.recommended_game_id || recommendedGame.game_id || 1;
                          if (gId === 1) return "🥁";
                          if (gId === 2) return "🧠";
                          if (gId === 3) return "🍲";
                          if (gId === 4) return "🎵";
                          if (gId === 5) return "📖";
                          if (gId === 6) return "📸";
                          return "🧠";
                        })()}
                      </span>
                    </div>
                    
                    <div>
                      <h3 className="text-2xl sm:text-3xl font-extrabold leading-tight">
                        {(() => {
                          const gId = recommendedGame.recommended_game_id || recommendedGame.game_id || 1;
                          const recLoc = gameLocalizations[gId];
                          return recLoc?.title || recommendedGame.recommended_game || "Remember the Sequence";
                        })()}
                      </h3>

                      <div className="flex items-center gap-2 text-xs bg-white/15 px-3 py-1.5 rounded-full w-fit mt-2.5 font-semibold border border-white/10">
                        <span>📊 {getTranslation(patientLanguage, "level")} {recommendedGame.recommended_level || recommendedGame.difficulty || 1}</span>
                        <span className="opacity-45">•</span>
                        <span className="capitalize">{recommendedGame.support_level || "Medium"} Support</span>
                      </div>
                    </div>

                    <div className="bg-white/10 p-3.5 rounded-2xl flex flex-col gap-1 border border-white/10">
                      <span className="text-[11px] font-bold text-white/80 block uppercase tracking-widest">
                        ❓ {getTranslation(patientLanguage, "why_this_activity")}
                      </span>
                      <p className="text-sm font-medium italic leading-relaxed text-white/95">
                        "{recommendedGame.reason || 'Recommended by AI engine to promote cognitive agility.'}"
                      </p>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 mt-1">
                      <button
                        onClick={() => handleLaunchGame(recommendedGame.recommended_game_id || recommendedGame.game_id || 1)}
                        className="flex-1 bg-white hover:bg-slate-50 text-teal-800 py-3.5 px-6 rounded-2xl text-lg font-black shadow-sm active:scale-95 transition-all cursor-pointer text-center"
                      >
                        ▶ {getTranslation(patientLanguage, "start_game") || "Start Game"}
                      </button>
                      
                      <VoiceButton
                        text={`${getTranslation(patientLanguage, "todays_activity")}. ${(() => {
                          const gId = recommendedGame.recommended_game_id || recommendedGame.game_id || 1;
                          const recLoc = gameLocalizations[gId];
                          return recLoc?.title || recommendedGame.recommended_game || "Remember the Sequence";
                        })()}. ${recommendedGame.reason}`}
                        language={patientLanguage}
                        className="!bg-white/15 hover:!bg-white/25 !text-white border border-white/20 !px-5 !py-3.5 rounded-2xl cursor-pointer"
                      />
                    </div>
                  </div>
                )}

                {/* Today's Cultural Story Card */}
                <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-[#EBE7DF] flex flex-col justify-between gap-4">
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                        📖 {getTranslation(patientLanguage, "todays_story")}
                      </span>
                      <span className={`text-xs font-bold px-3 py-1 rounded-full border ${culturalBadge.bg}`}>
                        {culturalBadge.tag}
                      </span>
                    </div>

                    <div className="flex items-center gap-4">
                      <span className="text-5xl p-3 bg-slate-50 rounded-2xl border border-slate-200">
                        {culturalBadge.icon.split(" ")[0] || "📖"}
                      </span>
                      <div>
                        <h3 className="text-xl font-extrabold text-slate-900 leading-tight">
                          {todayStory?.title || "Regional Folk Story & Recall"}
                        </h3>
                        <p className="text-sm text-slate-500 mt-1 font-medium">
                          {patientLanguage === "Assamese" ? "অসমৰ সমৃদ্ধ সংস্কৃতি আৰু চাহ বাগিচাৰ স্মৃতি।" :
                           patientLanguage === "Meitei" ? "মণিপুৰগী লোকটাক পাৎ অমসুং চৎনবীগী ꯋꯥꯔꯤ।" :
                           patientLanguage === "Mizo" ? "Mizoram thawnthu leh hnam nunphung." :
                           patientLanguage === "Khasi" ? "Ka puriskam tynrai jong ka jylla Meghalaya." :
                           "Cultural stories and memory comprehension exercises tailored for you."}
                        </p>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleLaunchGame(5)}
                    className="w-full bg-[#FDFBF7] hover:bg-[#F3EFE9] text-slate-800 border-2 border-[#EBE7DF] hover:border-teal-500/40 py-3.5 rounded-xl font-black text-base transition-all active:scale-95 cursor-pointer shadow-sm text-center"
                  >
                    📖 {getTranslation(patientLanguage, "read_story")}
                  </button>
                </div>

              </div>

              {/* RIGHT COLUMN: Reminders & Personal Progress */}
              <div className="flex flex-col gap-6 w-full">
                
                {/* Reminders Card */}
                <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-[#EBE7DF]">
                  <h2 className="text-xl font-black text-slate-900 mb-4 flex items-center gap-2">
                    ⏰ {getTranslation(patientLanguage, "todays_reminders")}
                  </h2>
                  
                  {reminders.length === 0 ? (
                    <div className="py-8 text-center bg-slate-50/70 rounded-2xl border border-slate-100">
                      <span className="text-3xl block mb-2">☀️</span>
                      <p className="text-slate-500 font-bold text-sm">{getTranslation(patientLanguage, "no_reminders")}</p>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3">
                      {reminders.map((r) => {
                        const typeIcon = r.reminder_type === "Medication" ? "💊" :
                                         r.reminder_type === "hydration" ? "💧" :
                                         r.reminder_type === "encouragement" ? "❤️" :
                                         r.reminder_type === "Daily Routine" ? "🍽" :
                                         r.reminder_type === "Cognitive Activity" ? "🧠" : "📝";
                        return (
                          <div key={r.id} className={`p-4 rounded-2xl border flex items-center justify-between gap-3 transition-all ${
                            r.completed ? 'bg-slate-50 opacity-60 border-slate-200' : 'bg-slate-50/60 border-[#EBE7DF] hover:border-teal-300 shadow-sm'
                          }`}>
                            <div className="flex items-center gap-3">
                              <input
                                type="checkbox"
                                checked={r.completed}
                                onChange={() => handleToggleReminder(r.id, r.completed)}
                                className="w-6 h-6 rounded-lg text-teal-600 focus:ring-teal-500 border-[#EBE7DF] cursor-pointer"
                              />
                              <div>
                                <p className={`font-extrabold text-slate-800 ${r.completed ? 'line-through text-slate-400' : ''}`}>
                                  {typeIcon} {r.title}
                                </p>
                                <p className="text-xs text-slate-400 font-semibold">{r.scheduled_time} ({r.reminder_type})</p>
                              </div>
                            </div>
                            
                            <VoiceButton
                              text={`${r.title}. Scheduled for ${r.scheduled_time}.`}
                              language={patientLanguage}
                              className="scale-75 !px-3 !py-2 !text-xs !bg-teal-50 hover:!bg-teal-150 !text-teal-700 shadow-none border border-teal-100 cursor-pointer"
                            />
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Personal Performance Summary Card */}
                <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-[#EBE7DF]">
                  <h2 className="text-xl font-black text-slate-900 mb-4 flex items-center gap-2">
                    📊 {getTranslation(patientLanguage, "your_progress")}
                  </h2>
                  
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="bg-teal-50/70 border border-teal-100 p-4 rounded-2xl text-center">
                      <span className="text-xs font-bold text-teal-700 uppercase tracking-wider block">{getTranslation(patientLanguage, "current_level")}</span>
                      <span className="text-3xl font-black text-teal-900 mt-1 block">Level {personalPerformance.current_level}</span>
                    </div>
                    <div className="bg-sky-50/70 border border-sky-100 p-4 rounded-2xl text-center">
                      <span className="text-xs font-bold text-sky-700 uppercase tracking-wider block">{getTranslation(patientLanguage, "recent_performance")}</span>
                      <span className="text-2xl font-black text-sky-900 mt-1.5 block">✨ {personalPerformance.recent_status}</span>
                    </div>
                  </div>

                  <div className="bg-[#FDFBF7] border border-[#EBE7DF] p-4 rounded-2xl">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">Cognitive Domains Exercised:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {personalPerformance.practiced_domains.map((dom, i) => (
                        <span key={i} className="text-xs font-bold bg-white text-slate-700 px-3 py-1 rounded-full border border-slate-200 shadow-2xs">
                          ✓ {dom}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

              </div>

            </div>

            {/* Bottom Section: All 6 Cognitive Games Selection Grid */}
            <div className="bg-white rounded-[2rem] p-6 sm:p-7 shadow-sm border border-[#EBE7DF] w-full mt-2">
              <h2 className="text-2xl font-black text-slate-900 mb-5 flex items-center gap-2">
                🎮 {getTranslation(patientLanguage, "select_activity")}
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                
                {/* Game 1 */}
                <div className="bg-[#FDFBF7] hover:bg-[#F3EFE9] p-5 rounded-2xl border border-[#EBE7DF] transition-all flex flex-col justify-between gap-4">
                  <div className="flex items-center gap-3.5">
                    <span className="text-4xl p-2.5 bg-white rounded-2xl shadow-xs border border-[#EBE7DF]">🥁</span>
                    <div>
                      <h3 className="font-extrabold text-base text-slate-800">
                        {gameLocalizations[1]?.title || "Remember the Sequence"}
                      </h3>
                      <p className="text-xs text-slate-500 font-medium mt-0.5">
                        {gameLocalizations[1]?.description || "Sequential pattern recall & visual memory."}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-slate-200/60">
                    <span className="bg-teal-50 text-teal-800 text-xs font-black px-3 py-1 rounded-full border border-teal-200/50">
                      {getTranslation(patientLanguage, "level")} {gameLevelsMap[1] || 1}
                    </span>
                    <button
                      onClick={() => handleLaunchGame(1)}
                      className="bg-teal-600 hover:bg-teal-700 text-white font-black px-5 py-2 rounded-xl text-sm transition-all active:scale-95 cursor-pointer shadow-xs"
                    >
                      {getTranslation(patientLanguage, "play")}
                    </button>
                  </div>
                </div>

                {/* Game 2 */}
                <div className="bg-[#FDFBF7] hover:bg-[#F3EFE9] p-5 rounded-2xl border border-[#EBE7DF] transition-all flex flex-col justify-between gap-4">
                  <div className="flex items-center gap-3.5">
                    <span className="text-4xl p-2.5 bg-white rounded-2xl shadow-xs border border-[#EBE7DF]">🧠</span>
                    <div>
                      <h3 className="font-extrabold text-base text-slate-800">
                        {gameLocalizations[2]?.title || "Familiar Picture Matching"}
                      </h3>
                      <p className="text-xs text-slate-500 font-medium mt-0.5">
                        {gameLocalizations[2]?.description || "Landmark pairing & visual association."}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-slate-200/60">
                    <span className="bg-teal-50 text-teal-800 text-xs font-black px-3 py-1 rounded-full border border-teal-200/50">
                      {getTranslation(patientLanguage, "level")} {gameLevelsMap[2] || 1}
                    </span>
                    <button
                      onClick={() => handleLaunchGame(2)}
                      className="bg-teal-600 hover:bg-teal-700 text-white font-black px-5 py-2 rounded-xl text-sm transition-all active:scale-95 cursor-pointer shadow-xs"
                    >
                      {getTranslation(patientLanguage, "play")}
                    </button>
                  </div>
                </div>

                {/* Game 3 */}
                <div className="bg-[#FDFBF7] hover:bg-[#F3EFE9] p-5 rounded-2xl border border-[#EBE7DF] transition-all flex flex-col justify-between gap-4">
                  <div className="flex items-center gap-3.5">
                    <span className="text-4xl p-2.5 bg-white rounded-2xl shadow-xs border border-[#EBE7DF]">🍲</span>
                    <div>
                      <h3 className="font-extrabold text-base text-slate-800">
                        {gameLocalizations[3]?.title || "Traditional Recipe Sequencer"}
                      </h3>
                      <p className="text-xs text-slate-500 font-medium mt-0.5">
                        {gameLocalizations[3]?.description || "Order culinary steps for North Eastern dishes."}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-slate-200/60">
                    <span className="bg-teal-50 text-teal-800 text-xs font-black px-3 py-1 rounded-full border border-teal-200/50">
                      {getTranslation(patientLanguage, "level")} {gameLevelsMap[3] || 1}
                    </span>
                    <button
                      onClick={() => handleLaunchGame(3)}
                      className="bg-teal-600 hover:bg-teal-700 text-white font-black px-5 py-2 rounded-xl text-sm transition-all active:scale-95 cursor-pointer shadow-xs"
                    >
                      {getTranslation(patientLanguage, "play")}
                    </button>
                  </div>
                </div>

                {/* Game 4 */}
                <div className="bg-[#FDFBF7] hover:bg-[#F3EFE9] p-5 rounded-2xl border border-[#EBE7DF] transition-all flex flex-col justify-between gap-4">
                  <div className="flex items-center gap-3.5">
                    <span className="text-4xl p-2.5 bg-white rounded-2xl shadow-xs border border-[#EBE7DF]">🎵</span>
                    <div>
                      <h3 className="font-extrabold text-base text-slate-800">
                        {gameLocalizations[4]?.title || "Folk Rhythm Match"}
                      </h3>
                      <p className="text-xs text-slate-500 font-medium mt-0.5">
                        {gameLocalizations[4]?.description || "Auditory tone reproduction & rhythm memory."}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-slate-200/60">
                    <span className="bg-teal-50 text-teal-800 text-xs font-black px-3 py-1 rounded-full border border-teal-200/50">
                      {getTranslation(patientLanguage, "level")} {gameLevelsMap[4] || 1}
                    </span>
                    <button
                      onClick={() => handleLaunchGame(4)}
                      className="bg-teal-600 hover:bg-teal-700 text-white font-black px-5 py-2 rounded-xl text-sm transition-all active:scale-95 cursor-pointer shadow-xs"
                    >
                      {getTranslation(patientLanguage, "play")}
                    </button>
                  </div>
                </div>

                {/* Game 5 */}
                <div className="bg-[#FDFBF7] hover:bg-[#F3EFE9] p-5 rounded-2xl border border-[#EBE7DF] transition-all flex flex-col justify-between gap-4">
                  <div className="flex items-center gap-3.5">
                    <span className="text-4xl p-2.5 bg-white rounded-2xl shadow-xs border border-[#EBE7DF]">📖</span>
                    <div>
                      <h3 className="font-extrabold text-base text-slate-800">
                        {gameLocalizations[5]?.title || "Mood & Memory Stories"}
                      </h3>
                      <p className="text-xs text-slate-500 font-medium mt-0.5">
                        {gameLocalizations[5]?.description || "Cultural stories & narrative recall."}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-slate-200/60">
                    <span className="bg-teal-50 text-teal-800 text-xs font-black px-3 py-1 rounded-full border border-teal-200/50">
                      {getTranslation(patientLanguage, "level")} {gameLevelsMap[5] || 1}
                    </span>
                    <button
                      onClick={() => handleLaunchGame(5)}
                      className="bg-teal-600 hover:bg-teal-700 text-white font-black px-5 py-2 rounded-xl text-sm transition-all active:scale-95 cursor-pointer shadow-xs"
                    >
                      {getTranslation(patientLanguage, "play")}
                    </button>
                  </div>
                </div>

                {/* Game 6 */}
                <div className="bg-[#FDFBF7] hover:bg-[#F3EFE9] p-5 rounded-2xl border border-[#EBE7DF] transition-all flex flex-col justify-between gap-4">
                  <div className="flex items-center gap-3.5">
                    <span className="text-4xl p-2.5 bg-white rounded-2xl shadow-xs border border-[#EBE7DF]">📸</span>
                    <div>
                      <h3 className="font-extrabold text-base text-slate-800">
                        {gameLocalizations[6]?.title || getTranslation(patientLanguage, "family_member_recognition")}
                      </h3>
                      <p className="text-xs text-slate-500 font-medium mt-0.5">
                        {gameLocalizations[6]?.description || "Recognize family members and relations."}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-slate-200/60">
                    <span className="bg-teal-50 text-teal-800 text-xs font-black px-3 py-1 rounded-full border border-teal-200/50">
                      {getTranslation(patientLanguage, "level")} {gameLevelsMap[6] || 1}
                    </span>
                    <button
                      onClick={() => handleLaunchGame(6)}
                      className="bg-teal-600 hover:bg-teal-700 text-white font-black px-5 py-2 rounded-xl text-sm transition-all active:scale-95 cursor-pointer shadow-xs"
                    >
                      {getTranslation(patientLanguage, "play")}
                    </button>
                  </div>
                </div>

              </div>
            </div>

          </div>
        )}

        <AlarmOverlayModal
          activeReminder={dueReminder}
          currentLang={patientLanguage}
          onComplete={handleCompleteReminderAlarm}
          onSnooze={handleSnoozeReminder}
          onDismiss={() => setDueReminder(null)}
        />

        {isProfileModalOpen && (
          <PatientProfileModal
            patient={patientInfo}
            language={patientLanguage}
            onClose={() => setIsProfileModalOpen(false)}
            onProfileUpdated={(updated) => {
              setPatientInfo(updated);
              setPatientLanguage(updated.language || "English");
              reloadDashboard();
            }}
          />
        )}

        {currentUser && userRole === "patient" && (
          <>
            {/* Floating microphone button */}
            <button
              onClick={handleToggleVoiceControl}
              className={`fixed bottom-6 right-6 z-[9998] w-16 h-16 rounded-full shadow-2xl flex items-center justify-center border-4 text-white text-3xl cursor-pointer active:scale-95 transition-all ${
                voiceListening ? "bg-rose-600 border-rose-400 animate-pulse animate-duration-1000" : "bg-teal-600 border-teal-400"
              }`}
            >
              🎤
            </button>

            {/* Speech recognition toast banner */}
            {voiceListening && voiceText && (
              <div className="fixed bottom-24 right-6 z-[9998] bg-slate-900 border border-slate-750 text-white font-extrabold text-sm px-5 py-3 rounded-2xl shadow-xl max-w-xs animate-fadeIn">
                {voiceText}
              </div>
            )}
          </>
        )}

      </main>
    </div>
  );
}
