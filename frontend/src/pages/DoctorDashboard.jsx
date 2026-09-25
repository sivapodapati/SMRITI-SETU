import React, { useEffect, useState, useRef } from "react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

// ========================================================
// GLOBAL OKLCH COLOR RESOLVER FOR HTML2CANVAS & BROWSER INTERFACES
// Resolves oklch(...) colors to standard rgb(...) values globally to prevent crashes.
// ========================================================
let isResolvingOklch = false;
const oklchColorCache = {};

const resolveOklchGlobal = (match) => {
  if (oklchColorCache[match]) return oklchColorCache[match];
  try {
    const tempEl = document.createElement("div");
    tempEl.style.color = match;
    document.body.appendChild(tempEl);
    const computedColor = window.getComputedStyle(tempEl).color;
    document.body.removeChild(tempEl);
    oklchColorCache[match] = computedColor || "rgb(120, 120, 120)";
    return oklchColorCache[match];
  } catch (e) {
    return "rgb(120, 120, 120)";
  }
};

try {
  const originalGetPropertyValue = CSSStyleDeclaration.prototype.getPropertyValue;
  CSSStyleDeclaration.prototype.getPropertyValue = function(property) {
    const val = originalGetPropertyValue.call(this, property);
    if (typeof val === "string" && val.includes("oklch") && !isResolvingOklch) {
      isResolvingOklch = true;
      const rgb = resolveOklchGlobal(val);
      isResolvingOklch = false;
      return rgb;
    }
    return val;
  };

  const colorProps = ["color", "backgroundColor", "borderColor", "borderTopColor", "borderBottomColor", "borderLeftColor", "borderRightColor", "fill", "stroke"];
  colorProps.forEach((prop) => {
    const desc = Object.getOwnPropertyDescriptor(CSSStyleDeclaration.prototype, prop);
    if (desc && desc.get) {
      const originalGet = desc.get;
      Object.defineProperty(CSSStyleDeclaration.prototype, prop, {
        get() {
          const val = originalGet.call(this);
          if (typeof val === "string" && val.includes("oklch") && !isResolvingOklch) {
            isResolvingOklch = true;
            const rgb = resolveOklchGlobal(val);
            isResolvingOklch = false;
            return rgb;
          }
          return val;
        },
        set: desc.set,
        configurable: true
      });
    }
  });
} catch (e) {
  console.error("Failed to inject global CSSStyleDeclaration prototype patches:", e);
}

const BACKEND_URL = "http://127.0.0.1:8000";

const GAME_NAMES = {
  1: "Remember the Sequence",
  2: "Familiar Landmark & Picture Match",
  3: "Traditional Recipe Sequencer",
  4: "Folk Rhythm Match",
  5: "Mood & Memory Stories",
  6: "Family Member Recognition"
};

export default function DoctorDashboard() {
  const [selectedPatientId, setSelectedPatientId] = useState(2); // Default Priya Das
  const [patientInfo, setPatientInfo] = useState(null);
  const [performance, setPerformance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [gameLevels, setGameLevels] = useState({});
  const [patientsList, setPatientsList] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [adherence, setAdherence] = useState(null);
  const [recommendation, setRecommendation] = useState(null);
  
  // Early Warning Deterioration state
  const [deteriorationInfo, setDeteriorationInfo] = useState(null);

  // Regimen Lock Form states
  const [maxCeiling, setMaxCeiling] = useState(10);
  const [targetLoad, setTargetLoad] = useState(4);
  const [updatingRegimen, setUpdatingRegimen] = useState(false);
  const [regimenSuccessMsg, setRegimenSuccessMsg] = useState("");
  const [downloadingPDF, setDownloadingPDF] = useState(false);

  const reportRef = useRef(null);

  const downloadPatientPDF = async () => {
    if (!selectedPatientId) return;
    setDownloadingPDF(true);
    setError("");
    try {
      const res = await fetch(`${BACKEND_URL}/doctor/patients/${selectedPatientId}/report`);
      if (!res.ok) {
        throw new Error("Unable to generate report. Please try again.");
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      const patientName = patientInfo?.name ? patientInfo.name.replace(/\s+/g, "_") : "Patient";
      link.setAttribute("download", `SmritiSetu_Patient_${patientName}_Report.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (e) {
      console.error("PDF download error:", e);
      setError("Unable to generate report. Please try again.");
    } finally {
      setDownloadingPDF(false);
    }
  };

  // Fetch patients list on mount
  useEffect(() => {
    const fetchPatients = async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/patients/`);
        if (res.ok) {
          const list = await res.json();
          setPatientsList(list);
        }
      } catch (e) {
        console.error("Failed to load patients:", e);
      }
    };
    fetchPatients();
  }, []);

  const loadDoctorData = async (pId) => {
    try {
      setLoading(true);
      setError("");
      setRegimenSuccessMsg("");

      // Patient Info
      const pRes = await fetch(`${BACKEND_URL}/patients/${pId}`);
      if (pRes.ok) {
        const info = await pRes.json();
        setPatientInfo(info);
        setMaxCeiling(info.max_difficulty_ceiling || 10);
        setTargetLoad(info.target_sessions || 4);
      }

      // Performance records
      const perfRes = await fetch(`${BACKEND_URL}/performance/`);
      if (perfRes.ok) {
        const allPerf = await perfRes.json();
        const pPerf = allPerf.filter((item) => Number(item.patient_id) === pId);
        setPerformance(pPerf);
      }

      // Game levels config
      const levelsMap = {};
      for (let gId = 1; gId <= 5; gId++) {
        try {
          const res = await fetch(`${BACKEND_URL}/adaptive/patient/${pId}/game/${gId}`);
          if (res.ok) {
            const data = await res.json();
            levelsMap[gId] = data;
          }
        } catch (e) {}
      }
      setGameLevels(levelsMap);

      // Alerts
      const alertsRes = await fetch(`${BACKEND_URL}/alerts/?patient_id=${pId}`);
      if (alertsRes.ok) {
        const data = await alertsRes.json();
        setAlerts(data);
      }

      // Adherence stats
      const adherenceRes = await fetch(`${BACKEND_URL}/tasks/adherence/${pId}`);
      if (adherenceRes.ok) {
        const data = await adherenceRes.json();
        setAdherence(data);
      }

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

      // Fetch cognitive deterioration trend analysis
      try {
        const detRes = await fetch(`${BACKEND_URL}/doctor/cognitive-deterioration/${pId}`);
        if (detRes.ok) {
          const detData = await detRes.json();
          setDeteriorationInfo(detData.deterioration_analysis);
        }
      } catch (e) {
        console.error("Deterioration API failed:", e);
      }

    } catch (err) {
      console.error(err);
      setError("Failed to load clinical analytics.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDoctorData(selectedPatientId);
  }, [selectedPatientId]);

  const handleUpdateRegimen = async (e) => {
    e.preventDefault();
    setUpdatingRegimen(true);
    setRegimenSuccessMsg("");
    try {
      const res = await fetch(`${BACKEND_URL}/doctor/regimen-lock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patient_id: selectedPatientId,
          max_difficulty_ceiling: Number(maxCeiling),
          target_sessions: Number(targetLoad)
        })
      });

      if (res.ok) {
        setRegimenSuccessMsg("Clinician regimen and difficulty ceiling locked successfully!");
        // Update patientInfo state locally
        setPatientInfo(prev => ({
          ...prev,
          max_difficulty_ceiling: Number(maxCeiling),
          target_sessions: Number(targetLoad)
        }));
      } else {
        setError("Failed to update clinician lock settings.");
      }
    } catch (err) {
      console.error("Regimen lock submit failed:", err);
      setError("Failed to update clinician lock settings.");
    } finally {
      setUpdatingRegimen(false);
    }
  };

  // PDF Export
  const exportReportPDF = () => {
    const input = reportRef.current;
    if (!input) return;

    const originalCreateElement = document.createElement;
    
    // Override createElement to intercept iframe creation and patch its prototypes
    document.createElement = function(tagName, options) {
      const el = originalCreateElement.call(document, tagName, options);
      if (tagName.toLowerCase() === "iframe") {
        Object.defineProperty(el, "contentWindow", {
          get() {
            const win = Object.getOwnPropertyDescriptor(HTMLIFrameElement.prototype, "contentWindow").get.call(el);
            if (win && !win._patchedForOklch) {
              win._patchedForOklch = true;
              try {
                const iframeOriginalGetPropertyValue = win.CSSStyleDeclaration.prototype.getPropertyValue;
                win.CSSStyleDeclaration.prototype.getPropertyValue = function(property) {
                  const val = iframeOriginalGetPropertyValue.call(this, property);
                  if (typeof val === "string" && val.includes("oklch") && !isResolvingOklch) {
                    isResolvingOklch = true;
                    const rgb = resolveOklchGlobal(val);
                    isResolvingOklch = false;
                    return rgb;
                  }
                  return val;
                };

                const colorProps = ["color", "backgroundColor", "borderColor", "borderTopColor", "borderBottomColor", "borderLeftColor", "borderRightColor", "fill", "stroke"];
                colorProps.forEach((prop) => {
                  const desc = Object.getOwnPropertyDescriptor(win.CSSStyleDeclaration.prototype, prop);
                  if (desc && desc.get) {
                    const originalGet = desc.get;
                    Object.defineProperty(win.CSSStyleDeclaration.prototype, prop, {
                      get() {
                        const val = originalGet.call(this);
                        if (typeof val === "string" && val.includes("oklch") && !isResolvingOklch) {
                          isResolvingOklch = true;
                          const rgb = resolveOklchGlobal(val);
                          isResolvingOklch = false;
                          return rgb;
                        }
                        return val;
                      },
                      set: desc.set,
                      configurable: true
                    });
                  }
                });
              } catch (e) {
                console.error("Failed to patch iframe CSSStyleDeclaration prototype:", e);
              }
            }
            return win;
          },
          configurable: true
        });
      }
      return el;
    };

    const capturePromise = html2canvas(input, { scale: 2 });
    
    // Restore createElement synchronously after cloning
    document.createElement = originalCreateElement;

    capturePromise.then((canvas) => {
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const imgWidth = 210; // A4 size width in mm
      const pageHeight = 297; // A4 size height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }
      
      pdf.save(`SmritiSetu_Clinical_Summary_${patientInfo?.name || "Patient"}.pdf`);
    }).catch((err) => {
      console.error("html2canvas PDF generation failed:", err);
    });
  };

  const gamesCompleted = performance.length;
  const scoreValues = performance.filter((item) => item.score != null).map((item) => Number(item.score));
  const averageScore = scoreValues.length > 0
    ? Math.round(scoreValues.reduce((sum, val) => sum + val, 0) / scoreValues.length)
    : 0;

  const accuracyValues = performance
    .filter((item) => item.attempts != null && item.correct_answers != null && Number(item.attempts) > 0)
    .map((item) => (Number(item.correct_answers) / Number(item.attempts)) * 100);
  const averageAccuracy = accuracyValues.length > 0
    ? Math.round(accuracyValues.reduce((sum, val) => sum + val, 0) / accuracyValues.length)
    : 0;

  const responseTimeValues = performance.filter((item) => item.response_time != null).map((item) => Number(item.response_time));
  const averageResponseTime = responseTimeValues.length > 0
    ? (responseTimeValues.reduce((sum, val) => sum + val, 0) / responseTimeValues.length).toFixed(1)
    : "0.0";

  const engagementValues = performance.filter((item) => item.engagement_score != null).map((item) => Number(item.engagement_score));
  const averageEngagement = engagementValues.length > 0
    ? Math.round(engagementValues.reduce((sum, val) => sum + val, 0) / engagementValues.length)
    : 0;

  if (loading) {
    return (
      <div className="p-8 text-center bg-slate-50 min-h-screen">
        <h2 className="text-xl font-bold text-slate-700">Loading Clinical Monitor...</h2>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDFBF7] p-4 sm:p-6 font-sans select-none">
      <div className="max-w-7xl mx-auto">
        
        {/* Clinician Banner */}
        <div className="bg-[#1E293B] text-white rounded-2xl p-6 mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-sm border border-slate-700">
          <div>
            <h1 className="text-2xl font-extrabold flex items-center gap-2">🏥 Clinician Neurological & Session Summary</h1>
            <p className="text-slate-350 text-sm mt-1">
              Decision-support & tracking interface for elderly cognitive care. This platform does not claim clinical validation or diagnose dementia.
            </p>
          </div>
          
          <div className="flex flex-wrap items-center gap-3 bg-white/10 p-3 rounded-xl border border-white/20">
            <span className="font-semibold text-slate-200 text-sm">Select Patient:</span>
            <select
              value={selectedPatientId}
              onChange={(e) => setSelectedPatientId(Number(e.target.value))}
              className="bg-slate-800 border-none rounded-lg p-2 font-bold text-white text-sm focus:outline-none cursor-pointer"
            >
              {patientsList.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>

            <button
              onClick={downloadPatientPDF}
              disabled={downloadingPDF}
              className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg text-xs font-bold transition-all shadow cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
            >
              📄 {downloadingPDF ? "Generating Report..." : "Download Patient Report"}
            </button>
          </div>
        </div>

        {error && <div className="bg-red-100 border border-red-300 text-red-700 p-5 rounded-2xl mb-6">⚠️ {error}</div>}

        {/* Dynamic PDF Report Wrapper */}
        <div ref={reportRef} className="bg-[#FDFBF7] p-1">
          
          <div className="bg-white rounded-[2rem] shadow-sm p-6 mb-6 border border-[#EBE7DF] flex flex-col md:flex-row justify-between gap-6">
            <div className="md:col-span-2">
              <h2 className="text-lg font-bold text-slate-900 mb-4 uppercase tracking-wider">Patient Demographics</h2>
              <div className="grid grid-cols-2 gap-x-12 gap-y-2 text-slate-650 text-sm">
                <p><span className="font-bold text-slate-900">Name:</span> {patientInfo?.name}</p>
                <p><span className="font-bold text-slate-900">Age:</span> {patientInfo?.age || 68} years</p>
                <p><span className="font-bold text-slate-900">Gender:</span> {patientInfo?.gender || "Female"}</p>
                <p><span className="font-bold text-slate-900">Preferred Language:</span> {patientInfo?.language}</p>
                <p><span className="font-bold text-slate-900">NER State:</span> {patientInfo?.state}</p>
                <p><span className="font-bold text-slate-900">Emergency Contact:</span> {patientInfo?.emergency_contact || "N/A"}</p>
              </div>
            </div>
            
            {/* Clinician Regimen Lock control dashboard */}
            <div className="border border-[#EBE7DF] rounded-2xl p-4 bg-slate-50 min-w-[280px]">
              <h3 className="text-sm font-black text-slate-800 mb-3 flex items-center gap-1.5">🔑 Clinician Regimen controller</h3>
              {regimenSuccessMsg && <p className="text-xs text-emerald-700 font-bold mb-2">{regimenSuccessMsg}</p>}
              <form onSubmit={handleUpdateRegimen} className="flex flex-col gap-3">
                <div className="flex justify-between items-center gap-4">
                  <label className="text-xs font-bold text-slate-600">Max Difficulty Ceiling:</label>
                  <select
                    value={maxCeiling}
                    onChange={(e) => setMaxCeiling(Number(e.target.value))}
                    className="border border-[#EBE7DF] rounded-lg p-1 text-sm bg-white font-bold cursor-pointer"
                  >
                    {[...Array(10)].map((_, i) => (
                      <option key={i+1} value={i+1}>Level {i+1}</option>
                    ))}
                  </select>
                </div>
                <div className="flex justify-between items-center gap-4">
                  <label className="text-xs font-bold text-slate-600">Daily Target Load:</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={targetLoad}
                    onChange={(e) => setTargetLoad(Number(e.target.value))}
                    className="w-16 border border-[#EBE7DF] rounded-lg p-1 text-center font-bold bg-white"
                  />
                </div>
                <button
                  type="submit"
                  disabled={updatingRegimen}
                  className="w-full bg-slate-800 hover:bg-slate-900 text-white rounded-xl py-2 text-xs font-bold transition-all"
                >
                  {updatingRegimen ? "Saving Locks..." : "Lock Difficulty Ceiling"}
                </button>
              </form>
            </div>
          </div>

          {/* Cognitive Deterioration Trend Tracker */}
          <div className="bg-white rounded-[2rem] shadow-sm p-6 mb-6 border border-[#EBE7DF]">
            <h2 className="text-lg font-bold text-slate-900 mb-3 flex items-center gap-2">⚠️ Cognitive Trend Analysis & Warning Center</h2>
            <p className="text-xs text-slate-500 mb-4">
              Deterioration analysis utilizes Z-score anomaly tracking and linear regression response slopes. Wording strictly follows prototype non-diagnostic guidelines.
            </p>
            {deteriorationInfo ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="p-4 rounded-2xl border flex flex-col justify-center items-center bg-slate-50 text-center">
                  <span className="text-xs font-bold text-slate-400 uppercase">Early Concern Status</span>
                  <span className={`text-xl font-extrabold mt-3 px-3 py-1.5 rounded-full ${
                    deteriorationInfo.status === "REQUIRES_CLINICAL_REVIEW" ? "bg-rose-100 text-rose-800 border border-rose-200" :
                    deteriorationInfo.status === "NEEDS_MONITORING" ? "bg-amber-100 text-amber-800 border border-amber-200" :
                    "bg-emerald-100 text-emerald-800 border border-emerald-200"
                  }`}>
                    {deteriorationInfo.status.replace("_", " ")}
                  </span>
                  <span className="text-[10px] text-slate-400 mt-2">Concern Score: {deteriorationInfo.risk_score}/100</span>
                </div>

                <div className="p-4 rounded-2xl border bg-slate-50">
                  <span className="text-xs font-bold text-slate-400 uppercase block mb-2">Rolling Response Slope</span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-extrabold text-slate-800">
                      {deteriorationInfo.rolling_slope_ms_per_session > 0 ? `+${deteriorationInfo.rolling_slope_ms_per_session}` : deteriorationInfo.rolling_slope_ms_per_session}
                    </span>
                    <span className="text-xs font-bold text-slate-400">ms / session</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-2 font-medium">
                    Trend direction classification: <span className="font-bold text-slate-700">{deteriorationInfo.trend_direction}</span>
                  </p>
                  <p className="text-[10px] text-slate-400 mt-1">Calculated over last {deteriorationInfo.session_count} attempts.</p>
                </div>

                <div className="p-4 rounded-2xl border bg-slate-50 md:col-span-1">
                  <span className="text-xs font-bold text-slate-400 uppercase block mb-2">Observations & Warnings</span>
                  <ul className="list-disc pl-4 text-xs text-slate-650 flex flex-col gap-1 font-medium">
                    {deteriorationInfo.observations.map((obs, idx) => (
                      <li key={idx} className="italic">"{obs}"</li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : (
              <p className="text-slate-400 text-center py-4 text-sm italic">Loading deterioration warning metrics...</p>
            )}
          </div>

          {/* Statistics Widgets */}
          <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-6 mb-6">
            <div className="bg-white rounded-2xl shadow-sm p-5 border border-[#EBE7DF] text-center">
              <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Sessions Logged</p>
              <h2 className="text-3xl font-extrabold text-teal-600 mt-2">{gamesCompleted}</h2>
            </div>
            <div className="bg-white rounded-2xl shadow-sm p-5 border border-[#EBE7DF] text-center">
              <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Average Score</p>
              <h2 className="text-3xl font-extrabold text-emerald-600 mt-2">{averageScore}%</h2>
            </div>
            <div className="bg-white rounded-2xl shadow-sm p-5 border border-[#EBE7DF] text-center">
              <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Avg Accuracy</p>
              <h2 className="text-3xl font-extrabold text-purple-600 mt-2">{averageAccuracy}%</h2>
            </div>
            <div className="bg-white rounded-2xl shadow-sm p-5 border border-[#EBE7DF] text-center">
              <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Avg Reaction Time</p>
              <h2 className="text-3xl font-extrabold text-indigo-600 mt-2">{averageResponseTime}s</h2>
            </div>
            <div className="bg-white rounded-2xl shadow-sm p-5 border border-[#EBE7DF] text-center">
              <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Regimen Adherence</p>
              <h2 className="text-3xl font-extrabold text-amber-600 mt-2">
                {adherence ? `${adherence.completion_percentage}%` : "0%"}
              </h2>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* AI Recommendation Panel */}
            {recommendation && (
              <div className="bg-white rounded-[2rem] shadow-sm p-6 border border-[#EBE7DF]">
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">Observed Cognitive Domains Profile</h3>
                <div className="flex flex-col gap-3">
                  {recommendation.domain_profiles && Object.entries(recommendation.domain_profiles).map(([key, domain]) => {
                    const isDeclining = domain.classification === "declining";
                    const isWeak = domain.classification === "weak";
                    return (
                      <div key={key} className={`p-4 rounded-xl border flex items-center justify-between gap-4 ${
                        isDeclining ? 'bg-rose-50 border-rose-200' :
                        isWeak ? 'bg-amber-50 border-amber-200' :
                        'bg-slate-50 border-slate-200'
                      }`}>
                        <div>
                          <span className="text-slate-800 font-extrabold block text-sm">{domain.domain_name}</span>
                          <span className="text-xs text-slate-500 mt-1 block">Weighted Score: {domain.score}%</span>
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          isDeclining ? 'bg-rose-100 text-rose-800 border border-rose-300' :
                          isWeak ? 'bg-amber-100 text-amber-800 border border-amber-300' :
                          'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        }`}>
                          {domain.classification?.replace("_", " ")}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* AI Recommendation rationale detail */}
            {recommendation && (
              <div className="bg-white rounded-[2rem] shadow-sm p-6 border border-[#EBE7DF] flex flex-col justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">AI-SUPPORTED RECOMMENDATIONS (OBSERVED VALUE GUIDED)</h3>
                  <div className="p-4 bg-slate-50 rounded-2xl border flex flex-col gap-3">
                    <div>
                      <h4 className="text-lg font-extrabold text-slate-800">{recommendation.recommended_game}</h4>
                      <p className="text-xs text-teal-800 font-bold">{recommendation.domain_name}</p>
                    </div>
                    <div className="flex justify-between items-center bg-white p-3 rounded-lg border border-slate-150 text-xs">
                      <div>
                        <span className="text-slate-450 block">Target Level</span>
                        <span className="font-bold text-slate-800">Level {recommendation.recommended_level}</span>
                      </div>
                      <div>
                        <span className="text-slate-450 block">Support level</span>
                        <span className="font-bold text-slate-800 uppercase">{recommendation.support_level}</span>
                      </div>
                      <div>
                        <span className="text-slate-450 block">Confidence</span>
                        <span className="font-bold text-slate-800">{Math.round(recommendation.confidence * 100)}%</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="mt-4">
                  <span className="text-slate-400 text-xs uppercase font-bold block mb-1">Decision Support Rationale</span>
                  <p className="text-xs text-slate-650 font-medium italic">"{recommendation.reason}"</p>
                </div>
              </div>
            )}
          </div>

          {/* Adherence and Task tracking stats */}
          <div className="bg-white rounded-[2rem] shadow-sm p-6 mb-6 border border-[#EBE7DF]">
            <h2 className="text-xl font-bold text-slate-900 mb-4">📅 Routine and Activity Adherence Statistics</h2>
            {adherence ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-center">
                  <p className="text-[#065F46] font-bold text-xs uppercase">Completed Tasks</p>
                  <h3 className="text-3xl font-extrabold text-emerald-700 mt-2">{adherence.completed}</h3>
                </div>
                <div className="p-4 bg-sky-50 border border-sky-200 rounded-xl text-center">
                  <p className="text-sky-850 font-bold text-xs uppercase">Pending Tasks</p>
                  <h3 className="text-3xl font-extrabold text-sky-700 mt-2">{adherence.pending + adherence.in_progress}</h3>
                </div>
                <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-center">
                  <p className="text-[#991B1B] font-bold text-xs uppercase">Missed Tasks</p>
                  <h3 className="text-3xl font-extrabold text-rose-700 mt-2">{adherence.missed}</h3>
                </div>
                <div className="p-4 bg-[#FAF8F5] border border-[#EBE7DF] rounded-xl text-center flex flex-col justify-center">
                  <p className="text-slate-700 font-bold text-xs uppercase">Adherence Ratio</p>
                  <h3 className="text-2xl font-black text-slate-805 mt-2">{adherence.completion_percentage}%</h3>
                </div>
              </div>
            ) : (
              <p className="text-slate-400 text-center py-4 text-sm italic">No task tracking statistics available.</p>
            )}
          </div>

          {/* Historical Logs */}
          <div className="bg-white rounded-[2rem] shadow-sm p-6 border border-[#EBE7DF] mb-6">
            <h2 className="text-xl font-bold text-slate-900 mb-4">📊 Historical Cognitive Logs</h2>
            {performance.length === 0 ? (
              <p className="text-slate-400 text-center py-6 text-sm italic">No historical records logged yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b text-slate-500 text-xs uppercase tracking-wider">
                      <th className="py-3">Activity Type</th>
                      <th className="py-3">Current Level</th>
                      <th className="py-3">Session Score</th>
                      <th className="py-3">Response Time</th>
                      <th className="py-3">Telemetry Remarks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y text-slate-700 text-sm">
                    {performance.slice().reverse().map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/50">
                        <td className="py-3 font-bold">{GAME_NAMES[item.game_id]}</td>
                        <td className="py-3">
                          <span className="bg-slate-100 px-2.5 py-1 border border-[#EBE7DF] rounded-full text-xs font-bold">Level {item.difficulty}</span>
                        </td>
                        <td className="py-3 font-bold text-teal-650">{item.score}%</td>
                        <td className="py-3 font-semibold">{item.response_time}s</td>
                        <td className="py-3 text-slate-500 italic max-w-xs truncate">{item.reason || "N/A"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="mt-8 text-center text-xs text-slate-400 uppercase font-semibold">
            Generated by SmritiSetu Cognitive Assistance platform | Date: {new Date().toLocaleDateString()}
          </div>
        </div>

      </div>
    </div>
  );
}
