import { notFound } from "next/navigation";

import { PublicMenuView } from "@/components/public-menu/public-menu-view";
import { getPublicMenuPageData } from "@/lib/public-menu/data";

export default async function PublicMenuSpecificPage({
  params,
  searchParams,
}: {
  params: Promise<{ restaurantSlug: string; menuSlug: string }>;
  searchParams: Promise<{ source?: string; table?: string }>;
}) {
  const { restaurantSlug, menuSlug } = await params;
  const query = await searchParams;
  const data = await getPublicMenuPageData(restaurantSlug, menuSlug);

  if (!data) {
    notFound();
  }

  return (
    <PublicMenuView
      data={data}
      initialMenuSlug={menuSlug}
      source={query.source}
      tableNumber={query.table}
    />
  );
}
