alter table public.restaurants
  add column if not exists average_weekly_covers text,
  add column if not exists menu_update_frequency text,
  add column if not exists inventory_method text,
  add column if not exists pos_provider text,
  add column if not exists main_operational_pain_point text,
  add column if not exists average_transaction_value text;
