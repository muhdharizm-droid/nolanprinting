"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Boxes,
  Plus,
  ArrowDownToLine,
  Download,
  Barcode,
  Search,
  Filter,
  AlertTriangle,
  Archive,
  RotateCcw,
  Trash2,
  Edit2,
  CheckCircle2,
  X,
  Printer,
  FileText,
  Info,
  MinusCircle,
  History,
  Layers,
  ClipboardList,
  BarChart3,
  BellRing,
  ArrowRight,
} from "lucide-react";
import * as XLSX from "xlsx";
import JsBarcode from "jsbarcode";
import { useI18n } from "@/lib/i18n/context";
import { translateCategory, translateUsageReason } from "@/lib/i18n/translations";
import { formatMYR, formatDate } from "@/lib/utils";
import StockIntakeReportView from "@/components/StockIntakeReportView";

interface Product {
  id: number;
  barcode: string | null;
  name: string;
  price: string | number;
  costPrice: string | number;
  stock: number;
  packSize: number;
  looseStock: number;
  threshold: number;
  categoryId: number | null;
  supplierId: number | null;
  status: "active" | "archived";
  isService: boolean;
  isRawMaterial: boolean;
  category?: { id: number; name: string } | null;
  supplier?: { id: number; name: string } | null;
  _count?: {
    saleItems: number;
  };
}

export default function InventoryPage() {
  const { t, language } = useI18n();
  const router = useRouter();

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<{ id: number; name: string }[]>([]);
  const [suppliers, setSuppliers] = useState<{ id: number; name: string }[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [activeTab, setActiveTab] = useState<"active" | "retail" | "raw_material" | "service" | "low_stock" | "archived">("active");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCat, setSelectedCat] = useState("all");

  // Modals
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [intakeProduct, setIntakeProduct] = useState<Product | null>(null);
  const [intakeQty, setIntakeQty] = useState(10);
  const [barcodeModalProduct, setBarcodeModalProduct] = useState<Product | null>(null);

  // Delete Action Modal State & Notification Banner
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [toastMsg, setToastMsg] = useState<{ text: string; type: "success" | "info" | "error" } | null>(null);

  // Stock Usage Modal State
  const [usageModalOpen, setUsageModalOpen] = useState(false);
  const [usageProduct, setUsageProduct] = useState<Product | null>(null);
  const [usageQty, setUsageQty] = useState(1);
  const [usageUnitType, setUsageUnitType] = useState<"package" | "loose">("package");
  const [usageReason, setUsageReason] = useState("Loaded to Printer / Copier Tray");
  const [usageNotes, setUsageNotes] = useState("");
  const [usageLoading, setUsageLoading] = useState(false);

  // Usage History State
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [usageHistory, setUsageHistory] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Stock Intake Report Modal State
  const [intakeReportModalOpen, setIntakeReportModalOpen] = useState(false);

  // Form State
  const [formName, setFormName] = useState("");
  const [formBarcode, setFormBarcode] = useState("");
  const [formPrice, setFormPrice] = useState("");
  const [formCostPrice, setFormCostPrice] = useState("");
  const [formStock, setFormStock] = useState("");
  const [formPackSize, setFormPackSize] = useState("1");
  const [formLooseStock, setFormLooseStock] = useState("0");
  const [formThreshold, setFormThreshold] = useState("10");
  const [formCategory, setFormCategory] = useState("");
  const [formSupplier, setFormSupplier] = useState("");
  const [formItemType, setFormItemType] = useState<"retail" | "raw_material" | "service">("retail");
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const barcodeCanvasRef = useRef<SVGSVGElement | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [meRes, pRes, cRes, sRes] = await Promise.all([
        fetch("/api/auth/me"),
        fetch("/api/products?status=all"),
        fetch("/api/categories"),
        fetch("/api/suppliers"),
      ]);
      const meData = await meRes.json();
      if (meData.user?.role === "cashier") {
        router.push("/home");
        return;
      }
      const pData = await pRes.json();
      const cData = await cRes.json();
      const sData = await sRes.json();

      if (pData.success) setProducts(pData.products);
      if (cData.success) setCategories(cData.categories);
      if (sData.success) setSuppliers(sData.suppliers);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Barcode renderer in modal
  useEffect(() => {
    if (barcodeModalProduct && barcodeModalProduct.barcode && barcodeCanvasRef.current) {
      try {
        JsBarcode(barcodeCanvasRef.current, barcodeModalProduct.barcode, {
          format: "CODE128",
          width: 2,
          height: 60,
          displayValue: true,
          fontSize: 14,
        });
      } catch (err) {
        console.error("Barcode render error", err);
      }
    }
  }, [barcodeModalProduct]);

  // Tab Filtering
  const filteredList = products.filter((p) => {
    if (activeTab === "active" && p.status !== "active") return false;
    if (activeTab === "retail" && (p.status !== "active" || p.isService || p.isRawMaterial)) return false;
    if (activeTab === "raw_material" && (p.status !== "active" || !p.isRawMaterial)) return false;
    if (activeTab === "service" && (p.status !== "active" || !p.isService)) return false;
    if (activeTab === "archived" && p.status !== "archived") return false;
    if (activeTab === "low_stock" && (p.status !== "active" || p.isService || p.stock > p.threshold)) return false;

    if (selectedCat !== "all" && p.categoryId?.toString() !== selectedCat) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        p.name.toLowerCase().includes(q) ||
        (p.barcode && p.barcode.toLowerCase().includes(q))
      );
    }

    return true;
  });

  // Export to Excel / CSV
  const handleExportCSV = () => {
    const dataToExport = products.map((p) => ({
      ID: p.id,
      Barcode_SKU: p.barcode || "N/A",
      Product_Name: p.name,
      Category: p.category?.name || "Uncategorized",
      Classification: p.isRawMaterial ? "Raw Material / Printing Supply" : p.isService ? "Service" : "Retail Merchandise",
      Involved_In_POS_Transactions: p.isRawMaterial ? "No (Internal Paper/Supply)" : "Yes",
      Supplier: p.supplier?.name || "N/A",
      Selling_Price_MYR: p.isRawMaterial ? "N/A" : Number(p.price).toFixed(2),
      Cost_Price_MYR: Number(p.costPrice).toFixed(2),
      Current_Stock: p.isService ? "Unlimited" : p.stock,
      Low_Stock_Threshold: p.isService ? "N/A" : p.threshold,
      Total_Valuation_MYR: p.isService ? "0.00" : (Number(p.costPrice) * p.stock).toFixed(2),
      Status: p.status,
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Inventory");
    XLSX.writeFile(wb, `Nolan_Inventory_${new Date().toISOString().split("T")[0]}.xlsx`);
  };

  // Open Add Modal
  const openAddModal = () => {
    setEditProduct(null);
    setFormName("");
    setFormBarcode(Math.floor(100000 + Math.random() * 900000).toString());
    setFormPrice("");
    setFormCostPrice("0.00");
    setFormStock("0");
    setFormPackSize("1");
    setFormLooseStock("0");
    setFormThreshold("10");
    setFormCategory("");
    setFormSupplier("");
    setFormItemType("retail");
    setErrorMsg("");
    setAddModalOpen(true);
  };

  // Open Edit Modal
  const openEditModal = (p: Product) => {
    setEditProduct(p);
    setFormName(p.name);
    setFormBarcode(p.barcode || "");
    setFormPrice(p.price.toString());
    setFormCostPrice(p.costPrice.toString());
    setFormStock(p.stock.toString());
    setFormPackSize((p.packSize || 1).toString());
    setFormLooseStock((p.looseStock || 0).toString());
    setFormThreshold(p.threshold.toString());
    setFormCategory(p.categoryId ? p.categoryId.toString() : "");
    setFormSupplier(p.supplierId ? p.supplierId.toString() : "");
    if (p.isRawMaterial) {
      setFormItemType("raw_material");
    } else if (p.isService) {
      setFormItemType("service");
    } else {
      setFormItemType("retail");
    }
    setErrorMsg("");
    setAddModalOpen(true);
  };

  // Submit Add / Edit
  const handleSubmitProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg("");

    const isRaw = formItemType === "raw_material";
    const isSvc = formItemType === "service";

    const payload = {
      name: formName,
      barcode: formBarcode || null,
      price: isRaw ? 0 : parseFloat(formPrice || "0"),
      costPrice: parseFloat(formCostPrice || "0"),
      stock: isSvc ? 0 : parseInt(formStock || "0", 10),
      threshold: isSvc ? 0 : parseInt(formThreshold || "10", 10),
      categoryId: formCategory ? parseInt(formCategory, 10) : null,
      supplierId: formSupplier ? parseInt(formSupplier, 10) : null,
      isService: isSvc,
      isRawMaterial: isRaw,
      packSize: isRaw ? parseInt(formPackSize || "1", 10) || 1 : 1,
      looseStock: isRaw ? parseInt(formLooseStock || "0", 10) || 0 : 0,
    };

    try {
      let res;
      if (editProduct) {
        res = await fetch(`/api/products/${editProduct.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch("/api/products", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to save product.");
      }

      setAddModalOpen(false);
      fetchData();
    } catch (e: any) {
      setErrorMsg(e.message || "Save error.");
    } finally {
      setSaving(false);
    }
  };

  // Open Record Stock Usage Modal
  const openUsageModal = (product?: Product) => {
    if (product) {
      setUsageProduct(product);
    } else {
      const firstRaw = products.find((p) => p.isRawMaterial && p.status === "active");
      setUsageProduct(firstRaw || products[0] || null);
    }
    setUsageQty(1);
    setUsageUnitType("package");
    setUsageReason("Loaded to Printer / Copier Tray");
    setUsageNotes("");
    setUsageModalOpen(true);
  };

  // Submit Stock Usage (Floor Issue / Machine Load)
  const handleUsageSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!usageProduct) return;
    setUsageLoading(true);

    try {
      const res = await fetch(`/api/products/${usageProduct.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "usage",
          quantity: usageQty,
          unitType: usageUnitType,
          reason: usageReason,
          notes: usageNotes,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to record stock usage.");
      }

      setUsageModalOpen(false);
      setToastMsg({
        text: `Recorded usage of ${usageQty} ${usageUnitType === "package" ? "package(s)" : "loose unit(s)"} for '${usageProduct.name}'.`,
        type: "success",
      });
      fetchData();
    } catch (err: any) {
      alert(err.message || "Error recording stock usage");
    } finally {
      setUsageLoading(false);
    }
  };

  // Open Stock Usage Audit History Modal
  const openHistoryModal = async () => {
    setHistoryModalOpen(true);
    setHistoryLoading(true);
    try {
      const res = await fetch("/api/stock-usage");
      const data = await res.json();
      if (data.success) {
        setUsageHistory(data.usages || []);
      }
    } catch (e) {
      console.error("Failed to fetch usage history", e);
    } finally {
      setHistoryLoading(false);
    }
  };

  // Quick Stock Intake Submit
  const handleIntakeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!intakeProduct) return;

    try {
      const res = await fetch(`/api/products/${intakeProduct.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "intake", quantity: intakeQty }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message);
      setIntakeProduct(null);
      fetchData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Direct Delete / Restore Handlers
  const openDeleteModal = (p: Product) => {
    setDeletingProduct(p);
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deletingProduct) return;
    setDeleteLoading(true);
    try {
      const isArchivedTab = activeTab === "archived";
      const url = isArchivedTab
        ? `/api/products/${deletingProduct.id}?permanent=true`
        : `/api/products/${deletingProduct.id}`;

      const res = await fetch(url, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to delete product.");
      }

      setDeleteModalOpen(false);
      setDeletingProduct(null);
      setToastMsg({
        text: data.message || `Product '${deletingProduct.name}' deleted successfully.`,
        type: "success",
      });
      setTimeout(() => setToastMsg(null), 5000);
      fetchData();
    } catch (err: any) {
      alert(err.message || "Failed to delete product.");
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleRestore = async (p: Product) => {
    try {
      const res = await fetch(`/api/products/${p.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "restore" }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message);
      setToastMsg({
        text: `Product '${p.name}' restored to active inventory.`,
        type: "success",
      });
      setTimeout(() => setToastMsg(null), 4000);
      fetchData();
    } catch (err: any) {
      alert(err.message || "Failed to restore product");
    }
  };

  return (
    <div className="space-y-5">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 rounded-xl flex items-center justify-center font-bold">
            <Boxes className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-slate-800 dark:text-white">{t("inventory")}</h1>
              {loading && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-ping" />
                  {t("syncing")}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">{t("track_stock_subtitle")}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setIntakeReportModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20 transition"
          >
            <BarChart3 className="w-4 h-4" />
            <span>{t("intake_report")}</span>
          </button>

          <button
            onClick={openHistoryModal}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-700 transition"
          >
            <History className="w-4 h-4 text-slate-600 dark:text-slate-400" />
            <span>{t("usage_history")}</span>
          </button>

          <button
            onClick={() => openUsageModal()}
            className="flex items-center gap-1.5 px-3 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold shadow-md shadow-amber-500/20 transition"
          >
            <MinusCircle className="w-4 h-4" />
            <span>{t("record_usage")}</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-700 transition"
          >
            <Download className="w-4 h-4 text-slate-600 dark:text-slate-400" />
            <span>{t("export_csv")}</span>
          </button>

          <button
            onClick={openAddModal}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-600/20 transition"
          >
            <Plus className="w-4 h-4" />
            <span>{t("add_product")}</span>
          </button>
        </div>
      </div>

      {/* Global Notification Banner */}
      {toastMsg && (
        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl text-emerald-800 dark:text-emerald-300 font-bold flex items-center justify-between gap-2 shadow-sm transition-all">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
            <span className="text-xs">{toastMsg.text}</span>
          </div>
          <button onClick={() => setToastMsg(null)} className="text-emerald-600 dark:text-emerald-400 hover:opacity-75">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Tabs & Search Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Tabs */}
        <div className="flex items-center gap-1.5 bg-slate-200/70 dark:bg-slate-800 p-1 rounded-xl overflow-x-auto max-w-full">
          <button
            onClick={() => setActiveTab("active")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
              activeTab === "active"
                ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            {t("all_active")} ({products.filter((p) => p.status === "active").length})
          </button>
          <button
            onClick={() => setActiveTab("retail")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === "retail"
                ? "bg-blue-600 text-white shadow-sm"
                : "text-blue-700 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-200"
            }`}
          >
            <Boxes className="w-3.5 h-3.5" />
            <span>{t("retail_products")} ({products.filter((p) => p.status === "active" && !p.isService && !p.isRawMaterial).length})</span>
          </button>
          <button
            onClick={() => setActiveTab("raw_material")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === "raw_material"
                ? "bg-emerald-600 text-white shadow-sm"
                : "text-emerald-700 dark:text-emerald-400 hover:text-emerald-900 dark:hover:text-emerald-200"
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>{t("paper_supplies")} ({products.filter((p) => p.status === "active" && p.isRawMaterial).length})</span>
          </button>
          <button
            onClick={() => setActiveTab("service")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === "service"
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-indigo-700 dark:text-indigo-400 hover:text-indigo-900 dark:hover:text-indigo-200"
            }`}
          >
            <Printer className="w-3.5 h-3.5" />
            <span>{t("services")} ({products.filter((p) => p.status === "active" && p.isService).length})</span>
          </button>
          <button
            onClick={() => setActiveTab("low_stock")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === "low_stock"
                ? "bg-amber-500 text-white shadow-sm"
                : "text-amber-700 dark:text-amber-400 hover:text-amber-900 dark:hover:text-amber-200"
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>{t("low_stock")} ({products.filter((p) => p.status === "active" && !p.isService && p.stock <= p.threshold).length})</span>
          </button>
          <button
            onClick={() => setActiveTab("archived")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
              activeTab === "archived"
                ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            {t("archived")} ({products.filter((p) => p.status === "archived").length})
          </button>
        </div>

        {/* Search & Category Filter */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
            <input
              type="text"
              placeholder={t("search_product_sku")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-600 focus:outline-none"
            />
          </div>

          <select
            value={selectedCat}
            onChange={(e) => setSelectedCat(e.target.value)}
            className="p-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 focus:outline-none"
          >
            <option value="all">{t("all_categories")}</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id.toString()}>
                {translateCategory(c.name, language)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Low-Stock Workflow Callout Banner */}
      {activeTab === "low_stock" && (
        <div className="p-4 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/40 dark:to-orange-950/40 border border-amber-300 dark:border-amber-800 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-sm animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold shrink-0 shadow-md shadow-amber-500/30">
              <BellRing className="w-4 h-4 animate-bounce" />
            </div>
            <div>
              <h4 className="font-bold text-amber-950 dark:text-amber-200">
                {t("reorder_pipeline")}
              </h4>
              <p className="text-amber-800 dark:text-amber-300 text-[11px] mt-0.5">
                {products.filter((p) => p.status === "active" && !p.isService && p.stock <= p.threshold).length}{" "}
                {language === "ms"
                  ? "item perlu dipesan semula. Keluarkan pesanan belian (PO), hubungi pembekal melalui WhatsApp, dan jejak penghantaran."
                  : "items require reordering. Issue purchase orders, send WhatsApp requests to suppliers, and track deliveries."}
              </p>
            </div>
          </div>

          <Link
            href="/workflows/low-stock"
            className="flex items-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white font-bold rounded-xl shadow-md shadow-amber-600/20 transition shrink-0 text-center"
          >
            <span>{t("open_reorder_pipeline")}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}

      {/* Inventory Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden transition-colors">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold">
              <tr>
                <th className="p-3.5">{t("barcode")}</th>
                <th className="p-3.5">{t("product_name")}</th>
                <th className="p-3.5">{t("category")}</th>
                <th className="p-3.5 text-center">{t("classification")}</th>
                <th className="p-3.5 text-right">{t("selling_price")}</th>
                <th className="p-3.5 text-right">{t("cost_price")}</th>
                <th className="p-3.5 text-center">{t("stock_level")}</th>
                <th className="p-3.5 text-center">{t("threshold")}</th>
                <th className="p-3.5 text-right">{t("actions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                Array.from({ length: 7 }).map((_, idx) => (
                  <tr key={idx} className="animate-pulse">
                    <td className="p-3.5">
                      <div className="h-4 w-20 bg-slate-200 dark:bg-slate-800 rounded" />
                    </td>
                    <td className="p-3.5">
                      <div className="space-y-1.5">
                        <div className="h-4 w-40 bg-slate-200 dark:bg-slate-800 rounded" />
                        <div className="h-3 w-24 bg-slate-100 dark:bg-slate-800/60 rounded" />
                      </div>
                    </td>
                    <td className="p-3.5">
                      <div className="h-4 w-20 bg-slate-200 dark:bg-slate-800 rounded" />
                    </td>
                    <td className="p-3.5 text-center">
                      <div className="h-5 w-20 bg-slate-200 dark:bg-slate-800 rounded-full mx-auto" />
                    </td>
                    <td className="p-3.5 text-right">
                      <div className="h-4 w-14 bg-slate-200 dark:bg-slate-800 rounded ml-auto" />
                    </td>
                    <td className="p-3.5 text-right">
                      <div className="h-4 w-14 bg-slate-200 dark:bg-slate-800 rounded ml-auto" />
                    </td>
                    <td className="p-3.5 text-center">
                      <div className="h-5 w-20 bg-slate-200 dark:bg-slate-800 rounded-full mx-auto" />
                    </td>
                    <td className="p-3.5 text-center">
                      <div className="h-4 w-8 bg-slate-200 dark:bg-slate-800 rounded mx-auto" />
                    </td>
                    <td className="p-3.5 text-right">
                      <div className="h-7 w-24 bg-slate-200 dark:bg-slate-800 rounded-xl ml-auto" />
                    </td>
                  </tr>
                ))
              ) : filteredList.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-slate-400 dark:text-slate-500 font-medium">
                    {language === "ms"
                      ? "Tiada produk ditemui mengikut kriteria penapis anda."
                      : "No products found matching your filter criteria."}
                  </td>
                </tr>
              ) : (
                filteredList.map((p) => {
                  const isLow = !p.isService && p.stock <= p.threshold;
                  const isOut = !p.isService && p.stock <= 0;

                  return (
                    <tr key={p.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition">
                      {/* Barcode */}
                      <td className="p-3.5 font-mono text-slate-600 dark:text-slate-400">
                        {p.barcode ? (
                          <button
                            onClick={() => setBarcodeModalProduct(p)}
                            className="flex items-center gap-1.5 px-2 py-0.5 bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-950/40 hover:text-blue-700 dark:hover:text-blue-300 rounded text-[11px] font-medium transition"
                          >
                            <Barcode className="w-3.5 h-3.5" />
                            <span>{p.barcode}</span>
                          </button>
                        ) : (
                          <span className="text-slate-300 dark:text-slate-600">-</span>
                        )}
                      </td>

                      {/* Product Name */}
                      <td className="p-3.5">
                        <div className="font-bold text-slate-800 dark:text-white">{p.name}</div>
                      </td>

                      {/* Category */}
                      <td className="p-3.5 text-slate-600 dark:text-slate-400">
                        {p.category?.name ? (
                          translateCategory(p.category.name, language)
                        ) : (
                          <span className="text-slate-300 dark:text-slate-600">-</span>
                        )}
                      </td>

                      {/* Classification Type */}
                      <td className="p-3.5 text-center">
                        {p.isRawMaterial ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                            <FileText className="w-3 h-3" />
                            <span>{t("paper_supply")}</span>
                          </span>
                        ) : p.isService ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                            <Printer className="w-3 h-3" />
                            <span>{t("print_service")}</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                            <Boxes className="w-3 h-3" />
                            <span>{t("retail_products")}</span>
                          </span>
                        )}
                      </td>

                      {/* Selling Price */}
                      <td className="p-3.5 text-right font-bold text-slate-900 dark:text-white">
                        {p.isRawMaterial ? (
                          <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500 italic">
                            {t("internal_use")}
                          </span>
                        ) : p.isService ? (
                          <span className="text-[11px] font-medium text-indigo-600 dark:text-indigo-400">
                            {t("calculator")}
                          </span>
                        ) : (
                          formatMYR(p.price)
                        )}
                      </td>

                      {/* Cost Price */}
                      <td className="p-3.5 text-right text-slate-500 dark:text-slate-400">
                        {formatMYR(p.costPrice)}
                      </td>

                      {/* Current Stock */}
                      <td className="p-3.5 text-center">
                        {p.isService ? (
                          <span className="text-slate-400 dark:text-slate-500 font-medium">{t("unlimited")}</span>
                        ) : p.isRawMaterial ? (
                          <div className="flex flex-col items-center gap-1">
                            <span
                              className={`px-2.5 py-0.5 rounded-full font-bold text-[11px] ${
                                isOut
                                  ? "bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300"
                                  : isLow
                                  ? "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                                  : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                              }`}
                            >
                              {p.stock} {t("pkgs_reams")}
                            </span>
                            {p.looseStock > 0 ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800">
                                📄 +{p.looseStock} {t("in_tray")}
                              </span>
                            ) : (
                              <span className="text-[10px] text-slate-400 dark:text-slate-500">
                                0 {t("loose_in_tray")}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span
                            className={`px-2.5 py-1 rounded-full font-bold text-[11px] ${
                              isOut
                                ? "bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300"
                                : isLow
                                ? "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                                : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                            }`}
                          >
                            {p.stock} {t("units")}
                          </span>
                        )}
                      </td>

                      {/* Low Stock Alert Threshold */}
                      <td className="p-3.5 text-center text-slate-500 dark:text-slate-400 font-medium">
                        {p.isService ? "-" : `${p.threshold} ${t("units")}`}
                      </td>

                      {/* Actions */}
                      <td className="p-3.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {p.status === "active" ? (
                            <>
                              {!p.isService && (
                                <button
                                  onClick={() => {
                                    setIntakeProduct(p);
                                    setIntakeQty(10);
                                  }}
                                  title={t("add_stock")}
                                  className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-lg transition"
                                >
                                  <ArrowDownToLine className="w-4 h-4" />
                                </button>
                              )}
                              {p.isRawMaterial && (
                                <button
                                  onClick={() => openUsageModal(p)}
                                  title={t("record_usage")}
                                  className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40 rounded-lg transition"
                                >
                                  <MinusCircle className="w-4 h-4" />
                                </button>
                              )}
                              <button
                                onClick={() => openEditModal(p)}
                                title={t("edit_product")}
                                className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-lg transition"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => openDeleteModal(p)}
                                title={t("delete_product")}
                                className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => handleRestore(p)}
                                title={t("restore")}
                                className="p-1.5 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-lg transition flex items-center gap-1 font-semibold text-[11px]"
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                                <span>{t("restore")}</span>
                              </button>
                              <button
                                onClick={() => openDeleteModal(p)}
                                title={t("permanent_delete")}
                                className="p-1.5 text-rose-500 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL 1: Add / Edit Product Modal */}
      {addModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-800 dark:text-white">
                {editProduct ? t("edit_product") : t("add_product")}
              </h3>
              <button onClick={() => setAddModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitProduct} className="p-6 space-y-4 text-xs">
              {errorMsg && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 rounded-xl text-rose-700 dark:text-rose-300 font-semibold">
                  {errorMsg}
                </div>
              )}

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">{t("product_name")} *</label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. A4 Paper Ream or Pen Biru"
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">{t("barcode")} / SKU</label>
                  <input
                    type="text"
                    value={formBarcode}
                    onChange={(e) => setFormBarcode(e.target.value)}
                    placeholder="Scan or enter barcode"
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono text-slate-800 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">{t("category")}</label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-white focus:outline-none"
                  >
                    <option value="">{language === "ms" ? "Tiada / Tanpa Kategori" : "None / Uncategorized"}</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id.toString()}>
                        {translateCategory(c.name, language)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Item Classification Selector */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  {t("classification")} *
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormItemType("retail")}
                    className={`p-3 rounded-xl border text-left flex flex-col justify-between transition ${
                      formItemType === "retail"
                        ? "border-blue-600 bg-blue-50/80 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200 ring-2 ring-blue-600/30"
                        : "border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 text-slate-700 dark:text-slate-300 hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-bold text-xs">
                      <Boxes className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      <span>{t("retail_merchandise")}</span>
                    </div>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 leading-tight">
                      {t("retail_merchandise_desc")}
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setFormItemType("raw_material");
                      const paperCat = categories.find((c) => c.name.toLowerCase().includes("paper"));
                      if (paperCat && !formCategory) setFormCategory(paperCat.id.toString());
                    }}
                    className={`p-3 rounded-xl border text-left flex flex-col justify-between transition ${
                      formItemType === "raw_material"
                        ? "border-emerald-600 bg-emerald-50/80 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 ring-2 ring-emerald-600/30"
                        : "border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 text-slate-700 dark:text-slate-300 hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-bold text-xs">
                      <FileText className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      <span>{t("paper_supply")}</span>
                    </div>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 leading-tight">
                      {t("paper_supply_desc")}
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormItemType("service")}
                    className={`p-3 rounded-xl border text-left flex flex-col justify-between transition ${
                      formItemType === "service"
                        ? "border-purple-600 bg-purple-50/80 dark:bg-purple-950/40 text-purple-900 dark:text-purple-200 ring-2 ring-purple-600/30"
                        : "border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 text-slate-700 dark:text-slate-300 hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-bold text-xs">
                      <Printer className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                      <span>{t("print_service")}</span>
                    </div>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 leading-tight">
                      {t("print_service_desc")}
                    </p>
                  </button>
                </div>
              </div>

              {/* Informative Banner for Paper & Supplies */}
              {formItemType === "raw_material" && (
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl text-emerald-800 dark:text-emerald-300 text-xs flex items-start gap-2">
                  <Info className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" />
                  <span>
                    <strong>{language === "ms" ? "Inventori Kedai Dalaman:" : "Internal Store Inventory:"}</strong>{" "}
                    {language === "ms"
                      ? "Item ini (cth. A4 70gsm, A4 80gsm Double A, kad seni, filem laminasi) akan dijejak paras stok, kelompok, dan amaran pesanan semula, tetapi TIDAK akan terlibat dalam jualan terus POS."
                      : "This item (e.g. A4 70gsm, A4 80gsm Double A reams, art cards, laminate film) will be tracked for stock count, batches, and reorder alerts, but will NOT be involved in POS sales transactions."}
                  </span>
                </div>
              )}

              {/* Price Fields */}
              {formItemType === "raw_material" ? (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      {language === "ms" ? "Harga Kos Unit (RM) *" : "Unit Cost Price (RM) *"}
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={formCostPrice}
                      onChange={(e) => setFormCostPrice(e.target.value)}
                      placeholder={language === "ms" ? "cth. 11.50 per rim" : "e.g. 11.50 per ream"}
                      className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-600 focus:outline-none"
                    />
                    <span className="text-[10px] text-slate-400 mt-0.5 block">
                      {language === "ms" ? "Kos belian daripada pembekal" : "Purchase cost from paper distributor"}
                    </span>
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      {language === "ms" ? "Harga Jualan POS" : "POS Selling Price"}
                    </label>
                    <input
                      type="text"
                      disabled
                      value={language === "ms" ? "N/A (Bahan Dalaman)" : "N/A (Internal Material)"}
                      className="w-full p-2.5 bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-400 cursor-not-allowed"
                    />
                    <span className="text-[10px] text-slate-400 mt-0.5 block">
                      {language === "ms" ? "Dikecualikan daripada transaksi POS" : "Excluded from POS transactions"}
                    </span>
                  </div>
                </div>
              ) : formItemType === "service" ? (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      {language === "ms" ? "Kadar Asas / Unit (RM)" : "Base Rate / Unit (RM)"}
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formPrice}
                      onChange={(e) => setFormPrice(e.target.value)}
                      placeholder="0.00"
                      className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-600 focus:outline-none"
                    />
                    <span className="text-[10px] text-slate-400 mt-0.5 block">
                      {language === "ms" ? "Matriks kadar diguna pakai di POS" : "Pricing matrix applied at POS"}
                    </span>
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">{t("cost_price")}</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formCostPrice}
                      onChange={(e) => setFormCostPrice(e.target.value)}
                      placeholder="0.00"
                      className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                    />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">{t("selling_price")} *</label>
                    <input
                      type="number"
                      step="0.05"
                      required
                      value={formPrice}
                      onChange={(e) => setFormPrice(e.target.value)}
                      placeholder="0.00"
                      className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">{t("cost_price")}</label>
                    <input
                      type="number"
                      step="0.05"
                      value={formCostPrice}
                      onChange={(e) => setFormCostPrice(e.target.value)}
                      placeholder="0.00"
                      className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                    />
                  </div>
                </div>
              )}

              {/* Stock and Threshold Fields */}
              {formItemType !== "service" && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      {formItemType === "raw_material"
                        ? (language === "ms" ? "Stok Semasa (Rim / Pek / Unit) *" : "Current Stock (Reams / Packs / Units) *")
                        : (language === "ms" ? "Kiraan Stok Awal *" : "Initial Stock Count *")}
                    </label>
                    <input
                      type="number"
                      required
                      value={formStock}
                      onChange={(e) => setFormStock(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-600 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">{t("threshold")}</label>
                    <input
                      type="number"
                      value={formThreshold}
                      onChange={(e) => setFormThreshold(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-600 focus:outline-none"
                    />
                    <span className="text-[10px] text-slate-400 mt-0.5 block">
                      {language === "ms" ? "Amaran stok dicetuskan di bawah nilai ini" : "Trigger restock alert below this"}
                    </span>
                  </div>
                </div>
              )}

              {/* Raw Material Packaging & Tray Breakdown */}
              {formItemType === "raw_material" && (
                <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      {language === "ms" ? "Kapasiti Pek (Helaian/Unit) *" : "Pack Capacity (Sheets/Units) *"}
                    </label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={formPackSize}
                      onChange={(e) => setFormPackSize(e.target.value)}
                      placeholder={language === "ms" ? "cth. 500 untuk rim, 100 untuk pek" : "e.g. 500 for ream, 100 for pack"}
                      className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-600 focus:outline-none"
                    />
                    <span className="text-[10px] text-slate-400 mt-0.5 block">
                      {language === "ms" ? "cth. 500 helaian/rim" : "e.g. 500 sheets/ream"}
                    </span>
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      {language === "ms" ? "Helaian dalam Dulang Mesin" : "Loose Units in Machine Tray"}
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={formLooseStock}
                      onChange={(e) => setFormLooseStock(e.target.value)}
                      placeholder="0"
                      className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-600 focus:outline-none"
                    />
                    <span className="text-[10px] text-slate-400 mt-0.5 block">
                      {language === "ms" ? "Helaian individu dimasukkan ke dulang" : "Individual sheets loaded in tray"}
                    </span>
                  </div>
                </div>
              )}

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">{t("supplier")}</label>
                <select
                  value={formSupplier}
                  onChange={(e) => setFormSupplier(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-white focus:outline-none"
                >
                  <option value="">{language === "ms" ? "Tiada / Terus" : "None / Direct"}</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id.toString()}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setAddModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold rounded-xl"
                >
                  {t("cancel")}
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md shadow-blue-600/20 disabled:opacity-50"
                >
                  {saving ? "Saving..." : t("save")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Quick Stock Intake Modal */}
      {intakeProduct && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-800 dark:text-white">{t("add_stock")}</h3>
              <button onClick={() => setIntakeProduct(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleIntakeSubmit} className="p-6 space-y-4 text-xs">
              <div>
                <span className="text-slate-400 dark:text-slate-500 block mb-0.5">
                  {language === "ms" ? "Produk:" : "Product:"}
                </span>
                <span className="text-sm font-bold text-slate-900 dark:text-white">{intakeProduct.name}</span>
                <span className="block text-slate-500 dark:text-slate-400 mt-1">
                  {language === "ms" ? "Stok Semasa:" : "Current Stock:"} {intakeProduct.stock} {t("units")}
                </span>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">{t("units_to_add")}</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={intakeQty}
                  onChange={(e) => setIntakeQty(parseInt(e.target.value) || 1)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-lg font-black text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIntakeProduct(null)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold rounded-xl"
                >
                  {t("cancel")}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md shadow-emerald-600/20"
                >
                  {t("confirm_intake")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Printable Barcode Label Modal */}
      {barcodeModalProduct && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-800 dark:text-white">{t("print_barcodes")}</h3>
              <button onClick={() => setBarcodeModalProduct(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 text-center">
              <div className="p-4 bg-white border border-slate-200 rounded-xl inline-block shadow-inner">
                <div className="text-xs font-bold text-slate-900 mb-1">{barcodeModalProduct.name}</div>
                <div className="text-sm font-black text-blue-600 mb-2">
                  {formatMYR(barcodeModalProduct.price)}
                </div>
                <svg ref={barcodeCanvasRef} className="mx-auto"></svg>
              </div>

              <div className="mt-5 flex gap-2 justify-center">
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md flex items-center gap-1.5"
                >
                  <Printer className="w-4 h-4" />
                  <span>{t("print_label")}</span>
                </button>
                <button
                  onClick={() => setBarcodeModalProduct(null)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-xl"
                >
                  {t("close")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: Delete Confirmation Modal */}
      {deleteModalOpen && deletingProduct && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
            <div className="w-12 h-12 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="text-center">
              <h3 className="font-bold text-base text-slate-800 dark:text-white">
                {t("delete_product")}
              </h3>
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 mt-1">
                {deletingProduct.name}
              </p>

              {(deletingProduct._count?.saleItems || 0) > 0 ? (
                <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-xl text-left">
                  <p className="text-xs text-blue-800 dark:text-blue-300 leading-relaxed">
                    <strong className="block font-bold mb-1">
                      {language === "ms" ? "ℹ️ Sejarah Jualan Dilindungi" : "ℹ️ Sales History Protected"} ({deletingProduct._count?.saleItems} {language === "ms" ? "jualan" : "sales"})
                    </strong>
                    {language === "ms"
                      ? "Produk ini akan dialih keluar daripada katalog aktif dan daftar POS anda. Semua resit sejarah, invois pelanggan, dan laporan kewangan akan kekal 100% utuh."
                      : "This product will be removed from your active catalog and POS register. All historical receipts, customer invoices, and financial reports will remain 100% intact."}
                  </p>
                </div>
              ) : (
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                  {language === "ms" ? (
                    <>Produk ini mempunyai <strong>0 sejarah jualan</strong>. Ia akan dipadamkan secara kekal daripada pangkalan data.</>
                  ) : (
                    <>This product has <strong>0 sales history</strong>. It will be completely and permanently erased from the database.</>
                  )}
                </p>
              )}
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteModalOpen(false)}
                className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-semibold text-xs transition"
              >
                {t("cancel")}
              </button>
              <button
                type="button"
                disabled={deleteLoading}
                onClick={handleConfirmDelete}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white rounded-xl font-bold text-xs shadow-md shadow-rose-600/20 transition disabled:opacity-50"
              >
                {deleteLoading
                  ? (language === "ms" ? "Memadamkan..." : "Deleting...")
                  : t("yes_delete_product")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5: Record Stock Usage (Floor Issue / Machine Load) */}
      {usageModalOpen && usageProduct && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 flex items-center justify-center">
                  <MinusCircle className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-800 dark:text-white">{t("record_stock_usage_title")}</h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">{t("record_stock_usage_subtitle")}</p>
                </div>
              </div>
              <button onClick={() => setUsageModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUsageSubmit} className="p-6 space-y-4 text-xs">
              {/* Product Selector */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {t("item_material")} *
                </label>
                <select
                  value={usageProduct.id}
                  onChange={(e) => {
                    const sel = products.find((p) => p.id === parseInt(e.target.value));
                    if (sel) setUsageProduct(sel);
                  }}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-white focus:outline-none"
                >
                  {products
                    .filter((p) => p.status === "active" && !p.isService)
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.isRawMaterial ? "📄 " : "📦 "} {p.name}
                      </option>
                    ))}
                </select>
              </div>

              {/* Current Stock Breakdown Badge */}
              <div className="p-3 bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded-xl flex items-center justify-between text-xs">
                <div>
                  <span className="text-slate-500 dark:text-slate-400 block text-[10px] uppercase font-semibold">
                    {t("current_stock_on_shelf")}
                  </span>
                  <span className="font-black text-amber-900 dark:text-amber-200">
                    {usageProduct.stock} {t("pkgs_reams")}
                  </span>
                </div>
                {usageProduct.isRawMaterial && (
                  <div className="text-right">
                    <span className="text-slate-500 dark:text-slate-400 block text-[10px] uppercase font-semibold">
                      {t("loose_in_tray_label")}
                    </span>
                    <span className="font-black text-emerald-700 dark:text-emerald-400">
                      +{usageProduct.looseStock || 0} {t("sheets")}
                    </span>
                  </div>
                )}
              </div>

              {/* Unit Type Radio */}
              {usageProduct.isRawMaterial && (
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    {t("usage_unit")} *
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setUsageUnitType("package")}
                      className={`p-2.5 rounded-xl border text-left flex flex-col justify-between transition ${
                        usageUnitType === "package"
                          ? "border-amber-500 bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 ring-2 ring-amber-500/20"
                          : "border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                      }`}
                    >
                      <span className="font-bold text-xs">{t("full_package_ream")}</span>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                        {language === "ms"
                          ? `Membuka ${usageProduct.packSize || 1} unit ke dulang`
                          : `Opens ${usageProduct.packSize || 1} units to tray`}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setUsageUnitType("loose")}
                      className={`p-2.5 rounded-xl border text-left flex flex-col justify-between transition ${
                        usageUnitType === "loose"
                          ? "border-amber-500 bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 ring-2 ring-amber-500/20"
                          : "border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                      }`}
                    >
                      <span className="font-bold text-xs">{t("individual_loose_units")}</span>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                        {language === "ms" ? "Menolak helaian/kepingan tunggal" : "Deducts single sheets/pieces"}
                      </span>
                    </button>
                  </div>
                </div>
              )}

              {/* Quantity */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {t("quantity_to_deduct")} ({usageUnitType === "package" ? t("full_package_ream") : t("individual_loose_units")}) *
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={usageQty}
                  onChange={(e) => setUsageQty(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-lg font-black text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              {/* Reason */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {t("reason_for_usage")} *
                </label>
                <select
                  value={usageReason}
                  onChange={(e) => setUsageReason(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-white focus:outline-none"
                >
                  <option value="Loaded to Printer / Copier Tray">{translateUsageReason("Loaded to Printer / Copier Tray", language)}</option>
                  <option value="Paper Jam / Machine Spoilage">{translateUsageReason("Paper Jam / Machine Spoilage", language)}</option>
                  <option value="Test Prints / Calibration">{translateUsageReason("Test Prints / Calibration", language)}</option>
                  <option value="Internal Shop Use">{translateUsageReason("Internal Shop Use", language)}</option>
                  <option value="Damaged / Wet Stock">{translateUsageReason("Damaged / Wet Stock", language)}</option>
                </select>
              </div>

              {/* Optional Notes */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {t("notes_optional")}
                </label>
                <input
                  type="text"
                  value={usageNotes}
                  onChange={(e) => setUsageNotes(e.target.value)}
                  placeholder={language === "ms" ? "cth. Fuji Xerox Dulang 1 atau kotak basah" : "e.g. Fuji Xerox Tray 1 or damaged box"}
                  className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-white placeholder:text-slate-400 focus:outline-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setUsageModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold rounded-xl"
                >
                  {t("cancel")}
                </button>
                <button
                  type="submit"
                  disabled={usageLoading}
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white font-bold rounded-xl shadow-md shadow-amber-500/20 disabled:opacity-50"
                >
                  {usageLoading
                    ? (language === "ms" ? "Merekodkan..." : "Recording...")
                    : t("confirm_stock_usage")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 6: Stock Usage Audit History Modal */}
      {historyModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-3xl rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden max-h-[85vh] flex flex-col">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 flex items-center justify-center">
                  <History className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-800 dark:text-white">{t("stock_usage_audit_log")}</h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">{t("stock_usage_audit_subtitle")}</p>
                </div>
              </div>
              <button onClick={() => setHistoryModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto flex-1 text-xs">
              {historyLoading ? (
                <div className="p-10 text-center text-slate-400">
                  {language === "ms" ? "Memuatkan log audit..." : "Loading audit history..."}
                </div>
              ) : usageHistory.length === 0 ? (
                <div className="p-10 text-center text-slate-400">
                  {language === "ms" ? "Tiada rekod penggunaan stok lagi." : "No stock usage recorded yet."}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold">
                      <tr>
                        <th className="p-3">{language === "ms" ? "Masa" : "Time"}</th>
                        <th className="p-3">{t("item_material")}</th>
                        <th className="p-3 text-center">{language === "ms" ? "Kuantiti" : "Quantity"}</th>
                        <th className="p-3">{language === "ms" ? "Sebab / Peristiwa" : "Reason / Event"}</th>
                        <th className="p-3">{language === "ms" ? "Direkod Oleh" : "Logged By"}</th>
                        <th className="p-3">{language === "ms" ? "Nota" : "Notes"}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {usageHistory.map((u) => {
                        const isAuto = u.reason.toLowerCase().includes("pos");
                        const isLoad = u.reason.toLowerCase().includes("tray") || u.reason.toLowerCase().includes("printer") || u.reason.toLowerCase().includes("dulang");
                        const isWaste = u.reason.toLowerCase().includes("jam") || u.reason.toLowerCase().includes("damage") || u.reason.toLowerCase().includes("spoilage") || u.reason.toLowerCase().includes("rosak") || u.reason.toLowerCase().includes("tersangkut");

                        return (
                          <tr key={u.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                            <td className="p-3 font-mono text-[11px] text-slate-500 dark:text-slate-400 whitespace-nowrap">
                              {formatDate(u.createdAt)}
                            </td>
                            <td className="p-3 font-bold text-slate-800 dark:text-white">
                              {u.product?.name || `Product #${u.productId}`}
                            </td>
                            <td className="p-3 text-center">
                              <span className="px-2 py-0.5 rounded-full font-bold text-[11px] bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200">
                                {u.quantity} {u.unitType === "package" ? (language === "ms" ? "pek" : "pkg") : (language === "ms" ? "helai" : "sheets")}
                              </span>
                            </td>
                            <td className="p-3">
                              <span
                                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                  isAuto
                                    ? "bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300"
                                    : isLoad
                                    ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                                    : isWaste
                                    ? "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300"
                                    : "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                                }`}
                              >
                                {translateUsageReason(u.reason, language)}
                              </span>
                            </td>
                            <td className="p-3 text-slate-600 dark:text-slate-400 font-medium">
                              {u.user?.fullName || u.user?.username || (language === "ms" ? "Staf" : "Staff")}
                            </td>
                            <td className="p-3 text-slate-400 dark:text-slate-500 italic text-[11px]">
                              {u.notes || "-"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <button
                onClick={() => setHistoryModalOpen(false)}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold rounded-xl text-xs"
              >
                {t("close")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 7: Stock Intake Report Modal */}
      {intakeReportModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 md:p-6">
          <div className="bg-slate-50 dark:bg-slate-950 w-full max-w-5xl rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden max-h-[90vh] flex flex-col">
            <div className="p-5 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 flex items-center justify-center font-bold">
                  <BarChart3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-800 dark:text-white">
                    {t("stock_intake_analytics_title")}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {t("stock_intake_analytics_subtitle")}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIntakeReportModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 md:p-6 overflow-y-auto flex-1">
              <StockIntakeReportView />
            </div>

            <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex justify-end">
              <button
                onClick={() => setIntakeReportModalOpen(false)}
                className="px-5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold rounded-xl text-xs transition"
              >
                {t("close_report")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

