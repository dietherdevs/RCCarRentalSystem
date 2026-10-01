-- Seed: ONLY the single settings row (non-dummy defaults). No demo cars, customers or rentals.
insert into public.settings (singleton, hourly_rate, track_price, min_rental_unit_minutes, rounding_rule, timezone)
values (true, 200, 300, 30, 'up', 'Asia/Manila')
on conflict (singleton) do nothing;

-- First admin: 1) sign up through the app (or Auth > Users > Add user), then 2) run:
--   update public.profiles set role = 'admin' where email = 'you@example.com';
