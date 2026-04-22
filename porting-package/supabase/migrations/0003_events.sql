create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  project_name text,
  event_type text not null,
  custom_event_type text,
  guests integer not null check (guests >= 0),
  budget integer not null check (budget >= 0),
  event_date date,
  venue_style text,
  custom_venue text,
  mood text,
  catering text[] not null default '{}',
  entertainment text[] not null default '{}',
  creative_brief text,
  budget_allocation jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists events_user_id_idx on public.events (user_id);
create index if not exists events_created_at_idx on public.events (created_at desc);

create trigger events_set_updated_at
before update on public.events
for each row
execute function public.set_updated_at();

alter table public.events enable row level security;

create policy "Users manage own events"
  on public.events
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
