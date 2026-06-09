import { NextResponse, type NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";

const eventTypes = ["restaurant_page_view", "menu_page_view", "item_detail_click"] as const;

function cleanUuid(value: unknown) {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
    ? value
    : null;
}

function cleanText(value: unknown, maxLength: number) {
  if (typeof value !== "string") return null;
  const cleaned = value.trim().slice(0, maxLength);
  return cleaned || null;
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const payload = body as Record<string, unknown>;
  const eventType = typeof payload.eventType === "string" && eventTypes.includes(payload.eventType as never)
    ? payload.eventType
    : null;
  const restaurantId = cleanUuid(payload.restaurantId);

  if (!eventType || !restaurantId) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const supabase = await createClient();
  const { data } = await supabase.rpc("record_public_menu_event", {
    target_restaurant_id: restaurantId,
    target_menu_id: cleanUuid(payload.menuId),
    target_menu_item_id: cleanUuid(payload.menuItemId),
    target_event_type: eventType,
    raw_source: cleanText(payload.source, 60),
    raw_table_number: cleanText(payload.tableNumber, 24),
    raw_user_agent: cleanText(request.headers.get("user-agent"), 500),
  });

  return NextResponse.json({ ok: Boolean(data) }, { status: data ? 201 : 202 });
}
