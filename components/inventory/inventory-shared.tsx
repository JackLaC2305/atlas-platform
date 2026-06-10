"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import type { InventoryActionState } from "@/app/inventory/actions";
import { formatInventoryStatus, formatQuantity } from "@/lib/inventory/format";
import type { InventoryIngredient } from "@/lib/inventory/types";

export const initialInventoryState: InventoryActionState = { status: "idle", message: "" };

export function ActionMessage({ state }: { state: InventoryActionState }) {
  if (!state.message) return null;
  return (
    <div
      className={`rounded-sm px-4 py-3 text-sm ${
        state.status === "success"
          ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
          : "border border-red-200 bg-red-50 text-red-700"
      }`}
    >
      {state.message}
    </div>
  );
}

export function InventoryStatusBadge({ status }: { status: string }) {
  const classes: Record<string, string> = {
    in_stock: "bg-emerald-50 text-emerald-700",
    low_stock: "bg-[#D4A017]/10 text-[#8A6811]",
    out_of_stock: "bg-red-50 text-red-700",
  };

  return (
    <span className={`rounded-sm px-2.5 py-1 text-xs font-semibold ${classes[status] ?? "bg-slate-100 text-slate-600"}`}>
      {formatInventoryStatus(status)}
    </span>
  );
}

export function InventoryHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <section className="rounded-sm bg-[#0F172A] p-7 text-white shadow-sm sm:p-9">
      <p className="text-sm font-medium text-[#D4A017]">{eyebrow}</p>
      <h1 className="mt-3 text-4xl font-semibold leading-tight">{title}</h1>
      <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-300">{description}</p>
    </section>
  );
}

export function InventoryNav() {
  const pathname = usePathname();
  const items = [
    { href: "/inventory", label: pathname === "/inventory" ? "Overview" : "Back to Inventory" },
    { href: "/inventory/ingredients", label: "Ingredients" },
    { href: "/inventory/adjustments", label: "Adjustments" },
    { href: "/inventory/sales", label: "Sales" },
  ];

  return (
    <nav className="flex flex-wrap gap-2 rounded-sm bg-white p-2 shadow-sm ring-1 ring-slate-200" aria-label="Inventory navigation">
      {items.map((item) => {
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`inline-flex min-h-10 items-center justify-center rounded-sm px-4 text-sm font-semibold ${
              active ? "bg-[#0F172A] text-white" : "text-slate-600 hover:bg-[#FBFAF7] hover:text-[#0F172A]"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function IngredientSummary({ ingredient }: { ingredient: InventoryIngredient }) {
  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-base font-semibold text-[#0F172A]">{ingredient.name}</p>
        <InventoryStatusBadge status={ingredient.status} />
      </div>
      <p className="mt-1 text-sm text-slate-500">
        {ingredient.stock_tracking_mode === "approximate" ? "Approx. " : ""}
        {formatQuantity(ingredient.current_stock, ingredient.unit)} in stock
        {ingredient.package_description ? ` — ${ingredient.package_description}` : ""} · threshold{" "}
        {formatQuantity(ingredient.low_stock_threshold, ingredient.unit)}
      </p>
    </div>
  );
}
