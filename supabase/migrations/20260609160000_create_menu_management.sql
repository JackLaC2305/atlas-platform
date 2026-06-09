create table if not exists public.menus (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  name text not null,
  description text,
  status text not null default 'draft',
  availability_type text not null default 'always',
  schedule_days jsonb not null default '[]'::jsonb,
  start_time time,
  end_time time,
  start_date date,
  end_date date,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  published_at timestamptz,
  constraint menus_status_check check (status in ('draft', 'scheduled', 'published', 'archived')),
  constraint menus_availability_type_check check (availability_type in ('always', 'scheduled')),
  constraint menus_schedule_time_check check (
    availability_type = 'always'
    or (start_time is not null and end_time is not null and end_time > start_time)
  )
);

create table if not exists public.menu_categories (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  menu_id uuid not null references public.menus(id) on delete cascade,
  name text not null,
  description text,
  sort_order integer not null default 0,
  is_visible boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.menu_items (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  menu_id uuid not null references public.menus(id) on delete cascade,
  category_id uuid not null references public.menu_categories(id) on delete cascade,
  name text not null,
  description text,
  base_price numeric(10, 2) not null default 0,
  currency text not null default 'EUR',
  availability_status text not null default 'available',
  is_featured boolean not null default false,
  badges jsonb not null default '[]'::jsonb,
  dietary_tags jsonb not null default '[]'::jsonb,
  allergens jsonb not null default '[]'::jsonb,
  ingredients_note text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint menu_items_availability_status_check check (availability_status in ('available', 'sold_out', 'hidden')),
  constraint menu_items_price_check check (base_price >= 0)
);

create table if not exists public.menu_item_images (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  menu_item_id uuid not null references public.menu_items(id) on delete cascade,
  image_url text,
  image_path text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.menu_item_variant_groups (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  menu_item_id uuid not null references public.menu_items(id) on delete cascade,
  name text not null,
  is_required boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.menu_item_variants (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  variant_group_id uuid not null references public.menu_item_variant_groups(id) on delete cascade,
  name text not null,
  price_delta numeric(10, 2) not null default 0,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.menu_item_addon_groups (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  menu_item_id uuid not null references public.menu_items(id) on delete cascade,
  name text not null,
  max_selections integer not null default 1,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint menu_item_addon_groups_max_selections_check check (max_selections >= 1)
);

create table if not exists public.menu_item_addons (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  addon_group_id uuid not null references public.menu_item_addon_groups(id) on delete cascade,
  name text not null,
  price_delta numeric(10, 2) not null default 0,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.menu_item_ingredients (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  menu_item_id uuid not null references public.menu_items(id) on delete cascade,
  ingredient_name text not null,
  quantity numeric(10, 3),
  unit text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists menus_restaurant_id_idx on public.menus(restaurant_id);
create index if not exists menu_categories_menu_id_idx on public.menu_categories(menu_id);
create index if not exists menu_items_menu_id_idx on public.menu_items(menu_id);
create index if not exists menu_items_category_id_idx on public.menu_items(category_id);
create index if not exists menu_item_images_item_id_idx on public.menu_item_images(menu_item_id);
create index if not exists menu_variant_groups_item_id_idx on public.menu_item_variant_groups(menu_item_id);
create index if not exists menu_addon_groups_item_id_idx on public.menu_item_addon_groups(menu_item_id);
create index if not exists menu_ingredients_item_id_idx on public.menu_item_ingredients(menu_item_id);

alter table public.menus enable row level security;
alter table public.menu_categories enable row level security;
alter table public.menu_items enable row level security;
alter table public.menu_item_images enable row level security;
alter table public.menu_item_variant_groups enable row level security;
alter table public.menu_item_variants enable row level security;
alter table public.menu_item_addon_groups enable row level security;
alter table public.menu_item_addons enable row level security;
alter table public.menu_item_ingredients enable row level security;

drop trigger if exists set_menus_updated_at on public.menus;
create trigger set_menus_updated_at before update on public.menus for each row execute function public.set_updated_at();
drop trigger if exists set_menu_categories_updated_at on public.menu_categories;
create trigger set_menu_categories_updated_at before update on public.menu_categories for each row execute function public.set_updated_at();
drop trigger if exists set_menu_items_updated_at on public.menu_items;
create trigger set_menu_items_updated_at before update on public.menu_items for each row execute function public.set_updated_at();
drop trigger if exists set_menu_item_variant_groups_updated_at on public.menu_item_variant_groups;
create trigger set_menu_item_variant_groups_updated_at before update on public.menu_item_variant_groups for each row execute function public.set_updated_at();
drop trigger if exists set_menu_item_variants_updated_at on public.menu_item_variants;
create trigger set_menu_item_variants_updated_at before update on public.menu_item_variants for each row execute function public.set_updated_at();
drop trigger if exists set_menu_item_addon_groups_updated_at on public.menu_item_addon_groups;
create trigger set_menu_item_addon_groups_updated_at before update on public.menu_item_addon_groups for each row execute function public.set_updated_at();
drop trigger if exists set_menu_item_addons_updated_at on public.menu_item_addons;
create trigger set_menu_item_addons_updated_at before update on public.menu_item_addons for each row execute function public.set_updated_at();
drop trigger if exists set_menu_item_ingredients_updated_at on public.menu_item_ingredients;
create trigger set_menu_item_ingredients_updated_at before update on public.menu_item_ingredients for each row execute function public.set_updated_at();

grant select, insert, update, delete on
  public.menus,
  public.menu_categories,
  public.menu_items,
  public.menu_item_images,
  public.menu_item_variant_groups,
  public.menu_item_variants,
  public.menu_item_addon_groups,
  public.menu_item_addons,
  public.menu_item_ingredients
to authenticated;

create policy "Members can read menus" on public.menus for select to authenticated using (public.is_restaurant_member(restaurant_id, auth.uid()));
create policy "Owners can insert menus" on public.menus for insert to authenticated with check (public.restaurant_member_role(restaurant_id, auth.uid()) = 'owner');
create policy "Owners can update menus" on public.menus for update to authenticated using (public.restaurant_member_role(restaurant_id, auth.uid()) = 'owner') with check (public.restaurant_member_role(restaurant_id, auth.uid()) = 'owner');
create policy "Owners can delete menus" on public.menus for delete to authenticated using (public.restaurant_member_role(restaurant_id, auth.uid()) = 'owner');

create policy "Members can read menu categories" on public.menu_categories for select to authenticated using (public.is_restaurant_member(restaurant_id, auth.uid()));
create policy "Owners can insert menu categories" on public.menu_categories for insert to authenticated with check (public.restaurant_member_role(restaurant_id, auth.uid()) = 'owner');
create policy "Owners can update menu categories" on public.menu_categories for update to authenticated using (public.restaurant_member_role(restaurant_id, auth.uid()) = 'owner') with check (public.restaurant_member_role(restaurant_id, auth.uid()) = 'owner');
create policy "Owners can delete menu categories" on public.menu_categories for delete to authenticated using (public.restaurant_member_role(restaurant_id, auth.uid()) = 'owner');

create policy "Members can read menu items" on public.menu_items for select to authenticated using (public.is_restaurant_member(restaurant_id, auth.uid()));
create policy "Owners can insert menu items" on public.menu_items for insert to authenticated with check (public.restaurant_member_role(restaurant_id, auth.uid()) = 'owner');
create policy "Owners can update menu items" on public.menu_items for update to authenticated using (public.restaurant_member_role(restaurant_id, auth.uid()) = 'owner') with check (public.restaurant_member_role(restaurant_id, auth.uid()) = 'owner');
create policy "Owners can delete menu items" on public.menu_items for delete to authenticated using (public.restaurant_member_role(restaurant_id, auth.uid()) = 'owner');

create policy "Members can read menu item images" on public.menu_item_images for select to authenticated using (public.is_restaurant_member(restaurant_id, auth.uid()));
create policy "Owners can insert menu item images" on public.menu_item_images for insert to authenticated with check (public.restaurant_member_role(restaurant_id, auth.uid()) = 'owner');
create policy "Owners can update menu item images" on public.menu_item_images for update to authenticated using (public.restaurant_member_role(restaurant_id, auth.uid()) = 'owner') with check (public.restaurant_member_role(restaurant_id, auth.uid()) = 'owner');
create policy "Owners can delete menu item images" on public.menu_item_images for delete to authenticated using (public.restaurant_member_role(restaurant_id, auth.uid()) = 'owner');

create policy "Members can read variant groups" on public.menu_item_variant_groups for select to authenticated using (public.is_restaurant_member(restaurant_id, auth.uid()));
create policy "Owners can insert variant groups" on public.menu_item_variant_groups for insert to authenticated with check (public.restaurant_member_role(restaurant_id, auth.uid()) = 'owner');
create policy "Owners can update variant groups" on public.menu_item_variant_groups for update to authenticated using (public.restaurant_member_role(restaurant_id, auth.uid()) = 'owner') with check (public.restaurant_member_role(restaurant_id, auth.uid()) = 'owner');
create policy "Owners can delete variant groups" on public.menu_item_variant_groups for delete to authenticated using (public.restaurant_member_role(restaurant_id, auth.uid()) = 'owner');

create policy "Members can read variants" on public.menu_item_variants for select to authenticated using (public.is_restaurant_member(restaurant_id, auth.uid()));
create policy "Owners can insert variants" on public.menu_item_variants for insert to authenticated with check (public.restaurant_member_role(restaurant_id, auth.uid()) = 'owner');
create policy "Owners can update variants" on public.menu_item_variants for update to authenticated using (public.restaurant_member_role(restaurant_id, auth.uid()) = 'owner') with check (public.restaurant_member_role(restaurant_id, auth.uid()) = 'owner');
create policy "Owners can delete variants" on public.menu_item_variants for delete to authenticated using (public.restaurant_member_role(restaurant_id, auth.uid()) = 'owner');

create policy "Members can read addon groups" on public.menu_item_addon_groups for select to authenticated using (public.is_restaurant_member(restaurant_id, auth.uid()));
create policy "Owners can insert addon groups" on public.menu_item_addon_groups for insert to authenticated with check (public.restaurant_member_role(restaurant_id, auth.uid()) = 'owner');
create policy "Owners can update addon groups" on public.menu_item_addon_groups for update to authenticated using (public.restaurant_member_role(restaurant_id, auth.uid()) = 'owner') with check (public.restaurant_member_role(restaurant_id, auth.uid()) = 'owner');
create policy "Owners can delete addon groups" on public.menu_item_addon_groups for delete to authenticated using (public.restaurant_member_role(restaurant_id, auth.uid()) = 'owner');

create policy "Members can read addons" on public.menu_item_addons for select to authenticated using (public.is_restaurant_member(restaurant_id, auth.uid()));
create policy "Owners can insert addons" on public.menu_item_addons for insert to authenticated with check (public.restaurant_member_role(restaurant_id, auth.uid()) = 'owner');
create policy "Owners can update addons" on public.menu_item_addons for update to authenticated using (public.restaurant_member_role(restaurant_id, auth.uid()) = 'owner') with check (public.restaurant_member_role(restaurant_id, auth.uid()) = 'owner');
create policy "Owners can delete addons" on public.menu_item_addons for delete to authenticated using (public.restaurant_member_role(restaurant_id, auth.uid()) = 'owner');

create policy "Members can read ingredients" on public.menu_item_ingredients for select to authenticated using (public.is_restaurant_member(restaurant_id, auth.uid()));
create policy "Owners can insert ingredients" on public.menu_item_ingredients for insert to authenticated with check (public.restaurant_member_role(restaurant_id, auth.uid()) = 'owner');
create policy "Owners can update ingredients" on public.menu_item_ingredients for update to authenticated using (public.restaurant_member_role(restaurant_id, auth.uid()) = 'owner') with check (public.restaurant_member_role(restaurant_id, auth.uid()) = 'owner');
create policy "Owners can delete ingredients" on public.menu_item_ingredients for delete to authenticated using (public.restaurant_member_role(restaurant_id, auth.uid()) = 'owner');

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('menu-item-images', 'menu-item-images', false, 5242880, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create policy "Members can read menu item image objects"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'menu-item-images'
    and public.is_restaurant_member(public.storage_restaurant_id(name), auth.uid())
  );

create policy "Owners can upload menu item image objects"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'menu-item-images'
    and public.restaurant_member_role(public.storage_restaurant_id(name), auth.uid()) = 'owner'
  );

create policy "Owners can update menu item image objects"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'menu-item-images'
    and public.restaurant_member_role(public.storage_restaurant_id(name), auth.uid()) = 'owner'
  )
  with check (
    bucket_id = 'menu-item-images'
    and public.restaurant_member_role(public.storage_restaurant_id(name), auth.uid()) = 'owner'
  );

create policy "Owners can delete menu item image objects"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'menu-item-images'
    and public.restaurant_member_role(public.storage_restaurant_id(name), auth.uid()) = 'owner'
  );
