import { createClient } from "@/lib/supabase/server";

import type { PublicMenuPageData } from "./types";

export async function getPublicMenuPageData(
  restaurantSlug: string,
  menuSlug?: string,
): Promise<PublicMenuPageData | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_public_menu_page", {
    restaurant_slug_input: restaurantSlug,
    menu_slug_input: menuSlug ?? null,
  });

  if (error || !data) {
    return null;
  }

  const pageData = data as PublicMenuPageData;
  const logoUrl = pageData.restaurant.has_logo ? `/r/${pageData.restaurant.slug}/asset/logo` : null;
  const coverImageUrl = pageData.restaurant.has_cover ? `/r/${pageData.restaurant.slug}/asset/cover` : null;

  const menus = pageData.menus.map((menu) => ({
      ...menu,
      categories: menu.categories.map((category) => ({
          ...category,
          items: category.items.map((item) => ({
              ...item,
              images: item.images.map((image) => ({
                ...image,
                url: `/r/${pageData.restaurant.slug}/asset/item/${image.id}`,
              })),
            })),
        })),
    }));

  return {
    restaurant: {
      ...pageData.restaurant,
      logo_url: logoUrl,
      cover_image_url: coverImageUrl,
    },
    menus,
  };
}
