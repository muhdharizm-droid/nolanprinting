"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  BellRing,
  AlertTriangle,
  Package,
  Truck,
  FileText,
  Clock,
  CheckCircle2,
  Phone,
  Send,
  Printer,
  Calendar,
  Layers,
  ArrowRight,
  RefreshCw,
  Plus,
  ExternalLink,
  ChevronRight,
  Boxes,
  XCircle,
  Eye,
} from "lucide-react";
import { useI18n } from "@/lib/i18n/context";
import { formatMYR, formatDate } from "@/lib/utils";
import PurchaseOrderModal from "@/components/PurchaseOrderModal";

interface WorkflowItem {
  id: number;
  productId: number;
  supplierId?: number | null;
  currentStock: number;
  threshold: number;
  suggestedQty: number;
  orderQty?: number | null;
  status: "alert_triggered" | "po_issued" | "in_transit" | "received" | "dismissed";
  poNumber?: string | null;
  expectedDate?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  product: {
    id: number;
    name: string;
    barcode?: string | null;
    price: number | string;
    costPrice: number | string;
    packSize: number;
    isRawMaterial: boolean;
    category?: { name: string } | null;
    supplier?: {
      id: number;
      name: string;
      contact?: string | null;
      email?: string | null;
    } | null;
  };
  supplier?: {
    id: number;
    name: string;
    contact?: string | null;
    email?: string | null;
    address?: string | null;
  } | null;
  createdBy?: { id: number; fullName: string; username: string } | null;
  resolvedBy?: { id: number; fullName: string; username: string } | null;
}

export default function LowStockWorkflowPage() {
  const { t, language } = useI18n();

  const [workflows, setWorkflows] = useState<WorkflowItem[]>([]);
  const [resolvedWorkflows, setResolvedWorkflows] = useState<WorkflowItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"triggered" | "po_issued" | "in_transit" | "received">("triggered");
  const [searchQuery, setSearchQuery] = useState("");
  const [supplierFilter, setSupplierFilter] = useState("all");
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // PO Modal State
  const [poModalOpen, setPoModalOpen] = useState(false);
  const [selectedPoData, setSelectedPoData] = useState<{
    poNumber: string;
    expectedDate?: string | null;
    supplier: any;
    items: any[];
    notes?: string | null;
  } | null>(null);

  // Single Action Modal State (Issue PO / Receive Delivery)
  const [actionModal, setActionModal] = useState<{
    type: "issue_po" | "mark_in_transit" | "receive_stock" | "dismiss";
    workflow: WorkflowItem;
    orderQty?: number;
    expectedDate?: string;
    notes?: string;
    receivedQty?: number;
  } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Batch Selection
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [batchSupplier, setBatchSupplier] = useState<string>("");

  const fetchWorkflows = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/workflows/low-stock");
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setWorkflows(data.workflows || []);
          setResolvedWorkflows(data.resolvedWorkflows || []);
        }
      }
    } catch (e) {
      console.error("Failed to load workflows:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkflows();
  }, []);

  const triggeredItems = workflows.filter((w) => w.status === "alert_triggered");
  const poIssuedItems = workflows.filter((w) => w.status === "po_issued");
  const inTransitItems = workflows.filter((w) => w.status === "in_transit");

  const currentTabItems =
    activeTab === "triggered"
      ? triggeredItems
      : activeTab === "po_issued"
      ? poIssuedItems
      : activeTab === "in_transit"
      ? inTransitItems
      : resolvedWorkflows;

  // Filter items by search & supplier
  const filteredItems = currentTabItems.filter((item) => {
    const matchSearch =
      item.product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.product.barcode && item.product.barcode.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (item.poNumber && item.poNumber.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchSupplier =
      supplierFilter === "all" ||
      (item.supplierId && item.supplierId.toString() === supplierFilter) ||
      (item.product.supplier?.id && item.product.supplier.id.toString() === supplierFilter);

    return matchSearch && matchSupplier;
  });

  // Unique suppliers from workflows
  const supplierList = Array.from(
    new Map(
      workflows
        .map((w) => w.supplier || w.product.supplier)
        .filter(Boolean)
        .map((s) => [s!.id, s!])
    ).values()
  );

  // Quick WhatsApp Message Generator
  const generateWhatsAppLink = (item: WorkflowItem) => {
    const rawContact = item.supplier?.contact || item.product.supplier?.contact || "";
    const cleanPhone = rawContact.replace(/[^0-9]/g, "");
    const qty = item.suggestedQty || item.orderQty || 10;

    const message = `Hello ${item.supplier?.name || item.product.supplier?.name || "Supplier"}, this is Nolan Printing Services.\n\nWe would like to reorder:\n- *${item.product.name}*\n- Qty: *${qty} units* (Pack size: ${item.product.packSize || 1})\n\nPlease confirm availability and delivery schedule. Thank you!`;

    return `https://wa.me/${cleanPhone.startsWith("0") ? "6" + cleanPhone : cleanPhone}?text=${encodeURIComponent(
      message
    )}`;
  };

  // Open Full Purchase Order Slip
  const openPoSlip = (item: WorkflowItem) => {
    setSelectedPoData({
      poNumber: item.poNumber || `PO-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}`,
      expectedDate: item.expectedDate,
      supplier: item.supplier || item.product.supplier,
      items: [
        {
          name: item.product.name,
          barcode: item.product.barcode,
          quantity: item.orderQty || item.suggestedQty,
          costPrice: Number(item.product.costPrice),
          packSize: item.product.packSize,
        },
      ],
      notes: item.notes,
    });
    setPoModalOpen(true);
  };

  // Handle Workflow Action Submission
  const handleActionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!actionModal) return;

    setActionLoading(true);
    try {
      const payload: any = {
        action: actionModal.type,
        workflowId: actionModal.workflow.id,
        notes: actionModal.notes,
      };

      if (actionModal.type === "issue_po") {
        payload.orderQty = actionModal.orderQty;
        payload.expectedDate = actionModal.expectedDate;
      } else if (actionModal.type === "mark_in_transit") {
        payload.expectedDate = actionModal.expectedDate;
      } else if (actionModal.type === "receive_stock") {
        payload.receivedQty = actionModal.receivedQty;
      }

      const res = await fetch("/api/workflows/low-stock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to process workflow step");
      }

      setStatusMessage({
        type: "success",
        text:
          actionModal.type === "receive_stock"
            ? `Stock received! Added ${actionModal.receivedQty || actionModal.workflow.suggestedQty} units to inventory.`
            : `Workflow advanced successfully.`,
      });
      setTimeout(() => setStatusMessage(null), 4000);

      setActionModal(null);
      fetchWorkflows();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Batch PO Issue for selected supplier
  const handleBatchIssuePo = async () => {
    if (selectedIds.length === 0) return;
    setActionLoading(true);
    try {
      const res = await fetch("/api/workflows/low-stock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "batch_issue_po",
          workflowIds: selectedIds,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to issue batch PO");
      }

      setStatusMessage({
        type: "success",
        text: `Batch PO ${data.poNumber} issued for ${selectedIds.length} items.`,
      });
      setTimeout(() => setStatusMessage(null), 4000);
      setSelectedIds([]);
      fetchWorkflows();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-fade-in">
      {/* Top Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 text-white p-6 sm:p-8 shadow-xl border border-slate-800">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start sm:items-center gap-4">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center font-bold shrink-0 shadow-lg">
              <BellRing className="w-8 h-8 animate-pulse" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-xs font-semibold text-blue-200 border border-white/10 mb-1.5">
                <Boxes className="w-3.5 h-3.5" />
                <span>Automated Workflow #1</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight">
                Low-Stock Alert & Reordering Pipeline
              </h1>
              <p className="text-slate-300 text-xs sm:text-sm mt-1 max-w-xl">
                Automatic threshold breach detection, WhatsApp & formal PO generation, in-transit tracking, and one-click intake restock.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={fetchWorkflows}
              className="flex items-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 active:bg-white/30 text-white text-xs font-semibold rounded-xl backdrop-blur-md border border-white/10 transition cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              <span>Refresh Pipeline</span>
            </button>
          </div>
        </div>
      </div>

      {/* Global Status Message */}
      {statusMessage && (
        <div
          className={`p-3.5 rounded-xl border text-xs font-bold flex items-center gap-2.5 animate-fade-in ${
            statusMessage.type === "success"
              ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300"
              : "bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-300"
          }`}
        >
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Pipeline Metric Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Triggered Alerts */}
        <div
          onClick={() => setActiveTab("triggered")}
          className={`p-5 rounded-2xl border transition-all cursor-pointer ${
            activeTab === "triggered"
              ? "bg-rose-50 dark:bg-rose-950/30 border-rose-400 dark:border-rose-800 shadow-md"
              : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-rose-300"
          }`}
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">1. Alerts Triggered</span>
            <AlertTriangle className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-2xl font-black text-rose-600 dark:text-rose-400">
            {triggeredItems.length}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">
            Needs purchase order / reorder
          </span>
        </div>

        {/* PO Issued */}
        <div
          onClick={() => setActiveTab("po_issued")}
          className={`p-5 rounded-2xl border transition-all cursor-pointer ${
            activeTab === "po_issued"
              ? "bg-blue-50 dark:bg-blue-950/30 border-blue-400 dark:border-blue-800 shadow-md"
              : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-blue-300"
          }`}
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">2. PO Issued</span>
            <FileText className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-black text-blue-600 dark:text-blue-400">
            {poIssuedItems.length}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">
            Sent to supplier for fulfillment
          </span>
        </div>

        {/* In Transit */}
        <div
          onClick={() => setActiveTab("in_transit")}
          className={`p-5 rounded-2xl border transition-all cursor-pointer ${
            activeTab === "in_transit"
              ? "bg-amber-50 dark:bg-amber-950/30 border-amber-400 dark:border-amber-800 shadow-md"
              : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-amber-300"
          }`}
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">3. In Transit</span>
            <Truck className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-amber-600 dark:text-amber-400">
            {inTransitItems.length}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">
            Dispatched & awaiting delivery
          </span>
        </div>

        {/* Resolved History */}
        <div
          onClick={() => setActiveTab("received")}
          className={`p-5 rounded-2xl border transition-all cursor-pointer ${
            activeTab === "received"
              ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-400 dark:border-emerald-800 shadow-md"
              : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-emerald-300"
          }`}
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">4. Restocked</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
            {resolvedWorkflows.length}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">
            Completed restocks & intake logs
          </span>
        </div>
      </div>

      {/* Controls & Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        {/* Pipeline Tabs */}
        <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl overflow-x-auto text-xs font-semibold">
          <button
            onClick={() => setActiveTab("triggered")}
            className={`px-3 py-1.5 rounded-lg transition whitespace-nowrap ${
              activeTab === "triggered"
                ? "bg-rose-600 text-white shadow-sm font-bold"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            🚨 Alerts ({triggeredItems.length})
          </button>

          <button
            onClick={() => setActiveTab("po_issued")}
            className={`px-3 py-1.5 rounded-lg transition whitespace-nowrap ${
              activeTab === "po_issued"
                ? "bg-blue-600 text-white shadow-sm font-bold"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            📋 PO Issued ({poIssuedItems.length})
          </button>

          <button
            onClick={() => setActiveTab("in_transit")}
            className={`px-3 py-1.5 rounded-lg transition whitespace-nowrap ${
              activeTab === "in_transit"
                ? "bg-amber-600 text-white shadow-sm font-bold"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            🚚 In Transit ({inTransitItems.length})
          </button>

          <button
            onClick={() => setActiveTab("received")}
            className={`px-3 py-1.5 rounded-lg transition whitespace-nowrap ${
              activeTab === "received"
                ? "bg-emerald-600 text-white shadow-sm font-bold"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            ✅ History ({resolvedWorkflows.length})
          </button>
        </div>

        {/* Search & Supplier Filter */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <input
            type="text"
            placeholder="Search item, barcode, or PO#..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600"
          />

          <select
            value={supplierFilter}
            onChange={(e) => setSupplierFilter(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 focus:outline-none"
          >
            <option value="all">All Suppliers ({supplierList.length})</option>
            {supplierList.map((sup) => (
              <option key={sup.id} value={sup.id.toString()}>
                {sup.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Workflow Stage Content Table / Cards */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            Loading low-stock pipeline...
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="p-12 text-center text-slate-400 dark:text-slate-500 text-xs flex flex-col items-center gap-3">
            <CheckCircle2 className="w-10 h-10 text-emerald-500" />
            <div>
              <p className="font-bold text-slate-700 dark:text-slate-200 text-sm">
                No items in this workflow stage
              </p>
              <p className="text-[11px] text-slate-400 mt-1">
                {activeTab === "triggered"
                  ? "All active items are safely stocked above their minimum inventory threshold."
                  : `No records currently matching '${activeTab.replace("_", " ")}'.`}
              </p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-100 dark:border-slate-800">
                <tr>
                  <th className="p-3.5">Product & SKU</th>
                  <th className="p-3.5">Assigned Supplier</th>
                  <th className="p-3.5 text-center">Stock / Threshold</th>
                  <th className="p-3.5 text-center">Suggested Order</th>
                  {activeTab !== "triggered" && <th className="p-3.5">PO Number</th>}
                  {activeTab === "in_transit" && <th className="p-3.5">Expected Delivery</th>}
                  {activeTab === "received" && <th className="p-3.5">Restocked By</th>}
                  <th className="p-3.5 text-right">Workflow Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredItems.map((item) => {
                  const isOut = item.currentStock <= 0;
                  const supplier = item.supplier || item.product.supplier;

                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition"
                    >
                      {/* Product Name & Details */}
                      <td className="p-3.5">
                        <div className="font-bold text-slate-900 dark:text-white">
                          {item.product.name}
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                          {item.product.barcode && <span className="font-mono">#{item.product.barcode}</span>}
                          {item.product.category?.name && (
                            <span className="px-1.5 py-0.2 bg-slate-100 dark:bg-slate-800 rounded">
                              {item.product.category.name}
                            </span>
                          )}
                          {item.product.isRawMaterial && (
                            <span className="text-emerald-600 font-bold">Paper/Supply</span>
                          )}
                        </div>
                      </td>

                      {/* Supplier */}
                      <td className="p-3.5">
                        {supplier ? (
                          <div>
                            <div className="font-semibold text-slate-800 dark:text-slate-200">
                              {supplier.name}
                            </div>
                            {supplier.contact && (
                              <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                                <Phone className="w-3 h-3 text-slate-400" />
                                <span>{supplier.contact}</span>
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">Unassigned Supplier</span>
                        )}
                      </td>

                      {/* Current Stock vs Threshold */}
                      <td className="p-3.5 text-center">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                            isOut
                              ? "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-200 dark:border-rose-800"
                              : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-200 dark:border-amber-800"
                          }`}
                        >
                          {isOut ? "OUT OF STOCK (0)" : `${item.currentStock} left`}
                        </span>
                        <div className="text-[10px] text-slate-400 mt-0.5 font-medium">
                          Min Level: {item.threshold}
                        </div>
                      </td>

                      {/* Suggested Reorder Units */}
                      <td className="p-3.5 text-center">
                        <div className="font-black text-blue-600 dark:text-blue-400 text-sm">
                          +{item.orderQty || item.suggestedQty}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {item.product.packSize > 1 ? `${item.product.packSize} pcs/pack` : "units"}
                        </div>
                      </td>

                      {/* PO Number if issued */}
                      {activeTab !== "triggered" && (
                        <td className="p-3.5 font-mono text-[11px]">
                          {item.poNumber ? (
                            <button
                              onClick={() => openPoSlip(item)}
                              className="text-blue-600 dark:text-blue-400 font-bold hover:underline flex items-center gap-1"
                            >
                              <span>{item.poNumber}</span>
                              <Eye className="w-3 h-3" />
                            </button>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>
                      )}

                      {/* Expected Date if in transit */}
                      {activeTab === "in_transit" && (
                        <td className="p-3.5 text-slate-600 dark:text-slate-300 font-medium">
                          {item.expectedDate ? formatDate(item.expectedDate) : "Pending dispatch"}
                        </td>
                      )}

                      {/* Restocked info if resolved */}
                      {activeTab === "received" && (
                        <td className="p-3.5 text-slate-600 dark:text-slate-300">
                          <div className="font-semibold text-slate-800 dark:text-white">
                            {item.resolvedBy?.fullName || "Staff"}
                          </div>
                          <div className="text-[10px] text-slate-400">{formatDate(item.updatedAt)}</div>
                        </td>
                      )}

                      {/* Contextual Workflow Action Buttons */}
                      <td className="p-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {activeTab === "triggered" && (
                            <>
                              {/* 1. Quick WhatsApp Supplier */}
                              {supplier?.contact && (
                                <a
                                  href={generateWhatsAppLink(item)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  title="Send instant WhatsApp restock message"
                                  className="flex items-center gap-1 px-2.5 py-1.5 bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-300 rounded-xl font-bold transition text-xs border border-emerald-200 dark:border-emerald-800"
                                >
                                  <Send className="w-3 h-3" />
                                  <span>WhatsApp</span>
                                </a>
                              )}

                              {/* 2. Issue Formal Purchase Order */}
                              <button
                                onClick={() =>
                                  setActionModal({
                                    type: "issue_po",
                                    workflow: item,
                                    orderQty: item.suggestedQty,
                                    expectedDate: new Date(Date.now() + 3 * 86400000)
                                      .toISOString()
                                      .slice(0, 10),
                                  })
                                }
                                className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-xl font-bold shadow-md shadow-blue-600/20 transition cursor-pointer"
                              >
                                <FileText className="w-3.5 h-3.5" />
                                <span>Issue PO</span>
                              </button>
                            </>
                          )}

                          {activeTab === "po_issued" && (
                            <>
                              <button
                                onClick={() => openPoSlip(item)}
                                title="Print PO Slip"
                                className="p-1.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 rounded-lg transition"
                              >
                                <Printer className="w-4 h-4" />
                              </button>

                              <button
                                onClick={() =>
                                  setActionModal({
                                    type: "mark_in_transit",
                                    workflow: item,
                                    expectedDate: item.expectedDate
                                      ? new Date(item.expectedDate).toISOString().slice(0, 10)
                                      : new Date(Date.now() + 86400000).toISOString().slice(0, 10),
                                  })
                                }
                                className="flex items-center gap-1 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold shadow-md shadow-amber-500/20 transition cursor-pointer"
                              >
                                <Truck className="w-3.5 h-3.5" />
                                <span>Mark In Transit</span>
                              </button>
                            </>
                          )}

                          {activeTab === "in_transit" && (
                            <button
                              onClick={() =>
                                setActionModal({
                                  type: "receive_stock",
                                  workflow: item,
                                  receivedQty: item.orderQty || item.suggestedQty,
                                })
                              }
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl font-bold shadow-md shadow-emerald-600/20 transition cursor-pointer animate-pulse"
                            >
                              <CheckCircle2 className="w-4 h-4" />
                              <span>Receive & Restock</span>
                            </button>
                          )}

                          {activeTab === "received" && (
                            <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Restocked</span>
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Action Dialog Modal (Issue PO, Mark In Transit, Receive Delivery) */}
      {actionModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-fade-in">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                {actionModal.type === "issue_po" && <FileText className="w-4 h-4 text-blue-600" />}
                {actionModal.type === "mark_in_transit" && <Truck className="w-4 h-4 text-amber-500" />}
                {actionModal.type === "receive_stock" && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                <h3 className="font-bold text-sm text-slate-800 dark:text-white">
                  {actionModal.type === "issue_po" && "Issue Purchase Order (PO)"}
                  {actionModal.type === "mark_in_transit" && "Confirm Order In Transit"}
                  {actionModal.type === "receive_stock" && "Confirm Stock Delivery & Intake"}
                </h3>
              </div>
              <button
                onClick={() => setActionModal(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleActionSubmit} className="p-5 space-y-4 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60">
                <span className="text-[10px] text-slate-400 uppercase font-bold">Selected Item:</span>
                <div className="font-bold text-slate-900 dark:text-white text-sm">
                  {actionModal.workflow.product.name}
                </div>
                <div className="flex items-center justify-between text-slate-500 mt-1">
                  <span>Current Stock: {actionModal.workflow.currentStock}</span>
                  <span>Threshold: {actionModal.workflow.threshold}</span>
                </div>
              </div>

              {/* Fields for Issue PO */}
              {actionModal.type === "issue_po" && (
                <>
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Order Quantity (Recommended: {actionModal.workflow.suggestedQty})
                    </label>
                    <input
                      type="number"
                      min={1}
                      required
                      value={actionModal.orderQty || ""}
                      onChange={(e) =>
                        setActionModal({ ...actionModal, orderQty: parseInt(e.target.value) || 0 })
                      }
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-bold"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Expected Delivery Date
                    </label>
                    <input
                      type="date"
                      value={actionModal.expectedDate || ""}
                      onChange={(e) =>
                        setActionModal({ ...actionModal, expectedDate: e.target.value })
                      }
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                    />
                  </div>
                </>
              )}

              {/* Fields for Mark In Transit */}
              {actionModal.type === "mark_in_transit" && (
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Expected Arrival Date
                  </label>
                  <input
                    type="date"
                    value={actionModal.expectedDate || ""}
                    onChange={(e) =>
                      setActionModal({ ...actionModal, expectedDate: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-bold"
                  />
                </div>
              )}

              {/* Fields for Receive Delivery */}
              {actionModal.type === "receive_stock" && (
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Units Received & Inspected
                  </label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={actionModal.receivedQty || ""}
                    onChange={(e) =>
                      setActionModal({
                        ...actionModal,
                        receivedQty: parseInt(e.target.value) || 0,
                      })
                    }
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-black text-sm"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    This will automatically increase product inventory stock and record an official stock intake audit log.
                  </p>
                </div>
              )}

              {/* Notes */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Workflow Notes / Logistics Reference
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Courier tracking # or supplier verbal confirmation"
                  value={actionModal.notes || ""}
                  onChange={(e) => setActionModal({ ...actionModal, notes: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setActionModal(null)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-xl font-semibold hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className={`px-5 py-2 text-white font-bold rounded-xl shadow-md transition disabled:opacity-50 cursor-pointer ${
                    actionModal.type === "receive_stock"
                      ? "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20"
                      : actionModal.type === "mark_in_transit"
                      ? "bg-amber-600 hover:bg-amber-700 shadow-amber-600/20"
                      : "bg-blue-600 hover:bg-blue-700 shadow-blue-600/20"
                  }`}
                >
                  {actionLoading ? "Processing..." : "Confirm Action"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Printable Purchase Order Modal */}
      {selectedPoData && (
        <PurchaseOrderModal
          isOpen={poModalOpen}
          onClose={() => setPoModalOpen(false)}
          poNumber={selectedPoData.poNumber}
          expectedDate={selectedPoData.expectedDate}
          supplier={selectedPoData.supplier}
          items={selectedPoData.items}
          notes={selectedPoData.notes}
        />
      )}
    </div>
  );
}

