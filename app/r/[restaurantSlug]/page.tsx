import { notFound } from "next/navigation";

import { PublicMenuView } from "@/components/public-menu/public-menu-view";
import { getPublicMenuPageData } from "@/lib/public-menu/data";

export default async function RestaurantPublicMenuPage({
  params,
  searchParams,
}: {
  params: Promise<{ restaurantSlug: string }>;
  searchParams: Promise<{ source?: string; table?: string }>;
}) {
  const { restaurantSlug } = await params;
  const query = await searchParams;
  const data = await getPublicMenuPageData(restaurantSlug);

  if (!data) {
    notFound();
  }

  return (
    <PublicMenuView
      data={data}
      source={query.source}
      tableNumber={query.table}
    />
  );
}
