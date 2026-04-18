-- ============================================================
-- 004_gamification_schema.sql
-- Fentsi — gamification layer: profiles, badges, FP, domains
-- NOTE: health_score/completeness_score/coherence_score already
--       exist from 003_health_score.sql — not re-added here.
-- ============================================================

-- ------------------------------------------------------------
-- profiles: extends auth.users with gamification state
-- ------------------------------------------------------------
create table if not exists public.profiles (
  id              uuid        primary key references auth.users on delete cascade,
  role            text        not null default 'consumer'
                              check (role in ('consumer', 'pro')),
  planner_level   int         not null default 1
                              check (planner_level between 1 and 5),
  career_fp       int         not null default 0 check (career_fp >= 0),
  streak_days     int         not null default 0 check (streak_days >= 0),
  last_active_date date,
  created_at      timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Users can read own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- ------------------------------------------------------------
-- badges: static catalogue (seeded below)
-- ------------------------------------------------------------
create table if not exists public.badges (
  id          uuid  primary key default gen_random_uuid(),
  slug        text  unique not null,
  name        text  not null,
  description text  not null,
  category    text  not null check (category in ('milestone', 'style', 'pro'))
);

insert into public.badges (slug, name, description, category) values
  ('first_light',         'First Light',          'Complete your first event wizard',                          'milestone'),
  ('the_full_picture',    'The Full Picture',      'Reach 100% completeness on one domain',                    'milestone'),
  ('grand_architect',     'Grand Architect',       'Reach Health Score 90+ on any event',                      'milestone'),
  ('the_conductor',       'The Conductor',         'Confirm 3 or more vendors on one event',                   'milestone'),
  ('maestro_di_tavola',   'Maestro di Tavola',     'Complete guest list with all dietary needs filled',         'milestone'),
  ('all_weather_planner', 'All-Weather Planner',   'Add a contingency plan to an outdoor event',               'milestone'),
  ('the_minimalist',      'The Minimalist',        'Plan an event under €2,000 with Health Score 80+',         'style'),
  ('the_maximalist',      'The Maximalist',        'Confirm 10 or more vendors on one event',                  'style'),
  ('the_speedrunner',     'The Speedrunner',       'Complete the wizard in under 4 minutes',                   'style'),
  ('the_perfectionist',   'The Perfectionist',     'All 6 domains at 100% before the event date',              'style'),
  ('trusted_planner',     'Trusted Planner',       'Manage 5 or more events to completion',                    'pro'),
  ('client_approved',     'Client Approved',       'Receive client sign-off on 3 or more events',              'pro'),
  ('the_reliable',        'The Reliable',          'Zero missed vendor deadlines across 10 events',             'pro')
on conflict (slug) do nothing;

-- ------------------------------------------------------------
-- user_badges: earned badge records
-- ------------------------------------------------------------
create table if not exists public.user_badges (
  user_id    uuid        not null references auth.users on delete cascade,
  badge_id   uuid        not null references public.badges on delete cascade,
  event_id   uuid        references public.events on delete set null,
  earned_at  timestamptz not null default now(),
  primary key (user_id, badge_id)
);

alter table public.user_badges enable row level security;

create policy "Users can read own badges"
  on public.user_badges for select
  using (auth.uid() = user_id);

-- ------------------------------------------------------------
-- fp_transactions: immutable FP event log
-- ------------------------------------------------------------
create table if not exists public.fp_transactions (
  id         uuid        primary key default gen_random_uuid(),
  user_id    uuid        not null references auth.users on delete cascade,
  event_id   uuid        references public.events on delete set null,
  action     text        not null,
  points     int         not null check (points > 0),
  created_at timestamptz not null default now()
);

alter table public.fp_transactions enable row level security;

create policy "Users can read own FP transactions"
  on public.fp_transactions for select
  using (auth.uid() = user_id);

-- ------------------------------------------------------------
-- Extend events table — net-new columns only
-- (health_score, completeness_score, coherence_score already exist)
-- ------------------------------------------------------------
alter table public.events
  add column if not exists event_name        text,
  add column if not exists vibe_word         text
    check (vibe_word in ('intimate','electric','elegant','wild','cozy','grand')),
  add column if not exists event_fp          int  not null default 0
    check (event_fp >= 0),
  add column if not exists status            text not null default 'active'
    check (status in ('draft','active','completed','archived'));

-- ------------------------------------------------------------
-- domains: one row per domain per event (6 rows per event)
-- ------------------------------------------------------------
create table if not exists public.domains (
  id               uuid        primary key default gen_random_uuid(),
  event_id         uuid        not null references public.events on delete cascade,
  type             text        not null
    check (type in ('core','budget','people','venue','experience','execution')),
  locked           boolean     not null default true,
  completeness     int         not null default 0
    check (completeness between 0 and 100),
  last_generated_at timestamptz,
  unique (event_id, type)
);

alter table public.domains enable row level security;

create policy "Users can read own event domains"
  on public.domains for select
  using (
    exists (
      select 1 from public.events e
      where e.id = domains.event_id and e.user_id = auth.uid()
    )
  );

create policy "Users can update own event domains"
  on public.domains for update
  using (
    exists (
      select 1 from public.events e
      where e.id = domains.event_id and e.user_id = auth.uid()
    )
  );

-- ------------------------------------------------------------
-- sections: content blocks within a domain
-- ------------------------------------------------------------
create table if not exists public.sections (
  id             uuid        primary key default gen_random_uuid(),
  domain_id      uuid        not null references public.domains on delete cascade,
  key            text        not null,
  content        jsonb,
  generated_by   text        not null default 'user'
    check (generated_by in ('claude','gemma','user')),
  last_edited_at timestamptz not null default now(),
  unique (domain_id, key)
);

alter table public.sections enable row level security;

create policy "Users can read own sections"
  on public.sections for select
  using (
    exists (
      select 1 from public.domains d
      join public.events e on e.id = d.event_id
      where d.id = sections.domain_id and e.user_id = auth.uid()
    )
  );

create policy "Users can upsert own sections"
  on public.sections for all
  using (
    exists (
      select 1 from public.domains d
      join public.events e on e.id = d.event_id
      where d.id = sections.domain_id and e.user_id = auth.uid()
    )
  );
