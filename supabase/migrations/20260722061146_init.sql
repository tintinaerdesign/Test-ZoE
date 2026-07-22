create table public.tables (
  id uuid primary key default gen_random_uuid(),
  table_number text not null unique,
  created_at timestamptz default now()
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  table_id uuid references public.tables(id),
  status text not null default 'pending',
  created_at timestamptz default now()
);