import type {
  Addon,
  AddonGroup,
  Ingredient,
  Menu,
  MenuCategory,
  MenuFull,
  MenuItem,
  MenuItemImage,
  MenuManagementData,
  Variant,
  VariantGroup,
} from "@/lib/menus/types";
import type { AppRestaurantContext } from "@/lib/restaurants/context";
import { createClient } from "@/lib/supabase/server";

async function signMenuItemImages(images: MenuItemImage[]) {
  const supabase = await createClient();

  return Promise.all(
    images.map(async (image) => {
      const { data } = await supabase.storage
        .from("menu-item-images")
        .createSignedUrl(image.image_path, 60 * 30);

      return { ...image, signed_url: data?.signedUrl ?? null };
    }),
  );
}

export async function getMenuManagementData(
  context: AppRestaurantContext,
): Promise<MenuManagementData> {
  const supabase = await createClient();
  const restaurantId = context.restaurant.id;

  const [
    menusResult,
    categoriesResult,
    itemsResult,
    imagesResult,
    variantGroupsResult,
    variantsResult,
    addonGroupsResult,
    addonsResult,
    ingredientsResult,
  ] = await Promise.all([
    supabase.from("menus").select("*").eq("restaurant_id", restaurantId).order("sort_order"),
    supabase
      .from("menu_categories")
      .select("*")
      .eq("restaurant_id", restaurantId)
      .order("sort_order"),
    supabase.from("menu_items").select("*").eq("restaurant_id", restaurantId).order("sort_order"),
    supabase
      .from("menu_item_images")
      .select("*")
      .eq("restaurant_id", restaurantId)
      .order("sort_order"),
    supabase
      .from("menu_item_variant_groups")
      .select("*")
      .eq("restaurant_id", restaurantId)
      .order("sort_order"),
    supabase
      .from("menu_item_variants")
      .select("*")
      .eq("restaurant_id", restaurantId)
      .order("sort_order"),
    supabase
      .from("menu_item_addon_groups")
      .select("*")
      .eq("restaurant_id", restaurantId)
      .order("sort_order"),
    supabase.from("menu_item_addons").select("*").eq("restaurant_id", restaurantId).order("sort_order"),
    supabase
      .from("menu_item_ingredients")
      .select("*")
      .eq("restaurant_id", restaurantId)
      .order("sort_order"),
  ]);

  const menus = (menusResult.data ?? []) as Menu[];
  const categories = (categoriesResult.data ?? []) as MenuCategory[];
  const items = (itemsResult.data ?? []) as MenuItem[];
  const images = await signMenuItemImages((imagesResult.data ?? []) as MenuItemImage[]);
  const variantGroups = (variantGroupsResult.data ?? []) as Omit<VariantGroup, "variants">[];
  const variants = (variantsResult.data ?? []) as Variant[];
  const addonGroups = (addonGroupsResult.data ?? []) as Omit<AddonGroup, "addons">[];
  const addons = (addonsResult.data ?? []) as Addon[];
  const ingredients = (ingredientsResult.data ?? []) as Ingredient[];

  const fullMenus: MenuFull[] = menus.map((menu) => ({
    ...menu,
    categories: categories
      .filter((category) => category.menu_id === menu.id)
      .map((category) => ({
        ...category,
        items: items
          .filter((item) => item.category_id === category.id)
          .map((item) => ({
            ...item,
            images: images.filter((image) => image.menu_item_id === item.id),
            variantGroups: variantGroups
              .filter((group) => group.menu_item_id === item.id)
              .map((group) => ({
                ...group,
                variants: variants.filter((variant) => variant.variant_group_id === group.id),
              })),
            addonGroups: addonGroups
              .filter((group) => group.menu_item_id === item.id)
              .map((group) => ({
                ...group,
                addons: addons.filter((addon) => addon.addon_group_id === group.id),
              })),
            ingredients: ingredients.filter((ingredient) => ingredient.menu_item_id === item.id),
          })),
      })),
  }));

  return {
    restaurant: context.restaurant,
    logoUrl: context.logoUrl,
    menus: fullMenus,
    canManage: context.membership.role === "owner",
  };
}
