import { headers } from "next/headers";

import type { AppRestaurantContext } from "@/lib/restaurants/context";
import { createClient } from "@/lib/supabase/server";

import type { QrLink, QrManagementData, QrMenuOption } from "./types";

async function getOrigin() {
  const headersList = await headers();
  const host = headersList.get("host");
  const protocol = headersList.get("x-forwarded-proto") ?? "http";

  return process.env.NEXT_PUBLIC_SITE_URL ?? (host ? `${protocol}://${host}` : "http://localhost:3000");
}

export async function getQrManagementData(
  context: AppRestaurantContext,
): Promise<QrManagementData> {
  const supabase = await createClient();
  const restaurantId = context.restaurant.id;

  const [{ data: menus }, { data: qrLinks }] = await Promise.all([
    supabase
      .from("menus")
      .select("id, name, slug")
      .eq("restaurant_id", restaurantId)
      .eq("status", "published")
      .order("sort_order"),
    supabase
      .from("qr_links")
      .select("*")
      .eq("restaurant_id", restaurantId)
      .order("created_at", { ascending: false }),
  ]);

  const publishedMenus = await Promise.all(
    ((menus ?? []) as QrMenuOption[]).map(async (menu) => {
      const [{ data: categories }, { data: items }] = await Promise.all([
        supabase
          .from("menu_categories")
          .select("id")
          .eq("restaurant_id", restaurantId)
          .eq("menu_id", menu.id)
          .eq("is_visible", true)
          .limit(1),
        supabase
          .from("menu_items")
          .select("id")
          .eq("restaurant_id", restaurantId)
          .eq("menu_id", menu.id)
          .limit(1),
      ]);

      return categories?.length && items?.length ? menu : null;
    }),
  );

  return {
    restaurant: {
      id: context.restaurant.id,
      name: context.restaurant.name,
      slug: context.restaurant.slug,
    },
    logoUrl: context.logoUrl,
    canManage: context.membership.role === "owner",
    origin: await getOrigin(),
    publishedMenus: publishedMenus.filter((menu): menu is QrMenuOption => Boolean(menu)),
    qrLinks: (qrLinks ?? []) as QrLink[],
  };
}
