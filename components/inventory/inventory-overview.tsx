import Link from "next/link";

import { currencySymbol, formatQuantity } from "@/lib/inventory/format";
import type { InventoryData } from "@/lib/inventory/types";

import { IngredientSummary, InventoryHeader } from "./inventory-shared";

function MetricCard({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="rounded-sm bg-white p-5 shadow-sm ring-1 ring-slate-200">
      <p className="text-sm font-semibold text-slate-500">{label}</p>
      <p className="mt-3 text-3xl font-semibold text-[#0F172A]">{value}</p>
      <p className="mt-2 text-sm leading-6 text-slate-500">{detail}</p>
    </div>
  );
}

export function InventoryOverview({ data }: { data: InventoryData }) {
  const lowStock = data.ingredients.filter((ingredient) => ingredient.status === "low_stock");
  const outOfStock = data.ingredients.filter((ingredient) => ingredient.status === "out_of_stock");
  const estimatedValue = data.ingredients.reduce(
    (sum, ingredient) => sum + Number(ingredient.current_stock) * Number(ingredient.cost_per_unit ?? 0),
    0,
  );
  const importable = data.menuIngredientOpportunities.filter((item) => !item.alreadyLinked);
  const currency = currencySymbol(data.restaurant.currency);

  return (
    <div className="space-y-6">
      <InventoryHeader
        eyebrow="Inventory"
        title="Track stock without slowing down service."
        description="Import ingredients from Menu Management, monitor stock levels, and deduct linked ingredients from daily sales entries."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Total Ingredients" value={String(data.ingredients.length)} detail="Inventory ingredients under management." />
        <MetricCard label="Low Stock" value={String(lowStock.length)} detail="Above zero but at or below threshold." />
        <MetricCard label="Out of Stock" value={String(outOfStock.length)} detail="Ingredients at zero stock." />
        <MetricCard label="Estimated Value" value={`${currency}${estimatedValue.toFixed(2)}`} detail="Based on optional cost per unit." />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_0.9fr]">
        <section className="rounded-sm bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-[#9A7412]">Menu Import</p>
              <h2 className="mt-2 text-2xl font-semibold">Atlas found {importable.length} ingredients from your menus.</h2>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                Review detected ingredients, set starting stock, and link them for automatic stock deductions.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href="/inventory/ingredients#import-from-menu" className="inline-flex min-h-11 items-center justify-center rounded-sm bg-[#0F172A] px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800">
                Review Import
              </Link>
              <Link href="/inventory/sales" className="inline-flex min-h-11 items-center justify-center rounded-sm border border-slate-300 bg-white px-5 text-sm font-semibold text-[#0F172A]">
                Enter Daily Sales
              </Link>
            </div>
          </div>
        </section>

        <section className="rounded-sm bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <p className="text-sm font-semibold text-[#9A7412]">POS Sync</p>
          <h2 className="mt-2 text-2xl font-semibold">Coming Soon</h2>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Inventory records include POS-ready fields, but Atlas does not connect to POS systems yet.
          </p>
        </section>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-sm bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-2xl font-semibold">Low & Out-of-Stock Alerts</h2>
            <Link href="/inventory/ingredients" className="text-sm font-semibold text-[#8A6811]">Manage</Link>
          </div>
          <div className="mt-5 space-y-4">
            {[...outOfStock, ...lowStock].slice(0, 6).map((ingredient) => (
              <IngredientSummary key={ingredient.id} ingredient={ingredient} />
            ))}
            {!outOfStock.length && !lowStock.length ? (
              <p className="rounded-sm bg-[#FBFAF7] p-4 text-sm leading-6 text-slate-600 ring-1 ring-slate-200">
                No low-stock alerts yet. Set thresholds on ingredients to start tracking.
              </p>
            ) : null}
          </div>
        </section>

        <section className="rounded-sm bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-2xl font-semibold">Recent Stock Movements</h2>
            <Link href="/inventory/adjustments" className="text-sm font-semibold text-[#8A6811]">View History</Link>
          </div>
          <div className="mt-5 space-y-3">
            {data.movements.slice(0, 6).map((movement) => {
              const ingredient = data.ingredients.find((item) => item.id === movement.inventory_ingredient_id);
              return (
                <div key={movement.id} className="rounded-sm bg-[#FBFAF7] p-4 ring-1 ring-slate-200">
                  <p className="text-sm font-semibold text-[#0F172A]">{ingredient?.name ?? "Ingredient"}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {movement.reason} · {formatQuantity(movement.quantity_change, ingredient?.unit)} · new stock {formatQuantity(movement.new_stock, ingredient?.unit)}
                  </p>
                </div>
              );
            })}
            {!data.movements.length ? (
              <p className="rounded-sm bg-[#FBFAF7] p-4 text-sm leading-6 text-slate-600 ring-1 ring-slate-200">
                No stock movements yet. Add a delivery or enter sales to start the permanent history.
              </p>
            ) : null}
          </div>
        </section>
      </div>
    </div>
  );
}
