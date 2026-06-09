"use client";

import { useEffect, useMemo, useState } from "react";

import { allergenTags, dietaryTags } from "@/lib/menus/types";
import type { PublicMenu, PublicMenuItem, PublicMenuPageData } from "@/lib/public-menu/types";

function recordMenuEvent(input: {
  restaurantId: string;
  menuId?: string | null;
  menuItemId?: string | null;
  eventType: "restaurant_page_view" | "menu_page_view" | "item_detail_click";
  source?: string;
  tableNumber?: string;
}) {
  fetch("/r/events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
    keepalive: true,
  }).catch(() => {
    // Analytics should never interrupt menu viewing.
  });
}

function price(currency: string, value: number) {
  const symbol = currency === "GBP" ? "£" : currency === "USD" ? "$" : currency === "AED" ? "AED " : "€";
  return `${symbol}${Number(value).toFixed(2)}`;
}

function openingStatus(days: PublicMenuPageData["restaurant"]["opening_hours"]) {
  if (!days?.days?.length) return null;

  const now = new Date();
  const day = days.days[now.getDay() === 0 ? 6 : now.getDay() - 1];
  if (!day) return null;
  if (day.closed) return "Closed today";
  return `Open today ${day.open}-${day.close}`;
}

function Chip({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "gold" | "danger" }) {
  const classes = {
    neutral: "bg-white text-slate-600 ring-slate-200",
    gold: "bg-[#D4A017]/10 text-[#8A6811] ring-[#D4A017]/25",
    danger: "bg-red-50 text-red-700 ring-red-100",
  }[tone];

  return <span className={`rounded-sm px-2 py-1 text-[11px] font-semibold ring-1 ${classes}`}>{children}</span>;
}

function ItemDetail({
  item,
  onClose,
}: {
  item: PublicMenuItem;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 bg-[#0F172A]/50 px-4 py-6 backdrop-blur-sm" role="dialog" aria-modal="true">
      <div className="mx-auto max-h-full max-w-2xl overflow-y-auto rounded-sm bg-[#FBFAF7] shadow-2xl">
        {item.images[0]?.url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.images[0].url} alt="" className="h-64 w-full object-cover" />
        ) : null}
        <div className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-3xl font-semibold">{item.name}</h2>
              <p className="mt-2 text-lg font-semibold text-[#8A6811]">{price(item.currency, item.base_price)}</p>
            </div>
            <button type="button" onClick={onClose} className="rounded-sm border border-slate-300 px-3 py-2 text-sm font-semibold">
              Close
            </button>
          </div>
          {item.description ? <p className="mt-5 text-sm leading-6 text-slate-600">{item.description}</p> : null}
          <div className="mt-5 flex flex-wrap gap-2">
            {item.badges.map((tag) => <Chip key={tag} tone="gold">{tag}</Chip>)}
            {item.dietary_tags.map((tag) => <Chip key={tag}>{tag}</Chip>)}
            {item.allergens.map((tag) => <Chip key={tag} tone="danger">{tag}</Chip>)}
          </div>
          <div className="mt-6 space-y-3 text-sm text-slate-600">
            {item.variant_groups.map((group) => (
              <p key={group.name}>
                <span className="font-semibold text-[#0F172A]">{group.name}:</span>{" "}
                {group.variants.map((variant) => `${variant.name} +${price(item.currency, variant.price_delta)}`).join(", ")}
              </p>
            ))}
            {item.addon_groups.map((group) => (
              <p key={group.name}>
                <span className="font-semibold text-[#0F172A]">{group.name}:</span>{" "}
                {group.addons.map((addon) => `${addon.name} +${price(item.currency, addon.price_delta)}`).join(", ")}
              </p>
            ))}
            {item.ingredients.length ? (
              <p>
                <span className="font-semibold text-[#0F172A]">Ingredients:</span> {item.ingredients.join(", ")}
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

export function PublicMenuView({
  data,
  initialMenuSlug,
  source,
  tableNumber,
}: {
  data: PublicMenuPageData;
  initialMenuSlug?: string;
  source?: string;
  tableNumber?: string;
}) {
  const [activeMenuSlug, setActiveMenuSlug] = useState(initialMenuSlug ?? data.menus[0]?.slug ?? "");
  const [search, setSearch] = useState("");
  const [dietFilters, setDietFilters] = useState<string[]>([]);
  const [allergenFilters, setAllergenFilters] = useState<string[]>([]);
  const [selectedItem, setSelectedItem] = useState<PublicMenuItem | null>(null);
  const activeMenu = data.menus.find((menu) => menu.slug === activeMenuSlug) ?? data.menus[0];
  const status = openingStatus(data.restaurant.opening_hours);

  useEffect(() => {
    recordMenuEvent({
      restaurantId: data.restaurant.id,
      menuId: initialMenuSlug ? activeMenu?.id : null,
      eventType: initialMenuSlug ? "menu_page_view" : "restaurant_page_view",
      source,
      tableNumber,
    });
  }, [activeMenu?.id, data.restaurant.id, initialMenuSlug, source, tableNumber]);

  const filteredMenu = useMemo<PublicMenu | undefined>(() => {
    if (!activeMenu) return undefined;
    const normalizedSearch = search.toLowerCase();

    return {
      ...activeMenu,
      categories: activeMenu.categories
        .map((category) => ({
          ...category,
          items: category.items.filter((item) => {
            if (normalizedSearch && !`${item.name} ${item.description ?? ""}`.toLowerCase().includes(normalizedSearch)) {
              return false;
            }
            if (dietFilters.length && !dietFilters.every((tag) => item.dietary_tags.includes(tag))) {
              return false;
            }
            if (allergenFilters.some((tag) => item.allergens.includes(tag))) {
              return false;
            }
            return true;
          }),
        }))
        .filter((category) => category.items.length > 0),
    };
  }, [activeMenu, allergenFilters, dietFilters, search]);

  const toggle = (tag: string, values: string[], setValues: (values: string[]) => void) => {
    setValues(values.includes(tag) ? values.filter((value) => value !== tag) : [...values, tag]);
  };

  return (
    <main className="min-h-screen bg-[#FBFAF7] text-[#0F172A]">
      <section className="relative">
        {data.restaurant.cover_image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={data.restaurant.cover_image_url} alt="" className="h-64 w-full object-cover sm:h-80" />
        ) : (
          <div className="h-64 bg-[#0F172A] sm:h-80" />
        )}
        <div className="absolute inset-0 bg-[#0F172A]/55" />
        <div className="absolute inset-x-0 bottom-0 mx-auto max-w-5xl px-5 pb-7 text-white sm:px-8">
          {data.restaurant.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={data.restaurant.logo_url} alt="" className="mb-5 h-16 w-16 rounded-sm bg-white object-contain p-2" />
          ) : null}
          <h1 className="text-4xl font-semibold">{data.restaurant.name}</h1>
          {data.restaurant.description ? <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-200">{data.restaurant.description}</p> : null}
          {status ? <p className="mt-3 text-sm font-semibold text-[#D4A017]">{status}</p> : null}
        </div>
      </section>

      {data.menus.length === 0 ? (
        <section className="mx-auto max-w-3xl px-5 py-16 text-center sm:px-8">
          <h2 className="text-2xl font-semibold">No live menu is currently available.</h2>
          <p className="mt-3 text-sm text-slate-500">Please check with the restaurant.</p>
        </section>
      ) : (
        <section className="mx-auto max-w-5xl px-5 py-7 sm:px-8">
          {data.menus.length > 1 ? (
            <div className="flex gap-2 overflow-x-auto pb-2">
              {data.menus.map((menu) => (
                <button
                  key={menu.id}
                  type="button"
                  onClick={() => setActiveMenuSlug(menu.slug)}
                  className={`whitespace-nowrap rounded-sm px-4 py-2 text-sm font-semibold ${
                    activeMenu?.slug === menu.slug ? "bg-[#0F172A] text-white" : "bg-white text-[#0F172A] ring-1 ring-slate-200"
                  }`}
                >
                  {menu.name}
                </button>
              ))}
            </div>
          ) : null}

          <div className="mt-5 rounded-sm bg-white p-4 shadow-sm ring-1 ring-slate-200">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search menu items"
              className="w-full rounded-sm border border-slate-200 px-4 py-3 text-sm"
            />
            <details className="mt-3 rounded-sm bg-[#FBFAF7] p-3 text-sm">
              <summary className="cursor-pointer font-semibold">Dietary filters</summary>
              <div className="mt-3 flex flex-wrap gap-2">
                {dietaryTags.map((tag) => (
                  <button key={tag} type="button" onClick={() => toggle(tag, dietFilters, setDietFilters)} className={`rounded-sm px-2.5 py-1 text-xs font-semibold ring-1 ${dietFilters.includes(tag) ? "bg-[#0F172A] text-white ring-[#0F172A]" : "bg-white text-slate-600 ring-slate-200"}`}>
                    {tag}
                  </button>
                ))}
              </div>
            </details>
            <details className="mt-3 rounded-sm bg-[#FBFAF7] p-3 text-sm">
              <summary className="cursor-pointer font-semibold">Hide items containing allergens</summary>
              <div className="mt-3 flex flex-wrap gap-2">
                {allergenTags.map((tag) => (
                  <button key={tag} type="button" onClick={() => toggle(tag, allergenFilters, setAllergenFilters)} className={`rounded-sm px-2.5 py-1 text-xs font-semibold ring-1 ${allergenFilters.includes(tag) ? "bg-red-700 text-white ring-red-700" : "bg-white text-slate-600 ring-slate-200"}`}>
                    {tag}
                  </button>
                ))}
              </div>
            </details>
          </div>

          {filteredMenu ? (
            <div className="mt-8 rounded-sm bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-8">
              <h2 className="text-3xl font-semibold">{filteredMenu.name}</h2>
              {filteredMenu.description ? <p className="mt-3 text-sm leading-6 text-slate-500">{filteredMenu.description}</p> : null}
              <div className="mt-8 space-y-10">
                {filteredMenu.categories.map((category) => (
                  <section key={category.id}>
                    <h3 className="border-b border-slate-200 pb-3 text-2xl font-semibold">{category.name}</h3>
                    {category.description ? <p className="mt-2 text-sm text-slate-500">{category.description}</p> : null}
                    <div className="mt-5 space-y-5">
                      {category.items.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => {
                            setSelectedItem(item);
                            recordMenuEvent({
                              restaurantId: data.restaurant.id,
                              menuId: activeMenu?.id,
                              menuItemId: item.id,
                              eventType: "item_detail_click",
                              source,
                              tableNumber,
                            });
                          }}
                          className="flex w-full gap-4 border-b border-slate-100 pb-5 text-left"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex justify-between gap-4">
                              <p className="font-semibold">{item.name}</p>
                              <p className="font-semibold">{price(item.currency, item.base_price)}</p>
                            </div>
                            {item.description ? <p className="mt-1 text-sm leading-6 text-slate-600">{item.description}</p> : null}
                            <div className="mt-3 flex flex-wrap gap-2">
                              {item.badges.map((tag) => <Chip key={tag} tone="gold">{tag}</Chip>)}
                              {item.dietary_tags.map((tag) => <Chip key={tag}>{tag}</Chip>)}
                              {item.allergens.map((tag) => <Chip key={tag} tone="danger">{tag}</Chip>)}
                            </div>
                          </div>
                          {item.images[0]?.url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={item.images[0].url} alt="" className="h-20 w-20 rounded-sm object-cover" />
                          ) : null}
                        </button>
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            </div>
          ) : null}
        </section>
      )}

      <footer className="mx-auto max-w-5xl px-5 py-8 text-center text-xs text-slate-500 sm:px-8">
        Powered by Atlas, A Martello Hospitality Company
      </footer>

      {selectedItem ? <ItemDetail item={selectedItem} onClose={() => setSelectedItem(null)} /> : null}
    </main>
  );
}
