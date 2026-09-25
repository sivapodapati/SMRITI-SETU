import React, { useEffect, useState } from "react";

const BACKEND_URL = "http://127.0.0.1:8000";

const GAME_NAMES = {
  1: "Remember the Sequence",
  2: "Familiar Landmark & Picture Match",
  3: "Traditional Recipe Sequencer",
  4: "Folk Rhythm Match",
  5: "Mood & Memory Stories",
  6: "Family Member Recognition"
};

export default function CaregiverDashboard() {
  const [selectedPatientId, setSelectedPatientId] = useState(2); // Default Priya Das
  const [patientInfo, setPatientInfo] = useState(null);
  const [performance, setPerformance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [gameLevels, setGameLevels] = useState({});
  const [patientsList, setPatientsList] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [recommendation, setRecommendation] = useState(null);

  const [reminders, setReminders] = useState([]);
  const [tasks, setTasks] = useState([]);

  // Family member state variables
  const [familyMembers, setFamilyMembers] = useState([]);
  const [showMemberForm, setShowMemberForm] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [memberName, setMemberName] = useState("");
  const [memberRelation, setMemberRelation] = useState("Daughter");
  const [memberPhoto, setMemberPhoto] = useState("");
  const [memberPrefName, setMemberPrefName] = useState("");
  
  // Create reminder form states
  const [remTitle, setRemTitle] = useState("");
  const [remDesc, setRemDesc] = useState("");
  const [remType, setRemType] = useState("Medication");
  const [remTime, setRemTime] = useState("08:00");
  const [remLang, setRemLang] = useState("English");
  
  // Create task form states
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDesc, setTaskDesc] = useState("");
  const [taskType, setTaskType] = useState("Caregiver-assigned");
  const [taskTime, setTaskTime] = useState("08:00");
  const [taskLang, setTaskLang] = useState("English");

  // Fetch all patients on mount
  useEffect(() => {
    const fetchPatients = async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/patients/`);
        if (res.ok) {
          const list = await res.json();
          setPatientsList(list);
        }
      } catch (e) {
        console.error("Failed to load patients list:", e);
      }
    };
    fetchPatients();
  }, []);

  const loadDashboardData = async (pId) => {
    try {
      setLoading(true);
      setError("");

      // Get patient info
      const patientResponse = await fetch(`${BACKEND_URL}/patients/${pId}`);
      if (patientResponse.ok) {
        const info = await patientResponse.json();
        setPatientInfo(info);
      }

      // Get all performance records
      const performanceResponse = await fetch(`${BACKEND_URL}/performance/`);
      if (!performanceResponse.ok) {
        throw new Error(`Performance API Error: ${performanceResponse.status}`);
      }

      const performanceData = await performanceResponse.json();
      // Filter by selected patient
      const patientPerformance = performanceData.filter(
        (item) => Number(item.patient_id) === pId
      );
      setPerformance(patientPerformance);

      // Fetch recommended levels for all 6 games
      const levelsMap = {};
      for (let gId = 1; gId <= 6; gId++) {
        try {
          const res = await fetch(`${BACKEND_URL}/adaptive/patient/${pId}/game/${gId}`);
          if (res.ok) {
            const data = await res.json();
            levelsMap[gId] = data;
          }
        } catch (e) {
          console.error(e);
        }
      }
      setGameLevels(levelsMap);

      // Fetch alerts
      await loadAlerts(pId);

      // Fetch intelligent recommendation
      try {
        const recRes = await fetch(`${BACKEND_URL}/recommendations/patient/${pId}`);
        if (recRes.ok) {
          const recData = await recRes.json();
          setRecommendation(recData);
        }
      } catch (e) {
        console.error(e);
      }

      // Fetch reminders and tasks
      await loadReminders(pId);
      await loadTasks(pId);
      await loadFamilyMembers(pId);

    } catch (err) {
      console.error("Dashboard Error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadFamilyMembers = async (pId) => {
    if (!pId) return;
    try {
      const res = await fetch(`${BACKEND_URL}/family-members/patient/${pId}`);
      if (res.ok) {
        const list = await res.json();
        setFamilyMembers(list);
      }
    } catch (e) {
      console.error("Failed to load family members:", e);
    }
  };

  const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setMemberPhoto(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleStartEditMember = (member) => {
    setEditingMember(member);
    setMemberName(member.name);
    setMemberRelation(member.relationship);
    setMemberPhoto(member.photo_url || "");
    setMemberPrefName(member.preferred_display_name || "");
    setShowMemberForm(true);
  };

  const handleDeleteFamilyMember = async (id) => {
    if (!confirm("Are you sure you want to remove this family member?")) return;
    try {
      const res = await fetch(`${BACKEND_URL}/family-members/${id}`, {
        method: "DELETE"
      });
      if (res.ok) {
        setFamilyMembers(prev => prev.filter(m => m.id !== id));
      }
    } catch (e) {
      console.error("Failed to delete family member:", e);
    }
  };

  const handleSaveFamilyMember = async (e) => {
    e.preventDefault();
    const payload = {
      name: memberName,
      relationship: memberRelation,
      photo_url: memberPhoto || null,
      preferred_display_name: memberPrefName || null,
      active: true
    };

    try {
      if (editingMember) {
        const res = await fetch(`${BACKEND_URL}/family-members/${editingMember.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        if (res.ok) {
          await loadFamilyMembers(selectedPatientId);
          setShowMemberForm(false);
          setEditingMember(null);
        }
      } else {
        const res = await fetch(`${BACKEND_URL}/family-members/patient/${selectedPatientId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        if (res.ok) {
          await loadFamilyMembers(selectedPatientId);
          setShowMemberForm(false);
          setMemberName("");
          setMemberRelation("Daughter");
          setMemberPhoto("");
          setMemberPrefName("");
        }
      }
    } catch (err) {
      console.error("Failed to save family member:", err);
    }
  };

  const loadAlerts = async (pId) => {
    try {
      const res = await fetch(`${BACKEND_URL}/alerts/?patient_id=${pId}`);
      if (res.ok) {
        const data = await res.json();
        setAlerts(data);
      }
    } catch (e) {
      console.error("Failed to load alerts:", e);
    }
  };

  const loadReminders = async (pId) => {
    try {
      const res = await fetch(`${BACKEND_URL}/reminders/?patient_id=${pId}`);
      if (res.ok) {
        const data = await res.json();
        setReminders(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const loadTasks = async (pId) => {
    try {
      const res = await fetch(`${BACKEND_URL}/tasks/?patient_id=${pId}`);
      if (res.ok) {
        const data = await res.json();
        setTasks(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddReminder = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${BACKEND_URL}/reminders/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patient_id: selectedPatientId,
          title: remTitle,
          description: remDesc,
          reminder_type: remType,
          scheduled_time: remTime,
          recurrence: "daily",
          language: remLang,
          active: true,
          completed: false
        })
      });
      if (res.ok) {
        setRemTitle("");
        setRemDesc("");
        await loadReminders(selectedPatientId);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddTask = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${BACKEND_URL}/tasks/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patient_id: selectedPatientId,
          title: taskTitle,
          description: taskDesc,
          task_type: taskType,
          due_time: taskTime,
          status: "Pending",
          language: taskLang
        })
      });
      if (res.ok) {
        setTaskTitle("");
        setTaskDesc("");
        await loadTasks(selectedPatientId);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteReminder = async (remId) => {
    try {
      const res = await fetch(`${BACKEND_URL}/reminders/${remId}`, { method: "DELETE" });
      if (res.ok) {
        await loadReminders(selectedPatientId);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteTask = async (taskId) => {
    try {
      const res = await fetch(`${BACKEND_URL}/tasks/${taskId}`, { method: "DELETE" });
      if (res.ok) {
        await loadTasks(selectedPatientId);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleToggleTaskStatus = async (taskId, currentStatus) => {
    const nextStatus = currentStatus === "Completed" ? "Pending" : "Completed";
    try {
      const res = await fetch(`${BACKEND_URL}/tasks/${taskId}/status?status=${nextStatus}`, { method: "PUT" });
      if (res.ok) {
        await loadTasks(selectedPatientId);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleMarkRead = async (alertId) => {
    try {
      const res = await fetch(`${BACKEND_URL}/alerts/${alertId}/read`, {
        method: "PUT"
      });
      if (res.ok) {
        await loadAlerts(selectedPatientId);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/alerts/read-all?patient_id=${selectedPatientId}`, {
        method: "PUT"
      });
      if (res.ok) {
        await loadAlerts(selectedPatientId);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadDashboardData(selectedPatientId);
  }, [selectedPatientId]);

  // Aggregate stats
  const gamesCompleted = performance.length;
  
  const scoreValues = performance.filter((item) => item.score != null).map((item) => Number(item.score));
  const averageScore = scoreValues.length > 0
    ? Math.round(scoreValues.reduce((sum, value) => sum + value, 0) / scoreValues.length)
    : 0;

  const accuracyValues = performance
    .filter((item) => item.attempts != null && item.correct_answers != null && Number(item.attempts) > 0)
    .map((item) => (Number(item.correct_answers) / Number(item.attempts)) * 100);
  const averageAccuracy = accuracyValues.length > 0
    ? Math.round(accuracyValues.reduce((sum, value) => sum + value, 0) / accuracyValues.length)
    : 0;

  const engagementValues = performance.filter((item) => item.engagement_score != null).map((item) => Number(item.engagement_score));
  const averageEngagement = engagementValues.length > 0
    ? Math.round(engagementValues.reduce((sum, value) => sum + value, 0) / engagementValues.length)
    : 0;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 p-6">
        <div className="bg-white p-8 rounded-2xl shadow-lg text-center">
          <h1 className="text-2xl font-bold">Loading Caregiver Dashboard...</h1>
          <p className="mt-3 text-slate-500">Fetching patient performance and AI difficulty insights</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDFBF7] p-4 sm:p-6 select-none font-sans">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Caregiver Portal</h1>
            <p className="text-slate-500 mt-1 font-medium">Monitor patient cognitive performance, history, and AI adaptation reasons.</p>
          </div>

          {/* Patient Selector */}
          <div className="flex items-center gap-3 bg-white p-3 rounded-xl border border-[#EBE7DF] shadow-sm">
            <span className="font-bold text-slate-700 text-sm">Patient Profile:</span>
            <select
              value={selectedPatientId}
              onChange={(e) => setSelectedPatientId(Number(e.target.value))}
              className="bg-transparent text-sm font-extrabold text-slate-800 focus:outline-none cursor-pointer"
            >
              {patientsList.map(p => (
                <option key={p.id} value={p.id}>{p.name} ({p.state})</option>
              ))}
            </select>
          </div>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-300 text-red-700 p-5 rounded-xl mb-6">
            ⚠️ {error}
          </div>
        )}

        {/* Patient Profile Box */}
        <div className="bg-white rounded-[2rem] shadow-sm p-6 mb-6 border border-[#EBE7DF]">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h2 className="text-xl font-black text-slate-900 mb-3 uppercase tracking-wide">Patient Overview</h2>
              <div className="flex flex-wrap gap-3">
                <span className="px-4 py-2 bg-slate-50 border border-[#EBE7DF] text-slate-700 rounded-xl font-medium text-sm">Name: {patientInfo?.name}</span>
                <span className="px-4 py-2 bg-slate-50 border border-[#EBE7DF] text-slate-700 rounded-xl font-medium text-sm">Age: {patientInfo?.age || 68}</span>
                <span className="px-4 py-2 bg-slate-50 border border-[#EBE7DF] text-slate-700 rounded-xl font-medium text-sm">Preferred Lang: {patientInfo?.language}</span>
                <span className="px-4 py-2 bg-slate-50 border border-[#EBE7DF] text-slate-700 rounded-xl font-medium text-sm">State: {patientInfo?.state || "N/A"}</span>
              </div>
            </div>
            <div className="text-center bg-teal-50 text-teal-800 font-extrabold px-6 py-3 rounded-xl border border-teal-200">
              <span className="text-[10px] block text-teal-700 uppercase tracking-wider">Overall Status</span>
              <span className="text-lg">{averageScore >= 80 ? "Excellent" : averageScore >= 60 ? "Good" : "Needs Support"}</span>
            </div>
          </div>
        </div>

        {/* CAREGIVER ALERT CENTER */}
        <div className="bg-white rounded-[2rem] shadow-sm p-6 mb-6 border border-[#EBE7DF]">
          <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
            <h2 className="text-xl font-black text-slate-900 flex items-center gap-2 uppercase tracking-wide">
              🚨 Alert Center
              {alerts.filter(a => !a.is_read).length > 0 && (
                <span className="bg-rose-550 text-white text-[10px] px-2 py-0.5 rounded-full font-bold">
                  {alerts.filter(a => !a.is_read).length} New
                </span>
              )}
            </h2>
            {alerts.filter(a => !a.is_read).length > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-sm font-semibold text-teal-650 hover:text-teal-700 cursor-pointer"
              >
                Mark All as Read
              </button>
            )}
          </div>

          {alerts.length === 0 ? (
            <p className="text-slate-400 text-center py-6 text-sm italic">No alerts active for this patient.</p>
          ) : (
            <div className="flex flex-col gap-4 max-h-96 overflow-y-auto pr-2">
              {alerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`p-5 rounded-2xl border transition-all flex flex-col md:flex-row justify-between items-start md:items-center gap-4 ${
                    alert.is_read 
                      ? "bg-slate-50 border-slate-200 opacity-60 shadow-none" 
                      : alert.severity === "HIGH"
                      ? "bg-rose-50 border-rose-200 shadow-sm"
                      : alert.severity === "MEDIUM"
                      ? "bg-amber-50 border-amber-200 shadow-sm"
                      : "bg-teal-55/40 border-teal-150 shadow-sm"
                  }`}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                      <span className={`text-[11px] font-bold px-3 py-1 rounded-full border ${
                        alert.severity === "HIGH"
                          ? "bg-rose-100 text-rose-800 border-rose-300"
                          : alert.severity === "MEDIUM"
                          ? "bg-amber-100 text-amber-800 border-amber-300"
                          : "bg-sky-100 text-sky-850 border-sky-300"
                      }`}>
                        {alert.severity === "HIGH" ? "🔴 High" : alert.severity === "MEDIUM" ? "🟠 Medium" : "🔵 Info"} Severity
                      </span>
                      <span className="font-extrabold text-slate-800 text-sm">{alert.alert_type}</span>
                      <span className="text-[10px] text-slate-450 font-semibold">
                        {new Date(alert.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-slate-700 text-sm font-medium mb-1">
                      <span className="font-bold text-slate-900">Game:</span> {GAME_NAMES[alert.game_id] || "Game"} (Level {alert.current_level})
                    </p>
                    <p className="text-slate-600 text-sm italic mb-2">"{alert.reason}"</p>
                    <p className="text-teal-900 text-sm font-semibold">
                      💡 Recommended Action: {alert.recommended_action}
                    </p>
                  </div>
                  {!alert.is_read && (
                    <button
                      onClick={() => handleMarkRead(alert.id)}
                      className="bg-white hover:bg-slate-50 border border-[#EBE7DF] font-extrabold text-xs px-4 py-2.5 rounded-xl shadow-sm text-slate-700 self-end md:self-auto cursor-pointer"
                    >
                      Mark Read
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
        {/* Statistics Widgets */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <div className="bg-white rounded-2xl shadow-sm p-6 border border-[#EBE7DF]">
            <p className="text-slate-500 font-bold text-sm">Games Completed</p>
            <h2 className="text-3xl font-extrabold text-teal-600 mt-2">{gamesCompleted}</h2>
          </div>
          <div className="bg-white rounded-2xl shadow-sm p-6 border border-[#EBE7DF]">
            <p className="text-slate-500 font-bold text-sm">Average Score</p>
            <h2 className="text-3xl font-extrabold text-emerald-600 mt-2">{averageScore}%</h2>
          </div>
          <div className="bg-white rounded-2xl shadow-sm p-6 border border-[#EBE7DF]">
            <p className="text-slate-500 font-bold text-sm">Average Accuracy</p>
            <h2 className="text-3xl font-extrabold text-indigo-600 mt-2">{averageAccuracy}%</h2>
          </div>
          <div className="bg-white rounded-2xl shadow-sm p-6 border border-[#EBE7DF]">
            <p className="text-slate-500 font-bold text-sm">Engagement Level</p>
            <h2 className="text-3xl font-extrabold text-amber-600 mt-2">{averageEngagement}%</h2>
          </div>
        </div>

        {/* INTELLIGENT GAME RECOMMENDATIONS PANEL */}
        {recommendation && (
          <div className="bg-white rounded-[2rem] shadow-sm p-6 mb-6 border border-[#EBE7DF]">
            <h2 className="text-2xl font-black text-slate-900 mb-6 flex items-center gap-2 uppercase tracking-wide">
              🧠 AI Recommendation
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left card: Current Recommendation details */}
              <div className="lg:col-span-1 bg-gradient-to-br from-teal-50 to-emerald-50 p-6 rounded-2xl border border-teal-100 flex flex-col gap-4">
                <span className="bg-teal-100 text-teal-800 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider block w-fit">
                  Active Guidance Activity
                </span>
                <div>
                  <span className="text-slate-550 text-xs uppercase font-bold">Recommended Game</span>
                  <h3 className="text-2xl font-extrabold text-slate-950 mt-0.5">{recommendation.recommended_game}</h3>
                </div>
                <div>
                  <span className="text-slate-550 text-xs uppercase font-bold">Target Domain</span>
                  <p className="text-sm font-bold text-teal-950 mt-0.5">{recommendation.domain_name} ({recommendation.domain})</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-slate-550 text-xs uppercase font-bold block">Level Target</span>
                    <span className="bg-teal-600 text-white text-xs font-bold px-2.5 py-1 rounded-lg inline-block mt-0.5">Level {recommendation.recommended_level}</span>
                  </div>
                  <div>
                    <span className="text-slate-550 text-xs uppercase font-bold block">Support Level</span>
                    <span className="bg-teal-700 text-white text-xs font-bold px-2.5 py-1 rounded-lg uppercase inline-block mt-0.5">{recommendation.support_level}</span>
                  </div>
                </div>
                <div>
                  <span className="text-slate-550 text-xs uppercase font-bold">Flow Zone</span>
                  <span className="text-xs font-bold px-2.5 py-1 rounded bg-teal-200 text-teal-900 capitalize block w-fit mt-1">{recommendation.flow_zone?.replace("_", " ")}</span>
                </div>
                <div className="bg-white p-4 rounded-xl border border-teal-105">
                  <span className="text-slate-400 text-xs uppercase font-semibold block mb-1">AI Recommendation Rationale</span>
                  <p className="text-xs italic text-slate-600">"{recommendation.reason}"</p>
                </div>
              </div>

              {/* Right/Middle grid: Cognitive Domain Scorecards */}
              <div className="lg:col-span-2 flex flex-col gap-4">
                <h3 className="text-lg font-bold text-slate-700">Observed Cognitive Domains Profile</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {recommendation.domain_profiles && Object.entries(recommendation.domain_profiles).map(([key, domain]) => {
                    const isDeclining = domain.classification === "declining";
                    const isWeak = domain.classification === "weak";
                    const isStrong = domain.classification === "strong";
                    return (
                      <div key={key} className={`p-4 rounded-xl border flex flex-col justify-between gap-3 ${
                        isDeclining ? 'bg-red-50/50 border-red-200' :
                        isWeak ? 'bg-orange-50/50 border-orange-200' :
                        isStrong ? 'bg-emerald-50/50 border-emerald-200' :
                        'bg-slate-50/50 border-slate-200'
                      }`}>
                        <div className="flex justify-between items-start gap-2">
                          <div>
                            <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider block">Domain</span>
                            <span className="font-extrabold text-slate-800 text-sm">{domain.domain_name}</span>
                          </div>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            isDeclining ? 'bg-red-100 text-red-800' :
                            isWeak ? 'bg-orange-100 text-orange-800' :
                            isStrong ? 'bg-emerald-100 text-emerald-800' :
                            'bg-slate-100 text-slate-800'
                          }`}>
                            {domain.classification?.replace("_", " ")}
                          </span>
                        </div>
                        <div className="flex items-end justify-between mt-1">
                          <div>
                            <span className="text-slate-400 text-[9px] uppercase block">Weighted Score</span>
                            <span className="text-lg font-black text-slate-800">{domain.score}%</span>
                          </div>
                          <div>
                            <span className="text-slate-400 text-[9px] uppercase block">Trend</span>
                            <span className="text-xs font-semibold capitalize text-slate-600">{domain.trend}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 text-[9px] uppercase block">Attempts</span>
                            <span className="text-xs font-bold text-slate-700">{domain.history_count} played</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* AI ADAPTATION DETAILS BY GAME */}
        <div className="bg-white rounded-3xl shadow p-6 mb-6 border border-slate-100">
          <h2 className="text-2xl font-black text-slate-800 mb-6 uppercase tracking-wide">📊 Cognitive Performance</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Game levels status */}
            <div className="flex flex-col gap-4">
              <h3 className="text-lg font-bold text-slate-600 uppercase border-b pb-2">Recommended Next Levels</h3>
              {Object.keys(GAME_NAMES).map((gId) => {
                const info = gameLevels[gId];
                return (
                  <div key={gId} className="flex justify-between items-center bg-slate-50 p-4 rounded-2xl border">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{gId === "1" ? "🥁" : gId === "2" ? "🧠" : gId === "3" ? "🔍" : gId === "4" ? "🌺" : "📖"}</span>
                      <span className="font-bold text-slate-800">{GAME_NAMES[gId]}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="bg-indigo-100 text-indigo-800 font-extrabold px-3 py-1 rounded-full text-sm">
                        Level {info?.next_level || 1}
                      </span>
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                        info?.support_level === "high" ? "bg-red-100 text-red-800" : info?.support_level === "low" ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"
                      }`}>
                        {info?.support_level || "medium"} support
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* AI Reasoning Alerts */}
            <div className="flex flex-col gap-4">
              <h3 className="text-lg font-bold text-slate-600 uppercase border-b pb-2">AI Adaptation Rationale</h3>
              <div className="flex-1 flex flex-col gap-3 justify-center">
                {Object.keys(GAME_NAMES).map((gId) => {
                  const info = gameLevels[gId];
                  if (!info) return null;
                  return (
                    <div key={gId} className="p-3.5 rounded-xl border border-blue-100 bg-blue-50/50 text-slate-700 text-sm">
                      <span className="font-extrabold text-blue-800 block mb-1">{GAME_NAMES[gId]}:</span>
                      <p className="italic">"{info.reason}"</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* REMINDERS & TASKS MANAGEMENT SECTION */}
        <div className="bg-white rounded-[2rem] shadow-sm p-6 mb-6 border border-[#EBE7DF]">
          <h2 className="text-xl font-black text-slate-900 mb-6 uppercase tracking-wide">📋 Tasks & Reminders</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
            {/* Reminders Card */}
            <div className="bg-white rounded-2xl p-5 border border-[#EBE7DF]">
              <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">📅 Patient Reminders</h2>
              
              {/* Create Reminder Form */}
              <form onSubmit={handleAddReminder} className="bg-[#FAF8F5] border border-[#EBE7DF] p-5 rounded-2xl mb-6 grid grid-cols-2 gap-3.5 shadow-sm">
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Reminder Title</label>
                  <input
                    type="text"
                    value={remTitle}
                    onChange={(e) => setRemTitle(e.target.value)}
                    placeholder="e.g. Take morning blue pill"
                    required
                    className="w-full bg-white border border-[#EBE7DF] rounded-xl p-2.5 text-sm focus:outline-none focus:border-teal-500 font-bold"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Description (Optional)</label>
                  <input
                    type="text"
                    value={remDesc}
                    onChange={(e) => setRemDesc(e.target.value)}
                    placeholder="e.g. 1 capsule after breakfast"
                    className="w-full bg-white border border-[#EBE7DF] rounded-xl p-2.5 text-sm focus:outline-none focus:border-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Type</label>
                  <select
                    value={remType}
                    onChange={(e) => setRemType(e.target.value)}
                    className="w-full bg-white border border-[#EBE7DF] rounded-xl p-2.5 text-sm focus:outline-none font-bold"
                  >
                    <option value="Medication">Medication</option>
                    <option value="hydration">Hydration</option>
                    <option value="encouragement">Caregiver Encouragement</option>
                    <option value="Daily Routine">Daily Routine</option>
                    <option value="Cognitive Activity">Cognitive Activity</option>
                    <option value="Appointment">Appointment</option>
                    <option value="General">General</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Scheduled Time</label>
                  <input
                    type="time"
                    value={remTime}
                    onChange={(e) => setRemTime(e.target.value)}
                    required
                    className="w-full bg-white border border-[#EBE7DF] rounded-xl p-2.5 text-sm focus:outline-none font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Language</label>
                  <select
                    value={remLang}
                    onChange={(e) => setRemLang(e.target.value)}
                    className="w-full bg-white border border-[#EBE7DF] rounded-xl p-2.5 text-sm focus:outline-none"
                  >
                    <option value="English">English</option>
                    <option value="Assamese">Assamese</option>
                    <option value="Bengali">Bengali</option>
                    <option value="Meitei">Meitei/Manipuri</option>
                    <option value="Khasi">Khasi</option>
                    <option value="Mizo">Mizo</option>
                    <option value="Nepali">Nepali</option>
                    <option value="Garo">Garo</option>
                  </select>
                </div>
                <div className="flex items-end">
                  <button type="submit" className="w-full bg-teal-600 hover:bg-teal-700 text-white font-bold p-2.5 rounded-xl text-sm transition-all active:scale-95 shadow-sm cursor-pointer">
                    + Add Reminder
                  </button>
                </div>
              </form>

              {/* Reminders List */}
              {reminders.length === 0 ? (
                <p className="text-slate-400 text-sm italic py-4 text-center">No reminders set for this patient.</p>
              ) : (
                <div className="flex flex-col gap-3 max-h-80 overflow-y-auto pr-2">
                  {reminders.map((r) => (
                    <div key={r.id} className="p-3 border border-[#EBE7DF] rounded-xl flex justify-between items-center bg-[#FAF8F5] shadow-xs">
                      <div>
                        <p className="font-bold text-slate-800">
                          {r.reminder_type === "Medication" ? "💊" :
                           r.reminder_type === "hydration" ? "💧" :
                           r.reminder_type === "encouragement" ? "❤️" :
                           r.reminder_type === "Daily Routine" ? "🍽" :
                           r.reminder_type === "Cognitive Activity" ? "🧠" : "📝"} {r.title}
                        </p>
                        <p className="text-[11px] text-slate-400 font-semibold">{r.scheduled_time} ({r.reminder_type}) — Lang: {r.language}</p>
                        {r.description && <p className="text-xs text-slate-500 mt-0.5">{r.description}</p>}
                      </div>
                      <button
                        onClick={() => handleDeleteReminder(r.id)}
                        className="bg-rose-50 hover:bg-rose-100 text-rose-650 text-xs font-bold px-3 py-1.5 rounded-lg border border-rose-250 transition-all cursor-pointer"
                      >
                        Delete
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Tasks Card */}
            <div className="bg-white rounded-2xl p-5 border border-[#EBE7DF]">
              <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">☐ Patient Tasks</h2>
              
              {/* Create Task Form */}
              <form onSubmit={handleAddTask} className="bg-[#FAF8F5] border border-[#EBE7DF] p-5 rounded-2xl mb-6 grid grid-cols-2 gap-3.5 shadow-sm">
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Task Title</label>
                  <input
                    type="text"
                    value={taskTitle}
                    onChange={(e) => setTaskTitle(e.target.value)}
                    placeholder="e.g. Morning Cognitive Activity"
                    required
                    className="w-full bg-white border border-[#EBE7DF] rounded-xl p-2.5 text-sm focus:outline-none focus:border-teal-500 font-bold"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Description (Optional)</label>
                  <input
                    type="text"
                    value={taskDesc}
                    onChange={(e) => setTaskDesc(e.target.value)}
                    placeholder="e.g. Try to achieve level 3 in sequence recall"
                    className="w-full bg-white border border-[#EBE7DF] rounded-xl p-2.5 text-sm focus:outline-none focus:border-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Type</label>
                  <select
                    value={taskType}
                    onChange={(e) => setTaskType(e.target.value)}
                    className="w-full bg-white border border-[#EBE7DF] rounded-xl p-2.5 text-sm focus:outline-none font-bold"
                  >
                    <option value="Cognitive Game">Cognitive Game</option>
                    <option value="Medication">Medication</option>
                    <option value="Daily Routine">Daily Routine</option>
                    <option value="Reminder">Reminder</option>
                    <option value="Caregiver-assigned">Caregiver-assigned</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Due Time</label>
                  <input
                    type="time"
                    value={taskTime}
                    onChange={(e) => setTaskTime(e.target.value)}
                    required
                    className="w-full bg-white border border-[#EBE7DF] rounded-xl p-2.5 text-sm focus:outline-none font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Language</label>
                  <select
                    value={taskLang}
                    onChange={(e) => setTaskLang(e.target.value)}
                    className="w-full bg-white border border-[#EBE7DF] rounded-xl p-2.5 text-sm focus:outline-none"
                  >
                    <option value="English">English</option>
                    <option value="Assamese">Assamese</option>
                    <option value="Bengali">Bengali</option>
                    <option value="Meitei">Meitei/Manipuri</option>
                    <option value="Khasi">Khasi</option>
                    <option value="Mizo">Mizo</option>
                    <option value="Nepali">Nepali</option>
                    <option value="Garo">Garo</option>
                  </select>
                </div>
                <div className="flex items-end">
                  <button type="submit" className="w-full bg-teal-600 hover:bg-teal-700 text-white font-bold p-2.5 rounded-xl text-sm transition-all active:scale-95 shadow-sm cursor-pointer">
                    + Assign Task
                  </button>
                </div>
              </form>

              {/* Tasks List */}
              {tasks.length === 0 ? (
                <p className="text-slate-400 text-sm italic py-4 text-center">No tasks assigned to this patient.</p>
              ) : (
                <div className="flex flex-col gap-3 max-h-80 overflow-y-auto pr-2">
                  {tasks.map((t) => (
                    <div key={t.id} className="p-3 border border-[#EBE7DF] rounded-xl flex justify-between items-center bg-[#FAF8F5] shadow-xs">
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={t.status === "Completed"}
                          onChange={() => handleToggleTaskStatus(t.id, t.status)}
                          className="w-5 h-5 rounded text-teal-600 focus:ring-teal-500 border-[#EBE7DF] cursor-pointer"
                        />
                        <div>
                          <p className={`font-bold text-slate-800 ${t.status === "Completed" ? 'line-through text-slate-400' : ''}`}>
                            {t.title}
                          </p>
                          <p className="text-[11px] text-slate-400 font-semibold">Due: {t.due_time} ({t.task_type})</p>
                          {t.description && <p className="text-xs text-slate-500 mt-0.5">{t.description}</p>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${t.status === "Completed" ? 'bg-emerald-50 text-emerald-800 border-emerald-300' : 'bg-amber-50 text-amber-800 border-amber-300'}`}>
                          {t.status === "Completed" ? "🟢 Completed" : "🟡 Pending"}
                        </span>
                        <button
                          onClick={() => handleDeleteTask(t.id)}
                          className="bg-rose-50 hover:bg-rose-100 text-rose-650 text-xs font-bold px-3 py-1.5 rounded-lg border border-rose-250 transition-all cursor-pointer"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        </div>

        {/* RECENT PERFORMANCE LIST */}
        <div className="bg-white rounded-[2rem] shadow-sm p-6 border border-[#EBE7DF] mb-6">
          <h2 className="text-xl font-bold text-slate-900 mb-5">Recent Game Performance Logs</h2>
          {performance.length === 0 ? (
            <p className="text-slate-400 text-center py-6 text-sm italic">No performance records recorded for this patient yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b text-slate-500 text-sm uppercase">
                    <th className="py-4">Game</th>
                    <th className="py-4">Level</th>
                    <th className="py-4">Score</th>
                    <th className="py-4">Moves (Attempts)</th>
                    <th className="py-4">Time</th>
                    <th className="py-4">AI Reason / Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y text-slate-700">
                  {performance.slice().reverse().map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/50">
                      <td className="py-4 font-bold flex items-center gap-2">
                        <span>{item.game_id === 1 ? "🥁" : item.game_id === 2 ? "🧠" : item.game_id === 3 ? "🔍" : item.game_id === 4 ? "🌺" : "📖"}</span>
                        <span>{GAME_NAMES[item.game_id]}</span>
                      </td>
                      <td className="py-4">
                        <span className="bg-slate-100 px-3 py-1 rounded-full text-sm font-bold">Level {item.difficulty}</span>
                      </td>
                      <td className="py-4 font-bold text-indigo-650">{item.score}%</td>
                      <td className="py-4">{item.attempts}</td>
                      <td className="py-4 font-semibold">{item.response_time}s</td>
                      <td className="py-4 max-w-xs truncate text-sm italic text-slate-500" title={item.reason}>
                        {item.reason || "Automatic log recorded."}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* FAMILY PROFILE MANAGEMENT */}
        <div className="bg-white rounded-[2rem] shadow-sm p-6 border border-[#EBE7DF] mb-6">
          <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
            <h2 className="text-xl font-black text-slate-900 flex items-center gap-2 uppercase tracking-wide">
              📸 Family Profile Management (Memory Support)
            </h2>
            <button
              onClick={() => {
                setEditingMember(null);
                setMemberName("");
                setMemberRelation("Daughter");
                setMemberPhoto("");
                setMemberPrefName("");
                setShowMemberForm(!showMemberForm);
              }}
              className="bg-teal-600 hover:bg-teal-700 text-white font-extrabold text-xs px-4 py-2.5 rounded-xl shadow-sm transition-all active:scale-95 cursor-pointer"
            >
              {showMemberForm ? "Close Form" : "+ Add Family Member"}
            </button>
          </div>

          {/* Form to Add/Edit Family Member */}
          {showMemberForm && (
            <form onSubmit={handleSaveFamilyMember} className="bg-slate-50 border border-[#EBE7DF] rounded-2xl p-6 mb-6 flex flex-col gap-4">
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">
                {editingMember ? "✏️ Edit Family Member" : "➕ Add Family Member"}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase">Real Name:</label>
                  <input
                    type="text"
                    required
                    value={memberName}
                    onChange={(e) => setMemberName(e.target.value)}
                    placeholder="e.g. Priya Das"
                    className="border border-[#EBE7DF] rounded-xl p-3 text-sm bg-white font-bold"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase">Relationship:</label>
                  <select
                    value={memberRelation}
                    onChange={(e) => setMemberRelation(e.target.value)}
                    className="border border-[#EBE7DF] rounded-xl p-3 text-sm bg-white font-bold cursor-pointer focus:outline-none"
                  >
                    <option value="Mother">Mother</option>
                    <option value="Father">Father</option>
                    <option value="Daughter">Daughter</option>
                    <option value="Son">Son</option>
                    <option value="Brother">Brother</option>
                    <option value="Sister">Sister</option>
                    <option value="Grandchild">Grandchild</option>
                    <option value="Spouse">Spouse</option>
                    <option value="Caregiver">Caregiver</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase">Preferred Display Name:</label>
                  <input
                    type="text"
                    value={memberPrefName}
                    onChange={(e) => setMemberPrefName(e.target.value)}
                    placeholder="e.g. Priya (Daughter)"
                    className="border border-[#EBE7DF] rounded-xl p-3 text-sm bg-white font-bold"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase">Select Photo:</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="border border-[#EBE7DF] rounded-xl p-2.5 text-xs bg-white cursor-pointer"
                  />
                </div>
              </div>

              {memberPhoto && (
                <div className="flex items-center gap-4 mt-2">
                  <span className="text-xs font-bold text-slate-500 uppercase">Preview:</span>
                  <img
                    src={memberPhoto}
                    alt="Upload Preview"
                    className="w-16 h-16 rounded-xl object-cover border border-[#EBE7DF] shadow-sm"
                  />
                </div>
              )}

              <div className="flex justify-end gap-3 mt-2">
                <button
                  type="button"
                  onClick={() => setShowMemberForm(false)}
                  className="bg-white hover:bg-slate-50 border border-[#EBE7DF] text-slate-700 font-bold px-6 py-2.5 rounded-xl text-sm transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-teal-600 hover:bg-teal-700 text-white font-extrabold px-6 py-2.5 rounded-xl text-sm shadow-sm transition-all cursor-pointer"
                >
                  Save Member
                </button>
              </div>
            </form>
          )}

          {/* List of Family Members */}
          {familyMembers.length === 0 ? (
            <p className="text-slate-400 text-center py-6 text-sm italic">No family members configured for memory support yet.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {familyMembers.map((member) => (
                <div key={member.id} className="bg-slate-50 border border-[#EBE7DF] rounded-2xl p-4 flex flex-col gap-4 shadow-sm relative group">
                  <div className="w-full h-40 rounded-xl overflow-hidden bg-white border border-[#EBE7DF]">
                    {member.photo_url ? (
                      <img
                        src={member.photo_url}
                        alt={member.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-4xl bg-teal-50">👤</div>
                    )}
                  </div>
                  <div>
                    <h4 className="font-extrabold text-slate-900 text-base">{member.name}</h4>
                    <p className="text-xs font-black text-teal-700 uppercase mt-0.5 tracking-wider">
                      {member.relationship}
                    </p>
                    {member.preferred_display_name && (
                      <p className="text-xs text-slate-500 font-semibold mt-1">Display: "{member.preferred_display_name}"</p>
                    )}
                  </div>
                  <div className="flex gap-2 mt-auto">
                    <button
                      onClick={() => handleStartEditMember(member)}
                      className="flex-1 bg-white hover:bg-slate-100 border border-[#EBE7DF] text-slate-700 text-xs font-bold py-2 rounded-lg shadow-sm transition-all cursor-pointer"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteFamilyMember(member.id)}
                      className="flex-1 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 text-xs font-bold py-2 rounded-lg shadow-sm transition-all cursor-pointer"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}