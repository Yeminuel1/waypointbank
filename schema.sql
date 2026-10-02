-- ============================================================
-- Waypoint — Supabase schema
-- Run this once in: Supabase Dashboard → SQL Editor → New query
-- ============================================================

-- People allowed to use the admin panel (they sign in with a normal Supabase email + password)
create table if not exists public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade
);

-- One row per customer. `data` holds the profile, accounts, transactions and cards.
create table if not exists public.customers (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null,
  status text not null default 'pending' check (status in ('pending','approved','suspended','hold')),
  suspend_message text not null default '',
  member_since date not null default current_date,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
create unique index if not exists customers_username_key on public.customers (lower(username));

-- Access / transfer codes. Only admins can read these; customers can only ask "is this code right?".
create table if not exists public.customer_secrets (
  customer_id uuid primary key references public.customers(id) on delete cascade,
  access_code text not null default ''
);

-- ---------- helper: is the caller an admin? ----------
create or replace function public.is_admin() returns boolean
language sql security definer stable set search_path = public as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;

-- ---------- row level security ----------
alter table public.admins enable row level security;
alter table public.customers enable row level security;
alter table public.customer_secrets enable row level security;

drop policy if exists admins_self_read on public.admins;
create policy admins_self_read on public.admins for select using (user_id = auth.uid());

drop policy if exists customers_read on public.customers;
create policy customers_read on public.customers for select using (id = auth.uid() or public.is_admin());

drop policy if exists customers_admin_write on public.customers;
create policy customers_admin_write on public.customers for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists secrets_admin_all on public.customer_secrets;
create policy secrets_admin_all on public.customer_secrets for all using (public.is_admin()) with check (public.is_admin());

-- ---------- functions customers call ----------
-- Save my own profile / card settings. Balances and transactions are NEVER taken from the browser:
-- accounts are always kept as stored, and for cards only the "frozen" switch is accepted.
-- Refused unless the account is active, so suspended or held customers cannot change anything.
create or replace function public.save_my_data(p_data jsonb) returns void
language plpgsql security definer set search_path = public as $$
declare c public.customers%rowtype; newcards jsonb;
begin
  select * into c from public.customers where id = auth.uid() and status = 'approved' for update;
  if not found then raise exception 'Account is not active'; end if;
  select coalesce(jsonb_agg(
           case when n.card ? 'frozen' then jsonb_set(o.card, '{frozen}', n.card->'frozen') else o.card end
           order by o.ord), '[]'::jsonb)
    into newcards
    from jsonb_array_elements(coalesce(c.data->'cards', '[]'::jsonb)) with ordinality as o(card, ord)
    left join lateral (
      select x as card from jsonb_array_elements(coalesce(p_data->'cards', '[]'::jsonb)) x
       where x->>'id' = o.card->>'id' limit 1) n on true;
  update public.customers
     set data = jsonb_set(jsonb_set(p_data, '{accounts}', coalesce(c.data->'accounts', '[]'::jsonb)), '{cards}', newcards),
         updated_at = now()
   where id = c.id;
end $$;

-- Move money. The ONLY way a customer's balance changes. Everything is checked here, not in the browser:
-- account is active, access code is right, accounts belong to the caller, enough funds, fees and limits.
--   kind 'transfer' : between the caller's own accounts
--   kind 'send'     : money leaves (cat = Domestic | International | Zelle | Bills)
--   kind 'deposit'  : mobile check deposit (no code asked, capped at $10,000)
create or replace function public.do_move(
  p_kind text, p_from text, p_to text, p_amount numeric, p_fee numeric,
  p_desc text, p_cat text, p_fee_desc text, p_code text
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  c public.customers%rowtype;
  accts jsonb; i int; fi int := -1; ti int := -1;
  amt numeric := round(coalesce(p_amount, 0), 2);
  fee numeric := round(coalesce(p_fee, 0), 2);
  d text := left(coalesce(p_desc, ''), 200);
  today text := to_char(current_date, 'YYYY-MM-DD');
  fbal numeric; tbal numeric; ftype text; ttype text; fx jsonb; tx jsonb;
begin
  select * into c from public.customers where id = auth.uid() and status = 'approved' for update;
  if not found then raise exception 'Account is not active'; end if;
  if p_kind not in ('transfer', 'send', 'deposit') then raise exception 'Unknown operation'; end if;
  if amt <= 0 then raise exception 'Enter an amount greater than $0.'; end if;

  if p_kind <> 'deposit' and not exists (
    select 1 from public.customer_secrets s
     where s.customer_id = c.id and s.access_code <> '' and s.access_code = coalesce(p_code, '')
  ) then raise exception 'Incorrect transfer code. Nothing was sent.'; end if;

  if p_kind = 'send' then
    if p_cat not in ('Domestic', 'International', 'Zelle', 'Bills') then raise exception 'Invalid payment type'; end if;
    if p_cat = 'International' then fee := 15;
    elsif p_cat = 'Domestic' then if fee not in (0, 25) then raise exception 'Invalid fee'; end if;
    else fee := 0; end if;
    if p_cat = 'Zelle' and amt > 2500 then raise exception 'Zelle payments are limited to $2,500 per transaction.'; end if;
  else
    fee := 0;
  end if;
  if p_kind = 'deposit' and amt > 10000 then raise exception 'Mobile deposits are limited to $10,000.'; end if;

  accts := coalesce(c.data->'accounts', '[]'::jsonb);
  for i in 0 .. jsonb_array_length(accts) - 1 loop
    if accts->i->>'id' = p_from then fi := i; end if;
    if accts->i->>'id' = p_to then ti := i; end if;
  end loop;

  if p_kind in ('transfer', 'send') then
    if fi < 0 then raise exception 'Account not found'; end if;
    fbal := (accts->fi->>'balance')::numeric; ftype := accts->fi->>'type';
    if fbal < amt + fee then raise exception 'Insufficient funds in %.', ftype; end if;
  end if;
  if p_kind in ('transfer', 'deposit') then
    if ti < 0 then raise exception 'Account not found'; end if;
    tbal := (accts->ti->>'balance')::numeric; ttype := accts->ti->>'type';
  end if;
  if p_kind = 'transfer' and fi = ti then raise exception 'Choose two different accounts.'; end if;

  if p_kind = 'transfer' then
    fx := jsonb_build_object('id', 'tx_' || substr(md5(random()::text || clock_timestamp()::text), 1, 12), 'date', today, 'cat', 'Transfer', 'amount', -amt,
            'desc', 'Transfer to ' || ttype || case when d <> '' then ' — ' || d else '' end);
    tx := jsonb_build_object('id', 'tx_' || substr(md5(random()::text || clock_timestamp()::text), 1, 12), 'date', today, 'cat', 'Transfer', 'amount', amt,
            'desc', 'Transfer from ' || ftype || case when d <> '' then ' — ' || d else '' end);
    accts := jsonb_set(accts, array[fi::text, 'balance'], to_jsonb(round(fbal - amt, 2)));
    accts := jsonb_set(accts, array[fi::text, 'transactions'], jsonb_build_array(fx) || coalesce(accts->fi->'transactions', '[]'::jsonb));
    accts := jsonb_set(accts, array[ti::text, 'balance'], to_jsonb(round(tbal + amt, 2)));
    accts := jsonb_set(accts, array[ti::text, 'transactions'], jsonb_build_array(tx) || coalesce(accts->ti->'transactions', '[]'::jsonb));

  elsif p_kind = 'send' then
    fx := jsonb_build_object('id', 'tx_' || substr(md5(random()::text || clock_timestamp()::text), 1, 12), 'date', today, 'desc', d, 'cat', p_cat, 'amount', -amt);
    accts := jsonb_set(accts, array[fi::text, 'balance'], to_jsonb(round(fbal - amt - fee, 2)));
    accts := jsonb_set(accts, array[fi::text, 'transactions'], jsonb_build_array(fx) || coalesce(accts->fi->'transactions', '[]'::jsonb));
    if fee > 0 then
      accts := jsonb_set(accts, array[fi::text, 'transactions'],
        jsonb_build_array(jsonb_build_object('id', 'tx_' || substr(md5(random()::text || clock_timestamp()::text), 1, 12), 'date', today,
          'desc', left(coalesce(nullif(p_fee_desc, ''), 'Fee'), 100), 'cat', 'Fee', 'amount', -fee)) || (accts->fi->'transactions'));
    end if;

  else  -- deposit
    tx := jsonb_build_object('id', 'tx_' || substr(md5(random()::text || clock_timestamp()::text), 1, 12), 'date', today,
            'desc', 'Mobile check deposit', 'cat', 'Deposit', 'amount', amt);
    accts := jsonb_set(accts, array[ti::text, 'balance'], to_jsonb(round(tbal + amt, 2)));
    accts := jsonb_set(accts, array[ti::text, 'transactions'], jsonb_build_array(tx) || coalesce(accts->ti->'transactions', '[]'::jsonb));
  end if;

  update public.customers set data = jsonb_set(c.data, '{accounts}', accts), updated_at = now() where id = c.id;
  return accts;
end $$;

-- Is the access/transfer code I typed correct?
create or replace function public.check_access_code(p_code text) returns boolean
language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from public.customer_secrets s
    join public.customers c on c.id = s.customer_id
    where s.customer_id = auth.uid() and c.status = 'approved'
      and s.access_code <> '' and s.access_code = p_code
  );
$$;

-- Has the bank set a code for me yet?
create or replace function public.has_access_code() returns boolean
language sql security definer stable set search_path = public as $$
  select exists (select 1 from public.customer_secrets where customer_id = auth.uid() and access_code <> '');
$$;

grant execute on function public.save_my_data(jsonb) to authenticated;
grant execute on function public.do_move(text,text,text,numeric,numeric,text,text,text,text) to authenticated;
grant execute on function public.check_access_code(text) to authenticated;
grant execute on function public.has_access_code() to authenticated;

-- ---------- new sign-ups become 'pending' customers ----------
-- Runs when someone uses "Open an account". Admin accounts (no username metadata) are skipped.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  uname text := new.raw_user_meta_data->>'username';
  nm text := coalesce(nullif(new.raw_user_meta_data->>'name',''), 'New Member');
  em text := coalesce(new.raw_user_meta_data->>'email','');
  acct text := lpad((1000 + floor(random()*9000))::int::text, 4, '0');
  card text := lpad((1000 + floor(random()*9000))::int::text, 4, '0');
begin
  -- CHANGE this domain together with `emailDomain` in js/config.js and EMAIL_DOMAIN in the edge function
  if uname is null or new.email not like '%@users.waypoint-bank.app' then
    return new;
  end if;
  insert into public.customers (id, username, status, data) values (
    new.id, uname, 'pending',
    jsonb_build_object(
      'name', nm, 'email', em, 'phone', '', 'dob', '', 'address', '', 'photo', null,
      'accounts', jsonb_build_array(jsonb_build_object(
        'id', 'chk_' || substr(md5(random()::text), 1, 8), 'type', 'Everyday Checking',
        'number', '••••' || acct, 'balance', 0, 'transactions', '[]'::jsonb)),
      'cards', jsonb_build_array(jsonb_build_object(
        'id', 'debit_' || substr(md5(random()::text), 1, 8), 'kind', 'Debit',
        'label', 'Everyday Checking Debit', 'number', card, 'holder', nm,
        'expiry', '12/29', 'frozen', false))
    ));
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- realtime: lets a signed-in customer's screen react the moment the admin suspends them ----------
do $$ begin
  alter publication supabase_realtime add table public.customers;
exception when duplicate_object then null; end $$;
