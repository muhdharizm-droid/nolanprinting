"use client";

import React, { useState, useEffect } from "react";
import { ScrollText, ShieldCheck, Clock, User } from "lucide-react";
import { useI18n } from "@/lib/i18n/context";
import { translateRole } from "@/lib/i18n/translations";
import { formatDate } from "@/lib/utils";

interface LogItem {
  id: number;
  action: string;
  details: string | null;
  createdAt: string;
  user?: { id: number; username: string; fullName: string; role: string } | null;
}

export default function LogsPage() {
  const { t, language } = useI18n();

  const [logs, setLogs] = useState<LogItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchLogs() {
      try {
        const res = await fetch("/api/logs");
        const data = await res.json();
        if (data.success) setLogs(data.logs);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    fetchLogs();
  }, []);

  const getActionColor = (action: string) => {
    if (action.includes("Void")) return "bg-rose-100 text-rose-800 border-rose-200";
    if (action.includes("Login") || action.includes("Logout")) return "bg-slate-100 text-slate-700 border-slate-200";
    if (action.includes("Sale")) return "bg-emerald-100 text-emerald-800 border-emerald-200";
    if (action.includes("Stock")) return "bg-amber-100 text-amber-800 border-amber-200";
    return "bg-blue-100 text-blue-800 border-blue-200";
  };

  return (
    <div className="space-y-5">
      {/* Top Banner */}
      <div className="flex items-center gap-3 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div className="w-10 h-10 bg-slate-100 text-slate-700 rounded-xl flex items-center justify-center font-bold">
          <ScrollText className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-slate-800">{t("audit_log")}</h1>
          <p className="text-xs text-slate-500">{t("logs_subtitle")}</p>
        </div>
      </div>

      {/* Logs Timeline Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
              <tr>
                <th className="p-3.5">{t("timestamp")}</th>
                <th className="p-3.5">{t("user_col")}</th>
                <th className="p-3.5">{t("action_event")}</th>
                <th className="p-3.5">{t("details_remarks")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-slate-400 font-medium">
                    {t("no_logs_recorded")}
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/70 transition">
                    <td className="p-3.5 text-slate-500 font-mono whitespace-nowrap">
                      {formatDate(log.createdAt)}
                    </td>
                    <td className="p-3.5 font-bold text-slate-800">
                      {log.user ? (
                        <div className="flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          <span>{log.user.fullName || log.user.username}</span>
                          <span className="text-[10px] text-slate-400">({translateRole(log.user.role, language)})</span>
                        </div>
                      ) : (
                        <span className="text-slate-400 font-normal">{t("system_user")}</span>
                      )}
                    </td>
                    <td className="p-3.5">
                      <span
                        className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] border ${getActionColor(
                          log.action
                        )}`}
                      >
                        {log.action}
                      </span>
                    </td>
                    <td className="p-3.5 text-slate-600 font-medium">{log.details || "-"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

