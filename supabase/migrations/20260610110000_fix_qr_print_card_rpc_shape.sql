drop function if exists public.get_qr_print_card(uuid);

create function public.get_qr_print_card(qr_link_id_input uuid)
returns table (
  id uuid,
  restaurant_id uuid,
  menu_id uuid,
  table_number text,
  destination_type text,
  destination_url text,
  restaurant_name text,
  restaurant_logo_path text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    qr_links.id,
    qr_links.restaurant_id,
    qr_links.menu_id,
    qr_links.table_number,
    qr_links.destination_type,
    qr_links.destination_url,
    restaurants.name as restaurant_name,
    restaurants.logo_path as restaurant_logo_path
  from public.qr_links
  join public.restaurants on restaurants.id = qr_links.restaurant_id
  where qr_links.id = qr_link_id_input
    and auth.uid() is not null
    and public.is_restaurant_member(qr_links.restaurant_id, auth.uid())
  limit 1;
$$;

grant execute on function public.get_qr_print_card(uuid) to authenticated;
