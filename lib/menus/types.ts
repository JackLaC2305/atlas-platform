import type { RestaurantSummary } from "@/lib/onboarding/types";

export const menuStatuses = ["draft", "scheduled", "published", "archived"] as const;
export const availabilityTypes = ["always", "scheduled"] as const;
export const itemAvailabilityStatuses = ["available", "sold_out", "hidden"] as const;

export const menuBadges = ["Chef's Special", "Best Seller", "New", "Seasonal", "Limited Time"];
export const dietaryTags = [
  "Vegetarian",
  "Vegan",
  "Gluten Free",
  "Dairy Free",
  "Halal",
  "Kosher",
  "Nut Free",
  "Low Carb",
];
export const allergenTags = [
  "Milk",
  "Eggs",
  "Fish",
  "Shellfish",
  "Peanuts",
  "Tree Nuts",
  "Soy",
  "Gluten",
  "Sesame",
  "Mustard",
  "Celery",
  "Sulphites",
  "Lupin",
  "Molluscs",
];
export const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export type MenuStatus = (typeof menuStatuses)[number];
export type AvailabilityType = (typeof availabilityTypes)[number];
export type ItemAvailabilityStatus = (typeof itemAvailabilityStatuses)[number];

export type Menu = {
  id: string;
  restaurant_id: string;
  name: string;
  description: string | null;
  status: MenuStatus;
  availability_type: AvailabilityType;
  schedule_days: string[];
  start_time: string | null;
  end_time: string | null;
  start_date: string | null;
  end_date: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
  published_at: string | null;
};

export type MenuCategory = {
  id: string;
  restaurant_id: string;
  menu_id: string;
  name: string;
  description: string | null;
  sort_order: number;
  is_visible: boolean;
};

export type MenuItem = {
  id: string;
  restaurant_id: string;
  menu_id: string;
  category_id: string;
  name: string;
  description: string | null;
  base_price: number;
  currency: string;
  availability_status: ItemAvailabilityStatus;
  is_featured: boolean;
  show_ingredient_summary: boolean;
  badges: string[];
  dietary_tags: string[];
  allergens: string[];
  ingredients_note: string | null;
  sort_order: number;
};

export type MenuItemImage = {
  id: string;
  restaurant_id: string;
  menu_item_id: string;
  image_url: string | null;
  image_path: string;
  sort_order: number;
  signed_url?: string | null;
};

export type VariantGroup = {
  id: string;
  restaurant_id: string;
  menu_item_id: string;
  name: string;
  is_required: boolean;
  sort_order: number;
  variants: Variant[];
};

export type Variant = {
  id: string;
  restaurant_id: string;
  variant_group_id: string;
  name: string;
  price_delta: number;
  sort_order: number;
};

export type AddonGroup = {
  id: string;
  restaurant_id: string;
  menu_item_id: string;
  name: string;
  max_selections: number;
  sort_order: number;
  addons: Addon[];
};

export type Addon = {
  id: string;
  restaurant_id: string;
  addon_group_id: string;
  name: string;
  price_delta: number;
  sort_order: number;
};

export type Ingredient = {
  id: string;
  restaurant_id: string;
  menu_item_id: string;
  ingredient_name: string;
  quantity: number | null;
  unit: string | null;
  sort_order: number;
};

export type MenuItemFull = MenuItem & {
  images: MenuItemImage[];
  variantGroups: VariantGroup[];
  addonGroups: AddonGroup[];
  ingredients: Ingredient[];
};

export type MenuCategoryFull = MenuCategory & {
  items: MenuItemFull[];
};

export type MenuFull = Menu & {
  categories: MenuCategoryFull[];
};

export type MenuManagementData = {
  restaurant: RestaurantSummary;
  logoUrl: string | null;
  menus: MenuFull[];
  canManage: boolean;
};
