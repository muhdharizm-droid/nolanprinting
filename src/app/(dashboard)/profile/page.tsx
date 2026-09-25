"use client";

import React, { useState, useEffect } from "react";
import {
  User,
  Shield,
  Phone,
  MapPin,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  ShoppingCart,
  Save,
} from "lucide-react";
import { useI18n } from "@/lib/i18n/context";
import { translateRole, translateGender, translateRace } from "@/lib/i18n/translations";
import { formatDate } from "@/lib/utils";

interface UserProfile {
  id: number;
  username: string;
  fullName: string;
  role: "owner" | "cashier" | "stock_handler";
  phoneNumber: string;
  gender: string;
  race: string;
  address: string;
  createdAt: string;
  _count?: { sales: number };
}

const roleStyles: Record<string, { badge: string; label: string; icon: string }> = {
  owner: {
    badge: "bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800",
    label: "Store Owner (Admin)",
    icon: "👑",
  },
  cashier: {
    badge: "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800",
    label: "Cashier",
    icon: "💳",
  },
  stock_handler: {
    badge: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800",
    label: "Stock Manager",
    icon: "📦",
  },
};

export default function ProfilePage() {
  const { t, language } = useI18n();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Form State
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [gender, setGender] = useState("Male");
  const [race, setRace] = useState("Malay");
  const [address, setAddress] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Alerts
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/staff?self=true");
      const data = await res.json();

      if (data.success && data.staff && data.staff.length > 0) {
        const u = data.staff[0];
        setProfile(u);
        setFullName(u.fullName || "");
        setPhone(u.phoneNumber || "");
        setGender(u.gender || "Male");
        setRace(u.race || "Malay");
        setAddress(u.address || "");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");
    setSaving(true);

    try {
      const payload: any = {
        fullName: fullName.trim(),
        phoneNumber: phone.trim(),
        gender,
        race,
        address: address.trim(),
      };

      if (password.trim()) {
        if (password.trim().length < 4) {
          setErrorMsg("New password must be at least 4 characters long.");
          setSaving(false);
          return;
        }
        payload.password = password.trim();
      }

      const res = await fetch("/api/staff", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to update profile.");
      }

      setSuccessMsg(data.message || "Your profile details have been saved successfully!");
      setPassword("");
      setShowPassword(false);
      setTimeout(() => setSuccessMsg(""), 5000);
      fetchProfile();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to save profile changes.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-xs text-slate-400 animate-pulse">
        Loading profile details...
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 rounded-xl flex items-center justify-center font-bold">
            <User className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-800 dark:text-white">
              {t("profile")}
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {t("profile_subtitle")}
            </p>
          </div>
        </div>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl text-emerald-800 dark:text-emerald-300 font-bold flex items-center gap-2 text-xs shadow-sm">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl text-rose-800 dark:text-rose-300 font-bold flex items-center gap-2 text-xs shadow-sm">
          <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {profile && (
        <>
          {/* Profile Overview Dossier Card */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 transition-colors">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-blue-600 text-white font-black rounded-2xl flex items-center justify-center text-2xl shadow-md shadow-blue-600/30">
                  {profile.fullName?.[0]?.toUpperCase() || "U"}
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-800 dark:text-white">
                    {profile.fullName}
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                    @{profile.username}
                  </p>
                  <span
                    className={`inline-block mt-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${
                      roleStyles[profile.role]?.badge || "bg-slate-100"
                    }`}
                  >
                    {roleStyles[profile.role]?.icon || "👤"} {translateRole(profile.role, language)}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
                <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700">
                  <ShoppingCart className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <span>
                    <strong className="text-slate-800 dark:text-white">
                      {profile._count?.sales || 0}
                    </strong>{" "}
                    {t("sales_processed")}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700">
                  <Calendar className="w-4 h-4 text-slate-400" />
                  <span>{t("registered_on")} {formatDate(profile.createdAt)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Edit Profile Form */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 transition-colors">
            <h3 className="font-bold text-sm text-slate-800 dark:text-white flex items-center gap-2">
              <Shield className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>{t("personal_details_security")}</span>
            </h3>

            <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {t("full_legal_name")} *
                  </label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-semibold text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {t("system_username_locked")}
                  </label>
                  <input
                    type="text"
                    disabled
                    value={profile.username}
                    className="w-full p-2.5 bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-slate-500 dark:text-slate-400 cursor-not-allowed"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {t("phone_number")}
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 012-3456789"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-semibold text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {t("gender")}
                  </label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-semibold text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                  >
                    <option value="Male">{t("male")}</option>
                    <option value="Female">{t("female")}</option>
                    <option value="Other">{t("other")}</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {t("race")}
                  </label>
                  <select
                    value={race}
                    onChange={(e) => setRace(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-semibold text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                  >
                    <option value="Malay">{t("malay")}</option>
                    <option value="Chinese">{t("chinese")}</option>
                    <option value="Indian">{t("indian")}</option>
                    <option value="Other">{t("other")}</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {t("residential_address")}
                </label>
                <textarea
                  rows={2}
                  placeholder="Enter residential address..."
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-semibold text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {t("change_password_hint")}
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter new password (min 4 characters)"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full p-2.5 pr-10 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-semibold text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 py-2.5 px-6 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-xl font-bold transition shadow-md shadow-blue-600/20 disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  <span>{saving ? t("saving_changes") : t("save_profile_details")}</span>
                </button>
              </div>
            </form>
          </div>
        </>
      )}
    </div>
  );
}

