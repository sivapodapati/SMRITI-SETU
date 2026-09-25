import React, { useState } from "react";
import { getTranslation } from "../utils/localizations";

const BACKEND_URL = "http://127.0.0.1:8000";

const LANGUAGES_LIST = [
  "English", "Assamese", "Bengali", "Meitei", "Khasi", "Mizo", "Nagamese", "Nepali", "Garo", "Hindi"
];

const STATES_LIST = [
  "Assam", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Tripura", "Sikkim", "Arunachal Pradesh"
];

const AVATAR_OPTIONS = [
  "👵", "👴", "🧓", "👩‍🦳", "👨‍🦳", "🌸", "🌿", "☕", "🏔️", "🦏"
];

export default function PatientProfileModal({ patient, language, onClose, onProfileUpdated }) {
  const [name, setName] = useState(patient?.name || "");
  const [age, setAge] = useState(patient?.age || 68);
  const [gender, setGender] = useState(patient?.gender || "Female");
  const [state, setState] = useState(patient?.state || "Assam");
  const [selectedLang, setSelectedLang] = useState(patient?.language || language || "English");
  const [emergencyContact, setEmergencyContact] = useState(patient?.emergency_contact || "");
  const [profilePhoto, setProfilePhoto] = useState(patient?.profile_photo || "👵");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMsg("");
    try {
      const res = await fetch(`${BACKEND_URL}/patients/me/profile?patient_id=${patient.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          age: Number(age),
          gender,
          state,
          language: selectedLang,
          emergency_contact: emergencyContact,
          profile_photo: profilePhoto
        })
      });

      if (res.ok) {
        const updated = await res.json();
        setMsg("✅ Profile updated successfully!");
        setTimeout(() => {
          if (onProfileUpdated) onProfileUpdated(updated);
          onClose();
        }, 800);
      } else {
        setMsg("❌ Failed to update profile.");
      }
    } catch (err) {
      console.error(err);
      setMsg("❌ Network error saving profile.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-[2rem] max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-[#EBE7DF] max-h-[90vh] overflow-y-auto">
        
        {/* Modal Header */}
        <div className="flex justify-between items-center pb-4 border-b border-slate-100 mb-6">
          <div className="flex items-center gap-3">
            <span className="text-3xl p-2 bg-teal-50 rounded-2xl border border-teal-100">{profilePhoto}</span>
            <div>
              <h2 className="text-2xl font-black text-slate-800">
                {getTranslation(selectedLang, "patient_profile") || "Patient Profile"}
              </h2>
              <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider">
                {patient?.name} • ID #{patient?.id}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 w-10 h-10 rounded-full flex items-center justify-center font-black text-lg transition-all cursor-pointer"
          >
            ✕
          </button>
        </div>

        {msg && (
          <div className="p-3 mb-4 rounded-xl text-center font-bold text-sm bg-teal-50 text-teal-800 border border-teal-200">
            {msg}
          </div>
        )}

        <form onSubmit={handleSave} className="flex flex-col gap-4">
          
          {/* Avatar Selector */}
          <div>
            <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-2">
              Choose Avatar
            </label>
            <div className="flex flex-wrap gap-2">
              {AVATAR_OPTIONS.map((av) => (
                <button
                  type="button"
                  key={av}
                  onClick={() => setProfilePhoto(av)}
                  className={`w-11 h-11 text-2xl rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                    profilePhoto === av ? "bg-teal-600 text-white scale-110 shadow-md ring-2 ring-teal-400" : "bg-slate-50 hover:bg-slate-100 border border-slate-200"
                  }`}
                >
                  {av}
                </button>
              ))}
            </div>
          </div>

          {/* Name */}
          <div>
            <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-1">
              Full Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl p-3 font-bold text-slate-800 focus:outline-none focus:border-teal-500"
            />
          </div>

          {/* Age & Gender Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-1">
                Age
              </label>
              <input
                type="number"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                min="50"
                max="115"
                required
                className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl p-3 font-bold text-slate-800 focus:outline-none focus:border-teal-500"
              />
            </div>
            <div>
              <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-1">
                Gender
              </label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl p-3 font-bold text-slate-800 focus:outline-none focus:border-teal-500"
              >
                <option value="Female">Female</option>
                <option value="Male">Male</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          {/* State & Language Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-1">
                State / Region
              </label>
              <select
                value={state}
                onChange={(e) => setState(e.target.value)}
                className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl p-3 font-bold text-slate-800 focus:outline-none focus:border-teal-500"
              >
                {STATES_LIST.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-1">
                Preferred Language
              </label>
              <select
                value={selectedLang}
                onChange={(e) => setSelectedLang(e.target.value)}
                className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl p-3 font-bold text-slate-800 focus:outline-none focus:border-teal-500"
              >
                {LANGUAGES_LIST.map((l) => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Emergency Contact */}
          <div>
            <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-1">
              Caregiver Emergency Contact
            </label>
            <input
              type="text"
              value={emergencyContact}
              onChange={(e) => setEmergencyContact(e.target.value)}
              placeholder="e.g. +91 9876543210"
              className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl p-3 font-bold text-slate-800 focus:outline-none focus:border-teal-500"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 mt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3.5 rounded-xl transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 bg-teal-600 hover:bg-teal-700 text-white font-black py-3.5 rounded-xl shadow-md transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
