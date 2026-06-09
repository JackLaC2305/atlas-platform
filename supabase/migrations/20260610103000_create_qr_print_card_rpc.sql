create or replace function public.get_qr_print_card(qr_link_id_input uuid)
returns jsonb
language sql
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'id', qr_links.id,
    'restaurant_id', qr_links.restaurant_id,
    'menu_id', qr_links.menu_id,
    'table_number', qr_links.table_number,
    'destination_type', qr_links.destination_type,
    'destination_url', qr_links.destination_url,
    'restaurant_name', restaurants.name,
    'restaurant_logo_path', restaurants.logo_path
  )
  from public.qr_links
  join public.restaurants on restaurants.id = qr_links.restaurant_id
  where qr_links.id = qr_link_id_input
    and public.is_restaurant_member(qr_links.restaurant_id, auth.uid())
  limit 1;
$$;

grant execute on function public.get_qr_print_card(uuid) to authenticated;
