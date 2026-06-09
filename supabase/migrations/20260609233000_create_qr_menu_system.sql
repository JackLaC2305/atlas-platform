alter table public.menus
  add column if not exists slug text;

create or replace function public.slugify_menu_name(value text)
returns text
language sql
immutable
as $$
  select trim(both '-' from regexp_replace(lower(coalesce(value, 'menu')), '[^a-z0-9]+', '-', 'g'));
$$;

create or replace function public.ensure_menu_slug()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  base_slug text;
  candidate_slug text;
  counter integer := 1;
begin
  if new.slug is not null and new.slug <> '' then
    new.slug := public.slugify_menu_name(new.slug);
  else
    new.slug := public.slugify_menu_name(new.name);
  end if;

  if new.slug is null or new.slug = '' then
    new.slug := 'menu';
  end if;

  base_slug := new.slug;
  candidate_slug := base_slug;

  while exists (
    select 1
    from public.menus
    where menus.restaurant_id = new.restaurant_id
      and menus.slug = candidate_slug
      and menus.id <> new.id
  ) loop
    counter := counter + 1;
    candidate_slug := base_slug || '-' || counter::text;
  end loop;

  new.slug := candidate_slug;
  return new;
end;
$$;

update public.menus
set slug = public.slugify_menu_name(name)
where slug is null or slug = '';

do $$
declare
  menu_record record;
  candidate_slug text;
  counter integer;
begin
  for menu_record in
    select id, restaurant_id, slug
    from public.menus
    order by created_at, id
  loop
    candidate_slug := coalesce(nullif(menu_record.slug, ''), 'menu');
    counter := 1;

    while exists (
      select 1
      from public.menus
      where restaurant_id = menu_record.restaurant_id
        and slug = candidate_slug
        and id <> menu_record.id
    ) loop
      counter := counter + 1;
      candidate_slug := coalesce(nullif(menu_record.slug, ''), 'menu') || '-' || counter::text;
    end loop;

    update public.menus
    set slug = candidate_slug
    where id = menu_record.id;
  end loop;
end;
$$;

alter table public.menus
  alter column slug set not null;

create unique index if not exists menus_restaurant_slug_unique_idx
  on public.menus(restaurant_id, slug);

drop trigger if exists ensure_menu_slug_on_menus on public.menus;
create trigger ensure_menu_slug_on_menus
  before insert or update of name, slug, restaurant_id
  on public.menus
  for each row
  execute function public.ensure_menu_slug();

create table if not exists public.qr_links (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  menu_id uuid references public.menus(id) on delete cascade,
  table_number text,
  destination_type text not null,
  destination_url text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint qr_links_destination_type_check check (destination_type in ('restaurant', 'menu')),
  constraint qr_links_destination_menu_check check (
    (destination_type = 'restaurant' and menu_id is null)
    or (destination_type = 'menu' and menu_id is not null)
  )
);

create table if not exists public.menu_view_events (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  menu_id uuid references public.menus(id) on delete set null,
  menu_item_id uuid references public.menu_items(id) on delete set null,
  event_type text not null,
  source text,
  table_number text,
  user_agent text,
  created_at timestamptz not null default now(),
  constraint menu_view_events_event_type_check check (
    event_type in ('restaurant_page_view', 'menu_page_view', 'item_detail_click')
  )
);

create index if not exists qr_links_restaurant_id_idx on public.qr_links(restaurant_id);
create index if not exists qr_links_menu_id_idx on public.qr_links(menu_id);
create index if not exists menu_view_events_restaurant_id_idx on public.menu_view_events(restaurant_id);
create index if not exists menu_view_events_menu_id_idx on public.menu_view_events(menu_id);
create index if not exists menu_view_events_created_at_idx on public.menu_view_events(created_at);

alter table public.qr_links enable row level security;
alter table public.menu_view_events enable row level security;

drop trigger if exists set_qr_links_updated_at on public.qr_links;
create trigger set_qr_links_updated_at
  before update on public.qr_links
  for each row
  execute function public.set_updated_at();

grant select, insert, update, delete on public.qr_links to authenticated;
grant select, insert on public.menu_view_events to authenticated;
grant insert on public.menu_view_events to anon;

create policy "Members can read QR links"
  on public.qr_links for select to authenticated
  using (public.is_restaurant_member(restaurant_id, auth.uid()));

create policy "Owners can insert QR links"
  on public.qr_links for insert to authenticated
  with check (
    public.restaurant_member_role(restaurant_id, auth.uid()) = 'owner'
    and (
      menu_id is null
      or exists (
        select 1 from public.menus
        where menus.id = qr_links.menu_id
          and menus.restaurant_id = qr_links.restaurant_id
      )
    )
  );

create policy "Owners can update QR links"
  on public.qr_links for update to authenticated
  using (public.restaurant_member_role(restaurant_id, auth.uid()) = 'owner')
  with check (
    public.restaurant_member_role(restaurant_id, auth.uid()) = 'owner'
    and (
      menu_id is null
      or exists (
        select 1 from public.menus
        where menus.id = qr_links.menu_id
          and menus.restaurant_id = qr_links.restaurant_id
      )
    )
  );

create policy "Owners can delete QR links"
  on public.qr_links for delete to authenticated
  using (public.restaurant_member_role(restaurant_id, auth.uid()) = 'owner');

create policy "Members can read menu events"
  on public.menu_view_events for select to authenticated
  using (public.is_restaurant_member(restaurant_id, auth.uid()));

create or replace function public.is_safe_menu_event(
  target_restaurant_id uuid,
  target_menu_id uuid,
  target_menu_item_id uuid,
  target_event_type text
)
returns boolean
language sql
security definer
set search_path = public
as $$
  select
    target_event_type in ('restaurant_page_view', 'menu_page_view', 'item_detail_click')
    and exists (select 1 from public.restaurants where restaurants.id = target_restaurant_id)
    and (
      target_menu_id is null
      or exists (
        select 1 from public.menus
        where menus.id = target_menu_id
          and menus.restaurant_id = target_restaurant_id
      )
    )
    and (
      target_menu_item_id is null
      or exists (
        select 1 from public.menu_items
        where menu_items.id = target_menu_item_id
          and menu_items.restaurant_id = target_restaurant_id
          and (target_menu_id is null or menu_items.menu_id = target_menu_id)
      )
    );
$$;

grant execute on function public.is_safe_menu_event(uuid, uuid, uuid, text) to anon, authenticated;

create policy "Public can insert safe menu events"
  on public.menu_view_events for insert to anon, authenticated
  with check (
    public.is_safe_menu_event(restaurant_id, menu_id, menu_item_id, event_type)
  );

create or replace function public.is_public_menu_active(target_menu_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  menu_record record;
  local_now timestamp;
  local_day text;
begin
  select menus.*, restaurants.timezone
  into menu_record
  from public.menus
  join public.restaurants on restaurants.id = menus.restaurant_id
  where menus.id = target_menu_id;

  if not found or menu_record.status <> 'published' then
    return false;
  end if;

  if menu_record.availability_type = 'always' then
    return true;
  end if;

  local_now := now() at time zone coalesce(menu_record.timezone, 'Europe/Dublin');
  local_day := trim(to_char(local_now, 'Day'));

  return
    (menu_record.start_date is null or local_now::date >= menu_record.start_date)
    and (menu_record.end_date is null or local_now::date <= menu_record.end_date)
    and (menu_record.schedule_days ? local_day)
    and menu_record.start_time is not null
    and menu_record.end_time is not null
    and local_now::time >= menu_record.start_time
    and local_now::time <= menu_record.end_time;
end;
$$;

create or replace function public.is_public_restaurant_asset(object_name text)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.restaurants
    join public.menus on menus.restaurant_id = restaurants.id
    where public.is_public_menu_active(menus.id)
      and object_name in (restaurants.logo_path, restaurants.cover_image_path)
  );
$$;

create or replace function public.is_public_menu_item_image(object_name text)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.menu_item_images
    join public.menu_items on menu_items.id = menu_item_images.menu_item_id
    join public.menu_categories on menu_categories.id = menu_items.category_id
    join public.menus on menus.id = menu_items.menu_id
    where menu_item_images.image_path = object_name
      and menu_categories.is_visible = true
      and menu_items.availability_status <> 'hidden'
      and public.is_public_menu_active(menus.id)
  );
$$;

create or replace function public.get_public_menu_page(
  restaurant_slug_input text,
  menu_slug_input text default null
)
returns jsonb
language sql
security definer
set search_path = public
as $$
  with restaurant_record as (
    select
      id,
      name,
      slug,
      description,
      opening_hours,
      logo_path,
      cover_image_path,
      primary_colour,
      secondary_colour
    from public.restaurants
    where slug = restaurant_slug_input
    limit 1
  ),
  active_menus as (
    select
      menus.id,
      menus.name,
      menus.slug,
      menus.description,
      menus.sort_order
    from public.menus
    join restaurant_record on restaurant_record.id = menus.restaurant_id
    where public.is_public_menu_active(menus.id)
      and (menu_slug_input is null or menus.slug = menu_slug_input)
      and exists (
        select 1
        from public.menu_categories
        where menu_categories.menu_id = menus.id
          and menu_categories.restaurant_id = menus.restaurant_id
          and menu_categories.is_visible = true
      )
      and exists (
        select 1
        from public.menu_items
        where menu_items.menu_id = menus.id
          and menu_items.restaurant_id = menus.restaurant_id
      )
    order by menus.sort_order, menus.name
  )
  select case
    when not exists (select 1 from restaurant_record) then null
    else jsonb_build_object(
      'restaurant', (
        select to_jsonb(restaurant_record) from restaurant_record
      ),
      'menus', coalesce((
        select jsonb_agg(
          jsonb_build_object(
            'id', active_menus.id,
            'name', active_menus.name,
            'slug', active_menus.slug,
            'description', active_menus.description,
            'categories', coalesce((
              select jsonb_agg(
                jsonb_build_object(
                  'id', menu_categories.id,
                  'name', menu_categories.name,
                  'description', menu_categories.description,
                  'items', coalesce((
                    select jsonb_agg(
                      jsonb_build_object(
                        'id', menu_items.id,
                        'name', menu_items.name,
                        'description', menu_items.description,
                        'base_price', menu_items.base_price,
                        'currency', menu_items.currency,
                        'availability_status', menu_items.availability_status,
                        'is_featured', menu_items.is_featured,
                        'show_ingredient_summary', menu_items.show_ingredient_summary,
                        'badges', menu_items.badges,
                        'dietary_tags', menu_items.dietary_tags,
                        'allergens', menu_items.allergens,
                        'images', coalesce((
                          select jsonb_agg(jsonb_build_object('image_path', menu_item_images.image_path) order by menu_item_images.sort_order)
                          from public.menu_item_images
                          where menu_item_images.menu_item_id = menu_items.id
                            and menu_item_images.restaurant_id = menu_items.restaurant_id
                        ), '[]'::jsonb),
                        'variant_groups', coalesce((
                          select jsonb_agg(
                            jsonb_build_object(
                              'name', menu_item_variant_groups.name,
                              'is_required', menu_item_variant_groups.is_required,
                              'variants', coalesce((
                                select jsonb_agg(
                                  jsonb_build_object(
                                    'name', menu_item_variants.name,
                                    'price_delta', menu_item_variants.price_delta
                                  )
                                  order by menu_item_variants.sort_order
                                )
                                from public.menu_item_variants
                                where menu_item_variants.variant_group_id = menu_item_variant_groups.id
                                  and menu_item_variants.restaurant_id = menu_item_variant_groups.restaurant_id
                              ), '[]'::jsonb)
                            )
                            order by menu_item_variant_groups.sort_order
                          )
                          from public.menu_item_variant_groups
                          where menu_item_variant_groups.menu_item_id = menu_items.id
                            and menu_item_variant_groups.restaurant_id = menu_items.restaurant_id
                        ), '[]'::jsonb),
                        'addon_groups', coalesce((
                          select jsonb_agg(
                            jsonb_build_object(
                              'name', menu_item_addon_groups.name,
                              'max_selections', menu_item_addon_groups.max_selections,
                              'addons', coalesce((
                                select jsonb_agg(
                                  jsonb_build_object(
                                    'name', menu_item_addons.name,
                                    'price_delta', menu_item_addons.price_delta
                                  )
                                  order by menu_item_addons.sort_order
                                )
                                from public.menu_item_addons
                                where menu_item_addons.addon_group_id = menu_item_addon_groups.id
                                  and menu_item_addons.restaurant_id = menu_item_addon_groups.restaurant_id
                              ), '[]'::jsonb)
                            )
                            order by menu_item_addon_groups.sort_order
                          )
                          from public.menu_item_addon_groups
                          where menu_item_addon_groups.menu_item_id = menu_items.id
                            and menu_item_addon_groups.restaurant_id = menu_items.restaurant_id
                        ), '[]'::jsonb),
                        'ingredients', case
                          when menu_items.show_ingredient_summary then coalesce((
                            select jsonb_agg(menu_item_ingredients.ingredient_name order by menu_item_ingredients.sort_order)
                            from public.menu_item_ingredients
                            where menu_item_ingredients.menu_item_id = menu_items.id
                              and menu_item_ingredients.restaurant_id = menu_items.restaurant_id
                          ), '[]'::jsonb)
                          else '[]'::jsonb
                        end
                      )
                      order by menu_items.sort_order, menu_items.name
                    )
                    from public.menu_items
                    where menu_items.category_id = menu_categories.id
                      and menu_items.restaurant_id = menu_categories.restaurant_id
                      and menu_items.availability_status <> 'hidden'
                  ), '[]'::jsonb)
                )
                order by menu_categories.sort_order, menu_categories.name
              )
              from public.menu_categories
              where menu_categories.menu_id = active_menus.id
                and menu_categories.is_visible = true
            ), '[]'::jsonb)
          )
          order by active_menus.sort_order, active_menus.name
        )
        from active_menus
      ), '[]'::jsonb)
    )
  end;
$$;

grant execute on function public.is_public_menu_active(uuid) to anon, authenticated;
grant execute on function public.is_public_restaurant_asset(text) to anon, authenticated;
grant execute on function public.is_public_menu_item_image(text) to anon, authenticated;
grant execute on function public.get_public_menu_page(text, text) to anon, authenticated;

create policy "Public can read active restaurant asset objects"
  on storage.objects
  for select
  to anon, authenticated
  using (
    bucket_id = 'restaurant-assets'
    and public.is_public_restaurant_asset(name)
  );

create policy "Public can read active menu item image objects"
  on storage.objects
  for select
  to anon, authenticated
  using (
    bucket_id = 'menu-item-images'
    and public.is_public_menu_item_image(name)
  );
