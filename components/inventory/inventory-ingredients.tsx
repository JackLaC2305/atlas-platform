"use client";

import { useActionState, useMemo, useState } from "react";

import {
  deleteIngredientAction,
  importMenuIngredientsAction,
  saveAlertPreferencesAction,
  saveIngredientAction,
} from "@/app/inventory/actions";
import { formatQuantity } from "@/lib/inventory/format";
import {
  inventoryCategories,
  inventoryUnits,
  type InventoryData,
  type InventoryIngredient,
  type MenuIngredientOpportunity,
} from "@/lib/inventory/types";

import { ActionMessage, initialInventoryState, IngredientSummary, InventoryHeader, InventoryStatusBadge } from "./inventory-shared";

function IngredientFields({ ingredient }: { ingredient?: InventoryIngredient }) {
  const isKnownUnit = ingredient ? inventoryUnits.includes(ingredient.unit as never) : true;
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <label className="text-sm font-semibold text-slate-700">
        Ingredient Name *
        <input name="name" defaultValue={ingredient?.name} required className="mt-2 w-full rounded-sm border border-slate-200 px-4 py-3 text-sm" />
      </label>
      <label className="text-sm font-semibold text-slate-700">
        Category
        <select name="category" defaultValue={ingredient?.category ?? "Other"} className="mt-2 w-full rounded-sm border border-slate-200 px-4 py-3 text-sm">
          {inventoryCategories.map((category) => <option key={category}>{category}</option>)}
        </select>
      </label>
      <label className="text-sm font-semibold text-slate-700">
        Unit *
        <select name="unit" defaultValue={isKnownUnit ? ingredient?.unit ?? "unit" : "other"} className="mt-2 w-full rounded-sm border border-slate-200 px-4 py-3 text-sm">
          {inventoryUnits.map((unit) => <option key={unit} value={unit}>{unit}</option>)}
        </select>
      </label>
      <label className="text-sm font-semibold text-slate-700">
        Custom Unit
        <input name="customUnit" defaultValue={isKnownUnit ? "" : ingredient?.unit} className="mt-2 w-full rounded-sm border border-slate-200 px-4 py-3 text-sm" />
      </label>
      <label className="text-sm font-semibold text-slate-700">
        Current Stock *
        <input name="currentStock" type="number" step="0.001" min="0" defaultValue={ingredient?.current_stock ?? 0} required className="mt-2 w-full rounded-sm border border-slate-200 px-4 py-3 text-sm" />
      </label>
      <label className="text-sm font-semibold text-slate-700">
        Low-Stock Threshold *
        <input name="lowStockThreshold" type="number" step="0.001" min="0" defaultValue={ingredient?.low_stock_threshold ?? 0} required className="mt-2 w-full rounded-sm border border-slate-200 px-4 py-3 text-sm" />
      </label>
      <label className="text-sm font-semibold text-slate-700">
        Cost Per Unit
        <input name="costPerUnit" type="number" step="0.0001" min="0" defaultValue={ingredient?.cost_per_unit ?? ""} className="mt-2 w-full rounded-sm border border-slate-200 px-4 py-3 text-sm" />
      </label>
      <label className="text-sm font-semibold text-slate-700">
        Supplier
        <input name="supplierName" defaultValue={ingredient?.supplier_name ?? ""} className="mt-2 w-full rounded-sm border border-slate-200 px-4 py-3 text-sm" />
      </label>
      <label className="text-sm font-semibold text-slate-700 sm:col-span-2">
        Notes
        <textarea name="notes" defaultValue={ingredient?.notes ?? ""} rows={2} className="mt-2 w-full rounded-sm border border-slate-200 px-4 py-3 text-sm" />
      </label>
    </div>
  );
}

function IngredientEditor({ restaurantId, ingredient }: { restaurantId: string; ingredient?: InventoryIngredient }) {
  const [state, formAction, pending] = useActionState(saveIngredientAction, initialInventoryState);
  return (
    <form action={formAction} className="space-y-4 rounded-sm bg-white p-5 shadow-sm ring-1 ring-slate-200">
      <input type="hidden" name="restaurantId" value={restaurantId} />
      {ingredient ? <input type="hidden" name="ingredientId" value={ingredient.id} /> : null}
      <h2 className="text-xl font-semibold">{ingredient ? "Edit Ingredient" : "Add Ingredient"}</h2>
      <IngredientFields ingredient={ingredient} />
      <ActionMessage state={state} />
      <button disabled={pending} className="inline-flex min-h-11 items-center justify-center rounded-sm bg-[#0F172A] px-5 text-sm font-semibold text-white disabled:opacity-60">
        {pending ? "Saving..." : ingredient ? "Save Ingredient" : "Add Ingredient"}
      </button>
    </form>
  );
}

function DeleteIngredientButton({ restaurantId, ingredientId }: { restaurantId: string; ingredientId: string }) {
  const [state, formAction, pending] = useActionState(deleteIngredientAction, initialInventoryState);
  return (
    <form
      action={formAction}
      onSubmit={(event) => {
        if (!window.confirm("Delete this ingredient? Linked menu deductions will stop for this ingredient.")) {
          event.preventDefault();
        }
      }}
      className="space-y-2"
    >
      <input type="hidden" name="restaurantId" value={restaurantId} />
      <input type="hidden" name="ingredientId" value={ingredientId} />
      <button disabled={pending} className="text-sm font-semibold text-red-700 disabled:opacity-60">
        {pending ? "Deleting..." : "Delete"}
      </button>
      <ActionMessage state={state} />
    </form>
  );
}

function ImportRow({ item }: { item: MenuIngredientOpportunity }) {
  return (
    <div className="rounded-sm bg-[#FBFAF7] p-4 ring-1 ring-slate-200">
      <label className="flex items-start gap-3">
        <input type="checkbox" name="selectedIngredientId" value={item.menuItemIngredientId} disabled={item.alreadyLinked} className="mt-1" defaultChecked={!item.alreadyLinked} />
        <span>
          <span className="text-sm font-semibold text-[#0F172A]">{item.ingredientName}</span>
          <span className="block text-xs leading-5 text-slate-500">
            {item.menuName} · {item.menuItemName} · {item.alreadyLinked ? "Already linked" : "Ready to import"}
          </span>
        </span>
      </label>
      <input type="hidden" name={`menuItemId-${item.menuItemIngredientId}`} value={item.menuItemId} />
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <input name={`name-${item.menuItemIngredientId}`} defaultValue={item.ingredientName} className="rounded-sm border border-slate-200 px-3 py-2 text-sm" aria-label="Inventory name" />
        <select name={`category-${item.menuItemIngredientId}`} defaultValue="Other" className="rounded-sm border border-slate-200 px-3 py-2 text-sm" aria-label="Category">
          {inventoryCategories.map((category) => <option key={category}>{category}</option>)}
        </select>
        <select name={`unit-${item.menuItemIngredientId}`} defaultValue={item.unit ?? "unit"} className="rounded-sm border border-slate-200 px-3 py-2 text-sm" aria-label="Unit">
          {inventoryUnits.map((unit) => <option key={unit} value={unit}>{unit}</option>)}
        </select>
        <input name={`customUnit-${item.menuItemIngredientId}`} placeholder="Custom unit" className="rounded-sm border border-slate-200 px-3 py-2 text-sm" />
        <input name={`currentStock-${item.menuItemIngredientId}`} type="number" step="0.001" min="0" placeholder="Starting stock" className="rounded-sm border border-slate-200 px-3 py-2 text-sm" />
        <input name={`lowStockThreshold-${item.menuItemIngredientId}`} type="number" step="0.001" min="0" placeholder="Low-stock threshold" className="rounded-sm border border-slate-200 px-3 py-2 text-sm" />
        <input name={`costPerUnit-${item.menuItemIngredientId}`} type="number" step="0.0001" min="0" placeholder="Cost per unit" className="rounded-sm border border-slate-200 px-3 py-2 text-sm" />
        <input name={`quantityPerItem-${item.menuItemIngredientId}`} type="number" step="0.001" min="0" defaultValue={item.quantity ?? 0} className="rounded-sm border border-slate-200 px-3 py-2 text-sm" aria-label="Quantity per menu item" />
      </div>
    </div>
  );
}

function ImportFromMenu({ data }: { data: InventoryData }) {
  const [state, formAction, pending] = useActionState(importMenuIngredientsAction, initialInventoryState);
  const importable = data.menuIngredientOpportunities;

  return (
    <section id="import-from-menu" className="rounded-sm bg-white p-6 shadow-sm ring-1 ring-slate-200">
      <h2 className="text-2xl font-semibold">Import From Menu</h2>
      <p className="mt-3 text-sm leading-6 text-slate-600">
        Atlas found {importable.length} ingredients from your menus. Review before importing. Linking ingredients enables automatic stock deduction from sales entries.
      </p>
      <form action={formAction} className="mt-5 space-y-4">
        <input type="hidden" name="restaurantId" value={data.restaurant.id} />
        {importable.slice(0, 20).map((item) => <ImportRow key={item.menuItemIngredientId} item={item} />)}
        {!importable.length ? <p className="rounded-sm bg-[#FBFAF7] p-4 text-sm text-slate-600 ring-1 ring-slate-200">No menu ingredients found yet.</p> : null}
        <ActionMessage state={state} />
        <button disabled={pending || !data.canManage || importable.length === 0} className="inline-flex min-h-11 items-center justify-center rounded-sm bg-[#0F172A] px-5 text-sm font-semibold text-white disabled:opacity-60">
          {pending ? "Importing..." : "Import Selected Ingredients"}
        </button>
      </form>
    </section>
  );
}

export function InventoryIngredients({ data }: { data: InventoryData }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [status, setStatus] = useState("All");
  const filtered = useMemo(
    () =>
      data.ingredients.filter((ingredient) => {
        const matchesQuery = ingredient.name.toLowerCase().includes(query.toLowerCase());
        const matchesCategory = category === "All" || ingredient.category === category;
        const matchesStatus = status === "All" || ingredient.status === status;
        return matchesQuery && matchesCategory && matchesStatus;
      }),
    [data.ingredients, query, category, status],
  );

  return (
    <div className="space-y-6">
      <InventoryHeader
        eyebrow="Inventory Ingredients"
        title="Manage stock ingredients and thresholds."
        description="Keep stock levels current, set low-stock alerts, and connect inventory ingredients to menu item ingredients."
      />

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <IngredientEditor restaurantId={data.restaurant.id} />
        <ImportFromMenu data={data} />
      </div>

      <section className="rounded-sm bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <div className="grid gap-3 sm:grid-cols-3">
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search ingredients" className="rounded-sm border border-slate-200 px-4 py-3 text-sm" />
          <select value={category} onChange={(event) => setCategory(event.target.value)} className="rounded-sm border border-slate-200 px-4 py-3 text-sm">
            <option>All</option>
            {inventoryCategories.map((item) => <option key={item}>{item}</option>)}
          </select>
          <select value={status} onChange={(event) => setStatus(event.target.value)} className="rounded-sm border border-slate-200 px-4 py-3 text-sm">
            <option>All</option>
            <option value="in_stock">In Stock</option>
            <option value="low_stock">Low Stock</option>
            <option value="out_of_stock">Out of Stock</option>
          </select>
        </div>
        <div className="mt-6 space-y-4">
          {filtered.map((ingredient) => (
            <details key={ingredient.id} className="rounded-sm bg-[#FBFAF7] p-4 ring-1 ring-slate-200">
              <summary className="cursor-pointer list-none">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <IngredientSummary ingredient={ingredient} />
                  <InventoryStatusBadge status={ingredient.status} />
                </div>
              </summary>
              <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_220px]">
                <IngredientEditor restaurantId={data.restaurant.id} ingredient={ingredient} />
                <div className="space-y-3 rounded-sm bg-white p-4 ring-1 ring-slate-200">
                  <p className="text-sm font-semibold">Inventory Details</p>
                  <p className="text-xs text-slate-500">{ingredient.category} · {formatQuantity(ingredient.current_stock, ingredient.unit)}</p>
                  <p className="text-xs text-slate-500">POS Sync: Coming Soon</p>
                  <DeleteIngredientButton restaurantId={data.restaurant.id} ingredientId={ingredient.id} />
                </div>
              </div>
            </details>
          ))}
          {!filtered.length ? <p className="rounded-sm bg-[#FBFAF7] p-4 text-sm text-slate-600 ring-1 ring-slate-200">No ingredients match these filters.</p> : null}
        </div>
      </section>

      <section className="rounded-sm bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <h2 className="text-2xl font-semibold">Alert Preferences</h2>
        <p className="mt-2 text-sm text-slate-500">Email alerts are coming soon. Dashboard alerts use your low-stock thresholds today.</p>
        <AlertPreferencesForm data={data} />
      </section>
    </div>
  );
}

function AlertPreferencesForm({ data }: { data: InventoryData }) {
  const [state, formAction, pending] = useActionState(saveAlertPreferencesAction, initialInventoryState);
  return (
    <form action={formAction} className="mt-5 grid gap-4 sm:grid-cols-2">
      <input type="hidden" name="restaurantId" value={data.restaurant.id} />
      <label className="rounded-sm bg-[#FBFAF7] p-4 text-sm font-semibold ring-1 ring-slate-200">
        <input name="dashboardAlertsEnabled" type="checkbox" defaultChecked={data.alertPreferences?.dashboard_alerts_enabled ?? true} className="mr-2" />
        Dashboard alerts enabled
      </label>
      <label className="rounded-sm bg-[#FBFAF7] p-4 text-sm font-semibold ring-1 ring-slate-200">
        <input name="endOfDayEmailEnabled" type="checkbox" defaultChecked={data.alertPreferences?.end_of_day_email_enabled ?? false} className="mr-2" />
        End-of-day email alerts
      </label>
      <input name="alertEmail" type="email" defaultValue={data.alertPreferences?.alert_email ?? ""} placeholder="Alert email" className="rounded-sm border border-slate-200 px-4 py-3 text-sm" />
      <div>
        <button disabled={pending || !data.canManage} className="inline-flex min-h-11 items-center justify-center rounded-sm bg-[#0F172A] px-5 text-sm font-semibold text-white disabled:opacity-60">
          {pending ? "Saving..." : "Save Preferences"}
        </button>
      </div>
      <div className="sm:col-span-2"><ActionMessage state={state} /></div>
    </form>
  );
}
