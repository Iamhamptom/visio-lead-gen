-- Merch Orders table for TD x VisioCorp / PIANO 2DA WRLD! store
create table if not exists public.merch_orders (
  id uuid primary key default gen_random_uuid(),
  order_number text unique not null,
  status text not null default 'pending' check (status in ('pending', 'paid', 'shipped', 'delivered', 'cancelled', 'refunded')),

  -- Product details
  item_slug text not null,
  item_name text not null,
  size text not null,
  color text not null,
  quantity integer not null default 1,
  price_cents integer not null,

  -- Customer info
  customer_name text not null,
  customer_email text not null,
  customer_phone text,

  -- Shipping address
  address_line1 text not null,
  address_line2 text,
  city text not null,
  province text not null,
  postal_code text not null,
  country text not null default 'South Africa',

  -- Payment
  yoco_checkout_id text,
  yoco_payment_id text,
  paid_at timestamptz,

  -- Tracking
  tracking_number text,
  shipped_at timestamptz,
  delivered_at timestamptz,
  notes text,

  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Index for lookups
create index if not exists idx_merch_orders_email on public.merch_orders(customer_email);
create index if not exists idx_merch_orders_status on public.merch_orders(status);
create index if not exists idx_merch_orders_yoco on public.merch_orders(yoco_checkout_id);

-- Generate sequential order numbers: TD-000001
create or replace function generate_order_number()
returns trigger as $$
declare
  next_num integer;
begin
  select coalesce(max(cast(substring(order_number from 4) as integer)), 0) + 1
    into next_num
    from public.merch_orders;
  new.order_number := 'TD-' || lpad(next_num::text, 6, '0');
  return new;
end;
$$ language plpgsql;

create trigger trg_merch_order_number
  before insert on public.merch_orders
  for each row
  when (new.order_number is null or new.order_number = '')
  execute function generate_order_number();

-- Auto-update updated_at
create trigger trg_merch_orders_updated
  before update on public.merch_orders
  for each row
  execute function moddatetime(updated_at);

-- RLS
alter table public.merch_orders enable row level security;

-- Service role can do everything (API routes use admin client)
create policy "Service role full access" on public.merch_orders
  for all using (true) with check (true);
