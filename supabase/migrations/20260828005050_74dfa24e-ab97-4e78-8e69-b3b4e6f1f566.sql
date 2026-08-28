insert into public.exchange_rates (currency, official_rate, market_rate) values
  ('USD', 133, 238),
  ('EUR', 153, 278),
  ('CNY', 19.7, 36)
on conflict (currency) do update
set official_rate = excluded.official_rate, market_rate = excluded.market_rate, updated_at = now();