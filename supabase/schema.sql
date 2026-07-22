-- ZOE orders — maps KitchenTicket for multi-device sync (Supabase).
-- Run in Supabase SQL Editor (Dashboard → SQL → New query).
-- Then: Database → Replication → enable Realtime for public.orders

create extension if not exists "pgcrypto";

-- Drop early scaffold if you created a minimal orders/tables before.
drop table if exists public.orders cascade;
drop table if exists public.tables cascade;

create table public.orders (
  -- KitchenTicket.id
  id text primary key,

  -- KitchenTicket.orderNo
  order_no text not null,

  -- KitchenTicket.table
  table_label text not null default '',

  -- KitchenTicket.type: dine_in | take_away
  order_type text not null default 'dine_in'
    check (order_type in ('dine_in', 'take_away')),

  -- KitchenTicket.createdAt (epoch ms)
  created_at bigint not null,

  -- KitchenTicket.status: queued | cooking | ready
  status text not null default 'queued'
    check (status in ('queued', 'cooking', 'ready')),

  -- KitchenTicket.serveComplete
  serve_complete boolean not null default false,

  -- KitchenTicket.staffName (display nickname)
  staff_name text,

  -- KitchenTicket.paymentMethod: qr | cash
  payment_method text
    check (payment_method is null or payment_method in ('qr', 'cash')),

  -- KitchenTicket.cashStatus: unpaid | paid_at_cashier
  cash_status text
    check (cash_status is null or cash_status in ('unpaid', 'paid_at_cashier')),

  -- KitchenTicket.paymentEvidenceUri (local path / URL later)
  payment_evidence_uri text,

  -- KitchenTicket.lines as JSONB (round 1 — matches current UI shape)
  lines jsonb not null default '[]'::jsonb,

  -- Server-side touch time (useful for debugging sync)
  updated_at timestamptz not null default now()
);

create index orders_created_at_idx on public.orders (created_at desc);
create index orders_status_idx on public.orders (status);
create index orders_staff_name_idx on public.orders (staff_name);

create or replace function public.set_orders_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists orders_set_updated_at on public.orders;
create trigger orders_set_updated_at
  before update on public.orders
  for each row
  execute function public.set_orders_updated_at();

-- Realtime (Supabase)
alter table public.orders replica identity full;

-- MVP: app uses anon key without Supabase Auth yet.
-- Tighten RLS later when staff login moves to Supabase Auth.
alter table public.orders enable row level security;

drop policy if exists "orders_select_anon" on public.orders;
drop policy if exists "orders_insert_anon" on public.orders;
drop policy if exists "orders_update_anon" on public.orders;
drop policy if exists "orders_delete_anon" on public.orders;

create policy "orders_select_anon"
  on public.orders for select
  to anon, authenticated
  using (true);

create policy "orders_insert_anon"
  on public.orders for insert
  to anon, authenticated
  with check (true);

create policy "orders_update_anon"
  on public.orders for update
  to anon, authenticated
  using (true)
  with check (true);

create policy "orders_delete_anon"
  on public.orders for delete
  to anon, authenticated
  using (true);

grant select, insert, update, delete on public.orders to anon, authenticated;

/*
  After running this SQL:
  1. Dashboard → Database → Publications → supabase_realtime
     → enable table public.orders
  2. Put in project .env:
     EXPO_PUBLIC_SUPABASE_URL=...
     EXPO_PUBLIC_SUPABASE_ANON_KEY=...
*/
