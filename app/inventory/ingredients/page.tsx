import { AuthenticatedNav } from "@/components/app/authenticated-nav";
import { InventoryIngredients } from "@/components/inventory/inventory-ingredients";
import { InventoryNav } from "@/components/inventory/inventory-shared";
import { getInventoryData } from "@/lib/inventory/data";
import { getAppRestaurantContext } from "@/lib/restaurants/context";

export default async function InventoryIngredientsPage({
  searchParams,
}: {
  searchParams?: Promise<{ status?: string }>;
}) {
  const context = await getAppRestaurantContext();
  const data = await getInventoryData(context);
  const params = await searchParams;

  return (
    <main className="min-h-screen bg-[#FBFAF7] text-[#0F172A]">
      <AuthenticatedNav
        restaurants={context.restaurants}
        currentRestaurantId={context.restaurant.id}
        userName={context.user.displayName}
        userEmail={context.user.email}
      />
      <section className="mx-auto max-w-7xl px-5 py-8 sm:px-8 lg:px-10 lg:py-10">
        <InventoryNav />
        <div className="mt-6" />
        <InventoryIngredients data={data} initialStatus={params?.status} />
      </section>
    </main>
  );
}
