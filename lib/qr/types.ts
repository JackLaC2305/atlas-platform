export type QrLink = {
  id: string;
  restaurant_id: string;
  menu_id: string | null;
  table_number: string | null;
  destination_type: "restaurant" | "menu";
  destination_url: string;
  created_at: string;
  updated_at: string;
};

export type QrMenuOption = {
  id: string;
  name: string;
  slug: string;
};

export type QrManagementData = {
  restaurant: {
    id: string;
    name: string;
    slug: string;
  };
  logoUrl: string | null;
  canManage: boolean;
  origin: string;
  publishedMenus: QrMenuOption[];
  qrLinks: QrLink[];
};
