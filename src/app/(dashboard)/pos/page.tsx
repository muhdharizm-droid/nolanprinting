"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Search,
  Barcode,
  Plus,
  Minus,
  Trash2,
  Printer,
  Sparkles,
  CheckCircle2,
  Share2,
  RotateCcw,
  CreditCard,
  Banknote,
  QrCode,
  Layers,
  X,
  Clock,
  ShoppingCart,
  AlertCircle,
} from "lucide-react";
import { useI18n } from "@/lib/i18n/context";
import { formatMYR } from "@/lib/utils";
import ThermalReceipt from "@/components/ThermalReceipt";

interface Product {
  id: number;
  barcode: string | null;
  name: string;
  price: string | number;
  costPrice: string | number;
  stock: number;
  threshold: number;
  categoryId: number | null;
  category?: { id: number; name: string } | null;
  isService: boolean;
  isRawMaterial?: boolean;
}

interface CartItem {
  id: string;
  productId: number;
  name: string;
  price: number;
  quantity: number;
  isService: boolean;
  details?: string | null;
  stock?: number;
  consumables?: Array<{ barcode: string; quantity: number; name?: string }>;
}

type PaperSize = "A4" | "A3" | "A5" | "B5";
type ColorMode = "bw" | "color";
type PrintSides = "single" | "double";
type ServiceType = "print" | "copy";

// Paper material options (no default prices - cashier inputs rate manually)
const PAPER_MATERIAL_OPTIONS = [
  { id: "simili-70", name: "70gsm Simili Standard" },
  { id: "premium-80", name: "80gsm Double A / Premium" },
  { id: "inkjet-100", name: "100gsm Inkjet Presentation" },
  { id: "artcard-260", name: "260gsm Glossy Art Card" },
  { id: "sticker", name: "Glossy Sticker / Label Sheet" },
  { id: "transparency", name: "Tracing Paper / Transparency" },
];

// Document finishing options (prices entered manually if selected)
const FINISHING_OPTIONS = [
  { id: "none", name: "None (Tanpa Kemasan)" },
  { id: "staple", name: "Corner Staple" },
  { id: "punch", name: "2-Hole / 4-Hole Punch" },
  { id: "comb", name: "Plastic Comb Binding" },
  { id: "wire", name: "Wire-O Metal Binding" },
  { id: "laminate", name: "Heat Laminate per Sheet" },
];

export default function PosPage() {
  const { t } = useI18n();

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<{ id: number; name: string }[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [barcodeInput, setBarcodeInput] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [taxRate, setTaxRate] = useState<number>(6); // 6% default SST

  // Modals & Flows
  const [calcModalOpen, setCalcModalOpen] = useState(false);
  const [checkoutModalOpen, setCheckoutModalOpen] = useState(false);
  const [completedSale, setCompletedSale] = useState<any>(null);
  const [receiptFormat, setReceiptFormat] = useState<"80mm" | "58mm" | "a4" | "a5">("80mm");
  const [paymentMethod, setPaymentMethod] = useState<"Cash" | "Card" | "QR">("Cash");
  const [cashReceived, setCashReceived] = useState<string>("");
  const [loadingCheckout, setLoadingCheckout] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Detailed Print & Photocopy Calculator State (Manual Required Form - No Default Prices)
  const [calcServiceType, setCalcServiceType] = useState<ServiceType>("print");
  const [calcPaperSize, setCalcPaperSize] = useState<PaperSize>("A4");
  const [calcColorMode, setCalcColorMode] = useState<ColorMode>("bw");
  const [calcSides, setCalcSides] = useState<PrintSides>("single");
  const [calcMaterialId, setCalcMaterialId] = useState<string>("simili-70");
  const [calcFinishingId, setCalcFinishingId] = useState<string>("none");
  const [calcPages, setCalcPages] = useState<string>("1");
  const [calcCopies, setCalcCopies] = useState<string>("1");
  const [calcUnitPrice, setCalcUnitPrice] = useState<string>(""); // Required single price rate (RM / page)
  const [calcFinishingPrice, setCalcFinishingPrice] = useState<string>(""); // Required if finishing !== 'none'
  const [calcErrors, setCalcErrors] = useState<Record<string, string>>({});
  const [calcSubmitted, setCalcSubmitted] = useState<boolean>(false);

  const [catalogLoading, setCatalogLoading] = useState(true);

  const barcodeInputRef = useRef<HTMLInputElement>(null);

  // Fetch products & categories on load
  const loadData = async () => {
    setCatalogLoading(true);
    try {
      const [prodRes, catRes] = await Promise.all([
        fetch("/api/products?status=active&exclude_raw=true"),
        fetch("/api/categories"),
      ]);
      const prodData = await prodRes.json();
      const catData = await catRes.json();
      if (prodData.success) setProducts(prodData.products);
      if (catData.success) setCategories(catData.categories);
    } catch (e) {
      console.error("Failed to load POS catalog", e);
    } finally {
      setCatalogLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filter catalog (exclude raw materials / internal supplies)
  const filteredProducts = products.filter((p) => {
    if (p.isRawMaterial) return false;
    const matchCat =
      selectedCategory === "all" ||
      (p.categoryId && p.categoryId.toString() === selectedCategory);
    const matchSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.barcode && p.barcode.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchCat && matchSearch;
  });

  // Open custom service modal with clean state and no default prices
  const openServiceConfigurator = (service: ServiceType = "print") => {
    setCalcServiceType(service);
    setCalcPaperSize("A4");
    setCalcColorMode("bw");
    setCalcSides("single");
    setCalcMaterialId("simili-70");
    setCalcFinishingId("none");
    setCalcPages("1");
    setCalcCopies("1");
    setCalcUnitPrice("");
    setCalcFinishingPrice("");
    setCalcErrors({});
    setCalcSubmitted(false);
    setCalcModalOpen(true);
  };

  // Add product to cart (or open configurator if service)
  const handleProductSelection = (product: Product) => {
    if (product.isService) {
      const isCopy =
        product.name.toLowerCase().includes("copy") ||
        product.name.toLowerCase().includes("fotostat");
      openServiceConfigurator(isCopy ? "copy" : "print");
      return;
    }
    addToCart(product);
  };

  // Add regular product to cart
  const addToCart = (product: Product) => {
    if (!product.isService && product.stock <= 0) {
      alert("Product is out of stock!");
      return;
    }

    setCart((prev) => {
      const existing = prev.find((item) => item.productId === product.id && !item.isService);
      if (existing) {
        if (!product.isService && existing.quantity >= product.stock) {
          alert(`Cannot add more than available stock (${product.stock})`);
          return prev;
        }
        return prev.map((item) =>
          item.productId === product.id && !item.isService
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [
        ...prev,
        {
          id: `prod-${product.id}-${Date.now()}`,
          productId: product.id,
          name: product.name,
          price: Number(product.price),
          quantity: 1,
          isService: false,
          stock: product.stock,
        },
      ];
    });
  };

  // Handle Barcode Scanner Enter
  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!barcodeInput.trim()) return;

    const matched = products.find(
      (p) => p.barcode && p.barcode.toLowerCase() === barcodeInput.trim().toLowerCase()
    );

    if (matched) {
      if (matched.isRawMaterial) {
        alert(`"${matched.name}" is an internal printing supply/paper stock and cannot be rung up directly at POS.`);
        setBarcodeInput("");
        return;
      }
      handleProductSelection(matched);
      setBarcodeInput("");
    } else {
      alert(`No product found with barcode / SKU: ${barcodeInput}`);
      setBarcodeInput("");
    }
  };

  // Printing & Photocopy Calculator Price Calculation & Form Validation
  const getSelectedMaterial = () => {
    return PAPER_MATERIAL_OPTIONS.find((m) => m.id === calcMaterialId) || PAPER_MATERIAL_OPTIONS[0];
  };

  const getSelectedFinishing = () => {
    return FINISHING_OPTIONS.find((f) => f.id === calcFinishingId) || FINISHING_OPTIONS[0];
  };

  const getSheetsPerCopy = () => {
    const pages = Math.max(1, parseInt(calcPages) || 1);
    return calcSides === "double" ? Math.ceil(pages / 2) : pages;
  };

  const getTotalSheets = () => {
    const copies = Math.max(1, parseInt(calcCopies) || 1);
    return getSheetsPerCopy() * copies;
  };

  const getTotalPages = () => {
    const pages = Math.max(1, parseInt(calcPages) || 1);
    const copies = Math.max(1, parseInt(calcCopies) || 1);
    return pages * copies;
  };

  const computeCalcBreakdown = () => {
    const pages = Math.max(1, parseInt(calcPages) || 1);
    const copies = Math.max(1, parseInt(calcCopies) || 1);
    const totalPages = pages * copies;
    const totalSheets = getTotalSheets();

    const unitPriceNum = parseFloat(calcUnitPrice);
    const finishingPriceNum = parseFloat(calcFinishingPrice);

    const hasUnitPrice = calcUnitPrice.trim() !== "" && !isNaN(unitPriceNum) && unitPriceNum > 0;
    const hasFinishingPrice = calcFinishingId === "none" || (calcFinishingPrice.trim() !== "" && !isNaN(finishingPriceNum) && finishingPriceNum >= 0);

    const printTotal = hasUnitPrice ? unitPriceNum * totalPages : 0;

    let finishingTotal = 0;
    if (calcFinishingId !== "none" && hasFinishingPrice) {
      if (calcFinishingId === "laminate") {
        finishingTotal = (finishingPriceNum || 0) * totalSheets;
      } else {
        finishingTotal = (finishingPriceNum || 0) * copies;
      }
    }

    const grandTotal = Math.round((printTotal + finishingTotal) * 100) / 100;

    return {
      printTotal,
      finishingTotal,
      grandTotal,
      unitPriceNum: hasUnitPrice ? unitPriceNum : 0,
      hasUnitPrice,
      hasFinishingPrice,
      isConfigured: hasUnitPrice && hasFinishingPrice,
    };
  };

  const validateCalcForm = () => {
    const errors: Record<string, string> = {};

    const pages = parseInt(calcPages);
    if (!calcPages || isNaN(pages) || pages < 1) {
      errors.pages = "Pages count is required (min 1).";
    }

    const copies = parseInt(calcCopies);
    if (!calcCopies || isNaN(copies) || copies < 1) {
      errors.copies = "Copies count is required (min 1).";
    }

    if (calcUnitPrice.trim() === "") {
      errors.unitPrice = "Price rate per page is required.";
    } else if (isNaN(parseFloat(calcUnitPrice)) || parseFloat(calcUnitPrice) <= 0) {
      errors.unitPrice = "Enter a valid price rate greater than RM 0.00 (e.g. 0.20 or 0.50).";
    }

    if (calcFinishingId !== "none") {
      if (calcFinishingPrice.trim() === "") {
        errors.finishingPrice = "Finishing price is required.";
      } else if (isNaN(parseFloat(calcFinishingPrice)) || parseFloat(calcFinishingPrice) < 0) {
        errors.finishingPrice = "Enter a valid finishing price (e.g. 2.50 or 0).";
      }
    }

    return errors;
  };

  const addCustomPrintToCart = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setCalcSubmitted(true);

    const errors = validateCalcForm();
    setCalcErrors(errors);
    if (Object.keys(errors).length > 0) {
      return;
    }

    const breakdown = computeCalcBreakdown();
    const price = breakdown.grandTotal;
    const serviceProduct = products.find((p) => p.isService) || { id: 1 };
    const material = getSelectedMaterial();
    const finishing = getSelectedFinishing();

    const serviceLabel = calcServiceType === "print" ? "Printing" : "Photocopy";
    const sideLabel = calcSides === "single" ? "1-Sided" : "2-Sided (Duplex)";
    const colorLabel = calcColorMode === "bw" ? "B&W" : "Full Color";

    const pages = Math.max(1, parseInt(calcPages) || 1);
    const copies = Math.max(1, parseInt(calcCopies) || 1);
    const sheetsPerCopy = calcSides === "double" ? Math.ceil(pages / 2) : pages;
    const totalSheets = sheetsPerCopy * copies;

    let paperBarcode = "RAW-A4-70G";
    if (calcPaperSize === "A3") {
      paperBarcode = calcMaterialId === "artcard-260" ? "RAW-A3-260G" : "RAW-A3-70G";
    } else {
      if (calcMaterialId === "premium-80") paperBarcode = "RAW-A4-80G";
      else if (calcMaterialId === "artcard-260") paperBarcode = "RAW-A3-260G";
      else if (calcMaterialId === "sticker") paperBarcode = "RAW-STK-A4";
      else paperBarcode = "RAW-A4-70G";
    }

    const consumables: Array<{ barcode: string; quantity: number; name: string }> = [
      {
        barcode: paperBarcode,
        quantity: totalSheets,
        name: material.name,
      },
    ];

    if (calcFinishingId === "comb") {
      consumables.push({
        barcode: "RAW-COMB-12",
        quantity: copies,
        name: "Plastic Comb Spine",
      });
    } else if (calcFinishingId === "laminate") {
      consumables.push({
        barcode: "RAW-LAM-A4",
        quantity: totalSheets,
        name: "Laminating Film Pouch",
      });
    }

    const uRate = parseFloat(calcUnitPrice) || 0;
    const fRate = parseFloat(calcFinishingPrice) || 0;

    const details = `${calcPaperSize} | ${colorLabel} | ${sideLabel} | ${material.name} | ${pages} pgs × ${copies} set${copies > 1 ? "s" : ""} @ RM ${uRate.toFixed(2)}/pg${finishing.id !== "none" ? ` + ${finishing.name} (RM ${fRate.toFixed(2)})` : ""}`;

    setCart((prev) => [
      ...prev,
      {
        id: `srv-${Date.now()}`,
        productId: serviceProduct.id,
        name: `${serviceLabel} (${calcPaperSize} ${colorLabel})`,
        price,
        quantity: 1,
        isService: true,
        details,
        consumables,
      },
    ]);

    setCalcModalOpen(false);
  };

  // Cart operations
  const updateQuantity = (itemId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.id === itemId) {
            const newQty = item.quantity + delta;
            if (newQty <= 0) return null;
            if (!item.isService && item.stock && newQty > item.stock) {
              alert(`Only ${item.stock} units available.`);
              return item;
            }
            return { ...item, quantity: newQty };
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const removeItem = (itemId: string) => {
    setCart((prev) => prev.filter((i) => i.id !== itemId));
  };

  const clearCart = () => {
    if (cart.length > 0 && confirm("Are you sure you want to clear current bill?")) {
      setCart([]);
    }
  };

  // Hold / Restore Bill
  const holdBill = () => {
    if (cart.length === 0) return;
    localStorage.setItem("nolan_held_bill", JSON.stringify(cart));
    setCart([]);
    alert("Bill has been held. You can resume it anytime.");
  };

  const recallBill = () => {
    const saved = localStorage.getItem("nolan_held_bill");
    if (saved) {
      setCart(JSON.parse(saved));
      localStorage.removeItem("nolan_held_bill");
    } else {
      alert("No held bill found.");
    }
  };

  // Totals
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const subtotalAfterDiscount = Math.max(0, subtotal - discountAmount);
  const taxAmount = Math.round(subtotalAfterDiscount * (taxRate / 100) * 100) / 100;
  const grandTotal = Math.round((subtotalAfterDiscount + taxAmount) * 100) / 100;

  // Open Checkout Modal
  const handleOpenCheckout = () => {
    if (cart.length === 0) return;
    setCashReceived(grandTotal.toFixed(2));
    setErrorMsg("");
    setCheckoutModalOpen(true);
  };

  // Submit Checkout
  const handleCompleteCheckout = async () => {
    setLoadingCheckout(true);
    setErrorMsg("");

    try {
      const res = await fetch("/api/pos/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: cart.map((i) => ({
            id: i.productId,
            quantity: i.quantity,
            price: i.price,
            isService: i.isService,
            serviceProductId: i.productId,
            details: i.details,
            consumables: i.consumables,
          })),
          discountAmount,
          taxRate,
          paymentMethod,
          cashReceived: parseFloat(cashReceived || grandTotal.toString()),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to complete transaction.");
      }

      setCompletedSale(data);
      setCheckoutModalOpen(false);
      setCart([]);
      loadData(); // Refresh product stock
    } catch (e: any) {
      setErrorMsg(e.message || "Checkout error.");
    } finally {
      setLoadingCheckout(false);
    }
  };

  const changeDue = Math.max(0, parseFloat(cashReceived || "0") - grandTotal);

  return (
    <div className="h-full flex flex-col gap-4">
      {/* Top Banner & Quick Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600/10 text-blue-600 dark:text-blue-400 rounded-xl flex items-center justify-center font-bold">
            <ShoppingCart className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-800 dark:text-white">{t("pos")}</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Fast checkout, custom print pricing matrix & standardized receipts
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Custom Print Calculator Button */}
          <button
            onClick={() => openServiceConfigurator("print")}
            className="flex items-center gap-2 px-3.5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl text-xs font-semibold shadow-md shadow-blue-600/20 hover:from-blue-700 hover:to-indigo-700 transition"
          >
            <Sparkles className="w-4 h-4" />
            <span>{t("print_service_calc")}</span>
          </button>

          {/* Held Bill Recall */}
          <button
            onClick={recallBill}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-medium border border-slate-200 dark:border-slate-700 transition"
          >
            <Clock className="w-3.5 h-3.5 text-slate-500" />
            <span>Recall Bill</span>
          </button>
        </div>
      </div>

      {/* Main Split Layout: Catalog (Left) + Cart (Right) */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-5 min-h-0">
        {/* Left: Catalog */}
        <div className="lg:col-span-7 xl:col-span-8 flex flex-col gap-4">
          {/* Search & Barcode Row */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
            <div className="sm:col-span-7 relative">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder={t("search_by_name")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-600 focus:outline-none"
              />
            </div>
            <form onSubmit={handleBarcodeSubmit} className="sm:col-span-5 relative">
              <Barcode className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                ref={barcodeInputRef}
                type="text"
                placeholder={t("scan_barcode")}
                value={barcodeInput}
                onChange={(e) => setBarcodeInput(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-600 focus:outline-none"
              />
            </form>
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            <button
              onClick={() => setSelectedCategory("all")}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition ${
                selectedCategory === "all"
                  ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                  : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100"
              }`}
            >
              {t("all_categories")}
            </button>
            {categories.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelectedCategory(c.id.toString())}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition ${
                  selectedCategory === c.id.toString()
                    ? "bg-blue-600 text-white"
                    : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100"
                }`}
              >
                {c.name}
              </button>
            ))}
          </div>

          {/* Product Grid */}
          <div className="flex-1 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 p-1">
            {catalogLoading ? (
              Array.from({ length: 8 }).map((_, idx) => (
                <div
                  key={idx}
                  className="p-3.5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 animate-pulse flex flex-col justify-between h-28 space-y-3"
                >
                  <div className="flex justify-between items-center">
                    <div className="h-2.5 w-12 bg-slate-200 dark:bg-slate-800 rounded" />
                    <div className="h-3.5 w-14 bg-slate-200 dark:bg-slate-800 rounded-full" />
                  </div>
                  <div className="space-y-1">
                    <div className="h-3.5 w-3/4 bg-slate-200 dark:bg-slate-800 rounded" />
                    <div className="h-2.5 w-1/2 bg-slate-100 dark:bg-slate-800/60 rounded" />
                  </div>
                  <div className="h-4 w-12 bg-slate-200 dark:bg-slate-800 rounded ml-auto" />
                </div>
              ))
            ) : filteredProducts.length === 0 ? (
              <div className="col-span-full p-8 text-center text-slate-400 font-medium text-xs">
                No items found.
              </div>
            ) : filteredProducts.map((product) => {
              const isLowStock = !product.isService && product.stock <= product.threshold;
              const isOut = !product.isService && product.stock <= 0;

              return (
                <div
                  key={product.id}
                  onClick={() => !isOut && handleProductSelection(product)}
                  className={`group relative p-3.5 bg-white dark:bg-slate-900 rounded-2xl border transition flex flex-col justify-between cursor-pointer ${
                    isOut
                      ? "opacity-50 border-slate-200 dark:border-slate-800 cursor-not-allowed"
                      : "hover:border-blue-500 hover:shadow-md border-slate-200 dark:border-slate-800 active:scale-[0.98]"
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-400 truncate max-w-[80px]">
                        {product.category?.name || "Product"}
                      </span>
                      {product.isService ? (
                        <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-1.5 py-0.5 rounded">
                          Service
                        </span>
                      ) : (
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                            isOut
                              ? "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300"
                              : isLowStock
                              ? "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                              : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                          }`}
                        >
                          {isOut ? "Out of Stock" : `${product.stock} in stock`}
                        </span>
                      )}
                    </div>
                    <h3 className="text-xs font-bold text-slate-800 dark:text-white line-clamp-2 mb-1 group-hover:text-blue-600 transition">
                      {product.name}
                    </h3>
                    {product.barcode && (
                      <p className="text-[10px] text-slate-400 font-mono">#{product.barcode}</p>
                    )}
                  </div>

                  <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <span className="text-sm font-black text-blue-600 dark:text-blue-400">
                      {formatMYR(product.price)}
                    </span>
                    <button
                      type="button"
                      disabled={isOut}
                      className="p-1.5 bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 hover:bg-blue-600 hover:text-white rounded-lg transition"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Cart & Totals */}
        <div className="lg:col-span-5 xl:col-span-4 flex flex-col bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden transition-colors">
          {/* Cart Header */}
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <h2 className="font-bold text-sm text-slate-800 dark:text-white">{t("cart")}</h2>
              <span className="text-xs font-semibold px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-full">
                {cart.reduce((s, i) => s + i.quantity, 0)} items
              </span>
            </div>
            {cart.length > 0 && (
              <button
                onClick={clearCart}
                className="text-xs text-rose-500 hover:text-rose-700 flex items-center gap-1 font-semibold"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{t("clear")}</span>
              </button>
            )}
          </div>

          {/* Cart Item List */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
                <ShoppingCart className="w-10 h-10 stroke-[1.5] mb-2 opacity-40" />
                <p className="text-xs font-semibold">{t("empty_cart")}</p>
                <p className="text-[11px] text-slate-400 mt-1">Select items or scan barcode to begin</p>
              </div>
            ) : (
              cart.map((item) => (
                <div
                  key={item.id}
                  className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-800 flex flex-col gap-1.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="text-xs font-bold text-slate-800 dark:text-white">{item.name}</h4>
                      {item.details && (
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed font-mono">
                          {item.details}
                        </p>
                      )}
                    </div>
                    <span className="text-xs font-black text-slate-900 dark:text-white">
                      {formatMYR(item.price * item.quantity)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      {formatMYR(item.price)} each
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => updateQuantity(item.id, -1)}
                        className="w-6 h-6 rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 flex items-center justify-center text-slate-600 dark:text-slate-200 hover:bg-slate-100"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="text-xs font-bold text-slate-800 dark:text-white min-w-[20px] text-center">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(item.id, 1)}
                        className="w-6 h-6 rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 flex items-center justify-center text-slate-600 dark:text-slate-200 hover:bg-slate-100"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => removeItem(item.id)}
                        className="w-6 h-6 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center justify-center hover:bg-rose-100 ml-1"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Cart Summary & Checkout */}
          <div className="p-4 bg-slate-50/80 dark:bg-slate-800/40 border-t border-slate-200 dark:border-slate-800 space-y-2.5">
            <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
              <div className="flex justify-between">
                <span>{t("subtotal")}</span>
                <span className="font-semibold text-slate-800 dark:text-white">{formatMYR(subtotal)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span>{t("discount")} (RM)</span>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={discountAmount || ""}
                  onChange={(e) => setDiscountAmount(Math.max(0, parseFloat(e.target.value) || 0))}
                  placeholder="0.00"
                  className="w-20 px-2 py-0.5 text-right bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold focus:outline-none"
                />
              </div>
              <div className="flex justify-between">
                <span>{t("tax")} ({taxRate}% SST)</span>
                <span className="font-semibold text-slate-800 dark:text-white">{formatMYR(taxAmount)}</span>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex justify-between items-baseline">
              <span className="font-black text-slate-900 dark:text-white text-sm">{t("total")}</span>
              <span className="text-xl font-black text-blue-600 dark:text-blue-400">{formatMYR(grandTotal)}</span>
            </div>

            {/* Actions */}
            <div className="grid grid-cols-3 gap-2 pt-2">
              <button
                onClick={holdBill}
                disabled={cart.length === 0}
                className="py-2.5 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-xl transition disabled:opacity-50"
              >
                {t("hold_bill")}
              </button>
              <button
                onClick={handleOpenCheckout}
                disabled={cart.length === 0}
                className="col-span-2 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-black tracking-wide rounded-xl shadow-md hover:shadow-lg shadow-emerald-600/20 transition flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <span>{t("complete_payment")}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL 1: Custom Print / Photocopy Calculator */}
      {calcModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-xl rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden max-h-[92vh] flex flex-col">
            <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 p-5 text-white flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-white/10 rounded-xl">
                  <Printer className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-sm">Custom Print & Photocopy Calculator</h3>
                  <p className="text-[11px] text-blue-100">Manual price entry & job specifications</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCalcModalOpen(false)}
                className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={addCustomPrintToCart} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-6 space-y-4 text-xs overflow-y-auto flex-1 text-slate-700 dark:text-slate-200">
                {/* Form Requirement Notice */}
                <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-xl flex items-start gap-2.5 text-amber-800 dark:text-amber-300">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                  <div className="text-[11px] leading-tight">
                    <span className="font-bold">Required Form:</span> Default prices have been removed. Please enter the price rate for this order.
                  </div>
                </div>

                {/* Service Type */}
                <div>
                  <label className="font-bold text-slate-800 dark:text-slate-200 block mb-1.5">
                    {t("print_type")} <span className="text-rose-500">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setCalcServiceType("print")}
                      className={`py-2 px-3 rounded-xl font-bold border transition ${
                        calcServiceType === "print"
                          ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                          : "bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700"
                      }`}
                    >
                      Printing Service (Digital Print)
                    </button>
                    <button
                      type="button"
                      onClick={() => setCalcServiceType("copy")}
                      className={`py-2 px-3 rounded-xl font-bold border transition ${
                        calcServiceType === "copy"
                          ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                          : "bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700"
                      }`}
                    >
                      Photocopy Service (Fotostat)
                    </button>
                  </div>
                </div>

                {/* Paper Size & Color Mode Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Paper Size */}
                  <div>
                    <label className="font-bold text-slate-800 dark:text-slate-200 block mb-1.5">
                      Paper Size <span className="text-rose-500">*</span>
                    </label>
                    <div className="grid grid-cols-4 gap-1.5">
                      {(["A4", "A3", "A5", "B5"] as PaperSize[]).map((size) => (
                        <button
                          key={size}
                          type="button"
                          onClick={() => setCalcPaperSize(size)}
                          className={`py-2 rounded-xl font-bold border text-center transition ${
                            calcPaperSize === size
                              ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                              : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200"
                          }`}
                        >
                          {size}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Color Mode */}
                  <div>
                    <label className="font-bold text-slate-800 dark:text-slate-200 block mb-1.5">
                      Color Mode <span className="text-rose-500">*</span>
                    </label>
                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        type="button"
                        onClick={() => setCalcColorMode("bw")}
                        className={`py-2 px-2 rounded-xl font-bold border transition ${
                          calcColorMode === "bw"
                            ? "bg-slate-900 text-white border-slate-900"
                            : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200"
                        }`}
                      >
                        B&W (Grayscale)
                      </button>
                      <button
                        type="button"
                        onClick={() => setCalcColorMode("color")}
                        className={`py-2 px-2 rounded-xl font-bold border transition ${
                          calcColorMode === "color"
                            ? "bg-gradient-to-r from-rose-500 to-amber-500 text-white border-transparent"
                            : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200"
                        }`}
                      >
                        Full Color
                      </button>
                    </div>
                  </div>
                </div>

                {/* Sides / Duplex */}
                <div>
                  <label className="font-bold text-slate-800 dark:text-slate-200 block mb-1.5">
                    Sides / Duplex <span className="text-rose-500">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setCalcSides("single")}
                      className={`py-2 px-3 rounded-xl font-bold border transition ${
                        calcSides === "single"
                          ? "bg-blue-600 text-white border-blue-600"
                          : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200"
                      }`}
                    >
                      1-Sided (Single Page per Sheet)
                    </button>
                    <button
                      type="button"
                      onClick={() => setCalcSides("double")}
                      className={`py-2 px-3 rounded-xl font-bold border transition ${
                        calcSides === "double"
                          ? "bg-blue-600 text-white border-blue-600"
                          : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200"
                      }`}
                    >
                      2-Sided (Duplex / Back-to-Back)
                    </button>
                  </div>
                </div>

                {/* Paper Material & Finishing Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Paper Material */}
                  <div>
                    <label className="font-bold text-slate-800 dark:text-slate-200 block mb-1.5">
                      Paper / Material Type <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={calcMaterialId}
                      onChange={(e) => setCalcMaterialId(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-none font-semibold text-slate-800 dark:text-slate-100"
                    >
                      {PAPER_MATERIAL_OPTIONS.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Finishing */}
                  <div>
                    <label className="font-bold text-slate-800 dark:text-slate-200 block mb-1.5">
                      {t("finishing")}
                    </label>
                    <select
                      value={calcFinishingId}
                      onChange={(e) => {
                        setCalcFinishingId(e.target.value);
                        if (e.target.value === "none") setCalcFinishingPrice("");
                      }}
                      className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-none font-semibold text-slate-800 dark:text-slate-100"
                    >
                      {FINISHING_OPTIONS.map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Pages & Copies Grid */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-slate-800 dark:text-slate-200 block mb-1.5">
                      {t("pages_count")} (Originals) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="number"
                      min="1"
                      required
                      value={calcPages}
                      onChange={(e) => {
                        setCalcPages(e.target.value);
                        if (calcErrors.pages) setCalcErrors((prev) => ({ ...prev, pages: "" }));
                      }}
                      className={`w-full p-2 bg-slate-50 dark:bg-slate-800 border rounded-xl font-bold text-slate-900 dark:text-white ${
                        calcSubmitted && calcErrors.pages
                          ? "border-rose-500 ring-1 ring-rose-500"
                          : "border-slate-200 dark:border-slate-700"
                      }`}
                    />
                    {calcSubmitted && calcErrors.pages && (
                      <p className="text-[10px] text-rose-600 dark:text-rose-400 mt-1">{calcErrors.pages}</p>
                    )}
                  </div>
                  <div>
                    <label className="font-bold text-slate-800 dark:text-slate-200 block mb-1.5">
                      {t("copies_count")} (Sets) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="number"
                      min="1"
                      required
                      value={calcCopies}
                      onChange={(e) => {
                        setCalcCopies(e.target.value);
                        if (calcErrors.copies) setCalcErrors((prev) => ({ ...prev, copies: "" }));
                      }}
                      className={`w-full p-2 bg-slate-50 dark:bg-slate-800 border rounded-xl font-bold text-slate-900 dark:text-white ${
                        calcSubmitted && calcErrors.copies
                          ? "border-rose-500 ring-1 ring-rose-500"
                          : "border-slate-200 dark:border-slate-700"
                      }`}
                    />
                    {calcSubmitted && calcErrors.copies && (
                      <p className="text-[10px] text-rose-600 dark:text-rose-400 mt-1">{calcErrors.copies}</p>
                    )}
                  </div>
                </div>

                {/* REQUIRED MANUAL PRICING SECTION - SINGLE PRICE RATE */}
                <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                      <span>Pricing Rate</span>
                      <span className="px-2 py-0.5 bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 text-[10px] font-bold rounded-full">
                        Required
                      </span>
                    </span>
                    <span className="text-[10px] text-slate-400">Single rate per page</span>
                  </div>

                  <div>
                    <label className="font-bold text-slate-800 dark:text-slate-200 block mb-1">
                      Price Rate (RM / page) <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-xs">
                        RM
                      </span>
                      <input
                        type="number"
                        step="0.01"
                        min="0.01"
                        required
                        placeholder="e.g. 0.20 or 0.50"
                        value={calcUnitPrice}
                        onChange={(e) => {
                          setCalcUnitPrice(e.target.value);
                          if (calcErrors.unitPrice) setCalcErrors((prev) => ({ ...prev, unitPrice: "" }));
                        }}
                        className={`w-full pl-10 pr-3 py-2.5 bg-white dark:bg-slate-900 border rounded-xl font-bold text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 ${
                          calcSubmitted && calcErrors.unitPrice
                            ? "border-rose-500 ring-1 ring-rose-500"
                            : "border-slate-200 dark:border-slate-700"
                        }`}
                      />
                    </div>
                    {calcSubmitted && calcErrors.unitPrice ? (
                      <p className="text-[10px] text-rose-600 dark:text-rose-400 mt-1">{calcErrors.unitPrice}</p>
                    ) : (
                      <p className="text-[10px] text-slate-400 mt-1">Total charge per printed page (covers service & paper)</p>
                    )}
                  </div>

                  {/* Optional / Required Finishing Price if selected */}
                  {calcFinishingId !== "none" && (
                    <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
                      <label className="font-bold text-slate-800 dark:text-slate-200 block mb-1">
                        {getSelectedFinishing().name} Price (RM) <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-xs">
                          RM
                        </span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          required
                          placeholder="e.g. 2.50 (or 0 if free)"
                          value={calcFinishingPrice}
                          onChange={(e) => {
                            setCalcFinishingPrice(e.target.value);
                            if (calcErrors.finishingPrice) setCalcErrors((prev) => ({ ...prev, finishingPrice: "" }));
                          }}
                          className={`w-full pl-10 pr-3 py-2 bg-white dark:bg-slate-900 border rounded-xl font-bold text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 ${
                            calcSubmitted && calcErrors.finishingPrice
                              ? "border-rose-500 ring-1 ring-rose-500"
                              : "border-slate-200 dark:border-slate-700"
                          }`}
                        />
                      </div>
                      {calcSubmitted && calcErrors.finishingPrice && (
                        <p className="text-[10px] text-rose-600 dark:text-rose-400 mt-1">{calcErrors.finishingPrice}</p>
                      )}
                    </div>
                  )}
                </div>

                {/* Price Calculation Summary Breakdown Card */}
                {(() => {
                  const breakdown = computeCalcBreakdown();
                  const pages = Math.max(1, parseInt(calcPages) || 1);
                  const copies = Math.max(1, parseInt(calcCopies) || 1);
                  const totalPages = pages * copies;
                  const totalSheets = getTotalSheets();
                  const material = getSelectedMaterial();
                  const finishing = getSelectedFinishing();

                  return (
                    <div className="p-4 bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/60 rounded-xl space-y-2">
                      <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-600 dark:text-slate-300">
                        <span>
                          Rate: <strong>{calcUnitPrice.trim() !== "" ? `RM ${(parseFloat(calcUnitPrice) || 0).toFixed(2)} / page` : "Required"}</strong>
                        </span>
                        <span>
                          Total Pages: <strong>{totalPages} page{totalPages > 1 ? "s" : ""}</strong>
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 text-[11px] text-emerald-700 dark:text-emerald-400 bg-emerald-100/70 dark:bg-emerald-950/40 px-2.5 py-1.5 rounded-lg border border-emerald-200 dark:border-emerald-800">
                        <Layers className="w-3.5 h-3.5 flex-shrink-0" />
                        <span>
                          Auto-consumes: <strong>{totalSheets} sheet{totalSheets > 1 ? "s" : ""}</strong> of {material.name}
                          {finishing.id !== "none" ? ` + ${finishing.name}` : ""}
                        </span>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-blue-200/60 dark:border-blue-900/40">
                        <div>
                          <span className="text-xs text-blue-700 dark:text-blue-400 font-bold block">
                            Total Job Price:
                          </span>
                          <span className="text-xl font-black text-blue-950 dark:text-blue-200">
                            {breakdown.isConfigured
                              ? formatMYR(breakdown.grandTotal)
                              : "RM --.--"}
                          </span>
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 block">
                            {breakdown.isConfigured ? (
                              <>
                                ({totalPages} pgs @ RM {breakdown.unitPriceNum.toFixed(2)}/pg
                                {finishing.id !== "none" ? ` + finishing` : ""})
                              </>
                            ) : (
                              "Enter required price rate above"
                            )}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setCalcModalOpen(false)}
                            className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl font-semibold transition"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-md shadow-blue-600/20 transition active:scale-95"
                          >
                            {t("add_to_bill")}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Checkout & Payment Modal */}
      {checkoutModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base text-slate-800 dark:text-white">Checkout Payment</h3>
                <p className="text-xs text-slate-400">Select method and confirm payment</p>
              </div>
              <button
                onClick={() => setCheckoutModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {errorMsg && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 rounded-xl text-rose-700 dark:text-rose-300 text-xs font-semibold">
                  {errorMsg}
                </div>
              )}

              {/* Grand Total Display */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl text-center border border-slate-200/80 dark:border-slate-700">
                <span className="text-xs uppercase tracking-wider text-slate-400 font-bold">Total Amount Due</span>
                <div className="text-3xl font-black text-blue-600 dark:text-blue-400 mt-1">
                  {formatMYR(grandTotal)}
                </div>
              </div>

              {/* Payment Methods */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">Payment Method</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => setPaymentMethod("Cash")}
                    className={`p-3 rounded-xl border font-bold text-xs flex flex-col items-center gap-1.5 transition ${
                      paymentMethod === "Cash"
                        ? "bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500 text-emerald-800 dark:text-emerald-300"
                        : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300"
                    }`}
                  >
                    <Banknote className="w-5 h-5 text-emerald-600" />
                    <span>Cash</span>
                  </button>
                  <button
                    onClick={() => setPaymentMethod("Card")}
                    className={`p-3 rounded-xl border font-bold text-xs flex flex-col items-center gap-1.5 transition ${
                      paymentMethod === "Card"
                        ? "bg-blue-50 dark:bg-blue-950/60 border-blue-500 text-blue-800 dark:text-blue-300"
                        : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300"
                    }`}
                  >
                    <CreditCard className="w-5 h-5 text-blue-600" />
                    <span>Card / EDC</span>
                  </button>
                  <button
                    onClick={() => setPaymentMethod("QR")}
                    className={`p-3 rounded-xl border font-bold text-xs flex flex-col items-center gap-1.5 transition ${
                      paymentMethod === "QR"
                        ? "bg-purple-50 dark:bg-purple-950/60 border-purple-500 text-purple-800 dark:text-purple-300"
                        : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300"
                    }`}
                  >
                    <QrCode className="w-5 h-5 text-purple-600" />
                    <span>DuitNow QR</span>
                  </button>
                </div>
              </div>

              {/* Cash Tendered & Quick Tender Buttons */}
              {paymentMethod === "Cash" && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Cash Received (RM)
                    </label>
                    <input
                      type="number"
                      step="1"
                      value={cashReceived}
                      onChange={(e) => setCashReceived(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-lg font-black text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>

                  {/* Quick Tender Buttons */}
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => setCashReceived(grandTotal.toFixed(2))}
                      className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200"
                    >
                      Exact
                    </button>
                    {[10, 20, 50, 100].map((val) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setCashReceived(val.toString())}
                        className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200"
                      >
                        RM {val}
                      </button>
                    ))}
                  </div>

                  {/* Change Output */}
                  <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl flex items-center justify-between text-xs">
                    <span className="font-bold text-emerald-800 dark:text-emerald-300">Change Due:</span>
                    <span className="text-base font-black text-emerald-900 dark:text-emerald-200">
                      {formatMYR(changeDue)}
                    </span>
                  </div>
                </div>
              )}

              {/* Confirm Button */}
              <button
                onClick={handleCompleteCheckout}
                disabled={loadingCheckout || (paymentMethod === "Cash" && parseFloat(cashReceived || "0") < grandTotal)}
                className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-sm rounded-xl shadow-lg shadow-emerald-600/25 transition flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loadingCheckout ? "Processing Transaction..." : `Confirm & Complete (${formatMYR(grandTotal)})`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Completed Sale & Thermal Receipt Modal */}
      {completedSale && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
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
            <div className="p-4 bg-emerald-600 text-white text-center flex-shrink-0">
              <CheckCircle2 className="w-8 h-8 mx-auto mb-1 text-white" />
              <h3 className="font-black text-base">{t("receipt_prompt")}</h3>
              <p className="text-emerald-100 text-xs">Sale #{completedSale.sale.id} completed successfully</p>
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

            {/* Receipt Preview */}
            <div className="p-4 bg-slate-100 dark:bg-slate-950 flex-1 overflow-y-auto flex justify-center">
              <ThermalReceipt
                paperFormat={receiptFormat}
                saleId={completedSale.sale.id}
                createdAt={completedSale.sale.createdAt}
                cashierName={completedSale.sale.user?.fullName || completedSale.sale.user?.username || "Staff"}
                items={completedSale.sale.items.map((it: any) => ({
                  id: it.id,
                  productName: it.product?.name || "Custom Item",
                  quantity: it.quantity,
                  priceAtSale: it.priceAtSale,
                  details: it.details,
                }))}
                subtotal={completedSale.subtotal}
                discount={completedSale.discount}
                taxAmount={completedSale.taxAmount}
                total={completedSale.total}
                paymentMethod={completedSale.sale.paymentMethod}
                cashReceived={completedSale.cashReceived}
                changeDue={completedSale.change}
              />
            </div>

            {/* Receipt Modal Actions */}
            <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex flex-col gap-2 flex-shrink-0">
              <button
                onClick={() => window.print()}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md flex items-center justify-center gap-2 transition"
              >
                <Printer className="w-4 h-4" />
                <span>{t("print_receipt")} ({receiptFormat.toUpperCase()})</span>
              </button>

              <div className="grid grid-cols-2 gap-2">
                <a
                  href={`https://wa.me/?text=${encodeURIComponent(
                    `*Nolan Printing Services Receipt*\nSale #${completedSale.sale.id}\nTotal: RM ${completedSale.total}\nThank you!`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="py-2 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-bold text-xs rounded-xl border border-emerald-200 dark:border-emerald-800 flex items-center justify-center gap-1.5 transition"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>WhatsApp</span>
                </a>
                <button
                  onClick={() => setCompletedSale(null)}
                  className="py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>{t("new_sale")}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
