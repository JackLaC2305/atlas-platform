"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

export type QrActionState = {
  status: "idle" | "success" | "error";
  message: string;
};

const initialOrigin = "http://localhost:3000";

function text(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function cleanTableNumber(value: string) {
  const cleaned = value.replace(/[^A-Za-z0-9_-]+/g, "").slice(0, 24);
  return cleaned || null;
}

async function getOrigin() {
  const headersList = await headers();
  const host = headersList.get("host");
  const protocol = headersList.get("x-forwarded-proto") ?? "http";

  return process.env.NEXT_PUBLIC_SITE_URL ?? (host ? `${protocol}://${host}` : initialOrigin);
}

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
    return { supabase, error: "Only restaurant owners can create QR links." };
  }

  return { supabase, error: null };
}

async function menuCanBeLinked(supabase: Awaited<ReturnType<typeof createClient>>, restaurantId: string, menuId: string) {
  const { data: menu } = await supabase
    .from("menus")
    .select("id, slug, status")
    .eq("restaurant_id", restaurantId)
    .eq("id", menuId)
    .eq("status", "published")
    .maybeSingle();

  if (!menu) return null;

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

  return categories?.length && items?.length ? menu : null;
}

export async function createQrLinkAction(
  _state: QrActionState,
  formData: FormData,
): Promise<QrActionState> {
  const restaurantId = text(formData, "restaurantId");
  const destinationType = text(formData, "destinationType");
  const menuId = text(formData, "menuId");
  const tableNumber = cleanTableNumber(text(formData, "tableNumber"));
  const restaurantSlug = text(formData, "restaurantSlug");
  const { supabase, error } = await requireOwner(restaurantId);

  if (error) return { status: "error", message: error };
  if (!["restaurant", "menu"].includes(destinationType)) {
    return { status: "error", message: "Select a valid QR destination." };
  }

  const origin = await getOrigin();
  const destinationUrl = new URL(
    destinationType === "restaurant" ? `/r/${restaurantSlug}` : `/r/${restaurantSlug}`,
    origin,
  );
  destinationUrl.searchParams.set("source", "qr");

  let linkedMenuId: string | null = null;
  if (destinationType === "menu") {
    if (!menuId) return { status: "error", message: "Select a published menu." };
    const menu = await menuCanBeLinked(supabase, restaurantId, menuId);
    if (!menu) {
      return { status: "error", message: "Only published menus with a visible category and item can be linked." };
    }
    linkedMenuId = menu.id;
    destinationUrl.pathname = `/r/${restaurantSlug}/${menu.slug}`;
  }

  if (tableNumber) {
    destinationUrl.searchParams.set("table", tableNumber);
  }

  const { error: insertError } = await supabase.from("qr_links").insert({
    restaurant_id: restaurantId,
    menu_id: linkedMenuId,
    table_number: tableNumber,
    destination_type: destinationType,
    destination_url: destinationUrl.toString(),
  });

  if (insertError) return { status: "error", message: insertError.message };

  revalidatePath("/qr-menu");
  revalidatePath("/dashboard");
  return { status: "success", message: "QR link created." };
}
