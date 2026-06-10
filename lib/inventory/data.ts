import type { AppRestaurantContext } from "@/lib/restaurants/context";
import { createClient } from "@/lib/supabase/server";

export { currencySymbol, formatInventoryStatus, formatQuantity } from "./format";

import type {
  AlertPreferences,
  InventoryData,
  InventoryIngredient,
  InventoryMenuItemOption,
  InventoryMenuLink,
  MenuIngredientOpportunity,
  SalesEntry,
  SalesEntryItem,
  StockMovement,
} from "./types";

type RawMenu = { id: string; name: string };
type RawMenuItem = { id: string; name: string; menu_id: string };
type RawMenuIngredient = {
  id: string;
  menu_item_id: string;
  ingredient_name: string;
  quantity: number | null;
  unit: string | null;
};

function buildMenuIngredientOpportunities({
  menuIngredients,
  menuItems,
  menus,
  links,
}: {
  menuIngredients: RawMenuIngredient[];
  menuItems: RawMenuItem[];
  menus: RawMenu[];
  links: InventoryMenuLink[];
}): MenuIngredientOpportunity[] {
  const itemById = new Map(menuItems.map((item) => [item.id, item]));
  const menuById = new Map(menus.map((menu) => [menu.id, menu]));
  const linkedIngredientIds = new Set(
    links.map((link) => link.menu_item_ingredient_id).filter((id): id is string => Boolean(id)),
  );

  return menuIngredients
    .filter((ingredient) => ingredient.ingredient_name.trim())
    .map((ingredient) => {
      const menuItem = itemById.get(ingredient.menu_item_id);
      const menu = menuItem ? menuById.get(menuItem.menu_id) : null;

      return {
        key: `${ingredient.ingredient_name.toLowerCase()}-${ingredient.unit ?? "unit"}`,
        menuItemIngredientId: ingredient.id,
        menuItemId: ingredient.menu_item_id,
        menuItemName: menuItem?.name ?? "Menu item",
        menuName: menu?.name ?? "Menu",
        ingredientName: ingredient.ingredient_name,
        quantity: ingredient.quantity,
        unit: ingredient.unit,
        alreadyLinked: linkedIngredientIds.has(ingredient.id),
      };
    });
}

export async function getInventoryData(context: AppRestaurantContext): Promise<InventoryData> {
  const supabase = await createClient();
  const restaurantId = context.restaurant.id;

  const [
    ingredientsResult,
    linksResult,
    movementsResult,
    salesEntriesResult,
    salesItemsResult,
    alertPrefsResult,
    menusResult,
    menuItemsResult,
    menuIngredientsResult,
  ] = await Promise.all([
    supabase.from("inventory_ingredients").select("*").eq("restaurant_id", restaurantId).order("name"),
    supabase.from("inventory_menu_links").select("*").eq("restaurant_id", restaurantId),
    supabase
      .from("inventory_stock_movements")
      .select("*")
      .eq("restaurant_id", restaurantId)
      .order("created_at", { ascending: false })
      .limit(25),
    supabase
      .from("inventory_sales_entries")
      .select("*")
      .eq("restaurant_id", restaurantId)
      .order("sales_date", { ascending: false })
      .limit(25),
    supabase
      .from("inventory_sales_entry_items")
      .select("*")
      .eq("restaurant_id", restaurantId)
      .order("created_at", { ascending: false })
      .limit(100),
    supabase.from("inventory_alert_preferences").select("*").eq("restaurant_id", restaurantId).maybeSingle(),
    supabase.from("menus").select("id, name").eq("restaurant_id", restaurantId).order("sort_order"),
    supabase.from("menu_items").select("id, name, menu_id").eq("restaurant_id", restaurantId).order("name"),
    supabase
      .from("menu_item_ingredients")
      .select("id, menu_item_id, ingredient_name, quantity, unit")
      .eq("restaurant_id", restaurantId)
      .order("ingredient_name"),
  ]);

  const ingredients = (ingredientsResult.data ?? []) as InventoryIngredient[];
  const rawLinks = (linksResult.data ?? []) as InventoryMenuLink[];
  const ingredientsById = new Map(ingredients.map((ingredient) => [ingredient.id, ingredient]));
  const links = rawLinks.map((link) => ({
    ...link,
    inventoryIngredient: ingredientsById.get(link.inventory_ingredient_id),
  }));
  const menus = (menusResult.data ?? []) as RawMenu[];
  const rawMenuItems = (menuItemsResult.data ?? []) as RawMenuItem[];
  const menuById = new Map(menus.map((menu) => [menu.id, menu]));
  const menuItems: InventoryMenuItemOption[] = rawMenuItems.map((item) => ({
    id: item.id,
    name: item.name,
    menuName: menuById.get(item.menu_id)?.name ?? "Menu",
  }));

  return {
    restaurant: context.restaurant,
    canManage: context.membership.role === "owner",
    ingredients,
    links,
    movements: (movementsResult.data ?? []) as StockMovement[],
    salesEntries: (salesEntriesResult.data ?? []) as SalesEntry[],
    salesItems: (salesItemsResult.data ?? []) as SalesEntryItem[],
    alertPreferences: (alertPrefsResult.data as AlertPreferences | null) ?? null,
    menuItems,
    menuIngredientOpportunities: buildMenuIngredientOpportunities({
      menuIngredients: (menuIngredientsResult.data ?? []) as RawMenuIngredient[],
      menuItems: rawMenuItems,
      menus,
      links,
    }),
  };
}
