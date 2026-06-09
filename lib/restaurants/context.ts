import { redirect } from "next/navigation";

import type { RestaurantSummary } from "@/lib/onboarding/types";
import { createClient } from "@/lib/supabase/server";

export type RestaurantMembership = {
  restaurant_id: string;
  role: string;
};

export type RestaurantOption = {
  id: string;
  name: string;
  slug: string;
};

export type AppRestaurantContext = {
  user: {
    id: string;
    email: string;
    displayName: string;
  };
  membership: RestaurantMembership;
  memberships: RestaurantMembership[];
  restaurant: RestaurantSummary;
  restaurants: RestaurantOption[];
  logoUrl: string | null;
  coverImageUrl: string | null;
};

async function createSignedAssetUrl(bucket: "restaurant-assets" | "menu-imports", path: string | null) {
  if (!path) {
    return null;
  }

  const supabase = await createClient();
  const { data } = await supabase.storage.from(bucket).createSignedUrl(path, 60 * 30);
  return data?.signedUrl ?? null;
}

export async function getAppRestaurantContext(): Promise<AppRestaurantContext> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: memberships } = await supabase
    .from("restaurant_members")
    .select("restaurant_id, role")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  if (!memberships || memberships.length === 0) {
    redirect("/onboarding");
  }

  const restaurantIds = memberships.map((membership) => membership.restaurant_id);
  const { data: restaurants } = await supabase
    .from("restaurants")
    .select("*")
    .in("id", restaurantIds)
    .order("created_at", { ascending: true })
    .returns<RestaurantSummary[]>();

  if (!restaurants || restaurants.length === 0) {
    redirect("/onboarding");
  }

  const restaurant = restaurants[0];
  const membership = memberships.find((item) => item.restaurant_id === restaurant.id) ?? memberships[0];
  const displayName =
    typeof user.user_metadata.full_name === "string" && user.user_metadata.full_name
      ? user.user_metadata.full_name
      : user.email ?? "Atlas user";

  return {
    user: {
      id: user.id,
      email: user.email ?? "",
      displayName,
    },
    membership,
    memberships,
    restaurant,
    restaurants: restaurants.map((item) => ({
      id: item.id,
      name: item.name,
      slug: item.slug,
    })),
    logoUrl: await createSignedAssetUrl("restaurant-assets", restaurant.logo_path),
    coverImageUrl: await createSignedAssetUrl("restaurant-assets", restaurant.cover_image_path),
  };
}

export function titleCase(value: string) {
  return value
    .replaceAll("_", " ")
    .split(" ")
    .map((word) => (word ? `${word[0].toUpperCase()}${word.slice(1)}` : word))
    .join(" ")
    .replaceAll("Pdf", "PDF")
    .replaceAll("Pos", "POS");
}

export function formatOpeningHoursMode(value: string) {
  return titleCase(value);
}
