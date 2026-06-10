alter table public.inventory_ingredients
  add column if not exists stock_tracking_mode text not null default 'exact',
  add column if not exists package_description text;

alter table public.inventory_ingredients
  drop constraint if exists inventory_ingredients_stock_tracking_mode_check;

alter table public.inventory_ingredients
  add constraint inventory_ingredients_stock_tracking_mode_check
  check (stock_tracking_mode in ('exact', 'approximate'));

create or replace function public.inventory_unit_factor(target_unit text)
returns numeric
language sql
immutable
as $$
  select case lower(target_unit)
    when 'milligram' then 0.001
    when 'gram' then 1
    when 'kilogram' then 1000
    when 'ounce' then 28.349523125
    when 'pound' then 453.59237
    when 'millilitre' then 1
    when 'litre' then 1000
    when 'fluid ounce' then 29.5735295625
    else null
  end;
$$;

create or replace function public.inventory_units_are_compatible(from_unit text, to_unit text)
returns boolean
language sql
immutable
as $$
  select
    lower(from_unit) = lower(to_unit)
    or (
      lower(from_unit) in ('milligram', 'gram', 'kilogram', 'ounce', 'pound')
      and lower(to_unit) in ('milligram', 'gram', 'kilogram', 'ounce', 'pound')
    )
    or (
      lower(from_unit) in ('millilitre', 'litre', 'fluid ounce')
      and lower(to_unit) in ('millilitre', 'litre', 'fluid ounce')
    );
$$;

create or replace function public.convert_inventory_quantity(quantity_value numeric, from_unit text, to_unit text)
returns numeric
language plpgsql
immutable
as $$
declare
  from_factor numeric;
  to_factor numeric;
begin
  if lower(from_unit) = lower(to_unit) then
    return quantity_value;
  end if;

  if not public.inventory_units_are_compatible(from_unit, to_unit) then
    return null;
  end if;

  from_factor := public.inventory_unit_factor(from_unit);
  to_factor := public.inventory_unit_factor(to_unit);

  if from_factor is null or to_factor is null then
    return null;
  end if;

  return (quantity_value * from_factor) / to_factor;
end;
$$;

grant execute on function public.inventory_unit_factor(text) to authenticated;
grant execute on function public.inventory_units_are_compatible(text, text) to authenticated;
grant execute on function public.convert_inventory_quantity(numeric, text, text) to authenticated;

create or replace function public.apply_inventory_sales_entry(
  target_restaurant_id uuid,
  target_sales_date date,
  target_notes text,
  target_items jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  sales_entry_id uuid;
  item_record jsonb;
  item_id uuid;
  quantity_sold integer;
  link_record record;
  old_value numeric(12,3);
  new_value numeric(12,3);
  deduction numeric(12,3);
begin
  if public.restaurant_member_role(target_restaurant_id, auth.uid()) <> 'owner' then
    raise exception 'Only restaurant owners can enter sales deductions' using errcode = '42501';
  end if;

  if jsonb_typeof(target_items) <> 'array' or jsonb_array_length(target_items) = 0 then
    raise exception 'At least one sales item is required' using errcode = '23514';
  end if;

  insert into public.inventory_sales_entries (restaurant_id, sales_date, notes, created_by)
  values (target_restaurant_id, target_sales_date, target_notes, auth.uid())
  returning id into sales_entry_id;

  for item_record in select * from jsonb_array_elements(target_items)
  loop
    item_id := (item_record->>'menu_item_id')::uuid;
    quantity_sold := (item_record->>'quantity_sold')::integer;

    if quantity_sold <= 0 then
      raise exception 'Sales quantity must be greater than zero' using errcode = '23514';
    end if;

    if not exists (
      select 1 from public.menu_items
      where id = item_id and restaurant_id = target_restaurant_id
    ) then
      raise exception 'Menu item does not belong to this restaurant' using errcode = '23514';
    end if;

    insert into public.inventory_sales_entry_items (
      sales_entry_id,
      restaurant_id,
      menu_item_id,
      quantity_sold
    )
    values (sales_entry_id, target_restaurant_id, item_id, quantity_sold);

    for link_record in
      select
        inventory_menu_links.*,
        inventory_ingredients.current_stock,
        inventory_ingredients.unit as stock_unit
      from public.inventory_menu_links
      join public.inventory_ingredients on inventory_ingredients.id = inventory_menu_links.inventory_ingredient_id
      where inventory_menu_links.restaurant_id = target_restaurant_id
        and inventory_menu_links.menu_item_id = item_id
      for update of inventory_ingredients
    loop
      deduction := public.convert_inventory_quantity(
        link_record.quantity_per_item * quantity_sold,
        link_record.unit,
        link_record.stock_unit
      );

      if deduction is null then
        raise exception 'Inventory unit conversion is required before sales deduction can be applied'
          using errcode = '23514';
      end if;

      old_value := link_record.current_stock;
      new_value := greatest(old_value - deduction, 0);

      update public.inventory_ingredients
      set current_stock = new_value
      where id = link_record.inventory_ingredient_id;

      insert into public.inventory_stock_movements (
        restaurant_id,
        inventory_ingredient_id,
        movement_type,
        quantity_change,
        old_stock,
        new_stock,
        reason,
        notes,
        created_by
      )
      values (
        target_restaurant_id,
        link_record.inventory_ingredient_id,
        'sales_deduction',
        new_value - old_value,
        old_value,
        new_value,
        'Daily Sales Entry',
        'Sales entry ' || sales_entry_id::text,
        auth.uid()
      );
    end loop;
  end loop;

  return sales_entry_id;
end;
$$;

grant execute on function public.apply_inventory_sales_entry(uuid, date, text, jsonb) to authenticated;
