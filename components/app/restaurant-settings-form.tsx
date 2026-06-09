"use client";

import { useActionState, useMemo, useState } from "react";

import {
  type RestaurantSettingsActionState,
  updateRestaurantSettingsAction,
} from "@/app/settings/restaurant/actions";
import type { OpeningHours, RestaurantSummary } from "@/lib/onboarding/types";
import {
  averageTransactionValueRanges,
  averageWeeklyCoverRanges,
  countries,
  currencies,
  cuisineTypes,
  defaultOpeningHours,
  existingMenuSources,
  imageMimeTypes,
  inventoryMethods,
  irishCounties,
  locationCountRanges,
  maxCoverSize,
  maxLogoSize,
  menuItemRanges,
  menuSetupMethods,
  menuUpdateFrequencies,
  primaryObjectives,
  restaurantTypes,
  seatingCapacityRanges,
  slugify,
  timezones,
} from "@/lib/onboarding/validation";

type FormState = {
  name: string;
  slug: string;
  restaurantType: string;
  cuisineType: string;
  cuisineTypeOther: string;
  description: string;
  businessEmail: string;
  phone: string;
  website: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  countyOrState: string;
  postcode: string;
  country: string;
  instagramHandle: string;
  facebookPage: string;
  tiktokHandle: string;
  xHandle: string;
  linkedinCompany: string;
  locationCountRange: string;
  seatingCapacityRange: string;
  currency: string;
  timezone: string;
  primaryColour: string;
  secondaryColour: string;
  menuSetupMethod: string;
  existingMenuSource: string;
  approximateMenuItemsRange: string;
  primaryObjective: string;
  averageWeeklyCovers: string;
  menuUpdateFrequency: string;
  inventoryMethod: string;
  posProvider: string;
  mainOperationalPainPoint: string;
  averageTransactionValue: string;
};

type FormKey = keyof FormState;

const initialActionState: RestaurantSettingsActionState = {
  status: "idle",
  message: "",
};

function handleFromUrl(url: string | null, prefix: string) {
  return url?.replace(prefix, "") ?? "";
}

function socialUrl(prefix: string, value: string) {
  const cleaned = value.trim().replace(/^@/, "");
  return cleaned ? `${prefix}${cleaned}` : "";
}

function initialCuisineValue(cuisineType: string) {
  return cuisineTypes.includes(cuisineType) ? cuisineType : "Other";
}

function initialCuisineOtherValue(cuisineType: string) {
  return cuisineTypes.includes(cuisineType) ? "" : cuisineType;
}

function Field({
  label,
  name,
  value,
  onChange,
  required = false,
  optional = false,
  type = "text",
  helper,
  multiline = false,
}: {
  label: string;
  name: FormKey;
  value: string;
  onChange: (name: FormKey, value: string) => void;
  required?: boolean;
  optional?: boolean;
  type?: string;
  helper?: string;
  multiline?: boolean;
}) {
  return (
    <label className="block text-sm font-medium text-slate-700">
      <span>
        {label}
        {required ? <span className="ml-1 text-[#B87333]">*</span> : null}
        {optional ? <span className="ml-2 text-xs font-normal text-slate-400">Optional</span> : null}
      </span>
      {multiline ? (
        <textarea
          name={name}
          value={value}
          onChange={(event) => onChange(name, event.target.value)}
          rows={4}
          className="mt-2 w-full rounded-sm border border-slate-200 bg-white px-4 py-3 text-sm text-[#0F172A] outline-none transition focus:border-[#D4A017] focus:ring-2 focus:ring-[#D4A017]/20"
        />
      ) : (
        <input
          name={name}
          type={type}
          value={value}
          onChange={(event) => onChange(name, type === "color" ? event.target.value.toUpperCase() : event.target.value)}
          className="mt-2 w-full rounded-sm border border-slate-200 bg-white px-4 py-3 text-sm text-[#0F172A] outline-none transition focus:border-[#D4A017] focus:ring-2 focus:ring-[#D4A017]/20"
        />
      )}
      {helper ? <span className="mt-2 block text-xs font-normal leading-5 text-slate-500">{helper}</span> : null}
    </label>
  );
}

function SelectField({
  label,
  name,
  value,
  options,
  onChange,
  required = false,
  optional = false,
  helper,
  includeName = true,
}: {
  label: string;
  name: FormKey;
  value: string;
  options: Array<string | { value: string; label: string }>;
  onChange: (name: FormKey, value: string) => void;
  required?: boolean;
  optional?: boolean;
  helper?: string;
  includeName?: boolean;
}) {
  return (
    <label className="block text-sm font-medium text-slate-700">
      <span>
        {label}
        {required ? <span className="ml-1 text-[#B87333]">*</span> : null}
        {optional ? <span className="ml-2 text-xs font-normal text-slate-400">Optional</span> : null}
      </span>
      <select
        name={includeName ? name : undefined}
        value={value}
        onChange={(event) => onChange(name, event.target.value)}
        className="mt-2 w-full rounded-sm border border-slate-200 bg-white px-4 py-3 text-sm text-[#0F172A] outline-none transition focus:border-[#D4A017] focus:ring-2 focus:ring-[#D4A017]/20"
      >
        {options.map((option) => (
          <option
            key={typeof option === "string" ? option || "blank" : option.value}
            value={typeof option === "string" ? option : option.value}
          >
            {typeof option === "string" ? option || "Not Provided" : option.label}
          </option>
        ))}
      </select>
      {helper ? <span className="mt-2 block text-xs font-normal leading-5 text-slate-500">{helper}</span> : null}
    </label>
  );
}

function SocialField({
  label,
  prefix,
  name,
  value,
  onChange,
}: {
  label: string;
  prefix: string;
  name: FormKey;
  value: string;
  onChange: (name: FormKey, value: string) => void;
}) {
  return (
    <label className="block text-sm font-medium text-slate-700">
      <span>
        {label}
        <span className="ml-2 text-xs font-normal text-slate-400">Optional</span>
      </span>
      <div className="mt-2 flex overflow-hidden rounded-sm border border-slate-200 bg-white focus-within:border-[#D4A017] focus-within:ring-2 focus-within:ring-[#D4A017]/20">
        <span className="flex items-center border-r border-slate-200 bg-[#FBFAF7] px-3 text-sm text-slate-500">
          {prefix}
        </span>
        <input
          type="text"
          value={value}
          onChange={(event) => onChange(name, event.target.value.replace(/^@/, ""))}
          className="min-w-0 flex-1 px-4 py-3 text-sm text-[#0F172A] outline-none"
        />
      </div>
    </label>
  );
}

function ColourField({
  label,
  name,
  value,
  onChange,
  required = false,
  optional = false,
}: {
  label: string;
  name: FormKey;
  value: string;
  onChange: (name: FormKey, value: string) => void;
  required?: boolean;
  optional?: boolean;
}) {
  return (
    <label className="block text-sm font-medium text-slate-700">
      <span>
        {label}
        {required ? <span className="ml-1 text-[#B87333]">*</span> : null}
        {optional ? <span className="ml-2 text-xs font-normal text-slate-400">Optional</span> : null}
      </span>
      <div className="mt-2 grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-sm border border-slate-200 bg-white px-3 py-2">
        <span className="h-8 w-8 rounded-sm border border-slate-200" style={{ backgroundColor: value }} />
        <input
          name={name}
          value={value}
          onChange={(event) => onChange(name, event.target.value)}
          className="min-w-0 px-2 py-2 font-mono text-sm outline-none"
        />
        <input
          type="color"
          value={value}
          onChange={(event) => onChange(name, event.target.value.toUpperCase())}
          className="h-10 w-12 cursor-pointer rounded-sm border border-slate-200 bg-white p-1"
        />
      </div>
    </label>
  );
}

function OpeningHoursEditor({
  openingHours,
  onChange,
}: {
  openingHours: OpeningHours;
  onChange: (hours: OpeningHours) => void;
}) {
  const monday = openingHours.days[0];

  function updateDay(index: number, patch: Partial<OpeningHours["days"][number]>) {
    onChange({
      ...openingHours,
      days: openingHours.days.map((day, dayIndex) =>
        dayIndex === index ? { ...day, ...patch } : day,
      ),
    });
  }

  function applySameHours(open: string, close: string) {
    onChange({
      mode: "same",
      days: openingHours.days.map((day) => ({ ...day, closed: false, open, close })),
    });
  }

  function applySplitHours(
    weekdayOpen: string,
    weekdayClose: string,
    weekendOpen: string,
    weekendClose: string,
  ) {
    onChange({
      mode: "split",
      days: openingHours.days.map((day) => {
        const isWeekend = day.day === "Saturday" || day.day === "Sunday";
        return {
          ...day,
          closed: false,
          open: isWeekend ? weekendOpen : weekdayOpen,
          close: isWeekend ? weekendClose : weekdayClose,
        };
      }),
    });
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          ["same", "Same Hours Every Day"],
          ["split", "Weekday/Weekend Split"],
          ["custom", "Custom By Day"],
        ].map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => onChange({ ...openingHours, mode: value as OpeningHours["mode"] })}
            className={`rounded-sm border px-4 py-3 text-left text-sm font-semibold ${
              openingHours.mode === value
                ? "border-[#D4A017] bg-[#D4A017]/10 text-[#0F172A]"
                : "border-slate-200 bg-white text-slate-600"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {openingHours.mode === "same" ? (
        <div className="grid gap-4 rounded-sm bg-[#FBFAF7] p-4 ring-1 ring-slate-200 sm:grid-cols-2">
          <label className="text-sm font-medium text-slate-700">
            Opens
            <input
              type="time"
              value={openingHours.days[0].open}
              onChange={(event) => applySameHours(event.target.value, openingHours.days[0].close)}
              className="mt-2 w-full rounded-sm border border-slate-200 bg-white px-4 py-3 text-sm"
            />
          </label>
          <label className="text-sm font-medium text-slate-700">
            Closes
            <input
              type="time"
              value={openingHours.days[0].close}
              onChange={(event) => applySameHours(openingHours.days[0].open, event.target.value)}
              className="mt-2 w-full rounded-sm border border-slate-200 bg-white px-4 py-3 text-sm"
            />
          </label>
        </div>
      ) : null}

      {openingHours.mode === "split" ? (
        <div className="grid gap-4 rounded-sm bg-[#FBFAF7] p-4 ring-1 ring-slate-200 sm:grid-cols-2">
          <div className="grid grid-cols-2 gap-3">
            <p className="col-span-2 text-sm font-semibold text-[#0F172A]">Monday to Friday</p>
            <input
              type="time"
              value={openingHours.days[0].open}
              onChange={(event) =>
                applySplitHours(
                  event.target.value,
                  openingHours.days[0].close,
                  openingHours.days[5].open,
                  openingHours.days[5].close,
                )
              }
              className="rounded-sm border border-slate-200 bg-white px-4 py-3 text-sm"
            />
            <input
              type="time"
              value={openingHours.days[0].close}
              onChange={(event) =>
                applySplitHours(
                  openingHours.days[0].open,
                  event.target.value,
                  openingHours.days[5].open,
                  openingHours.days[5].close,
                )
              }
              className="rounded-sm border border-slate-200 bg-white px-4 py-3 text-sm"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <p className="col-span-2 text-sm font-semibold text-[#0F172A]">Saturday and Sunday</p>
            <input
              type="time"
              value={openingHours.days[5].open}
              onChange={(event) =>
                applySplitHours(
                  openingHours.days[0].open,
                  openingHours.days[0].close,
                  event.target.value,
                  openingHours.days[5].close,
                )
              }
              className="rounded-sm border border-slate-200 bg-white px-4 py-3 text-sm"
            />
            <input
              type="time"
              value={openingHours.days[5].close}
              onChange={(event) =>
                applySplitHours(
                  openingHours.days[0].open,
                  openingHours.days[0].close,
                  openingHours.days[5].open,
                  event.target.value,
                )
              }
              className="rounded-sm border border-slate-200 bg-white px-4 py-3 text-sm"
            />
          </div>
        </div>
      ) : null}

      {openingHours.mode === "custom" ? (
        <button
          type="button"
          onClick={() =>
            onChange({
              ...openingHours,
              days: openingHours.days.map((day) => ({
                ...day,
                closed: monday.closed,
                open: monday.open,
                close: monday.close,
              })),
            })
          }
          className="rounded-sm border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-[#0F172A]"
        >
          Copy Monday to all days
        </button>
      ) : null}

      <div className="grid gap-3">
        {openingHours.days.map((day, index) => (
          <div key={day.day} className="grid gap-3 rounded-sm bg-white p-4 ring-1 ring-slate-200 sm:grid-cols-[1fr_auto_auto_auto]">
            <span className="text-sm font-semibold text-[#0F172A]">{day.day}</span>
            <input
              type="time"
              value={day.open}
              disabled={day.closed || openingHours.mode !== "custom"}
              onChange={(event) => updateDay(index, { open: event.target.value })}
              className="rounded-sm border border-slate-200 px-3 py-2 text-sm disabled:bg-slate-50"
            />
            <input
              type="time"
              value={day.close}
              disabled={day.closed || openingHours.mode !== "custom"}
              onChange={(event) => updateDay(index, { close: event.target.value })}
              className="rounded-sm border border-slate-200 px-3 py-2 text-sm disabled:bg-slate-50"
            />
            <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-500">
              <input
                type="checkbox"
                checked={day.closed}
                disabled={openingHours.mode !== "custom"}
                onChange={(event) => updateDay(index, { closed: event.target.checked })}
              />
              Closed
            </label>
          </div>
        ))}
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-sm bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:p-7">
      <h2 className="text-2xl font-semibold">{title}</h2>
      <div className="mt-5 grid gap-5 sm:grid-cols-2">{children}</div>
    </section>
  );
}

export function RestaurantSettingsForm({
  restaurant,
  logoUrl,
  coverImageUrl,
}: {
  restaurant: RestaurantSummary;
  logoUrl: string | null;
  coverImageUrl: string | null;
}) {
  const [state, formAction, pending] = useActionState(
    updateRestaurantSettingsAction,
    initialActionState,
  );
  const [form, setForm] = useState<FormState>({
    name: restaurant.name,
    slug: restaurant.slug,
    restaurantType: restaurant.restaurant_type,
    cuisineType: initialCuisineValue(restaurant.cuisine_type),
    cuisineTypeOther: initialCuisineOtherValue(restaurant.cuisine_type),
    description: restaurant.description,
    businessEmail: restaurant.business_email,
    phone: restaurant.phone,
    website: restaurant.website ?? "",
    addressLine1: restaurant.address_line_1,
    addressLine2: restaurant.address_line_2 ?? "",
    city: restaurant.city,
    countyOrState: restaurant.county_or_state ?? "",
    postcode: restaurant.postcode ?? "",
    country: restaurant.country,
    instagramHandle: handleFromUrl(restaurant.instagram_url, "https://instagram.com/"),
    facebookPage: handleFromUrl(restaurant.facebook_url, "https://facebook.com/"),
    tiktokHandle: handleFromUrl(restaurant.tiktok_url, "https://tiktok.com/@"),
    xHandle: handleFromUrl(restaurant.x_url, "https://x.com/"),
    linkedinCompany: handleFromUrl(restaurant.linkedin_url, "https://linkedin.com/company/"),
    locationCountRange: restaurant.location_count_range,
    seatingCapacityRange: restaurant.seating_capacity_range,
    currency: restaurant.currency,
    timezone: restaurant.timezone,
    primaryColour: restaurant.primary_colour,
    secondaryColour: restaurant.secondary_colour ?? "#334155",
    menuSetupMethod: restaurant.menu_setup_method,
    existingMenuSource: restaurant.existing_menu_source,
    approximateMenuItemsRange: restaurant.approximate_menu_items_range,
    primaryObjective: restaurant.primary_objective,
    averageWeeklyCovers: restaurant.average_weekly_covers ?? "",
    menuUpdateFrequency: restaurant.menu_update_frequency ?? "",
    inventoryMethod: restaurant.inventory_method ?? "",
    posProvider: restaurant.pos_provider ?? "",
    mainOperationalPainPoint: restaurant.main_operational_pain_point ?? "",
    averageTransactionValue: restaurant.average_transaction_value ?? "",
  });
  const [openingHours, setOpeningHours] = useState<OpeningHours>(
    restaurant.opening_hours ?? defaultOpeningHours,
  );
  const [logoPreview, setLogoPreview] = useState(logoUrl);
  const [coverPreview, setCoverPreview] = useState(coverImageUrl);

  const publicPath = useMemo(() => `/r/${form.slug || "restaurant-slug"}`, [form.slug]);

  function updateField(name: FormKey, value: string) {
    setForm((current) => {
      if (name === "name" && (!current.slug || current.slug === slugify(current.name))) {
        return { ...current, name: value, slug: slugify(value) };
      }
      if (name === "slug") return { ...current, slug: slugify(value) };
      if (name === "currency") return { ...current, currency: value, averageTransactionValue: "" };
      return { ...current, [name]: value };
    });
  }

  const cuisineValue =
    form.cuisineType === "Other" ? form.cuisineTypeOther.trim() : form.cuisineType;

  return (
    <form action={formAction} className="grid gap-6">
      <input type="hidden" name="restaurantId" value={restaurant.id} />
      <input type="hidden" name="cuisineType" value={cuisineValue} />
      <input type="hidden" name="openingHours" value={JSON.stringify(openingHours)} />
      <input type="hidden" name="instagramUrl" value={socialUrl("https://instagram.com/", form.instagramHandle)} />
      <input type="hidden" name="facebookUrl" value={socialUrl("https://facebook.com/", form.facebookPage)} />
      <input type="hidden" name="tiktokUrl" value={socialUrl("https://tiktok.com/@", form.tiktokHandle)} />
      <input type="hidden" name="xUrl" value={socialUrl("https://x.com/", form.xHandle)} />
      <input type="hidden" name="linkedinUrl" value={socialUrl("https://linkedin.com/company/", form.linkedinCompany)} />

      <div className="rounded-sm bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <p className="text-sm text-slate-500">
          <span className="text-[#B87333]">*</span> Required fields
        </p>
      </div>

      <Section title="Business Details">
        <Field label="Restaurant Name" name="name" value={form.name} onChange={updateField} required />
        <SelectField label="Restaurant Type" name="restaurantType" value={form.restaurantType} options={restaurantTypes} onChange={updateField} required />
        <SelectField
          label="Cuisine Type"
          name="cuisineType"
          value={form.cuisineType}
          options={cuisineTypes}
          onChange={updateField}
          required
          includeName={false}
        />
        {form.cuisineType === "Other" ? (
          <Field
            label="Custom Cuisine Type"
            name="cuisineTypeOther"
            value={form.cuisineTypeOther}
            onChange={updateField}
            required
          />
        ) : null}
        <Field label="Public URL Slug" name="slug" value={form.slug} onChange={updateField} required helper={`Future public path: ${publicPath}`} />
        <div className="sm:col-span-2">
          <Field label="Description" name="description" value={form.description} onChange={updateField} multiline required />
        </div>
      </Section>

      <Section title="Contact Details">
        <Field label="Business Email" name="businessEmail" value={form.businessEmail} onChange={updateField} type="email" required />
        <Field label="Phone" name="phone" value={form.phone} onChange={updateField} type="tel" required />
        <Field label="Website" name="website" value={form.website} onChange={updateField} optional />
        <Field label="Address Line 1" name="addressLine1" value={form.addressLine1} onChange={updateField} required />
        <Field label="Address Line 2" name="addressLine2" value={form.addressLine2} onChange={updateField} optional />
        <Field label="City" name="city" value={form.city} onChange={updateField} required />
        {form.country === "Ireland" ? (
          <SelectField label="County" name="countyOrState" value={form.countyOrState} options={irishCounties} onChange={updateField} optional />
        ) : (
          <Field label="County/State" name="countyOrState" value={form.countyOrState} onChange={updateField} optional />
        )}
        <Field label="Postcode" name="postcode" value={form.postcode} onChange={updateField} optional />
        <SelectField label="Country" name="country" value={form.country} options={countries} onChange={updateField} required />
      </Section>

      <Section title="Social Links">
        <SocialField label="Instagram" prefix="instagram.com/" name="instagramHandle" value={form.instagramHandle} onChange={updateField} />
        <SocialField label="Facebook" prefix="facebook.com/" name="facebookPage" value={form.facebookPage} onChange={updateField} />
        <SocialField label="TikTok" prefix="tiktok.com/@" name="tiktokHandle" value={form.tiktokHandle} onChange={updateField} />
        <SocialField label="X/Twitter" prefix="x.com/" name="xHandle" value={form.xHandle} onChange={updateField} />
        <SocialField label="LinkedIn" prefix="linkedin.com/company/" name="linkedinCompany" value={form.linkedinCompany} onChange={updateField} />
      </Section>

      <Section title="Operations">
        <SelectField label="Number Of Locations" name="locationCountRange" value={form.locationCountRange} options={locationCountRanges} onChange={updateField} required />
        <SelectField label="Seating Capacity" name="seatingCapacityRange" value={form.seatingCapacityRange} options={seatingCapacityRanges} onChange={updateField} required />
        <SelectField label="Currency" name="currency" value={form.currency} options={currencies} onChange={updateField} required />
        <SelectField label="Timezone" name="timezone" value={form.timezone} options={timezones} onChange={updateField} required />
        <div className="sm:col-span-2">
          <OpeningHoursEditor openingHours={openingHours} onChange={setOpeningHours} />
        </div>
      </Section>

      <Section title="Branding">
        <div className="rounded-sm bg-[#FBFAF7] p-4 ring-1 ring-slate-200">
          <p className="text-sm font-semibold text-[#0F172A]">Logo</p>
          {logoPreview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoPreview} alt="Restaurant logo preview" className="mt-3 h-20 w-20 rounded-sm bg-white object-contain p-2 ring-1 ring-slate-200" />
          ) : null}
          <input
            name="logo"
            type="file"
            accept={imageMimeTypes.join(",")}
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) setLogoPreview(URL.createObjectURL(file));
            }}
            className="mt-4 block w-full text-sm text-slate-600 file:mr-4 file:rounded-sm file:border-0 file:bg-[#0F172A] file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white"
          />
          <p className="mt-2 text-xs text-slate-500">PNG, JPG, or WebP up to {maxLogoSize / 1024 / 1024}MB.</p>
        </div>
        <div className="rounded-sm bg-[#FBFAF7] p-4 ring-1 ring-slate-200">
          <p className="text-sm font-semibold text-[#0F172A]">Cover Image</p>
          {coverPreview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={coverPreview} alt="Restaurant cover preview" className="mt-3 h-28 w-full rounded-sm object-cover ring-1 ring-slate-200" />
          ) : null}
          <input
            name="coverImage"
            type="file"
            accept={imageMimeTypes.join(",")}
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) setCoverPreview(URL.createObjectURL(file));
            }}
            className="mt-4 block w-full text-sm text-slate-600 file:mr-4 file:rounded-sm file:border-0 file:bg-[#0F172A] file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white"
          />
          <p className="mt-2 text-xs text-slate-500">Optional. PNG, JPG, or WebP up to {maxCoverSize / 1024 / 1024}MB.</p>
        </div>
        <ColourField label="Primary Brand Colour" name="primaryColour" value={form.primaryColour} onChange={updateField} required />
        <ColourField label="Secondary Brand Colour" name="secondaryColour" value={form.secondaryColour} onChange={updateField} optional />
      </Section>

      <Section title="Business Intelligence">
        <SelectField
          label="Menu Setup Method"
          name="menuSetupMethod"
          value={form.menuSetupMethod}
          options={menuSetupMethods.map((method) => ({
            value: method.value,
            label: method.label,
          }))}
          onChange={updateField}
          required
        />
        <SelectField label="Existing Menu Source" name="existingMenuSource" value={form.existingMenuSource} options={existingMenuSources} onChange={updateField} required />
        <SelectField label="Approximate Menu Items" name="approximateMenuItemsRange" value={form.approximateMenuItemsRange} options={menuItemRanges} onChange={updateField} required />
        <SelectField label="Primary Objective" name="primaryObjective" value={form.primaryObjective} options={primaryObjectives} onChange={updateField} required />
        <SelectField label="Average Weekly Covers" name="averageWeeklyCovers" value={form.averageWeeklyCovers} options={["", ...averageWeeklyCoverRanges]} onChange={updateField} optional helper="Approximate number of customers served per week." />
        <SelectField label="Menu Update Frequency" name="menuUpdateFrequency" value={form.menuUpdateFrequency} options={["", ...menuUpdateFrequencies]} onChange={updateField} optional />
        <SelectField label="Current Inventory Method" name="inventoryMethod" value={form.inventoryMethod} options={["", ...inventoryMethods]} onChange={updateField} optional />
        <Field label="Current POS Provider" name="posProvider" value={form.posProvider} onChange={updateField} optional />
        <SelectField label="Average Transaction Value" name="averageTransactionValue" value={form.averageTransactionValue} options={["", ...averageTransactionValueRanges(form.currency)]} onChange={updateField} optional />
        <div className="sm:col-span-2">
          <Field label="Main Operational Pain Point" name="mainOperationalPainPoint" value={form.mainOperationalPainPoint} onChange={updateField} multiline optional />
        </div>
      </Section>
      <div className="sticky bottom-0 z-30 -mx-5 border-t border-slate-200 bg-[#FBFAF7]/95 px-5 py-4 backdrop-blur sm:-mx-8 sm:px-8 lg:-mx-10 lg:px-10">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 rounded-sm bg-white p-4 shadow-sm ring-1 ring-slate-200 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-h-5 text-sm">
            {state.message ? (
              <p className={state.status === "success" ? "font-semibold text-emerald-700" : "font-semibold text-red-700"}>
                {state.message}
              </p>
            ) : (
              <p className="text-slate-500">Save changes to update dashboard and restaurant profile data.</p>
            )}
          </div>
          <button
            type="submit"
            disabled={pending}
            className="inline-flex min-h-11 items-center justify-center rounded-sm bg-[#0F172A] px-5 text-sm font-semibold text-white transition hover:bg-[#1E293B] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </form>
  );
}
