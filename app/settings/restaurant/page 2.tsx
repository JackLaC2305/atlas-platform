import { AuthenticatedNav } from "@/components/app/authenticated-nav";
import { RestaurantLogo } from "@/components/app/restaurant-logo";
import { getAppRestaurantContext, titleCase } from "@/lib/restaurants/context";

function DetailSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-sm bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:p-7">
      <h2 className="text-2xl font-semibold text-[#0F172A]">{title}</h2>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">{children}</div>
    </section>
  );
}

function DetailItem({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="rounded-sm bg-[#FBFAF7] p-4 ring-1 ring-slate-200">
      <p className="text-xs font-semibold text-slate-500">{label}</p>
      <p className="mt-1 break-words text-sm font-medium leading-6 text-[#0F172A]">
        {value || "Not Provided"}
      </p>
    </div>
  );
}

function formatAddress(restaurant: Awaited<ReturnType<typeof getAppRestaurantContext>>["restaurant"]) {
  return [
    restaurant.address_line_1,
    restaurant.address_line_2,
    restaurant.city,
    restaurant.county_or_state,
    restaurant.postcode,
    restaurant.country,
  ]
    .filter(Boolean)
    .join(", ");
}

function formatOpeningHours(
  hours: Awaited<ReturnType<typeof getAppRestaurantContext>>["restaurant"]["opening_hours"],
) {
  if (!hours?.days?.length) {
    return "Not Provided";
  }

  return hours.days
    .map((day) => `${day.day}: ${day.closed ? "Closed" : `${day.open}-${day.close}`}`)
    .join(" | ");
}

export default async function RestaurantSettingsPage() {
  const { user, restaurant, restaurants, logoUrl, coverImageUrl } = await getAppRestaurantContext();

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
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            <RestaurantLogo name={restaurant.name} logoUrl={logoUrl} size="lg" />
            <div>
              <p className="text-sm font-medium text-[#D4A017]">Restaurant Settings</p>
              <h1 className="mt-2 text-4xl font-semibold leading-tight">{restaurant.name}</h1>
              <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-300">
                Review the restaurant profile created during onboarding. Editing will be
                introduced in a future settings refinement.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-6">
          <DetailSection title="Business Details">
            <DetailItem label="Restaurant Name" value={restaurant.name} />
            <DetailItem label="Public Path" value={`/r/${restaurant.slug}`} />
            <DetailItem label="Restaurant Type" value={restaurant.restaurant_type} />
            <DetailItem label="Cuisine Type" value={restaurant.cuisine_type} />
            <div className="sm:col-span-2">
              <DetailItem label="Description" value={restaurant.description} />
            </div>
          </DetailSection>

          <DetailSection title="Contact Details">
            <DetailItem label="Business Email" value={restaurant.business_email} />
            <DetailItem label="Phone" value={restaurant.phone} />
            <DetailItem label="Website" value={restaurant.website} />
            <div className="sm:col-span-2">
              <DetailItem label="Address" value={formatAddress(restaurant)} />
            </div>
          </DetailSection>

          <DetailSection title="Social Links">
            <DetailItem label="Instagram" value={restaurant.instagram_url} />
            <DetailItem label="Facebook" value={restaurant.facebook_url} />
            <DetailItem label="TikTok" value={restaurant.tiktok_url} />
            <DetailItem label="X/Twitter" value={restaurant.x_url} />
            <DetailItem label="LinkedIn" value={restaurant.linkedin_url} />
          </DetailSection>

          <DetailSection title="Operations">
            <DetailItem label="Locations" value={restaurant.location_count_range} />
            <DetailItem label="Seating Capacity" value={restaurant.seating_capacity_range} />
            <DetailItem label="Currency" value={restaurant.currency} />
            <DetailItem label="Timezone" value={restaurant.timezone} />
            <div className="sm:col-span-2">
              <DetailItem label="Opening Hours" value={formatOpeningHours(restaurant.opening_hours)} />
            </div>
          </DetailSection>

          <DetailSection title="Branding">
            <div className="rounded-sm bg-[#FBFAF7] p-4 ring-1 ring-slate-200">
              <p className="text-xs font-semibold text-slate-500">Logo</p>
              <div className="mt-3">
                <RestaurantLogo name={restaurant.name} logoUrl={logoUrl} size="md" />
              </div>
            </div>
            <div className="rounded-sm bg-[#FBFAF7] p-4 ring-1 ring-slate-200">
              <p className="text-xs font-semibold text-slate-500">Cover Image</p>
              {coverImageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={coverImageUrl}
                  alt={`${restaurant.name} cover`}
                  className="mt-3 h-32 w-full rounded-sm object-cover"
                />
              ) : (
                <p className="mt-3 text-sm font-medium text-slate-500">Not Provided</p>
              )}
            </div>
            <DetailItem label="Primary Colour" value={restaurant.primary_colour} />
            <DetailItem label="Secondary Colour" value={restaurant.secondary_colour} />
          </DetailSection>

          <DetailSection title="Business Intelligence">
            <DetailItem label="Menu Setup Method" value={titleCase(restaurant.menu_setup_method)} />
            <DetailItem label="Existing Menu Source" value={restaurant.existing_menu_source} />
            <DetailItem label="Approximate Menu Items" value={restaurant.approximate_menu_items_range} />
            <DetailItem label="Primary Objective" value={restaurant.primary_objective} />
            <DetailItem label="Average Weekly Covers" value={restaurant.average_weekly_covers} />
            <DetailItem label="Menu Update Frequency" value={restaurant.menu_update_frequency} />
            <DetailItem label="Current Inventory Method" value={restaurant.inventory_method} />
            <DetailItem label="Current POS Provider" value={restaurant.pos_provider} />
            <DetailItem label="Average Transaction Value" value={restaurant.average_transaction_value} />
            <div className="sm:col-span-2">
              <DetailItem
                label="Main Operational Pain Point"
                value={restaurant.main_operational_pain_point}
              />
            </div>
          </DetailSection>
        </div>
      </section>
    </main>
  );
}
