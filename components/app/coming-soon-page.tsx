import Link from "next/link";

import { AuthenticatedNav } from "@/components/app/authenticated-nav";
import { AtlasLogoMark } from "@/components/brand/atlas-logo";
import { getAppRestaurantContext } from "@/lib/restaurants/context";

export async function ComingSoonPage({
  moduleName,
  description,
}: {
  moduleName: string;
  description: string;
}) {
  const { user, restaurant, restaurants } = await getAppRestaurantContext();

  return (
    <main className="min-h-screen bg-[#FBFAF7] text-[#0F172A]">
      <AuthenticatedNav
        restaurants={restaurants}
        currentRestaurantId={restaurant.id}
        userName={user.displayName}
        userEmail={user.email}
      />

      <section className="mx-auto max-w-5xl px-5 py-10 sm:px-8 lg:px-10 lg:py-14">
        <div className="rounded-sm bg-white p-7 shadow-sm ring-1 ring-slate-200 sm:p-10">
          <AtlasLogoMark />
          <p className="mt-8 text-sm font-semibold text-[#9A7412]">Coming Soon</p>
          <h1 className="mt-3 text-4xl font-semibold leading-tight">{moduleName}</h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-slate-600">{description}</p>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-500">
            This page is a protected placeholder. The module has not been built yet.
          </p>
          <Link
            href="/dashboard"
            className="mt-8 inline-flex min-h-11 items-center justify-center rounded-sm bg-[#0F172A] px-5 text-sm font-semibold text-white transition hover:bg-[#1E293B] focus:outline-none focus:ring-2 focus:ring-[#0F172A] focus:ring-offset-2"
          >
            Back to Dashboard
          </Link>
        </div>
      </section>
    </main>
  );
}
