import type { OpeningHours } from "./types";

export const restaurantTypes = [
  "Fine Dining",
  "Casual Dining",
  "Hotel Restaurant",
  "Bar Or Pub",
  "Cafe",
  "Quick Service",
  "Multi-Site Group",
  "Other",
];

export const cuisineTypes = [
  "Italian",
  "Irish",
  "French",
  "Spanish",
  "Indian",
  "Chinese",
  "Japanese",
  "Thai",
  "Mexican",
  "Mediterranean",
  "Seafood",
  "Steakhouse",
  "Cafe",
  "Pub Food",
  "Fast Food",
  "Fine Dining",
  "Casual Dining",
  "Other",
];

export const countries = [
  "Ireland",
  "United Kingdom",
  "United States",
  "United Arab Emirates",
  "France",
  "Spain",
  "Italy",
  "Germany",
  "Other",
];

export const irishCounties = [
  "Antrim",
  "Armagh",
  "Carlow",
  "Cavan",
  "Clare",
  "Cork",
  "Derry",
  "Donegal",
  "Down",
  "Dublin",
  "Fermanagh",
  "Galway",
  "Kerry",
  "Kildare",
  "Kilkenny",
  "Laois",
  "Leitrim",
  "Limerick",
  "Longford",
  "Louth",
  "Mayo",
  "Meath",
  "Monaghan",
  "Offaly",
  "Roscommon",
  "Sligo",
  "Tipperary",
  "Tyrone",
  "Waterford",
  "Westmeath",
  "Wexford",
  "Wicklow",
];

export const locationCountRanges = ["1", "2-3", "4-9", "10+"];

export const seatingCapacityRanges = ["Under 40", "40-79", "80-149", "150-249", "250+"];

export const currencies = ["EUR", "GBP", "USD", "AED"];

export const timezones = [
  "Europe/Dublin",
  "Europe/London",
  "Europe/Paris",
  "Europe/Madrid",
  "Europe/Rome",
  "America/New_York",
];

export const menuSetupMethods = [
  {
    value: "build_manually",
    label: "Build Manually",
    pros: "Most accurate for launch and best for structured menu control.",
    cons: "Requires more initial entry time.",
  },
  {
    value: "import_pdf",
    label: "Import from PDF",
    pros: "Uses your existing menu file to prepare the menu for review.",
    cons: "Requires review before future menu tools are opened.",
  },
  {
    value: "import_later",
    label: "Import Later",
    pros: "Lets the restaurant profile go live before menu setup.",
    cons: "Menu setup remains pending in the dashboard checklist.",
  },
];

export const existingMenuSources = [
  "Printed Menu",
  "PDF Menu",
  "Website Menu",
  "POS Export",
  "Spreadsheet",
  "Not Centralised",
];

export const menuItemRanges = ["Under 25", "25-49", "50-99", "100-199", "200+"];

export const primaryObjectives = [
  "Replace Printed Menus",
  "Update Menus Faster",
  "Reduce Costs",
  "Improve Customer Experience",
  "Modernise Operations",
  "Track Menu And Inventory Performance",
];

export const menuUpdateFrequencies = [
  "Daily",
  "Weekly",
  "Monthly",
  "Seasonally",
  "Rarely",
  "As Needed",
];

export const inventoryMethods = [
  "Spreadsheet",
  "POS Reports",
  "Manual Counts",
  "Inventory Software",
  "Supplier Records",
  "Not Currently Tracked",
];

export const averageWeeklyCoverRanges = [
  "0-100",
  "101-300",
  "301-750",
  "751-1,500",
  "1,500+",
];

export function averageTransactionValueRanges(currency: string) {
  if (currency === "GBP") {
    return ["Under £10", "£10-£20", "£20-£40", "£40-£75", "£75+"];
  }

  if (currency === "USD") {
    return ["Under $10", "$10-$20", "$20-$40", "$40-$75", "$75+"];
  }

  if (currency === "AED") {
    return ["Under AED 10", "AED 10-AED 20", "AED 20-AED 40", "AED 40-AED 75", "AED 75+"];
  }

  return ["Under €10", "€10-€20", "€20-€40", "€40-€75", "€75+"];
}

export const days = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

export const defaultOpeningHours: OpeningHours = {
  mode: "split",
  days: days.map((day) => ({
    day,
    closed: false,
    open: day === "Saturday" || day === "Sunday" ? "10:00" : "09:00",
    close: "22:00",
  })),
};

export const maxLogoSize = 2 * 1024 * 1024;
export const maxCoverSize = 5 * 1024 * 1024;
export const maxPdfSize = 10 * 1024 * 1024;

export const imageMimeTypes = ["image/png", "image/jpeg", "image/webp"];
export const pdfMimeTypes = ["application/pdf"];

export function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export function optionalString(formData: FormData, key: string) {
  const value = getString(formData, key);
  return value.length > 0 ? value : null;
}

export function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

export function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function isValidUrl(value: string) {
  if (!value) {
    return true;
  }

  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

export function isValidHexColour(value: string) {
  return /^#[0-9A-Fa-f]{6}$/.test(value);
}

export function parseOpeningHours(value: string): OpeningHours | null {
  try {
    const parsed = JSON.parse(value) as OpeningHours;
    if (!["same", "split", "custom"].includes(parsed.mode)) {
      return null;
    }

    if (!Array.isArray(parsed.days) || parsed.days.length !== 7) {
      return null;
    }

    const validDays = parsed.days.every(
      (day) =>
        days.includes(day.day) &&
        typeof day.closed === "boolean" &&
        /^\d{2}:\d{2}$/.test(day.open) &&
        /^\d{2}:\d{2}$/.test(day.close),
    );

    return validDays ? parsed : null;
  } catch {
    return null;
  }
}

export function validateUpload(
  file: File | null,
  options: {
    required: boolean;
    label: string;
    maxSize: number;
    mimeTypes: string[];
  },
) {
  if (!file || file.size === 0) {
    return options.required ? `${options.label} is required.` : null;
  }

  if (!options.mimeTypes.includes(file.type)) {
    return `${options.label} must be ${options.mimeTypes.join(", ")}.`;
  }

  if (file.size > options.maxSize) {
    const maxMb = Math.round(options.maxSize / 1024 / 1024);
    return `${options.label} must be ${maxMb}MB or smaller.`;
  }

  return null;
}

export function friendlyOnboardingError(message: string) {
  if (message.toLowerCase().includes("duplicate key")) {
    return "That public URL is already in use. Choose a slightly different slug.";
  }

  if (message.toLowerCase().includes("row-level security")) {
    return "Atlas could not confirm permission for this restaurant. Please sign in again.";
  }

  if (message.toLowerCase().includes("permission denied")) {
    return "Atlas does not have the required database permissions for onboarding. Apply the latest Supabase migration and try again.";
  }

  return message || "Atlas could not create the restaurant. Please try again.";
}
