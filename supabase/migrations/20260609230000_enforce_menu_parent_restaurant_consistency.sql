create or replace function public.enforce_menu_restaurant_consistency()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_table_name = 'menu_categories' then
    if not exists (
      select 1
      from public.menus
      where menus.id = new.menu_id
        and menus.restaurant_id = new.restaurant_id
    ) then
      raise exception 'menu_categories.restaurant_id must match menus.restaurant_id'
        using errcode = '23514';
    end if;
  elsif tg_table_name = 'menu_items' then
    if not exists (
      select 1
      from public.menus
      join public.menu_categories on menu_categories.id = new.category_id
      where menus.id = new.menu_id
        and menus.restaurant_id = new.restaurant_id
        and menu_categories.restaurant_id = new.restaurant_id
        and menu_categories.menu_id = new.menu_id
    ) then
      raise exception 'menu_items restaurant, menu, and category relationship is inconsistent'
        using errcode = '23514';
    end if;
  elsif tg_table_name = 'menu_item_images' then
    if not exists (
      select 1
      from public.menu_items
      where menu_items.id = new.menu_item_id
        and menu_items.restaurant_id = new.restaurant_id
    ) then
      raise exception 'menu_item_images.restaurant_id must match menu_items.restaurant_id'
        using errcode = '23514';
    end if;
  elsif tg_table_name = 'menu_item_variant_groups' then
    if not exists (
      select 1
      from public.menu_items
      where menu_items.id = new.menu_item_id
        and menu_items.restaurant_id = new.restaurant_id
    ) then
      raise exception 'menu_item_variant_groups.restaurant_id must match menu_items.restaurant_id'
        using errcode = '23514';
    end if;
  elsif tg_table_name = 'menu_item_variants' then
    if not exists (
      select 1
      from public.menu_item_variant_groups
      where menu_item_variant_groups.id = new.variant_group_id
        and menu_item_variant_groups.restaurant_id = new.restaurant_id
    ) then
      raise exception 'menu_item_variants.restaurant_id must match menu_item_variant_groups.restaurant_id'
        using errcode = '23514';
    end if;
  elsif tg_table_name = 'menu_item_addon_groups' then
    if not exists (
      select 1
      from public.menu_items
      where menu_items.id = new.menu_item_id
        and menu_items.restaurant_id = new.restaurant_id
    ) then
      raise exception 'menu_item_addon_groups.restaurant_id must match menu_items.restaurant_id'
        using errcode = '23514';
    end if;
  elsif tg_table_name = 'menu_item_addons' then
    if not exists (
      select 1
      from public.menu_item_addon_groups
      where menu_item_addon_groups.id = new.addon_group_id
        and menu_item_addon_groups.restaurant_id = new.restaurant_id
    ) then
      raise exception 'menu_item_addons.restaurant_id must match menu_item_addon_groups.restaurant_id'
        using errcode = '23514';
    end if;
  elsif tg_table_name = 'menu_item_ingredients' then
    if not exists (
      select 1
      from public.menu_items
      where menu_items.id = new.menu_item_id
        and menu_items.restaurant_id = new.restaurant_id
    ) then
      raise exception 'menu_item_ingredients.restaurant_id must match menu_items.restaurant_id'
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
    from public.menu_categories
    join public.menus on menus.id = menu_categories.menu_id
    where menu_categories.restaurant_id <> menus.restaurant_id
  ) then
    raise exception 'Existing menu_categories contain cross-restaurant menu references';
  end if;

  if exists (
    select 1
    from public.menu_items
    join public.menus on menus.id = menu_items.menu_id
    join public.menu_categories on menu_categories.id = menu_items.category_id
    where menu_items.restaurant_id <> menus.restaurant_id
       or menu_items.restaurant_id <> menu_categories.restaurant_id
       or menu_items.menu_id <> menu_categories.menu_id
  ) then
    raise exception 'Existing menu_items contain inconsistent restaurant/menu/category references';
  end if;

  if exists (
    select 1
    from public.menu_item_images
    join public.menu_items on menu_items.id = menu_item_images.menu_item_id
    where menu_item_images.restaurant_id <> menu_items.restaurant_id
  ) then
    raise exception 'Existing menu_item_images contain cross-restaurant item references';
  end if;

  if exists (
    select 1
    from public.menu_item_variant_groups
    join public.menu_items on menu_items.id = menu_item_variant_groups.menu_item_id
    where menu_item_variant_groups.restaurant_id <> menu_items.restaurant_id
  ) then
    raise exception 'Existing menu_item_variant_groups contain cross-restaurant item references';
  end if;

  if exists (
    select 1
    from public.menu_item_variants
    join public.menu_item_variant_groups on menu_item_variant_groups.id = menu_item_variants.variant_group_id
    where menu_item_variants.restaurant_id <> menu_item_variant_groups.restaurant_id
  ) then
    raise exception 'Existing menu_item_variants contain cross-restaurant variant group references';
  end if;

  if exists (
    select 1
    from public.menu_item_addon_groups
    join public.menu_items on menu_items.id = menu_item_addon_groups.menu_item_id
    where menu_item_addon_groups.restaurant_id <> menu_items.restaurant_id
  ) then
    raise exception 'Existing menu_item_addon_groups contain cross-restaurant item references';
  end if;

  if exists (
    select 1
    from public.menu_item_addons
    join public.menu_item_addon_groups on menu_item_addon_groups.id = menu_item_addons.addon_group_id
    where menu_item_addons.restaurant_id <> menu_item_addon_groups.restaurant_id
  ) then
    raise exception 'Existing menu_item_addons contain cross-restaurant addon group references';
  end if;

  if exists (
    select 1
    from public.menu_item_ingredients
    join public.menu_items on menu_items.id = menu_item_ingredients.menu_item_id
    where menu_item_ingredients.restaurant_id <> menu_items.restaurant_id
  ) then
    raise exception 'Existing menu_item_ingredients contain cross-restaurant item references';
  end if;
end;
$$;

drop trigger if exists enforce_menu_categories_restaurant_consistency on public.menu_categories;
create trigger enforce_menu_categories_restaurant_consistency
  before insert or update of restaurant_id, menu_id
  on public.menu_categories
  for each row
  execute function public.enforce_menu_restaurant_consistency();

drop trigger if exists enforce_menu_items_restaurant_consistency on public.menu_items;
create trigger enforce_menu_items_restaurant_consistency
  before insert or update of restaurant_id, menu_id, category_id
  on public.menu_items
  for each row
  execute function public.enforce_menu_restaurant_consistency();

drop trigger if exists enforce_menu_item_images_restaurant_consistency on public.menu_item_images;
create trigger enforce_menu_item_images_restaurant_consistency
  before insert or update of restaurant_id, menu_item_id
  on public.menu_item_images
  for each row
  execute function public.enforce_menu_restaurant_consistency();

drop trigger if exists enforce_menu_item_variant_groups_restaurant_consistency on public.menu_item_variant_groups;
create trigger enforce_menu_item_variant_groups_restaurant_consistency
  before insert or update of restaurant_id, menu_item_id
  on public.menu_item_variant_groups
  for each row
  execute function public.enforce_menu_restaurant_consistency();

drop trigger if exists enforce_menu_item_variants_restaurant_consistency on public.menu_item_variants;
create trigger enforce_menu_item_variants_restaurant_consistency
  before insert or update of restaurant_id, variant_group_id
  on public.menu_item_variants
  for each row
  execute function public.enforce_menu_restaurant_consistency();

drop trigger if exists enforce_menu_item_addon_groups_restaurant_consistency on public.menu_item_addon_groups;
create trigger enforce_menu_item_addon_groups_restaurant_consistency
  before insert or update of restaurant_id, menu_item_id
  on public.menu_item_addon_groups
  for each row
  execute function public.enforce_menu_restaurant_consistency();

drop trigger if exists enforce_menu_item_addons_restaurant_consistency on public.menu_item_addons;
create trigger enforce_menu_item_addons_restaurant_consistency
  before insert or update of restaurant_id, addon_group_id
  on public.menu_item_addons
  for each row
  execute function public.enforce_menu_restaurant_consistency();

drop trigger if exists enforce_menu_item_ingredients_restaurant_consistency on public.menu_item_ingredients;
create trigger enforce_menu_item_ingredients_restaurant_consistency
  before insert or update of restaurant_id, menu_item_id
  on public.menu_item_ingredients
  for each row
  execute function public.enforce_menu_restaurant_consistency();
