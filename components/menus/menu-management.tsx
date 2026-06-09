"use client";

import { useActionState, useMemo, useState } from "react";

import {
  createCategoryAction,
  createMenuAction,
  deleteCategoryAction,
  deleteMenuItemAction,
  duplicateMenuItemAction,
  duplicateMenuAction,
  menuStatusAction,
  moveCategoryAction,
  moveMenuItemAction,
  publishMenuAction,
  saveMenuItemAction,
  updateCategoryAction,
  updateMenuAction,
  type MenuActionState,
} from "@/app/menus/actions";
import {
  allergenTags,
  daysOfWeek,
  dietaryTags,
  itemAvailabilityStatuses,
  menuBadges,
  menuStatuses,
  type MenuCategoryFull,
  type MenuFull,
  type MenuItemFull,
  type MenuManagementData,
  type AvailabilityType,
} from "@/lib/menus/types";

const initialActionState: MenuActionState = { status: "idle", message: "" };

type VariantDraft = { name: string; is_required: boolean; options: { name: string; price_delta: string }[] };
type AddonDraft = { name: string; max_selections: string; options: { name: string; price_delta: string }[] };
type IngredientDraft = { ingredient_name: string; quantity: string; unit: string; custom_unit: string };

const ingredientUnits = [
  "gram",
  "kilogram",
  "milligram",
  "litre",
  "millilitre",
  "ounce",
  "pound",
  "piece",
  "slice",
  "cup",
  "tablespoon",
  "teaspoon",
  "bunch",
  "portion",
  "bottle",
  "can",
  "packet",
  "pinch",
  "unit",
  "other",
];

const badgeClasses: Record<string, string> = {
  "Chef's Special": "bg-[#D4A017]/12 text-[#8A6811] ring-[#D4A017]/30",
  "Best Seller": "bg-emerald-50 text-emerald-800 ring-emerald-200",
  New: "bg-sky-50 text-sky-800 ring-sky-200",
  Seasonal: "bg-orange-50 text-orange-800 ring-orange-200",
  "Limited Time": "bg-rose-50 text-rose-800 ring-rose-200",
};

function titleCase(value: string) {
  return value
    .replaceAll("_", " ")
    .split(" ")
    .map((word) => (word ? `${word[0].toUpperCase()}${word.slice(1)}` : word))
    .join(" ");
}

function price(currency: string, value: number) {
  const symbol = currency === "GBP" ? "£" : currency === "USD" ? "$" : currency === "AED" ? "AED " : "€";
  return `${symbol}${Number(value).toFixed(2)}`;
}

function currencySymbol(currency: string) {
  return currency === "GBP" ? "£" : currency === "USD" ? "$" : currency === "AED" ? "AED" : "€";
}

function displayUnit(unit: string | null) {
  if (!unit) return "";
  return ingredientUnits.includes(unit) ? unit : "other";
}

function customUnit(unit: string | null) {
  if (!unit || ingredientUnits.includes(unit)) return "";
  return unit;
}

function resolveIngredients(ingredients: IngredientDraft[]) {
  return ingredients.map((ingredient) => ({
    ...ingredient,
    unit: ingredient.unit === "other" ? ingredient.custom_unit : ingredient.unit,
  }));
}

function TagChip({ tag, type = "neutral" }: { tag: string; type?: "badge" | "neutral" | "allergen" }) {
  if (type === "badge") {
    return (
      <span className={`rounded-sm px-2.5 py-1 text-xs font-semibold ring-1 ${badgeClasses[tag] ?? "bg-[#FBFAF7] text-slate-600 ring-slate-200"}`}>
        {tag}
      </span>
    );
  }

  return (
    <span
      className={`rounded-sm px-2.5 py-1 text-xs font-semibold ring-1 ${
        type === "allergen"
          ? "bg-red-50 text-red-700 ring-red-100"
          : "bg-[#FBFAF7] text-slate-600 ring-slate-200"
      }`}
    >
      {tag}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const classes: Record<string, string> = {
    draft: "bg-slate-100 text-slate-600",
    scheduled: "bg-[#D4A017]/10 text-[#8A6811]",
    published: "bg-emerald-50 text-emerald-700",
    archived: "bg-slate-200 text-slate-600",
    available: "bg-emerald-50 text-emerald-700",
    sold_out: "bg-red-50 text-red-700",
    hidden: "bg-slate-100 text-slate-500",
  };

  return (
    <span className={`rounded-sm px-2.5 py-1 text-xs font-semibold ${classes[status] ?? classes.draft}`}>
      {titleCase(status)}
    </span>
  );
}

function ActionMessage({ state }: { state: MenuActionState }) {
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

function MenuForm({
  restaurantId,
  menu,
}: {
  restaurantId: string;
  menu?: MenuFull;
}) {
  const [state, formAction, pending] = useActionState(menu ? updateMenuAction : createMenuAction, initialActionState);
  const [availabilityType, setAvailabilityType] = useState(menu?.availability_type ?? "always");

  return (
    <form action={formAction} className="space-y-4 rounded-sm bg-white p-5 shadow-sm ring-1 ring-slate-200">
      <input type="hidden" name="restaurantId" value={restaurantId} />
      {menu ? <input type="hidden" name="menuId" value={menu.id} /> : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-medium text-slate-700">
          Menu Name *
          <input
            name="name"
            defaultValue={menu?.name}
            required
            className="mt-2 w-full rounded-sm border border-slate-200 px-4 py-3 text-sm"
          />
        </label>
        <label className="text-sm font-medium text-slate-700">
          Status
          <select name="status" defaultValue={menu?.status ?? "draft"} className="mt-2 w-full rounded-sm border border-slate-200 px-4 py-3 text-sm">
            {menuStatuses.map((status) => (
              <option key={status} value={status}>
                {titleCase(status)}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className="block text-sm font-medium text-slate-700">
        Description
        <textarea
          name="description"
          defaultValue={menu?.description ?? ""}
          rows={3}
          className="mt-2 w-full rounded-sm border border-slate-200 px-4 py-3 text-sm"
        />
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-medium text-slate-700">
          Availability
          <select
            name="availabilityType"
            value={availabilityType}
            onChange={(event) => setAvailabilityType(event.target.value as AvailabilityType)}
            className="mt-2 w-full rounded-sm border border-slate-200 px-4 py-3 text-sm"
          >
            <option value="always">Always Available</option>
            <option value="scheduled">Scheduled</option>
          </select>
        </label>
      </div>
      {availabilityType === "scheduled" ? (
        <div className="rounded-sm bg-[#FBFAF7] p-4 ring-1 ring-slate-200">
          <div className="flex flex-wrap gap-2">
            {daysOfWeek.map((day) => (
              <label key={day} className="rounded-sm border border-slate-200 bg-white px-3 py-2 text-xs font-semibold">
                <input
                  type="checkbox"
                  name="scheduleDays"
                  value={day}
                  defaultChecked={menu?.schedule_days?.includes(day)}
                  className="mr-2"
                />
                {day}
              </label>
            ))}
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-4">
            <input name="startTime" type="time" defaultValue={menu?.start_time?.slice(0, 5) ?? ""} className="rounded-sm border border-slate-200 px-3 py-2 text-sm" />
            <input name="endTime" type="time" defaultValue={menu?.end_time?.slice(0, 5) ?? ""} className="rounded-sm border border-slate-200 px-3 py-2 text-sm" />
            <input name="startDate" type="date" defaultValue={menu?.start_date ?? ""} className="rounded-sm border border-slate-200 px-3 py-2 text-sm" />
            <input name="endDate" type="date" defaultValue={menu?.end_date ?? ""} className="rounded-sm border border-slate-200 px-3 py-2 text-sm" />
          </div>
        </div>
      ) : null}
      <ActionMessage state={state} />
      <button
        disabled={pending}
        className="inline-flex min-h-11 items-center justify-center rounded-sm bg-[#0F172A] px-5 text-sm font-semibold text-white disabled:opacity-60"
      >
        {pending ? "Saving..." : menu ? "Save Menu" : "Create New Menu"}
      </button>
    </form>
  );
}

function CategoryForm({
  restaurantId,
  menuId,
  category,
}: {
  restaurantId: string;
  menuId: string;
  category?: MenuCategoryFull;
}) {
  const [state, formAction, pending] = useActionState(
    category ? updateCategoryAction : createCategoryAction,
    initialActionState,
  );

  return (
    <form action={formAction} className="grid gap-3 rounded-sm bg-[#FBFAF7] p-4 ring-1 ring-slate-200 sm:grid-cols-[1fr_1fr_auto]">
      <input type="hidden" name="restaurantId" value={restaurantId} />
      <input type="hidden" name="menuId" value={menuId} />
      {category ? <input type="hidden" name="categoryId" value={category.id} /> : null}
      <input type="hidden" name="sortOrder" value={category?.sort_order ?? 0} />
      <input name="name" defaultValue={category?.name} placeholder="Category name" className="rounded-sm border border-slate-200 px-3 py-2 text-sm" required />
      <input name="description" defaultValue={category?.description ?? ""} placeholder="Description optional" className="rounded-sm border border-slate-200 px-3 py-2 text-sm" />
      <label className="flex items-center gap-2 text-xs font-semibold text-slate-600">
        <input type="checkbox" name="isVisible" value="true" defaultChecked={category?.is_visible ?? true} />
        Visible
      </label>
      <div className="sm:col-span-3 flex items-center justify-between gap-3">
        <ActionMessage state={state} />
        <button disabled={pending} className="rounded-sm bg-[#0F172A] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
          {pending ? "Saving..." : category ? "Update Category" : "Add Category"}
        </button>
      </div>
    </form>
  );
}

function NestedBuilder({
  currency,
  variantGroups,
  setVariantGroups,
  addonGroups,
  setAddonGroups,
  ingredients,
  setIngredients,
}: {
  currency: string;
  variantGroups: VariantDraft[];
  setVariantGroups: (value: VariantDraft[]) => void;
  addonGroups: AddonDraft[];
  setAddonGroups: (value: AddonDraft[]) => void;
  ingredients: IngredientDraft[];
  setIngredients: (value: IngredientDraft[]) => void;
}) {
  const symbol = currencySymbol(currency);

  return (
    <div className="space-y-4">
      <div className="rounded-sm bg-[#FBFAF7] p-4 ring-1 ring-slate-200">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold">Variants</p>
          <button type="button" onClick={() => setVariantGroups([...variantGroups, { name: "Size", is_required: false, options: [{ name: "Small", price_delta: "0" }] }])} className="text-sm font-semibold text-[#9A7412]">Add Variant Group</button>
        </div>
        {variantGroups.map((group, groupIndex) => (
          <div key={groupIndex} className="mt-3 rounded-sm bg-white p-3 ring-1 ring-slate-200">
            <div className="flex flex-col gap-2 sm:flex-row">
              <input value={group.name} onChange={(event) => setVariantGroups(variantGroups.map((item, index) => index === groupIndex ? { ...item, name: event.target.value } : item))} className="w-full rounded-sm border border-slate-200 px-3 py-2 text-sm" placeholder="Group name" />
              <button type="button" onClick={() => setVariantGroups(variantGroups.filter((_, index) => index !== groupIndex))} className="rounded-sm border border-red-200 px-3 py-2 text-xs font-semibold text-red-700">
                Remove Group
              </button>
            </div>
            <label className="mt-2 flex items-center gap-2 text-xs font-semibold text-slate-600">
              <input type="checkbox" checked={group.is_required} onChange={(event) => setVariantGroups(variantGroups.map((item, index) => index === groupIndex ? { ...item, is_required: event.target.checked } : item))} />
              Required
            </label>
            {group.options.map((option, optionIndex) => (
              <div key={optionIndex} className="mt-2 grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
                <input value={option.name} onChange={(event) => setVariantGroups(variantGroups.map((item, index) => index === groupIndex ? { ...item, options: item.options.map((opt, idx) => idx === optionIndex ? { ...opt, name: event.target.value } : opt) } : item))} className="rounded-sm border border-slate-200 px-3 py-2 text-sm" placeholder="Option" />
                <label className="flex items-center overflow-hidden rounded-sm border border-slate-200 bg-white text-sm">
                  <span className="border-r border-slate-200 bg-[#FBFAF7] px-3 py-2 font-semibold text-slate-500">{symbol}</span>
                  <input value={option.price_delta} onChange={(event) => setVariantGroups(variantGroups.map((item, index) => index === groupIndex ? { ...item, options: item.options.map((opt, idx) => idx === optionIndex ? { ...opt, price_delta: event.target.value } : opt) } : item))} className="min-w-0 flex-1 px-3 py-2 outline-none" placeholder="Price delta" />
                </label>
                <button type="button" onClick={() => setVariantGroups(variantGroups.map((item, index) => index === groupIndex ? { ...item, options: item.options.filter((_, idx) => idx !== optionIndex) } : item))} className="rounded-sm border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600">
                  Remove
                </button>
              </div>
            ))}
            <button type="button" onClick={() => setVariantGroups(variantGroups.map((item, index) => index === groupIndex ? { ...item, options: [...item.options, { name: "", price_delta: "0" }] } : item))} className="mt-2 text-xs font-semibold text-[#9A7412]">Add Option</button>
          </div>
        ))}
      </div>
      <div className="rounded-sm bg-[#FBFAF7] p-4 ring-1 ring-slate-200">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold">Add-ons</p>
          <button type="button" onClick={() => setAddonGroups([...addonGroups, { name: "Add sides", max_selections: "1", options: [{ name: "Fries", price_delta: "4" }] }])} className="text-sm font-semibold text-[#9A7412]">Add Add-on Group</button>
        </div>
        {addonGroups.map((group, groupIndex) => (
          <div key={groupIndex} className="mt-3 rounded-sm bg-white p-3 ring-1 ring-slate-200">
            <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
              <input value={group.name} onChange={(event) => setAddonGroups(addonGroups.map((item, index) => index === groupIndex ? { ...item, name: event.target.value } : item))} className="rounded-sm border border-slate-200 px-3 py-2 text-sm" placeholder="Group name" />
              <input value={group.max_selections} onChange={(event) => setAddonGroups(addonGroups.map((item, index) => index === groupIndex ? { ...item, max_selections: event.target.value } : item))} className="rounded-sm border border-slate-200 px-3 py-2 text-sm" placeholder="Max selections" />
              <button type="button" onClick={() => setAddonGroups(addonGroups.filter((_, index) => index !== groupIndex))} className="rounded-sm border border-red-200 px-3 py-2 text-xs font-semibold text-red-700">
                Remove Group
              </button>
            </div>
            {group.options.map((option, optionIndex) => (
              <div key={optionIndex} className="mt-2 grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
                <input value={option.name} onChange={(event) => setAddonGroups(addonGroups.map((item, index) => index === groupIndex ? { ...item, options: item.options.map((opt, idx) => idx === optionIndex ? { ...opt, name: event.target.value } : opt) } : item))} className="rounded-sm border border-slate-200 px-3 py-2 text-sm" placeholder="Add-on" />
                <label className="flex items-center overflow-hidden rounded-sm border border-slate-200 bg-white text-sm">
                  <span className="border-r border-slate-200 bg-[#FBFAF7] px-3 py-2 font-semibold text-slate-500">{symbol}</span>
                  <input value={option.price_delta} onChange={(event) => setAddonGroups(addonGroups.map((item, index) => index === groupIndex ? { ...item, options: item.options.map((opt, idx) => idx === optionIndex ? { ...opt, price_delta: event.target.value } : opt) } : item))} className="min-w-0 flex-1 px-3 py-2 outline-none" placeholder="Price delta" />
                </label>
                <button type="button" onClick={() => setAddonGroups(addonGroups.map((item, index) => index === groupIndex ? { ...item, options: item.options.filter((_, idx) => idx !== optionIndex) } : item))} className="rounded-sm border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600">
                  Remove
                </button>
              </div>
            ))}
            <button type="button" onClick={() => setAddonGroups(addonGroups.map((item, index) => index === groupIndex ? { ...item, options: [...item.options, { name: "", price_delta: "0" }] } : item))} className="mt-2 text-xs font-semibold text-[#9A7412]">Add Option</button>
          </div>
        ))}
      </div>
      <div className="rounded-sm bg-[#FBFAF7] p-4 ring-1 ring-slate-200">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold">Ingredients</p>
            <p className="mt-1 text-xs text-slate-500">Ingredients are optional, but adding them enables future inventory tracking and low-stock insights.</p>
          </div>
          <button type="button" onClick={() => setIngredients([...ingredients, { ingredient_name: "", quantity: "", unit: "", custom_unit: "" }])} className="text-sm font-semibold text-[#9A7412]">Add Ingredient</button>
        </div>
        {ingredients.map((ingredient, index) => (
          <div key={index} className="mt-2 grid gap-2 sm:grid-cols-[1fr_0.7fr_0.8fr_auto]">
            <input value={ingredient.ingredient_name} onChange={(event) => setIngredients(ingredients.map((item, idx) => idx === index ? { ...item, ingredient_name: event.target.value } : item))} className="rounded-sm border border-slate-200 px-3 py-2 text-sm" placeholder="Ingredient" />
            <input value={ingredient.quantity} onChange={(event) => setIngredients(ingredients.map((item, idx) => idx === index ? { ...item, quantity: event.target.value } : item))} className="rounded-sm border border-slate-200 px-3 py-2 text-sm" placeholder="Quantity" />
            <div className="space-y-2">
              <select value={ingredient.unit} onChange={(event) => setIngredients(ingredients.map((item, idx) => idx === index ? { ...item, unit: event.target.value, custom_unit: event.target.value === "other" ? item.custom_unit : "" } : item))} className="w-full rounded-sm border border-slate-200 px-3 py-2 text-sm">
                <option value="">Unit</option>
                {ingredientUnits.map((unit) => (
                  <option key={unit} value={unit}>{titleCase(unit)}</option>
                ))}
              </select>
              {ingredient.unit === "other" ? (
                <input value={ingredient.custom_unit} onChange={(event) => setIngredients(ingredients.map((item, idx) => idx === index ? { ...item, custom_unit: event.target.value } : item))} className="w-full rounded-sm border border-slate-200 px-3 py-2 text-sm" placeholder="Custom unit" />
              ) : null}
            </div>
            <button type="button" onClick={() => setIngredients(ingredients.filter((_, idx) => idx !== index))} className="rounded-sm border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600">
              Remove
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function ItemForm({
  restaurantId,
  menu,
  item,
  onDone,
}: {
  restaurantId: string;
  menu: MenuFull;
  item?: MenuItemFull;
  onDone: () => void;
}) {
  const [state, formAction, pending] = useActionState(saveMenuItemAction, initialActionState);
  const [selectedImageNames, setSelectedImageNames] = useState<string[]>([]);
  const [itemCurrency, setItemCurrency] = useState(item?.currency ?? "EUR");
  const [variantGroups, setVariantGroups] = useState<VariantDraft[]>(
    item?.variantGroups.map((group) => ({
      name: group.name,
      is_required: group.is_required,
      options: group.variants.map((variant) => ({ name: variant.name, price_delta: String(variant.price_delta) })),
    })) ?? [],
  );
  const [addonGroups, setAddonGroups] = useState<AddonDraft[]>(
    item?.addonGroups.map((group) => ({
      name: group.name,
      max_selections: String(group.max_selections),
      options: group.addons.map((addon) => ({ name: addon.name, price_delta: String(addon.price_delta) })),
    })) ?? [],
  );
  const [ingredients, setIngredients] = useState<IngredientDraft[]>(
    item?.ingredients.map((ingredient) => ({
      ingredient_name: ingredient.ingredient_name,
      quantity: ingredient.quantity ? String(ingredient.quantity) : "",
      unit: displayUnit(ingredient.unit),
      custom_unit: customUnit(ingredient.unit),
    })) ?? [],
  );

  return (
    <form action={formAction} className="space-y-5 rounded-sm bg-white p-5 shadow-sm ring-1 ring-slate-200">
      <input type="hidden" name="restaurantId" value={restaurantId} />
      <input type="hidden" name="menuId" value={menu.id} />
      {item ? <input type="hidden" name="itemId" value={item.id} /> : null}
      <input type="hidden" name="variantGroups" value={JSON.stringify(variantGroups)} />
      <input type="hidden" name="addonGroups" value={JSON.stringify(addonGroups)} />
      <input type="hidden" name="ingredients" value={JSON.stringify(resolveIngredients(ingredients))} />
      <div className="grid gap-4 sm:grid-cols-2">
        <input name="name" defaultValue={item?.name} required placeholder="Item name" className="rounded-sm border border-slate-200 px-4 py-3 text-sm" />
        <select name="categoryId" defaultValue={item?.category_id ?? menu.categories[0]?.id ?? ""} required className="rounded-sm border border-slate-200 px-4 py-3 text-sm">
          {menu.categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
        <input name="basePrice" defaultValue={item?.base_price ?? ""} required type="number" step="0.01" min="0" placeholder="Base price" className="rounded-sm border border-slate-200 px-4 py-3 text-sm" />
        <input name="currency" value={itemCurrency} onChange={(event) => setItemCurrency(event.target.value.toUpperCase())} placeholder="Currency" className="rounded-sm border border-slate-200 px-4 py-3 text-sm" />
      </div>
      <textarea name="description" defaultValue={item?.description ?? ""} rows={3} placeholder="Description" className="w-full rounded-sm border border-slate-200 px-4 py-3 text-sm" />
      <div className="grid gap-4 sm:grid-cols-3">
        <select name="availabilityStatus" defaultValue={item?.availability_status ?? "available"} className="rounded-sm border border-slate-200 px-4 py-3 text-sm">
          {itemAvailabilityStatuses.map((status) => (
            <option key={status} value={status}>{titleCase(status)}</option>
          ))}
        </select>
        <label className="flex items-center gap-2 rounded-sm border border-slate-200 px-4 py-3 text-sm font-semibold">
          <input type="checkbox" name="isFeatured" defaultChecked={item?.is_featured} />
          Featured
        </label>
        <div className="rounded-sm border border-slate-200 px-4 py-3 text-sm">
          <label className="inline-flex cursor-pointer items-center justify-center rounded-sm bg-[#0F172A] px-4 py-2 text-xs font-semibold text-white">
            Select Images
            <input
              name="images"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              multiple
              className="sr-only"
              onChange={(event) => setSelectedImageNames(Array.from(event.target.files ?? []).slice(0, 2).map((file) => file.name))}
            />
          </label>
          <p className="mt-2 text-xs text-slate-500">Optional. Up to 2 images per menu item.</p>
          {selectedImageNames.length ? (
            <div className="mt-2 space-y-1 text-xs font-semibold text-slate-600">
              {selectedImageNames.map((fileName) => (
                <p key={fileName}>{fileName}</p>
              ))}
            </div>
          ) : item?.images.length ? (
            <p className="mt-2 text-xs font-semibold text-slate-600">{item.images.length} existing image(s)</p>
          ) : null}
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <TagGroup title="Badges" name="badges" options={menuBadges} selected={item?.badges ?? []} />
        <TagGroup title="Dietary Tags" name="dietaryTags" options={dietaryTags} selected={item?.dietary_tags ?? []} />
        <TagGroup title="Allergens" name="allergens" options={allergenTags} selected={item?.allergens ?? []} />
      </div>
      <textarea name="ingredientsNote" defaultValue={item?.ingredients_note ?? ""} rows={2} placeholder="Ingredients note" className="w-full rounded-sm border border-slate-200 px-4 py-3 text-sm" />
      <label className="flex items-start gap-3 rounded-sm bg-[#FBFAF7] p-4 text-sm ring-1 ring-slate-200">
        <input type="checkbox" name="showIngredientSummary" defaultChecked={item?.show_ingredient_summary ?? false} className="mt-1" />
        <span>
          <span className="block font-semibold text-slate-800">Show ingredient summary to customers</span>
          <span className="mt-1 block text-xs leading-5 text-slate-500">If enabled, the internal preview shows ingredient names only. Quantities remain private operational data.</span>
        </span>
      </label>
      <NestedBuilder
        currency={itemCurrency}
        variantGroups={variantGroups}
        setVariantGroups={setVariantGroups}
        addonGroups={addonGroups}
        setAddonGroups={setAddonGroups}
        ingredients={ingredients}
        setIngredients={setIngredients}
      />
      <ActionMessage state={state} />
      <div className="flex gap-3">
        <button disabled={pending || menu.categories.length === 0} className="rounded-sm bg-[#0F172A] px-5 py-3 text-sm font-semibold text-white disabled:opacity-60">
          {pending ? "Saving..." : item ? "Save Item" : "Add Item"}
        </button>
        <button type="button" onClick={onDone} className="rounded-sm border border-slate-300 px-5 py-3 text-sm font-semibold">Close</button>
      </div>
    </form>
  );
}

function TagGroup({ title, name, options, selected }: { title: string; name: string; options: string[]; selected: string[] }) {
  return (
    <fieldset className="rounded-sm bg-[#FBFAF7] p-4 ring-1 ring-slate-200">
      <legend className="text-sm font-semibold">{title}</legend>
      <div className="mt-3 flex flex-wrap gap-2">
        {options.map((option) => (
          <label key={option} className="rounded-sm bg-white px-2.5 py-1.5 text-xs font-semibold ring-1 ring-slate-200">
            <input type="checkbox" name={name} value={option} defaultChecked={selected.includes(option)} className="mr-2" />
            {option}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function ItemCard({
  restaurantId,
  category,
  item,
  itemIndex,
  itemCount,
  canManage,
  onEdit,
}: {
  restaurantId: string;
  category: MenuCategoryFull;
  item: MenuItemFull;
  itemIndex: number;
  itemCount: number;
  canManage: boolean;
  onEdit: (item: MenuItemFull) => void;
}) {
  const canMoveUp = itemIndex > 0;
  const canMoveDown = itemIndex < itemCount - 1;

  return (
    <div className="rounded-sm bg-white p-4 shadow-sm ring-1 ring-slate-200">
      <div className="flex gap-4">
        {item.images[0]?.signed_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.images[0].signed_url} alt="" className="h-20 w-20 rounded-sm object-cover" />
        ) : (
          <div className="grid h-20 w-20 place-items-center rounded-sm bg-[#FBFAF7] text-xs font-semibold text-slate-400 ring-1 ring-slate-200">Image</div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-base font-semibold">{item.name}</p>
              <p className="mt-1 text-sm text-slate-500">{item.description}</p>
            </div>
            <p className="text-sm font-semibold">{price(item.currency, item.base_price)}</p>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <StatusBadge status={item.availability_status} />
            {item.is_featured ? <span className="rounded-sm bg-[#D4A017]/10 px-2.5 py-1 text-xs font-semibold text-[#8A6811]">Featured</span> : null}
            {item.badges.map((tag) => <TagChip key={tag} tag={tag} type="badge" />)}
            {item.dietary_tags.map((tag) => <TagChip key={tag} tag={tag} />)}
            {item.allergens.map((tag) => <TagChip key={tag} tag={tag} type="allergen" />)}
          </div>
          {item.addonGroups.length ? (
            <div className="mt-3 space-y-1 text-xs leading-5 text-slate-500">
              {item.addonGroups.map((group) => (
                <p key={group.id}>
                  <span className="font-semibold text-slate-600">{group.name}:</span>{" "}
                  {group.addons.map((addon) => `${addon.name} +${price(item.currency, addon.price_delta)}`).join(", ")}
                </p>
              ))}
            </div>
          ) : null}
          <p className="mt-3 text-xs text-slate-500">
            {item.variantGroups.length} variant group(s) · {item.addonGroups.length} add-on group(s) · {item.ingredients.length ? "Ingredients added" : "No ingredients"}
          </p>
          {canManage ? (
            <div className="mt-4 flex flex-wrap gap-2">
              <button type="button" onClick={() => onEdit(item)} className="rounded-sm border border-slate-300 px-3 py-2 text-xs font-semibold">Edit</button>
              <form action={deleteMenuItemAction}>
                <input type="hidden" name="restaurantId" value={restaurantId} />
                <input type="hidden" name="itemId" value={item.id} />
                <button className="rounded-sm border border-red-200 px-3 py-2 text-xs font-semibold text-red-700">Delete</button>
              </form>
              <form action={duplicateMenuItemAction}>
                <input type="hidden" name="restaurantId" value={restaurantId} />
                <input type="hidden" name="itemId" value={item.id} />
                <button className="rounded-sm border border-slate-300 px-3 py-2 text-xs font-semibold">Duplicate</button>
              </form>
              <form action={moveMenuItemAction}>
                <input type="hidden" name="restaurantId" value={restaurantId} />
                <input type="hidden" name="itemId" value={item.id} />
                <input type="hidden" name="categoryId" value={category.id} />
                <input type="hidden" name="sortOrder" value={itemIndex - 1} />
                <button disabled={!canMoveUp} className="rounded-sm border border-slate-300 px-3 py-2 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-40">Move Up</button>
              </form>
              <form action={moveMenuItemAction}>
                <input type="hidden" name="restaurantId" value={restaurantId} />
                <input type="hidden" name="itemId" value={item.id} />
                <input type="hidden" name="categoryId" value={category.id} />
                <input type="hidden" name="sortOrder" value={itemIndex + 1} />
                <button disabled={!canMoveDown} className="rounded-sm border border-slate-300 px-3 py-2 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-40">Move Down</button>
              </form>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function Preview({
  menu,
  restaurantName,
  logoUrl,
}: {
  menu: MenuFull;
  restaurantName: string;
  logoUrl: string | null;
}) {
  const [dietFilters, setDietFilters] = useState<string[]>([]);
  const [allergenFilters, setAllergenFilters] = useState<string[]>([]);
  const toggleFilter = (value: string, selected: string[], setSelected: (value: string[]) => void) => {
    setSelected(selected.includes(value) ? selected.filter((item) => item !== value) : [...selected, value]);
  };
  const categories = menu.categories
    .filter((category) => category.is_visible)
    .map((category) => ({
      ...category,
      items: category.items.filter((item) => {
        if (item.availability_status === "hidden") return false;
        if (dietFilters.length && !dietFilters.every((tag) => item.dietary_tags.includes(tag))) return false;
        if (allergenFilters.some((tag) => item.allergens.includes(tag))) return false;
        return true;
      }),
    }));

  return (
    <section className="rounded-sm bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:p-10">
      <div className="mb-8 flex flex-col gap-4 border-b border-slate-200 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt="" className="mb-4 h-14 w-14 rounded-sm object-contain" />
          ) : null}
          <p className="text-sm font-semibold text-[#9A7412]">{restaurantName}</p>
          <h2 className="mt-2 text-4xl font-semibold">{menu.name}</h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">{menu.description}</p>
        </div>
        <div className="grid gap-2 sm:min-w-72">
          <details className="rounded-sm border border-slate-200 bg-white px-3 py-2 text-sm">
            <summary className="cursor-pointer font-semibold text-slate-700">
              Show items matching{dietFilters.length ? `: ${dietFilters.join(", ")}` : ""}
            </summary>
            <div className="mt-3 flex flex-wrap gap-2">
              {dietaryTags.map((tag) => (
                <label key={tag} className={`rounded-sm px-2.5 py-1 text-xs font-semibold ring-1 ${dietFilters.includes(tag) ? "bg-[#0F172A] text-white ring-[#0F172A]" : "bg-[#FBFAF7] text-slate-600 ring-slate-200"}`}>
                  <input type="checkbox" checked={dietFilters.includes(tag)} onChange={() => toggleFilter(tag, dietFilters, setDietFilters)} className="sr-only" />
                  {tag}
                </label>
              ))}
            </div>
          </details>
          <details className="rounded-sm border border-slate-200 bg-white px-3 py-2 text-sm">
            <summary className="cursor-pointer font-semibold text-slate-700">
              Hide items containing{allergenFilters.length ? `: ${allergenFilters.join(", ")}` : ""}
            </summary>
            <div className="mt-3 flex flex-wrap gap-2">
              {allergenTags.map((tag) => (
                <label key={tag} className={`rounded-sm px-2.5 py-1 text-xs font-semibold ring-1 ${allergenFilters.includes(tag) ? "bg-red-700 text-white ring-red-700" : "bg-[#FBFAF7] text-slate-600 ring-slate-200"}`}>
                  <input type="checkbox" checked={allergenFilters.includes(tag)} onChange={() => toggleFilter(tag, allergenFilters, setAllergenFilters)} className="sr-only" />
                  {tag}
                </label>
              ))}
            </div>
          </details>
        </div>
      </div>
      <div className="space-y-10">
        {categories.map((category) => (
          <div key={category.id}>
            <h3 className="text-2xl font-semibold">{category.name}</h3>
            {category.description ? <p className="mt-2 text-sm text-slate-500">{category.description}</p> : null}
            <div className="mt-5 space-y-5">
              {category.items.map((item) => (
                <div key={item.id} className="flex gap-4 border-b border-slate-200 pb-5">
                  <div className="flex-1">
                    <div className="flex justify-between gap-4">
                      <p className="font-semibold">{item.name}</p>
                      <p className="font-semibold">{price(item.currency, item.base_price)}</p>
                    </div>
                    <p className="mt-1 text-sm leading-6 text-slate-600">{item.description}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {item.badges.map((tag) => <TagChip key={tag} tag={tag} type="badge" />)}
                      {item.dietary_tags.map((tag) => <TagChip key={tag} tag={tag} />)}
                      {item.allergens.map((tag) => <TagChip key={tag} tag={tag} type="allergen" />)}
                    </div>
                    {item.variantGroups.length || item.addonGroups.length ? (
                      <div className="mt-3 space-y-1 text-xs leading-5 text-slate-500">
                        {item.variantGroups.map((group) => (
                          <p key={group.id}>
                            <span className="font-semibold text-slate-600">{group.name}:</span>{" "}
                            {group.variants.map((variant) => `${variant.name} +${price(item.currency, variant.price_delta)}`).join(", ")}
                          </p>
                        ))}
                        {item.addonGroups.map((group) => (
                          <p key={group.id}>
                            <span className="font-semibold text-slate-600">{group.name}:</span>{" "}
                            {group.addons.map((addon) => `${addon.name} +${price(item.currency, addon.price_delta)}`).join(", ")}
                          </p>
                        ))}
                      </div>
                    ) : null}
                    {item.show_ingredient_summary && item.ingredients.length ? (
                      <p className="mt-3 text-xs leading-5 text-slate-500">
                        <span className="font-semibold text-slate-600">Ingredients:</span>{" "}
                        {item.ingredients.map((ingredient) => ingredient.ingredient_name).join(", ")}
                      </p>
                    ) : null}
                  </div>
                  {item.images[0]?.signed_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.images[0].signed_url} alt="" className="h-20 w-20 rounded-sm object-cover" />
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export function MenuManagement({
  data,
  notice,
}: {
  data: MenuManagementData;
  notice?: { status: "success" | "error"; message: string };
}) {
  const [selectedMenuId, setSelectedMenuId] = useState(data.menus[0]?.id ?? "");
  const [view, setView] = useState<"overview" | "builder" | "preview">("overview");
  const [editingItem, setEditingItem] = useState<MenuItemFull | undefined>();
  const selectedMenu = useMemo(
    () => data.menus.find((menu) => menu.id === selectedMenuId) ?? data.menus[0],
    [data.menus, selectedMenuId],
  );
  const selectedMenuHasVisibleCategory = Boolean(
    selectedMenu?.categories.some((category) => category.is_visible),
  );
  const selectedMenuItemCount =
    selectedMenu?.categories.reduce((sum, category) => sum + category.items.length, 0) ?? 0;
  const selectedMenuCanPublish = selectedMenuHasVisibleCategory && selectedMenuItemCount > 0;

  return (
    <div className="space-y-6">
      {notice ? <ActionMessage state={{ status: notice.status, message: notice.message }} /> : null}
      <section className="rounded-sm bg-[#0F172A] p-7 text-white shadow-sm sm:p-9">
        <p className="text-sm font-medium text-[#D4A017]">Menu Management</p>
        <h1 className="mt-3 text-4xl font-semibold">Build and manage restaurant menus.</h1>
        <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-300">
          Create structured menus, categories, items, variants, add-ons, allergens, and
          ingredients. QR publishing and printable exports are intentionally not built yet.
        </p>
      </section>

      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <aside className="space-y-5">
          <MenuForm restaurantId={data.restaurant.id} />
          <div className="rounded-sm bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Menus</h2>
              <span className="text-sm text-slate-500">{data.menus.length}</span>
            </div>
            {data.menus.length === 0 ? (
              <p className="mt-5 rounded-sm bg-[#FBFAF7] p-4 text-sm text-slate-600 ring-1 ring-slate-200">
                No menus yet. Create your first menu to open the builder.
              </p>
            ) : (
              <div className="mt-5 space-y-3">
                {data.menus.map((menu) => {
                  const itemCount = menu.categories.reduce((sum, category) => sum + category.items.length, 0);
                  return (
                    <button
                      key={menu.id}
                      type="button"
                      onClick={() => {
                        setSelectedMenuId(menu.id);
                        setView("builder");
                      }}
                      className={`w-full rounded-sm border p-4 text-left transition ${
                        selectedMenu?.id === menu.id ? "border-[#D4A017] bg-[#D4A017]/10" : "border-slate-200 bg-white hover:bg-[#FBFAF7]"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <p className="font-semibold">{menu.name}</p>
                        <StatusBadge status={menu.status} />
                      </div>
                      <p className="mt-2 text-sm text-slate-500">{menu.description}</p>
                      <p className="mt-3 text-xs font-semibold text-slate-500">{menu.categories.length} categories · {itemCount} items</p>
                      {menu.availability_type === "scheduled" ? (
                        <p className="mt-2 text-xs text-slate-500">{menu.schedule_days.join(", ")} · {menu.start_time?.slice(0, 5)}-{menu.end_time?.slice(0, 5)}</p>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </aside>

        <main className="space-y-6">
          {selectedMenu ? (
            <>
              <div className="rounded-sm bg-white p-5 shadow-sm ring-1 ring-slate-200">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <h2 className="text-3xl font-semibold">{selectedMenu.name}</h2>
                      <StatusBadge status={selectedMenu.status} />
                    </div>
                    <p className="mt-2 text-sm text-slate-500">{selectedMenu.description}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {["overview", "builder", "preview"].map((tab) => (
                      <button key={tab} type="button" onClick={() => setView(tab as never)} className={`rounded-sm px-4 py-2 text-sm font-semibold ${view === tab ? "bg-[#0F172A] text-white" : "border border-slate-200 bg-white"}`}>
                        {titleCase(tab)}
                      </button>
                    ))}
                  </div>
                </div>
                {!selectedMenuCanPublish ? (
                  <div className="mt-5 rounded-sm border border-[#D4A017]/30 bg-[#D4A017]/10 px-4 py-3 text-sm text-[#8A6811]">
                    Publishing is blocked until this menu has at least one visible category and one menu item.
                  </div>
                ) : null}
                <div className="mt-5 flex flex-wrap gap-2">
                  <form action={publishMenuAction}>
                    <input type="hidden" name="restaurantId" value={data.restaurant.id} />
                    <input type="hidden" name="menuId" value={selectedMenu.id} />
                    <button
                      disabled={!selectedMenuCanPublish}
                      className="rounded-sm bg-emerald-700 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Publish
                    </button>
                  </form>
                  {selectedMenu.status === "published" ? (
                    <form action={menuStatusAction}>
                      <input type="hidden" name="restaurantId" value={data.restaurant.id} />
                      <input type="hidden" name="menuId" value={selectedMenu.id} />
                      <input type="hidden" name="status" value="draft" />
                      <button className="rounded-sm border border-slate-300 px-4 py-2 text-sm font-semibold">
                        Unpublish
                      </button>
                    </form>
                  ) : null}
                  {selectedMenu.status !== "archived" ? (
                    <form action={menuStatusAction}>
                      <input type="hidden" name="restaurantId" value={data.restaurant.id} />
                      <input type="hidden" name="menuId" value={selectedMenu.id} />
                      <input type="hidden" name="status" value="archived" />
                      <button className="rounded-sm border border-slate-300 px-4 py-2 text-sm font-semibold">Archive</button>
                    </form>
                  ) : (
                    <form action={menuStatusAction}>
                      <input type="hidden" name="restaurantId" value={data.restaurant.id} />
                      <input type="hidden" name="menuId" value={selectedMenu.id} />
                      <input type="hidden" name="status" value="draft" />
                      <button className="rounded-sm border border-slate-300 px-4 py-2 text-sm font-semibold">Republish As Draft</button>
                    </form>
                  )}
                  <form action={duplicateMenuAction}>
                    <input type="hidden" name="restaurantId" value={data.restaurant.id} />
                    <input type="hidden" name="menuId" value={selectedMenu.id} />
                    <button className="rounded-sm border border-slate-300 px-4 py-2 text-sm font-semibold">Duplicate</button>
                  </form>
                </div>
              </div>

              {view === "overview" ? <MenuForm restaurantId={data.restaurant.id} menu={selectedMenu} /> : null}
              {view === "preview" ? <Preview menu={selectedMenu} restaurantName={data.restaurant.name} logoUrl={data.logoUrl} /> : null}
              {view === "builder" ? (
                <div className="space-y-6">
                  <CategoryForm restaurantId={data.restaurant.id} menuId={selectedMenu.id} />
                  {editingItem ? (
                    <ItemForm key={editingItem.id} restaurantId={data.restaurant.id} menu={selectedMenu} item={editingItem} onDone={() => setEditingItem(undefined)} />
                  ) : (
                    <ItemForm key="new-item" restaurantId={data.restaurant.id} menu={selectedMenu} onDone={() => setEditingItem(undefined)} />
                  )}
                  {selectedMenu.categories.map((category, index) => (
                    <section key={category.id} className="rounded-sm bg-[#FBFAF7] p-5 ring-1 ring-slate-200">
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <p className="text-xs font-semibold text-slate-500">Drag-ready section · order {category.sort_order}</p>
                          <h3 className="mt-1 text-2xl font-semibold">{category.name}</h3>
                          <p className="mt-1 text-sm text-slate-500">{category.description}</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <StatusBadge status={category.is_visible ? "available" : "hidden"} />
                          <form action={moveCategoryAction}>
                            <input type="hidden" name="restaurantId" value={data.restaurant.id} />
                            <input type="hidden" name="categoryId" value={category.id} />
                            <input type="hidden" name="sortOrder" value={index - 1} />
                            <button disabled={index === 0} className="rounded-sm border border-slate-300 px-3 py-2 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-40">Move Up</button>
                          </form>
                          <form action={moveCategoryAction}>
                            <input type="hidden" name="restaurantId" value={data.restaurant.id} />
                            <input type="hidden" name="categoryId" value={category.id} />
                            <input type="hidden" name="sortOrder" value={index + 1} />
                            <button disabled={index === selectedMenu.categories.length - 1} className="rounded-sm border border-slate-300 px-3 py-2 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-40">Move Down</button>
                          </form>
                          <form action={deleteCategoryAction}>
                            <input type="hidden" name="restaurantId" value={data.restaurant.id} />
                            <input type="hidden" name="categoryId" value={category.id} />
                            <button className="rounded-sm border border-red-200 px-3 py-2 text-xs font-semibold text-red-700">Delete</button>
                          </form>
                        </div>
                      </div>
                      <div className="mt-4">
                        <CategoryForm restaurantId={data.restaurant.id} menuId={selectedMenu.id} category={category} />
                      </div>
                      <div className="mt-5 grid gap-4">
                        {category.items.map((item, itemIndex) => (
                          <ItemCard
                            key={item.id}
                            restaurantId={data.restaurant.id}
                            category={category}
                            item={item}
                            itemIndex={itemIndex}
                            itemCount={category.items.length}
                            canManage={data.canManage}
                            onEdit={setEditingItem}
                          />
                        ))}
                      </div>
                    </section>
                  ))}
                </div>
              ) : null}
            </>
          ) : (
            <div className="rounded-sm bg-white p-8 text-center shadow-sm ring-1 ring-slate-200">
              <h2 className="text-2xl font-semibold">Create a menu to begin.</h2>
              <p className="mt-3 text-sm text-slate-500">Menus, categories, and items will appear here.</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
