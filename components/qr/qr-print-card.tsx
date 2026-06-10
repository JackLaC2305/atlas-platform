"use client";

import Link from "next/link";
import { useState } from "react";

type PrintSize = "table" | "a5" | "a4";

type QrPrintCardProps = {
  restaurantName: string;
  logoUrl: string | null;
  destinationUrl: string;
  tableNumber: string | null;
  qrDataUrl: string;
};

const sizeStyles: Record<PrintSize, string> = {
  table: "max-w-[420px] px-10 py-11",
  a5: "max-w-[560px] px-12 py-14",
  a4: "max-w-[760px] px-16 py-16",
};

function PrintableAtlasBrand() {
  return (
    <div className="qr-print-brand inline-flex items-center justify-center gap-4 text-[#0F172A]">
      <svg
        aria-hidden="true"
        className="h-12 w-12 shrink-0"
        viewBox="0 0 48 48"
        role="img"
      >
        <rect x="1" y="1" width="46" height="46" rx="3" fill="#FFFFFF" stroke="#D8D1C2" strokeWidth="2" />
        <rect x="10" y="10" width="11" height="11" rx="1.5" fill="#0F172A" />
        <rect x="27" y="10" width="11" height="11" rx="1.5" fill="#D4A017" />
        <rect x="10" y="27" width="11" height="11" rx="1.5" fill="#0F172A" />
        <rect x="27" y="27" width="11" height="11" rx="1.5" fill="#0F172A" />
      </svg>
      <span className="flex flex-col text-left">
        <span className="text-3xl font-semibold leading-none text-[#0F172A]">Atlas</span>
        <span className="mt-2 text-sm font-medium text-slate-500">by Martello Hospitality</span>
      </span>
    </div>
  );
}

export function QrPrintCard({
  restaurantName,
  logoUrl,
  destinationUrl,
  tableNumber,
  qrDataUrl,
}: QrPrintCardProps) {
  const [size, setSize] = useState<PrintSize>("table");

  return (
    <main className="qr-print-page min-h-screen bg-[#F4F1EA] px-5 py-8 text-[#0F172A] sm:px-8">
      <div className="qr-print-controls mx-auto mb-8 flex max-w-5xl flex-col gap-4 rounded-sm bg-white p-4 shadow-sm ring-1 ring-slate-200 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-[#0F172A]">Print QR Card</p>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            Choose a size, then print. Only the card will appear in print preview.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="text-xs font-semibold text-slate-500">
            Size
            <select
              value={size}
              onChange={(event) => setSize(event.target.value as PrintSize)}
              className="ml-2 rounded-sm border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-[#0F172A]"
            >
              <option value="table">Table Card</option>
              <option value="a5">A5</option>
              <option value="a4">A4</option>
            </select>
          </label>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex min-h-10 items-center justify-center rounded-sm bg-[#0F172A] px-4 text-sm font-semibold text-white"
          >
            Print
          </button>
          <Link
            href="/qr-menu"
            className="inline-flex min-h-10 items-center justify-center rounded-sm border border-slate-300 bg-white px-4 text-sm font-semibold text-[#0F172A]"
          >
            Back to QR Menu
          </Link>
        </div>
      </div>

      <section className="qr-print-card-shell mx-auto flex min-h-[calc(100vh-9rem)] items-center justify-center">
        <article
          className={`qr-print-card w-full rounded-sm border border-[#D8D1C2] bg-[#FFFEFA] text-center shadow-xl shadow-slate-900/10 ${sizeStyles[size]}`}
        >
          <div className="mx-auto flex max-w-md flex-col items-center">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt={`${restaurantName} logo`} className="h-16 w-16 object-contain" />
            ) : (
              <div className="grid h-16 w-16 place-items-center rounded-sm bg-[#0F172A] text-2xl font-semibold text-white">
                {restaurantName.slice(0, 1)}
              </div>
            )}

            <p className="mt-5 text-2xl font-semibold leading-tight text-[#0F172A]">{restaurantName}</p>
            <p className="mt-3 text-sm font-medium text-slate-500">Scan to view our menu</p>

            <div className="mt-8 rounded-sm border border-slate-200 bg-white p-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qrDataUrl} alt="QR code for public menu" className="h-64 w-64" />
            </div>

            {tableNumber ? (
              <p className="mt-5 rounded-sm border border-[#D4A017]/30 bg-[#D4A017]/10 px-4 py-2 text-sm font-semibold text-[#76580D]">
                Table {tableNumber}
              </p>
            ) : null}

            <p className="mt-6 max-w-sm break-all text-xs leading-5 text-slate-500">{destinationUrl}</p>

            <div className="mt-9 border-t border-slate-200 pt-6">
              <PrintableAtlasBrand />
              <p className="mt-4 text-xs font-medium text-slate-500">
                A Martello Hospitality Company
              </p>
              <p className="mt-2 text-xs text-slate-400">Powered by Atlas</p>
            </div>
          </div>
        </article>
      </section>
    </main>
  );
}
