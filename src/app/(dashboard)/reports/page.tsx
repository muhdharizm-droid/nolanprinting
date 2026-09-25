"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  BarChart3,
  PieChart as PieIcon,
  Download,
  DollarSign,
  TrendingUp,
  Filter,
  Search,
  Layers,
  Package,
  Printer,
  Truck,
} from "lucide-react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import * as XLSX from "xlsx";
import { useI18n } from "@/lib/i18n/context";
import { translateCategory, translateExpenseCategory } from "@/lib/i18n/translations";
import { formatMYR } from "@/lib/utils";
import StockIntakeReportView from "@/components/StockIntakeReportView";

interface CategoryData {
  name: string;
  value: number;
  count: number;
  percentage: number;
}

interface ProductSalesData {
  productId: number;
  productName: string;
  categoryName: string;
  isService: boolean;
  unitsSold: number;
  totalRevenue: number;
  totalCogs: number;
  profit: number;
  margin: number;
  unitPrice: number;
}

interface ExpenseCategory {
  category: string;
  amount: number;
}

interface ReportSummary {
  totalRevenue: number;
  totalCogs: number;
  grossProfit: number;
  grossMargin: number;
  totalDiscounts: number;
  totalTax: number;
  totalExpenses: number;
  netProfit: number;
  profitMargin: number;
  totalTransactions: number;
  lowStockCount: number;
  outOfStockCount: number;
  healthyStockCount: number;
  totalActiveProducts: number;
}

const PIE_COLORS = [
  "#2563eb", // Royal Blue
  "#10b981", // Emerald
  "#8b5cf6", // Violet
  "#f59e0b", // Amber
  "#ec4899", // Pink
  "#06b6d4", // Cyan
  "#f97316", // Orange
  "#64748b", // Slate
];

export default function ReportsPage() {
  const { t, language } = useI18n();

  const [summary, setSummary] = useState<ReportSummary | null>(null);
  const [categoryData, setCategoryData] = useState<CategoryData[]>([]);
  const [productData, setProductData] = useState<ProductSalesData[]>([]);
  const [expensesByCategory, setExpensesByCategory] = useState<ExpenseCategory[]>([]);
  const [loading, setLoading] = useState(true);

  // Active Report Tab: Financial Statements vs Stock Intake Trends
  const [activeReportTab, setActiveReportTab] = useState<"financial" | "stock_intake">("financial");

  // Category & Product Drilldown Filters
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [productSearch, setProductSearch] = useState<string>("");

  useEffect(() => {
    async function loadReports() {
      try {
        const res = await fetch("/api/reports");
        const data = await res.json();
        if (data.success) {
          setSummary(data.summary);
          setCategoryData(data.categoryChartData || []);
          setProductData(data.productSalesData || []);
          setExpensesByCategory(data.expensesByCategory || []);
        }
      } catch (e) {
        console.error("Failed to load reports data", e);
      } finally {
        setLoading(false);
      }
    }
    loadReports();
  }, []);

  // Filtered Products for drilldown table & chart
  const filteredProducts = useMemo(() => {
    return productData.filter((p) => {
      const matchCat =
        selectedCategory === "all" ||
        p.categoryName.toLowerCase() === selectedCategory.toLowerCase();
      const matchSearch =
        p.productName.toLowerCase().includes(productSearch.toLowerCase()) ||
        p.categoryName.toLowerCase().includes(productSearch.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [productData, selectedCategory, productSearch]);

  // Top 6 products in current category view for bar chart
  const topProductsChart = useMemo(() => {
    return filteredProducts.slice(0, 6).map((p) => ({
      name: p.productName.length > 18 ? `${p.productName.slice(0, 18)}...` : p.productName,
      revenue: p.totalRevenue,
      units: p.unitsSold,
    }));
  }, [filteredProducts]);

  // Multi-Sheet Excel Export
  const handleExportExcel = () => {
    if (!summary) return;

    const wb = XLSX.utils.book_new();

    // 1. Sheet: Executive Financial Statement
    const financialRows = [
      { Section: "1. SALES REVENUE", Metric: "Gross Sales Revenue", "Amount (MYR)": summary.totalRevenue },
      { Section: "1. SALES REVENUE", Metric: "(-) Customer Discounts Given", "Amount (MYR)": -summary.totalDiscounts },
      { Section: "1. SALES REVENUE", Metric: "(+) SST Tax Collected", "Amount (MYR)": summary.totalTax },
      { Section: "2. COST OF SALES", Metric: "(-) Cost of Goods Sold (COGS / Paper / Stock)", "Amount (MYR)": -summary.totalCogs },
      { Section: "3. GROSS PROFIT", Metric: "(=) Gross Profit", "Amount (MYR)": summary.grossProfit },
      { Section: "3. GROSS PROFIT", Metric: "Gross Profit Margin (%)", "Amount (MYR)": `${summary.grossMargin || 0}%` },
      ...expensesByCategory.map((e) => ({
        Section: "4. OPERATING OVERHEAD",
        Metric: `(-) ${e.category}`,
        "Amount (MYR)": -e.amount,
      })),
      { Section: "4. OPERATING OVERHEAD", Metric: "Total Operating Expenses", "Amount (MYR)": -summary.totalExpenses },
      { Section: "5. NET OPERATING PROFIT", Metric: "(=) Net Profit", "Amount (MYR)": summary.netProfit },
      { Section: "5. NET OPERATING PROFIT", Metric: "Net Profit Margin (%)", "Amount (MYR)": `${summary.profitMargin}%` },
      { Section: "6. OPERATIONS", Metric: "Total Completed Transactions", "Amount (MYR)": summary.totalTransactions },
    ];
    const wsFinancial = XLSX.utils.json_to_sheet(financialRows);
    XLSX.utils.book_append_sheet(wb, wsFinancial, "P&L Statement");

    // 2. Sheet: Category Sales
    const categoryRows = categoryData.map((c) => ({
      "Category Name": c.name,
      "Revenue (MYR)": c.value,
      "Share of Sales (%)": `${c.percentage}%`,
      "Items / Units Sold": c.count,
    }));
    const wsCategories = XLSX.utils.json_to_sheet(categoryRows);
    XLSX.utils.book_append_sheet(wb, wsCategories, "Sales by Category");

    // 3. Sheet: Product Sales Breakdown
    const productRows = productData.map((p) => ({
      "Product / Service Name": p.productName,
      "Category": p.categoryName,
      "Type": p.isService ? "Printing Service" : "Stock Merchandise",
      "Units Sold": p.unitsSold,
      "Unit Price (MYR)": p.unitPrice,
      "Total Revenue (MYR)": p.totalRevenue,
      "Total COGS (MYR)": p.totalCogs,
      "Gross Profit (MYR)": p.profit,
      "Profit Margin (%)": `${p.margin}%`,
    }));
    const wsProducts = XLSX.utils.json_to_sheet(productRows);
    XLSX.utils.book_append_sheet(wb, wsProducts, "Product Sales Breakdown");

    XLSX.writeFile(
      wb,
      `Nolan_Printing_Financial_Report_${new Date().toISOString().split("T")[0]}.xlsx`
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Section Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 rounded-xl flex items-center justify-center font-bold">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-800 dark:text-white">{t("analytics")}</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {t("reports_subtitle")}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Tab Switcher */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-semibold">
            <button
              onClick={() => setActiveReportTab("financial")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
                activeReportTab === "financial"
                  ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm font-bold"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <DollarSign className="w-3.5 h-3.5" />
              <span>{t("financials_and_sales")}</span>
            </button>
            <button
              onClick={() => setActiveReportTab("stock_intake")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
                activeReportTab === "stock_intake"
                  ? "bg-emerald-600 text-white shadow-sm font-bold"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <Truck className="w-3.5 h-3.5" />
              <span>{t("stock_intake_restock")}</span>
            </button>
          </div>

          {activeReportTab === "financial" && (
            <button
              onClick={handleExportExcel}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20 transition"
            >
              <Download className="w-4 h-4" />
              <span>{t("export_excel_btn")}</span>
            </button>
          )}
        </div>
      </div>

      {activeReportTab === "stock_intake" ? (
        <StockIntakeReportView />
      ) : loading ? (
        <div className="space-y-6 animate-fade-in">
          {/* Skeleton P&L and Pie Chart */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-6 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm animate-pulse space-y-4">
              <div className="flex justify-between items-center pb-4 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-200 dark:bg-slate-800" />
                  <div className="space-y-1.5">
                    <div className="h-4 w-36 bg-slate-200 dark:bg-slate-800 rounded" />
                    <div className="h-3 w-48 bg-slate-100 dark:bg-slate-800/60 rounded" />
                  </div>
                </div>
                <div className="h-5 w-24 bg-slate-200 dark:bg-slate-800 rounded-full" />
              </div>
              <div className="space-y-3 py-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800/50">
                    <div className="h-3.5 w-36 bg-slate-200 dark:bg-slate-800 rounded" />
                    <div className="h-3.5 w-20 bg-slate-200 dark:bg-slate-800 rounded" />
                  </div>
                ))}
              </div>
            </div>
            <div className="lg:col-span-6 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm animate-pulse space-y-4">
              <div className="flex justify-between items-center pb-4 border-b border-slate-100 dark:border-slate-800">
                <div className="h-4 w-32 bg-slate-200 dark:bg-slate-800 rounded" />
                <div className="h-5 w-20 bg-slate-200 dark:bg-slate-800 rounded-full" />
              </div>
              <div className="h-64 flex items-center justify-center">
                <div className="w-36 h-36 rounded-full border-8 border-slate-200 dark:border-slate-800 animate-pulse" />
              </div>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Row 1: Executive P&L Financial Statement Card + Category Sales Pie Chart */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Executive P&L Financial Statement Card */}
        <div className="lg:col-span-6 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between transition-colors">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                  <DollarSign className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="font-bold text-sm text-slate-800 dark:text-white">{t("pl_statement")}</h2>
                  <p className="text-[11px] text-slate-400">{t("executive_ledger")}</p>
                </div>
              </div>
              <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                {summary?.totalTransactions || 0} {t("sales_recorded")}
              </span>
            </div>

            {/* Income & Expenditure Statement Items */}
            <div className="divide-y divide-slate-100 dark:divide-slate-800/80 text-xs mt-3">
              {/* Gross Sales */}
              <div className="py-2.5 flex justify-between items-center">
                <span className="font-semibold text-slate-600 dark:text-slate-300">1. {t("gross_sales_revenue")}</span>
                <span className="font-bold text-slate-900 dark:text-white">{formatMYR(summary?.totalRevenue)}</span>
              </div>

              {/* Discounts */}
              {(summary?.totalDiscounts || 0) > 0 && (
                <div className="py-2 flex justify-between items-center text-amber-600 dark:text-amber-400 pl-3 text-[11px]">
                  <span>(-) {t("discounts_given")}</span>
                  <span>-{formatMYR(summary?.totalDiscounts)}</span>
                </div>
              )}

              {/* COGS */}
              <div className="py-2.5 flex justify-between items-center text-rose-600 dark:text-rose-400">
                <span className="font-semibold">2. (-) {t("cogs")}</span>
                <span className="font-bold">-{formatMYR(summary?.totalCogs)}</span>
              </div>

              {/* Gross Profit KPI Banner */}
              <div className="py-2.5 px-3 my-1 bg-slate-50 dark:bg-slate-800/60 rounded-xl flex justify-between items-center font-bold text-slate-800 dark:text-slate-100">
                <div className="flex items-center gap-1.5">
                  <span className="text-emerald-600 dark:text-emerald-400">(=) {t("gross_profit")}</span>
                  <span className="text-[10px] font-normal text-slate-400">
                    ({summary?.grossMargin || 0}% {t("profit_margin")})
                  </span>
                </div>
                <span className="font-black text-slate-900 dark:text-white">
                  {formatMYR(summary?.grossProfit)}
                </span>
              </div>

              {/* Operating Expenses */}
              <div className="py-2.5 flex justify-between items-center text-rose-600 dark:text-rose-400">
                <span className="font-semibold">3. (-) {t("total_operating_expenses")}</span>
                <span className="font-bold">-{formatMYR(summary?.totalExpenses)}</span>
              </div>

              {/* Expense Breakdown Pills */}
              {expensesByCategory.length > 0 && (
                <div className="py-2 pl-3 flex flex-wrap gap-1.5">
                  {expensesByCategory.map((e) => (
                    <span
                      key={e.category}
                      className="text-[10px] px-2 py-0.5 rounded-md bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 font-medium"
                    >
                      {translateExpenseCategory(e.category, language)}: {formatMYR(e.amount)}
                    </span>
                  ))}
                </div>
              )}

              {/* Net Profit Hero Highlight */}
              <div className="pt-3.5 pb-1">
                <div className="p-3.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white rounded-xl flex justify-between items-center shadow-md shadow-blue-600/20">
                  <div>
                    <span className="text-[11px] uppercase tracking-wider text-blue-100 font-bold block">
                      (=) {t("net_operating_profit")}
                    </span>
                    <span className="text-xs text-blue-200">
                      {t("net_profit")} {t("profit_margin")}: <strong>{summary?.profitMargin || 0}%</strong>
                    </span>
                  </div>
                  <div className="text-xl font-black">{formatMYR(summary?.netProfit)}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Category Sales Pie / Donut Chart */}
        <div className="lg:col-span-6 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col transition-colors">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
                <PieIcon className="w-4 h-4" />
              </div>
              <div>
                <h2 className="font-bold text-sm text-slate-800 dark:text-white">{t("sales_by_category")}</h2>
                <p className="text-[11px] text-slate-400">{t("revenue_market_share")}</p>
              </div>
            </div>
            <span className="text-[11px] font-bold text-slate-400">
              {categoryData.length} {t("categories_count")}
            </span>
          </div>

          <div className="flex-1 min-h-[260px] flex items-center justify-center pt-2">
            {categoryData.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-xs">
                <PieIcon className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <span>{t("no_categories_found")}</span>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={categoryData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={95}
                    paddingAngle={3}
                    onClick={(entry) => setSelectedCategory(entry.name)}
                    cursor="pointer"
                  >
                    {categoryData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={PIE_COLORS[index % PIE_COLORS.length]}
                        stroke="transparent"
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val: any) => formatMYR(val)}
                    contentStyle={{
                      borderRadius: "12px",
                      fontSize: "12px",
                      backgroundColor: "#0f172a",
                      color: "#fff",
                      border: "none",
                      padding: "8px 12px",
                    }}
                  />
                  <Legend
                    formatter={(value) => (
                      <span className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                        {translateCategory(value, language)}
                      </span>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Quick Category Share Chips */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap gap-2">
            {categoryData.map((c, i) => (
              <button
                key={c.name}
                onClick={() => setSelectedCategory(c.name)}
                className={`text-[11px] px-2.5 py-1 rounded-lg border font-semibold flex items-center gap-1.5 transition ${
                  selectedCategory.toLowerCase() === c.name.toLowerCase()
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100"
                }`}
              >
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }}
                />
                <span>{translateCategory(c.name, language)}:</span>
                <strong>{c.percentage}%</strong>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Row 2: Category Filter & Product-Level Sales Drilldown Section */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-5 transition-colors">
        {/* Drilldown Section Header & Category Filters */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <h2 className="font-bold text-sm text-slate-800 dark:text-white">
                {t("product_sales_drilldown")}
              </h2>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {t("select_category_inspect")}
            </p>
          </div>

          {/* Search within filtered list */}
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder={t("search_product_service")}
              value={productSearch}
              onChange={(e) => setProductSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>
        </div>

        {/* Category Pills Filter Bar */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <button
            onClick={() => setSelectedCategory("all")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition ${
              selectedCategory === "all"
                ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm"
                : "bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100"
            }`}
          >
            {t("all_categories")} ({productData.length} {t("active_items")})
          </button>
          {categoryData.map((c) => (
            <button
              key={c.name}
              onClick={() => setSelectedCategory(c.name)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition ${
                selectedCategory.toLowerCase() === c.name.toLowerCase()
                  ? "bg-blue-600 text-white shadow-sm"
                  : "bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100"
              }`}
            >
              {translateCategory(c.name, language)} ({formatMYR(c.value)})
            </button>
          ))}
        </div>

        {/* Visual Bar Chart of Top Products in Current Category */}
        {topProductsChart.length > 0 && (
          <div className="p-4 bg-slate-50/60 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800">
            <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-blue-600" />
              <span>{t("top_generating_products")} ({selectedCategory === "all" ? t("all_categories") : translateCategory(selectedCategory, language)})</span>
            </h3>
            <div className="h-44">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topProductsChart}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.5} />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip formatter={(v: any) => formatMYR(v)} />
                  <Bar dataKey="revenue" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Product Sales Breakdown Table */}
        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold">
              <tr>
                <th className="p-3.5">{t("product_or_service")}</th>
                <th className="p-3.5">{t("category")}</th>
                <th className="p-3.5 text-center">{t("type")}</th>
                <th className="p-3.5 text-right">{t("units_sold")}</th>
                <th className="p-3.5 text-right">{t("total_revenue")}</th>
                <th className="p-3.5 text-right">{t("cogs")}</th>
                <th className="p-3.5 text-right">{t("gross_profit_tbl")}</th>
                <th className="p-3.5 text-right">{t("margin_tbl")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-200">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400">
                    {t("no_product_sales_found")} <strong>{selectedCategory === "all" ? t("all_categories") : translateCategory(selectedCategory, language)}</strong>
                  </td>
                </tr>
              ) : (
                filteredProducts.map((prod) => (
                  <tr
                    key={prod.productId}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition"
                  >
                    <td className="p-3.5 font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      {prod.isService ? (
                        <Printer className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                      ) : (
                        <Package className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      )}
                      <span>{prod.productName}</span>
                    </td>
                    <td className="p-3.5 font-medium text-slate-500 dark:text-slate-400">
                      {translateCategory(prod.categoryName, language)}
                    </td>
                    <td className="p-3.5 text-center">
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
                    <td className="p-3.5 text-right font-bold text-slate-900 dark:text-white">
                      {prod.unitsSold}
                    </td>
                    <td className="p-3.5 text-right font-black text-blue-600 dark:text-blue-400">
                      {formatMYR(prod.totalRevenue)}
                    </td>
                    <td className="p-3.5 text-right text-rose-600 dark:text-rose-400 font-semibold">
                      {formatMYR(prod.totalCogs)}
                    </td>
                    <td className="p-3.5 text-right font-bold text-emerald-600 dark:text-emerald-400">
                      {formatMYR(prod.profit)}
                    </td>
                    <td className="p-3.5 text-right">
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          prod.margin >= 40
                            ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300"
                            : prod.margin >= 20
                            ? "bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300"
                            : "bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300"
                        }`}
                      >
                        {prod.margin}%
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
        </>
      )}
    </div>
  );
}
