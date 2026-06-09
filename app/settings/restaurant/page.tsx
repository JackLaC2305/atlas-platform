import { AuthenticatedNav } from "@/components/app/authenticated-nav";
import { RestaurantLogo } from "@/components/app/restaurant-logo";
import { RestaurantSettingsForm } from "@/components/app/restaurant-settings-form";
import { getAppRestaurantContext } from "@/lib/restaurants/context";

export default async function RestaurantSettingsPage() {
  const { user, membership, restaurant, restaurants, logoUrl, coverImageUrl } =
    await getAppRestaurantContext();

  return (
    <main className="min-h-screen bg-[#FBFAF7] text-[#0F172A]">
      <AuthenticatedNav
        restaurants={restaurants}
        currentRestaurantId={restaurant.id}
        userName={user.displayName}
        userEmail={user.email}
      />

      <section className="mx-auto max-w-7xl px-5 py-8 sm:px-8 lg:px-10 lg:py-10">
        <div className="rounded-sm bg-[#0F172A] p-7 text-white shadow-sm sm:p-9">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
              <RestaurantLogo name={restaurant.name} logoUrl={logoUrl} size="lg" />
              <div>
                <p className="text-sm font-medium text-[#D4A017]">Restaurant Settings</p>
                <h1 className="mt-2 text-4xl font-semibold leading-tight">{restaurant.name}</h1>
                <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-300">
                  Edit the restaurant profile created during onboarding. Dashboard and
                  future modules use this profile as their source of truth.
                </p>
              </div>
            </div>
            <span className="w-fit rounded-sm bg-white/[0.08] px-3 py-2 text-xs font-semibold text-slate-300 ring-1 ring-white/15">
              Role: {membership.role}
            </span>
          </div>
        </div>

        <div className="mt-6">
          <RestaurantSettingsForm
            restaurant={restaurant}
            logoUrl={logoUrl}
            coverImageUrl={coverImageUrl}
          />
        </div>
      </section>
    </main>
  );
}
