"use client";

import React, { useState, useEffect, useRef } from "react";
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
} from "lucide-react";
import * as XLSX from "xlsx";
import JsBarcode from "jsbarcode";
import { useI18n } from "@/lib/i18n/context";
import { formatMYR, formatDate } from "@/lib/utils";

interface Product {
  id: number;
  barcode: string | null;
  name: string;
  price: string | number;
  costPrice: string | number;
  stock: number;
  threshold: number;
  categoryId: number | null;
  supplierId: number | null;
  status: "active" | "archived";
  isService: boolean;
  category?: { id: number; name: string } | null;
  supplier?: { id: number; name: string } | null;
}

export default function InventoryPage() {
  const { t } = useI18n();

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<{ id: number; name: string }[]>([]);
  const [suppliers, setSuppliers] = useState<{ id: number; name: string }[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [activeTab, setActiveTab] = useState<"active" | "low_stock" | "archived">("active");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCat, setSelectedCat] = useState("all");

  // Modals
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [intakeProduct, setIntakeProduct] = useState<Product | null>(null);
  const [intakeQty, setIntakeQty] = useState(10);
  const [barcodeModalProduct, setBarcodeModalProduct] = useState<Product | null>(null);

  // Form State
  const [formName, setFormName] = useState("");
  const [formBarcode, setFormBarcode] = useState("");
  const [formPrice, setFormPrice] = useState("");
  const [formCostPrice, setFormCostPrice] = useState("");
  const [formStock, setFormStock] = useState("");
  const [formThreshold, setFormThreshold] = useState("10");
  const [formCategory, setFormCategory] = useState("");
  const [formSupplier, setFormSupplier] = useState("");
  const [formIsService, setFormIsService] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const barcodeCanvasRef = useRef<SVGSVGElement | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [pRes, cRes, sRes] = await Promise.all([
        fetch("/api/products?status=all"),
        fetch("/api/categories"),
        fetch("/api/suppliers"),
      ]);
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
      Supplier: p.supplier?.name || "N/A",
      Selling_Price_MYR: Number(p.price).toFixed(2),
      Cost_Price_MYR: Number(p.costPrice).toFixed(2),
      Current_Stock: p.stock,
      Low_Stock_Threshold: p.threshold,
      Status: p.status,
      Type: p.isService ? "Service" : "Physical",
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
    setFormThreshold("10");
    setFormCategory("");
    setFormSupplier("");
    setFormIsService(false);
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
    setFormThreshold(p.threshold.toString());
    setFormCategory(p.categoryId ? p.categoryId.toString() : "");
    setFormSupplier(p.supplierId ? p.supplierId.toString() : "");
    setFormIsService(p.isService);
    setErrorMsg("");
    setAddModalOpen(true);
  };

  // Submit Add / Edit
  const handleSubmitProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg("");

    const payload = {
      name: formName,
      barcode: formBarcode || null,
      price: parseFloat(formPrice),
      costPrice: parseFloat(formCostPrice || "0"),
      stock: parseInt(formStock || "0", 10),
      threshold: parseInt(formThreshold || "10", 10),
      categoryId: formCategory ? parseInt(formCategory, 10) : null,
      supplierId: formSupplier ? parseInt(formSupplier, 10) : null,
      isService: formIsService,
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

  // Archive / Restore / Delete
  const handleArchive = async (p: Product) => {
    if (!confirm(`Archive '${p.name}'? It will be hidden from POS.`)) return;
    await fetch(`/api/products/${p.id}`, { method: "DELETE" });
    fetchData();
  };

  const handleRestore = async (p: Product) => {
    await fetch(`/api/products/${p.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "restore" }),
    });
    fetchData();
  };

  const handlePermanentDelete = async (p: Product) => {
    if (!confirm(`Permanent deletion of '${p.name}' cannot be undone. Proceed?`)) return;
    await fetch(`/api/products/${p.id}?permanent=true`, { method: "DELETE" });
    fetchData();
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
            <h1 className="text-lg font-bold text-slate-800 dark:text-white">{t("inventory")}</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">Track stock levels, intake batches, barcodes, and pricing</p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-700 transition"
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

      {/* Tabs & Search Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Tabs */}
        <div className="flex items-center gap-2 bg-slate-200/70 dark:bg-slate-800 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab("active")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              activeTab === "active"
                ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            Active Products ({products.filter((p) => p.status === "active").length})
          </button>
          <button
            onClick={() => setActiveTab("low_stock")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === "low_stock"
                ? "bg-amber-500 text-white shadow-sm"
                : "text-amber-700 dark:text-amber-400 hover:text-amber-900 dark:hover:text-amber-200"
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Low Stock ({products.filter((p) => p.status === "active" && !p.isService && p.stock <= p.threshold).length})</span>
          </button>
          <button
            onClick={() => setActiveTab("archived")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              activeTab === "archived"
                ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            Archived ({products.filter((p) => p.status === "archived").length})
          </button>
        </div>

        {/* Search & Category Filter */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
            <input
              type="text"
              placeholder="Search product or SKU..."
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
            <option value="all">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id.toString()}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Inventory Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden transition-colors">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold">
              <tr>
                <th className="p-3.5">{t("barcode")}</th>
                <th className="p-3.5">{t("product_name")}</th>
                <th className="p-3.5">{t("category")}</th>
                <th className="p-3.5 text-right">{t("selling_price")}</th>
                <th className="p-3.5 text-right">{t("cost_price")}</th>
                <th className="p-3.5 text-center">{t("stock_level")}</th>
                <th className="p-3.5 text-center">{t("threshold")}</th>
                <th className="p-3.5 text-right">{t("actions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredList.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400 dark:text-slate-500 font-medium">
                    No products found matching your filter criteria.
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
                        {p.isService && (
                          <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold bg-indigo-50 dark:bg-indigo-950/60 px-1 rounded">
                            Service
                          </span>
                        )}
                      </td>

                      {/* Category */}
                      <td className="p-3.5 text-slate-600 dark:text-slate-400">
                        {p.category?.name || <span className="text-slate-300 dark:text-slate-600">-</span>}
                      </td>

                      {/* Selling Price */}
                      <td className="p-3.5 text-right font-bold text-slate-900 dark:text-white">
                        {formatMYR(p.price)}
                      </td>

                      {/* Cost Price */}
                      <td className="p-3.5 text-right text-slate-500 dark:text-slate-400">
                        {formatMYR(p.costPrice)}
                      </td>

                      {/* Current Stock */}
                      <td className="p-3.5 text-center">
                        {p.isService ? (
                          <span className="text-slate-400 dark:text-slate-500 font-medium">Unlimited</span>
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
                            {p.stock} units
                          </span>
                        )}
                      </td>

                      {/* Low Stock Alert Threshold */}
                      <td className="p-3.5 text-center text-slate-500 dark:text-slate-400 font-medium">
                        {p.isService ? "-" : `${p.threshold} units`}
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
                                  title="Quick Stock Intake"
                                  className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-lg transition"
                                >
                                  <ArrowDownToLine className="w-4 h-4" />
                                </button>
                              )}
                              <button
                                onClick={() => openEditModal(p)}
                                title="Edit Product"
                                className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-lg transition"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleArchive(p)}
                                title="Archive"
                                className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40 rounded-lg transition"
                              >
                                <Archive className="w-4 h-4" />
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => handleRestore(p)}
                                title="Restore Product"
                                className="p-1.5 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-lg transition flex items-center gap-1 font-semibold text-[11px]"
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                                <span>{t("restore")}</span>
                              </button>
                              <button
                                onClick={() => handlePermanentDelete(p)}
                                title="Delete Permanently"
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
                    <option value="">None / Uncategorized</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id.toString()}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

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
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:ring-2 focus:ring-blue-600 focus:outline-none"
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
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  />
                </div>
              </div>

              {!formIsService && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Initial Stock Count</label>
                    <input
                      type="number"
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
                  <option value="">None / Direct</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id.toString()}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="isServiceCheck"
                  checked={formIsService}
                  onChange={(e) => setFormIsService(e.target.checked)}
                  className="w-4 h-4 rounded text-blue-600"
                />
                <label htmlFor="isServiceCheck" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  This is a Service / Custom Work item (no physical stock decrement)
                </label>
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
                <span className="text-slate-400 dark:text-slate-500 block mb-0.5">Product:</span>
                <span className="text-sm font-bold text-slate-900 dark:text-white">{intakeProduct.name}</span>
                <span className="block text-slate-500 dark:text-slate-400 mt-1">Current Stock: {intakeProduct.stock} units</span>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Units to Add</label>
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
                  Confirm Intake
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Printable Barcode Label Modal */}
      {barcodeModalProduct && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl border border-slate-100 overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-800">{t("print_barcodes")}</h3>
              <button onClick={() => setBarcodeModalProduct(null)} className="text-slate-400 hover:text-slate-600">
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
                  <span>Print Label</span>
                </button>
                <button
                  onClick={() => setBarcodeModalProduct(null)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

