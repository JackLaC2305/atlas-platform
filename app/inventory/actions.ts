"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { inventoryCategories, inventoryUnits } from "@/lib/inventory/types";

export type InventoryActionState = {
  status: "idle" | "success" | "error";
  message: string;
};

function text(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function numberValue(formData: FormData, key: string) {
  const value = Number(text(formData, key));
  return Number.isFinite(value) ? value : 0;
}

function optionalNumber(formData: FormData, key: string) {
  const value = text(formData, key);
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function selectedValues(formData: FormData, key: string) {
  return formData.getAll(key).filter((value): value is string => typeof value === "string");
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function cleanUnit(unit: string, customUnit: string) {
  if (unit === "other") return customUnit || "unit";
  return inventoryUnits.includes(unit as never) ? unit : "unit";
}

function cleanCategory(category: string) {
  return inventoryCategories.includes(category as never) ? category : "Other";
}

async function requireOwner(restaurantId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { supabase, user: null, error: "You must be logged in." };
  }

  const { data } = await supabase
    .from("restaurant_members")
    .select("role")
    .eq("restaurant_id", restaurantId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (data?.role !== "owner") {
    return { supabase, user, error: "Only restaurant owners can manage inventory." };
  }

  return { supabase, user, error: null };
}

function revalidateInventory() {
  revalidatePath("/dashboard");
  revalidatePath("/inventory");
  revalidatePath("/inventory/ingredients");
  revalidatePath("/inventory/adjustments");
  revalidatePath("/inventory/sales");
}

export async function saveIngredientAction(
  _state: InventoryActionState,
  formData: FormData,
): Promise<InventoryActionState> {
  const restaurantId = text(formData, "restaurantId");
  const ingredientId = text(formData, "ingredientId");
  const name = text(formData, "name");
  const unit = cleanUnit(text(formData, "unit"), text(formData, "customUnit"));
  const { supabase, error } = await requireOwner(restaurantId);

  if (error) return { status: "error", message: error };
  if (!name) return { status: "error", message: "Ingredient name is required." };
  if (!restaurantId || (ingredientId && !isUuid(ingredientId))) {
    return { status: "error", message: "Invalid inventory record." };
  }

  const payload = {
    restaurant_id: restaurantId,
    name,
    category: cleanCategory(text(formData, "category")),
    unit,
    current_stock: Math.max(numberValue(formData, "currentStock"), 0),
    low_stock_threshold: Math.max(numberValue(formData, "lowStockThreshold"), 0),
    cost_per_unit: optionalNumber(formData, "costPerUnit"),
    supplier_name: text(formData, "supplierName") || null,
    notes: text(formData, "notes") || null,
  };

  const result = ingredientId
    ? await supabase.from("inventory_ingredients").update(payload).eq("id", ingredientId).eq("restaurant_id", restaurantId)
    : await supabase.from("inventory_ingredients").insert(payload);

  if (result.error) return { status: "error", message: result.error.message };

  revalidateInventory();
  return { status: "success", message: ingredientId ? "Ingredient updated." : "Ingredient added." };
}

export async function deleteIngredientAction(
  _state: InventoryActionState,
  formData: FormData,
): Promise<InventoryActionState> {
  const restaurantId = text(formData, "restaurantId");
  const ingredientId = text(formData, "ingredientId");
  const { supabase, error } = await requireOwner(restaurantId);

  if (error) return { status: "error", message: error };
  if (!isUuid(ingredientId)) return { status: "error", message: "Select a valid ingredient." };

  const { error: deleteError } = await supabase
    .from("inventory_ingredients")
    .delete()
    .eq("id", ingredientId)
    .eq("restaurant_id", restaurantId);

  if (deleteError) return { status: "error", message: deleteError.message };

  revalidateInventory();
  return { status: "success", message: "Ingredient deleted." };
}

export async function importMenuIngredientsAction(
  _state: InventoryActionState,
  formData: FormData,
): Promise<InventoryActionState> {
  const restaurantId = text(formData, "restaurantId");
  const selectedIds = selectedValues(formData, "selectedIngredientId");
  const { supabase, error } = await requireOwner(restaurantId);

  if (error) return { status: "error", message: error };
  if (selectedIds.length === 0) {
    return { status: "error", message: "Select at least one menu ingredient to import." };
  }

  let imported = 0;

  for (const menuIngredientId of selectedIds) {
    if (!isUuid(menuIngredientId)) continue;

    const name = text(formData, `name-${menuIngredientId}`);
    const menuItemId = text(formData, `menuItemId-${menuIngredientId}`);
    const unit = cleanUnit(text(formData, `unit-${menuIngredientId}`), text(formData, `customUnit-${menuIngredientId}`));
    const startingStock = Math.max(numberValue(formData, `currentStock-${menuIngredientId}`), 0);
    const threshold = Math.max(numberValue(formData, `lowStockThreshold-${menuIngredientId}`), 0);
    const quantityPerItem = Math.max(numberValue(formData, `quantityPerItem-${menuIngredientId}`), 0);

    if (!name || !isUuid(menuItemId)) continue;

    const { data: existingIngredient } = await supabase
      .from("inventory_ingredients")
      .select("id")
      .eq("restaurant_id", restaurantId)
      .ilike("name", name)
      .maybeSingle();

    let inventoryIngredientId = existingIngredient?.id as string | undefined;

    if (!inventoryIngredientId) {
      const { data: inserted, error: insertError } = await supabase
        .from("inventory_ingredients")
        .insert({
          restaurant_id: restaurantId,
          name,
          category: cleanCategory(text(formData, `category-${menuIngredientId}`)),
          unit,
          current_stock: startingStock,
          low_stock_threshold: threshold,
          cost_per_unit: optionalNumber(formData, `costPerUnit-${menuIngredientId}`),
        })
        .select("id")
        .single();

      if (insertError) return { status: "error", message: insertError.message };
      inventoryIngredientId = inserted.id;
      imported += 1;
    }

    const { error: linkError } = await supabase.from("inventory_menu_links").insert({
      restaurant_id: restaurantId,
      inventory_ingredient_id: inventoryIngredientId,
      menu_item_id: menuItemId,
      menu_item_ingredient_id: menuIngredientId,
      quantity_per_item: quantityPerItem,
      unit,
    });

    if (linkError && !linkError.message.toLowerCase().includes("duplicate")) {
      return { status: "error", message: linkError.message };
    }
  }

  revalidateInventory();
  return { status: "success", message: `Imported ${imported} inventory ingredient${imported === 1 ? "" : "s"}.` };
}

export async function adjustStockAction(
  _state: InventoryActionState,
  formData: FormData,
): Promise<InventoryActionState> {
  const restaurantId = text(formData, "restaurantId");
  const ingredientId = text(formData, "ingredientId");
  const movementType = text(formData, "movementType");
  const quantity = Math.max(numberValue(formData, "quantity"), 0);
  const reason = text(formData, "reason") || "Manual Correction";
  const notes = text(formData, "notes") || null;
  const { supabase, error } = await requireOwner(restaurantId);

  if (error) return { status: "error", message: error };
  if (!isUuid(ingredientId)) return { status: "error", message: "Select an ingredient." };
  if (!["add", "remove", "set", "correction", "waste"].includes(movementType)) {
    return { status: "error", message: "Select a valid adjustment type." };
  }

  const { error: rpcError } = await supabase.rpc("apply_inventory_stock_adjustment", {
    target_restaurant_id: restaurantId,
    target_inventory_ingredient_id: ingredientId,
    target_movement_type: movementType,
    target_quantity: quantity,
    target_reason: reason,
    target_notes: notes,
  });

  if (rpcError) return { status: "error", message: rpcError.message };

  revalidateInventory();
  return { status: "success", message: "Stock adjustment saved." };
}

export async function saveAlertPreferencesAction(
  _state: InventoryActionState,
  formData: FormData,
): Promise<InventoryActionState> {
  const restaurantId = text(formData, "restaurantId");
  const { supabase, error } = await requireOwner(restaurantId);

  if (error) return { status: "error", message: error };

  const { error: upsertError } = await supabase.from("inventory_alert_preferences").upsert(
    {
      restaurant_id: restaurantId,
      dashboard_alerts_enabled: formData.get("dashboardAlertsEnabled") === "on",
      end_of_day_email_enabled: formData.get("endOfDayEmailEnabled") === "on",
      alert_email: text(formData, "alertEmail") || null,
    },
    { onConflict: "restaurant_id" },
  );

  if (upsertError) return { status: "error", message: upsertError.message };

  revalidateInventory();
  return { status: "success", message: "Alert preferences saved. Email alerts are coming soon." };
}

export async function enterSalesAction(
  _state: InventoryActionState,
  formData: FormData,
): Promise<InventoryActionState> {
  const restaurantId = text(formData, "restaurantId");
  const salesDate = text(formData, "salesDate");
  const notes = text(formData, "notes") || null;
  const menuItemIds = selectedValues(formData, "menuItemId");
  const { supabase, error } = await requireOwner(restaurantId);

  if (error) return { status: "error", message: error };
  if (!salesDate) return { status: "error", message: "Sales date is required." };

  const items = menuItemIds
    .map((menuItemId) => ({
      menu_item_id: menuItemId,
      quantity_sold: Math.max(Number(text(formData, `quantity-${menuItemId}`)) || 0, 0),
    }))
    .filter((item) => isUuid(item.menu_item_id) && item.quantity_sold > 0);

  if (items.length === 0) {
    return { status: "error", message: "Enter quantity sold for at least one menu item." };
  }

  const { error: rpcError } = await supabase.rpc("apply_inventory_sales_entry", {
    target_restaurant_id: restaurantId,
    target_sales_date: salesDate,
    target_notes: notes,
    target_items: items,
  });

  if (rpcError) return { status: "error", message: rpcError.message };

  revalidateInventory();
  return { status: "success", message: "Daily sales entry saved and linked stock was deducted." };
}
