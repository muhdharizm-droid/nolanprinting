"use client";

import React, { useRef } from "react";
import Image from "next/image";
import { X, Printer, Copy, Check, Calendar, Truck, Building2, User, Phone, Mail } from "lucide-react";
import { formatMYR, formatDate } from "@/lib/utils";

interface POItem {
  name: string;
  barcode?: string | null;
  quantity: number;
  costPrice: number;
  packSize?: number;
}

interface PurchaseOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  poNumber: string;
  date?: string;
  expectedDate?: string | null;
  supplier: {
    name: string;
    contact?: string | null;
    email?: string | null;
    address?: string | null;
  } | null;
  items: POItem[];
  notes?: string | null;
  issuedBy?: string;
}

export default function PurchaseOrderModal({
  isOpen,
  onClose,
  poNumber,
  date = new Date().toISOString(),
  expectedDate,
  supplier,
  items,
  notes,
  issuedBy = "Nolan Printing Management",
}: PurchaseOrderModalProps) {
  const [copied, setCopied] = React.useState(false);
  const printableRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  const totalCost = items.reduce((sum, item) => sum + item.costPrice * item.quantity, 0);

  const handlePrint = () => {
    window.print();
  };

  const handleCopySummary = () => {
    const text = [
      `*PURCHASE ORDER - NOLAN PRINTING SERVICES*`,
      `PO Number: ${poNumber}`,
      `Date: ${new Date(date).toLocaleDateString()}`,
      `Supplier: ${supplier?.name || "Direct Supplier"}`,
      expectedDate ? `Expected Delivery: ${new Date(expectedDate).toLocaleDateString()}` : "",
      ``,
      `*ITEMS ORDERED:*`,
      ...items.map(
        (i, idx) =>
          `${idx + 1}. ${i.name} - ${i.quantity} units (Pack size: ${i.packSize || 1}) @ ${formatMYR(i.costPrice)} = ${formatMYR(i.costPrice * i.quantity)}`
      ),
      ``,
      `*TOTAL ESTIMATED COST: ${formatMYR(totalCost)}*`,
      notes ? `Notes: ${notes}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 w-full max-w-3xl rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-6 animate-fade-in flex flex-col max-h-[90vh]">
        {/* Modal Controls Bar */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/60 print:hidden">
          <div className="flex items-center gap-2">
            <span className="font-mono font-bold text-xs bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 px-2.5 py-1 rounded-lg">
              {poNumber}
            </span>
            <span className="text-xs text-slate-500 font-medium">Purchase Order Document</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopySummary}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold transition"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? "Copied Order Text" : "Copy Order"}</span>
            </button>

            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-600/20 transition"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / PDF</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Document Body */}
        <div ref={printableRef} className="p-8 overflow-y-auto space-y-6 text-slate-800 bg-white">
          {/* Document Header */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6 pb-6 border-b border-slate-200">
            <div className="flex items-start gap-4">
              <div className="relative w-16 h-16 rounded-xl overflow-hidden border border-slate-200 bg-white shrink-0">
                <Image src="/images/logo.jpeg" alt="Logo" fill className="object-cover" />
              </div>
              <div>
                <h2 className="text-xl font-black text-slate-900 tracking-tight">NOLAN PRINTING SERVICES</h2>
                <p className="text-xs text-slate-600 font-medium">Digital Printing, Photocopy, Stationery & Plan Plotting</p>
                <p className="text-xs text-slate-500 mt-1">Tel: +60 12-345 6789 • Email: orders@nolanprinting.store</p>
                <p className="text-[11px] text-slate-400">Website: https://nolanprinting.store</p>
              </div>
            </div>

            <div className="sm:text-right space-y-1">
              <span className="inline-block px-3 py-1 bg-blue-600 text-white font-black text-xs uppercase tracking-wider rounded-lg">
                PURCHASE ORDER
              </span>
              <div className="text-sm font-mono font-bold text-slate-900 mt-1">PO #: {poNumber}</div>
              <div className="text-xs text-slate-500">Date: {formatDate(date)}</div>
              {expectedDate && (
                <div className="text-xs text-amber-600 font-semibold">
                  Required By: {formatDate(expectedDate)}
                </div>
              )}
            </div>
          </div>

          {/* Supplier & Delivery Coordinates */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs">
            {/* Vendor / Supplier */}
            <div className="space-y-1">
              <span className="font-bold text-[11px] text-slate-400 uppercase tracking-wider">VENDOR / SUPPLIER</span>
              <h3 className="font-bold text-sm text-slate-900">{supplier?.name || "Direct Wholesale Supplier"}</h3>
              {supplier?.contact && <p className="text-slate-600">Contact: {supplier.contact}</p>}
              {supplier?.email && <p className="text-slate-600">Email: {supplier.email}</p>}
              {supplier?.address && <p className="text-slate-500 whitespace-pre-line">{supplier.address}</p>}
            </div>

            {/* Ship To / Deliver To */}
            <div className="space-y-1 sm:text-right">
              <span className="font-bold text-[11px] text-slate-400 uppercase tracking-wider">DELIVERY DESTINATION</span>
              <h3 className="font-bold text-sm text-slate-900">Nolan Printing Services Hub</h3>
              <p className="text-slate-600">Attention: Receiving Department / Stock Manager</p>
              <p className="text-slate-500">Main Production Facility & Store</p>
              <p className="text-slate-500">Kuala Lumpur, Malaysia</p>
            </div>
          </div>

          {/* Items Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border border-slate-200 rounded-xl overflow-hidden">
              <thead className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="p-3">#</th>
                  <th className="p-3">Item Description</th>
                  <th className="p-3 text-center">Pack Spec</th>
                  <th className="p-3 text-center">Qty Ordered</th>
                  <th className="p-3 text-right">Est. Unit Cost</th>
                  <th className="p-3 text-right">Line Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {items.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50">
                    <td className="p-3 font-mono text-slate-400">{idx + 1}</td>
                    <td className="p-3 font-bold text-slate-900">
                      <div>{item.name}</div>
                      {item.barcode && <span className="font-mono text-[10px] text-slate-400 font-normal">#{item.barcode}</span>}
                    </td>
                    <td className="p-3 text-center text-slate-600">
                      {item.packSize && item.packSize > 1 ? `${item.packSize} pcs/pack` : "Single unit"}
                    </td>
                    <td className="p-3 text-center font-bold text-blue-600">
                      {item.quantity}
                    </td>
                    <td className="p-3 text-right font-medium text-slate-700">
                      {formatMYR(item.costPrice)}
                    </td>
                    <td className="p-3 text-right font-bold text-slate-900">
                      {formatMYR(item.costPrice * item.quantity)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-50 font-bold border-t border-slate-200">
                <tr>
                  <td colSpan={5} className="p-3 text-right text-slate-600 uppercase text-[11px]">
                    Total Estimated Valuation:
                  </td>
                  <td className="p-3 text-right text-base text-slate-900 font-black">
                    {formatMYR(totalCost)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Notes & Delivery Instructions */}
          {notes && (
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs">
              <span className="font-bold text-amber-800">Special Instructions / PO Notes:</span>
              <p className="text-amber-900 mt-0.5">{notes}</p>
            </div>
          )}

          {/* Signatures & Authorization */}
          <div className="pt-8 border-t border-slate-200 grid grid-cols-2 gap-8 text-xs">
            <div>
              <div className="border-b border-slate-400 pb-12" />
              <div className="pt-2 font-bold text-slate-800">Authorized Purchasing Agent</div>
              <div className="text-[11px] text-slate-500">Nolan Printing Services Management</div>
            </div>

            <div>
              <div className="border-b border-slate-400 pb-12" />
              <div className="pt-2 font-bold text-slate-800">Supplier Acknowledgment & Date</div>
              <div className="text-[11px] text-slate-500">{supplier?.name || "Vendor Delivery Representative"}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

