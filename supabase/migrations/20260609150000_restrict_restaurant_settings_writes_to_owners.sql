drop policy if exists "Owners and managers can update their restaurants" on public.restaurants;

create policy "Owners can update their restaurants"
  on public.restaurants
  for update
  to authenticated
  using (public.restaurant_member_role(id, auth.uid()) = 'owner')
  with check (public.restaurant_member_role(id, auth.uid()) = 'owner');

drop policy if exists "Owners and managers can create restaurant assets" on public.restaurant_assets;

create policy "Owners can create restaurant assets"
  on public.restaurant_assets
  for insert
  to authenticated
  with check (public.restaurant_member_role(restaurant_id, auth.uid()) = 'owner');

drop policy if exists "Owners and managers can update restaurant assets" on public.restaurant_assets;

create policy "Owners can update restaurant assets"
  on public.restaurant_assets
  for update
  to authenticated
  using (public.restaurant_member_role(restaurant_id, auth.uid()) = 'owner')
  with check (public.restaurant_member_role(restaurant_id, auth.uid()) = 'owner');

drop policy if exists "Owners and managers can delete restaurant assets" on public.restaurant_assets;

create policy "Owners can delete restaurant assets"
  on public.restaurant_assets
  for delete
  to authenticated
  using (public.restaurant_member_role(restaurant_id, auth.uid()) = 'owner');

drop policy if exists "Owners and managers can upload restaurant asset objects" on storage.objects;

create policy "Owners can upload restaurant asset objects"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id in ('restaurant-assets', 'menu-imports')
    and public.restaurant_member_role(public.storage_restaurant_id(name), auth.uid()) = 'owner'
  );

drop policy if exists "Owners and managers can update restaurant asset objects" on storage.objects;

create policy "Owners can update restaurant asset objects"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id in ('restaurant-assets', 'menu-imports')
    and public.restaurant_member_role(public.storage_restaurant_id(name), auth.uid()) = 'owner'
  )
  with check (
    bucket_id in ('restaurant-assets', 'menu-imports')
    and public.restaurant_member_role(public.storage_restaurant_id(name), auth.uid()) = 'owner'
  );

drop policy if exists "Owners and managers can delete restaurant asset objects" on storage.objects;

create policy "Owners can delete restaurant asset objects"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id in ('restaurant-assets', 'menu-imports')
    and public.restaurant_member_role(public.storage_restaurant_id(name), auth.uid()) = 'owner'
  );
