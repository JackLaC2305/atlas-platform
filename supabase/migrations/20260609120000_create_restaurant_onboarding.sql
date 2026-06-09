create table if not exists public.restaurants (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  slug text not null unique,
  restaurant_type text not null,
  cuisine_type text not null,
  description text not null,
  business_email text not null,
  phone text not null,
  website text,
  address_line_1 text not null,
  address_line_2 text,
  city text not null,
  county_or_state text,
  postcode text,
  country text not null,
  instagram_url text,
  facebook_url text,
  tiktok_url text,
  x_url text,
  linkedin_url text,
  opening_hours jsonb not null default '{}'::jsonb,
  currency text not null,
  timezone text not null,
  seating_capacity_range text not null,
  location_count_range text not null,
  logo_url text,
  logo_path text,
  cover_image_url text,
  cover_image_path text,
  primary_colour text not null,
  secondary_colour text,
  menu_setup_method text not null,
  menu_pdf_url text,
  menu_pdf_path text,
  existing_menu_source text not null,
  approximate_menu_items_range text not null,
  primary_objective text not null,
  onboarding_completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint restaurants_slug_format_check check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint restaurants_menu_setup_method_check check (menu_setup_method in ('build_manually', 'import_pdf', 'import_later'))
);

create table if not exists public.restaurant_members (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint restaurant_members_role_check check (role in ('owner', 'manager', 'staff')),
  constraint restaurant_members_restaurant_user_unique unique (restaurant_id, user_id)
);

create table if not exists public.restaurant_assets (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  asset_type text not null,
  file_url text,
  file_path text not null,
  original_file_name text not null,
  mime_type text not null,
  file_size bigint not null,
  created_at timestamptz not null default now(),
  constraint restaurant_assets_asset_type_check check (asset_type in ('logo', 'cover', 'menu_pdf'))
);

create index if not exists restaurants_owner_id_idx on public.restaurants(owner_id);
create index if not exists restaurant_members_user_id_idx on public.restaurant_members(user_id);
create index if not exists restaurant_members_restaurant_id_idx on public.restaurant_members(restaurant_id);
create index if not exists restaurant_assets_restaurant_id_idx on public.restaurant_assets(restaurant_id);

alter table public.restaurants enable row level security;
alter table public.restaurant_members enable row level security;
alter table public.restaurant_assets enable row level security;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_restaurants_updated_at on public.restaurants;
create trigger set_restaurants_updated_at
  before update on public.restaurants
  for each row
  execute function public.set_updated_at();

drop trigger if exists set_restaurant_members_updated_at on public.restaurant_members;
create trigger set_restaurant_members_updated_at
  before update on public.restaurant_members
  for each row
  execute function public.set_updated_at();

create or replace function public.is_restaurant_member(target_restaurant_id uuid, target_user_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.restaurant_members
    where restaurant_members.restaurant_id = target_restaurant_id
      and restaurant_members.user_id = target_user_id
  );
$$;

create or replace function public.restaurant_member_role(target_restaurant_id uuid, target_user_id uuid)
returns text
language sql
security definer
set search_path = public
as $$
  select restaurant_members.role
  from public.restaurant_members
  where restaurant_members.restaurant_id = target_restaurant_id
    and restaurant_members.user_id = target_user_id
  limit 1;
$$;

create or replace function public.user_owns_restaurant(target_restaurant_id uuid, target_user_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.restaurants
    where restaurants.id = target_restaurant_id
      and restaurants.owner_id = target_user_id
  );
$$;

create or replace function public.storage_restaurant_id(object_name text)
returns uuid
language plpgsql
security definer
set search_path = public, storage
as $$
declare
  folder_name text;
begin
  folder_name := (storage.foldername(object_name))[1];

  if folder_name ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    return folder_name::uuid;
  end if;

  return null;
end;
$$;

create policy "Users can create restaurants they own"
  on public.restaurants
  for insert
  to authenticated
  with check (owner_id = auth.uid());

create policy "Members can read their restaurants"
  on public.restaurants
  for select
  to authenticated
  using (public.is_restaurant_member(id, auth.uid()));

create policy "Owners and managers can update their restaurants"
  on public.restaurants
  for update
  to authenticated
  using (public.restaurant_member_role(id, auth.uid()) in ('owner', 'manager'))
  with check (public.restaurant_member_role(id, auth.uid()) in ('owner', 'manager'));

create policy "Users can create owner membership for owned restaurants"
  on public.restaurant_members
  for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and role = 'owner'
    and public.user_owns_restaurant(restaurant_id, auth.uid())
  );

create policy "Members can read memberships for their restaurants"
  on public.restaurant_members
  for select
  to authenticated
  using (public.is_restaurant_member(restaurant_id, auth.uid()));

create policy "Owners can manage restaurant memberships"
  on public.restaurant_members
  for update
  to authenticated
  using (public.restaurant_member_role(restaurant_id, auth.uid()) = 'owner')
  with check (public.restaurant_member_role(restaurant_id, auth.uid()) = 'owner');

create policy "Members can read restaurant assets"
  on public.restaurant_assets
  for select
  to authenticated
  using (public.is_restaurant_member(restaurant_id, auth.uid()));

create policy "Owners and managers can create restaurant assets"
  on public.restaurant_assets
  for insert
  to authenticated
  with check (public.restaurant_member_role(restaurant_id, auth.uid()) in ('owner', 'manager'));

create policy "Owners and managers can update restaurant assets"
  on public.restaurant_assets
  for update
  to authenticated
  using (public.restaurant_member_role(restaurant_id, auth.uid()) in ('owner', 'manager'))
  with check (public.restaurant_member_role(restaurant_id, auth.uid()) in ('owner', 'manager'));

create policy "Owners and managers can delete restaurant assets"
  on public.restaurant_assets
  for delete
  to authenticated
  using (public.restaurant_member_role(restaurant_id, auth.uid()) in ('owner', 'manager'));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('restaurant-assets', 'restaurant-assets', false, 5242880, array['image/png', 'image/jpeg', 'image/webp']),
  ('menu-imports', 'menu-imports', false, 10485760, array['application/pdf'])
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "Members can read restaurant asset objects"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id in ('restaurant-assets', 'menu-imports')
    and public.is_restaurant_member(public.storage_restaurant_id(name), auth.uid())
  );

create policy "Owners and managers can upload restaurant asset objects"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id in ('restaurant-assets', 'menu-imports')
    and public.restaurant_member_role(public.storage_restaurant_id(name), auth.uid()) in ('owner', 'manager')
  );

create policy "Owners and managers can update restaurant asset objects"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id in ('restaurant-assets', 'menu-imports')
    and public.restaurant_member_role(public.storage_restaurant_id(name), auth.uid()) in ('owner', 'manager')
  )
  with check (
    bucket_id in ('restaurant-assets', 'menu-imports')
    and public.restaurant_member_role(public.storage_restaurant_id(name), auth.uid()) in ('owner', 'manager')
  );

create policy "Owners and managers can delete restaurant asset objects"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id in ('restaurant-assets', 'menu-imports')
    and public.restaurant_member_role(public.storage_restaurant_id(name), auth.uid()) in ('owner', 'manager')
  );
