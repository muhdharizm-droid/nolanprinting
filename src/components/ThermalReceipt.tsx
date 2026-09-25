"use client";

import React from "react";
import Image from "next/image";
import { formatMYR, formatDate } from "@/lib/utils";

export interface ThermalReceiptProps {
  id?: string;
  saleId: number | string;
  createdAt: string | Date;
  cashierName?: string;
  items: Array<{
    id: number | string;
    productName: string;
    quantity: number;
    priceAtSale: number | string;
    details?: string | null;
  }>;
  subtotal: number | string;
  discount?: number | string;
  taxAmount: number | string;
  total: number | string;
  paymentMethod: string;
  cashReceived?: number | string;
  changeDue?: number | string;
  isVoided?: boolean;
  paperFormat?: "80mm" | "58mm" | "a4" | "a5";
}

export default function ThermalReceipt({
  id = "printable-receipt",
  saleId,
  createdAt,
  cashierName = "Staff",
  items,
  subtotal,
  discount = 0,
  taxAmount,
  total,
  paymentMethod,
  cashReceived,
  changeDue,
  isVoided = false,
  paperFormat = "80mm",
}: ThermalReceiptProps) {
  // 1. A4 STANDARD CORPORATE TAX INVOICE / RECEIPT
  if (paperFormat === "a4") {
    return (
      <div
        id={id}
        className="receipt-format-a4 bg-white text-slate-900 font-sans p-8 mx-auto rounded-xl shadow-md border border-slate-200 select-all"
        style={{ width: "100%", maxWidth: "680px" }}
      >
        {/* Header */}
        <div className="flex justify-between items-start pb-6 border-b-2 border-slate-900">
          <div className="flex items-center gap-4">
            <Image
              src="/images/logo.jpeg"
              alt="Nolan Printing Services"
              width={140}
              height={58}
              className="rounded-xl object-contain filter contrast-125"
              priority
            />
            <div>
              <h1 className="text-xl font-black tracking-tight text-slate-900 uppercase">
                NOLAN PRINTING SERVICES
              </h1>
              <p className="text-xs text-slate-600 mt-0.5">Printing, Photocopy, Stationery & Plan Plotting</p>
              <p className="text-xs text-slate-500">Ampang, Selangor, Malaysia | Tel: 013-2707949</p>
            </div>
          </div>

          <div className="text-right">
            <span className="inline-block px-3 py-1 bg-slate-900 text-white text-xs font-black uppercase tracking-wider rounded-md">
              OFFICIAL RECEIPT
            </span>
            <div className="text-base font-black text-slate-900 mt-2 font-mono">#{saleId}</div>
            <div className="text-xs text-slate-500">{formatDate(createdAt)}</div>
          </div>
        </div>

        {isVoided && (
          <div className="my-4 p-2 bg-red-100 border border-red-500 text-red-700 font-black text-xs text-center uppercase tracking-widest rounded-lg">
            *** THIS TRANSACTION HAS BEEN VOIDED ***
          </div>
        )}

        {/* Invoice Meta Grid */}
        <div className="grid grid-cols-2 gap-4 py-4 text-xs border-b border-slate-200">
          <div>
            <span className="text-slate-400 font-bold uppercase text-[10px]">Issued To</span>
            <div className="font-bold text-slate-800 text-sm mt-0.5">Cash Customer / Walk-in</div>
            <div className="text-slate-500">Payment Method: {paymentMethod}</div>
          </div>
          <div className="text-right">
            <span className="text-slate-400 font-bold uppercase text-[10px]">Transaction Details</span>
            <div className="text-slate-700 mt-0.5">Cashier: <strong>{cashierName}</strong></div>
            <div className="text-slate-500">Status: <span className="text-emerald-600 font-bold uppercase">PAID IN FULL</span></div>
          </div>
        </div>

        {/* Items Table */}
        <div className="py-4">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b-2 border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                <th className="py-2 w-8">#</th>
                <th className="py-2">Item Description & Specifications</th>
                <th className="py-2 text-center w-16">Qty</th>
                <th className="py-2 text-right w-24">Price (RM)</th>
                <th className="py-2 text-right w-24">Total (RM)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((it, idx) => (
                <tr key={it.id}>
                  <td className="py-2.5 text-slate-400 font-mono">{idx + 1}</td>
                  <td className="py-2.5 pr-2">
                    <div className="font-bold text-slate-900">{it.productName}</div>
                    {it.details && (
                      <div className="text-[11px] text-slate-600 font-normal mt-0.5">
                        {it.details}
                      </div>
                    )}
                  </td>
                  <td className="py-2.5 text-center font-bold">{it.quantity}</td>
                  <td className="py-2.5 text-right text-slate-600 font-mono">{formatMYR(it.priceAtSale)}</td>
                  <td className="py-2.5 text-right font-black text-slate-900 font-mono">
                    {formatMYR(Number(it.priceAtSale) * it.quantity)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Financial Summary */}
        <div className="pt-4 border-t-2 border-slate-200 flex justify-end">
          <div className="w-64 space-y-1.5 text-xs text-right">
            <div className="flex justify-between text-slate-600">
              <span>Subtotal:</span>
              <span className="font-mono">{formatMYR(subtotal)}</span>
            </div>
            {Number(discount) > 0 && (
              <div className="flex justify-between text-rose-600">
                <span>Discount:</span>
                <span className="font-mono">-{formatMYR(discount)}</span>
              </div>
            )}
            <div className="flex justify-between text-slate-600">
              <span>Tax (6% SST):</span>
              <span className="font-mono">{formatMYR(taxAmount)}</span>
            </div>
            <div className="flex justify-between font-black text-base text-slate-900 pt-2 border-t-2 border-slate-900">
              <span>Grand Total:</span>
              <span className="font-mono text-blue-600">{formatMYR(total)}</span>
            </div>
            {cashReceived && (
              <>
                <div className="flex justify-between text-slate-500 pt-1 text-[11px]">
                  <span>Paid ({paymentMethod}):</span>
                  <span className="font-mono">{formatMYR(cashReceived)}</span>
                </div>
                <div className="flex justify-between text-slate-500 text-[11px]">
                  <span>Change:</span>
                  <span className="font-mono font-bold">{formatMYR(changeDue || 0)}</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Footer & Signature Block */}
        <div className="mt-8 pt-6 border-t border-slate-200 flex justify-between items-end text-xs text-slate-500">
          <div>
            <p className="font-semibold text-slate-700">Thank you for your business!</p>
            <p className="text-[11px]">Goods sold are non-refundable. Please keep this receipt for warranty.</p>
          </div>
          <div className="text-center w-40">
            <div className="border-b border-slate-400 pb-12 mb-1"></div>
            <span className="text-[10px] text-slate-400 uppercase font-semibold">Authorized Signature & Stamp</span>
          </div>
        </div>
      </div>
    );
  }

  // 2. A5 HALF-PAGE VOUCHER FORMAT
  if (paperFormat === "a5") {
    return (
      <div
        id={id}
        className="receipt-format-a5 bg-white text-slate-900 font-sans p-6 mx-auto rounded-lg shadow border border-slate-200 select-all"
        style={{ width: "100%", maxWidth: "480px" }}
      >
        <div className="flex justify-between items-center pb-3 border-b-2 border-slate-800">
          <div className="flex items-center gap-3">
            <Image src="/images/logo.jpeg" alt="Logo" width={110} height={46} className="rounded-lg object-contain" />
            <div>
              <h2 className="font-black text-sm uppercase">NOLAN PRINTING SERVICES</h2>
              <p className="text-[10px] text-slate-500">Ampang, Selangor | Tel: 013-2707949</p>
            </div>
          </div>
          <div className="text-right">
            <span className="px-2 py-0.5 bg-slate-900 text-white text-[10px] font-bold rounded">A5 RECEIPT</span>
            <div className="font-mono text-xs font-black mt-1">#{saleId}</div>
          </div>
        </div>

        <div className="py-2 text-[11px] text-slate-600 flex justify-between border-b border-slate-100">
          <span>Date: {formatDate(createdAt)}</span>
          <span>Cashier: <strong>{cashierName}</strong></span>
        </div>

        <div className="py-2">
          <table className="w-full text-left text-[11px]">
            <thead>
              <tr className="border-b border-slate-200 text-slate-400 uppercase text-[9px]">
                <th className="py-1">Description</th>
                <th className="py-1 text-center">Qty</th>
                <th className="py-1 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((it) => (
                <tr key={it.id}>
                  <td className="py-1.5 pr-1">
                    <div className="font-bold text-slate-800">{it.productName}</div>
                    {it.details && <div className="text-[9.5px] text-slate-500">{it.details}</div>}
                  </td>
                  <td className="py-1.5 text-center font-bold">{it.quantity}</td>
                  <td className="py-1.5 text-right font-black font-mono">
                    {formatMYR(Number(it.priceAtSale) * it.quantity)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="pt-2 border-t border-slate-200 flex justify-end">
          <div className="w-48 space-y-1 text-[11px] text-right">
            <div className="flex justify-between text-slate-600">
              <span>Subtotal:</span>
              <span className="font-mono">{formatMYR(subtotal)}</span>
            </div>
            {Number(discount) > 0 && (
              <div className="flex justify-between text-rose-600">
                <span>Discount:</span>
                <span className="font-mono">-{formatMYR(discount)}</span>
              </div>
            )}
            <div className="flex justify-between text-slate-600">
              <span>Tax (6% SST):</span>
              <span className="font-mono">{formatMYR(taxAmount)}</span>
            </div>
            <div className="flex justify-between font-black text-sm text-slate-900 pt-1 border-t border-slate-800">
              <span>Total:</span>
              <span className="font-mono text-blue-600">{formatMYR(total)}</span>
            </div>
          </div>
        </div>

        <div className="text-center pt-4 text-[10px] text-slate-400">
          Thank you for printing with Nolan!
        </div>
      </div>
    );
  }

  // 3. 58mm COMPACT MINI THERMAL ROLL
  if (paperFormat === "58mm") {
    return (
      <div
        id={id}
        className="receipt-format-58mm bg-white text-black font-mono text-[9.5px] leading-tight p-2.5 mx-auto rounded-lg shadow-sm border border-slate-200 select-all"
        style={{ width: "100%", maxWidth: "240px" }}
      >
        <div className="text-center pb-1.5 border-b border-dashed border-neutral-400">
          <h2 className="font-black text-[11px] uppercase">NOLAN PRINTING</h2>
          <p className="text-[8.5px] text-neutral-600">Ampang | 013-2707949</p>
          <p className="text-[8.5px] mt-0.5">#{saleId} | {formatDate(createdAt)}</p>
        </div>

        <div className="py-1.5 border-b border-dashed border-neutral-400 space-y-1">
          {items.map((it) => (
            <div key={it.id} className="flex justify-between">
              <div className="max-w-[70%] truncate">
                {it.quantity}x {it.productName}
              </div>
              <div className="font-bold text-right">
                {formatMYR(Number(it.priceAtSale) * it.quantity)}
              </div>
            </div>
          ))}
        </div>

        <div className="py-1.5 border-b border-dashed border-neutral-400 space-y-0.5 text-right text-[9px]">
          <div className="flex justify-between">
            <span>Subtotal:</span>
            <span>{formatMYR(subtotal)}</span>
          </div>
          <div className="flex justify-between font-bold text-[10px]">
            <span>Total:</span>
            <span>{formatMYR(total)}</span>
          </div>
        </div>

        <div className="text-center pt-1.5 text-[8.5px] text-neutral-500">
          *** CUSTOMER COPY (58mm) ***
        </div>
      </div>
    );
  }

  // 4. DEFAULT: 80mm STANDARD THERMAL ROLL (Retail POS Standard)
  return (
    <div
      id={id}
      className="receipt-format-80mm thermal-receipt-container bg-white text-black font-mono text-[11px] leading-tight p-4 mx-auto rounded-lg shadow-sm border border-slate-200 select-all"
      style={{ width: "100%", maxWidth: "320px" }}
    >
      {/* Receipt Header & Logo */}
      <div className="text-center pb-2 border-b border-dashed border-neutral-400">
        <div className="flex justify-center mb-1.5">
          <Image
            src="/images/logo.jpeg"
            alt="Nolan Printing Services"
            width={130}
            height={54}
            className="rounded-lg object-contain filter contrast-125 brightness-95"
            priority
          />
        </div>
        <h2 className="font-extrabold text-xs uppercase tracking-wider text-black">
          NOLAN PRINTING SERVICES
        </h2>
        <p className="text-[10px] text-neutral-600 mt-0.5">Ampang, Selangor, Malaysia</p>
        <p className="text-[10px] text-neutral-600 font-semibold">Tel: 013-2707949</p>

        {isVoided && (
          <div className="mt-2 py-1 bg-red-100 border border-red-400 text-red-700 font-black text-xs uppercase tracking-widest rounded">
            *** VOIDED TRANSACTION ***
          </div>
        )}
      </div>

      {/* Transaction Details */}
      <div className="py-2 border-b border-dashed border-neutral-400 text-[10px] text-neutral-700 space-y-0.5">
        <div className="flex justify-between">
          <span className="text-neutral-500">Receipt #:</span>
          <span className="font-bold text-black font-mono">#{saleId}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-neutral-500">Date/Time:</span>
          <span>{formatDate(createdAt)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-neutral-500">Cashier:</span>
          <span className="font-semibold text-black">{cashierName}</span>
        </div>
      </div>

      {/* Column Headers */}
      <div className="pt-2 pb-1 border-b border-dashed border-neutral-400 flex justify-between text-[10px] font-bold text-neutral-800 uppercase">
        <span>Qty & Description</span>
        <span>Amount</span>
      </div>

      {/* Line Items */}
      <div className="py-2 border-b border-dashed border-neutral-400 space-y-2">
        {items.map((it) => (
          <div key={it.id} className="flex justify-between items-start gap-1">
            <div className="flex-1 min-w-0 pr-1">
              <div className="font-bold text-black break-words leading-snug">
                {it.quantity}x {it.productName}
              </div>
              {it.details && (
                <div className="text-[9.5px] text-neutral-600 pl-3 leading-tight italic break-words">
                  [{it.details}]
                </div>
              )}
              <div className="text-[9px] text-neutral-500 pl-3">
                @ {formatMYR(it.priceAtSale)} each
              </div>
            </div>
            <div className="font-bold text-black text-right whitespace-nowrap pt-0.5">
              {formatMYR(Number(it.priceAtSale) * it.quantity)}
            </div>
          </div>
        ))}
      </div>

      {/* Financial Calculations */}
      <div className="py-2 border-b border-dashed border-neutral-400 space-y-1 text-right text-[10px]">
        <div className="flex justify-between text-neutral-600">
          <span>Subtotal:</span>
          <span className="font-semibold text-black">{formatMYR(subtotal)}</span>
        </div>
        {Number(discount) > 0 && (
          <div className="flex justify-between text-neutral-600">
            <span>Discount:</span>
            <span className="font-semibold text-black">-{formatMYR(discount)}</span>
          </div>
        )}
        <div className="flex justify-between text-neutral-600">
          <span>Tax (6% SST):</span>
          <span className="font-semibold text-black">{formatMYR(taxAmount)}</span>
        </div>
        <div className="flex justify-between font-black text-sm text-black pt-1.5 border-t border-dotted border-neutral-400">
          <span>TOTAL:</span>
          <span>{formatMYR(total)}</span>
        </div>
        <div className="flex justify-between text-neutral-600 pt-1">
          <span>Payment ({paymentMethod}):</span>
          <span className="font-semibold text-black">
            {cashReceived ? formatMYR(cashReceived) : formatMYR(total)}
          </span>
        </div>
        {changeDue !== undefined && changeDue !== null && (
          <div className="flex justify-between text-neutral-600">
            <span>Change Due:</span>
            <span className="font-bold text-black">{formatMYR(changeDue)}</span>
          </div>
        )}
      </div>

      {/* Thermal Footer */}
      <div className="text-center pt-2.5 pb-1 text-[10px] text-neutral-600 space-y-1">
        <p className="font-semibold text-neutral-800">Thank you for printing with Nolan!</p>
        <p className="text-[9px] text-neutral-500">Goods sold are non-refundable.</p>
        <p className="text-[9px] text-neutral-500">Standard 80mm POS Thermal Roll</p>
        <p className="font-mono text-[9px] text-neutral-400 pt-1 tracking-widest">
          *** CUSTOMER COPY ***
        </p>
      </div>
    </div>
  );
}

