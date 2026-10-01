-- RC Car Rental & Track Management: initial schema
-- Run once in the Supabase SQL editor (or `supabase db push`). Safe to read top to bottom.

create extension if not exists btree_gist;

-- ───────────────────────────── sequences for human-readable refs ─────────────────────────────
create sequence if not exists customer_ref_seq start 1;
create sequence if not exists rental_ref_seq start 1001;
create sequence if not exists payment_ref_seq start 2001;
create sequence if not exists track_ref_seq start 3001;
create sequence if not exists maint_ref_seq start 1;

-- ───────────────────────────── tables ─────────────────────────────
create table public.settings (
  id uuid primary key default gen_random_uuid(),
  singleton boolean not null default true unique check (singleton),
  hourly_rate numeric(10,2) not null default 200 check (hourly_rate >= 0),
  track_price numeric(10,2) not null default 300 check (track_price >= 0),
  min_rental_unit_minutes int not null default 30 check (min_rental_unit_minutes > 0),
  rounding_rule text not null default 'up' check (rounding_rule in ('up','nearest','down')),
  timezone text not null default 'Asia/Manila',
  business_name text not null default 'RC Rental & Track',
  branch_name text not null default 'Main branch',
  opening_hours text not null default '9:00 AM – 9:00 PM',
  return_alert_minutes int not null default 30 check (return_alert_minutes >= 0),
  max_photo_mb int not null default 5 check (max_photo_mb between 1 and 5),
  permissions jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null default '',
  email text,
  role text not null default 'customer' check (role in ('admin','staff','customer')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  ref_no text not null unique default ('C-' || lpad(nextval('customer_ref_seq')::text, 3, '0')),
  user_id uuid unique references auth.users (id) on delete set null,
  name text not null check (length(trim(name)) > 0),
  phone text not null default '',
  email text not null default '',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.rc_cars (
  id uuid primary key default gen_random_uuid(),
  asset_id text not null unique check (length(trim(asset_id)) > 0),
  name text not null check (length(trim(name)) > 0),
  brand text not null default '',
  model text not null default '',
  brand_model text generated always as (trim(brand || ' ' || model)) stored,
  scale text not null default '',
  category text not null default '',
  description text not null default '',
  hourly_rate numeric(10,2) not null default 200 check (hourly_rate >= 0),
  condition text not null default 'Good' check (condition in ('Good','Minor wear','Damaged')),
  status text not null default 'Available'
    check (status in ('Available','Reserved','Active Rental','Returned','Maintenance','Damaged','Inactive')),
  primary_photo_id uuid,
  branch_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.rc_car_photos (
  id uuid primary key default gen_random_uuid(),
  car_id uuid not null references public.rc_cars (id) on delete cascade,
  storage_path text not null unique,
  thumbnail_path text,
  original_filename_sanitized text,
  mime_type text not null check (mime_type in ('image/jpeg','image/png','image/webp')),
  size_bytes int not null check (size_bytes > 0 and size_bytes <= 5242880),
  is_primary boolean not null default false,
  sort_order int not null default 0,
  uploaded_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index rc_car_photos_one_primary on public.rc_car_photos (car_id) where is_primary;
alter table public.rc_cars add constraint rc_cars_primary_photo_fk
  foreign key (primary_photo_id) references public.rc_car_photos (id) on delete set null;

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  ref_no text not null unique default ('P-' || nextval('payment_ref_seq')),
  customer_id uuid not null references public.customers (id) on delete restrict,
  rental_id uuid,
  track_pass_id uuid,
  amount numeric(10,2) not null default 0 check (amount >= 0),
  method text check (method in ('Cash','Card (terminal)','Bank transfer')),
  status text not null default 'Pending' check (status in ('Pending','Paid','Partially Paid','Refunded','Cancelled')),
  refunded numeric(10,2) not null default 0 check (refunded >= 0),
  reference text,
  recorded_by uuid references auth.users (id) on delete set null,
  provider text,
  provider_ref text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.rentals (
  id uuid primary key default gen_random_uuid(),
  ref_no text not null unique default ('R-' || nextval('rental_ref_seq')),
  customer_id uuid not null references public.customers (id) on delete restrict,
  car_id uuid not null references public.rc_cars (id) on delete restrict,
  payment_id uuid references public.payments (id) on delete set null,
  branch_id uuid,
  start_time timestamptz not null,
  end_time timestamptz not null,
  actual_checkout_time timestamptz,
  actual_return_time timestamptz,
  duration_minutes int not null,
  rate_snapshot numeric(10,2) not null,
  rental_amount numeric(10,2) not null,
  status text not null default 'Reserved' check (status in ('Reserved','Active','Returned','Cancelled','No-show')),
  return_condition text check (return_condition in ('Good','Minor wear','Damaged')),
  damage_notes text,
  return_photo_count int not null default 0,
  history jsonb not null default '[]'::jsonb,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint rentals_time_order check (end_time > start_time),
  constraint rentals_no_overlap exclude using gist (
    car_id with =,
    tstzrange(start_time, end_time, '[)') with &&
  ) where (status in ('Reserved','Active'))
);
create index rentals_customer_idx on public.rentals (customer_id);
create index rentals_start_idx on public.rentals (start_time);

create table public.track_passes (
  id uuid primary key default gen_random_uuid(),
  ref_no text not null unique default ('T-' || nextval('track_ref_seq')),
  customer_id uuid not null references public.customers (id) on delete restrict,
  rental_id uuid references public.rentals (id) on delete set null,
  payment_id uuid references public.payments (id) on delete set null,
  branch_id uuid,
  price numeric(10,2) not null check (price >= 0),
  pass_date timestamptz not null default now(),
  checkin_time timestamptz,
  checkout_time timestamptz,
  status text not null default 'Sold' check (status in ('Sold','Checked in','Completed','Cancelled')),
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index track_passes_customer_idx on public.track_passes (customer_id);

alter table public.payments add constraint payments_rental_fk
  foreign key (rental_id) references public.rentals (id) on delete set null;
alter table public.payments add constraint payments_track_pass_fk
  foreign key (track_pass_id) references public.track_passes (id) on delete set null;

-- A payment is a container: lines = what was booked, transactions = money moved (negative = refund).
create table public.payment_lines (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references public.payments (id) on delete cascade,
  kind text not null check (kind in ('rental','track')),
  label text not null,
  amount numeric(10,2) not null check (amount >= 0),
  rental_id uuid references public.rentals (id) on delete set null,
  track_pass_id uuid references public.track_passes (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index payment_lines_payment_idx on public.payment_lines (payment_id);

create table public.payment_transactions (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references public.payments (id) on delete cascade,
  amount numeric(10,2) not null check (amount <> 0),
  method text not null check (method in ('Cash','Card (terminal)','Bank transfer')),
  note text,
  recorded_by uuid references auth.users (id) on delete set null,
  recorded_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index payment_tx_payment_idx on public.payment_transactions (payment_id);

create table public.maintenance_records (
  id uuid primary key default gen_random_uuid(),
  ref_no text not null unique default ('M-' || lpad(nextval('maint_ref_seq')::text, 2, '0')),
  car_id uuid not null references public.rc_cars (id) on delete cascade,
  date timestamptz not null default now(),
  issue text not null,
  repair text not null default '',
  parts text not null default '',
  cost numeric(10,2) not null default 0 check (cost >= 0),
  notes text not null default '',
  staff_id uuid references auth.users (id) on delete set null,
  staff_name text not null default '',
  is_open boolean not null default false,
  released_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid,
  actor_name text not null default 'System',
  actor_role text not null default 'system',
  action text not null,
  entity text not null,
  entity_id uuid,
  entity_ref text,
  before jsonb,
  after jsonb,
  created_at timestamptz not null default now()
);
create index audit_logs_created_idx on public.audit_logs (created_at desc);

-- ───────────────────────────── helpers ─────────────────────────────
-- `current_role` is a reserved SQL keyword, so the helper is named current_app_role().
create or replace function public.current_app_role() returns text
language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid() and active
$$;

create or replace function public.is_staff() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(public.current_app_role() in ('admin','staff'), false)
$$;

create or replace function public.my_customer_id() returns uuid
language sql stable security definer set search_path = public as $$
  select id from public.customers where user_id = auth.uid() limit 1
$$;

-- Fine-grained permission matrix (editable by admins in Settings). Admin always true.
create or replace function public.has_perm(p_action text) returns boolean
language plpgsql stable security definer set search_path = public as $$
declare r text := public.current_app_role(); v jsonb;
begin
  if r = 'admin' then return true; end if;
  if r is null or r = 'customer' then return false; end if;
  select permissions -> 'Staff' -> p_action into v from public.settings limit 1;
  if v is not null then return v = 'true'::jsonb; end if;
  return p_action in ('rentals.manage','cars.edit','cars.maintenance','payments.record');
end $$;

create or replace function public._settings() returns public.settings
language plpgsql security definer set search_path = public as $$
declare s public.settings;
begin
  select * into s from public.settings limit 1;
  if not found then
    insert into public.settings (singleton) values (true) on conflict do nothing;
    select * into s from public.settings limit 1;
  end if;
  return s;
end $$;

create or replace function public._actor_label() returns text
language sql stable security definer set search_path = public as $$
  select coalesce((select name || ' (' || initcap(role) || ')' from public.profiles where id = auth.uid()), 'System')
$$;

create or replace function public._hist(p_text text) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object('at', (extract(epoch from clock_timestamp()) * 1000)::bigint, 'text', p_text, 'by', public._actor_label())
$$;

create or replace function public._audit_action(p text) returns void
language plpgsql as $$ begin perform set_config('app.audit_action', p, true); end $$;

-- Price, computed on the server only: billed minutes by the rounding rule, then hourly rate.
create or replace function public.calc_price(p_minutes numeric, p_rate numeric) returns numeric
language plpgsql stable security definer set search_path = public as $$
declare s public.settings := public._settings(); u numeric := s.min_rental_unit_minutes; b numeric;
begin
  if p_minutes <= 0 then return 0; end if;
  b := case s.rounding_rule
    when 'up' then ceil(p_minutes / u) * u
    when 'down' then greatest(u, floor(p_minutes / u) * u)
    else greatest(u, round(p_minutes / u) * u) end;
  return round(b / 60 * p_rate);
end $$;

create or replace function public._pay_refresh(p uuid) returns void
language plpgsql security definer set search_path = public as $$
declare v_booked numeric; v_paid numeric; v_ref numeric; v_cur text; v_status text;
begin
  select status into v_cur from public.payments where id = p;
  select coalesce(sum(amount), 0) into v_booked from public.payment_lines where payment_id = p;
  select coalesce(sum(amount) filter (where amount > 0), 0), coalesce(-sum(amount) filter (where amount < 0), 0)
    into v_paid, v_ref from public.payment_transactions where payment_id = p;
  v_status := case
    when v_cur in ('Refunded','Cancelled') then v_cur
    when v_booked > 0 and v_paid >= v_booked then 'Paid'
    when v_paid > 0 then 'Partially Paid'
    else 'Pending' end;
  update public.payments set amount = v_booked, refunded = v_ref, status = v_status where id = p;
end $$;

create or replace function public._add_txn(p_payment uuid, p_amount numeric, p_method text, p_note text) returns void
language plpgsql security definer set search_path = public as $$
begin
  insert into public.payment_transactions (payment_id, amount, method, note, recorded_by, recorded_name)
  values (p_payment, p_amount, p_method, p_note, auth.uid(),
          coalesce((select name from public.profiles where id = auth.uid()), 'System'));
  if p_amount > 0 then update public.payments set method = p_method, recorded_by = auth.uid() where id = p_payment; end if;
  perform public._pay_refresh(p_payment);
end $$;

-- ───────────────────────────── generic triggers ─────────────────────────────
create or replace function public.set_updated_at() returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end $$;

do $$
declare t text;
begin
  foreach t in array array['settings','profiles','customers','rc_cars','rc_car_photos','payments','rentals','track_passes',
                           'payment_lines','payment_transactions','maintenance_records']
  loop
    execute format('create trigger %I before update on public.%I for each row execute function public.set_updated_at()', t || '_updated_at', t);
  end loop;
end $$;

-- Audit log: append-only, written by triggers (and never by clients).
create or replace function public.audit_row() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_before jsonb; v_after jsonb; v_row jsonb; v_act text; v_name text; v_role text;
  v_noise text[] := array['updated_at','history'];
  v_label text;
begin
  if tg_op = 'INSERT' then v_after := to_jsonb(new) - v_noise;
  elsif tg_op = 'UPDATE' then
    v_before := to_jsonb(old) - v_noise; v_after := to_jsonb(new) - v_noise;
    if v_before = v_after then return new; end if;
  else v_before := to_jsonb(old) - v_noise; end if;
  v_row := coalesce(v_after, v_before);

  v_label := case tg_table_name
    when 'rc_cars' then 'Car' when 'rc_car_photos' then 'Car photo' when 'customers' then 'Customer'
    when 'rentals' then 'Rental' when 'payments' then 'Payment' when 'payment_transactions' then 'Payment transaction'
    when 'track_passes' then 'Track pass' when 'maintenance_records' then 'Maintenance record'
    when 'profiles' then 'User' when 'settings' then 'Settings' else tg_table_name end;
  v_act := nullif(current_setting('app.audit_action', true), '');
  if v_act is null then
    if tg_table_name = 'profiles' and tg_op = 'UPDATE' and v_before ->> 'role' is distinct from v_after ->> 'role' then
      v_act := 'Role changed';
    elsif tg_table_name = 'profiles' and tg_op = 'UPDATE' and v_before ->> 'active' is distinct from v_after ->> 'active' then
      v_act := case when (v_after ->> 'active')::boolean then 'User enabled' else 'User disabled' end;
    elsif tg_table_name = 'rc_cars' and tg_op = 'UPDATE' and v_before ->> 'status' is distinct from v_after ->> 'status' then
      v_act := 'Car status changed';
    elsif tg_table_name = 'rc_cars' and tg_op = 'UPDATE' and v_before ->> 'hourly_rate' is distinct from v_after ->> 'hourly_rate' then
      v_act := 'Car pricing changed';
    else
      v_act := v_label || ' ' || case tg_op when 'INSERT' then 'created' when 'UPDATE' then 'updated' else 'deleted' end;
    end if;
  end if;

  select name, role into v_name, v_role from public.profiles where id = auth.uid();
  insert into public.audit_logs (actor_id, actor_name, actor_role, action, entity, entity_id, entity_ref, before, after)
  values (auth.uid(), coalesce(v_name, 'System'), coalesce(v_role, 'system'), v_act, tg_table_name,
          (v_row ->> 'id')::uuid, coalesce(v_row ->> 'ref_no', v_row ->> 'asset_id', v_row ->> 'name', v_row ->> 'id'),
          v_before, v_after);
  return coalesce(new, old);
end $$;

do $$
declare t text;
begin
  foreach t in array array['rentals','payments','payment_transactions','track_passes','rc_cars','rc_car_photos',
                           'maintenance_records','customers','profiles','settings']
  loop
    execute format('create trigger %I after insert or update or delete on public.%I for each row execute function public.audit_row()', t || '_audit', t);
  end loop;
end $$;

create or replace function public.audit_block_mutation() returns trigger language plpgsql as $$
begin raise exception 'audit_logs is append-only'; end $$;
create trigger audit_logs_no_update before update or delete on public.audit_logs
  for each row execute function public.audit_block_mutation();
create trigger audit_logs_no_truncate before truncate on public.audit_logs
  for each statement execute function public.audit_block_mutation();

-- Only admins change roles / active flags. auth.uid() is null for the SQL editor and the service role,
-- which is how the first admin is bootstrapped.
create or replace function public.profiles_guard() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and public.current_app_role() is distinct from 'admin' then
    if new.role is distinct from old.role or new.active is distinct from old.active
       or new.id is distinct from old.id or new.email is distinct from old.email then
      raise exception 'Only an admin can change roles or deactivate users';
    end if;
  end if;
  return new;
end $$;
create trigger profiles_guard before update on public.profiles
  for each row execute function public.profiles_guard();

-- Pricing is admin-only. Staff-created cars always start at the default rate.
create or replace function public.rc_cars_guard() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and public.current_app_role() = 'staff' then
    if tg_op = 'INSERT' then new.hourly_rate := (public._settings()).hourly_rate;
    elsif new.hourly_rate is distinct from old.hourly_rate then
      raise exception 'Only an admin can change car pricing';
    end if;
  end if;
  return new;
end $$;
create trigger rc_cars_guard before insert or update on public.rc_cars
  for each row execute function public.rc_cars_guard();

-- Changing the default hourly rate carries over to cars still on the old default.
create or replace function public.settings_sync_rates() returns trigger language plpgsql security definer
set search_path = public as $$
begin
  if new.hourly_rate is distinct from old.hourly_rate then
    update public.rc_cars set hourly_rate = new.hourly_rate where hourly_rate = old.hourly_rate;
  end if;
  return new;
end $$;
create trigger settings_sync_rates after update on public.settings
  for each row execute function public.settings_sync_rates();

-- New auth users get a profile (always 'customer') and a linked customer record.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_name text := coalesce(nullif(trim(new.raw_user_meta_data ->> 'name'), ''), split_part(coalesce(new.email, ''), '@', 1));
begin
  insert into public.profiles (id, name, email, role) values (new.id, v_name, new.email, 'customer')
  on conflict (id) do nothing;
  update public.customers set user_id = new.id
    where user_id is null and new.email is not null and lower(email) = lower(new.email)
      and not exists (select 1 from public.customers where user_id = new.id);
  if not exists (select 1 from public.customers where user_id = new.id) then
    insert into public.customers (user_id, name, email) values (new.id, v_name, coalesce(new.email, ''));
  end if;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ───────────────────────────── RPCs (checked, atomic, server-priced) ─────────────────────────────
create or replace function public.create_rental(
  p_customer_id uuid, p_items jsonb, p_track boolean default false,
  p_method text default 'Cash', p_amount_paid numeric default 0
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_role text := public.current_app_role(); v_cust uuid := p_customer_id; it jsonb; c public.rc_cars;
  v_start timestamptz; v_end timestamptz; v_amt numeric; v_pay uuid; v_total numeric := 0; v_rid uuid;
  v_rids uuid[] := '{}'; v_refs text[] := '{}'; v_ref text; v_tp uuid; v_first timestamptz; v_paid numeric;
  s public.settings := public._settings(); v_pref text;
begin
  if v_role is null then raise exception 'Not authorized'; end if;
  if v_role = 'customer' then
    v_cust := public.my_customer_id(); p_amount_paid := 0; p_track := coalesce(p_track, false);
    if v_cust is null then raise exception 'No customer record for this account'; end if;
  elsif not public.has_perm('rentals.manage') then
    raise exception 'You do not have permission to manage rentals';
  end if;
  if not exists (select 1 from public.customers where id = v_cust) then raise exception 'Customer not found'; end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Choose at least one car';
  end if;
  if coalesce(p_method, 'Cash') not in ('Cash','Card (terminal)','Bank transfer') then raise exception 'Invalid payment method'; end if;

  perform public._audit_action('Booking created');
  insert into public.payments (customer_id, status, recorded_by) values (v_cust, 'Pending', auth.uid())
  returning id, ref_no into v_pay, v_pref;

  for it in select * from jsonb_array_elements(p_items) loop
    select * into c from public.rc_cars where id = (it ->> 'car_id')::uuid;
    if not found then raise exception 'Car not found'; end if;
    if c.status in ('Maintenance','Damaged','Inactive') then
      raise exception '% is not available for rental (%)', c.asset_id, c.status;
    end if;
    v_start := (it ->> 'start_time')::timestamptz; v_end := (it ->> 'end_time')::timestamptz;
    if v_start is null or v_end is null or v_end <= v_start then raise exception 'End time must be after start time'; end if;
    v_amt := public.calc_price(extract(epoch from (v_end - v_start)) / 60, c.hourly_rate);
    begin
      insert into public.rentals (customer_id, car_id, payment_id, branch_id, start_time, end_time, duration_minutes,
                                  rate_snapshot, rental_amount, status, history, created_by)
      values (v_cust, c.id, v_pay, c.branch_id, v_start, v_end, round(extract(epoch from (v_end - v_start)) / 60)::int,
              c.hourly_rate, v_amt, 'Reserved', jsonb_build_array(public._hist('Booking created')), auth.uid())
      returning id, ref_no into v_rid, v_ref;
    exception when exclusion_violation then
      raise exception 'Car already booked for this time' using errcode = 'P0001', detail = c.asset_id;
    end;
    v_rids := v_rids || v_rid; v_refs := v_refs || v_ref;
    v_first := coalesce(v_first, v_start);
    insert into public.payment_lines (payment_id, kind, label, amount, rental_id)
    values (v_pay, 'rental', c.asset_id || ' rental', v_amt, v_rid);
    v_total := v_total + v_amt;
  end loop;

  if p_track then
    insert into public.track_passes (customer_id, rental_id, payment_id, branch_id, price, pass_date, created_by)
    values (v_cust, v_rids[1], v_pay, null, s.track_price, v_first, auth.uid()) returning id into v_tp;
    insert into public.payment_lines (payment_id, kind, label, amount, track_pass_id)
    values (v_pay, 'track', 'Track access', s.track_price, v_tp);
    v_total := v_total + s.track_price;
  end if;

  update public.payments set rental_id = v_rids[1], track_pass_id = v_tp where id = v_pay;
  v_paid := least(greatest(coalesce(p_amount_paid, 0), 0), v_total);
  if v_paid > 0 then perform public._add_txn(v_pay, v_paid, coalesce(p_method, 'Cash'), null); end if;
  perform public._pay_refresh(v_pay);
  return jsonb_build_object('rental_ids', to_jsonb(v_rids), 'rental_refs', to_jsonb(v_refs),
                            'payment_id', v_pay, 'payment_ref', v_pref, 'total', v_total);
end $$;

create or replace function public.checkout_rental(p_rental uuid) returns void
language plpgsql security definer set search_path = public as $$
declare r public.rentals;
begin
  if not public.is_staff() or not public.has_perm('rentals.manage') then raise exception 'Not authorized'; end if;
  select * into r from public.rentals where id = p_rental for update;
  if not found then raise exception 'Rental not found'; end if;
  if r.status <> 'Reserved' then raise exception 'Only an upcoming rental can be checked out'; end if;
  perform public._audit_action('Check-out');
  update public.rentals set status = 'Active', actual_checkout_time = now(),
    history = history || jsonb_build_array(public._hist('Checked out to customer')) where id = p_rental;
  update public.rc_cars set status = 'Active Rental' where id = r.car_id and status in ('Available','Returned','Reserved');
end $$;

create or replace function public.return_rental(
  p_rental uuid, p_actual_return timestamptz, p_condition text, p_notes text, p_photos int,
  p_outcome text, p_pay_amount numeric default 0, p_method text default 'Cash'
) returns void
language plpgsql security definer set search_path = public as $$
declare r public.rentals; c public.rc_cars; v_new text; v_staff text;
begin
  if not public.is_staff() or not public.has_perm('rentals.manage') then raise exception 'Not authorized'; end if;
  if p_outcome not in ('Available','Maintenance','Damaged') then raise exception 'Invalid car outcome'; end if;
  if p_condition not in ('Good','Minor wear','Damaged') then raise exception 'Invalid condition'; end if;
  select * into r from public.rentals where id = p_rental for update;
  if not found then raise exception 'Rental not found'; end if;
  if r.status <> 'Active' then raise exception 'Only an active rental can be returned'; end if;
  select * into c from public.rc_cars where id = r.car_id for update;

  perform public._audit_action('Return recorded');
  update public.rentals set status = 'Returned', actual_return_time = coalesce(p_actual_return, now()),
    return_condition = p_condition, damage_notes = nullif(trim(coalesce(p_notes, '')), ''),
    return_photo_count = coalesce(p_photos, 0),
    history = history || jsonb_build_array(public._hist(
      'Returned at ' || to_char(coalesce(p_actual_return, now()) at time zone (public._settings()).timezone, 'HH12:MI AM')
      || ' · ' || p_condition || case when p_outcome <> 'Available' then ' · car → ' || p_outcome else '' end))
  where id = p_rental;

  -- never overwrite a car that is already Maintenance/Damaged with Available
  v_new := case when c.status in ('Maintenance','Damaged') and p_outcome = 'Available' then c.status else p_outcome end;
  update public.rc_cars set status = v_new, condition = p_condition where id = c.id;

  if p_outcome <> 'Available' then
    select name into v_staff from public.profiles where id = auth.uid();
    insert into public.maintenance_records (car_id, date, issue, repair, parts, cost, notes, staff_id, staff_name, is_open)
    values (c.id, coalesce(p_actual_return, now()), coalesce(nullif(trim(coalesce(p_notes, '')), ''), 'Flagged on return (' || p_condition || ')'),
            'To be assessed', '—', 0, 'Auto-logged from return of ' || r.ref_no, auth.uid(), coalesce(v_staff, ''), true);
  end if;
  if coalesce(p_pay_amount, 0) > 0 and r.payment_id is not null then
    perform public._add_txn(r.payment_id, p_pay_amount, coalesce(p_method, 'Cash'), 'Collected at return');
  end if;
end $$;

create or replace function public.extend_rental(p_rental uuid, p_minutes int) returns jsonb
language plpgsql security definer set search_path = public as $$
declare r public.rentals; c public.rc_cars; v_end timestamptz; v_amt numeric;
begin
  if not public.is_staff() or not public.has_perm('rentals.manage') then raise exception 'Not authorized'; end if;
  if coalesce(p_minutes, 0) <= 0 then raise exception 'Extension must be positive'; end if;
  select * into r from public.rentals where id = p_rental for update;
  if not found then raise exception 'Rental not found'; end if;
  if r.status not in ('Reserved','Active') then raise exception 'Only upcoming or active rentals can be extended'; end if;
  select * into c from public.rc_cars where id = r.car_id;
  v_end := r.end_time + make_interval(mins => p_minutes);
  v_amt := public.calc_price(extract(epoch from (v_end - r.start_time)) / 60, r.rate_snapshot);
  perform public._audit_action('Rental extended');
  begin
    update public.rentals set end_time = v_end, rental_amount = v_amt,
      duration_minutes = round(extract(epoch from (v_end - r.start_time)) / 60)::int,
      history = history || jsonb_build_array(public._hist('Extended by ' || p_minutes || ' min (new end '
        || to_char(v_end at time zone (public._settings()).timezone, 'HH12:MI AM') || ')'))
    where id = p_rental;
  exception when exclusion_violation then
    raise exception 'Car already booked for this time' using errcode = 'P0001', detail = c.asset_id;
  end;
  if r.payment_id is not null then
    update public.payment_lines set amount = v_amt where payment_id = r.payment_id and rental_id = r.id;
    perform public._pay_refresh(r.payment_id);
  end if;
  return jsonb_build_object('end_time', v_end, 'amount', v_amt);
end $$;

create or replace function public.cancel_rental(p_rental uuid) returns void
language plpgsql security definer set search_path = public as $$
declare r public.rentals; v_lines int; v_txns int;
begin
  select * into r from public.rentals where id = p_rental for update;
  if not found then raise exception 'Rental not found'; end if;
  if public.is_staff() then
    if not public.has_perm('rentals.manage') then raise exception 'Not authorized'; end if;
  elsif r.customer_id is distinct from public.my_customer_id() then
    raise exception 'Not authorized';
  end if;
  if r.status <> 'Reserved' then raise exception 'Only an upcoming rental can be cancelled'; end if;
  perform public._audit_action('Rental cancelled');
  update public.rentals set status = 'Cancelled',
    history = history || jsonb_build_array(public._hist('Rental cancelled')) where id = p_rental;
  if r.payment_id is not null then
    select count(*) into v_lines from public.payment_lines where payment_id = r.payment_id;
    select count(*) into v_txns from public.payment_transactions where payment_id = r.payment_id;
    if v_lines = 1 and v_txns = 0 then update public.payments set status = 'Cancelled' where id = r.payment_id; end if;
  end if;
end $$;

create or replace function public.record_payment(p_payment uuid, p_amount numeric, p_method text, p_note text default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_staff() or not public.has_perm('payments.record') then raise exception 'Not authorized'; end if;
  if coalesce(p_amount, 0) <= 0 then raise exception 'Amount must be greater than zero'; end if;
  if p_method not in ('Cash','Card (terminal)','Bank transfer') then raise exception 'Invalid payment method'; end if;
  if not exists (select 1 from public.payments where id = p_payment and status not in ('Cancelled','Refunded')) then
    raise exception 'Payment not found or closed';
  end if;
  perform public._audit_action('Payment recorded');
  perform public._add_txn(p_payment, p_amount, p_method, p_note);
end $$;

create or replace function public.refund_payment(p_payment uuid, p_amount numeric, p_reason text) returns void
language plpgsql security definer set search_path = public as $$
declare p public.payments; v_paid numeric; v_ref numeric;
begin
  if not public.is_staff() or not public.has_perm('payments.refund') then raise exception 'Not authorized'; end if;
  select * into p from public.payments where id = p_payment for update;
  if not found then raise exception 'Payment not found'; end if;
  select coalesce(sum(amount) filter (where amount > 0), 0), coalesce(-sum(amount) filter (where amount < 0), 0)
    into v_paid, v_ref from public.payment_transactions where payment_id = p_payment;
  if coalesce(p_amount, 0) <= 0 or p_amount > v_paid - v_ref then raise exception 'Refund exceeds the amount paid'; end if;
  perform public._audit_action('Refund issued');
  perform public._add_txn(p_payment, -p_amount, 'Cash', 'Refund: ' || coalesce(p_reason, ''));
  if v_ref + p_amount >= v_paid then update public.payments set status = 'Refunded' where id = p_payment; end if;
  perform public._pay_refresh(p_payment);
end $$;

create or replace function public.sell_track(p_customer uuid, p_method text, p_link_payment uuid default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare s public.settings := public._settings(); v_tp uuid; v_ref text; v_pay uuid := p_link_payment; v_pref text;
begin
  if not public.is_staff() or not public.has_perm('payments.record') then raise exception 'Not authorized'; end if;
  if not exists (select 1 from public.customers where id = p_customer) then raise exception 'Customer not found'; end if;
  if p_method not in ('Cash','Card (terminal)','Bank transfer') then raise exception 'Invalid payment method'; end if;
  perform public._audit_action('Track access sold');
  if v_pay is null then
    insert into public.payments (customer_id, status, recorded_by) values (p_customer, 'Pending', auth.uid())
    returning id, ref_no into v_pay, v_pref;
  else
    select ref_no into v_pref from public.payments where id = v_pay and customer_id = p_customer and status not in ('Cancelled','Refunded');
    if v_pref is null then raise exception 'Payment not found or closed'; end if;
  end if;
  insert into public.track_passes (customer_id, payment_id, price, pass_date, created_by)
  values (p_customer, v_pay, s.track_price, now(), auth.uid()) returning id, ref_no into v_tp, v_ref;
  insert into public.payment_lines (payment_id, kind, label, amount, track_pass_id) values (v_pay, 'track', 'Track access', s.track_price, v_tp);
  if p_link_payment is null then
    update public.payments set track_pass_id = v_tp where id = v_pay;
    perform public._add_txn(v_pay, s.track_price, p_method, null);
  else
    perform public._pay_refresh(v_pay);
  end if;
  return jsonb_build_object('pass_id', v_tp, 'pass_ref', v_ref, 'payment_id', v_pay, 'payment_ref', v_pref);
end $$;

create or replace function public.track_clock(p_pass uuid, p_kind text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_staff() then raise exception 'Not authorized'; end if;
  if p_kind = 'in' then
    update public.track_passes set checkin_time = now(), status = 'Checked in' where id = p_pass and status in ('Sold');
  elsif p_kind = 'out' then
    update public.track_passes set checkout_time = now(), status = 'Completed' where id = p_pass and status = 'Checked in';
  else raise exception 'Invalid action'; end if;
  if not found then raise exception 'Pass is not in the right state'; end if;
end $$;

create or replace function public.log_maintenance(
  p_car uuid, p_date timestamptz, p_issue text, p_repair text, p_parts text, p_cost numeric,
  p_notes text, p_staff uuid, p_set_status boolean
) returns void
language plpgsql security definer set search_path = public as $$
declare v_staff text;
begin
  if not public.is_staff() or not public.has_perm('cars.maintenance') then raise exception 'Not authorized'; end if;
  if length(trim(coalesce(p_issue, ''))) = 0 then raise exception 'Describe the issue'; end if;
  select name into v_staff from public.profiles where id = coalesce(p_staff, auth.uid());
  perform public._audit_action('Maintenance logged');
  insert into public.maintenance_records (car_id, date, issue, repair, parts, cost, notes, staff_id, staff_name, is_open)
  values (p_car, coalesce(p_date, now()), p_issue, coalesce(p_repair, ''), coalesce(p_parts, ''), coalesce(p_cost, 0),
          coalesce(p_notes, ''), coalesce(p_staff, auth.uid()), coalesce(v_staff, ''), coalesce(p_set_status, false));
  if p_set_status then update public.rc_cars set status = 'Maintenance' where id = p_car; end if;
end $$;

create or replace function public.release_car(p_car uuid, p_note text default '') returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_staff() or not public.has_perm('cars.maintenance') then raise exception 'Not authorized'; end if;
  perform public._audit_action('Car released to service');
  update public.maintenance_records set is_open = false, released_at = now(),
    notes = notes || case when coalesce(p_note, '') <> '' then ' · Released: ' || p_note else '' end
  where car_id = p_car and is_open;
  update public.rc_cars set status = 'Available', condition = 'Good' where id = p_car;
end $$;

-- Reports: aggregates computed from stored rows only.
create view public.v_revenue_txns with (security_invoker = true) as
select t.id, t.created_at as at, t.payment_id,
  case when b.booked > 0 then t.amount * b.rental / b.booked else 0 end as rental_amount,
  case when b.booked > 0 then t.amount * (1 - b.rental / b.booked) else 0 end as track_amount
from public.payment_transactions t
join public.payments p on p.id = t.payment_id and p.status not in ('Refunded','Cancelled')
cross join lateral (
  select coalesce(sum(l.amount), 0) as booked, coalesce(sum(l.amount) filter (where l.kind = 'rental'), 0) as rental
  from public.payment_lines l where l.payment_id = p.id
) b;

create or replace function public.report_summary(p_from timestamptz, p_to timestamptz) returns jsonb
language plpgsql stable security invoker set search_path = public as $$
declare
  v_rental numeric; v_track numeric; v_days numeric := greatest(1, round(extract(epoch from (p_to - p_from)) / 86400));
  v_started int; v_cancelled int; v_hours numeric; v_util numeric; v_passes int; v_pass_amt numeric; v_repair numeric; v_avg numeric;
begin
  if not public.is_staff() or not public.has_perm('reports.view') then raise exception 'Not authorized'; end if;
  select coalesce(sum(rental_amount), 0), coalesce(sum(track_amount), 0) into v_rental, v_track
    from public.v_revenue_txns where at >= p_from and at < p_to;
  select count(*) filter (where status <> 'Cancelled'), count(*) filter (where status = 'Cancelled')
    into v_started, v_cancelled from public.rentals where start_time >= p_from and start_time < p_to;
  select coalesce(sum(rental_amount) filter (where status <> 'Cancelled'), 0) / greatest(1, count(*) filter (where status <> 'Cancelled'))
    into v_avg from public.rentals where start_time >= p_from and start_time < p_to;
  with per_car as (
    select c.id, coalesce(sum(extract(epoch from (coalesce(r.actual_return_time, r.end_time) - coalesce(r.actual_checkout_time, r.start_time))) / 3600), 0) as hrs
    from public.rc_cars c
    left join public.rentals r on r.car_id = c.id and r.start_time >= p_from and r.start_time < p_to and r.status <> 'Cancelled'
    group by c.id)
  select coalesce(sum(hrs), 0), coalesce(avg(least(100, hrs / (12 * v_days) * 100)), 0) into v_hours, v_util from per_car;
  select count(*), coalesce(sum(price), 0) into v_passes, v_pass_amt from public.track_passes
    where pass_date >= p_from and pass_date < p_to and status <> 'Cancelled';
  select coalesce(sum(cost), 0) into v_repair from public.maintenance_records where date >= p_from and date < p_to;
  return jsonb_build_object('rental', round(v_rental), 'track', round(v_track), 'total', round(v_rental + v_track),
    'rentals_started', v_started, 'cancelled', v_cancelled, 'car_hours', v_hours, 'avg_utilization', v_util,
    'track_passes', v_passes, 'track_amount', v_pass_amt, 'repair_cost', v_repair, 'avg_rental_value', v_avg);
end $$;

-- ───────────────────────────── RLS ─────────────────────────────
alter table public.settings enable row level security;
alter table public.profiles enable row level security;
alter table public.customers enable row level security;
alter table public.rc_cars enable row level security;
alter table public.rc_car_photos enable row level security;
alter table public.payments enable row level security;
alter table public.payment_lines enable row level security;
alter table public.payment_transactions enable row level security;
alter table public.rentals enable row level security;
alter table public.track_passes enable row level security;
alter table public.maintenance_records enable row level security;
alter table public.audit_logs enable row level security;

-- profiles
create policy profiles_select on public.profiles for select to authenticated
  using (id = auth.uid() or public.current_app_role() = 'admin'
         or (public.current_app_role() = 'staff' and role in ('admin','staff')));
create policy profiles_update_admin on public.profiles for update to authenticated
  using (public.current_app_role() = 'admin') with check (public.current_app_role() = 'admin');
create policy profiles_update_self on public.profiles for update to authenticated
  using (id = auth.uid() and public.current_app_role() is not null)
  with check (id = auth.uid());

-- settings: everyone signed in may read prices; only admin writes
create policy settings_select on public.settings for select to authenticated using (true);
create policy settings_admin_write on public.settings for insert to authenticated with check (public.current_app_role() = 'admin');
create policy settings_admin_update on public.settings for update to authenticated
  using (public.current_app_role() = 'admin') with check (public.current_app_role() = 'admin');

-- cars: browse for any signed-in user; staff/admin write; admin deletes
create policy rc_cars_select on public.rc_cars for select to authenticated using (public.current_app_role() is not null);
create policy rc_cars_insert on public.rc_cars for insert to authenticated with check (public.is_staff());
create policy rc_cars_update on public.rc_cars for update to authenticated using (public.is_staff()) with check (public.is_staff());
create policy rc_cars_delete on public.rc_cars for delete to authenticated using (public.current_app_role() = 'admin');

-- operational tables: staff/admin select+insert+update, admin delete
do $$
declare t text;
begin
  foreach t in array array['customers','rentals','track_passes','payments','payment_lines','payment_transactions',
                           'maintenance_records','rc_car_photos']
  loop
    execute format('create policy %I on public.%I for select to authenticated using (public.is_staff())', t || '_staff_select', t);
    execute format('create policy %I on public.%I for insert to authenticated with check (public.is_staff())', t || '_staff_insert', t);
    execute format('create policy %I on public.%I for update to authenticated using (public.is_staff()) with check (public.is_staff())', t || '_staff_update', t);
    execute format('create policy %I on public.%I for delete to authenticated using (public.current_app_role() = ''admin'')', t || '_admin_delete', t);
  end loop;
end $$;
-- photos are visible to every signed-in user (customers browse the fleet)
create policy rc_car_photos_any_select on public.rc_car_photos for select to authenticated using (public.current_app_role() is not null);
-- staff may also delete photos (replace flow)
create policy rc_car_photos_staff_delete on public.rc_car_photos for delete to authenticated using (public.is_staff());

-- customers see only their own records
create policy customers_own_select on public.customers for select to authenticated using (user_id = auth.uid());
create policy rentals_own_select on public.rentals for select to authenticated using (customer_id = public.my_customer_id());
create policy track_passes_own_select on public.track_passes for select to authenticated using (customer_id = public.my_customer_id());
create policy payments_own_select on public.payments for select to authenticated using (customer_id = public.my_customer_id());
create policy payment_lines_own_select on public.payment_lines for select to authenticated
  using (exists (select 1 from public.payments p where p.id = payment_id and p.customer_id = public.my_customer_id()));
create policy payment_tx_own_select on public.payment_transactions for select to authenticated
  using (exists (select 1 from public.payments p where p.id = payment_id and p.customer_id = public.my_customer_id()));

-- audit: admin read only; nobody inserts/updates/deletes through the API
create policy audit_logs_admin_select on public.audit_logs for select to authenticated using (public.current_app_role() = 'admin');

-- grants: anon gets nothing; authenticated is governed by RLS above
revoke all on all tables in schema public from anon;
revoke all on all sequences in schema public from anon;
revoke all on all functions in schema public from anon, public;
grant usage on schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
revoke insert, update, delete, truncate on public.audit_logs from authenticated;
revoke insert, delete on public.profiles from authenticated;
grant usage on all sequences in schema public to authenticated;
grant execute on all functions in schema public to authenticated;
-- internal helpers are not callable from the API
revoke execute on function public._pay_refresh(uuid), public._add_txn(uuid, numeric, text, text),
  public._audit_action(text), public._hist(text), public._actor_label(), public._settings()
  from authenticated;

-- ───────────────────────────── storage: private bucket for car photos ─────────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('rc-car-photos', 'rc-car-photos', false, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public = false, file_size_limit = 5242880,
  allowed_mime_types = array['image/jpeg','image/png','image/webp'];

create policy rc_photos_read on storage.objects for select to authenticated
  using (bucket_id = 'rc-car-photos' and public.current_app_role() is not null);
create policy rc_photos_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'rc-car-photos' and public.is_staff());
create policy rc_photos_update on storage.objects for update to authenticated
  using (bucket_id = 'rc-car-photos' and public.is_staff()) with check (bucket_id = 'rc-car-photos' and public.is_staff());
create policy rc_photos_delete on storage.objects for delete to authenticated
  using (bucket_id = 'rc-car-photos' and public.is_staff());

-- ───────────────────────────── realtime ─────────────────────────────
do $$
declare t text;
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    foreach t in array array['rentals','rc_cars','payments','payment_transactions','payment_lines','track_passes',
                             'maintenance_records','customers','rc_car_photos']
    loop
      begin
        execute format('alter publication supabase_realtime add table public.%I', t);
      exception when duplicate_object then null;
      end;
    end loop;
  end if;
end $$;
