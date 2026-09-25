import React, { useState } from "react";

const BACKEND_URL = "http://127.0.0.1:8000";

const LANGUAGES_LIST = [
  "English", "Assamese", "Bengali", "Meitei", "Khasi", "Mizo", "Nagamese", "Nepali", "Garo", "Hindi"
];

export default function Login({ onLoginSuccess }) {
  const [step, setStep] = useState("role_selection"); // role_selection, credentials
  const [selectedRole, setSelectedRole] = useState(null); // patient, caregiver, doctor
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedLang, setSelectedLang] = useState("English");

  const handleRoleSelect = (role) => {
    setSelectedRole(role);
    setError("");
    if (role === "doctor") {
      setEmail("doctor@smritisetu.in");
      setPassword("doctor123");
    } else if (role === "caregiver") {
      setEmail("caregiver@smritisetu.in");
      setPassword("caregiver123");
    } else if (role === "patient") {
      setEmail("priya.das@smritisetu.in");
      setPassword("patient123");
    }
    setStep("credentials");
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch(`${BACKEND_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || "Invalid email or password");
      }

      const userData = await res.json();

      // Check role authorization
      if (selectedRole === "doctor" && userData.role !== "doctor") {
        throw new Error("Unauthorized access. This account does not have clinician privileges.");
      }
      if (selectedRole === "caregiver" && userData.role !== "caregiver") {
        throw new Error("Unauthorized access. This account is not registered as a caregiver.");
      }
      if (selectedRole === "patient" && userData.role !== "patient") {
        throw new Error("Unauthorized access. This account is not registered as a patient.");
      }

      // Successful login
      onLoginSuccess(userData, selectedRole, selectedLang);
    } catch (err) {
      console.error(err);
      setError(err.message || "Invalid email or password");
    } finally {
      setLoading(false);
    }
  };

  const speakText = async (text, lang) => {
    try {
      const speakRes = await fetch(`${BACKEND_URL}/tts/speak`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, language: lang })
      });
      if (speakRes.ok) {
        const audioBlob = await speakRes.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);
        audio.play().catch(err => console.warn("Autoplay blocked:", err));
      }
    } catch (e) {
      console.error("TTS failed:", e);
    }
  };

  if (step === "role_selection") {
    return (
      <div className="min-h-screen bg-[#FDFBF7] flex flex-col justify-center items-center p-4 sm:p-6 font-sans select-none">
        <div className="max-w-xl w-full bg-white rounded-[2rem] shadow-sm p-8 sm:p-12 border border-[#EBE7DF] text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-teal-50 text-teal-600 text-4xl mb-4 shadow-sm">
            🧠
          </div>
          <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">SmritiSetu</h1>
          <p className="text-slate-600 mt-3 text-lg font-medium max-w-sm mx-auto leading-relaxed">
            Supporting memory, connection and everyday well-being.
          </p>
          
          <h2 className="text-sm font-black text-slate-400 mt-10 mb-6 uppercase tracking-widest">Choose Your Profile</h2>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Patient Card */}
            <button
              onClick={() => {
                handleRoleSelect("patient");
                speakText("Welcome. Please enter your patient credentials.", selectedLang);
              }}
              className="group bg-[#F5F8F7] hover:bg-[#EBF2F0] border-2 border-transparent hover:border-teal-500/30 rounded-2xl p-6 transition-all active:scale-95 flex flex-col items-center gap-3 cursor-pointer shadow-sm"
            >
              <span className="text-4xl">👵</span>
              <span className="font-extrabold text-slate-800 group-hover:text-teal-800 text-lg">Patient</span>
            </button>
            
            {/* Caregiver Card */}
            <button
              onClick={() => handleRoleSelect("caregiver")}
              className="group bg-[#F6F6F9] hover:bg-[#EEEDF5] border-2 border-transparent hover:border-indigo-500/30 rounded-2xl p-6 transition-all active:scale-95 flex flex-col items-center gap-3 cursor-pointer shadow-sm"
            >
              <span className="text-4xl">👩‍⚕️</span>
              <span className="font-extrabold text-slate-800 group-hover:text-indigo-800 text-lg">Caregiver</span>
            </button>
            
            {/* Doctor Card */}
            <button
              onClick={() => handleRoleSelect("doctor")}
              className="group bg-[#F4F8FA] hover:bg-[#EBF3F7] border-2 border-transparent hover:border-sky-500/30 rounded-2xl p-6 transition-all active:scale-95 flex flex-col items-center gap-3 cursor-pointer shadow-sm"
            >
              <span className="text-4xl">🏥</span>
              <span className="font-extrabold text-slate-800 group-hover:text-sky-800 text-lg">Doctor</span>
            </button>
          </div>
          
          {/* Language selector on login screen */}
          <div className="mt-10 pt-8 border-t border-slate-100 flex flex-col items-center gap-2">
            <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Choose Language</span>
            <select
              value={selectedLang}
              onChange={(e) => setSelectedLang(e.target.value)}
              className="bg-slate-50 border border-[#EBE7DF] rounded-xl px-4 py-2 font-bold text-slate-700 text-sm focus:outline-none"
            >
              {LANGUAGES_LIST.map((l) => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>
          </div>

        </div>
      </div>
    );
  }

  // Credentials Step
  return (
    <div className="min-h-screen bg-[#FDFBF7] flex flex-col justify-center items-center p-4 sm:p-6 font-sans">
      <div className="max-w-md w-full bg-white rounded-[2rem] shadow-sm p-8 sm:p-10 border border-[#EBE7DF]">
        
        {/* Back button */}
        <button
          onClick={() => setStep("role_selection")}
          className="text-slate-400 hover:text-slate-600 font-bold text-sm flex items-center gap-1 mb-6 cursor-pointer"
        >
          ← Change Role
        </button>

        <h2 className="text-3xl font-black text-slate-800 mb-2 capitalize">
          {selectedRole} Login
        </h2>
        <p className="text-slate-400 text-sm mb-6">Enter your authorized account credentials.</p>

        {error && (
          <div className="bg-rose-100 border border-rose-300 text-rose-700 p-4 rounded-xl mb-6 text-sm font-semibold">
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleLoginSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full border-2 border-slate-200 rounded-xl p-3 focus:outline-none focus:border-teal-500 font-bold text-slate-800"
              placeholder="e.g. user@smritisetu.in"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full border-2 border-slate-200 rounded-xl p-3 focus:outline-none focus:border-teal-500 font-bold text-slate-800"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full font-black py-4 rounded-xl text-lg transition-all active:scale-95 cursor-pointer ${
              selectedRole === "patient" ? "bg-teal-600 hover:bg-teal-700 text-white shadow-sm" :
              selectedRole === "caregiver" ? "bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm" :
              "bg-sky-600 hover:bg-sky-700 text-white shadow-sm"
            } ${loading ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            {loading ? "Authenticating..." : "Login Securely"}
          </button>
        </form>

        {/* Demo Helper Info */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mt-6">
          <span className="text-xs font-bold text-slate-500 uppercase block mb-1">Authenticated Roles:</span>
          <p className="text-xs text-slate-500 font-medium">
            {selectedRole === "patient" ? "Enter your registered patient email and password to access your personal dashboard." :
             selectedRole === "caregiver" ? "Caregiver: caregiver@smritisetu.in (password: caregiver123)" :
             "Clinician: doctor@smritisetu.in (password: doctor123)"}
          </p>
        </div>

      </div>
    </div>
  );
}
