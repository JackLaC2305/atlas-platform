grant select, insert, update on table public.restaurants to authenticated;
grant select, insert, update on table public.restaurant_members to authenticated;
grant select, insert, update, delete on table public.restaurant_assets to authenticated;

grant execute on function public.is_restaurant_member(uuid, uuid) to authenticated;
grant execute on function public.restaurant_member_role(uuid, uuid) to authenticated;
grant execute on function public.user_owns_restaurant(uuid, uuid) to authenticated;
grant execute on function public.storage_restaurant_id(text) to authenticated;
