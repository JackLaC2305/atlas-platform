alter table public.menu_items
  add column if not exists show_ingredient_summary boolean not null default false;
