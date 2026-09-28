"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  BarChart3,
  Download,
  DollarSign,
  TrendingUp,
  Search,
  Package,
  Printer,
  Truck,
  Receipt,
  CreditCard,
  QrCode,
  Calendar,
  Filter,
  Eye,
  X,
  Building2,
  Wallet,
  ArrowUpDown,
  FileSpreadsheet,
  CheckCircle2,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import * as XLSX from "xlsx";
import { useI18n } from "@/lib/i18n/context";
import {
  translateCategory,
  translatePaymentMethod,
  translateMonth,
} from "@/lib/i18n/translations";
import { formatMYR, formatDate } from "@/lib/utils";
import StockIntakeReportView from "@/components/StockIntakeReportView";

interface PaymentReconciliation {
  method: string;
  amount: number;
  count: number;
  percentage: number;
}

interface DailyBreakdown {
  date: string;
  dayName: string;
  total: number;
  count: number;
  cash: number;
  digital: number;
}

interface TopProduct {
  productId: number;
  productName: string;
  categoryName: string;
  isService: boolean;
  unitsSold: number;
  totalRevenue: number;
  percentage: number;
}

interface DetailedTransactionItem {
  id: number;
  productId: number;
  productName: string;
  categoryName: string;
  isService: boolean;
  quantity: number;
  priceAtSale: number;
  details: string | null;
  lineTotal: number;
}

interface DetailedTransaction {
  id: number;
  receiptNo: string;
  createdAt: string;
  cashier: string;
  paymentMethod: string;
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  total: number;
  itemCount: number;
  itemsSummary: string;
  items: DetailedTransactionItem[];
}

interface ReportSummary {
  totalRevenue: number;
  totalSubtotal: number;
  totalDiscounts: number;
  totalTax: number;
  totalTransactions: number;
  totalItemsSold: number;
  averageOrderValue: number;
}

export default function ReportsPage() {
  const { t, language } = useI18n();

  // Tab: "sales" vs "stock_intake"
  const [activeTab, setActiveTab] = useState<"sales" | "stock_intake">("sales");

  // Filter Mode: "presets" | "monthly" | "yearly" | "custom"
  const [filterMode, setFilterMode] = useState<"presets" | "monthly" | "yearly" | "custom">("presets");
  const [preset, setPreset] = useState<string>("this_month");

  const today = new Date();
  const [selectedMonth, setSelectedMonth] = useState<number>(today.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(today.getFullYear());

  const firstDayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-01`;
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const [startDate, setStartDate] = useState<string>(firstDayStr);
  const [endDate, setEndDate] = useState<string>(todayStr);

  // Data States
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<ReportSummary | null>(null);
  const [paymentReconciliation, setPaymentReconciliation] = useState<PaymentReconciliation[]>([]);
  const [dailyBreakdown, setDailyBreakdown] = useState<DailyBreakdown[]>([]);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [detailedTransactions, setDetailedTransactions] = useState<DetailedTransaction[]>([]);
  const [availableYears, setAvailableYears] = useState<number[]>([today.getFullYear()]);
  const [periodLabel, setPeriodLabel] = useState<string>("");

  // Views & Modals
  const [dailyViewMode, setDailyViewMode] = useState<"chart" | "table">("chart");
  const [transactionSearch, setTransactionSearch] = useState<string>("");
  const [paymentFilter, setPaymentFilter] = useState<string>("all");
  const [selectedTransaction, setSelectedTransaction] = useState<DetailedTransaction | null>(null);

  // Fetch Reports Data
  const loadReports = async () => {
    setLoading(true);
    try {
      let queryUrl = "/api/reports?";
      if (filterMode === "presets") {
        queryUrl += `period=${preset}`;
      } else if (filterMode === "monthly") {
        queryUrl += `period=monthly&month=${selectedMonth}&year=${selectedYear}`;
      } else if (filterMode === "yearly") {
        queryUrl += `period=yearly&year=${selectedYear}`;
      } else if (filterMode === "custom") {
        queryUrl += `period=custom&startDate=${startDate}&endDate=${endDate}`;
      }

      const res = await fetch(queryUrl);
      const data = await res.json();
      if (data.success) {
        setSummary(data.summary);
        setPaymentReconciliation(data.paymentReconciliation || []);
        setDailyBreakdown(data.dailyBreakdown || []);
        setTopProducts(data.topProducts || []);
        setDetailedTransactions(data.detailedTransactions || []);
        setPeriodLabel(data.periodLabel || "");
        if (data.availableYears && data.availableYears.length > 0) {
          setAvailableYears(data.availableYears);
        }
      }
    } catch (e) {
      console.error("Failed to load reports", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, [filterMode, preset, selectedMonth, selectedYear]);

  const handleApplyCustomDate = () => {
    loadReports();
  };

  // Filtered Detailed Transactions
  const filteredTransactions = useMemo(() => {
    return detailedTransactions.filter((tx) => {
      const matchSearch =
        tx.receiptNo.toLowerCase().includes(transactionSearch.toLowerCase()) ||
        tx.cashier.toLowerCase().includes(transactionSearch.toLowerCase()) ||
        tx.itemsSummary.toLowerCase().includes(transactionSearch.toLowerCase());

      const normMethod = (tx.paymentMethod || "cash").toLowerCase();
      const matchPayment =
        paymentFilter === "all" ||
        (paymentFilter === "cash" && normMethod === "cash") ||
        (paymentFilter === "qr" && (normMethod.includes("qr") || normMethod.includes("duitnow"))) ||
        (paymentFilter === "transfer" && (normMethod.includes("transfer") || normMethod.includes("online") || normMethod.includes("bank"))) ||
        (paymentFilter === "card" && (normMethod.includes("card") || normMethod.includes("debit") || normMethod.includes("credit")));

      return matchSearch && matchPayment;
    });
  }, [detailedTransactions, transactionSearch, paymentFilter]);

  // Excel Export Handler
  const handleExportExcel = () => {
    if (!summary) return;

    const wb = XLSX.utils.book_new();

    // Sheet 1: Sales & Payment Summary
    const summaryRows = [
      { Metric: "Reporting Period", Value: periodLabel },
      { Metric: "Total Sales Revenue (MYR)", Value: summary.totalRevenue },
      { Metric: "Total Completed Orders / Receipts", Value: summary.totalTransactions },
      { Metric: "Total Items & Prints Sold", Value: summary.totalItemsSold },
      { Metric: "Average Order Value (MYR)", Value: summary.averageOrderValue },
      { Metric: "Total Discounts Given (MYR)", Value: summary.totalDiscounts },
      { Metric: "Total SST Tax Collected (MYR)", Value: summary.totalTax },
      { Metric: "---", Value: "---" },
      { Metric: "PAYMENT METHOD RECONCILIATION", Value: "---" },
      ...paymentReconciliation.map((p) => ({
        Metric: `${translatePaymentMethod(p.method, language)} Collections (MYR)`,
        Value: `${p.amount} (${p.count} transactions, ${p.percentage}%)`,
      })),
    ];
    const wsSummary = XLSX.utils.json_to_sheet(summaryRows);
    XLSX.utils.book_append_sheet(wb, wsSummary, "Sales Summary");

    // Sheet 2: Daily Sales Breakdown
    const dailyRows = dailyBreakdown.map((d) => ({
      Date: d.date,
      Day: d.dayName,
      "Orders Count": d.count,
      "Cash Sales (MYR)": d.cash,
      "Digital Sales (MYR)": d.digital,
      "Day Total (MYR)": d.total,
    }));
    const wsDaily = XLSX.utils.json_to_sheet(dailyRows);
    XLSX.utils.book_append_sheet(wb, wsDaily, "Daily Breakdown");

    // Sheet 3: Top Selling Items
    const topRows = topProducts.map((p, idx) => ({
      Rank: idx + 1,
      "Item / Service Name": p.productName,
      Category: p.categoryName,
      Type: p.isService ? "Printing Service" : "Stock Merchandise",
      "Units Sold": p.unitsSold,
      "Total Revenue (MYR)": p.totalRevenue,
      "Share of Sales (%)": `${p.percentage}%`,
    }));
    const wsTop = XLSX.utils.json_to_sheet(topRows);
    XLSX.utils.book_append_sheet(wb, wsTop, "Top Selling Items");

    // Sheet 4: Itemized Detailed Transactions Log
    const itemizedRows: any[] = [];
    detailedTransactions.forEach((tx) => {
      tx.items.forEach((it) => {
        itemizedRows.push({
          "Receipt #": tx.receiptNo,
          "Date & Time": formatDate(tx.createdAt),
          Cashier: tx.cashier,
          "Payment Method": translatePaymentMethod(tx.paymentMethod, language),
          "Item Name": it.productName,
          Category: it.categoryName,
          "Print Specs / Details": it.details || "-",
          Quantity: it.quantity,
          "Unit Price (MYR)": it.priceAtSale,
          "Line Total (MYR)": it.lineTotal,
          "Receipt Total (MYR)": tx.total,
        });
      });
    });
    const wsItemized = XLSX.utils.json_to_sheet(itemizedRows);
    XLSX.utils.book_append_sheet(wb, wsItemized, "Itemized Transactions");

    const dateFileSlug = periodLabel.replace(/\s+/g, "_").replace(/[^a-zA-Z0-9_-]/g, "");
    XLSX.writeFile(wb, `Nolan_Printing_Sales_Report_${dateFileSlug}.xlsx`);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Section Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors print:hidden">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 rounded-xl flex items-center justify-center font-bold">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-800 dark:text-white">
              {t("sales_report_title")}
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {t("sales_report_subtitle")}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Tab Switcher */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-semibold">
            <button
              onClick={() => setActiveTab("sales")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
                activeTab === "sales"
                  ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm font-bold"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <DollarSign className="w-3.5 h-3.5" />
              <span>{t("sales_analysis_tab")}</span>
            </button>
            <button
              onClick={() => setActiveTab("stock_intake")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
                activeTab === "stock_intake"
                  ? "bg-emerald-600 text-white shadow-sm font-bold"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <Truck className="w-3.5 h-3.5" />
              <span>{t("stock_intake_restock")}</span>
            </button>
          </div>

          {activeTab === "sales" && (
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrint}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition"
                title={t("print_sales_report")}
              >
                <Printer className="w-3.5 h-3.5" />
                <span>{t("print_sales_report")}</span>
              </button>
              <button
                onClick={handleExportExcel}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20 transition"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{t("export_excel_detailed")}</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {activeTab === "stock_intake" ? (
        <StockIntakeReportView />
      ) : (
        <>
          {/* Filter Bar (Date Range, Monthly & Yearly) */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 transition-colors print:hidden">
            {/* Mode Switcher Buttons */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl text-xs font-bold">
                <button
                  onClick={() => setFilterMode("presets")}
                  className={`px-3 py-1.5 rounded-lg transition ${
                    filterMode === "presets"
                      ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                  }`}
                >
                  {t("filter_mode")}
                </button>
                <button
                  onClick={() => setFilterMode("monthly")}
                  className={`px-3 py-1.5 rounded-lg transition ${
                    filterMode === "monthly"
                      ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                  }`}
                >
                  {t("filter_mode_monthly")}
                </button>
                <button
                  onClick={() => setFilterMode("yearly")}
                  className={`px-3 py-1.5 rounded-lg transition ${
                    filterMode === "yearly"
                      ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                  }`}
                >
                  {t("filter_mode_yearly")}
                </button>
                <button
                  onClick={() => setFilterMode("custom")}
                  className={`px-3 py-1.5 rounded-lg transition ${
                    filterMode === "custom"
                      ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                  }`}
                >
                  {t("filter_mode_custom")}
                </button>
              </div>

              {/* Active Period Badge */}
              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-400 font-medium">{t("showing_period")}:</span>
                <span className="font-bold text-slate-800 dark:text-slate-100 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full border border-slate-200 dark:border-slate-700">
                  {periodLabel || "---"}
                </span>
              </div>
            </div>

            {/* Filter Controls Row */}
            <div>
              {filterMode === "presets" && (
                <div className="flex items-center gap-2 flex-wrap">
                  {[
                    { id: "today", label: t("filter_preset_today") },
                    { id: "yesterday", label: t("filter_preset_yesterday") },
                    { id: "this_month", label: t("filter_preset_this_month") },
                    { id: "this_year", label: t("filter_preset_this_year") },
                    { id: "all", label: t("filter_preset_all") },
                  ].map((btn) => (
                    <button
                      key={btn.id}
                      onClick={() => setPreset(btn.id)}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
                        preset === btn.id
                          ? "bg-blue-600 text-white shadow-md shadow-blue-600/20"
                          : "bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      {btn.label}
                    </button>
                  ))}
                </div>
              )}

              {filterMode === "monthly" && (
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-bold text-slate-600 dark:text-slate-300">
                      {t("select_month")}:
                    </label>
                    <select
                      value={selectedMonth}
                      onChange={(e) => setSelectedMonth(Number(e.target.value))}
                      className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                    >
                      {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                        <option key={m} value={m}>
                          {translateMonth(m, language)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center gap-2">
                    <label className="text-xs font-bold text-slate-600 dark:text-slate-300">
                      {t("select_year")}:
                    </label>
                    <select
                      value={selectedYear}
                      onChange={(e) => setSelectedYear(Number(e.target.value))}
                      className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                    >
                      {availableYears.map((y) => (
                        <option key={y} value={y}>
                          {y}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {filterMode === "yearly" && (
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-bold text-slate-600 dark:text-slate-300">
                      {t("select_year")}:
                    </label>
                    <select
                      value={selectedYear}
                      onChange={(e) => setSelectedYear(Number(e.target.value))}
                      className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                    >
                      {availableYears.map((y) => (
                        <option key={y} value={y}>
                          {y}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {filterMode === "custom" && (
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-bold text-slate-600 dark:text-slate-300">
                      {t("from_date")}:
                    </label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                    >
                    </input>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-bold text-slate-600 dark:text-slate-300">
                      {t("to_date")}:
                    </label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                    >
                    </input>
                  </div>
                  <button
                    onClick={handleApplyCustomDate}
                    className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-sm"
                  >
                    {t("apply_filter")}
                  </button>
                </div>
              )}
            </div>
          </div>

          {loading ? (
            <div className="space-y-6 animate-pulse">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-28 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5"
                  />
                ))}
              </div>
              <div className="h-64 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5" />
            </div>
          ) : (
            <>
              {/* Section 1: 4 Key Metric Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Total Sales Revenue */}
                <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between transition-colors">
                  <div>
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                      {t("total_sales_revenue")}
                    </span>
                    <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                      {formatMYR(summary?.totalRevenue || 0)}
                    </div>
                    <span className="text-[11px] text-slate-400 mt-0.5 block">
                      {summary?.totalTransactions || 0} {t("sales_count")}
                    </span>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                    <DollarSign className="w-6 h-6" />
                  </div>
                </div>

                {/* Total Orders / Receipts */}
                <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between transition-colors">
                  <div>
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                      {t("total_orders_receipts")}
                    </span>
                    <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                      {summary?.totalTransactions || 0}
                    </div>
                    <span className="text-[11px] text-slate-400 mt-0.5 block">
                      {t("completed")}
                    </span>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                    <Receipt className="w-6 h-6" />
                  </div>
                </div>

                {/* Items & Prints Sold */}
                <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between transition-colors">
                  <div>
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                      {t("total_items_prints_sold")}
                    </span>
                    <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                      {summary?.totalItemsSold || 0}
                    </div>
                    <span className="text-[11px] text-slate-400 mt-0.5 block">
                      {t("units_sold")}
                    </span>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                    <Package className="w-6 h-6" />
                  </div>
                </div>

                {/* Average Order Value */}
                <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between transition-colors">
                  <div>
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                      {t("average_order_value")}
                    </span>
                    <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                      {formatMYR(summary?.averageOrderValue || 0)}
                    </div>
                    <span className="text-[11px] text-slate-400 mt-0.5 block">
                      per {t("transactions")}
                    </span>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                    <TrendingUp className="w-6 h-6" />
                  </div>
                </div>
              </div>

              {/* Section 2: Payment Method Reconciliation */}
              <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 transition-colors">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
                  <div>
                    <div className="flex items-center gap-2">
                      <Wallet className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                      <h2 className="font-bold text-sm text-slate-800 dark:text-white">
                        {t("payment_method_reconciliation")}
                      </h2>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {t("payment_reconciliation_desc")}
                    </p>
                  </div>
                  <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 px-3 py-1 rounded-lg border border-amber-200 dark:border-amber-900/50">
                    {t("reconcile_warning")}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-1">
                  {paymentReconciliation.map((pay) => {
                    const isCash = pay.method === "cash";
                    const isQR = pay.method === "qr";
                    const isTransfer = pay.method === "transfer";

                    return (
                      <div
                        key={pay.method}
                        className={`p-4 rounded-xl border transition ${
                          isCash
                            ? "bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/60"
                            : isQR
                            ? "bg-pink-50/50 dark:bg-pink-950/20 border-pink-200 dark:border-pink-800/60"
                            : isTransfer
                            ? "bg-blue-50/50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800/60"
                            : "bg-purple-50/50 dark:bg-purple-950/20 border-purple-200 dark:border-purple-800/60"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            {isCash ? (
                              <DollarSign className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                            ) : isQR ? (
                              <QrCode className="w-4 h-4 text-pink-600 dark:text-pink-400" />
                            ) : isTransfer ? (
                              <Building2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                            ) : (
                              <CreditCard className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                            )}
                            <span className="font-bold text-xs text-slate-800 dark:text-slate-100">
                              {translatePaymentMethod(pay.method, language)}
                            </span>
                          </div>
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 shadow-sm border border-slate-100 dark:border-slate-700">
                            {pay.percentage}%
                          </span>
                        </div>

                        <div className="text-xl font-black text-slate-900 dark:text-white">
                          {formatMYR(pay.amount)}
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mt-2 pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
                          <span>{pay.count} {t("sales_count")}</span>
                          <span className="font-semibold text-slate-700 dark:text-slate-300">
                            {isCash ? t("cash_in_drawer") : t("electronic_payments")}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Section 3: Daily / Periodic Sales Breakdown */}
              <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 transition-colors">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                  <div>
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      <h2 className="font-bold text-sm text-slate-800 dark:text-white">
                        {filterMode === "yearly"
                          ? t("monthly_sales_breakdown")
                          : t("daily_sales_breakdown")}
                      </h2>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {periodLabel}
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-bold print:hidden">
                    <button
                      onClick={() => setDailyViewMode("chart")}
                      className={`px-3 py-1 rounded-lg transition ${
                        dailyViewMode === "chart"
                          ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm"
                          : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                      }`}
                    >
                      {t("daily_trend_chart")}
                    </button>
                    <button
                      onClick={() => setDailyViewMode("table")}
                      className={`px-3 py-1 rounded-lg transition ${
                        dailyViewMode === "table"
                          ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm"
                          : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                      }`}
                    >
                      {t("daily_summary_table")}
                    </button>
                  </div>
                </div>

                {dailyBreakdown.length === 0 ? (
                  <div className="text-center py-12 text-slate-400 text-xs">
                    <Calendar className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <span>{t("no_transactions_match_period")}</span>
                  </div>
                ) : dailyViewMode === "chart" ? (
                  <div className="h-64 pt-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={dailyBreakdown}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.5} />
                        <XAxis dataKey="dayName" tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 10 }} />
                        <Tooltip
                          formatter={(val: any) => formatMYR(val)}
                          labelFormatter={(label, items) => {
                            const dateObj = items && items[0]?.payload;
                            return dateObj ? `${dateObj.date} (${dateObj.dayName})` : String(label);
                          }}
                        />
                        <Bar dataKey="total" fill="#2563eb" radius={[6, 6, 0, 0]} name={t("day_total_col")} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold">
                        <tr>
                          <th className="p-3">{t("date_col")}</th>
                          <th className="p-3">{t("day_col")}</th>
                          <th className="p-3 text-right">{t("orders_col")}</th>
                          <th className="p-3 text-right">{t("cash_col")}</th>
                          <th className="p-3 text-right">{t("digital_col")}</th>
                          <th className="p-3 text-right font-bold">{t("day_total_col")}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-200">
                        {dailyBreakdown.map((row) => (
                          <tr key={row.date} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                            <td className="p-3 font-medium text-slate-900 dark:text-white">
                              {row.date}
                            </td>
                            <td className="p-3 text-slate-500 dark:text-slate-400">{row.dayName}</td>
                            <td className="p-3 text-right font-bold">{row.count}</td>
                            <td className="p-3 text-right text-emerald-600 dark:text-emerald-400 font-medium">
                              {formatMYR(row.cash)}
                            </td>
                            <td className="p-3 text-right text-blue-600 dark:text-blue-400 font-medium">
                              {formatMYR(row.digital)}
                            </td>
                            <td className="p-3 text-right font-black text-slate-900 dark:text-white">
                              {formatMYR(row.total)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Section 4: Top-Selling Products & Services */}
              <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 transition-colors">
                <div className="pb-3 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <Package className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                    <h2 className="font-bold text-sm text-slate-800 dark:text-white">
                      {t("top_selling_items")}
                    </h2>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {periodLabel}
                  </p>
                </div>

                <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold">
                      <tr>
                        <th className="p-3">{t("product_or_service")}</th>
                        <th className="p-3">{t("category")}</th>
                        <th className="p-3 text-center">{t("type")}</th>
                        <th className="p-3 text-right">{t("units_sold")}</th>
                        <th className="p-3 text-right">{t("total_revenue")}</th>
                        <th className="p-3 text-right">Share (%)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-200">
                      {topProducts.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="p-8 text-center text-slate-400">
                            {t("no_transactions_match_period")}
                          </td>
                        </tr>
                      ) : (
                        topProducts.slice(0, 10).map((prod) => (
                          <tr key={prod.productId} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                            <td className="p-3 font-bold text-slate-900 dark:text-white flex items-center gap-2">
                              {prod.isService ? (
                                <Printer className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                              ) : (
                                <Package className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                              )}
                              <span>{prod.productName}</span>
                            </td>
                            <td className="p-3 text-slate-500 dark:text-slate-400">
                              {translateCategory(prod.categoryName, language)}
                            </td>
                            <td className="p-3 text-center">
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                  prod.isService
                                    ? "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300"
                                    : "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300"
                                }`}
                              >
                                {prod.isService ? t("service_label") : t("product_label")}
                              </span>
                            </td>
                            <td className="p-3 text-right font-bold">{prod.unitsSold}</td>
                            <td className="p-3 text-right font-black text-blue-600 dark:text-blue-400">
                              {formatMYR(prod.totalRevenue)}
                            </td>
                            <td className="p-3 text-right font-medium text-slate-500">
                              {prod.percentage}%
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Section 5: Detailed Sales Transactions Table */}
              <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 transition-colors">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                  <div>
                    <div className="flex items-center gap-2">
                      <Receipt className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                      <h2 className="font-bold text-sm text-slate-800 dark:text-white">
                        {t("detailed_sales_log")}
                      </h2>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {t("detailed_sales_desc")}
                    </p>
                  </div>

                  {/* Search and Payment Filter */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="relative w-full sm:w-60">
                      <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        placeholder={t("search_transactions_ph")}
                        value={transactionSearch}
                        onChange={(e) => setTransactionSearch(e.target.value)}
                        className="w-full pl-9 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600"
                      />
                    </div>

                    <select
                      value={paymentFilter}
                      onChange={(e) => setPaymentFilter(e.target.value)}
                      className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600"
                    >
                      <option value="all">{t("filter_payment_all")}</option>
                      <option value="cash">{translatePaymentMethod("cash", language)}</option>
                      <option value="qr">{translatePaymentMethod("qr", language)}</option>
                      <option value="transfer">{translatePaymentMethod("transfer", language)}</option>
                      <option value="card">{translatePaymentMethod("card", language)}</option>
                    </select>
                  </div>
                </div>

                <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold">
                      <tr>
                        <th className="p-3">{t("receipt_no")}</th>
                        <th className="p-3">{t("timestamp")}</th>
                        <th className="p-3">{t("cashier_col")}</th>
                        <th className="p-3">{t("payment_col")}</th>
                        <th className="p-3">{t("items_col")}</th>
                        <th className="p-3 text-right">{t("total_col")}</th>
                        <th className="p-3 text-center print:hidden">{t("actions")}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-200">
                      {filteredTransactions.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="p-8 text-center text-slate-400">
                            {t("no_transactions_match_period")}
                          </td>
                        </tr>
                      ) : (
                        filteredTransactions.map((tx) => {
                          const isCash = tx.paymentMethod.toLowerCase() === "cash";
                          const isQR = tx.paymentMethod.toLowerCase().includes("qr");
                          const isTransfer = tx.paymentMethod.toLowerCase().includes("transfer");

                          return (
                            <tr key={tx.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                              <td className="p-3 font-mono font-bold text-blue-600 dark:text-blue-400">
                                {tx.receiptNo}
                              </td>
                              <td className="p-3 text-slate-500 dark:text-slate-400 whitespace-nowrap">
                                {formatDate(tx.createdAt)}
                              </td>
                              <td className="p-3 font-medium text-slate-800 dark:text-slate-200">
                                {tx.cashier}
                              </td>
                              <td className="p-3">
                                <span
                                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                    isCash
                                      ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                                      : isQR
                                      ? "bg-pink-50 dark:bg-pink-950/60 text-pink-700 dark:text-pink-300 border border-pink-200 dark:border-pink-800"
                                      : isTransfer
                                      ? "bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800"
                                      : "bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800"
                                  }`}
                                >
                                  {translatePaymentMethod(tx.paymentMethod, language)}
                                </span>
                              </td>
                              <td className="p-3 max-w-xs truncate text-slate-600 dark:text-slate-300" title={tx.itemsSummary}>
                                {tx.itemsSummary}
                              </td>
                              <td className="p-3 text-right font-black text-slate-900 dark:text-white">
                                {formatMYR(tx.total)}
                              </td>
                              <td className="p-3 text-center print:hidden">
                                <button
                                  onClick={() => setSelectedTransaction(tx)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 hover:bg-indigo-50 dark:bg-slate-800 dark:hover:bg-indigo-950/40 text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg text-xs font-semibold transition"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                  <span>{t("view_details_btn")}</span>
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {/* Modal: Itemized Transaction Details */}
          {selectedTransaction && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in print:hidden">
              <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <Receipt className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    <div>
                      <h3 className="font-bold text-sm text-slate-800 dark:text-white">
                        {t("transaction_details_title")}: {selectedTransaction.receiptNo}
                      </h3>
                      <p className="text-[11px] text-slate-400">
                        {formatDate(selectedTransaction.createdAt)} • {t("cashier_col")}: {selectedTransaction.cashier}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedTransaction(null)}
                    className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-lg"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Line Items Table */}
                <div className="overflow-x-auto rounded-xl border border-slate-100 dark:border-slate-800">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-100 dark:border-slate-800 text-slate-500 uppercase font-semibold">
                      <tr>
                        <th className="p-2.5">{t("item_description_col")}</th>
                        <th className="p-2.5 text-center">{t("qty_col")}</th>
                        <th className="p-2.5 text-right">{t("unit_price_col")}</th>
                        <th className="p-2.5 text-right">{t("subtotal_col")}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {selectedTransaction.items.map((it) => (
                        <tr key={it.id}>
                          <td className="p-2.5">
                            <span className="font-bold text-slate-800 dark:text-white block">
                              {it.productName}
                            </span>
                            {it.details && (
                              <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-medium block mt-0.5">
                                {it.details}
                              </span>
                            )}
                          </td>
                          <td className="p-2.5 text-center font-bold">{it.quantity}</td>
                          <td className="p-2.5 text-right text-slate-600 dark:text-slate-400">
                            {formatMYR(it.priceAtSale)}
                          </td>
                          <td className="p-2.5 text-right font-bold text-slate-900 dark:text-white">
                            {formatMYR(it.lineTotal)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Financial Summary */}
                <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl space-y-1.5 text-xs">
                  <div className="flex justify-between text-slate-600 dark:text-slate-400">
                    <span>{t("subtotal_col")}</span>
                    <span>{formatMYR(selectedTransaction.subtotal)}</span>
                  </div>
                  {selectedTransaction.discountAmount > 0 && (
                    <div className="flex justify-between text-amber-600 dark:text-amber-400">
                      <span>{t("discount")}</span>
                      <span>-{formatMYR(selectedTransaction.discountAmount)}</span>
                    </div>
                  )}
                  {selectedTransaction.taxAmount > 0 && (
                    <div className="flex justify-between text-slate-600 dark:text-slate-400">
                      <span>{t("tax")} (SST 6%)</span>
                      <span>+{formatMYR(selectedTransaction.taxAmount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm font-black text-slate-900 dark:text-white pt-2 border-t border-slate-200 dark:border-slate-700">
                    <span>{t("total")} ({translatePaymentMethod(selectedTransaction.paymentMethod, language)})</span>
                    <span className="text-blue-600 dark:text-blue-400">{formatMYR(selectedTransaction.total)}</span>
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    onClick={() => setSelectedTransaction(null)}
                    className="px-4 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold transition"
                  >
                    {t("close_btn")}
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
