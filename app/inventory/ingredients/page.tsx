import { AuthenticatedNav } from "@/components/app/authenticated-nav";
import { InventoryIngredients } from "@/components/inventory/inventory-ingredients";
import { getInventoryData } from "@/lib/inventory/data";
import { getAppRestaurantContext } from "@/lib/restaurants/context";

export default async function InventoryIngredientsPage() {
  const context = await getAppRestaurantContext();
  const data = await getInventoryData(context);

  return (
    <main className="min-h-screen bg-[#FBFAF7] text-[#0F172A]">
      <AuthenticatedNav
        restaurants={context.restaurants}
        currentRestaurantId={context.restaurant.id}
        userName={context.user.displayName}
        userEmail={context.user.email}
      />
      <section className="mx-auto max-w-7xl px-5 py-8 sm:px-8 lg:px-10 lg:py-10">
        <InventoryIngredients data={data} />
      </section>
    </main>
  );
}
