-- Migration: bookings table
-- Tracks Stripe checkout deposits from users to vendors via Fentsi

create table if not exists public.bookings (
  id                uuid primary key default gen_random_uuid(),
  plan_id           uuid not null references public.plans(id) on delete cascade,
  vendor_id         uuid not null references public.vendors(id) on delete cascade,
  user_id           uuid not null references auth.users(id) on delete cascade,
  amount_eur        numeric(10, 2) not null check (amount_eur >= 0),
  stripe_session_id text,
  status            text not null default 'initiated'
                      check (status in ('initiated', 'completed', 'failed', 'refunded')),
  created_at        timestamptz default now()
);

-- Index for fast lookup by plan and by user
create index if not exists bookings_plan_id_idx  on public.bookings(plan_id);
create index if not exists bookings_user_id_idx  on public.bookings(user_id);
create index if not exists bookings_vendor_id_idx on public.bookings(vendor_id);

-- RLS: users can only read their own bookings
alter table public.bookings enable row level security;

create policy "Users can view own bookings"
  on public.bookings for select
  using (auth.uid() = user_id);

create policy "Users can insert own bookings"
  on public.bookings for insert
  with check (auth.uid() = user_id);

-- Service role can update status (Stripe webhook handler)
create policy "Service role can update bookings"
  on public.bookings for update
  using (true);
