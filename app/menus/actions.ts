"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  allergenTags,
  availabilityTypes,
  dietaryTags,
  itemAvailabilityStatuses,
  menuBadges,
  menuStatuses,
} from "@/lib/menus/types";
import { createClient } from "@/lib/supabase/server";

export type MenuActionState = {
  status: "idle" | "success" | "error";
  message: string;
};

function text(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function optionalText(formData: FormData, key: string) {
  const value = text(formData, key);
  return value || null;
}

function checkboxValues(formData: FormData, key: string) {
  return formData.getAll(key).filter((value): value is string => typeof value === "string");
}

function parseNumber(value: string, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function getFiles(formData: FormData, key: string) {
  return formData
    .getAll(key)
    .filter((value): value is File => value instanceof File && value.size > 0);
}

function safeFileName(fileName: string) {
  return (
    fileName
      .toLowerCase()
      .replace(/[^a-z0-9._-]+/g, "-")
      .replace(/^-+|-+$/g, "") || "image"
  );
}

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

async function requireOwner(restaurantId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { supabase, error: "You must be logged in." };
  }

  const { data } = await supabase
    .from("restaurant_members")
    .select("role")
    .eq("restaurant_id", restaurantId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!data) {
    return { supabase, error: "You do not have access to this restaurant." };
  }

  if (data.role !== "owner") {
    return { supabase, error: "Only restaurant owners can manage menus." };
  }

  return { supabase, error: null };
}

async function menuBelongsToRestaurant(
  supabase: SupabaseServerClient,
  restaurantId: string,
  menuId: string,
) {
  if (!menuId) return false;

  const { data } = await supabase
    .from("menus")
    .select("id")
    .eq("restaurant_id", restaurantId)
    .eq("id", menuId)
    .maybeSingle();

  return Boolean(data);
}

async function categoryBelongsToMenu(
  supabase: SupabaseServerClient,
  restaurantId: string,
  menuId: string,
  categoryId: string,
) {
  if (!categoryId || !menuId) return false;

  const { data } = await supabase
    .from("menu_categories")
    .select("id")
    .eq("restaurant_id", restaurantId)
    .eq("menu_id", menuId)
    .eq("id", categoryId)
    .maybeSingle();

  return Boolean(data);
}

async function validateMenuPublishReadiness(
  supabase: SupabaseServerClient,
  restaurantId: string,
  menuId: string,
) {
  const menuExists = await menuBelongsToRestaurant(supabase, restaurantId, menuId);

  if (!menuExists) {
    return "Menu not found.";
  }

  const [{ data: categories }, { data: items }] = await Promise.all([
    supabase
      .from("menu_categories")
      .select("id")
      .eq("restaurant_id", restaurantId)
      .eq("menu_id", menuId)
      .eq("is_visible", true)
      .limit(1),
    supabase
      .from("menu_items")
      .select("id")
      .eq("restaurant_id", restaurantId)
      .eq("menu_id", menuId)
      .limit(1),
  ]);

  if (!categories?.length || !items?.length) {
    return "Publishing is blocked until this menu has at least one visible category and one item.";
  }

  return null;
}

function blockedPublishRedirect(message: string) {
  return `/menus?menuError=${encodeURIComponent(message)}`;
}

function validateSchedule(formData: FormData) {
  const availabilityType = text(formData, "availabilityType") || "always";
  const startTime = optionalText(formData, "startTime");
  const endTime = optionalText(formData, "endTime");
  const scheduleDays = checkboxValues(formData, "scheduleDays");

  if (!availabilityTypes.includes(availabilityType as never)) {
    return { error: "Select a valid availability type." };
  }

  if (availabilityType === "scheduled") {
    if (scheduleDays.length === 0) return { error: "Select at least one schedule day." };
    if (!startTime || !endTime) return { error: "Scheduled menus require start and end times." };
    if (endTime <= startTime) return { error: "End time must be after start time." };
  }

  return { error: null, availabilityType, startTime, endTime, scheduleDays };
}

export async function createMenuAction(
  _state: MenuActionState,
  formData: FormData,
): Promise<MenuActionState> {
  const restaurantId = text(formData, "restaurantId");
  const { supabase, error } = await requireOwner(restaurantId);
  if (error) return { status: "error", message: error };

  const name = text(formData, "name");
  if (!name) return { status: "error", message: "Menu name is required." };
  const schedule = validateSchedule(formData);
  if (schedule.error) return { status: "error", message: schedule.error };
  const status = text(formData, "status") || "draft";

  if (!menuStatuses.includes(status as never)) {
    return { status: "error", message: "Select a valid menu status." };
  }

  if (status === "published") {
    return {
      status: "error",
      message: "Create the menu first, then add at least one visible category and one item before publishing.",
    };
  }

  const { error: insertError } = await supabase.from("menus").insert({
    restaurant_id: restaurantId,
    name,
    description: optionalText(formData, "description"),
    status,
    availability_type: schedule.availabilityType,
    schedule_days: schedule.scheduleDays,
    start_time: schedule.availabilityType === "scheduled" ? schedule.startTime : null,
    end_time: schedule.availabilityType === "scheduled" ? schedule.endTime : null,
    start_date: optionalText(formData, "startDate"),
    end_date: optionalText(formData, "endDate"),
  });

  if (insertError) return { status: "error", message: insertError.message };
  revalidatePath("/menus");
  return { status: "success", message: "Menu created." };
}

export async function updateMenuAction(
  _state: MenuActionState,
  formData: FormData,
): Promise<MenuActionState> {
  const restaurantId = text(formData, "restaurantId");
  const menuId = text(formData, "menuId");
  const { supabase, error } = await requireOwner(restaurantId);
  if (error) return { status: "error", message: error };

  const name = text(formData, "name");
  if (!name) return { status: "error", message: "Menu name is required." };
  const schedule = validateSchedule(formData);
  if (schedule.error) return { status: "error", message: schedule.error };

  const status = text(formData, "status") || "draft";
  if (!menuStatuses.includes(status as never)) {
    return { status: "error", message: "Select a valid menu status." };
  }
  if (status === "published") {
    const publishError = await validateMenuPublishReadiness(supabase, restaurantId, menuId);
    if (publishError) return { status: "error", message: publishError };
  }
  const { error: updateError } = await supabase
    .from("menus")
    .update({
      name,
      description: optionalText(formData, "description"),
      status,
      availability_type: schedule.availabilityType,
      schedule_days: schedule.scheduleDays,
      start_time: schedule.availabilityType === "scheduled" ? schedule.startTime : null,
      end_time: schedule.availabilityType === "scheduled" ? schedule.endTime : null,
      start_date: optionalText(formData, "startDate"),
      end_date: optionalText(formData, "endDate"),
      archived_at: status === "archived" ? new Date().toISOString() : null,
      published_at: status === "published" ? new Date().toISOString() : null,
    })
    .eq("id", menuId)
    .eq("restaurant_id", restaurantId);

  if (updateError) return { status: "error", message: updateError.message };
  revalidatePath("/menus");
  revalidatePath("/dashboard");
  return { status: "success", message: "Menu saved." };
}

export async function publishMenuAction(formData: FormData): Promise<void> {
  const restaurantId = text(formData, "restaurantId");
  const menuId = text(formData, "menuId");
  const { supabase, error } = await requireOwner(restaurantId);
  if (error) return;

  const publishError = await validateMenuPublishReadiness(supabase, restaurantId, menuId);
  if (publishError) {
    redirect(blockedPublishRedirect(publishError));
  }

  await supabase
    .from("menus")
    .update({ status: "published", published_at: new Date().toISOString(), archived_at: null })
    .eq("restaurant_id", restaurantId)
    .eq("id", menuId);
  revalidatePath("/menus");
  revalidatePath("/dashboard");
}

export async function menuStatusAction(formData: FormData): Promise<void> {
  const restaurantId = text(formData, "restaurantId");
  const menuId = text(formData, "menuId");
  const status = text(formData, "status");
  const { supabase, error } = await requireOwner(restaurantId);
  if (error || !menuStatuses.includes(status as never)) return;

  if (status === "published") {
    const publishError = await validateMenuPublishReadiness(supabase, restaurantId, menuId);
    if (publishError) {
      redirect(blockedPublishRedirect(publishError));
    }
  }

  await supabase
    .from("menus")
    .update({
      status,
      archived_at: status === "archived" ? new Date().toISOString() : null,
      published_at: status === "published" ? new Date().toISOString() : null,
    })
    .eq("restaurant_id", restaurantId)
    .eq("id", menuId);
  revalidatePath("/menus");
  revalidatePath("/dashboard");
}

export async function createCategoryAction(
  _state: MenuActionState,
  formData: FormData,
): Promise<MenuActionState> {
  const restaurantId = text(formData, "restaurantId");
  const { supabase, error } = await requireOwner(restaurantId);
  if (error) return { status: "error", message: error };
  const name = text(formData, "name");
  if (!name) return { status: "error", message: "Category name is required." };
  const menuId = text(formData, "menuId");

  if (!(await menuBelongsToRestaurant(supabase, restaurantId, menuId))) {
    return { status: "error", message: "Select a valid menu for this restaurant." };
  }

  const { error: insertError } = await supabase.from("menu_categories").insert({
    restaurant_id: restaurantId,
    menu_id: menuId,
    name,
    description: optionalText(formData, "description"),
    sort_order: parseNumber(text(formData, "sortOrder")),
    is_visible: text(formData, "isVisible") !== "false",
  });

  if (insertError) return { status: "error", message: insertError.message };
  revalidatePath("/menus");
  return { status: "success", message: "Category saved." };
}

export async function updateCategoryAction(
  _state: MenuActionState,
  formData: FormData,
): Promise<MenuActionState> {
  const restaurantId = text(formData, "restaurantId");
  const { supabase, error } = await requireOwner(restaurantId);
  if (error) return { status: "error", message: error };
  const name = text(formData, "name");
  if (!name) return { status: "error", message: "Category name is required." };

  const { error: updateError } = await supabase
    .from("menu_categories")
    .update({
      name,
      description: optionalText(formData, "description"),
      is_visible: text(formData, "isVisible") !== "false",
    })
    .eq("restaurant_id", restaurantId)
    .eq("id", text(formData, "categoryId"));

  if (updateError) return { status: "error", message: updateError.message };
  revalidatePath("/menus");
  return { status: "success", message: "Category updated." };
}

export async function deleteCategoryAction(formData: FormData): Promise<void> {
  const restaurantId = text(formData, "restaurantId");
  const { supabase, error } = await requireOwner(restaurantId);
  if (error) return;
  await supabase
    .from("menu_categories")
    .delete()
    .eq("restaurant_id", restaurantId)
    .eq("id", text(formData, "categoryId"));
  revalidatePath("/menus");
}

export async function moveCategoryAction(formData: FormData): Promise<void> {
  const restaurantId = text(formData, "restaurantId");
  const { supabase, error } = await requireOwner(restaurantId);
  if (error) return;

  const categoryId = text(formData, "categoryId");
  const targetIndex = parseNumber(text(formData, "sortOrder"));
  const { data: currentCategory } = await supabase
    .from("menu_categories")
    .select("menu_id")
    .eq("restaurant_id", restaurantId)
    .eq("id", categoryId)
    .single();
  if (!currentCategory) return;

  const { data: categories } = await supabase
    .from("menu_categories")
    .select("id")
    .eq("restaurant_id", restaurantId)
    .eq("menu_id", currentCategory.menu_id)
    .order("sort_order", { ascending: true });
  const ordered = categories ?? [];
  const currentIndex = ordered.findIndex((category) => category.id === categoryId);
  if (currentIndex < 0 || targetIndex < 0 || targetIndex >= ordered.length) return;

  const [moved] = ordered.splice(currentIndex, 1);
  ordered.splice(targetIndex, 0, moved);
  await Promise.all(
    ordered.map((category, index) =>
      supabase
        .from("menu_categories")
        .update({ sort_order: index })
        .eq("restaurant_id", restaurantId)
        .eq("id", category.id),
    ),
  );
  revalidatePath("/menus");
}

function validStructuredTags(values: string[], allowed: string[]) {
  return values.filter((value) => allowed.includes(value));
}

type NestedOption = { name?: unknown; price_delta?: unknown };
type NestedGroup = {
  name?: unknown;
  is_required?: unknown;
  max_selections?: unknown;
  options?: NestedOption[];
};
type NestedIngredient = {
  ingredient_name?: unknown;
  quantity?: unknown;
  unit?: unknown;
  inventory_ingredient_id?: unknown;
};

function parseNestedRows<T>(value: string): T[] {
  try {
    const parsed = JSON.parse(value || "[]");
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

async function uploadImages(restaurantId: string, itemId: string, files: File[]) {
  const supabase = await createClient();
  const { count } = await supabase
    .from("menu_item_images")
    .select("id", { count: "exact", head: true })
    .eq("restaurant_id", restaurantId)
    .eq("menu_item_id", itemId);

  if ((count ?? 0) + files.length > 2) {
    throw new Error("Menu items can have a maximum of 2 images.");
  }

  const rows = [];
  for (const [index, file] of files.slice(0, 2).entries()) {
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type) || file.size > 5 * 1024 * 1024) {
      throw new Error("Menu item images must be PNG, JPG, or WebP and 5MB or smaller.");
    }
    const path = `${restaurantId}/${itemId}/${Date.now()}-${index}-${safeFileName(file.name)}`;
    const { error } = await supabase.storage.from("menu-item-images").upload(path, file, {
      contentType: file.type,
    });
    if (error) throw new Error(error.message);
    rows.push({
      restaurant_id: restaurantId,
      menu_item_id: itemId,
      image_url: null,
      image_path: path,
      sort_order: index,
    });
  }
  if (rows.length > 0) {
    const { error } = await supabase.from("menu_item_images").insert(rows);
    if (error) throw new Error(error.message);
  }
}

export async function saveMenuItemAction(
  _state: MenuActionState,
  formData: FormData,
): Promise<MenuActionState> {
  const restaurantId = text(formData, "restaurantId");
  const { supabase, error } = await requireOwner(restaurantId);
  if (error) return { status: "error", message: error };

  const menuId = text(formData, "menuId");
  const itemId = text(formData, "itemId");
  const name = text(formData, "name");
  const categoryId = text(formData, "categoryId");
  const basePrice = parseNumber(text(formData, "basePrice"), -1);
  if (!name) return { status: "error", message: "Item name is required." };
  if (!categoryId) return { status: "error", message: "Select a category." };
  if (basePrice < 0) return { status: "error", message: "Base price must be zero or higher." };
  if (!(await menuBelongsToRestaurant(supabase, restaurantId, menuId))) {
    return { status: "error", message: "Select a valid menu for this restaurant." };
  }
  if (!(await categoryBelongsToMenu(supabase, restaurantId, menuId, categoryId))) {
    return { status: "error", message: "Select a valid category for this menu." };
  }
  if (itemId) {
    const { data: existingItem } = await supabase
      .from("menu_items")
      .select("id")
      .eq("restaurant_id", restaurantId)
      .eq("id", itemId)
      .maybeSingle();

    if (!existingItem) {
      return { status: "error", message: "Menu item not found." };
    }
  }

  const itemPayload = {
    restaurant_id: restaurantId,
    menu_id: menuId,
    category_id: categoryId,
    name,
    description: optionalText(formData, "description"),
    base_price: basePrice,
    currency: text(formData, "currency") || "EUR",
    availability_status: itemAvailabilityStatuses.includes(text(formData, "availabilityStatus") as never)
      ? text(formData, "availabilityStatus")
      : "available",
    is_featured: text(formData, "isFeatured") === "on",
    show_ingredient_summary: text(formData, "showIngredientSummary") === "on",
    badges: validStructuredTags(checkboxValues(formData, "badges"), menuBadges),
    dietary_tags: validStructuredTags(checkboxValues(formData, "dietaryTags"), dietaryTags),
    allergens: validStructuredTags(checkboxValues(formData, "allergens"), allergenTags),
    ingredients_note: optionalText(formData, "ingredientsNote"),
    sort_order: parseNumber(text(formData, "sortOrder")),
  };

  let savedItemId = itemId;
  if (itemId) {
    const { error: updateError } = await supabase
      .from("menu_items")
      .update(itemPayload)
      .eq("restaurant_id", restaurantId)
      .eq("id", itemId);
    if (updateError) return { status: "error", message: updateError.message };
  } else {
    const { data, error: insertError } = await supabase
      .from("menu_items")
      .insert(itemPayload)
      .select("id")
      .single();
    if (insertError) return { status: "error", message: insertError.message };
    savedItemId = data.id;
  }

  try {
    await uploadImages(restaurantId, savedItemId, getFiles(formData, "images"));

    await Promise.all([
      supabase.from("menu_item_variant_groups").delete().eq("restaurant_id", restaurantId).eq("menu_item_id", savedItemId),
      supabase.from("menu_item_addon_groups").delete().eq("restaurant_id", restaurantId).eq("menu_item_id", savedItemId),
      supabase.from("inventory_menu_links").delete().eq("restaurant_id", restaurantId).eq("menu_item_id", savedItemId),
      supabase.from("menu_item_ingredients").delete().eq("restaurant_id", restaurantId).eq("menu_item_id", savedItemId),
    ]);

    const variantGroups = parseNestedRows<NestedGroup>(text(formData, "variantGroups"));
    for (const [groupIndex, group] of variantGroups.entries()) {
      if (!group.name) continue;
      const { data } = await supabase
        .from("menu_item_variant_groups")
        .insert({
          restaurant_id: restaurantId,
          menu_item_id: savedItemId,
          name: String(group.name),
          is_required: Boolean(group.is_required),
          sort_order: groupIndex,
        })
        .select("id")
        .single();
      const options = Array.isArray(group.options) ? group.options : [];
      if (data && options.length) {
        await supabase.from("menu_item_variants").insert(
          options
            .filter((option) => option.name)
            .map((option, optionIndex) => ({
              restaurant_id: restaurantId,
              variant_group_id: data.id,
              name: String(option.name),
              price_delta: parseNumber(String(option.price_delta ?? 0)),
              sort_order: optionIndex,
            })),
        );
      }
    }

    const addonGroups = parseNestedRows<NestedGroup>(text(formData, "addonGroups"));
    for (const [groupIndex, group] of addonGroups.entries()) {
      if (!group.name) continue;
      const { data } = await supabase
        .from("menu_item_addon_groups")
        .insert({
          restaurant_id: restaurantId,
          menu_item_id: savedItemId,
          name: String(group.name),
          max_selections: Math.max(1, parseNumber(String(group.max_selections ?? 1), 1)),
          sort_order: groupIndex,
        })
        .select("id")
        .single();
      const options = Array.isArray(group.options) ? group.options : [];
      if (data && options.length) {
        await supabase.from("menu_item_addons").insert(
          options
            .filter((option) => option.name)
            .map((option, optionIndex) => ({
              restaurant_id: restaurantId,
              addon_group_id: data.id,
              name: String(option.name),
              price_delta: parseNumber(String(option.price_delta ?? 0)),
              sort_order: optionIndex,
            })),
        );
      }
    }

    const ingredients = parseNestedRows<NestedIngredient>(text(formData, "ingredients"));
    if (ingredients.length) {
      for (const [index, ingredient] of ingredients.filter((ingredient) => ingredient.ingredient_name).entries()) {
        const inventoryIngredientId =
          typeof ingredient.inventory_ingredient_id === "string" && ingredient.inventory_ingredient_id
            ? ingredient.inventory_ingredient_id
            : null;
        const { data: menuIngredient, error: ingredientError } = await supabase
          .from("menu_item_ingredients")
          .insert({
            restaurant_id: restaurantId,
            menu_item_id: savedItemId,
            ingredient_name: String(ingredient.ingredient_name),
            quantity: ingredient.quantity ? parseNumber(String(ingredient.quantity)) : null,
            unit: ingredient.unit ? String(ingredient.unit) : null,
            sort_order: index,
          })
          .select("id")
          .single();

        if (ingredientError) throw new Error(ingredientError.message);

        if (inventoryIngredientId && menuIngredient) {
          const { data: inventoryIngredient } = await supabase
            .from("inventory_ingredients")
            .select("id")
            .eq("restaurant_id", restaurantId)
            .eq("id", inventoryIngredientId)
            .maybeSingle();

          if (inventoryIngredient) {
            const { error: linkError } = await supabase.from("inventory_menu_links").insert({
              restaurant_id: restaurantId,
              inventory_ingredient_id: inventoryIngredient.id,
              menu_item_id: savedItemId,
              menu_item_ingredient_id: menuIngredient.id,
              quantity_per_item: ingredient.quantity ? parseNumber(String(ingredient.quantity)) : 0,
              unit: ingredient.unit ? String(ingredient.unit) : "unit",
            });
            if (linkError) throw new Error(linkError.message);
          }
        }
      }
    }
  } catch (nestedError) {
    return {
      status: "error",
      message: nestedError instanceof Error ? nestedError.message : "Item saved, but nested details failed.",
    };
  }

  revalidatePath("/menus");
  revalidatePath("/dashboard");
  return { status: "success", message: "Menu item saved." };
}

export async function deleteMenuItemAction(formData: FormData): Promise<void> {
  const restaurantId = text(formData, "restaurantId");
  const { supabase, error } = await requireOwner(restaurantId);
  if (error) return;
  await supabase
    .from("menu_items")
    .delete()
    .eq("restaurant_id", restaurantId)
    .eq("id", text(formData, "itemId"));
  revalidatePath("/menus");
  revalidatePath("/dashboard");
}

export async function duplicateMenuItemAction(formData: FormData): Promise<void> {
  const restaurantId = text(formData, "restaurantId");
  const itemId = text(formData, "itemId");
  const { supabase, error } = await requireOwner(restaurantId);
  if (error) return;

  const { data: item } = await supabase
    .from("menu_items")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .eq("id", itemId)
    .single();
  if (!item) return;

  const { data: siblingItems } = await supabase
    .from("menu_items")
    .select("name")
    .eq("restaurant_id", restaurantId)
    .eq("menu_id", item.menu_id);
  const baseName = String(item.name).replace(/\s\(\d+\)$/, "");
  const names = new Set((siblingItems ?? []).map((sibling) => sibling.name));
  let copyNumber = 1;
  let copyName = `${baseName} (${copyNumber})`;
  while (names.has(copyName)) {
    copyNumber += 1;
    copyName = `${baseName} (${copyNumber})`;
  }

  const { data: newItem } = await supabase
    .from("menu_items")
    .insert({
      restaurant_id: restaurantId,
      menu_id: item.menu_id,
      category_id: item.category_id,
      name: copyName,
      description: item.description,
      base_price: item.base_price,
      currency: item.currency,
      availability_status: item.availability_status,
      is_featured: item.is_featured,
      show_ingredient_summary: item.show_ingredient_summary,
      badges: item.badges,
      dietary_tags: item.dietary_tags,
      allergens: item.allergens,
      ingredients_note: item.ingredients_note,
      sort_order: item.sort_order + 1,
    })
    .select("id")
    .single();
  if (!newItem) return;

  const [
    { data: images },
    { data: ingredients },
    { data: inventoryLinks },
    { data: variantGroups },
    { data: addonGroups },
  ] = await Promise.all([
    supabase.from("menu_item_images").select("*").eq("restaurant_id", restaurantId).eq("menu_item_id", itemId),
    supabase.from("menu_item_ingredients").select("*").eq("restaurant_id", restaurantId).eq("menu_item_id", itemId),
    supabase.from("inventory_menu_links").select("*").eq("restaurant_id", restaurantId).eq("menu_item_id", itemId),
    supabase.from("menu_item_variant_groups").select("*").eq("restaurant_id", restaurantId).eq("menu_item_id", itemId),
    supabase.from("menu_item_addon_groups").select("*").eq("restaurant_id", restaurantId).eq("menu_item_id", itemId),
  ]);

  if (images?.length) {
    await supabase.from("menu_item_images").insert(
      images.map((image) => ({
        restaurant_id: restaurantId,
        menu_item_id: newItem.id,
        image_url: image.image_url,
        image_path: image.image_path,
        sort_order: image.sort_order,
      })),
    );
  }
  if (ingredients?.length) {
    for (const ingredient of ingredients) {
      const { data: newIngredient } = await supabase
        .from("menu_item_ingredients")
        .insert({
          restaurant_id: restaurantId,
          menu_item_id: newItem.id,
          ingredient_name: ingredient.ingredient_name,
          quantity: ingredient.quantity,
          unit: ingredient.unit,
          sort_order: ingredient.sort_order,
        })
        .select("id")
        .single();
      const link = inventoryLinks?.find((itemLink) => itemLink.menu_item_ingredient_id === ingredient.id);
      if (newIngredient && link) {
        await supabase.from("inventory_menu_links").insert({
          restaurant_id: restaurantId,
          inventory_ingredient_id: link.inventory_ingredient_id,
          menu_item_id: newItem.id,
          menu_item_ingredient_id: newIngredient.id,
          quantity_per_item: link.quantity_per_item,
          unit: link.unit,
        });
      }
    }
  }
  for (const group of variantGroups ?? []) {
    const { data: newGroup } = await supabase
      .from("menu_item_variant_groups")
      .insert({
        restaurant_id: restaurantId,
        menu_item_id: newItem.id,
        name: group.name,
        is_required: group.is_required,
        sort_order: group.sort_order,
      })
      .select("id")
      .single();
    if (!newGroup) continue;
    const { data: variants } = await supabase
      .from("menu_item_variants")
      .select("*")
      .eq("restaurant_id", restaurantId)
      .eq("variant_group_id", group.id);
    if (variants?.length) {
      await supabase.from("menu_item_variants").insert(
        variants.map((variant) => ({
          restaurant_id: restaurantId,
          variant_group_id: newGroup.id,
          name: variant.name,
          price_delta: variant.price_delta,
          sort_order: variant.sort_order,
        })),
      );
    }
  }
  for (const group of addonGroups ?? []) {
    const { data: newGroup } = await supabase
      .from("menu_item_addon_groups")
      .insert({
        restaurant_id: restaurantId,
        menu_item_id: newItem.id,
        name: group.name,
        max_selections: group.max_selections,
        sort_order: group.sort_order,
      })
      .select("id")
      .single();
    if (!newGroup) continue;
    const { data: addons } = await supabase
      .from("menu_item_addons")
      .select("*")
      .eq("restaurant_id", restaurantId)
      .eq("addon_group_id", group.id);
    if (addons?.length) {
      await supabase.from("menu_item_addons").insert(
        addons.map((addon) => ({
          restaurant_id: restaurantId,
          addon_group_id: newGroup.id,
          name: addon.name,
          price_delta: addon.price_delta,
          sort_order: addon.sort_order,
        })),
      );
    }
  }

  revalidatePath("/menus");
  revalidatePath("/dashboard");
}

export async function moveMenuItemAction(formData: FormData): Promise<void> {
  const restaurantId = text(formData, "restaurantId");
  const { supabase, error } = await requireOwner(restaurantId);
  if (error) return;

  const itemId = text(formData, "itemId");
  const categoryId = text(formData, "categoryId");
  const targetIndex = parseNumber(text(formData, "sortOrder"));
  const { data: items } = await supabase
    .from("menu_items")
    .select("id")
    .eq("restaurant_id", restaurantId)
    .eq("category_id", categoryId)
    .order("sort_order", { ascending: true });
  const ordered = items ?? [];
  const currentIndex = ordered.findIndex((item) => item.id === itemId);
  if (currentIndex < 0 || targetIndex < 0 || targetIndex >= ordered.length) return;

  const [moved] = ordered.splice(currentIndex, 1);
  ordered.splice(targetIndex, 0, moved);
  await Promise.all(
    ordered.map((item, index) =>
      supabase
        .from("menu_items")
        .update({ sort_order: index, category_id: categoryId })
        .eq("restaurant_id", restaurantId)
        .eq("id", item.id),
    ),
  );
  revalidatePath("/menus");
}

export async function duplicateMenuAction(formData: FormData): Promise<void> {
  const restaurantId = text(formData, "restaurantId");
  const menuId = text(formData, "menuId");
  const { supabase, error } = await requireOwner(restaurantId);
  if (error) return;

  const [{ data: menu }, { data: allMenus }] = await Promise.all([
    supabase.from("menus").select("*").eq("restaurant_id", restaurantId).eq("id", menuId).single(),
    supabase.from("menus").select("name").eq("restaurant_id", restaurantId),
  ]);
  if (!menu) return;

  const baseName = String(menu.name).replace(/\s\(\d+\)$/, "");
  const names = new Set((allMenus ?? []).map((item) => item.name));
  let copyName = `${baseName} (1)`;
  let copyNumber = 1;
  while (names.has(copyName)) {
    copyNumber += 1;
    copyName = `${baseName} (${copyNumber})`;
  }

  const { data: newMenu } = await supabase
    .from("menus")
    .insert({
      restaurant_id: restaurantId,
      name: copyName,
      description: menu.description,
      status: "draft",
      availability_type: menu.availability_type,
      schedule_days: menu.schedule_days,
      start_time: menu.start_time,
      end_time: menu.end_time,
      start_date: menu.start_date,
      end_date: menu.end_date,
      sort_order: menu.sort_order + 1,
    })
    .select("id")
    .single();
  if (!newMenu) return;

  const { data: categories } = await supabase
    .from("menu_categories")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .eq("menu_id", menuId);
  for (const category of categories ?? []) {
    const { data: newCategory } = await supabase
      .from("menu_categories")
      .insert({
        restaurant_id: restaurantId,
        menu_id: newMenu.id,
        name: category.name,
        description: category.description,
        sort_order: category.sort_order,
        is_visible: category.is_visible,
      })
      .select("id")
      .single();
    if (!newCategory) continue;
    const { data: items } = await supabase
      .from("menu_items")
      .select("*")
      .eq("restaurant_id", restaurantId)
      .eq("category_id", category.id);
    for (const item of items ?? []) {
      const { data: newItem } = await supabase
        .from("menu_items")
        .insert({
          restaurant_id: restaurantId,
          menu_id: newMenu.id,
          category_id: newCategory.id,
          name: item.name,
          description: item.description,
          base_price: item.base_price,
          currency: item.currency,
          availability_status: item.availability_status,
          is_featured: item.is_featured,
          show_ingredient_summary: item.show_ingredient_summary,
          badges: item.badges,
          dietary_tags: item.dietary_tags,
          allergens: item.allergens,
          ingredients_note: item.ingredients_note,
          sort_order: item.sort_order,
        })
        .select("id")
        .single();
      if (!newItem) continue;
      const [
        { data: images },
        { data: ingredients },
        { data: inventoryLinks },
        { data: variantGroups },
        { data: addonGroups },
      ] = await Promise.all([
        supabase.from("menu_item_images").select("*").eq("restaurant_id", restaurantId).eq("menu_item_id", item.id),
        supabase
          .from("menu_item_ingredients")
          .select("*")
          .eq("restaurant_id", restaurantId)
          .eq("menu_item_id", item.id),
        supabase
          .from("inventory_menu_links")
          .select("*")
          .eq("restaurant_id", restaurantId)
          .eq("menu_item_id", item.id),
        supabase
          .from("menu_item_variant_groups")
          .select("*")
          .eq("restaurant_id", restaurantId)
          .eq("menu_item_id", item.id),
        supabase
          .from("menu_item_addon_groups")
          .select("*")
          .eq("restaurant_id", restaurantId)
          .eq("menu_item_id", item.id),
      ]);
      if (images?.length) {
        await supabase.from("menu_item_images").insert(
          images.map((image) => ({
            restaurant_id: restaurantId,
            menu_item_id: newItem.id,
            image_url: image.image_url,
            image_path: image.image_path,
            sort_order: image.sort_order,
          })),
        );
      }
      if (ingredients?.length) {
        for (const ingredient of ingredients) {
          const { data: newIngredient } = await supabase
            .from("menu_item_ingredients")
            .insert({
              restaurant_id: restaurantId,
              menu_item_id: newItem.id,
              ingredient_name: ingredient.ingredient_name,
              quantity: ingredient.quantity,
              unit: ingredient.unit,
              sort_order: ingredient.sort_order,
            })
            .select("id")
            .single();
          const link = inventoryLinks?.find((itemLink) => itemLink.menu_item_ingredient_id === ingredient.id);
          if (newIngredient && link) {
            await supabase.from("inventory_menu_links").insert({
              restaurant_id: restaurantId,
              inventory_ingredient_id: link.inventory_ingredient_id,
              menu_item_id: newItem.id,
              menu_item_ingredient_id: newIngredient.id,
              quantity_per_item: link.quantity_per_item,
              unit: link.unit,
            });
          }
        }
      }
      for (const group of variantGroups ?? []) {
        const { data: newGroup } = await supabase
          .from("menu_item_variant_groups")
          .insert({
            restaurant_id: restaurantId,
            menu_item_id: newItem.id,
            name: group.name,
            is_required: group.is_required,
            sort_order: group.sort_order,
          })
          .select("id")
          .single();
        if (!newGroup) continue;
        const { data: variants } = await supabase
          .from("menu_item_variants")
          .select("*")
          .eq("restaurant_id", restaurantId)
          .eq("variant_group_id", group.id);
        if (variants?.length) {
          await supabase.from("menu_item_variants").insert(
            variants.map((variant) => ({
              restaurant_id: restaurantId,
              variant_group_id: newGroup.id,
              name: variant.name,
              price_delta: variant.price_delta,
              sort_order: variant.sort_order,
            })),
          );
        }
      }
      for (const group of addonGroups ?? []) {
        const { data: newGroup } = await supabase
          .from("menu_item_addon_groups")
          .insert({
            restaurant_id: restaurantId,
            menu_item_id: newItem.id,
            name: group.name,
            max_selections: group.max_selections,
            sort_order: group.sort_order,
          })
          .select("id")
          .single();
        if (!newGroup) continue;
        const { data: addons } = await supabase
          .from("menu_item_addons")
          .select("*")
          .eq("restaurant_id", restaurantId)
          .eq("addon_group_id", group.id);
        if (addons?.length) {
          await supabase.from("menu_item_addons").insert(
            addons.map((addon) => ({
              restaurant_id: restaurantId,
              addon_group_id: newGroup.id,
              name: addon.name,
              price_delta: addon.price_delta,
              sort_order: addon.sort_order,
            })),
          );
        }
      }
    }
  }
  revalidatePath("/menus");
}
