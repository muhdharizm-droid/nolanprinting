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
  const { t } = useI18n();
  const router = useRouter();

  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [receiptFormat, setReceiptFormat] = useState<"80mm" | "58mm" | "a4" | "a5">("80mm");
  const [voiding, setVoiding] = useState(false);

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

  // Void Sale
  const handleVoidSale = async (saleId: number) => {
    if (
      !confirm(
        `Are you sure you want to VOID Sale #${saleId}?\nThis will cancel the sale and restore products to inventory stock.`
      )
    ) {
      return;
    }

    setVoiding(true);
    try {
      const res = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ saleId }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to void transaction");
      }
      setSelectedSale(null);
      fetchTransactions();
      alert(`Sale #${saleId} successfully voided and inventory restored.`);
    } catch (err: any) {
      alert(err.message);
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
            <p className="text-xs text-slate-500 dark:text-slate-400">View customer receipts, payment methods, and void sales</p>
          </div>
        </div>

        {/* Search & Status Filters */}
        <div className="flex items-center gap-2">
          <form onSubmit={handleSearchSubmit} className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
            <input
              type="text"
              placeholder="Search Sale # (e.g. 1)"
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
            <option value="all">All Status</option>
            <option value="completed">Completed</option>
            <option value="voided">Voided</option>
          </select>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden transition-colors">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold">
              <tr>
                <th className="p-3.5">Sale #</th>
                <th className="p-3.5">Date & Time</th>
                <th className="p-3.5">Staff / Cashier</th>
                <th className="p-3.5">Items Purchased</th>
                <th className="p-3.5">Method</th>
                <th className="p-3.5 text-right">Total (RM)</th>
                <th className="p-3.5 text-center">Status</th>
                <th className="p-3.5 text-right">Actions</th>
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
                    No transactions found.
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
                      {sale.items.reduce((s, i) => s + i.quantity, 0)} units ({sale.items.length} unique)
                    </td>
                    <td className="p-3.5">
                      <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded font-semibold text-[10px] text-slate-700 dark:text-slate-300">
                        {sale.paymentMethod}
                      </span>
                    </td>
                    <td className="p-3.5 text-right font-black text-slate-900 dark:text-white">
                      {formatMYR(sale.total)}
                    </td>
                    <td className="p-3.5 text-center">
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
                        <span>{sale.status}</span>
                      </span>
                    </td>
                    <td className="p-3.5 text-right">
                      <button
                        onClick={() => setSelectedSale(sale)}
                        className="p-1.5 text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-lg transition"
                        title="View Receipt"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
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
                <h3 className="font-bold text-sm text-slate-800 dark:text-white">Sale #{selectedSale.id}</h3>
              </div>
              <button onClick={() => setSelectedSale(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Standard Paper Format Switcher */}
            <div className="flex items-center justify-center gap-1.5 p-2 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex-shrink-0">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mr-1">Paper Format:</span>
              {[
                { id: "80mm", label: "80mm Roll" },
                { id: "58mm", label: "58mm Mini" },
                { id: "a4", label: "A4 Invoice" },
                { id: "a5", label: "A5 Slip" },
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
              />
            </div>

            {/* Actions */}
            <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex flex-col gap-2 flex-shrink-0">
              <button
                onClick={() => window.print()}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md flex items-center justify-center gap-1.5 transition"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Receipt ({receiptFormat.toUpperCase()})</span>
              </button>

              {selectedSale.status === "completed" && (
                <button
                  onClick={() => handleVoidSale(selectedSale.id)}
                  disabled={voiding}
                  className="w-full py-2 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition disabled:opacity-50"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Void Transaction & Restore Stock</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

