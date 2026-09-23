"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  TrendingUp,
  DollarSign,
  Package,
  AlertTriangle,
  ShoppingCart,
  Receipt,
  Wallet,
  ArrowUpRight,
  Sparkles,
  Calendar,
  Filter,
  BarChart3,
  Check,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
} from "recharts";
import { useI18n } from "@/lib/i18n/context";
import { formatMYR } from "@/lib/utils";

const COLORS = ["#2563eb", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899", "#06b6d4"];

export default function DashboardPage() {
  const { t } = useI18n();

  const [summary, setSummary] = useState<any>(null);
  const [categoryData, setCategoryData] = useState<any[]>([]);
  const [staffData, setStaffData] = useState<any[]>([]);
  const [trendData, setTrendData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Graph filters
  const [timeRange, setTimeRange] = useState<"today" | "7d" | "30d" | "all">("7d");
  const [metricFilter, setMetricFilter] = useState<"both" | "revenue" | "profit">("both");
  const [chartLoading, setChartLoading] = useState(false);

  const fetchReports = useCallback(async (range: string, isInitial = false) => {
    if (!isInitial) setChartLoading(true);
    try {
      const res = await fetch(`/api/reports?range=${range}`);
      const data = await res.json();
      if (data.success) {
        setSummary(data.summary);
        setCategoryData(data.categoryChartData);
        setStaffData(data.staffChartData);
        setTrendData(data.dailyTrendData);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setChartLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReports("7d", true);
  }, [fetchReports]);

  const handleTimeRangeChange = (range: "today" | "7d" | "30d" | "all") => {
    setTimeRange(range);
    fetchReports(range);
  };

  // Calculate timeframe totals for graph header
  const rangeTotalRevenue = trendData.reduce((sum, item) => sum + (Number(item.revenue) || 0), 0);
  const rangeTotalProfit = trendData.reduce((sum, item) => sum + (Number(item.profit) || 0), 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Welcome & Quick Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 p-6 rounded-3xl text-white shadow-xl shadow-slate-900/10 dark:from-slate-950 dark:via-blue-950/80 dark:to-indigo-950/70 border border-white/5">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-500/20 border border-blue-400/30 rounded-full text-blue-300 text-xs font-semibold mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Nolan Printing Analytics Suite</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight">{t("overview")}</h1>
          <p className="text-slate-300 text-xs mt-1">Real-time revenue, margins, and operational performance.</p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <Link
            href="/pos"
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-blue-600/30 transition"
          >
            <ShoppingCart className="w-4 h-4" />
            <span>Launch POS Register</span>
          </Link>
          <Link
            href="/inventory"
            className="flex items-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold rounded-xl backdrop-blur-md border border-white/10 transition"
          >
            <Package className="w-4 h-4" />
            <span>Manage Inventory</span>
          </Link>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
        {/* Total Revenue */}
        <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between transition-colors">
          <div className="flex items-center justify-between text-slate-400 dark:text-slate-500 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">{t("revenue")}</span>
            <DollarSign className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="text-lg font-black text-slate-900 dark:text-white">{formatMYR(summary?.totalRevenue)}</div>
          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold mt-1">
            {summary?.totalTransactions} transactions
          </span>
        </div>

        {/* COGS */}
        <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between transition-colors">
          <div className="flex items-center justify-between text-slate-400 dark:text-slate-500 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">{t("cogs")}</span>
            <Package className="w-4 h-4 text-slate-500 dark:text-slate-400" />
          </div>
          <div className="text-lg font-black text-slate-700 dark:text-slate-200">{formatMYR(summary?.totalCogs)}</div>
          <span className="text-[10px] text-slate-400 dark:text-slate-500">Direct material cost</span>
        </div>

        {/* Gross Profit */}
        <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between transition-colors">
          <div className="flex items-center justify-between text-slate-400 dark:text-slate-500 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">{t("gross_profit")}</span>
            <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="text-lg font-black text-emerald-600 dark:text-emerald-400">{formatMYR(summary?.grossProfit)}</div>
          <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">Rev - COGS</span>
        </div>

        {/* Total Expenses */}
        <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between transition-colors">
          <div className="flex items-center justify-between text-slate-400 dark:text-slate-500 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">{t("expenses")}</span>
            <Wallet className="w-4 h-4 text-rose-500 dark:text-rose-400" />
          </div>
          <div className="text-lg font-black text-rose-600 dark:text-rose-400">{formatMYR(summary?.totalExpenses)}</div>
          <span className="text-[10px] text-slate-400 dark:text-slate-500">Operational costs</span>
        </div>

        {/* Net Profit */}
        <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between transition-colors">
          <div className="flex items-center justify-between text-slate-400 dark:text-slate-500 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">{t("net_profit")}</span>
            <TrendingUp className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div className="text-lg font-black text-indigo-600 dark:text-indigo-400">{formatMYR(summary?.netProfit)}</div>
          <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold">
            {summary?.profitMargin}% margin
          </span>
        </div>

        {/* Low Stock Alerts */}
        <Link
          href="/inventory"
          className={`p-4 rounded-2xl border transition flex flex-col justify-between ${
            summary?.lowStockCount > 0
              ? "bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800/80 text-amber-900 dark:text-amber-200 hover:bg-amber-100 dark:hover:bg-amber-950/60"
              : "bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 text-slate-900 dark:text-white"
          }`}
        >
          <div className="flex items-center justify-between text-slate-400 dark:text-slate-500 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">{t("stock_alerts")}</span>
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-lg font-black text-amber-600 dark:text-amber-400">
            {summary?.lowStockCount} items
          </div>
          <span className="text-[10px] font-semibold text-amber-700 dark:text-amber-400 flex items-center gap-1">
            <span>View alerts</span>
            <ArrowUpRight className="w-3 h-3" />
          </span>
        </Link>
      </div>

      {/* Analytics Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Revenue Growth Trend (Bar Chart) with Dynamic Filters */}
        <div className="lg:col-span-8 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm transition-colors">
          {/* Chart Filter Header */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div>
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <h2 className="font-bold text-sm text-slate-900 dark:text-white">{t("revenue_trend")}</h2>
              </div>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                {timeRange === "today"
                  ? "Today's hourly sales performance"
                  : timeRange === "7d"
                  ? "Daily sales revenue & gross profit for the past 7 days"
                  : timeRange === "30d"
                  ? "Past 30 days revenue & gross profit trajectory"
                  : "Complete transaction trend history"}
              </p>
            </div>

            {/* Filter Controls */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Metric Filter */}
              <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setMetricFilter("both")}
                  className={`px-2.5 py-1 rounded-lg transition ${
                    metricFilter === "both"
                      ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  Both
                </button>
                <button
                  type="button"
                  onClick={() => setMetricFilter("revenue")}
                  className={`px-2.5 py-1 rounded-lg transition ${
                    metricFilter === "revenue"
                      ? "bg-blue-600 text-white shadow-sm"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  Revenue
                </button>
                <button
                  type="button"
                  onClick={() => setMetricFilter("profit")}
                  className={`px-2.5 py-1 rounded-lg transition ${
                    metricFilter === "profit"
                      ? "bg-emerald-600 text-white shadow-sm"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  Profit
                </button>
              </div>

              {/* Time Range Pills */}
              <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl text-xs font-semibold">
                {[
                  { key: "today", label: "Today" },
                  { key: "7d", label: "7 Days" },
                  { key: "30d", label: "30 Days" },
                  { key: "all", label: "All Time" },
                ].map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => handleTimeRangeChange(tab.key as any)}
                    className={`px-2.5 py-1 rounded-lg transition ${
                      timeRange === tab.key
                        ? "bg-blue-600 text-white shadow-sm"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Quick Filter Summary Pill */}
          <div className="flex items-center justify-between py-2 px-1 text-xs">
            <div className="flex items-center gap-4 text-slate-500 dark:text-slate-400">
              <span>
                Period Revenue:{" "}
                <strong className="text-slate-900 dark:text-white font-bold">{formatMYR(rangeTotalRevenue)}</strong>
              </span>
              <span>
                Period Profit:{" "}
                <strong className="text-emerald-600 dark:text-emerald-400 font-bold">{formatMYR(rangeTotalProfit)}</strong>
              </span>
            </div>
            {chartLoading && (
              <span className="text-[11px] text-blue-600 dark:text-blue-400 flex items-center gap-1 font-medium animate-pulse">
                <span className="w-2 h-2 rounded-full bg-blue-600 animate-ping"></span>
                Refreshing...
              </span>
            )}
          </div>

          {/* Recharts Bar Chart */}
          <div className="h-64 mt-2">
            {chartLoading ? (
              <div className="h-full flex items-center justify-center">
                <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : trendData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-400 dark:text-slate-500 text-xs font-medium">
                No transaction records found for this period.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.15} />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#94a3b8" }} stroke="#94a3b8" />
                  <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} stroke="#94a3b8" />
                  <Tooltip
                    formatter={(val: any, name: any) => [formatMYR(val), name === "revenue" ? "Revenue" : "Gross Profit"]}
                    contentStyle={{
                      backgroundColor: "#0f172a",
                      color: "#ffffff",
                      borderRadius: "12px",
                      fontSize: "12px",
                      border: "1px solid #334155",
                      boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.3)",
                    }}
                    labelStyle={{ color: "#94a3b8", fontWeight: "bold", marginBottom: "4px" }}
                  />
                  {(metricFilter === "both" || metricFilter === "revenue") && (
                    <Bar dataKey="revenue" fill="#2563eb" radius={[6, 6, 0, 0]} name="revenue" maxBarSize={38} />
                  )}
                  {(metricFilter === "both" || metricFilter === "profit") && (
                    <Bar dataKey="profit" fill="#10b981" radius={[6, 6, 0, 0]} name="profit" maxBarSize={38} />
                  )}
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Category Share Distribution */}
        <div className="lg:col-span-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col transition-colors">
          <div className="mb-3">
            <h2 className="font-bold text-sm text-slate-900 dark:text-white">{t("category_share")}</h2>
            <p className="text-xs text-slate-400 dark:text-slate-500">Revenue split across product categories</p>
          </div>
          <div className="flex-1 flex flex-col items-center justify-center">
            {categoryData.length === 0 ? (
              <div className="text-slate-400 dark:text-slate-500 text-xs font-medium py-10">No category sales yet.</div>
            ) : (
              <>
                <div className="h-44 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={45}
                        outerRadius={70}
                        paddingAngle={4}
                      >
                        {categoryData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(val: any) => formatMYR(val)}
                        contentStyle={{
                          backgroundColor: "#0f172a",
                          color: "#ffffff",
                          borderRadius: "12px",
                          fontSize: "12px",
                          border: "1px solid #334155",
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="w-full space-y-1.5 mt-2">
                  {categoryData.map((cat, idx) => (
                    <div key={cat.name} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                        />
                        <span className="text-slate-600 dark:text-slate-400 truncate max-w-[120px]">{cat.name}</span>
                      </div>
                      <span className="font-bold text-slate-900 dark:text-white">{formatMYR(cat.value)}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
