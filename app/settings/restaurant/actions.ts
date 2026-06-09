"use server";

import { revalidatePath } from "next/cache";

import type { OpeningHours } from "@/lib/onboarding/types";
import {
  averageTransactionValueRanges,
  averageWeeklyCoverRanges,
  countries,
  currencies,
  existingMenuSources,
  getString,
  imageMimeTypes,
  inventoryMethods,
  isValidEmail,
  isValidHexColour,
  isValidUrl,
  locationCountRanges,
  maxCoverSize,
  maxLogoSize,
  menuItemRanges,
  menuSetupMethods,
  menuUpdateFrequencies,
  optionalString,
  parseOpeningHours,
  primaryObjectives,
  restaurantTypes,
  seatingCapacityRanges,
  slugify,
  timezones,
  validateUpload,
} from "@/lib/onboarding/validation";
import { createClient } from "@/lib/supabase/server";

export type RestaurantSettingsActionState = {
  status: "idle" | "success" | "error";
  message: string;
};

function getFile(formData: FormData, key: string) {
  const value = formData.get(key);
  return value instanceof File && value.size > 0 ? value : null;
}

function safeFileName(fileName: string) {
  const cleaned = fileName
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return cleaned || "upload";
}

async function uploadAsset({
  restaurantId,
  folder,
  file,
}: {
  restaurantId: string;
  folder: "logo" | "cover";
  file: File;
}) {
  const supabase = await createClient();
  const path = `${restaurantId}/${folder}/${Date.now()}-${safeFileName(file.name)}`;
  const { error } = await supabase.storage.from("restaurant-assets").upload(path, file, {
    contentType: file.type,
    upsert: false,
  });

  if (error) {
    throw new Error(error.message);
  }

  return path;
}

function validateOpeningHours(openingHours: OpeningHours | null) {
  return openingHours?.days?.length === 7;
}

export async function updateRestaurantSettingsAction(
  _state: RestaurantSettingsActionState,
  formData: FormData,
): Promise<RestaurantSettingsActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { status: "error", message: "You must be logged in to update restaurant settings." };
  }

  const restaurantId = getString(formData, "restaurantId");
  const { data: membership } = await supabase
    .from("restaurant_members")
    .select("role")
    .eq("restaurant_id", restaurantId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership) {
    return { status: "error", message: "You do not have access to this restaurant." };
  }

  if (membership.role !== "owner") {
    return { status: "error", message: "Only restaurant owners can save settings." };
  }

  const name = getString(formData, "name");
  const slug = slugify(getString(formData, "slug") || name);
  const restaurantType = getString(formData, "restaurantType");
  const cuisineType = getString(formData, "cuisineType");
  const description = getString(formData, "description");
  const businessEmail = getString(formData, "businessEmail").toLowerCase();
  const phone = getString(formData, "phone");
  const website = getString(formData, "website");
  const addressLine1 = getString(formData, "addressLine1");
  const city = getString(formData, "city");
  const country = getString(formData, "country");
  const locationCountRange = getString(formData, "locationCountRange");
  const seatingCapacityRange = getString(formData, "seatingCapacityRange");
  const currency = getString(formData, "currency");
  const timezone = getString(formData, "timezone");
  const openingHours = parseOpeningHours(getString(formData, "openingHours"));
  const primaryColour = getString(formData, "primaryColour");
  const secondaryColour = getString(formData, "secondaryColour");
  const menuSetupMethod = getString(formData, "menuSetupMethod");
  const existingMenuSource = getString(formData, "existingMenuSource");
  const approximateMenuItemsRange = getString(formData, "approximateMenuItemsRange");
  const primaryObjective = getString(formData, "primaryObjective");
  const averageWeeklyCovers = optionalString(formData, "averageWeeklyCovers");
  const menuUpdateFrequency = optionalString(formData, "menuUpdateFrequency");
  const inventoryMethod = optionalString(formData, "inventoryMethod");
  const averageTransactionValue = optionalString(formData, "averageTransactionValue");
  const logo = getFile(formData, "logo");
  const coverImage = getFile(formData, "coverImage");

  const urls = [
    website,
    getString(formData, "instagramUrl"),
    getString(formData, "facebookUrl"),
    getString(formData, "tiktokUrl"),
    getString(formData, "xUrl"),
    getString(formData, "linkedinUrl"),
  ].filter(Boolean);

  if (name.length < 2) return { status: "error", message: "Enter the restaurant name." };
  if (!slug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    return { status: "error", message: "Enter a valid public URL slug." };
  }
  if (!restaurantTypes.includes(restaurantType)) {
    return { status: "error", message: "Select a restaurant type." };
  }
  if (cuisineType.length < 2) return { status: "error", message: "Enter the cuisine type." };
  if (description.length < 20) {
    return { status: "error", message: "Enter a short description of at least 20 characters." };
  }
  if (!isValidEmail(businessEmail)) {
    return { status: "error", message: "Enter a valid business email." };
  }
  if (!phone) return { status: "error", message: "Enter a business phone number." };
  if (!addressLine1 || !city || !countries.includes(country)) {
    return { status: "error", message: "Enter the required location details." };
  }
  if (urls.some((url) => !isValidUrl(url))) {
    return { status: "error", message: "Website and social links must be full valid URLs." };
  }
  if (!locationCountRanges.includes(locationCountRange)) {
    return { status: "error", message: "Select the number of locations." };
  }
  if (!seatingCapacityRanges.includes(seatingCapacityRange)) {
    return { status: "error", message: "Select the seating capacity range." };
  }
  if (!currencies.includes(currency) || !timezones.includes(timezone)) {
    return { status: "error", message: "Select currency and timezone." };
  }
  if (!validateOpeningHours(openingHours)) {
    return { status: "error", message: "Set valid opening hours." };
  }
  if (!isValidHexColour(primaryColour)) {
    return { status: "error", message: "Choose a valid primary brand colour." };
  }
  if (secondaryColour && !isValidHexColour(secondaryColour)) {
    return { status: "error", message: "Choose a valid secondary brand colour." };
  }

  const logoError = validateUpload(logo, {
    required: false,
    label: "Logo upload",
    maxSize: maxLogoSize,
    mimeTypes: imageMimeTypes,
  });
  if (logoError) return { status: "error", message: logoError };

  const coverError = validateUpload(coverImage, {
    required: false,
    label: "Cover image",
    maxSize: maxCoverSize,
    mimeTypes: imageMimeTypes,
  });
  if (coverError) return { status: "error", message: coverError };

  if (!menuSetupMethods.some((method) => method.value === menuSetupMethod)) {
    return { status: "error", message: "Select a menu setup method." };
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
  if (menuUpdateFrequency && !menuUpdateFrequencies.includes(menuUpdateFrequency)) {
    return { status: "error", message: "Select a valid menu update frequency." };
  }
  if (inventoryMethod && !inventoryMethods.includes(inventoryMethod)) {
    return { status: "error", message: "Select a valid inventory method." };
  }
  if (
    averageTransactionValue &&
    !averageTransactionValueRanges(currency).includes(averageTransactionValue)
  ) {
    return { status: "error", message: "Select the average transaction value range." };
  }

  try {
    let logoPath: string | null = null;
    let coverPath: string | null = null;
    const assetRows: Array<{
      restaurant_id: string;
      asset_type: "logo" | "cover";
      file_url: null;
      file_path: string;
      original_file_name: string;
      mime_type: string;
      file_size: number;
    }> = [];

    if (logo) {
      logoPath = await uploadAsset({ restaurantId, folder: "logo", file: logo });
      assetRows.push({
        restaurant_id: restaurantId,
        asset_type: "logo",
        file_url: null,
        file_path: logoPath,
        original_file_name: logo.name,
        mime_type: logo.type,
        file_size: logo.size,
      });
    }

    if (coverImage) {
      coverPath = await uploadAsset({ restaurantId, folder: "cover", file: coverImage });
      assetRows.push({
        restaurant_id: restaurantId,
        asset_type: "cover",
        file_url: null,
        file_path: coverPath,
        original_file_name: coverImage.name,
        mime_type: coverImage.type,
        file_size: coverImage.size,
      });
    }

    const updatePayload = {
      name,
      slug,
      restaurant_type: restaurantType,
      cuisine_type: cuisineType,
      description,
      business_email: businessEmail,
      phone,
      website: optionalString(formData, "website"),
      address_line_1: addressLine1,
      address_line_2: optionalString(formData, "addressLine2"),
      city,
      county_or_state: optionalString(formData, "countyOrState"),
      postcode: optionalString(formData, "postcode"),
      country,
      instagram_url: optionalString(formData, "instagramUrl"),
      facebook_url: optionalString(formData, "facebookUrl"),
      tiktok_url: optionalString(formData, "tiktokUrl"),
      x_url: optionalString(formData, "xUrl"),
      linkedin_url: optionalString(formData, "linkedinUrl"),
      opening_hours: openingHours,
      currency,
      timezone,
      seating_capacity_range: seatingCapacityRange,
      location_count_range: locationCountRange,
      primary_colour: primaryColour,
      secondary_colour: optionalString(formData, "secondaryColour"),
      menu_setup_method: menuSetupMethod,
      existing_menu_source: existingMenuSource,
      approximate_menu_items_range: approximateMenuItemsRange,
      primary_objective: primaryObjective,
      average_weekly_covers: averageWeeklyCovers,
      menu_update_frequency: menuUpdateFrequency,
      inventory_method: inventoryMethod,
      pos_provider: optionalString(formData, "posProvider"),
      main_operational_pain_point: optionalString(formData, "mainOperationalPainPoint"),
      average_transaction_value: averageTransactionValue,
      ...(logoPath ? { logo_path: logoPath } : {}),
      ...(coverPath ? { cover_image_path: coverPath } : {}),
    };

    const { error } = await supabase
      .from("restaurants")
      .update(updatePayload)
      .eq("id", restaurantId);

    if (error) throw new Error(error.message);

    if (assetRows.length > 0) {
      const { error: assetsError } = await supabase.from("restaurant_assets").insert(assetRows);
      if (assetsError) throw new Error(assetsError.message);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown settings error.";
    if (message.toLowerCase().includes("duplicate key")) {
      return {
        status: "error",
        message: "That public URL slug is already in use. Choose a different slug.",
      };
    }

    if (message.toLowerCase().includes("row-level security") || message.toLowerCase().includes("permission denied")) {
      return {
        status: "error",
        message: "Atlas could not confirm owner permission for these settings.",
      };
    }

    return { status: "error", message };
  }

  revalidatePath("/dashboard");
  revalidatePath("/settings/restaurant");

  return { status: "success", message: "Restaurant settings saved." };
}
