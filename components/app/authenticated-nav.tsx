"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { logoutAction } from "@/app/(auth)/actions";
import { AtlasNavbarLogo } from "@/components/brand/atlas-logo";

type RestaurantOption = {
  id: string;
  name: string;
};

export function AuthenticatedNav({
  restaurants,
  currentRestaurantId,
  userName,
  userEmail,
}: {
  restaurants: RestaurantOption[];
  currentRestaurantId: string;
  userName: string;
  userEmail: string;
}) {
  const [restaurantOpen, setRestaurantOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const restaurantRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);
  const currentRestaurant =
    restaurants.find((restaurant) => restaurant.id === currentRestaurantId) ?? restaurants[0];

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      const target = event.target as Node;

      if (restaurantRef.current && !restaurantRef.current.contains(target)) {
        setRestaurantOpen(false);
      }

      if (userRef.current && !userRef.current.contains(target)) {
        setUserOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setRestaurantOpen(false);
        setUserOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  return (
    <header className="border-b border-slate-200 bg-white">
      <nav className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-4 sm:px-8 lg:flex-row lg:items-center lg:justify-between lg:px-10">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between lg:justify-start">
          <Link href="/dashboard" className="inline-flex w-fit">
            <AtlasNavbarLogo />
          </Link>
          <div className="flex flex-wrap items-center gap-2 text-sm font-semibold text-slate-600">
            <Link
              href="/dashboard"
              className="rounded-sm px-3 py-2 transition hover:bg-[#FBFAF7] hover:text-[#0F172A]"
            >
              Dashboard
            </Link>
            <Link
              href="/settings/restaurant"
              className="rounded-sm px-3 py-2 transition hover:bg-[#FBFAF7] hover:text-[#0F172A]"
            >
              Restaurant Settings
            </Link>
            <a
              href="mailto:support@martellohospitality.com"
              className="rounded-sm px-3 py-2 transition hover:bg-[#FBFAF7] hover:text-[#0F172A]"
            >
              Support
            </a>
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
          <div ref={restaurantRef} className="relative">
            <p className="text-xs font-semibold text-slate-500">Current Restaurant</p>
            <button
              type="button"
              aria-expanded={restaurantOpen}
              aria-haspopup="menu"
              onClick={() => {
                setRestaurantOpen((open) => !open);
                setUserOpen(false);
              }}
              className="mt-1 flex min-h-10 w-full items-center justify-between gap-3 rounded-sm border border-slate-200 bg-[#FBFAF7] px-3 text-left text-sm font-semibold text-[#0F172A] sm:w-56"
            >
              <span className="truncate">{currentRestaurant?.name ?? "Restaurant"}</span>
              <span className="text-slate-400">v</span>
            </button>
            {restaurantOpen ? (
              <div
                role="menu"
                className="absolute right-0 z-20 mt-2 w-full rounded-sm border border-slate-200 bg-white p-2 shadow-sm sm:w-64"
              >
                {restaurants.map((restaurant) => (
                  <button
                    key={restaurant.id}
                    type="button"
                    role="menuitem"
                    onClick={() => setRestaurantOpen(false)}
                    className={`block w-full rounded-sm px-3 py-2 text-left text-sm font-semibold ${
                      restaurant.id === currentRestaurantId
                        ? "bg-[#FBFAF7] text-[#0F172A]"
                        : "text-slate-600 hover:bg-[#FBFAF7]"
                    }`}
                  >
                    {restaurant.name}
                  </button>
                ))}
                <p className="mt-2 border-t border-slate-200 px-3 pt-2 text-xs leading-5 text-slate-500">
                  Restaurant switching will be enabled when multi-restaurant workflows are added.
                </p>
              </div>
            ) : null}
          </div>

          <div ref={userRef} className="relative">
            <button
              type="button"
              aria-expanded={userOpen}
              aria-haspopup="menu"
              onClick={() => {
                setUserOpen((open) => !open);
                setRestaurantOpen(false);
              }}
              className="flex min-h-11 w-full items-center justify-between gap-3 rounded-sm border border-slate-200 bg-white px-4 text-sm font-semibold text-[#0F172A] transition hover:bg-[#FBFAF7] sm:w-auto"
            >
              <span className="max-w-44 truncate">{userName}</span>
              <span className="text-slate-400">v</span>
            </button>
            {userOpen ? (
              <div
                role="menu"
                className="mt-2 rounded-sm border border-slate-200 bg-white p-4 shadow-sm sm:absolute sm:right-0 sm:z-20 sm:w-72"
              >
                <p className="text-sm font-semibold text-[#0F172A]">{userName}</p>
                <p className="mt-1 break-all text-xs text-slate-500">{userEmail}</p>
                <form action={logoutAction} className="mt-4">
                  <button
                    type="submit"
                    role="menuitem"
                    className="inline-flex min-h-10 w-full items-center justify-center rounded-sm border border-slate-300 px-4 text-sm font-semibold text-[#0F172A] transition hover:border-[#0F172A] hover:bg-[#FBFAF7] focus:outline-none focus:ring-2 focus:ring-[#0F172A] focus:ring-offset-2"
                  >
                    Log out
                  </button>
                </form>
              </div>
            ) : null}
          </div>
        </div>
      </nav>
    </header>
  );
}
