import QRCode from "qrcode";
import { notFound, redirect } from "next/navigation";

import { QrPrintCard } from "@/components/qr/qr-print-card";
import { createClient } from "@/lib/supabase/server";

type QrPrintPageProps = {
  params: Promise<{ qrLinkId: string }>;
};

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

async function createSignedLogoUrl(path: string | null) {
  if (!path) return null;

  const supabase = await createClient();
  const { data } = await supabase.storage.from("restaurant-assets").createSignedUrl(path, 60 * 30);
  return data?.signedUrl ?? null;
}

export default async function QrPrintPage({ params }: QrPrintPageProps) {
  const { qrLinkId } = await params;
  if (!isUuid(qrLinkId)) {
    notFound();
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: qrLink } = await supabase
    .from("qr_links")
    .select("id, restaurant_id, table_number, destination_url")
    .eq("id", qrLinkId)
    .maybeSingle();

  if (!qrLink) {
    notFound();
  }

  const { data: membership } = await supabase
    .from("restaurant_members")
    .select("role")
    .eq("restaurant_id", qrLink.restaurant_id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership) {
    notFound();
  }

  const { data: restaurant } = await supabase
    .from("restaurants")
    .select("name, logo_path")
    .eq("id", qrLink.restaurant_id)
    .maybeSingle();

  if (!restaurant) {
    notFound();
  }

  const [logoUrl, qrDataUrl] = await Promise.all([
    createSignedLogoUrl(restaurant.logo_path),
    QRCode.toDataURL(qrLink.destination_url, {
      margin: 2,
      width: 720,
      color: {
        dark: "#0F172A",
        light: "#FFFFFF",
      },
      errorCorrectionLevel: "M",
    }),
  ]);

  return (
    <QrPrintCard
      restaurantName={restaurant.name}
      logoUrl={logoUrl}
      destinationUrl={qrLink.destination_url}
      tableNumber={qrLink.table_number}
      qrDataUrl={qrDataUrl}
    />
  );
}
