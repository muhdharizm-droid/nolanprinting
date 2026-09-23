"use client";

import React, { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Lock, User, Globe, AlertCircle, ArrowRight } from "lucide-react";
import { useI18n } from "@/lib/i18n/context";

export default function LoginPage() {
  const router = useRouter();
  const { language, setLanguage, t } = useI18n();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.message || "Invalid credentials.");
      } else {
        router.push("/home");
        router.refresh();
      }
    } catch (err) {
      setError("Unable to connect to server. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-blue-950 flex flex-col justify-center items-center p-4">
      {/* Language Switcher Bar */}
      <div className="absolute top-6 right-6 flex items-center gap-2 bg-white/10 backdrop-blur-md rounded-full px-3 py-1.5 text-xs text-white border border-white/20">
        <Globe className="w-3.5 h-3.5 text-blue-300" />
        <button
          onClick={() => setLanguage("en")}
          className={`px-2 py-0.5 rounded transition ${language === "en" ? "bg-blue-600 font-bold" : "hover:text-blue-200"}`}
        >
          English
        </button>
        <span className="text-white/40">|</span>
        <button
          onClick={() => setLanguage("ms")}
          className={`px-2 py-0.5 rounded transition ${language === "ms" ? "bg-blue-600 font-bold" : "hover:text-blue-200"}`}
        >
          Bahasa Melayu
        </button>
      </div>

      {/* Main Login Card */}
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-100">
        {/* Header Header Banner */}
        <div className="bg-gradient-to-r from-blue-700 to-indigo-700 p-8 text-white text-center relative">
          <div className="relative w-20 h-20 rounded-2xl overflow-hidden mx-auto mb-3 border-2 border-white/40 shadow-xl bg-white">
            <Image
              src="/images/logo.jpeg"
              alt="Nolan Printing Services"
              fill
              className="object-cover"
              priority
            />
          </div>
          <h1 className="text-2xl font-black tracking-tight">{t("app_name")}</h1>
          <p className="text-blue-100 text-xs mt-1 font-medium">
            POS, Inventory & Business Management System
          </p>
        </div>

        <form onSubmit={(e) => handleSubmit(e)} className="p-8 space-y-5">
          {error && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-sm flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Username / Nama Pengguna
            </label>
            <div className="relative">
              <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Password / Kata Laluan
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold rounded-xl text-sm shadow-md hover:shadow-lg transition flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? "Signing in..." : "Sign In to System"}
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="p-3.5 bg-slate-50 text-center border-t border-slate-100 text-[11px] text-slate-400">
          Nolan Printing Services &copy; 2026. All rights reserved.
        </div>
      </div>
    </div>
  );
}

