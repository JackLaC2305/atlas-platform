"use client";

import { useActionState, useMemo, useState } from "react";

import { enterSalesAction } from "@/app/inventory/actions";
import { convertInventoryQuantity, formatQuantity } from "@/lib/inventory/format";
import type { InventoryData, InventoryMenuLink } from "@/lib/inventory/types";

import { ActionMessage, initialInventoryState, InventoryHeader } from "./inventory-shared";

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export function InventorySales({ data }: { data: InventoryData }) {
  const [state, formAction, pending] = useActionState(enterSalesAction, initialInventoryState);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const linkByMenuItem = useMemo(() => {
    const grouped = new Map<string, InventoryMenuLink[]>();
    data.links.forEach((link) => {
      grouped.set(link.menu_item_id, [...(grouped.get(link.menu_item_id) ?? []), link]);
    });
    return grouped;
  }, [data.links]);
  const preview = useMemo(() => {
    const totals = new Map<string, { quantity: number; warnings: string[] }>();
    const warnings: string[] = [];
    Object.entries(quantities).forEach(([menuItemId, quantity]) => {
      if (quantity <= 0) return;
      const links = linkByMenuItem.get(menuItemId) ?? [];
      const menuItem = data.menuItems.find((item) => item.id === menuItemId);
      if (!links.length) {
        warnings.push(`${menuItem?.name ?? "Menu item"} has no linked ingredients.`);
      }
      links.forEach((link) => {
        const ingredient = link.inventoryIngredient;
        if (!ingredient) return;
        const converted = convertInventoryQuantity(Number(link.quantity_per_item) * quantity, link.unit, ingredient.unit);
        if (converted === null) {
          warnings.push(`${ingredient.name} uses ${link.unit} on the menu but is stocked in ${ingredient.unit}. Manual correction is required.`);
          return;
        }
        const current = totals.get(link.inventory_ingredient_id) ?? { quantity: 0, warnings: [] };
        totals.set(link.inventory_ingredient_id, { ...current, quantity: current.quantity + converted });
      });
    });
    const deductions = Array.from(totals.entries()).map(([ingredientId, item]) => ({
      ingredient: data.ingredients.find((item) => item.id === ingredientId),
      quantity: item.quantity,
    }));
    return { deductions, warnings };
  }, [data.ingredients, data.menuItems, linkByMenuItem, quantities]);

  return (
    <div className="space-y-6">
      <InventoryHeader
        eyebrow="Daily Sales Entry"
        title="Deduct linked ingredients from menu item sales."
        description="Enter the quantity sold for menu items. Atlas previews stock deductions before applying them."
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_0.8fr]">
        <form
          action={formAction}
          onSubmit={(event) => {
            if (!window.confirm("Apply this sales entry and deduct linked inventory now?")) {
              event.preventDefault();
            }
          }}
          className="space-y-5 rounded-sm bg-white p-6 shadow-sm ring-1 ring-slate-200"
        >
          <input type="hidden" name="restaurantId" value={data.restaurant.id} />
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-semibold text-slate-700">
              Sales Date *
              <input name="salesDate" type="date" defaultValue={todayIso()} required className="mt-2 w-full rounded-sm border border-slate-200 px-4 py-3 text-sm" />
            </label>
            <label className="text-sm font-semibold text-slate-700">
              Notes
              <input name="notes" placeholder="Optional service notes" className="mt-2 w-full rounded-sm border border-slate-200 px-4 py-3 text-sm" />
            </label>
          </div>

          <div className="space-y-3">
            {data.menuItems.map((item) => {
              const linkedCount = linkByMenuItem.get(item.id)?.length ?? 0;
              return (
                <div key={item.id} className="grid gap-3 rounded-sm bg-[#FBFAF7] p-4 ring-1 ring-slate-200 sm:grid-cols-[1fr_160px] sm:items-center">
                  <div>
                    <input type="hidden" name="menuItemId" value={item.id} />
                    <p className="text-sm font-semibold text-[#0F172A]">{item.name}</p>
                    <p className={`mt-1 text-xs ${linkedCount ? "text-slate-500" : "font-semibold text-[#8A6811]"}`}>
                      {item.menuName} · {linkedCount ? `${linkedCount} linked ingredient${linkedCount === 1 ? "" : "s"}` : "No linked ingredients yet"}
                    </p>
                  </div>
                  <input
                    name={`quantity-${item.id}`}
                    type="number"
                    min="0"
                    step="1"
                    placeholder="Qty sold"
                    onChange={(event) => setQuantities((current) => ({ ...current, [item.id]: Number(event.target.value) || 0 }))}
                    className="rounded-sm border border-slate-200 px-4 py-3 text-sm"
                  />
                </div>
              );
            })}
            {!data.menuItems.length ? <p className="rounded-sm bg-[#FBFAF7] p-4 text-sm text-slate-600 ring-1 ring-slate-200">No menu items are available yet.</p> : null}
          </div>

          <ActionMessage state={state} />
          <button disabled={pending || !data.canManage || data.menuItems.length === 0} className="inline-flex min-h-11 items-center justify-center rounded-sm bg-[#0F172A] px-5 text-sm font-semibold text-white disabled:opacity-60">
            {pending ? "Applying..." : "Apply Sales Deduction"}
          </button>
        </form>

        <aside className="space-y-5">
          <section className="rounded-sm bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <h2 className="text-2xl font-semibold">Deduction Preview</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              This preview uses linked ingredient quantities. It does not include unlinked menu ingredients.
            </p>
            <div className="mt-5 space-y-3">
              {preview.deductions.map((item) => (
                <div key={item.ingredient?.id ?? item.quantity} className="rounded-sm bg-[#FBFAF7] p-4 ring-1 ring-slate-200">
                  <p className="text-sm font-semibold">{item.ingredient?.name ?? "Ingredient"}</p>
                  <p className="mt-1 text-xs text-slate-500">Will deduct {formatQuantity(item.quantity, item.ingredient?.unit)} from stock.</p>
                </div>
              ))}
              {preview.warnings.map((warning) => (
                <p key={warning} className="rounded-sm border border-[#D4A017]/30 bg-[#D4A017]/10 p-3 text-sm leading-6 text-[#76580D]">
                  {warning}
                </p>
              ))}
              {!preview.deductions.length && !preview.warnings.length ? <p className="rounded-sm bg-[#FBFAF7] p-4 text-sm text-slate-600 ring-1 ring-slate-200">Enter quantities to preview deductions.</p> : null}
            </div>
          </section>

          <section className="rounded-sm bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <h2 className="text-2xl font-semibold">Recent Sales Entries</h2>
            <div className="mt-5 space-y-3">
              {data.salesEntries.slice(0, 8).map((entry) => (
                <div key={entry.id} className="rounded-sm bg-[#FBFAF7] p-4 ring-1 ring-slate-200">
                  <p className="text-sm font-semibold">{entry.sales_date}</p>
                  <p className="mt-1 text-xs text-slate-500">{entry.notes || "No notes"}</p>
                </div>
              ))}
              {!data.salesEntries.length ? <p className="rounded-sm bg-[#FBFAF7] p-4 text-sm text-slate-600 ring-1 ring-slate-200">No sales entries yet.</p> : null}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
