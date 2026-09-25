"use client";

import React, { useState, useEffect } from "react";
import { WalletCards, Plus, X, Tag } from "lucide-react";
import { useI18n } from "@/lib/i18n/context";
import { translateExpenseCategory } from "@/lib/i18n/translations";
import { formatMYR, formatDate } from "@/lib/utils";

interface Expense {
  id: number;
  description: string;
  amount: number | string;
  category: string;
  createdAt: string;
  user: { id: number; username: string; fullName: string };
}

export default function ExpensesPage() {
  const { t, language } = useI18n();

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [totalExpense, setTotalExpense] = useState(0);
  const [loading, setLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [desc, setDesc] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("Utilities");
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const fetchExpenses = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/expenses");
      const data = await res.json();
      if (data.success) {
        setExpenses(data.expenses);
        setTotalExpense(data.totalExpense);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg("");

    try {
      const res = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: desc, amount, category }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message);

      setDesc("");
      setAmount("");
      setModalOpen(false);
      fetchExpenses();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Top Banner & KPI */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 rounded-xl flex items-center justify-center font-bold">
            <WalletCards className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-800 dark:text-white">{t("expenses")}</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">{t("record_utilities_desc")}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <span className="text-[11px] text-slate-400 font-semibold block uppercase">{t("total_recorded")}</span>
            <span className="text-base font-black text-rose-600 dark:text-rose-400">{formatMYR(totalExpense)}</span>
          </div>
          <button
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-md shadow-rose-600/20 transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{t("record_expense")}</span>
          </button>
        </div>
      </div>

      {/* Expenses Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden transition-colors">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold">
              <tr>
                <th className="p-3.5">{t("date")}</th>
                <th className="p-3.5">{t("category")}</th>
                <th className="p-3.5">{t("description")}</th>
                <th className="p-3.5">{t("recorded_by")}</th>
                <th className="p-3.5 text-right">{t("amount")} (RM)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {expenses.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-400 dark:text-slate-500 font-medium">
                    {t("no_expenses_found")}
                  </td>
                </tr>
              ) : (
                expenses.map((exp) => (
                  <tr key={exp.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition">
                    <td className="p-3.5 text-slate-600 dark:text-slate-400">{formatDate(exp.createdAt)}</td>
                    <td className="p-3.5">
                      <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-[11px] rounded-lg">
                        {translateExpenseCategory(exp.category, language)}
                      </span>
                    </td>
                    <td className="p-3.5 font-bold text-slate-800 dark:text-white">{exp.description}</td>
                    <td className="p-3.5 text-slate-600 dark:text-slate-400">{exp.user?.fullName || exp.user?.username}</td>
                    <td className="p-3.5 text-right font-black text-rose-600 dark:text-rose-400">
                      -{formatMYR(exp.amount)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Add Expense */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-800 dark:text-white">{t("record_new_expense")}</h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="p-5 space-y-4 text-xs">
              {errorMsg && (
                <div className="p-2.5 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 rounded-xl text-rose-700 dark:text-rose-300 font-semibold">
                  {errorMsg}
                </div>
              )}

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">{t("expense_category")} *</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-rose-600 focus:outline-none"
                >
                  <option value="Utilities">{translateExpenseCategory("Utilities", language)}</option>
                  <option value="Supplies & Ink">{translateExpenseCategory("Supplies & Ink", language)}</option>
                  <option value="Rent">{translateExpenseCategory("Rent", language)}</option>
                  <option value="Maintenance">{translateExpenseCategory("Maintenance", language)}</option>
                  <option value="Salary & Wages">{translateExpenseCategory("Salary & Wages", language)}</option>
                  <option value="Marketing">{translateExpenseCategory("Marketing", language)}</option>
                  <option value="General">{translateExpenseCategory("General", language)}</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">{t("description_notes")} *</label>
                <input
                  type="text"
                  required
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                  placeholder="e.g. TNB Bill August 2026"
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-rose-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">{t("amount_rm")} *</label>
                <input
                  type="number"
                  step="0.05"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-black text-rose-600 focus:ring-2 focus:ring-rose-600 focus:outline-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold rounded-xl"
                >
                  {t("cancel")}
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl shadow-md disabled:opacity-50 cursor-pointer"
                >
                  {saving ? t("recording") : t("save_expense_btn")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

