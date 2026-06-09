import Link from "next/link";

import { AuthenticatedNav } from "@/components/app/authenticated-nav";
import { RestaurantLogo } from "@/components/app/restaurant-logo";
import { AtlasLogoMark } from "@/components/brand/atlas-logo";
import { getAppRestaurantContext } from "@/lib/restaurants/context";
import { createClient } from "@/lib/supabase/server";

type SetupItem = {
  label: string;
  completed: boolean;
  progressValue: number;
  status: "Complete" | "Ready to Configure" | "In Progress" | "Not Started";
  href: string;
};

function StatusPill({ status }: { status: SetupItem["status"] }) {
  const classes = {
    Complete: "bg-emerald-50 text-emerald-700",
    "Ready to Configure": "bg-[#D4A017]/10 text-[#8A6811]",
    "In Progress": "bg-[#D4A017]/10 text-[#8A6811]",
    "Not Started": "bg-slate-100 text-slate-600",
  }[status];

  return <span className={`rounded-sm px-2.5 py-1 text-xs font-semibold ${classes}`}>{status}</span>;
}

function buildSetupItems({
  onboardingCompleted,
  brandingCompleted,
  openingHoursCompleted,
  menuSetupState,
}: {
  onboardingCompleted: boolean;
  brandingCompleted: boolean;
  openingHoursCompleted: boolean;
  menuSetupState: "not-started" | "in-progress" | "complete";
}): SetupItem[] {
  const menuSetupCompleted = menuSetupState === "complete";
  const menuSetupInProgress = menuSetupState === "in-progress";

  return [
    {
      label: "Restaurant Profile",
      completed: onboardingCompleted,
      progressValue: onboardingCompleted ? 1 : 0,
      status: onboardingCompleted ? "Complete" : "Ready to Configure",
      href: "/settings/restaurant",
    },
    {
      label: "Branding",
      completed: brandingCompleted,
      progressValue: brandingCompleted ? 1 : 0,
      status: brandingCompleted ? "Complete" : "Ready to Configure",
      href: "/settings/restaurant",
    },
    {
      label: "Opening Hours",
      completed: openingHoursCompleted,
      progressValue: openingHoursCompleted ? 1 : 0,
      status: openingHoursCompleted ? "Complete" : "Ready to Configure",
      href: "/settings/restaurant",
    },
    {
      label: "Menu Setup",
      completed: menuSetupCompleted,
      progressValue: menuSetupCompleted ? 1 : menuSetupInProgress ? 0.5 : 0,
      status: menuSetupCompleted ? "Complete" : menuSetupInProgress ? "In Progress" : "Not Started",
      href: "/menus",
    },
    { label: "QR Menu", completed: false, progressValue: 0, status: menuSetupCompleted ? "Ready to Configure" : "Not Started", href: "/qr-menu" },
    { label: "Inventory", completed: false, progressValue: 0, status: "Not Started", href: "/inventory" },
    { label: "Analytics", completed: false, progressValue: 0, status: "Not Started", href: "/analytics" },
    { label: "Billing", completed: false, progressValue: 0, status: "Not Started", href: "/billing" },
  ];
}

export default async function DashboardPage() {
  const { user, membership, restaurant, restaurants, logoUrl } = await getAppRestaurantContext();
  const supabase = await createClient();

  const openingHoursCompleted =
    restaurant.opening_hours?.days?.length === 7 &&
    restaurant.opening_hours.days.some((day) => !day.closed);
  const brandingCompleted = Boolean(restaurant.logo_path && restaurant.primary_colour);
  const { data: menus } = await supabase
    .from("menus")
    .select("id, status")
    .eq("restaurant_id", restaurant.id);
  const menuCount = menus?.length ?? 0;
  const publishedMenuIds = (menus ?? [])
    .filter((menu) => menu.status === "published")
    .map((menu) => menu.id);
  const [{ data: visibleCategories }, { data: menuItems }] =
    publishedMenuIds.length > 0
      ? await Promise.all([
          supabase
            .from("menu_categories")
            .select("id, menu_id")
            .eq("restaurant_id", restaurant.id)
            .in("menu_id", publishedMenuIds)
            .eq("is_visible", true),
          supabase
            .from("menu_items")
            .select("id, menu_id")
            .eq("restaurant_id", restaurant.id)
            .in("menu_id", publishedMenuIds),
        ])
      : [{ data: [] }, { data: [] }];
  const menuSetupCompleted = publishedMenuIds.some(
    (menuId) =>
      visibleCategories?.some((category) => category.menu_id === menuId) &&
      menuItems?.some((item) => item.menu_id === menuId),
  );
  const menuSetupState =
    menuSetupCompleted ? "complete" : menuCount > 0 ? "in-progress" : "not-started";
  const setupItems = buildSetupItems({
    onboardingCompleted: restaurant.onboarding_completed,
    brandingCompleted,
    openingHoursCompleted,
    menuSetupState,
  });
  const completedCount = setupItems.filter((item) => item.completed).length;
  const inProgressCount = setupItems.filter((item) => item.status === "In Progress").length;
  const progressUnits = setupItems.reduce((sum, item) => sum + item.progressValue, 0);
  const progressPercent = Math.round((progressUnits / setupItems.length) * 100);
  const nextStep =
    menuSetupState === "complete"
      ? {
          title: "QR Menu",
          status: "Ready to Configure" as const,
          detail: "Generate customer-facing QR menus once the QR Menu module is available.",
        }
      : menuSetupState === "in-progress"
        ? {
            title: "Menu Management",
            status: "In Progress" as const,
            detail: "Menus have been created, but no live menu is currently published. Publish a menu when ready.",
          }
        : {
            title: "Menu Management",
            status: "Ready to Configure" as const,
            detail: "Create your first menu, then add categories and items before generating QR menus.",
          };

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
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <AtlasLogoMark tone="dark" />
              <p className="mt-7 text-sm font-medium text-[#D4A017]">
                Atlas by Martello Hospitality
              </p>
              <h1 className="mt-3 text-4xl font-semibold leading-tight">
                Welcome, {user.displayName}.
              </h1>
              <p className="mt-5 text-lg leading-8 text-slate-300">
                Your restaurant workspace is ready.{" "}
                {menuSetupState === "complete"
                  ? "Continue with QR Menu when that module is enabled."
                  : menuSetupState === "in-progress"
                    ? "Continue refining Menu Management and publish a menu when ready."
                  : "Continue setup with Menu Management before opening customer-facing QR menus."}
              </p>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-400">
                Your restaurant profile is complete. The dashboard will become fully
                operational as each Atlas module is configured.
              </p>
            </div>

            <div className="rounded-sm bg-white/[0.06] p-5 ring-1 ring-white/15 lg:w-80">
              <p className="text-sm font-semibold text-slate-300">Atlas Setup Progress</p>
              <div className="mt-4 flex items-end justify-between gap-4">
                <p className="text-4xl font-semibold">{progressPercent}%</p>
                <p className="text-sm font-medium text-slate-300">
                  {completedCount}/{setupItems.length} complete
                  {inProgressCount ? ` · ${inProgressCount} in progress` : ""}
                </p>
              </div>
              <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/15">
                <div className="h-full bg-[#D4A017]" style={{ width: `${progressPercent}%` }} />
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
          <section className="rounded-sm bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:p-7">
            <p className="text-sm font-semibold text-[#9A7412]">Current Restaurant</p>
            <div className="mt-5 flex items-start gap-4">
              <RestaurantLogo name={restaurant.name} logoUrl={logoUrl} size="lg" />
              <div className="min-w-0">
                <h2 className="text-3xl font-semibold">{restaurant.name}</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">{restaurant.description}</p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-sm bg-[#FBFAF7] p-3 ring-1 ring-slate-200">
                    <p className="text-xs font-semibold text-slate-500">Role</p>
                    <p className="mt-1 text-sm font-semibold capitalize text-[#0F172A]">
                      {membership.role}
                    </p>
                  </div>
                  <div className="rounded-sm bg-[#FBFAF7] p-3 ring-1 ring-slate-200">
                    <p className="text-xs font-semibold text-slate-500">Public Path</p>
                    <p className="mt-1 text-sm font-semibold text-[#0F172A]">/r/{restaurant.slug}</p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-sm bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:p-7">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-[#9A7412]">Next Recommended Step</p>
                <h2 className="mt-2 text-3xl font-semibold">{nextStep.title}</h2>
              </div>
              <StatusPill status={nextStep.status} />
            </div>
            <p className="mt-5 max-w-2xl text-sm leading-6 text-slate-600">
              {nextStep.detail}
            </p>
            <div className="mt-6 rounded-sm bg-[#FBFAF7] p-4 text-sm leading-6 text-slate-600 ring-1 ring-slate-200">
              {menuSetupState === "in-progress"
                ? "Menus have been created, but no live menu is currently published."
                : "The dashboard will become fully operational as each Atlas module is configured."}
            </div>
          </section>
        </div>

        <section className="mt-6 rounded-sm bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:p-7">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-[#9A7412]">Product Readiness</p>
              <h2 className="mt-2 text-2xl font-semibold">Atlas Setup Progress</h2>
            </div>
            <p className="text-sm font-medium text-slate-500">
              {completedCount}/{setupItems.length} complete
              {inProgressCount ? ` · ${inProgressCount} in progress` : ""}
            </p>
          </div>

          <div className="mt-5 h-2 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full bg-[#D4A017]" style={{ width: `${progressPercent}%` }} />
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {setupItems.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="rounded-sm border border-slate-200 bg-[#FBFAF7] p-4 transition hover:border-[#D4A017] hover:bg-white focus:outline-none focus:ring-2 focus:ring-[#D4A017]/30"
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-semibold text-[#0F172A]">{item.label}</p>
                  <StatusPill status={item.status} />
                </div>
              </Link>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}
