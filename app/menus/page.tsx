import { AuthenticatedNav } from "@/components/app/authenticated-nav";
import { MenuManagement } from "@/components/menus/menu-management";
import { getMenuManagementData } from "@/lib/menus/data";
import { getAppRestaurantContext } from "@/lib/restaurants/context";

export default async function MenusPage({
  searchParams,
}: {
  searchParams: Promise<{ menuError?: string }>;
}) {
  const context = await getAppRestaurantContext();
  const data = await getMenuManagementData(context);
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
        <MenuManagement data={data} notice={params.menuError ? { status: "error", message: params.menuError } : undefined} />
      </section>
    </main>
  );
}
