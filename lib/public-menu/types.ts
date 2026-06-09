export type PublicMenuItem = {
  id: string;
  name: string;
  description: string | null;
  base_price: number;
  currency: string;
  availability_status: string;
  is_featured: boolean;
  show_ingredient_summary: boolean;
  badges: string[];
  dietary_tags: string[];
  allergens: string[];
  images: Array<{ id: string; url?: string | null }>;
  variant_groups: Array<{
    name: string;
    is_required: boolean;
    variants: Array<{ name: string; price_delta: number }>;
  }>;
  addon_groups: Array<{
    name: string;
    max_selections: number;
    addons: Array<{ name: string; price_delta: number }>;
  }>;
  ingredients: string[];
};

export type PublicMenuCategory = {
  id: string;
  name: string;
  description: string | null;
  items: PublicMenuItem[];
};

export type PublicMenu = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  categories: PublicMenuCategory[];
};

export type PublicRestaurant = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  opening_hours: {
    mode?: string;
    days?: Array<{ day: string; closed: boolean; open: string; close: string }>;
  } | null;
  has_logo: boolean;
  has_cover: boolean;
  primary_colour: string | null;
  secondary_colour: string | null;
  logo_url?: string | null;
  cover_image_url?: string | null;
};

export type PublicMenuPageData = {
  restaurant: PublicRestaurant;
  menus: PublicMenu[];
};
