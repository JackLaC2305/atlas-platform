export type OpeningHourDay = {
  day: string;
  closed: boolean;
  open: string;
  close: string;
};

export type OpeningHours = {
  mode: "same" | "split" | "custom";
  days: OpeningHourDay[];
};

export type OnboardingActionState = {
  status: "idle" | "error";
  message: string;
};

export type RestaurantSummary = {
  id: string;
  name: string;
  slug: string;
  restaurant_type: string;
  cuisine_type: string;
  description: string;
  business_email: string;
  phone: string;
  website: string | null;
  address_line_1: string;
  address_line_2: string | null;
  city: string;
  county_or_state: string | null;
  postcode: string | null;
  country: string;
  instagram_url: string | null;
  facebook_url: string | null;
  tiktok_url: string | null;
  x_url: string | null;
  linkedin_url: string | null;
  opening_hours: OpeningHours | null;
  currency: string;
  timezone: string;
  seating_capacity_range: string;
  location_count_range: string;
  logo_path: string | null;
  cover_image_path: string | null;
  primary_colour: string;
  secondary_colour: string | null;
  menu_setup_method: string;
  menu_pdf_path: string | null;
  existing_menu_source: string;
  approximate_menu_items_range: string;
  primary_objective: string;
  average_weekly_covers: string | null;
  menu_update_frequency: string | null;
  inventory_method: string | null;
  pos_provider: string | null;
  main_operational_pain_point: string | null;
  average_transaction_value: string | null;
  onboarding_completed: boolean;
};
