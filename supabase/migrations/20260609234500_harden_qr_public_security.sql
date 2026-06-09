revoke insert on public.menu_view_events from anon;
revoke insert on public.menu_view_events from authenticated;

drop policy if exists "Public can insert safe menu events" on public.menu_view_events;

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
  select case
    when target_event_type = 'restaurant_page_view' then
      exists (
        select 1
        from public.menus
        where menus.restaurant_id = target_restaurant_id
          and public.is_public_menu_active(menus.id)
      )
    when target_event_type = 'menu_page_view' then
      target_menu_id is not null
      and exists (
        select 1
        from public.menus
        where menus.id = target_menu_id
          and menus.restaurant_id = target_restaurant_id
          and public.is_public_menu_active(menus.id)
      )
    when target_event_type = 'item_detail_click' then
      target_menu_id is not null
      and target_menu_item_id is not null
      and exists (
        select 1
        from public.menu_items
        join public.menu_categories on menu_categories.id = menu_items.category_id
        join public.menus on menus.id = menu_items.menu_id
        where menu_items.id = target_menu_item_id
          and menu_items.menu_id = target_menu_id
          and menu_items.restaurant_id = target_restaurant_id
          and menu_categories.restaurant_id = target_restaurant_id
          and menu_categories.menu_id = target_menu_id
          and menu_categories.is_visible = true
          and menu_items.availability_status <> 'hidden'
          and public.is_public_menu_active(menus.id)
      )
    else false
  end;
$$;

create or replace function public.record_public_menu_event(
  target_restaurant_id uuid,
  target_menu_id uuid,
  target_menu_item_id uuid,
  target_event_type text,
  raw_source text,
  raw_table_number text,
  raw_user_agent text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  cleaned_source text;
  cleaned_table_number text;
  cleaned_user_agent text;
  recent_count integer;
begin
  if not public.is_safe_menu_event(
    target_restaurant_id,
    target_menu_id,
    target_menu_item_id,
    target_event_type
  ) then
    return false;
  end if;

  cleaned_source := nullif(left(regexp_replace(coalesce(raw_source, ''), '[^A-Za-z0-9_-]+', '', 'g'), 60), '');
  cleaned_table_number := nullif(left(regexp_replace(coalesce(raw_table_number, ''), '[^A-Za-z0-9_-]+', '', 'g'), 24), '');
  cleaned_user_agent := nullif(left(coalesce(raw_user_agent, ''), 500), '');

  select count(*)
  into recent_count
  from public.menu_view_events
  where restaurant_id = target_restaurant_id
    and event_type = target_event_type
    and coalesce(menu_id, '00000000-0000-0000-0000-000000000000'::uuid) =
      coalesce(target_menu_id, '00000000-0000-0000-0000-000000000000'::uuid)
    and coalesce(menu_item_id, '00000000-0000-0000-0000-000000000000'::uuid) =
      coalesce(target_menu_item_id, '00000000-0000-0000-0000-000000000000'::uuid)
    and coalesce(source, '') = coalesce(cleaned_source, '')
    and coalesce(table_number, '') = coalesce(cleaned_table_number, '')
    and coalesce(user_agent, '') = coalesce(cleaned_user_agent, '')
    and created_at > now() - interval '10 seconds';

  if recent_count >= 10 then
    return false;
  end if;

  insert into public.menu_view_events (
    restaurant_id,
    menu_id,
    menu_item_id,
    event_type,
    source,
    table_number,
    user_agent
  )
  values (
    target_restaurant_id,
    target_menu_id,
    target_menu_item_id,
    target_event_type,
    cleaned_source,
    cleaned_table_number,
    cleaned_user_agent
  );

  return true;
end;
$$;

grant execute on function public.record_public_menu_event(uuid, uuid, uuid, text, text, text, text) to anon, authenticated;

create or replace function public.enforce_qr_link_public_target()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.table_number is not null and new.table_number !~ '^[A-Za-z0-9_-]{1,24}$' then
    raise exception 'qr_links.table_number must use letters, numbers, underscores, or hyphens only'
      using errcode = '23514';
  end if;

  if new.destination_type = 'restaurant' then
    if new.menu_id is not null then
      raise exception 'restaurant QR links cannot reference a menu'
        using errcode = '23514';
    end if;
    return new;
  end if;

  if new.destination_type = 'menu' then
    if new.menu_id is null then
      raise exception 'menu QR links must reference a menu'
        using errcode = '23514';
    end if;

    if not exists (
      select 1
      from public.menus
      where menus.id = new.menu_id
        and menus.restaurant_id = new.restaurant_id
        and menus.status = 'published'
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
    ) then
      raise exception 'menu QR links can only reference published menus with visible categories and items'
        using errcode = '23514';
    end if;
  end if;

  return new;
end;
$$;

do $$
begin
  if exists (
    select 1
    from public.qr_links
    where table_number is not null
      and table_number !~ '^[A-Za-z0-9_-]{1,24}$'
  ) then
    raise exception 'Existing qr_links contain invalid table numbers';
  end if;

  if exists (
    select 1
    from public.qr_links
    left join public.menus on menus.id = qr_links.menu_id
    where (
      qr_links.destination_type = 'restaurant'
      and qr_links.menu_id is not null
    )
    or (
      qr_links.destination_type = 'menu'
      and (
        qr_links.menu_id is null
        or menus.restaurant_id <> qr_links.restaurant_id
        or menus.status <> 'published'
        or not exists (
          select 1
          from public.menu_categories
          where menu_categories.menu_id = menus.id
            and menu_categories.restaurant_id = menus.restaurant_id
            and menu_categories.is_visible = true
        )
        or not exists (
          select 1
          from public.menu_items
          where menu_items.menu_id = menus.id
            and menu_items.restaurant_id = menus.restaurant_id
        )
      )
    )
  ) then
    raise exception 'Existing qr_links contain invalid menu targets';
  end if;
end;
$$;

drop trigger if exists enforce_qr_link_public_target_on_qr_links on public.qr_links;
create trigger enforce_qr_link_public_target_on_qr_links
  before insert or update of restaurant_id, menu_id, table_number, destination_type
  on public.qr_links
  for each row
  execute function public.enforce_qr_link_public_target();

alter table public.qr_links
  drop constraint if exists qr_links_table_number_format_check;

alter table public.qr_links
  add constraint qr_links_table_number_format_check
  check (table_number is null or table_number ~ '^[A-Za-z0-9_-]{1,24}$');

create index if not exists restaurants_slug_idx on public.restaurants(slug);
create index if not exists menus_restaurant_slug_idx on public.menus(restaurant_id, slug);
create index if not exists menus_restaurant_status_idx on public.menus(restaurant_id, status);
create index if not exists menu_categories_menu_visible_idx on public.menu_categories(menu_id, is_visible);
create index if not exists menu_items_menu_availability_idx on public.menu_items(menu_id, availability_status);
create index if not exists menu_item_images_image_path_idx on public.menu_item_images(image_path);
create index if not exists menu_view_events_restaurant_created_at_idx on public.menu_view_events(restaurant_id, created_at);

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
      (logo_path is not null) as has_logo,
      (cover_image_path is not null) as has_cover,
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
    limit 12
  )
  select case
    when not exists (select 1 from restaurant_record) then null
    when menu_slug_input is not null and not exists (select 1 from active_menus) then null
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
                          select jsonb_agg(jsonb_build_object('id', menu_item_images.id) order by menu_item_images.sort_order)
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
                    limit 250
                  ), '[]'::jsonb)
                )
                order by menu_categories.sort_order, menu_categories.name
              )
              from public.menu_categories
              where menu_categories.menu_id = active_menus.id
                and menu_categories.is_visible = true
              limit 50
            ), '[]'::jsonb)
          )
          order by active_menus.sort_order, active_menus.name
        )
        from active_menus
      ), '[]'::jsonb)
    )
  end;
$$;

create or replace function public.get_public_menu_asset(
  restaurant_slug_input text,
  asset_kind_input text,
  image_id_input uuid default null
)
returns jsonb
language sql
security definer
set search_path = public
as $$
  select case
    when asset_kind_input = 'logo' then (
      select jsonb_build_object('bucket', 'restaurant-assets', 'path', restaurants.logo_path)
      from public.restaurants
      where restaurants.slug = restaurant_slug_input
        and restaurants.logo_path is not null
        and exists (
          select 1
          from public.menus
          where menus.restaurant_id = restaurants.id
            and public.is_public_menu_active(menus.id)
        )
      limit 1
    )
    when asset_kind_input = 'cover' then (
      select jsonb_build_object('bucket', 'restaurant-assets', 'path', restaurants.cover_image_path)
      from public.restaurants
      where restaurants.slug = restaurant_slug_input
        and restaurants.cover_image_path is not null
        and exists (
          select 1
          from public.menus
          where menus.restaurant_id = restaurants.id
            and public.is_public_menu_active(menus.id)
        )
      limit 1
    )
    when asset_kind_input = 'item' then (
      select jsonb_build_object('bucket', 'menu-item-images', 'path', menu_item_images.image_path)
      from public.menu_item_images
      join public.menu_items on menu_items.id = menu_item_images.menu_item_id
      join public.menu_categories on menu_categories.id = menu_items.category_id
      join public.menus on menus.id = menu_items.menu_id
      join public.restaurants on restaurants.id = menus.restaurant_id
      where restaurants.slug = restaurant_slug_input
        and menu_item_images.id = image_id_input
        and menu_item_images.restaurant_id = restaurants.id
        and menu_categories.is_visible = true
        and menu_items.availability_status <> 'hidden'
        and public.is_public_menu_active(menus.id)
      limit 1
    )
    else null
  end;
$$;

grant execute on function public.get_public_menu_asset(text, text, uuid) to anon, authenticated;
