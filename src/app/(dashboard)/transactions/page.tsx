"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Receipt,
  Search,
  CheckCircle2,
  XCircle,
  Eye,
  RotateCcw,
  Printer,
  X,
  Calendar,
  AlertTriangle,
} from "lucide-react";
import { useI18n } from "@/lib/i18n/context";
import { translatePaymentMethod } from "@/lib/i18n/translations";
import { formatMYR, formatDate } from "@/lib/utils";
import ThermalReceipt from "@/components/ThermalReceipt";

interface Sale {
  id: number;
  subtotal: number | string;
  discountAmount: number | string;
  taxAmount: number | string;
  total: number | string;
  paymentMethod: string;
  status: "completed" | "voided";
  voidReason?: string | null;
  createdAt: string;
  user: { id: number; username: string; fullName: string };
  items: Array<{
    id: number;
    quantity: number;
    priceAtSale: number | string;
    details?: string | null;
    product: { id: number; name: string; isService: boolean };
  }>;
}

export default function TransactionsPage() {
  const { t, language } = useI18n();
  const router = useRouter();

  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [receiptFormat, setReceiptFormat] = useState<"80mm" | "58mm" | "a4" | "a5">("80mm");
  const [voiding, setVoiding] = useState(false);

  // Void Reason Modal State
  const [saleToVoid, setSaleToVoid] = useState<Sale | null>(null);
  const [voidReasonText, setVoidReasonText] = useState("");
  const [voidError, setVoidError] = useState("");

  const voidPresets = [
    { id: "cashier_error", text: t("void_reason_cashier_error") },
    { id: "customer_cancel", text: t("void_reason_customer_cancel") },
    { id: "defective_print", text: t("void_reason_defective_print") },
    { id: "duplicate", text: t("void_reason_duplicate") },
    { id: "payment_issue", text: t("void_reason_payment_issue") },
    { id: "other", text: t("void_reason_other") },
  ];

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/transactions?search=${search}&status=${statusFilter}`);
      if (res.status === 403) {
        router.push("/home");
        return;
      }
      const data = await res.json();
      if (data.success) setSales(data.sales);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchTransactions();
  };

  const openVoidModal = (sale: Sale) => {
    setSaleToVoid(sale);
    setVoidReasonText("");
    setVoidError("");
  };

  const closeVoidModal = () => {
    if (voiding) return;
    setSaleToVoid(null);
    setVoidReasonText("");
    setVoidError("");
  };

  const handlePresetSelect = (presetText: string) => {
    setVoidReasonText(presetText);
    setVoidError("");
  };

  // Submit Void Sale with Reason
  const handleConfirmVoid = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!saleToVoid) return;

    const trimmedReason = voidReasonText.trim();
    if (!trimmedReason) {
      setVoidError(t("void_reason_required"));
      return;
    }

    setVoiding(true);
    setVoidError("");
    try {
      const res = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          saleId: saleToVoid.id,
          voidReason: trimmedReason,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to void transaction");
      }

      const voidedId = saleToVoid.id;
      setSaleToVoid(null);
      setSelectedSale(null);
      fetchTransactions();
      alert(`${t("sale_number")} #${voidedId} ${t("void_success")}`);
    } catch (err: any) {
      setVoidError(err.message || "Failed to void transaction");
    } finally {
      setVoiding(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 rounded-xl flex items-center justify-center font-bold">
            <Receipt className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-800 dark:text-white">{t("transactions")}</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">{t("view_customer_receipts")}</p>
          </div>
        </div>

        {/* Search & Status Filters */}
        <div className="flex items-center gap-2">
          <form onSubmit={handleSearchSubmit} className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
            <input
              type="text"
              placeholder={t("search_sale_placeholder")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </form>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="p-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 focus:outline-none"
          >
            <option value="all">{t("all_status")}</option>
            <option value="completed">{t("completed")}</option>
            <option value="voided">{t("voided")}</option>
          </select>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden transition-colors">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold">
              <tr>
                <th className="p-3.5">{t("sale_number")}</th>
                <th className="p-3.5">{t("date_time")}</th>
                <th className="p-3.5">{t("staff_cashier")}</th>
                <th className="p-3.5">{t("items_purchased")}</th>
                <th className="p-3.5">{t("method")}</th>
                <th className="p-3.5 text-right">{t("total")} (RM)</th>
                <th className="p-3.5 text-center">{t("status")}</th>
                <th className="p-3.5 text-right">{t("actions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                Array.from({ length: 6 }).map((_, idx) => (
                  <tr key={idx} className="animate-pulse">
                    <td className="p-3.5">
                      <div className="h-4 w-12 bg-slate-200 dark:bg-slate-800 rounded" />
                    </td>
                    <td className="p-3.5">
                      <div className="h-4 w-28 bg-slate-200 dark:bg-slate-800 rounded" />
                    </td>
                    <td className="p-3.5">
                      <div className="h-4 w-24 bg-slate-200 dark:bg-slate-800 rounded" />
                    </td>
                    <td className="p-3.5">
                      <div className="h-4 w-32 bg-slate-200 dark:bg-slate-800 rounded" />
                    </td>
                    <td className="p-3.5">
                      <div className="h-5 w-16 bg-slate-200 dark:bg-slate-800 rounded-full" />
                    </td>
                    <td className="p-3.5 text-right">
                      <div className="h-4 w-16 bg-slate-200 dark:bg-slate-800 rounded ml-auto" />
                    </td>
                    <td className="p-3.5 text-center">
                      <div className="h-5 w-16 bg-slate-200 dark:bg-slate-800 rounded-full mx-auto" />
                    </td>
                    <td className="p-3.5 text-right">
                      <div className="h-7 w-20 bg-slate-200 dark:bg-slate-800 rounded-lg ml-auto" />
                    </td>
                  </tr>
                ))
              ) : sales.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400 dark:text-slate-500 font-medium">
                    {t("no_categories_found") === "Tiada kategori ditemui." ? "Tiada transaksi ditemui." : "No transactions found."}
                  </td>
                </tr>
              ) : (
                sales.map((sale) => (
                  <tr key={sale.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition">
                    <td className="p-3.5 font-bold font-mono text-blue-600 dark:text-blue-400">#{sale.id}</td>
                    <td className="p-3.5 text-slate-600 dark:text-slate-400">{formatDate(sale.createdAt)}</td>
                    <td className="p-3.5 font-medium text-slate-700 dark:text-slate-300">
                      {sale.user?.fullName || sale.user?.username}
                    </td>
                    <td className="p-3.5 text-slate-600 dark:text-slate-400">
                      {sale.items.reduce((s, i) => s + i.quantity, 0)} {t("units")} ({sale.items.length} {t("items_count")})
                    </td>
                    <td className="p-3.5">
                      <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded font-semibold text-[10px] text-slate-700 dark:text-slate-300">
                        {translatePaymentMethod(sale.paymentMethod, language)}
                      </span>
                    </td>
                    <td className="p-3.5 text-right font-black text-slate-900 dark:text-white">
                      {formatMYR(sale.total)}
                    </td>
                    <td className="p-3.5 text-center">
                      <div className="flex flex-col items-center gap-1">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            sale.status === "completed"
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                              : "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 line-through"
                          }`}
                        >
                          {sale.status === "completed" ? (
                            <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                          ) : (
                            <XCircle className="w-3 h-3 text-rose-600 dark:text-rose-400" />
                          )}
                          <span>{sale.status === "completed" ? t("completed") : t("voided")}</span>
                        </span>
                        {sale.status === "voided" && sale.voidReason && (
                          <span
                            className="text-[10px] text-rose-600 dark:text-rose-400 max-w-[140px] truncate font-medium cursor-help"
                            title={`${t("void_reason_label")} ${sale.voidReason}`}
                          >
                            {sale.voidReason}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-3.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setSelectedSale(sale)}
                          className="p-1.5 text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-lg transition"
                          title={t("view")}
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {sale.status === "completed" && (
                          <button
                            onClick={() => openVoidModal(sale)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition"
                            title={t("void_transaction_restore")}
                          >
                            <RotateCcw className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: View Receipt & Void Action */}
      {selectedSale && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div
            className={`bg-white dark:bg-slate-900 w-full rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[92vh] transition-all duration-200 ${
              receiptFormat === "a4"
                ? "max-w-3xl"
                : receiptFormat === "a5"
                ? "max-w-xl"
                : receiptFormat === "58mm"
                ? "max-w-[320px]"
                : "max-w-[400px]"
            }`}
          >
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-2">
                <Receipt className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <h3 className="font-bold text-sm text-slate-800 dark:text-white">{t("sale_number")} #{selectedSale.id}</h3>
              </div>
              <button onClick={() => setSelectedSale(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Standard Paper Format Switcher */}
            <div className="flex items-center justify-center gap-1.5 p-2 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex-shrink-0">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mr-1">{t("paper_format")}</span>
              {[
                { id: "80mm", label: t("roll_80mm") },
                { id: "58mm", label: t("mini_58mm") },
                { id: "a4", label: t("invoice_a4") },
                { id: "a5", label: t("slip_a5") },
              ].map((fmt) => (
                <button
                  key={fmt.id}
                  type="button"
                  onClick={() => setReceiptFormat(fmt.id as any)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                    receiptFormat === fmt.id
                      ? "bg-blue-600 text-white shadow-sm"
                      : "bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600"
                  }`}
                >
                  {fmt.label}
                </button>
              ))}
            </div>

            {/* Void Notice Banner if Voided */}
            {selectedSale.status === "voided" && (
              <div className="mx-4 mt-3 p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 rounded-xl text-xs flex items-start gap-2.5 text-rose-800 dark:text-rose-300 flex-shrink-0">
                <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold flex items-center gap-1.5 text-rose-900 dark:text-rose-200">
                    <span className="px-1.5 py-0.5 rounded bg-rose-200 dark:bg-rose-900 text-[10px] uppercase font-black">
                      {t("voided_badge")}
                    </span>
                    <span>{t("void_reason_label")}</span>
                  </div>
                  <p className="mt-1 text-slate-700 dark:text-slate-300 italic">
                    &ldquo;{selectedSale.voidReason || "No reason specified"}&rdquo;
                  </p>
                </div>
              </div>
            )}

            {/* Printable Receipt Area */}
            <div className="p-4 bg-slate-100 dark:bg-slate-950 flex-1 overflow-y-auto flex justify-center">
              <ThermalReceipt
                paperFormat={receiptFormat}
                saleId={selectedSale.id}
                createdAt={selectedSale.createdAt}
                cashierName={selectedSale.user?.fullName || selectedSale.user?.username || "Staff"}
                items={selectedSale.items.map((it) => ({
                  id: it.id,
                  productName: it.product.name,
                  quantity: it.quantity,
                  priceAtSale: it.priceAtSale,
                  details: it.details,
                }))}
                subtotal={selectedSale.subtotal}
                discount={selectedSale.discountAmount}
                taxAmount={selectedSale.taxAmount}
                total={selectedSale.total}
                paymentMethod={selectedSale.paymentMethod}
                isVoided={selectedSale.status === "voided"}
                voidReason={selectedSale.voidReason}
              />
            </div>

            {/* Actions */}
            <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex flex-col gap-2 flex-shrink-0">
              <button
                onClick={() => window.print()}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md flex items-center justify-center gap-1.5 transition"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>{t("print_receipt_btn")} ({receiptFormat.toUpperCase()})</span>
              </button>

              {selectedSale.status === "completed" && (
                <button
                  onClick={() => openVoidModal(selectedSale)}
                  disabled={voiding}
                  className="w-full py-2 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition disabled:opacity-50"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>{t("void_transaction_restore")}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Void Transaction Reason Form */}
      {saleToVoid && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col transition-all">
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-rose-100 dark:bg-rose-950/70 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                  <RotateCcw className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                    {t("void_sale_modal_title")}
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                    {t("sale_number")} #{saleToVoid.id}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={closeVoidModal}
                disabled={voiding}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleConfirmVoid} className="p-5 space-y-4">
              {/* Transaction Summary Card */}
              <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-3 border border-slate-200 dark:border-slate-700/60 text-xs grid grid-cols-2 gap-2">
                <div>
                  <span className="text-slate-500 dark:text-slate-400 block text-[10px]">{t("total")}</span>
                  <span className="font-bold text-sm text-slate-900 dark:text-white">
                    {formatMYR(saleToVoid.total)}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 dark:text-slate-400 block text-[10px]">{t("staff_cashier")}</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200 truncate block">
                    {saleToVoid.user?.fullName || saleToVoid.user?.username}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 dark:text-slate-400 block text-[10px]">{t("items_purchased")}</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {saleToVoid.items.reduce((s, i) => s + i.quantity, 0)} {t("units")} ({saleToVoid.items.length} {t("items_count")})
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 dark:text-slate-400 block text-[10px]">{t("method")}</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {translatePaymentMethod(saleToVoid.paymentMethod, language)}
                  </span>
                </div>
              </div>

              {/* Warning Notice */}
              <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-xl text-xs flex items-start gap-2.5 text-rose-800 dark:text-rose-300">
                <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 flex-shrink-0 mt-0.5" />
                <p className="text-[11px] leading-relaxed">
                  {t("confirm_void_warning")}
                </p>
              </div>

              {/* Quick Preset Reason Buttons */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {t("select_void_reason_preset")}
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {voidPresets.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => handlePresetSelect(preset.text)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium transition border ${
                        voidReasonText === preset.text
                          ? "bg-rose-600 text-white border-rose-600 shadow-sm"
                          : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                      }`}
                    >
                      {preset.text}
                    </button>
                  ))}
                </div>
              </div>

              {/* Void Reason Required Textarea */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {t("void_reason_required")} <span className="text-rose-500">*</span>
                  </label>
                </div>
                <textarea
                  rows={3}
                  value={voidReasonText}
                  onChange={(e) => {
                    setVoidReasonText(e.target.value);
                    setVoidError("");
                  }}
                  placeholder={t("enter_void_reason_placeholder")}
                  required
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500 resize-none font-medium"
                />
                {voidError && (
                  <p className="text-xs text-rose-600 dark:text-rose-400 font-medium">
                    {voidError}
                  </p>
                )}
              </div>

              {/* Modal Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={closeVoidModal}
                  disabled={voiding}
                  className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
                >
                  {t("cancel")}
                </button>
                <button
                  type="submit"
                  disabled={voiding || !voidReasonText.trim()}
                  className="px-5 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-50 rounded-xl shadow-md transition flex items-center gap-1.5"
                >
                  <RotateCcw className={`w-3.5 h-3.5 ${voiding ? "animate-spin" : ""}`} />
                  <span>{voiding ? t("voiding_in_progress") : t("confirm_void_btn")}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

