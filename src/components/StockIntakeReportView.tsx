"use client";

import React, { useState, useEffect } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import {
  Boxes,
  Truck,
  DollarSign,
  TrendingUp,
  Calendar,
  Layers,
  FileText,
  Search,
  RefreshCw,
  PackageCheck,
} from "lucide-react";
import { formatMYR, formatDate } from "@/lib/utils";

interface StockIntakeSummary {
  totalUnits: number;
  totalCostValuation: number;
  totalBatches: number;
  mostRestockedItem: string;
}

interface TrendPoint {
  date: string;
  dateKey: string;
  units: number;
  cost: number;
  batches: number;
}

interface CategoryBreakdown {
  name: string;
  units: number;
  cost: number;
  percentage: number;
}

interface TopProduct {
  id: number;
  name: string;
  categoryName: string;
  isRawMaterial: boolean;
  units: number;
  cost: number;
  packSize: number;
}

interface RecentIntakeItem {
  id: number;
  createdAt: string;
  productName: string;
  isRawMaterial: boolean;
  categoryName: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
  supplierName: string;
  userFullName: string;
  userRole: string;
}

const CATEGORY_COLORS = [
  "#10b981", // Emerald (Paper)
  "#3b82f6", // Blue (Retail)
  "#8b5cf6", // Purple (Service)
  "#f59e0b", // Amber
  "#06b6d4", // Cyan
  "#ec4899", // Pink
];

export default function StockIntakeReportView() {
  const [range, setRange] = useState<"7d" | "30d" | "90d" | "1y" | "all">("30d");
  const [metricMode, setMetricMode] = useState<"units" | "cost">("units");
  const [loading, setLoading] = useState(true);
  const [searchFilter, setSearchFilter] = useState("");

  const [summary, setSummary] = useState<StockIntakeSummary | null>(null);
  const [trend, setTrend] = useState<TrendPoint[]>([]);
  const [byCategory, setByCategory] = useState<CategoryBreakdown[]>([]);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [recentIntakes, setRecentIntakes] = useState<RecentIntakeItem[]>([]);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/reports/stock-intake?range=${range}`);
      const data = await res.json();
      if (data.success) {
        setSummary(data.summary);
        setTrend(data.trend);
        setByCategory(data.byCategory);
        setTopProducts(data.topProducts);
        setRecentIntakes(data.recentIntakes);
      }
    } catch (err) {
      console.error("Failed to load stock intake report:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [range]);

  const filteredIntakes = recentIntakes.filter((i) => {
    const q = searchFilter.toLowerCase();
    return (
      i.productName.toLowerCase().includes(q) ||
      i.supplierName.toLowerCase().includes(q) ||
      i.categoryName.toLowerCase().includes(q) ||
      i.userFullName.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Top Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
            <Truck className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-800 dark:text-white">
              Stock Intake & Restock Trends
            </h2>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Deliveries received from suppliers and paper warehouse intakes
            </p>
          </div>
        </div>

        {/* Range Buttons & Metric Toggle */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-semibold">
            <button
              onClick={() => setMetricMode("units")}
              className={`px-3 py-1.5 rounded-lg transition ${
                metricMode === "units"
                  ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm font-bold"
                  : "text-slate-600 dark:text-slate-400"
              }`}
            >
              Units Received
            </button>
            <button
              onClick={() => setMetricMode("cost")}
              className={`px-3 py-1.5 rounded-lg transition ${
                metricMode === "cost"
                  ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm font-bold"
                  : "text-slate-600 dark:text-slate-400"
              }`}
            >
              Value (RM)
            </button>
          </div>

          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-semibold">
            {(["7d", "30d", "90d", "1y", "all"] as const).map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`px-2.5 py-1.5 rounded-lg transition uppercase text-[11px] ${
                  range === r
                    ? "bg-emerald-600 text-white font-bold shadow-sm"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                {r === "7d"
                  ? "7D"
                  : r === "30d"
                  ? "30D"
                  : r === "90d"
                  ? "90D"
                  : r === "1y"
                  ? "1Y"
                  : "ALL"}
              </button>
            ))}
          </div>

          <button
            onClick={loadData}
            title="Refresh"
            className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl transition"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Metric KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Total Units Received */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs">
            <span>Total Units Received</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Boxes className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">
            {summary?.totalUnits.toLocaleString() || 0}
            <span className="text-xs font-normal text-slate-400 ml-1">units/reams</span>
          </div>
          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold block">
            Across {summary?.totalBatches || 0} delivery batches
          </span>
        </div>

        {/* Restock Cost Valuation */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs">
            <span>Restock Valuation</span>
            <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <DollarSign className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">
            {formatMYR(summary?.totalCostValuation || 0)}
          </div>
          <span className="text-[10px] text-slate-400 block">Based on supplier purchase cost</span>
        </div>

        {/* Delivery Batches */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs">
            <span>Intake Batches</span>
            <div className="w-7 h-7 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Truck className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">
            {summary?.totalBatches || 0}
          </div>
          <span className="text-[10px] text-slate-400 block">Logged stock receipts</span>
        </div>

        {/* Most Restocked Item */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs">
            <span>Highest Volume Item</span>
            <div className="w-7 h-7 rounded-lg bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <TrendingUp className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-sm font-bold text-slate-900 dark:text-white truncate" title={summary?.mostRestockedItem}>
            {summary?.mostRestockedItem || "None"}
          </div>
          <span className="text-[10px] text-purple-600 dark:text-purple-400 font-semibold block">
            Most replenished supply
          </span>
        </div>
      </div>

      {/* Main Graph & Category Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Main Intake Trend Bar Chart */}
        <div className="lg:col-span-8 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-sm text-slate-800 dark:text-white">
                Intake Volume Over Time
              </h3>
              <p className="text-[11px] text-slate-400">
                {metricMode === "units" ? "Units / reams received per day" : "Total restock cost (RM) per day"}
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="w-3 h-3 rounded-sm bg-emerald-500 inline-block"></span>
              <span className="text-slate-600 dark:text-slate-300 font-medium">
                {metricMode === "units" ? "Units Received" : "Cost Value (RM)"}
              </span>
            </div>
          </div>

          <div className="h-72 w-full">
            {loading ? (
              <div className="h-full flex items-center justify-center text-slate-400 text-xs">
                Loading graph...
              </div>
            ) : trend.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-400 text-xs">
                No intake records for this period.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={trend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.15} />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11, fill: "#94a3b8" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "#94a3b8" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (!active || !payload || !payload.length) return null;
                      const data = payload[0].payload as TrendPoint;
                      return (
                        <div className="bg-slate-900 text-white p-3 rounded-xl shadow-xl text-xs space-y-1 border border-slate-700">
                          <p className="font-bold text-slate-200">{label}</p>
                          <p className="text-emerald-400 font-semibold">
                            Units: {data.units} units/reams
                          </p>
                          <p className="text-blue-300">
                            Valuation: {formatMYR(data.cost)}
                          </p>
                          <p className="text-slate-400 text-[10px]">
                            {data.batches} batch{data.batches > 1 ? "es" : ""} delivered
                          </p>
                        </div>
                      );
                    }}
                  />
                  <Bar
                    dataKey={metricMode === "units" ? "units" : "cost"}
                    fill="#10b981"
                    radius={[6, 6, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Category Share Pie Chart */}
        <div className="lg:col-span-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-sm text-slate-800 dark:text-white">
              Intake by Category
            </h3>
            <p className="text-[11px] text-slate-400 mb-2">Proportion of restock volume</p>

            <div className="h-52 w-full">
              {byCategory.length === 0 ? (
                <div className="h-full flex items-center justify-center text-slate-400 text-xs">
                  No data available
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={byCategory}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={75}
                      paddingAngle={4}
                      dataKey="units"
                    >
                      {byCategory.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: any, name: any, item: any) => [
                        `${value} units (${item.payload.percentage}%)`,
                        item.payload.name,
                      ]}
                      contentStyle={{
                        backgroundColor: "#0f172a",
                        borderRadius: "12px",
                        border: "1px solid #334155",
                        fontSize: "12px",
                        color: "#fff",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
            {byCategory.map((cat, idx) => (
              <div key={cat.name} className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                <div className="flex items-center gap-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: CATEGORY_COLORS[idx % CATEGORY_COLORS.length] }}
                  ></span>
                  <span className="font-medium truncate max-w-[130px]">{cat.name}</span>
                </div>
                <div className="font-bold text-slate-800 dark:text-white text-right">
                  {cat.units} <span className="font-normal text-slate-400 text-[10px]">({cat.percentage}%)</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top Restocked Products Ranking */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div>
          <h3 className="font-bold text-sm text-slate-800 dark:text-white">
            Top Restocked Products & Paper Materials
          </h3>
          <p className="text-[11px] text-slate-400">
            Supplies with the highest delivery intake quantities
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {topProducts.slice(0, 6).map((prod, idx) => (
            <div
              key={prod.id}
              className="p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200/70 dark:border-slate-800 flex items-center justify-between gap-3"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 flex items-center justify-center font-black text-xs">
                  #{idx + 1}
                </div>
                <div>
                  <h4 className="font-bold text-xs text-slate-800 dark:text-white line-clamp-1">
                    {prod.name}
                  </h4>
                  <span className="text-[10px] text-slate-400 block">
                    {prod.categoryName} {prod.isRawMaterial ? "(Internal Supply)" : "(Retail)"}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <span className="font-black text-sm text-slate-900 dark:text-white block">
                  +{prod.units}
                </span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-mono">
                  {formatMYR(prod.cost)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Delivery Intake Audit Log Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-sm text-slate-800 dark:text-white">
              Detailed Delivery Intake Records
            </h3>
            <p className="text-[11px] text-slate-400">
              Audit log of who accepted each delivery batch and its supplier valuation
            </p>
          </div>

          <div className="relative w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search delivery or supplier..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-white placeholder:text-slate-400 focus:outline-none"
            />
          </div>
        </div>

        <div className="overflow-x-auto text-xs">
          <table className="w-full text-left">
            <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold">
              <tr>
                <th className="p-3.5">Delivery Date</th>
                <th className="p-3.5">Product / Material</th>
                <th className="p-3.5">Classification</th>
                <th className="p-3.5 text-center">Quantity Added</th>
                <th className="p-3.5 text-right">Unit Cost</th>
                <th className="p-3.5 text-right">Batch Total</th>
                <th className="p-3.5">Supplier</th>
                <th className="p-3.5">Accepted By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredIntakes.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400">
                    No intake records found matching your filter.
                  </td>
                </tr>
              ) : (
                filteredIntakes.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition">
                    <td className="p-3.5 font-mono text-[11px] text-slate-500 dark:text-slate-400 whitespace-nowrap">
                      {formatDate(item.createdAt)}
                    </td>
                    <td className="p-3.5 font-bold text-slate-800 dark:text-white">
                      {item.productName}
                    </td>
                    <td className="p-3.5">
                      {item.isRawMaterial ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                          <FileText className="w-3 h-3" />
                          <span>Paper / Supply</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300">
                          <Boxes className="w-3 h-3" />
                          <span>Retail</span>
                        </span>
                      )}
                    </td>
                    <td className="p-3.5 text-center font-bold text-emerald-600 dark:text-emerald-400">
                      +{item.quantity} units
                    </td>
                    <td className="p-3.5 text-right text-slate-500 dark:text-slate-400">
                      {formatMYR(item.unitCost)}
                    </td>
                    <td className="p-3.5 text-right font-bold text-slate-900 dark:text-white">
                      {formatMYR(item.totalCost)}
                    </td>
                    <td className="p-3.5 text-slate-600 dark:text-slate-300 font-medium">
                      {item.supplierName}
                    </td>
                    <td className="p-3.5 text-slate-600 dark:text-slate-300">
                      <span className="font-semibold block">{item.userFullName}</span>
                      <span className="text-[10px] text-slate-400 capitalize">{item.userRole.replace("_", " ")}</span>
                    </td>
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

