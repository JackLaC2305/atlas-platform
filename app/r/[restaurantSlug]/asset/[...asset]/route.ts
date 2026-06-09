import { NextResponse, type NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";

function isUuid(value: string | undefined) {
  return Boolean(value?.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i));
}

export async function GET(
  request: NextRequest,
  {
    params,
  }: {
    params: Promise<{ restaurantSlug: string; asset: string[] }>;
  },
) {
  const { restaurantSlug, asset } = await params;
  const [kind, imageId] = asset;

  if (!["logo", "cover", "item"].includes(kind) || (kind === "item" && !isUuid(imageId))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const supabase = await createClient();
  const { data } = await supabase.rpc("get_public_menu_asset", {
    restaurant_slug_input: restaurantSlug,
    asset_kind_input: kind,
    image_id_input: kind === "item" ? imageId : null,
  });

  const assetData = data as { bucket?: "restaurant-assets" | "menu-item-images"; path?: string } | null;
  if (!assetData?.bucket || !assetData.path) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { data: signed } = await supabase.storage
    .from(assetData.bucket)
    .createSignedUrl(assetData.path, 60 * 10);

  if (!signed?.signedUrl) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.redirect(new URL(signed.signedUrl, request.url));
}
