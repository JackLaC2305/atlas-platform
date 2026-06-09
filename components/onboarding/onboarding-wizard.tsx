"use client";

import { startTransition, useActionState, useMemo, useState } from "react";

import { createRestaurantAction } from "@/app/onboarding/actions";
import { AtlasFullLogo, AtlasLogoMark } from "@/components/brand/atlas-logo";
import type { OnboardingActionState, OpeningHours } from "@/lib/onboarding/types";
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
  maxPdfSize,
  menuItemRanges,
  menuUpdateFrequencies,
  menuSetupMethods,
  primaryObjectives,
  restaurantTypes,
  seatingCapacityRanges,
  slugify,
  timezones,
} from "@/lib/onboarding/validation";

const steps = [
  "Business Details",
  "Contact & Location",
  "Social Links",
  "Operations",
  "Branding",
  "Menu Setup",
  "Business Intelligence",
  "Review",
];

const initialForm = {
  name: "",
  slug: "",
  restaurantType: "Fine Dining",
  cuisineType: "Irish",
  cuisineTypeOther: "",
  description: "",
  businessEmail: "",
  phone: "",
  website: "",
  addressLine1: "",
  addressLine2: "",
  city: "",
  countyOrState: "Dublin",
  countyOrStateOther: "",
  postcode: "",
  country: "Ireland",
  instagramHandle: "",
  facebookPage: "",
  tiktokHandle: "",
  xHandle: "",
  linkedinCompany: "",
  locationCountRange: "1",
  seatingCapacityRange: "40-79",
  currency: "EUR",
  timezone: "Europe/Dublin",
  primaryColour: "#0F172A",
  secondaryColour: "#334155",
  menuSetupMethod: "build_manually",
  existingMenuSource: "Printed Menu",
  approximateMenuItemsRange: "25-49",
  primaryObjective: "Update Menus Faster",
  averageWeeklyCovers: "",
  menuUpdateFrequency: "",
  inventoryMethod: "",
  posProvider: "",
  mainOperationalPainPoint: "",
  averageTransactionValue: "",
};

const initialActionState: OnboardingActionState = {
  status: "idle",
  message: "",
};

type FormState = typeof initialForm;
type FormKey = keyof FormState;
type FieldErrors = Partial<Record<FormKey | "logo" | "coverImage" | "menuPdf", string>>;

function Field({
  label,
  name,
  value,
  onChange,
  type = "text",
  placeholder,
  multiline = false,
  required = false,
  optional = false,
  helper,
  error,
}: {
  label: string;
  name: FormKey;
  value: string;
  onChange: (name: FormKey, value: string) => void;
  type?: string;
  placeholder?: string;
  multiline?: boolean;
  required?: boolean;
  optional?: boolean;
  helper?: string;
  error?: string;
}) {
  const baseClass =
    "mt-2 w-full rounded-sm border bg-white px-4 py-3 text-sm text-[#0F172A] outline-none transition placeholder:text-slate-400 focus:border-[#D4A017] focus:ring-2 focus:ring-[#D4A017]/20";

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
          placeholder={placeholder}
          rows={4}
          className={`${baseClass} ${error ? "border-red-300" : "border-slate-200"}`}
        />
      ) : (
        <input
          name={name}
          type={type}
          value={value}
          onChange={(event) => onChange(name, event.target.value)}
          placeholder={placeholder}
          className={`${baseClass} ${error ? "border-red-300" : "border-slate-200"}`}
        />
      )}
      {helper ? <span className="mt-2 block text-xs font-normal leading-5 text-slate-500">{helper}</span> : null}
      {error ? <span className="mt-2 block text-xs font-semibold text-red-600">{error}</span> : null}
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
  error,
}: {
  label: string;
  name: FormKey;
  value: string;
  options: string[];
  onChange: (name: FormKey, value: string) => void;
  required?: boolean;
  optional?: boolean;
  helper?: string;
  error?: string;
}) {
  return (
    <label className="block text-sm font-medium text-slate-700">
      <span>
        {label}
        {required ? <span className="ml-1 text-[#B87333]">*</span> : null}
        {optional ? <span className="ml-2 text-xs font-normal text-slate-400">Optional</span> : null}
      </span>
      <select
        name={name}
        value={value}
        onChange={(event) => onChange(name, event.target.value)}
        className={`mt-2 w-full rounded-sm border bg-white px-4 py-3 text-sm text-[#0F172A] outline-none transition focus:border-[#D4A017] focus:ring-2 focus:ring-[#D4A017]/20 ${
          error ? "border-red-300" : "border-slate-200"
        }`}
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
      {helper ? <span className="mt-2 block text-xs font-normal leading-5 text-slate-500">{helper}</span> : null}
      {error ? <span className="mt-2 block text-xs font-semibold text-red-600">{error}</span> : null}
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
          className="min-w-0 flex-1 px-4 py-3 text-sm text-[#0F172A] outline-none placeholder:text-slate-400"
          placeholder="handle"
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
  error,
}: {
  label: string;
  name: FormKey;
  value: string;
  onChange: (name: FormKey, value: string) => void;
  required?: boolean;
  optional?: boolean;
  error?: string;
}) {
  return (
    <label className="block text-sm font-medium text-slate-700">
      <span>
        {label}
        {required ? <span className="ml-1 text-[#B87333]">*</span> : null}
        {optional ? <span className="ml-2 text-xs font-normal text-slate-400">Optional</span> : null}
      </span>
      <div
        className={`mt-2 grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-sm border bg-white px-3 py-2 ${
          error ? "border-red-300" : "border-slate-200"
        }`}
      >
        <span
          className="h-8 w-8 rounded-sm border border-slate-200"
          style={{ backgroundColor: value }}
          aria-hidden="true"
        />
        <input
          type="text"
          name={name}
          value={value}
          onChange={(event) => onChange(name, event.target.value)}
          className="min-w-0 px-2 py-2 font-mono text-sm text-[#0F172A] outline-none"
          placeholder="#0F172A"
        />
        <input
          type="color"
          value={value}
          onChange={(event) => onChange(name, event.target.value.toUpperCase())}
          className="h-10 w-12 cursor-pointer rounded-sm border border-slate-200 bg-white p-1"
          aria-label={`${label} picker`}
        />
      </div>
      {error ? <span className="mt-2 block text-xs font-semibold text-red-600">{error}</span> : null}
    </label>
  );
}

function FileInput({
  label,
  name,
  accept,
  helper,
  onChange,
  required = false,
  file,
  error,
}: {
  label: string;
  name: string;
  accept: string;
  helper: string;
  onChange: (file: File | null) => void;
  required?: boolean;
  file: File | null;
  error?: string;
}) {
  return (
    <label
      className={`block rounded-sm border border-dashed bg-white p-5 text-sm font-medium text-slate-700 ${
        error ? "border-red-300" : "border-slate-300"
      }`}
    >
      {label}
      {required ? <span className="ml-1 text-[#B87333]">*</span> : null}
      <input
        name={name}
        type="file"
        accept={accept}
        onChange={(event) => onChange(event.target.files?.[0] ?? null)}
        className="mt-3 block w-full text-sm text-slate-600 file:mr-4 file:rounded-sm file:border-0 file:bg-[#0F172A] file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-[#1E293B]"
      />
      <span className="mt-3 block text-xs font-normal leading-5 text-slate-500">{helper}</span>
      {file ? (
        <span className="mt-3 block rounded-sm bg-[#FBFAF7] px-3 py-2 text-xs font-semibold text-[#0F172A]">
          Selected: {file.name}
        </span>
      ) : null}
      {error ? <span className="mt-3 block text-xs font-semibold text-red-600">{error}</span> : null}
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

  function applySplitHours(weekdayOpen: string, weekdayClose: string, weekendOpen: string, weekendClose: string) {
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

  const monday = openingHours.days[0];

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          ["same", "Same hours every day"],
          ["split", "Weekday/weekend split"],
          ["custom", "Custom by day"],
        ].map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => onChange({ ...openingHours, mode: value as OpeningHours["mode"] })}
            className={`rounded-sm border px-4 py-3 text-left text-sm font-semibold transition ${
              openingHours.mode === value
                ? "border-[#D4A017] bg-[#D4A017]/10 text-[#0F172A]"
                : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {openingHours.mode === "same" ? (
        <div className="grid gap-4 rounded-sm bg-white p-4 ring-1 ring-slate-200 sm:grid-cols-2">
          <label className="text-sm font-medium text-slate-700">
            Opens
            <input
              type="time"
              value={openingHours.days[0].open}
              onChange={(event) => applySameHours(event.target.value, openingHours.days[0].close)}
              className="mt-2 w-full rounded-sm border border-slate-200 px-4 py-3"
            />
          </label>
          <label className="text-sm font-medium text-slate-700">
            Closes
            <input
              type="time"
              value={openingHours.days[0].close}
              onChange={(event) => applySameHours(openingHours.days[0].open, event.target.value)}
              className="mt-2 w-full rounded-sm border border-slate-200 px-4 py-3"
            />
          </label>
        </div>
      ) : null}

      {openingHours.mode === "split" ? (
        <div className="grid gap-4 rounded-sm bg-white p-4 ring-1 ring-slate-200 sm:grid-cols-2">
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
              className="rounded-sm border border-slate-200 px-4 py-3"
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
              className="rounded-sm border border-slate-200 px-4 py-3"
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
              className="rounded-sm border border-slate-200 px-4 py-3"
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
              className="rounded-sm border border-slate-200 px-4 py-3"
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
          className="rounded-sm border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-[#0F172A] hover:bg-[#FBFAF7]"
        >
          Copy Monday to all days
        </button>
      ) : null}

      <div className="grid gap-3">
        {openingHours.days.map((day, index) => (
          <div
            key={day.day}
            className="grid gap-3 rounded-sm bg-white p-4 ring-1 ring-slate-200 sm:grid-cols-[1fr_auto_auto_auto]"
          >
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-semibold text-[#0F172A]">{day.day}</span>
              <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-500 sm:hidden">
                <input
                  type="checkbox"
                  checked={day.closed}
                  onChange={(event) => updateDay(index, { closed: event.target.checked })}
                />
                Closed
              </label>
            </div>
            <input
              type="time"
              value={day.open}
              disabled={day.closed || openingHours.mode !== "custom"}
              onChange={(event) => updateDay(index, { open: event.target.value })}
              className="rounded-sm border border-slate-200 px-3 py-2 text-sm disabled:bg-slate-50 disabled:text-slate-400"
            />
            <input
              type="time"
              value={day.close}
              disabled={day.closed || openingHours.mode !== "custom"}
              onChange={(event) => updateDay(index, { close: event.target.value })}
              className="rounded-sm border border-slate-200 px-3 py-2 text-sm disabled:bg-slate-50 disabled:text-slate-400"
            />
            <label className="hidden items-center gap-2 text-xs font-medium text-slate-500 sm:inline-flex">
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

function formatFile(file: File | null) {
  if (!file) {
    return "Not uploaded";
  }

  return `${file.name} (${Math.max(1, Math.round(file.size / 1024))}KB)`;
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-b border-slate-200 py-3 last:border-b-0">
      <dt className="text-xs font-semibold text-slate-500">{label}</dt>
      <dd className="mt-1 text-sm text-[#0F172A]">{value || "Not provided"}</dd>
    </div>
  );
}

function titleCase(value: string) {
  return value
    .replaceAll("_", " ")
    .split(" ")
    .map((word) => (word ? `${word[0].toUpperCase()}${word.slice(1)}` : word))
    .join(" ")
    .replaceAll("Pdf", "PDF")
    .replaceAll("Pos", "POS");
}

function formatOpeningHours(hours: OpeningHours) {
  const openDays = hours.days.filter((day) => !day.closed);
  if (openDays.length === 0) {
    return "All days marked closed";
  }

  const first = openDays[0];
  return `${titleCase(hours.mode)} · ${openDays.length} open day(s) · ${first.open}-${first.close}`;
}

export function OnboardingWizard({
  fullName,
  logoutAction,
}: {
  fullName: string;
  logoutAction: () => Promise<void>;
}) {
  const [actionState, formAction, pending] = useActionState(
    createRestaurantAction,
    initialActionState,
  );
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormState>(initialForm);
  const [openingHours, setOpeningHours] = useState<OpeningHours>(defaultOpeningHours);
  const [logo, setLogo] = useState<File | null>(null);
  const [coverImage, setCoverImage] = useState<File | null>(null);
  const [menuPdf, setMenuPdf] = useState<File | null>(null);
  const [colourSuggestions, setColourSuggestions] = useState<string[]>([]);
  const [clientError, setClientError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [logoPreviewUrl, setLogoPreviewUrl] = useState("");
  const [coverPreviewUrl, setCoverPreviewUrl] = useState("");

  const publicPath = useMemo(() => `/r/${form.slug || "restaurant-slug"}`, [form.slug]);

  function updateField(name: FormKey, value: string) {
    setForm((current) => {
      if (name === "name" && (!current.slug || current.slug === slugify(current.name))) {
        return { ...current, name: value, slug: slugify(value) };
      }

      if (name === "slug") {
        return { ...current, slug: slugify(value) };
      }

      if (name === "country") {
        return {
          ...current,
          country: value,
          countyOrState: value === "Ireland" ? "Dublin" : "",
          countyOrStateOther: "",
        };
      }

      if (name === "currency") {
        return { ...current, currency: value, averageTransactionValue: "" };
      }

      return { ...current, [name]: value };
    });
  }

  function validateStep(targetStep = step) {
    const errors: FieldErrors = {};

    if (targetStep === 0) {
      if (form.name.trim().length < 2) errors.name = "Enter the restaurant name.";
      if (!form.restaurantType) errors.restaurantType = "Select a restaurant type.";
      if (!form.slug.trim()) errors.slug = "Enter a public URL slug.";
      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(form.slug)) {
        errors.slug = "Use lowercase letters, numbers, and hyphens only.";
      }
      if (!form.cuisineType) errors.cuisineType = "Select a cuisine type.";
      if (form.cuisineType === "Other" && form.cuisineTypeOther.trim().length < 2) {
        errors.cuisineTypeOther = "Enter the cuisine type.";
      }
      if (form.description.trim().length < 20) {
        errors.description = "Enter at least 20 characters.";
      }
    }

    if (targetStep === 1) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.businessEmail)) {
        errors.businessEmail = "Enter a valid business email.";
      }
      if (!form.phone.trim()) errors.phone = "Enter a business phone number.";
      if (form.website && !/^https?:\/\/.+/i.test(form.website)) {
        errors.website = "Website must start with http:// or https://.";
      }
      if (!form.addressLine1.trim()) errors.addressLine1 = "Enter address line 1.";
      if (!form.city.trim()) errors.city = "Enter the city.";
      if (!form.country) errors.country = "Select the country.";
      if (form.country === "Ireland" && !form.countyOrState) {
        errors.countyOrState = "Select a county.";
      }
      if (form.country === "Other" && !form.countyOrStateOther.trim()) {
        errors.countyOrStateOther = "Enter the county, state, or region.";
      }
    }

    if (targetStep === 3) {
      if (!form.locationCountRange) errors.locationCountRange = "Select the number of locations.";
      if (!form.seatingCapacityRange) errors.seatingCapacityRange = "Select seating capacity.";
      if (!form.currency) errors.currency = "Select currency.";
      if (!form.timezone) errors.timezone = "Select timezone.";
    }

    if (targetStep === 4) {
      if (!/^#[0-9A-Fa-f]{6}$/.test(form.primaryColour)) {
        errors.primaryColour = "Choose a valid hex colour.";
      }
      if (!logo) {
        errors.logo = "Upload a restaurant logo.";
      } else if (!imageMimeTypes.includes(logo.type) || logo.size > maxLogoSize) {
        errors.logo = "Logo must be PNG, JPG, or WebP and 2MB or smaller.";
      }

      if (coverImage && (!imageMimeTypes.includes(coverImage.type) || coverImage.size > maxCoverSize)) {
        errors.coverImage = "Cover image must be PNG, JPG, or WebP and 5MB or smaller.";
      }
    }

    if (targetStep === 5 && form.menuSetupMethod === "import_pdf") {
      if (!menuPdf) {
        errors.menuPdf = "Upload a PDF menu or choose another menu setup method.";
      } else if (menuPdf.type !== "application/pdf" || menuPdf.size > maxPdfSize) {
        errors.menuPdf = "PDF menu must be 10MB or smaller.";
      }
    }

    if (targetStep === 6) {
      if (!form.existingMenuSource) errors.existingMenuSource = "Select the existing menu source.";
      if (!form.approximateMenuItemsRange) {
        errors.approximateMenuItemsRange = "Select the approximate number of menu items.";
      }
      if (!form.primaryObjective) errors.primaryObjective = "Select the primary objective.";
      if (form.averageWeeklyCovers && !averageWeeklyCoverRanges.includes(form.averageWeeklyCovers)) {
        errors.averageWeeklyCovers = "Select a valid range.";
      }
      if (
        form.averageTransactionValue &&
        !averageTransactionValueRanges(form.currency).includes(form.averageTransactionValue)
      ) {
        errors.averageTransactionValue = "Select a valid range.";
      }
    }

    setFieldErrors(errors);

    if (Object.keys(errors).length > 0) {
      setClientError("Complete the required fields before continuing.");
      return false;
    }

    setClientError("");
    return true;
  }

  function nextStep() {
    if (validateStep()) {
      setStep((current) => Math.min(current + 1, steps.length - 1));
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  function previousStep() {
    setClientError("");
    setStep((current) => Math.max(current - 1, 0));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function extractColours(file: File | null) {
    setLogo(file);
    setColourSuggestions([]);
    setLogoPreviewUrl(file ? URL.createObjectURL(file) : "");

    if (!file || !imageMimeTypes.includes(file.type)) {
      return;
    }

    const image = new Image();
    const url = URL.createObjectURL(file);

    image.onload = () => {
      const canvas = document.createElement("canvas");
      const size = 48;
      canvas.width = size;
      canvas.height = size;
      const context = canvas.getContext("2d");
      if (!context) {
        URL.revokeObjectURL(url);
        return;
      }

      context.drawImage(image, 0, 0, size, size);
      const pixels = context.getImageData(0, 0, size, size).data;
      const buckets = new Map<string, number>();

      for (let index = 0; index < pixels.length; index += 16) {
        const alpha = pixels[index + 3];
        if (alpha < 180) {
          continue;
        }

        const red = Math.round(pixels[index] / 32) * 32;
        const green = Math.round(pixels[index + 1] / 32) * 32;
        const blue = Math.round(pixels[index + 2] / 32) * 32;
        const brightness = red + green + blue;
        if (brightness < 80 || brightness > 700) {
          continue;
        }

        const hex = `#${[red, green, blue]
          .map((value) => Math.min(255, value).toString(16).padStart(2, "0"))
          .join("")}`;
        buckets.set(hex, (buckets.get(hex) ?? 0) + 1);
      }

      setColourSuggestions(
        [...buckets.entries()]
          .sort((first, second) => second[1] - first[1])
          .slice(0, 4)
          .map(([hex]) => hex),
      );
      URL.revokeObjectURL(url);
    };

    image.src = url;
  }

  function updateCoverImage(file: File | null) {
    setCoverImage(file);
    setCoverPreviewUrl(file ? URL.createObjectURL(file) : "");
  }

  function socialUrl(prefix: string, value: string) {
    const cleaned = value.trim().replace(/^@/, "");
    return cleaned ? `${prefix}${cleaned}` : "";
  }

  function finalCuisineType() {
    return form.cuisineType === "Other" ? form.cuisineTypeOther.trim() : form.cuisineType;
  }

  function finalCountyOrState() {
    return form.country === "Other" ? form.countyOrStateOther.trim() : form.countyOrState;
  }

  function buildSubmissionFormData(formElement: HTMLFormElement) {
    const formData = new FormData(formElement);
    formData.set("cuisineType", finalCuisineType());
    formData.set("countyOrState", finalCountyOrState());
    formData.set("instagramUrl", socialUrl("https://instagram.com/", form.instagramHandle));
    formData.set("facebookUrl", socialUrl("https://facebook.com/", form.facebookPage));
    formData.set("tiktokUrl", socialUrl("https://tiktok.com/@", form.tiktokHandle));
    formData.set("xUrl", socialUrl("https://x.com/", form.xHandle));
    formData.set("linkedinUrl", socialUrl("https://linkedin.com/company/", form.linkedinCompany));

    if (logo) formData.set("logo", logo);
    if (coverImage) formData.set("coverImage", coverImage);
    if (menuPdf) formData.set("menuPdf", menuPdf);

    return formData;
  }

  function validateAllBeforeSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    for (let index = 0; index < steps.length - 1; index += 1) {
      if (!validateStep(index)) {
        setStep(index);
        return;
      }
    }

    const formData = buildSubmissionFormData(event.currentTarget);
    startTransition(() => {
      formAction(formData);
    });
  }

  return (
    <main className="min-h-screen bg-[#FBFAF7] text-[#0F172A]">
      <header className="border-b border-slate-200/80 bg-white">
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 sm:px-8 lg:px-10">
          <AtlasFullLogo />
          <div className="flex items-center gap-4">
            <div className="hidden text-right text-sm text-slate-500 sm:block">
              <span className="block font-medium text-[#0F172A]">Restaurant onboarding</span>
              <span>{fullName || "Atlas workspace"}</span>
            </div>
            <form action={logoutAction}>
              <button
                type="submit"
                className="inline-flex min-h-10 items-center justify-center rounded-sm border border-slate-300 px-4 text-sm font-semibold text-[#0F172A] transition hover:border-[#0F172A] hover:bg-[#FBFAF7] focus:outline-none focus:ring-2 focus:ring-[#0F172A] focus:ring-offset-2"
              >
                Log out
              </button>
            </form>
          </div>
        </nav>
      </header>

      <section className="mx-auto grid max-w-7xl gap-8 px-5 py-8 sm:px-8 lg:grid-cols-[320px_1fr] lg:px-10 lg:py-10">
        <aside className="lg:sticky lg:top-8 lg:self-start">
          <div className="rounded-sm bg-[#0F172A] p-6 text-white shadow-sm">
            <AtlasLogoMark tone="dark" />
            <p className="mt-8 text-sm font-medium text-[#D4A017]">Atlas by Martello Hospitality</p>
            <h1 className="mt-3 text-3xl font-semibold leading-tight">
              Create your restaurant operating profile.
            </h1>
            <p className="mt-4 text-sm leading-6 text-slate-300">
              Set the business, brand, hours, and menu import foundation needed before
              Atlas opens the rest of the platform.
            </p>
          </div>

          <ol className="mt-5 space-y-2 rounded-sm bg-white p-4 ring-1 ring-slate-200">
            {steps.map((label, index) => (
              <li key={label}>
                <button
                  type="button"
                  onClick={() => {
                    if (index <= step) {
                      setStep(index);
                      return;
                    }

                    if (index === step + 1 && validateStep()) {
                      setStep(index);
                    }
                  }}
                  className={`flex w-full items-center gap-3 rounded-sm px-3 py-2 text-left text-sm transition ${
                    step === index
                      ? "bg-[#0F172A] text-white"
                      : index < step
                        ? "text-[#0F172A] hover:bg-slate-50"
                        : "text-slate-500"
                  }`}
                >
                  <span
                    className={`grid h-7 w-7 shrink-0 place-items-center rounded-sm border text-xs font-semibold ${
                      step === index ? "border-white/30" : "border-slate-200"
                    }`}
                  >
                    {index + 1}
                  </span>
                  {label}
                </button>
              </li>
            ))}
          </ol>
        </aside>

        <form action={formAction} onSubmit={validateAllBeforeSubmit} className="min-w-0">
          <input name="openingHours" type="hidden" value={JSON.stringify(openingHours)} />

          <div className="rounded-sm bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-8">
            <div className="mb-7 flex flex-col gap-3 border-b border-slate-200 pb-6 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-sm font-medium text-[#9A7412]">
                  Step {step + 1} of {steps.length}
                </p>
                <h2 className="mt-2 text-3xl font-semibold leading-tight">{steps[step]}</h2>
                <p className="mt-3 text-sm text-slate-500">
                  <span className="text-[#B87333]">*</span> Required fields
                </p>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-100 sm:w-52">
                <div
                  className="h-full bg-[#D4A017] transition-all"
                  style={{ width: `${((step + 1) / steps.length) * 100}%` }}
                />
              </div>
            </div>

            {(clientError || actionState.status === "error") && (
              <div className="mb-6 rounded-sm border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {clientError || actionState.message}
              </div>
            )}

            <section hidden={step !== 0} className="grid gap-5 sm:grid-cols-2">
              <Field
                label="Restaurant name"
                name="name"
                value={form.name}
                onChange={updateField}
                required
                error={fieldErrors.name}
              />
              <SelectField
                label="Restaurant type"
                name="restaurantType"
                value={form.restaurantType}
                options={restaurantTypes}
                onChange={updateField}
                required
                error={fieldErrors.restaurantType}
              />
              <SelectField
                label="Cuisine type"
                name="cuisineType"
                value={form.cuisineType}
                options={cuisineTypes}
                onChange={updateField}
                required
                error={fieldErrors.cuisineType}
              />
              {form.cuisineType === "Other" ? (
                <Field
                  label="Custom cuisine type"
                  name="cuisineTypeOther"
                  value={form.cuisineTypeOther}
                  onChange={updateField}
                  required
                  error={fieldErrors.cuisineTypeOther}
                />
              ) : null}
              <Field
                label="Public URL slug"
                name="slug"
                value={form.slug}
                onChange={updateField}
                required
                helper="This creates your future public Atlas menu URL, such as /r/restaurant-name. Atlas checks uniqueness when the restaurant is created."
                error={fieldErrors.slug}
              />
              <div className="sm:col-span-2">
                <Field
                  label="Short description"
                  name="description"
                  value={form.description}
                  onChange={updateField}
                  multiline
                  required
                  placeholder="A concise public description of the restaurant."
                  error={fieldErrors.description}
                />
                <p className="mt-2 text-xs text-slate-500">Public URL preview: {publicPath}</p>
              </div>
            </section>

            <section hidden={step !== 1} className="grid gap-5 sm:grid-cols-2">
              <Field
                label="Business email"
                name="businessEmail"
                value={form.businessEmail}
                onChange={updateField}
                type="email"
                required
                error={fieldErrors.businessEmail}
              />
              <Field
                label="Phone"
                name="phone"
                value={form.phone}
                onChange={updateField}
                type="tel"
                required
                error={fieldErrors.phone}
              />
              <Field
                label="Website"
                name="website"
                value={form.website}
                onChange={updateField}
                placeholder="https://example.com"
                optional
                error={fieldErrors.website}
              />
              <Field
                label="Address line 1"
                name="addressLine1"
                value={form.addressLine1}
                onChange={updateField}
                required
                error={fieldErrors.addressLine1}
              />
              <Field label="Address line 2" name="addressLine2" value={form.addressLine2} onChange={updateField} optional />
              <Field label="City" name="city" value={form.city} onChange={updateField} required error={fieldErrors.city} />
              <SelectField
                label="Country"
                name="country"
                value={form.country}
                options={countries}
                onChange={updateField}
                required
                error={fieldErrors.country}
              />
              {form.country === "Ireland" ? (
                <SelectField
                  label="County"
                  name="countyOrState"
                  value={form.countyOrState}
                  options={irishCounties}
                  onChange={updateField}
                  required
                  error={fieldErrors.countyOrState}
                />
              ) : form.country === "Other" ? (
                <Field
                  label="County/state/region"
                  name="countyOrStateOther"
                  value={form.countyOrStateOther}
                  onChange={updateField}
                  required
                  error={fieldErrors.countyOrStateOther}
                />
              ) : (
                <Field
                  label="County/state"
                  name="countyOrState"
                  value={form.countyOrState}
                  onChange={updateField}
                  optional
                />
              )}
              <Field label="Postcode" name="postcode" value={form.postcode} onChange={updateField} optional />
            </section>

            <section hidden={step !== 2} className="grid gap-5 sm:grid-cols-2">
              <div className="sm:col-span-2 rounded-sm bg-[#FBFAF7] p-4 text-sm leading-6 text-slate-600 ring-1 ring-slate-200">
                Enter handles or page names only. Atlas saves the complete public URLs.
              </div>
              <SocialField label="Instagram" prefix="instagram.com/" name="instagramHandle" value={form.instagramHandle} onChange={updateField} />
              <SocialField label="Facebook" prefix="facebook.com/" name="facebookPage" value={form.facebookPage} onChange={updateField} />
              <SocialField label="TikTok" prefix="tiktok.com/@" name="tiktokHandle" value={form.tiktokHandle} onChange={updateField} />
              <SocialField label="X/Twitter" prefix="x.com/" name="xHandle" value={form.xHandle} onChange={updateField} />
              <SocialField label="LinkedIn" prefix="linkedin.com/company/" name="linkedinCompany" value={form.linkedinCompany} onChange={updateField} />
            </section>

            <section hidden={step !== 3} className="space-y-6">
              <div className="grid gap-5 sm:grid-cols-2">
                <SelectField label="Number of locations" name="locationCountRange" value={form.locationCountRange} options={locationCountRanges} onChange={updateField} required error={fieldErrors.locationCountRange} />
                <SelectField label="Rough seating capacity" name="seatingCapacityRange" value={form.seatingCapacityRange} options={seatingCapacityRanges} onChange={updateField} required error={fieldErrors.seatingCapacityRange} />
                <SelectField label="Currency" name="currency" value={form.currency} options={currencies} onChange={updateField} required error={fieldErrors.currency} />
                <SelectField label="Timezone" name="timezone" value={form.timezone} options={timezones} onChange={updateField} required error={fieldErrors.timezone} />
              </div>
              <div className="rounded-sm bg-[#FBFAF7] p-4 text-sm leading-6 text-slate-600 ring-1 ring-slate-200">
                Start with a simple pattern, then switch to custom by day only if the restaurant needs exceptions.
              </div>
              <OpeningHoursEditor openingHours={openingHours} onChange={setOpeningHours} />
            </section>

            <section hidden={step !== 4} className="space-y-6">
              <div className="grid gap-5 lg:grid-cols-2">
                <FileInput
                  label="Logo upload"
                  name="logo"
                  accept={imageMimeTypes.join(",")}
                  helper="Required. PNG, JPG, or WebP up to 2MB."
                  onChange={extractColours}
                  required
                  file={logo}
                  error={fieldErrors.logo}
                />
                <FileInput
                  label="Cover image upload"
                  name="coverImage"
                  accept={imageMimeTypes.join(",")}
                  helper="Optional. PNG, JPG, or WebP up to 5MB. This image will be used as the visual header for your future public digital menu and customer-facing restaurant profile."
                  onChange={updateCoverImage}
                  file={coverImage}
                  error={fieldErrors.coverImage}
                />
              </div>
              {logoPreviewUrl ? (
                <div className="rounded-sm bg-[#FBFAF7] p-4 ring-1 ring-slate-200">
                  <p className="text-sm font-semibold text-[#0F172A]">Logo preview</p>
                  <div className="mt-3 flex items-center gap-4">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={logoPreviewUrl}
                      alt="Uploaded restaurant logo preview"
                      className="h-20 w-20 rounded-sm border border-slate-200 bg-white object-contain p-2"
                    />
                    <div>
                      <p className="text-sm font-medium text-[#0F172A]">{logo?.name}</p>
                      <p className="mt-1 text-xs text-slate-500">This logo will be stored with the restaurant profile.</p>
                    </div>
                  </div>
                </div>
              ) : null}
              {coverPreviewUrl ? (
                <div className="rounded-sm bg-[#FBFAF7] p-4 ring-1 ring-slate-200">
                  <p className="text-sm font-semibold text-[#0F172A]">Cover image preview</p>
                  <div className="mt-3 overflow-hidden rounded-sm border border-slate-200 bg-white">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={coverPreviewUrl}
                      alt="Uploaded cover image preview"
                      className="h-44 w-full object-cover"
                    />
                  </div>
                  <p className="mt-3 text-sm font-medium text-[#0F172A]">{coverImage?.name}</p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    This image will be used as the visual header for your future public digital menu and customer-facing restaurant profile.
                  </p>
                </div>
              ) : null}
              <div className="grid gap-5 sm:grid-cols-2">
                <ColourField label="Primary brand colour" name="primaryColour" value={form.primaryColour} onChange={updateField} required error={fieldErrors.primaryColour} />
                <ColourField label="Secondary brand colour" name="secondaryColour" value={form.secondaryColour} onChange={updateField} optional />
              </div>
              {colourSuggestions.length > 0 ? (
                <div className="rounded-sm bg-[#FBFAF7] p-4 ring-1 ring-slate-200">
                  <p className="text-sm font-semibold text-[#0F172A]">Logo colour suggestions</p>
                  <div className="mt-3 flex flex-wrap gap-3">
                    {colourSuggestions.map((colour) => (
                      <button
                        key={colour}
                        type="button"
                        onClick={() => updateField("primaryColour", colour.toUpperCase())}
                        className={`inline-flex items-center gap-2 rounded-sm border px-3 py-2 text-sm font-medium transition ${
                          form.primaryColour.toLowerCase() === colour.toLowerCase()
                            ? "border-[#D4A017] bg-[#D4A017]/10 text-[#0F172A]"
                            : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                        }`}
                      >
                        <span className="h-5 w-5 rounded-sm border border-slate-200" style={{ backgroundColor: colour }} />
                        {colour.toUpperCase()}
                        {form.primaryColour.toLowerCase() === colour.toLowerCase() ? (
                          <span className="rounded-sm bg-white px-2 py-0.5 text-[11px] font-semibold text-[#9A7412]">
                            Applied
                          </span>
                        ) : null}
                      </button>
                    ))}
                  </div>
                  <p className="mt-3 text-xs font-medium text-slate-500">
                    Selected primary colour: {form.primaryColour}
                  </p>
                </div>
              ) : null}
            </section>

            <section hidden={step !== 5} className="space-y-6">
              <div className="grid gap-4 lg:grid-cols-3">
                {menuSetupMethods.map((method) => (
                  <label
                    key={method.value}
                    className={`rounded-sm border p-5 text-sm transition ${
                      form.menuSetupMethod === method.value
                        ? "border-[#D4A017] bg-[#D4A017]/10"
                        : "border-slate-200 bg-white"
                    }`}
                  >
                    <input
                      type="radio"
                      name="menuSetupMethod"
                      value={method.value}
                      checked={form.menuSetupMethod === method.value}
                      onChange={(event) => {
                        updateField("menuSetupMethod", event.target.value);
                        if (event.target.value !== "import_pdf") {
                          setMenuPdf(null);
                        }
                      }}
                      className="mr-2"
                    />
                    <span className="font-semibold text-[#0F172A]">{method.label}</span>
                    <span className="mt-4 block text-xs font-semibold text-emerald-700">
                      Best for: {method.pros}
                    </span>
                    <span className="mt-2 block text-xs leading-5 text-slate-500">
                      Consideration: {method.cons}
                    </span>
                  </label>
                ))}
              </div>
              {form.menuSetupMethod === "import_pdf" ? (
                <div className="space-y-4">
                  <FileInput
                    label="PDF menu upload"
                    name="menuPdf"
                    accept="application/pdf"
                    helper="Required for PDF import. PDF up to 10MB."
                    onChange={setMenuPdf}
                    required
                    file={menuPdf}
                    error={fieldErrors.menuPdf}
                  />
                  <p className="rounded-sm bg-[#FBFAF7] p-4 text-sm leading-6 text-slate-600 ring-1 ring-slate-200">
                    PDF import will prepare the menu for review in the next product step.
                    Atlas is not performing menu extraction in this slice.
                  </p>
                </div>
              ) : (
                <input name="menuPdf" type="file" className="hidden" aria-hidden="true" />
              )}
            </section>

            <section hidden={step !== 6} className="grid gap-5 sm:grid-cols-2">
              <SelectField label="Existing menu source" name="existingMenuSource" value={form.existingMenuSource} options={existingMenuSources} onChange={updateField} required error={fieldErrors.existingMenuSource} />
              <SelectField label="Approximate number of menu items" name="approximateMenuItemsRange" value={form.approximateMenuItemsRange} options={menuItemRanges} onChange={updateField} required error={fieldErrors.approximateMenuItemsRange} />
              <SelectField label="Primary objective" name="primaryObjective" value={form.primaryObjective} options={primaryObjectives} onChange={updateField} required error={fieldErrors.primaryObjective} />
              <SelectField
                label="Average weekly covers"
                name="averageWeeklyCovers"
                value={form.averageWeeklyCovers}
                options={["", ...averageWeeklyCoverRanges]}
                onChange={updateField}
                optional
                helper="Approximate number of customers served per week."
                error={fieldErrors.averageWeeklyCovers}
              />
              <SelectField label="Current menu update frequency" name="menuUpdateFrequency" value={form.menuUpdateFrequency} options={["", ...menuUpdateFrequencies]} onChange={updateField} optional />
              <SelectField label="Current inventory method" name="inventoryMethod" value={form.inventoryMethod} options={["", ...inventoryMethods]} onChange={updateField} optional />
              <Field label="Current POS provider" name="posProvider" value={form.posProvider} onChange={updateField} optional placeholder="Toast, Lightspeed, Square..." />
              <SelectField
                label="Average transaction value"
                name="averageTransactionValue"
                value={form.averageTransactionValue}
                options={["", ...averageTransactionValueRanges(form.currency)]}
                onChange={updateField}
                optional
                helper={`Shown in ${form.currency} based on the Operations currency selection.`}
                error={fieldErrors.averageTransactionValue}
              />
              <div className="sm:col-span-2">
                <Field
                  label="Main operational pain point"
                  name="mainOperationalPainPoint"
                  value={form.mainOperationalPainPoint}
                  onChange={updateField}
                  multiline
                  optional
                  placeholder="A concise note about the operational issue Atlas should help address first."
                />
              </div>
            </section>

            <section hidden={step !== 7} className="grid gap-6 lg:grid-cols-2">
              <dl className="rounded-sm bg-[#FBFAF7] p-5 ring-1 ring-slate-200">
                <ReviewRow label="Restaurant" value={`${form.name} · ${form.restaurantType}`} />
                <ReviewRow label="Cuisine" value={finalCuisineType()} />
                <ReviewRow label="Description" value={form.description} />
                <ReviewRow label="Public URL" value={publicPath} />
                <ReviewRow label="Contact" value={`${form.businessEmail} · ${form.phone}`} />
                <ReviewRow label="Location" value={`${form.addressLine1}, ${form.city}, ${finalCountyOrState()}, ${form.country}`} />
                <ReviewRow
                  label="Socials"
                  value={[
                    socialUrl("https://instagram.com/", form.instagramHandle),
                    socialUrl("https://facebook.com/", form.facebookPage),
                    socialUrl("https://tiktok.com/@", form.tiktokHandle),
                    socialUrl("https://x.com/", form.xHandle),
                    socialUrl("https://linkedin.com/company/", form.linkedinCompany),
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                />
              </dl>
              <dl className="rounded-sm bg-[#FBFAF7] p-5 ring-1 ring-slate-200">
                <ReviewRow label="Operations" value={`${form.locationCountRange} location(s) · ${form.seatingCapacityRange} seats`} />
                <ReviewRow label="Opening hours" value={formatOpeningHours(openingHours)} />
                <ReviewRow label="Currency/timezone" value={`${form.currency} · ${form.timezone}`} />
                <div className="border-b border-slate-200 py-3">
                  <dt className="text-xs font-semibold text-slate-500">Brand Colours</dt>
                  <dd className="mt-2 flex flex-wrap gap-3 text-sm text-[#0F172A]">
                    {[form.primaryColour, form.secondaryColour].filter(Boolean).map((colour) => (
                      <span key={colour} className="inline-flex items-center gap-2 rounded-sm bg-white px-3 py-2 ring-1 ring-slate-200">
                        <span className="h-5 w-5 rounded-sm border border-slate-200" style={{ backgroundColor: colour }} />
                        {colour}
                      </span>
                    ))}
                  </dd>
                </div>
                <ReviewRow label="Menu setup" value={menuSetupMethods.find((method) => method.value === form.menuSetupMethod)?.label ?? form.menuSetupMethod} />
                <div className="border-b border-slate-200 py-3">
                  <dt className="text-xs font-semibold text-slate-500">Uploaded Files</dt>
                  <dd className="mt-2 grid gap-3 text-sm text-[#0F172A] sm:grid-cols-2">
                    <div className="rounded-sm bg-white p-3 ring-1 ring-slate-200">
                      <p className="text-xs font-semibold text-slate-500">Logo</p>
                      {logoPreviewUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={logoPreviewUrl} alt="Logo preview" className="mt-2 h-16 w-16 rounded-sm object-contain" />
                      ) : null}
                      <p className="mt-2 text-xs">{formatFile(logo)}</p>
                    </div>
                    <div className="rounded-sm bg-white p-3 ring-1 ring-slate-200">
                      <p className="text-xs font-semibold text-slate-500">Cover Image</p>
                      {coverPreviewUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={coverPreviewUrl} alt="Cover preview" className="mt-2 h-16 w-full rounded-sm object-cover" />
                      ) : null}
                      <p className="mt-2 text-xs">{formatFile(coverImage)}</p>
                    </div>
                    <div className="rounded-sm bg-white p-3 ring-1 ring-slate-200 sm:col-span-2">
                      <p className="text-xs font-semibold text-slate-500">PDF Menu</p>
                      <p className="mt-2 text-xs">{formatFile(menuPdf)}</p>
                    </div>
                  </dd>
                </div>
                <ReviewRow
                  label="Business intelligence"
                  value={[
                    form.existingMenuSource,
                    form.approximateMenuItemsRange,
                    form.primaryObjective,
                    form.averageWeeklyCovers ? `${form.averageWeeklyCovers} weekly covers` : "",
                    form.menuUpdateFrequency,
                    form.inventoryMethod,
                    form.posProvider,
                    form.averageTransactionValue ? `${form.averageTransactionValue} ATV` : "",
                    form.mainOperationalPainPoint,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                />
              </dl>
            </section>

            <div className="mt-8 flex flex-col-reverse gap-3 border-t border-slate-200 pt-6 sm:flex-row sm:justify-between">
              <button
                type="button"
                onClick={previousStep}
                disabled={step === 0 || pending}
                className="inline-flex min-h-11 items-center justify-center rounded-sm border border-slate-300 px-5 text-sm font-semibold text-[#0F172A] transition hover:bg-[#FBFAF7] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Back
              </button>
              {step < steps.length - 1 ? (
                <button
                  type="button"
                  onClick={nextStep}
                  disabled={pending}
                  className="inline-flex min-h-11 items-center justify-center rounded-sm bg-[#0F172A] px-5 text-sm font-semibold text-white transition hover:bg-[#1E293B] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Save and continue
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={pending}
                  className="inline-flex min-h-11 items-center justify-center rounded-sm bg-[#0F172A] px-5 text-sm font-semibold text-white transition hover:bg-[#1E293B] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {pending ? "Creating restaurant..." : "Create restaurant"}
                </button>
              )}
            </div>
          </div>
        </form>
      </section>
    </main>
  );
}
