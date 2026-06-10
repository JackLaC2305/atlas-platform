import QRCode from "qrcode";
import { notFound, redirect } from "next/navigation";

import { QrPrintCard } from "@/components/qr/qr-print-card";
import { createClient } from "@/lib/supabase/server";

type QrPrintPageProps = {
  params: Promise<{ qrLinkId: string }>;
};

type QrPrintData = {
  id: string;
  restaurant_id: string;
  menu_id: string | null;
  table_number: string | null;
  destination_type: "restaurant" | "menu";
  destination_url: string;
  restaurant_name: string;
  restaurant_logo_path: string | null;
};

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function debugQrPrint(step: string, details: Record<string, unknown>) {
  console.log("[QR_PRINT_DEBUG]", step, details);
}

async function createSignedLogoUrl(
  supabase: Awaited<ReturnType<typeof createClient>>,
  path: string | null,
) {
  if (!path) return null;

  const { data } = await supabase.storage.from("restaurant-assets").createSignedUrl(path, 60 * 30);
  return data?.signedUrl ?? null;
}

export default async function QrPrintPage({ params }: QrPrintPageProps) {
  const { qrLinkId } = await params;

  if (!isUuid(qrLinkId)) {
    debugQrPrint("not-found", { reason: "invalid qrLinkId param", qrLinkId });
    notFound();
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    debugQrPrint("redirect-login", { reason: "no authenticated user", qrLinkId });
    redirect("/login");
  }

  const { data, error } = await supabase.rpc("get_qr_print_card", {
    qr_link_id_input: qrLinkId,
  });

  const qrLink = Array.isArray(data) ? (data[0] as QrPrintData | undefined) : null;

  if (error || !qrLink) {
    debugQrPrint("not-found", {
      reason: error ? "rpc error" : "rpc returned no usable row",
      qrLinkId,
      dataLength: Array.isArray(data) ? data.length : data ? 1 : 0,
      errorCode: error?.code ?? null,
      errorMessage: error?.message ?? null,
    });
    notFound();
  }

  const [logoUrl, qrDataUrl] = await Promise.all([
    createSignedLogoUrl(supabase, qrLink.restaurant_logo_path),
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
      restaurantName={qrLink.restaurant_name}
      logoUrl={logoUrl}
      destinationUrl={qrLink.destination_url}
      tableNumber={qrLink.table_number}
      qrDataUrl={qrDataUrl}
    />
  );
}
