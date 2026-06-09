"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import type { OnboardingActionState } from "@/lib/onboarding/types";
import {
  averageTransactionValueRanges,
  averageWeeklyCoverRanges,
  countries,
  currencies,
  existingMenuSources,
  friendlyOnboardingError,
  getString,
  imageMimeTypes,
  isValidEmail,
  isValidHexColour,
  isValidUrl,
  locationCountRanges,
  maxCoverSize,
  maxLogoSize,
  maxPdfSize,
  menuItemRanges,
  menuSetupMethods,
  optionalString,
  parseOpeningHours,
  pdfMimeTypes,
  primaryObjectives,
  restaurantTypes,
  seatingCapacityRanges,
  slugify,
  timezones,
  validateUpload,
} from "@/lib/onboarding/validation";
import { createClient } from "@/lib/supabase/server";

function getFile(formData: FormData, key: string) {
  const value = formData.get(key);
  return value instanceof File && value.size > 0 ? value : null;
}

function safeFileName(fileName: string) {
  const fallback = "upload";
  const cleaned = fileName
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return cleaned || fallback;
}

async function uploadRestaurantFile({
  bucket,
  restaurantId,
  folder,
  file,
}: {
  bucket: "restaurant-assets" | "menu-imports";
  restaurantId: string;
  folder: string;
  file: File;
}) {
  const supabase = await createClient();
  const path = `${restaurantId}/${folder}/${Date.now()}-${safeFileName(file.name)}`;
  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    contentType: file.type,
    upsert: false,
  });

  if (error) {
    throw new Error(error.message);
  }

  return path;
}

async function insertRestaurantWithUniqueSlug(
  formData: FormData,
  userId: string,
  baseSlug: string,
) {
  const supabase = await createClient();
  const restaurantId = crypto.randomUUID();
  const maxAttempts = 10;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const slug = attempt === 0 ? baseSlug : `${baseSlug}-${attempt + 1}`;
    const { error } = await supabase.from("restaurants").insert({
      id: restaurantId,
      owner_id: userId,
      name: getString(formData, "name"),
      slug,
      restaurant_type: getString(formData, "restaurantType"),
      cuisine_type: getString(formData, "cuisineType"),
      description: getString(formData, "description"),
      business_email: getString(formData, "businessEmail").toLowerCase(),
      phone: getString(formData, "phone"),
      website: optionalString(formData, "website"),
      address_line_1: getString(formData, "addressLine1"),
      address_line_2: optionalString(formData, "addressLine2"),
      city: getString(formData, "city"),
      county_or_state: optionalString(formData, "countyOrState"),
      postcode: optionalString(formData, "postcode"),
      country: getString(formData, "country"),
      instagram_url: optionalString(formData, "instagramUrl"),
      facebook_url: optionalString(formData, "facebookUrl"),
      tiktok_url: optionalString(formData, "tiktokUrl"),
      x_url: optionalString(formData, "xUrl"),
      linkedin_url: optionalString(formData, "linkedinUrl"),
      opening_hours: parseOpeningHours(getString(formData, "openingHours")),
      currency: getString(formData, "currency"),
      timezone: getString(formData, "timezone"),
      seating_capacity_range: getString(formData, "seatingCapacityRange"),
      location_count_range: getString(formData, "locationCountRange"),
      primary_colour: getString(formData, "primaryColour"),
      secondary_colour: optionalString(formData, "secondaryColour"),
      menu_setup_method: getString(formData, "menuSetupMethod"),
      existing_menu_source: getString(formData, "existingMenuSource"),
      approximate_menu_items_range: getString(formData, "approximateMenuItemsRange"),
      primary_objective: getString(formData, "primaryObjective"),
      average_weekly_covers: optionalString(formData, "averageWeeklyCovers"),
      menu_update_frequency: optionalString(formData, "menuUpdateFrequency"),
      inventory_method: optionalString(formData, "inventoryMethod"),
      pos_provider: optionalString(formData, "posProvider"),
      main_operational_pain_point: optionalString(formData, "mainOperationalPainPoint"),
      average_transaction_value: optionalString(formData, "averageTransactionValue"),
      onboarding_completed: true,
    });

    if (!error) {
      return { restaurantId, slug };
    }

    if (error.code !== "23505") {
      throw new Error(error.message);
    }
  }

  throw new Error("That public URL is already in use. Choose a slightly different slug.");
}

export async function createRestaurantAction(
  _state: OnboardingActionState,
  formData: FormData,
): Promise<OnboardingActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const existingMembership = await supabase
    .from("restaurant_members")
    .select("restaurant_id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (existingMembership.data) {
    redirect("/dashboard");
  }

  const name = getString(formData, "name");
  const slug = slugify(getString(formData, "slug") || name);
  const restaurantType = getString(formData, "restaurantType");
  const cuisineType = getString(formData, "cuisineType");
  const description = getString(formData, "description");
  const businessEmail = getString(formData, "businessEmail").toLowerCase();
  const phone = getString(formData, "phone");
  const addressLine1 = getString(formData, "addressLine1");
  const city = getString(formData, "city");
  const country = getString(formData, "country");
  const website = getString(formData, "website");
  const instagramUrl = getString(formData, "instagramUrl");
  const facebookUrl = getString(formData, "facebookUrl");
  const tiktokUrl = getString(formData, "tiktokUrl");
  const xUrl = getString(formData, "xUrl");
  const linkedinUrl = getString(formData, "linkedinUrl");
  const locationCountRange = getString(formData, "locationCountRange");
  const seatingCapacityRange = getString(formData, "seatingCapacityRange");
  const openingHours = parseOpeningHours(getString(formData, "openingHours"));
  const currency = getString(formData, "currency");
  const timezone = getString(formData, "timezone");
  const primaryColour = getString(formData, "primaryColour");
  const secondaryColour = getString(formData, "secondaryColour");
  const menuSetupMethod = getString(formData, "menuSetupMethod");
  const existingMenuSource = getString(formData, "existingMenuSource");
  const approximateMenuItemsRange = getString(formData, "approximateMenuItemsRange");
  const primaryObjective = getString(formData, "primaryObjective");
  const averageWeeklyCovers = optionalString(formData, "averageWeeklyCovers");
  const averageTransactionValue = optionalString(formData, "averageTransactionValue");

  const urls = [website, instagramUrl, facebookUrl, tiktokUrl, xUrl, linkedinUrl].filter(Boolean);
  const logo = getFile(formData, "logo");
  const coverImage = getFile(formData, "coverImage");
  const menuPdf = getFile(formData, "menuPdf");

  if (name.length < 2) {
    return { status: "error", message: "Enter the restaurant name." };
  }

  if (!slug || slug.length < 2) {
    return { status: "error", message: "Enter a valid public URL slug." };
  }

  if (!restaurantTypes.includes(restaurantType)) {
    return { status: "error", message: "Select a restaurant type." };
  }

  if (cuisineType.length < 2 || cuisineType === "Other") {
    return { status: "error", message: "Select or enter the cuisine type." };
  }

  if (description.length < 20) {
    return { status: "error", message: "Enter a short description of at least 20 characters." };
  }

  if (!isValidEmail(businessEmail)) {
    return { status: "error", message: "Enter a valid business email." };
  }

  if (!phone) {
    return { status: "error", message: "Enter a business phone number." };
  }

  if (!addressLine1 || !city || !country || !countries.includes(country)) {
    return { status: "error", message: "Enter the required location details." };
  }

  if (urls.some((url) => !isValidUrl(url))) {
    return { status: "error", message: "Social and website links must start with http:// or https://." };
  }

  if (!locationCountRanges.includes(locationCountRange)) {
    return { status: "error", message: "Select the number of locations." };
  }

  if (!seatingCapacityRanges.includes(seatingCapacityRange)) {
    return { status: "error", message: "Select the seating capacity range." };
  }

  if (!openingHours) {
    return { status: "error", message: "Set valid opening hours." };
  }

  if (!currencies.includes(currency) || !timezones.includes(timezone)) {
    return { status: "error", message: "Select currency and timezone." };
  }

  if (!isValidHexColour(primaryColour)) {
    return { status: "error", message: "Choose a valid primary brand colour." };
  }

  if (secondaryColour && !isValidHexColour(secondaryColour)) {
    return { status: "error", message: "Choose a valid secondary brand colour." };
  }

  const logoError = validateUpload(logo, {
    required: true,
    label: "Logo upload",
    maxSize: maxLogoSize,
    mimeTypes: imageMimeTypes,
  });

  if (logoError) {
    return { status: "error", message: logoError };
  }

  const coverError = validateUpload(coverImage, {
    required: false,
    label: "Cover image",
    maxSize: maxCoverSize,
    mimeTypes: imageMimeTypes,
  });

  if (coverError) {
    return { status: "error", message: coverError };
  }

  if (!menuSetupMethods.some((method) => method.value === menuSetupMethod)) {
    return { status: "error", message: "Select a menu setup method." };
  }

  const pdfError = validateUpload(menuPdf, {
    required: menuSetupMethod === "import_pdf",
    label: "PDF menu",
    maxSize: maxPdfSize,
    mimeTypes: pdfMimeTypes,
  });

  if (pdfError) {
    return { status: "error", message: pdfError };
  }

  if (!existingMenuSources.includes(existingMenuSource)) {
    return { status: "error", message: "Select the existing menu source." };
  }

  if (!menuItemRanges.includes(approximateMenuItemsRange)) {
    return { status: "error", message: "Select the approximate number of menu items." };
  }

  if (!primaryObjectives.includes(primaryObjective)) {
    return { status: "error", message: "Select the primary objective." };
  }

  if (averageWeeklyCovers && !averageWeeklyCoverRanges.includes(averageWeeklyCovers)) {
    return { status: "error", message: "Select the average weekly covers range." };
  }

  if (
    averageTransactionValue &&
    !averageTransactionValueRanges(currency).includes(averageTransactionValue)
  ) {
    return { status: "error", message: "Select the average transaction value range." };
  }

  try {
    const { restaurantId } = await insertRestaurantWithUniqueSlug(formData, user.id, slug);

    const membership = await supabase.from("restaurant_members").insert({
      restaurant_id: restaurantId,
      user_id: user.id,
      role: "owner",
    });

    if (membership.error) {
      throw new Error(membership.error.message);
    }

    const uploadedAssets: Array<{
      asset_type: "logo" | "cover" | "menu_pdf";
      file_path: string;
      original_file_name: string;
      mime_type: string;
      file_size: number;
    }> = [];

    const logoPath = await uploadRestaurantFile({
      bucket: "restaurant-assets",
      restaurantId,
      folder: "logo",
      file: logo as File,
    });
    uploadedAssets.push({
      asset_type: "logo",
      file_path: logoPath,
      original_file_name: (logo as File).name,
      mime_type: (logo as File).type,
      file_size: (logo as File).size,
    });

    let coverPath: string | null = null;
    if (coverImage) {
      coverPath = await uploadRestaurantFile({
        bucket: "restaurant-assets",
        restaurantId,
        folder: "cover",
        file: coverImage,
      });
      uploadedAssets.push({
        asset_type: "cover",
        file_path: coverPath,
        original_file_name: coverImage.name,
        mime_type: coverImage.type,
        file_size: coverImage.size,
      });
    }

    let menuPdfPath: string | null = null;
    if (menuSetupMethod === "import_pdf" && menuPdf) {
      menuPdfPath = await uploadRestaurantFile({
        bucket: "menu-imports",
        restaurantId,
        folder: "menu",
        file: menuPdf,
      });
      uploadedAssets.push({
        asset_type: "menu_pdf",
        file_path: menuPdfPath,
        original_file_name: menuPdf.name,
        mime_type: menuPdf.type,
        file_size: menuPdf.size,
      });
    }

    const updateRestaurant = await supabase
      .from("restaurants")
      .update({
        logo_path: logoPath,
        cover_image_path: coverPath,
        menu_pdf_path: menuPdfPath,
      })
      .eq("id", restaurantId);

    if (updateRestaurant.error) {
      throw new Error(updateRestaurant.error.message);
    }

    if (uploadedAssets.length > 0) {
      const assets = await supabase.from("restaurant_assets").insert(
        uploadedAssets.map((asset) => ({
          restaurant_id: restaurantId,
          file_url: null,
          ...asset,
        })),
      );

      if (assets.error) {
        throw new Error(assets.error.message);
      }
    }

    await supabase
      .from("profiles")
      .update({ onboarding_completed: true })
      .eq("user_id", user.id);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown onboarding error.";
    return { status: "error", message: friendlyOnboardingError(message) };
  }

  revalidatePath("/dashboard");
  redirect("/dashboard");
}
