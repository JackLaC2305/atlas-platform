import type { RestaurantSummary } from "@/lib/onboarding/types";

export const inventoryUnits = [
  "gram",
  "kilogram",
  "milligram",
  "litre",
  "millilitre",
  "ounce",
  "pound",
  "fluid ounce",
  "cup",
  "tablespoon",
  "teaspoon",
  "piece",
  "unit",
  "slice",
  "portion",
  "bottle",
  "can",
  "packet",
  "bunch",
  "pinch",
  "other",
] as const;

export const inventoryCategories = [
  "Protein",
  "Vegetables",
  "Fruit",
  "Dairy",
  "Dry Goods",
  "Bakery",
  "Beverages",
  "Alcohol",
  "Condiments",
  "Sauces",
  "Spices",
  "Frozen",
  "Packaging",
  "Other",
] as const;

export const movementTypes = ["add", "remove", "set", "sales_deduction", "correction", "waste"] as const;
export const adjustmentReasons = ["Delivery", "Manual Correction", "Waste", "Stock Count", "Used in Service", "Other"] as const;

export type InventoryStatus = "in_stock" | "low_stock" | "out_of_stock";
export type MovementType = (typeof movementTypes)[number];

export type InventoryIngredient = {
  id: string;
  restaurant_id: string;
  name: string;
  category: string;
  unit: string;
  current_stock: number;
  low_stock_threshold: number;
  cost_per_unit: number | null;
  supplier_name: string | null;
  notes: string | null;
  stock_tracking_mode: "exact" | "approximate";
  package_description: string | null;
  status: InventoryStatus;
  external_pos_item_id: string | null;
  external_pos_location_id: string | null;
  pos_sync_status: string;
  last_pos_synced_at: string | null;
  created_at: string;
  updated_at: string;
};

export type InventoryMenuLink = {
  id: string;
  restaurant_id: string;
  inventory_ingredient_id: string;
  menu_item_id: string;
  menu_item_ingredient_id: string | null;
  quantity_per_item: number;
  unit: string;
  inventoryIngredient?: InventoryIngredient;
  created_at: string;
  updated_at: string;
};

export type StockMovement = {
  id: string;
  restaurant_id: string;
  inventory_ingredient_id: string;
  movement_type: MovementType;
  quantity_change: number;
  old_stock: number;
  new_stock: number;
  reason: string;
  notes: string | null;
  created_by: string | null;
  created_at: string;
};

export type SalesEntry = {
  id: string;
  restaurant_id: string;
  sales_date: string;
  notes: string | null;
  created_by: string | null;
  created_at: string;
};

export type SalesEntryItem = {
  id: string;
  sales_entry_id: string;
  restaurant_id: string;
  menu_item_id: string;
  quantity_sold: number;
  created_at: string;
};

export type AlertPreferences = {
  id: string;
  restaurant_id: string;
  dashboard_alerts_enabled: boolean;
  end_of_day_email_enabled: boolean;
  alert_email: string | null;
  created_at: string;
  updated_at: string;
};

export type InventoryMenuItemOption = {
  id: string;
  name: string;
  menuName: string;
};

export type MenuIngredientOpportunity = {
  key: string;
  menuItemIngredientId: string;
  menuItemId: string;
  menuItemName: string;
  menuName: string;
  ingredientName: string;
  quantity: number | null;
  unit: string | null;
  alreadyLinked: boolean;
};

export type InventoryData = {
  restaurant: RestaurantSummary;
  canManage: boolean;
  ingredients: InventoryIngredient[];
  links: InventoryMenuLink[];
  movements: StockMovement[];
  salesEntries: SalesEntry[];
  salesItems: SalesEntryItem[];
  alertPreferences: AlertPreferences | null;
  menuItems: InventoryMenuItemOption[];
  menuIngredientOpportunities: MenuIngredientOpportunity[];
};
