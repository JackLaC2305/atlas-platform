create table if not exists public.inventory_ingredients (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  name text not null,
  category text not null default 'Other',
  unit text not null,
  current_stock numeric(12,3) not null default 0,
  low_stock_threshold numeric(12,3) not null default 0,
  cost_per_unit numeric(12,4),
  supplier_name text,
  notes text,
  status text generated always as (
    case
      when current_stock <= 0 then 'out_of_stock'
      when current_stock <= low_stock_threshold then 'low_stock'
      else 'in_stock'
    end
  ) stored,
  external_pos_item_id text,
  external_pos_location_id text,
  pos_sync_status text not null default 'not_connected',
  last_pos_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint inventory_ingredients_stock_check check (current_stock >= 0),
  constraint inventory_ingredients_threshold_check check (low_stock_threshold >= 0),
  constraint inventory_ingredients_cost_check check (cost_per_unit is null or cost_per_unit >= 0),
  constraint inventory_ingredients_pos_status_check check (pos_sync_status in ('not_connected', 'pending', 'synced', 'error'))
);

create table if not exists public.inventory_menu_links (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  inventory_ingredient_id uuid not null references public.inventory_ingredients(id) on delete cascade,
  menu_item_id uuid not null references public.menu_items(id) on delete cascade,
  menu_item_ingredient_id uuid references public.menu_item_ingredients(id) on delete set null,
  quantity_per_item numeric(12,3) not null,
  unit text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint inventory_menu_links_quantity_check check (quantity_per_item >= 0)
);

create table if not exists public.inventory_stock_movements (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  inventory_ingredient_id uuid not null references public.inventory_ingredients(id) on delete cascade,
  movement_type text not null,
  quantity_change numeric(12,3) not null,
  old_stock numeric(12,3) not null,
  new_stock numeric(12,3) not null,
  reason text not null,
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint inventory_stock_movements_type_check check (movement_type in ('add', 'remove', 'set', 'sales_deduction', 'correction', 'waste')),
  constraint inventory_stock_movements_stock_check check (old_stock >= 0 and new_stock >= 0)
);

create table if not exists public.inventory_sales_entries (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  sales_date date not null,
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.inventory_sales_entry_items (
  id uuid primary key default gen_random_uuid(),
  sales_entry_id uuid not null references public.inventory_sales_entries(id) on delete cascade,
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  menu_item_id uuid not null references public.menu_items(id) on delete cascade,
  quantity_sold integer not null,
  created_at timestamptz not null default now(),
  constraint inventory_sales_entry_items_quantity_check check (quantity_sold > 0)
);

create table if not exists public.inventory_alert_preferences (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null unique references public.restaurants(id) on delete cascade,
  dashboard_alerts_enabled boolean not null default true,
  end_of_day_email_enabled boolean not null default false,
  alert_email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists inventory_ingredients_restaurant_idx on public.inventory_ingredients(restaurant_id);
create index if not exists inventory_ingredients_restaurant_status_idx on public.inventory_ingredients(restaurant_id, status);
create index if not exists inventory_ingredients_restaurant_name_idx on public.inventory_ingredients(restaurant_id, lower(name));
create unique index if not exists inventory_ingredients_restaurant_name_unique_idx
  on public.inventory_ingredients(restaurant_id, lower(name));
create index if not exists inventory_menu_links_restaurant_idx on public.inventory_menu_links(restaurant_id);
create index if not exists inventory_menu_links_inventory_ingredient_idx on public.inventory_menu_links(inventory_ingredient_id);
create index if not exists inventory_menu_links_menu_item_idx on public.inventory_menu_links(menu_item_id);
create unique index if not exists inventory_menu_links_menu_item_ingredient_unique_idx
  on public.inventory_menu_links(restaurant_id, menu_item_ingredient_id)
  where menu_item_ingredient_id is not null;
create index if not exists inventory_stock_movements_restaurant_created_idx on public.inventory_stock_movements(restaurant_id, created_at desc);
create index if not exists inventory_stock_movements_ingredient_idx on public.inventory_stock_movements(inventory_ingredient_id);
create index if not exists inventory_sales_entries_restaurant_date_idx on public.inventory_sales_entries(restaurant_id, sales_date desc);
create index if not exists inventory_sales_entry_items_entry_idx on public.inventory_sales_entry_items(sales_entry_id);
create index if not exists inventory_sales_entry_items_menu_item_idx on public.inventory_sales_entry_items(menu_item_id);

alter table public.inventory_ingredients enable row level security;
alter table public.inventory_menu_links enable row level security;
alter table public.inventory_stock_movements enable row level security;
alter table public.inventory_sales_entries enable row level security;
alter table public.inventory_sales_entry_items enable row level security;
alter table public.inventory_alert_preferences enable row level security;

drop trigger if exists set_inventory_ingredients_updated_at on public.inventory_ingredients;
create trigger set_inventory_ingredients_updated_at
  before update on public.inventory_ingredients
  for each row
  execute function public.set_updated_at();

drop trigger if exists set_inventory_menu_links_updated_at on public.inventory_menu_links;
create trigger set_inventory_menu_links_updated_at
  before update on public.inventory_menu_links
  for each row
  execute function public.set_updated_at();

drop trigger if exists set_inventory_alert_preferences_updated_at on public.inventory_alert_preferences;
create trigger set_inventory_alert_preferences_updated_at
  before update on public.inventory_alert_preferences
  for each row
  execute function public.set_updated_at();

create or replace function public.enforce_inventory_menu_link_consistency()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1
    from public.inventory_ingredients
    where inventory_ingredients.id = new.inventory_ingredient_id
      and inventory_ingredients.restaurant_id = new.restaurant_id
  ) then
    raise exception 'inventory ingredient must belong to the same restaurant' using errcode = '23514';
  end if;

  if not exists (
    select 1
    from public.menu_items
    where menu_items.id = new.menu_item_id
      and menu_items.restaurant_id = new.restaurant_id
  ) then
    raise exception 'menu item must belong to the same restaurant' using errcode = '23514';
  end if;

  if new.menu_item_ingredient_id is not null and not exists (
    select 1
    from public.menu_item_ingredients
    where menu_item_ingredients.id = new.menu_item_ingredient_id
      and menu_item_ingredients.menu_item_id = new.menu_item_id
      and menu_item_ingredients.restaurant_id = new.restaurant_id
  ) then
    raise exception 'menu item ingredient must belong to the linked menu item' using errcode = '23514';
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_inventory_menu_link_consistency_on_links on public.inventory_menu_links;
create trigger enforce_inventory_menu_link_consistency_on_links
  before insert or update of restaurant_id, inventory_ingredient_id, menu_item_id, menu_item_ingredient_id
  on public.inventory_menu_links
  for each row
  execute function public.enforce_inventory_menu_link_consistency();

create or replace function public.enforce_inventory_sales_item_consistency()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1
    from public.inventory_sales_entries
    where inventory_sales_entries.id = new.sales_entry_id
      and inventory_sales_entries.restaurant_id = new.restaurant_id
  ) then
    raise exception 'sales entry must belong to the same restaurant' using errcode = '23514';
  end if;

  if not exists (
    select 1
    from public.menu_items
    where menu_items.id = new.menu_item_id
      and menu_items.restaurant_id = new.restaurant_id
  ) then
    raise exception 'menu item must belong to the same restaurant' using errcode = '23514';
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_inventory_sales_item_consistency_on_items on public.inventory_sales_entry_items;
create trigger enforce_inventory_sales_item_consistency_on_items
  before insert or update of sales_entry_id, restaurant_id, menu_item_id
  on public.inventory_sales_entry_items
  for each row
  execute function public.enforce_inventory_sales_item_consistency();

grant select, insert, update, delete on public.inventory_ingredients to authenticated;
grant select, insert, update, delete on public.inventory_menu_links to authenticated;
grant select, insert on public.inventory_stock_movements to authenticated;
grant select, insert on public.inventory_sales_entries to authenticated;
grant select, insert on public.inventory_sales_entry_items to authenticated;
grant select, insert, update, delete on public.inventory_alert_preferences to authenticated;

create policy "Members can read inventory ingredients"
  on public.inventory_ingredients for select to authenticated
  using (public.is_restaurant_member(restaurant_id, auth.uid()));
create policy "Owners can insert inventory ingredients"
  on public.inventory_ingredients for insert to authenticated
  with check (public.restaurant_member_role(restaurant_id, auth.uid()) = 'owner');
create policy "Owners can update inventory ingredients"
  on public.inventory_ingredients for update to authenticated
  using (public.restaurant_member_role(restaurant_id, auth.uid()) = 'owner')
  with check (public.restaurant_member_role(restaurant_id, auth.uid()) = 'owner');
create policy "Owners can delete inventory ingredients"
  on public.inventory_ingredients for delete to authenticated
  using (public.restaurant_member_role(restaurant_id, auth.uid()) = 'owner');

create policy "Members can read inventory links"
  on public.inventory_menu_links for select to authenticated
  using (public.is_restaurant_member(restaurant_id, auth.uid()));
create policy "Owners can insert inventory links"
  on public.inventory_menu_links for insert to authenticated
  with check (public.restaurant_member_role(restaurant_id, auth.uid()) = 'owner');
create policy "Owners can update inventory links"
  on public.inventory_menu_links for update to authenticated
  using (public.restaurant_member_role(restaurant_id, auth.uid()) = 'owner')
  with check (public.restaurant_member_role(restaurant_id, auth.uid()) = 'owner');
create policy "Owners can delete inventory links"
  on public.inventory_menu_links for delete to authenticated
  using (public.restaurant_member_role(restaurant_id, auth.uid()) = 'owner');

create policy "Members can read stock movements"
  on public.inventory_stock_movements for select to authenticated
  using (public.is_restaurant_member(restaurant_id, auth.uid()));
create policy "Owners can insert stock movements"
  on public.inventory_stock_movements for insert to authenticated
  with check (public.restaurant_member_role(restaurant_id, auth.uid()) = 'owner');

create policy "Members can read sales entries"
  on public.inventory_sales_entries for select to authenticated
  using (public.is_restaurant_member(restaurant_id, auth.uid()));
create policy "Owners can insert sales entries"
  on public.inventory_sales_entries for insert to authenticated
  with check (public.restaurant_member_role(restaurant_id, auth.uid()) = 'owner');

create policy "Members can read sales entry items"
  on public.inventory_sales_entry_items for select to authenticated
  using (public.is_restaurant_member(restaurant_id, auth.uid()));
create policy "Owners can insert sales entry items"
  on public.inventory_sales_entry_items for insert to authenticated
  with check (public.restaurant_member_role(restaurant_id, auth.uid()) = 'owner');

create policy "Members can read alert preferences"
  on public.inventory_alert_preferences for select to authenticated
  using (public.is_restaurant_member(restaurant_id, auth.uid()));
create policy "Owners can insert alert preferences"
  on public.inventory_alert_preferences for insert to authenticated
  with check (public.restaurant_member_role(restaurant_id, auth.uid()) = 'owner');
create policy "Owners can update alert preferences"
  on public.inventory_alert_preferences for update to authenticated
  using (public.restaurant_member_role(restaurant_id, auth.uid()) = 'owner')
  with check (public.restaurant_member_role(restaurant_id, auth.uid()) = 'owner');
create policy "Owners can delete alert preferences"
  on public.inventory_alert_preferences for delete to authenticated
  using (public.restaurant_member_role(restaurant_id, auth.uid()) = 'owner');

create or replace function public.apply_inventory_stock_adjustment(
  target_restaurant_id uuid,
  target_inventory_ingredient_id uuid,
  target_movement_type text,
  target_quantity numeric,
  target_reason text,
  target_notes text default null
)
returns public.inventory_stock_movements
language plpgsql
security invoker
set search_path = public
as $$
declare
  ingredient_record public.inventory_ingredients%rowtype;
  old_value numeric(12,3);
  new_value numeric(12,3);
  change_value numeric(12,3);
  movement_record public.inventory_stock_movements%rowtype;
begin
  if public.restaurant_member_role(target_restaurant_id, auth.uid()) <> 'owner' then
    raise exception 'Only restaurant owners can adjust inventory' using errcode = '42501';
  end if;

  if target_movement_type not in ('add', 'remove', 'set', 'correction', 'waste') then
    raise exception 'Invalid inventory movement type' using errcode = '23514';
  end if;

  if target_quantity < 0 then
    raise exception 'Quantity must be positive' using errcode = '23514';
  end if;

  select *
  into ingredient_record
  from public.inventory_ingredients
  where id = target_inventory_ingredient_id
    and restaurant_id = target_restaurant_id
  for update;

  if not found then
    raise exception 'Inventory ingredient not found' using errcode = 'P0002';
  end if;

  old_value := ingredient_record.current_stock;

  if target_movement_type = 'add' then
    new_value := old_value + target_quantity;
  elsif target_movement_type = 'set' then
    new_value := target_quantity;
  else
    new_value := greatest(old_value - target_quantity, 0);
  end if;

  change_value := new_value - old_value;

  update public.inventory_ingredients
  set current_stock = new_value
  where id = ingredient_record.id;

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
    ingredient_record.id,
    target_movement_type,
    change_value,
    old_value,
    new_value,
    target_reason,
    target_notes,
    auth.uid()
  )
  returning * into movement_record;

  return movement_record;
end;
$$;

grant execute on function public.apply_inventory_stock_adjustment(uuid, uuid, text, numeric, text, text) to authenticated;

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
      select 1
      from public.menu_items
      where id = item_id
        and restaurant_id = target_restaurant_id
    ) then
      raise exception 'Menu item does not belong to this restaurant' using errcode = '23514';
    end if;

    insert into public.inventory_sales_entry_items (
      sales_entry_id,
      restaurant_id,
      menu_item_id,
      quantity_sold
    )
    values (
      sales_entry_id,
      target_restaurant_id,
      item_id,
      quantity_sold
    );

    for link_record in
      select inventory_menu_links.*, inventory_ingredients.current_stock
      from public.inventory_menu_links
      join public.inventory_ingredients on inventory_ingredients.id = inventory_menu_links.inventory_ingredient_id
      where inventory_menu_links.restaurant_id = target_restaurant_id
        and inventory_menu_links.menu_item_id = item_id
      for update of inventory_ingredients
    loop
      old_value := link_record.current_stock;
      deduction := link_record.quantity_per_item * quantity_sold;
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
