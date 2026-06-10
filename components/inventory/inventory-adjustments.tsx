"use client";

import { useActionState, useMemo, useState } from "react";

import { adjustStockAction } from "@/app/inventory/actions";
import { formatQuantity } from "@/lib/inventory/format";
import type { InventoryData } from "@/lib/inventory/types";

import { ActionMessage, initialInventoryState, IngredientSummary, InventoryHeader } from "./inventory-shared";

const adjustmentOptions = {
  add: {
    label: "Delivery Intake",
    reasons: ["Supplier delivery", "Stock count addition", "Opening stock"],
  },
  remove: {
    label: "Remove Stock",
    reasons: ["Used in service", "Transfer out", "Manual removal"],
  },
  set: {
    label: "Set Stock Level",
    reasons: ["Stock count", "Manual correction", "Initial setup"],
  },
  waste: {
    label: "Waste",
    reasons: ["Spoilage", "Damage", "Expired", "Prep waste"],
  },
  correction: {
    label: "Manual Correction",
    reasons: ["Manual correction", "Stock count", "Data correction"],
  },
};

function formatMovementTime(value: string) {
  return new Intl.DateTimeFormat("en-IE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function InventoryAdjustments({
  data,
  initialIngredientId,
}: {
  data: InventoryData;
  initialIngredientId?: string;
}) {
  const [state, formAction, pending] = useActionState(adjustStockAction, initialInventoryState);
  const initialIngredient = data.ingredients.some((ingredient) => ingredient.id === initialIngredientId)
    ? initialIngredientId ?? ""
    : "";
  const [ingredientFilter, setIngredientFilter] = useState(initialIngredient || "All");
  const [typeFilter, setTypeFilter] = useState("All");
  const [movementType, setMovementType] = useState<keyof typeof adjustmentOptions>("add");
  const [selectedIngredientId, setSelectedIngredientId] = useState(initialIngredient);
  const selectedIngredient = data.ingredients.find((ingredient) => ingredient.id === selectedIngredientId);
  const filteredMovements = useMemo(
    () =>
      data.movements.filter((movement) => {
        const matchesIngredient = ingredientFilter === "All" || movement.inventory_ingredient_id === ingredientFilter;
        const matchesType = typeFilter === "All" || movement.movement_type === typeFilter;
        return matchesIngredient && matchesType;
      }),
    [data.movements, ingredientFilter, typeFilter],
  );

  return (
    <div className="space-y-6">
      <InventoryHeader
        eyebrow="Stock Adjustments"
        title="Record deliveries, counts, waste, and corrections."
        description="Every adjustment creates a permanent stock movement so changes remain traceable."
      />

      <div className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
        <form action={formAction} className="space-y-4 rounded-sm bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <input type="hidden" name="restaurantId" value={data.restaurant.id} />
          <h2 className="text-2xl font-semibold">Add Adjustment</h2>
          <label className="block text-sm font-semibold text-slate-700">
            Ingredient *
            <select
              name="ingredientId"
              required
              value={selectedIngredientId}
              onChange={(event) => setSelectedIngredientId(event.target.value)}
              className="mt-2 w-full rounded-sm border border-slate-200 px-4 py-3 text-sm"
            >
              <option value="">Select ingredient</option>
              {data.ingredients.map((ingredient) => (
                <option key={ingredient.id} value={ingredient.id}>{ingredient.name} · {formatQuantity(ingredient.current_stock, ingredient.unit)}</option>
              ))}
            </select>
          </label>
          {selectedIngredient ? (
            <div className="rounded-sm bg-[#FBFAF7] p-4 text-sm leading-6 text-slate-600 ring-1 ring-slate-200">
              Current stock:{" "}
              <span className="font-semibold text-[#0F172A]">
                {selectedIngredient.stock_tracking_mode === "approximate" ? "Approx. " : ""}
                {formatQuantity(selectedIngredient.current_stock, selectedIngredient.unit)}
                {selectedIngredient.package_description ? ` — ${selectedIngredient.package_description}` : ""}
              </span>
            </div>
          ) : null}
          <label className="block text-sm font-semibold text-slate-700">
            Adjustment Type *
            <select name="movementType" value={movementType} onChange={(event) => setMovementType(event.target.value as keyof typeof adjustmentOptions)} className="mt-2 w-full rounded-sm border border-slate-200 px-4 py-3 text-sm">
              {Object.entries(adjustmentOptions).map(([value, option]) => (
                <option key={value} value={value}>{option.label}</option>
              ))}
            </select>
            <span className="mt-1 block text-xs font-normal text-slate-500">Sales deductions are system-generated from daily sales entries.</span>
          </label>
          <label className="block text-sm font-semibold text-slate-700">
            Quantity *
            <div className="mt-2 flex overflow-hidden rounded-sm border border-slate-200 bg-white">
              <input name="quantity" type="number" step="0.001" min="0" required className="min-w-0 flex-1 px-4 py-3 text-sm outline-none" />
              <span className="border-l border-slate-200 bg-[#FBFAF7] px-4 py-3 text-sm font-semibold text-slate-600">
                {selectedIngredient?.unit ?? "unit"}
              </span>
            </div>
          </label>
          <label className="block text-sm font-semibold text-slate-700">
            Reason *
            <select name="reason" className="mt-2 w-full rounded-sm border border-slate-200 px-4 py-3 text-sm">
              {adjustmentOptions[movementType].reasons.map((reason) => <option key={reason}>{reason}</option>)}
            </select>
          </label>
          <label className="block text-sm font-semibold text-slate-700">
            Notes
            <textarea name="notes" rows={3} className="mt-2 w-full rounded-sm border border-slate-200 px-4 py-3 text-sm" />
          </label>
          <ActionMessage state={state} />
          <button disabled={pending || !data.canManage || data.ingredients.length === 0} className="inline-flex min-h-11 items-center justify-center rounded-sm bg-[#0F172A] px-5 text-sm font-semibold text-white disabled:opacity-60">
            {pending ? "Saving..." : "Save Adjustment"}
          </button>
        </form>

        <section className="rounded-sm bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <h2 className="text-2xl font-semibold">Movement History</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <select value={ingredientFilter} onChange={(event) => setIngredientFilter(event.target.value)} className="rounded-sm border border-slate-200 px-4 py-3 text-sm">
              <option>All</option>
              {data.ingredients.map((ingredient) => <option key={ingredient.id} value={ingredient.id}>{ingredient.name}</option>)}
            </select>
            <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)} className="rounded-sm border border-slate-200 px-4 py-3 text-sm">
              <option>All</option>
              <option value="add">Delivery Intake</option>
              <option value="remove">Remove Stock</option>
              <option value="set">Set</option>
              <option value="sales_deduction">Sales Deduction</option>
              <option value="correction">Correction</option>
              <option value="waste">Waste</option>
            </select>
          </div>
          <div className="mt-5 space-y-3">
            {filteredMovements.map((movement) => {
              const ingredient = data.ingredients.find((item) => item.id === movement.inventory_ingredient_id);
              return (
                <div key={movement.id} className="rounded-sm bg-[#FBFAF7] p-4 ring-1 ring-slate-200">
                  {ingredient ? <IngredientSummary ingredient={ingredient} /> : <p className="text-sm font-semibold">Ingredient</p>}
                  <p className="mt-2 text-sm text-slate-600">
                    {movement.reason} · {movement.movement_type.replaceAll("_", " ")} · {formatQuantity(movement.quantity_change, ingredient?.unit)}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {formatMovementTime(movement.created_at)} · {formatQuantity(movement.old_stock, ingredient?.unit)} to {formatQuantity(movement.new_stock, ingredient?.unit)}
                  </p>
                </div>
              );
            })}
            {!filteredMovements.length ? <p className="rounded-sm bg-[#FBFAF7] p-4 text-sm text-slate-600 ring-1 ring-slate-200">No stock movements match these filters.</p> : null}
          </div>
        </section>
      </div>
    </div>
  );
}
