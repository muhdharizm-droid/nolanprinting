"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Bell, AlertTriangle, ArrowRight, Package, CheckCircle2, RefreshCw } from "lucide-react";
import { useI18n } from "@/lib/i18n/context";

interface WorkflowItem {
  id: number;
  productId: number;
  currentStock: number;
  threshold: number;
  suggestedQty: number;
  status: string;
  poNumber?: string | null;
  product: {
    name: string;
    barcode?: string | null;
    category?: { name: string } | null;
  };
  supplier?: {
    name: string;
  } | null;
}

export default function LowStockAlertBell() {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [workflows, setWorkflows] = useState<WorkflowItem[]>([]);
  const [summary, setSummary] = useState<{
    totalActive: number;
    triggeredCount: number;
    criticalCount: number;
    inTransitCount: number;
  } | null>(null);

  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchAlerts = async () => {
    try {
      const res = await fetch("/api/workflows/low-stock");
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setWorkflows(data.workflows || []);
          setSummary(data.summary || null);
        }
      }
    } catch (e) {
      console.error("Failed to load low-stock alerts:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
    // Poll alerts every 60 seconds
    const interval = setInterval(fetchAlerts, 60000);
    return () => clearInterval(interval);
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as HTMLElement)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open]);

  const triggeredItems = workflows.filter((w) => w.status === "alert_triggered");
  const alertCount = triggeredItems.length;
  const criticalCount = summary?.criticalCount || 0;

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Alert Bell Button */}
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="relative p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-300 dark:hover:border-blue-600 transition shadow-sm cursor-pointer"
        title={t("low_stock_alerts")}
        aria-label={t("low_stock_alerts")}
      >
        <Bell className="w-4 h-4" />

        {/* Animated Badge */}
        {alertCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-rose-600 text-white text-[10px] font-black shadow-md shadow-rose-600/40">
            {criticalCount > 0 && (
              <span className="absolute -inset-0.5 rounded-full bg-rose-500 animate-ping opacity-75" />
            )}
            <span className="relative z-10">{alertCount}</span>
          </span>
        )}
      </button>

      {/* Dropdown Menu */}
      {open && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 z-50 overflow-hidden animate-fade-in">
          {/* Header */}
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-800/50">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center font-bold">
                <AlertTriangle className="w-3.5 h-3.5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-800 dark:text-white">
                  {t("low_stock_alerts")}
                </h4>
                <p className="text-[10px] text-slate-400">
                  {t("reorder_monitor_sub")}
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                setLoading(true);
                fetchAlerts();
              }}
              title={t("refresh_alerts")}
              className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>

          {/* Quick Metrics Bar */}
          {alertCount > 0 && (
            <div className="grid grid-cols-2 gap-2 p-3 bg-amber-50/60 dark:bg-amber-950/20 border-b border-amber-200/50 dark:border-amber-900/30 text-xs">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-rose-500" />
                <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                  {criticalCount} {t("out_of_stock")}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                  {alertCount - criticalCount} {t("low_level")}
                </span>
              </div>
            </div>
          )}

          {/* Alert Items List */}
          <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
            {triggeredItems.length === 0 ? (
              <div className="p-6 text-center text-slate-400 dark:text-slate-500 text-xs flex flex-col items-center gap-2">
                <div className="w-10 h-10 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-bold text-slate-700 dark:text-slate-200">
                    {t("stock_levels_healthy")}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {t("no_threshold_breach")}
                  </p>
                </div>
              </div>
            ) : (
              triggeredItems.slice(0, 4).map((item) => {
                const isOut = item.currentStock <= 0;
                return (
                  <div
                    key={item.id}
                    className="p-3 hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition flex items-start justify-between gap-3 text-xs"
                  >
                    <div className="space-y-0.5 min-w-0">
                      <div className="font-bold text-slate-800 dark:text-white truncate">
                        {item.product.name}
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-slate-400">
                        <span>{t("min")}: {item.threshold}</span>
                        <span>•</span>
                        <span>{item.supplier?.name || t("no_supplier_assigned")}</span>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          isOut
                            ? "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                            : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                        }`}
                      >
                        {isOut ? t("out_of_stock_count") : `${item.currentStock} ${t("left")}`}
                      </span>
                      <div className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold mt-0.5">
                        +{item.suggestedQty} {t("reorder_rec")}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer Action */}
          <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-100 dark:border-slate-800">
            <Link
              href="/workflows/low-stock"
              onClick={() => setOpen(false)}
              className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-600/20 transition"
            >
              <span>{t("manage_reorder_workflow")}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

