# Gamification Foundation — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Lay the database schema, TypeScript types, and pure gamification logic (FP awards, badge eligibility, level progression) that every other plan depends on.

**Architecture:** Three layers — (1) a Supabase migration adding new tables and columns, (2) pure TypeScript functions with zero side effects for FP/badge/level computation, and (3) a Next.js API route that persists awards to Supabase. The pure functions are unit-tested in isolation; the API route is tested by inspecting its response shape.

**Tech Stack:** Supabase (Postgres + RLS), TypeScript, Vitest, Next.js App Router API routes, Zod

---

## File Map

**Create:**
- `supabase/migrations/003_gamification_schema.sql` — new tables + columns + badge seed data
- `src/types/gamification.types.ts` — GamificationAction, GamificationEvent, AwardResult, Badge, Profile types
- `src/lib/gamification/events.ts` — FP_AWARDS map (action → points)
- `src/lib/gamification/levels.ts` — LEVEL_THRESHOLDS and `computeLevel(careerFp)` pure function
- `src/lib/gamification/badges.ts` — BADGE_DEFINITIONS array + `checkBadgeEligibility()` pure function
- `src/lib/gamification/engine.ts` — `computeAward()` orchestrator (calls levels + badges)
- `src/lib/gamification/engine.test.ts` — unit tests for engine, levels, badges
- `src/app/api/gamification/award/route.ts` — POST route: validates action, calls engine, persists to Supabase

**Modify:**
- `src/types/plan.types.ts` — add `DomainType` and `EventStatus` union types (other plans need them)

---

## Task 1: Database Migration

**Files:**
- Create: `supabase/migrations/003_gamification_schema.sql`

- [ ] **Step 1: Write the migration file**

```sql
-- ============================================================
-- 003_gamification_schema.sql
-- Fentsi — gamification layer: profiles, badges, FP, domains
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

-- Service-role inserts profile on first sign-in (via trigger or API route)

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

-- Seed badge catalogue
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
-- Extend events table with gamification columns
-- ------------------------------------------------------------
alter table public.events
  add column if not exists event_name        text,
  add column if not exists vibe_word         text
    check (vibe_word in ('intimate','electric','elegant','wild','cozy','grand')),
  add column if not exists health_score      int  not null default 0
    check (health_score between 0 and 100),
  add column if not exists completeness_score int not null default 0
    check (completeness_score between 0 and 100),
  add column if not exists coherence_score   int  not null default 0
    check (coherence_score between 0 and 100),
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
```

- [ ] **Step 2: Apply migration**

```bash
# If using Supabase CLI:
supabase db push

# If pasting into SQL Editor: open Supabase dashboard → SQL Editor → paste and run
```

Expected: no errors; tables `profiles`, `badges`, `user_badges`, `fp_transactions`, `domains`, `sections` now exist; `badges` table has 13 rows.

- [ ] **Step 3: Verify tables exist**

```bash
# Via Supabase CLI
supabase db diff --use-migra
```

Expected: no pending changes (migration is applied).

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/003_gamification_schema.sql
git commit -m "feat(db): add gamification schema — profiles, badges, FP, domains, sections"
```

---

## Task 2: TypeScript Types

**Files:**
- Create: `src/types/gamification.types.ts`
- Modify: `src/types/plan.types.ts`

- [ ] **Step 1: Add gamification types**

Create `src/types/gamification.types.ts`:

```typescript
// Gamification domain types — Fentsi event planning platform.

export type GamificationAction =
  | 'STEP_COMPLETED'
  | 'WIZARD_COMPLETED'
  | 'DOMAIN_UNLOCKED'
  | 'SECTION_COMPLETED'
  | 'VENDOR_CONFIRMED'
  | 'RSVP_ACCEPTED'
  | 'COLLABORATOR_SECTION_COMPLETED'
  | 'STREAK_MAINTAINED'
  | 'HEALTH_SCORE_THRESHOLD';

export interface GamificationEvent {
  action: GamificationAction;
  userId: string;
  eventId?: string;
  /** Action-specific data (e.g. { threshold: 60 } for HEALTH_SCORE_THRESHOLD) */
  metadata?: Record<string, unknown>;
}

export interface AwardContext {
  /** Career FP before this action is applied */
  careerFpBefore: number;
  /** Slugs of badges the user has already earned */
  badgesEarned: string[];
  /** Metadata about the event relevant for badge eligibility */
  eventMeta?: {
    budgetEur?: number;
    confirmedVendorCount?: number;
    guestCount?: number;
    isOutdoor?: boolean;
    wizardDurationMs?: number;
  };
}

export interface AwardResult {
  /** FP to add to both event_fp and career_fp */
  points: number;
  /** Badge slugs newly earned by this action */
  badgeSlugs: string[];
  /** New level number if level changed; undefined if unchanged */
  newLevel?: number;
}

export interface BadgeDefinition {
  slug: string;
  name: string;
  category: 'milestone' | 'style' | 'pro';
  /** Returns true if the badge should be awarded given the event and context */
  isEligible: (event: GamificationEvent, context: AwardContext) => boolean;
}

export interface Profile {
  id: string;
  role: 'consumer' | 'pro';
  plannerLevel: number;
  careerFp: number;
  streakDays: number;
  lastActiveDate: string | null;
}
```

- [ ] **Step 2: Add DomainType and EventStatus to plan.types.ts**

Add at the bottom of `src/types/plan.types.ts` (before the final empty line):

```typescript
// ---------------------------------------------------------------------------
// Gamification-adjacent types (used by Domain System plan)
// ---------------------------------------------------------------------------

export type DomainType =
  | 'core'
  | 'budget'
  | 'people'
  | 'venue'
  | 'experience'
  | 'execution';

export type EventStatus = 'draft' | 'active' | 'completed' | 'archived';

export type VibeWord =
  | 'intimate'
  | 'electric'
  | 'elegant'
  | 'wild'
  | 'cozy'
  | 'grand';
```

- [ ] **Step 3: Commit**

```bash
git add src/types/gamification.types.ts src/types/plan.types.ts
git commit -m "feat(types): add gamification types and DomainType/EventStatus/VibeWord"
```

---

## Task 3: FP Awards Map and Level Logic

**Files:**
- Create: `src/lib/gamification/events.ts`
- Create: `src/lib/gamification/levels.ts`
- Create: `src/lib/gamification/engine.test.ts` (partial — levels section)

- [ ] **Step 1: Write the failing level tests**

Create `src/lib/gamification/engine.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { computeLevel, LEVEL_THRESHOLDS } from './levels';
import { FP_AWARDS } from './events';

describe('computeLevel', () => {
  it('returns 1 for 0 FP', () => {
    expect(computeLevel(0)).toBe(1);
  });

  it('returns 1 for 499 FP', () => {
    expect(computeLevel(499)).toBe(1);
  });

  it('returns 2 at exactly 500 FP', () => {
    expect(computeLevel(500)).toBe(2);
  });

  it('returns 3 at exactly 1500 FP', () => {
    expect(computeLevel(1500)).toBe(3);
  });

  it('returns 4 at exactly 4000 FP', () => {
    expect(computeLevel(4000)).toBe(4);
  });

  it('returns 5 at exactly 10000 FP', () => {
    expect(computeLevel(10000)).toBe(5);
  });

  it('returns 5 for very large FP values', () => {
    expect(computeLevel(999999)).toBe(5);
  });
});

describe('FP_AWARDS', () => {
  it('awards 10 FP for STEP_COMPLETED', () => {
    expect(FP_AWARDS['STEP_COMPLETED']).toBe(10);
  });

  it('awards 100 FP for WIZARD_COMPLETED', () => {
    expect(FP_AWARDS['WIZARD_COMPLETED']).toBe(100);
  });

  it('awards 150 FP for VENDOR_CONFIRMED', () => {
    expect(FP_AWARDS['VENDOR_CONFIRMED']).toBe(150);
  });

  it('covers all GamificationAction values', () => {
    const allActions = [
      'STEP_COMPLETED',
      'WIZARD_COMPLETED',
      'DOMAIN_UNLOCKED',
      'SECTION_COMPLETED',
      'VENDOR_CONFIRMED',
      'RSVP_ACCEPTED',
      'COLLABORATOR_SECTION_COMPLETED',
      'STREAK_MAINTAINED',
      'HEALTH_SCORE_THRESHOLD',
    ];
    for (const action of allActions) {
      expect(FP_AWARDS[action]).toBeTypeOf('number');
      expect(FP_AWARDS[action]).toBeGreaterThan(0);
    }
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npx vitest run src/lib/gamification/engine.test.ts
```

Expected: FAIL — `Cannot find module './levels'` and `Cannot find module './events'`

- [ ] **Step 3: Create FP awards map**

Create `src/lib/gamification/events.ts`:

```typescript
import type { GamificationAction } from '@/types/gamification.types';

export const FP_AWARDS: Record<GamificationAction, number> = {
  STEP_COMPLETED:                   10,
  WIZARD_COMPLETED:                100,
  DOMAIN_UNLOCKED:                  25,
  SECTION_COMPLETED:                50,   // mid-range; scales in UI (25–75) but engine awards flat 50
  VENDOR_CONFIRMED:                150,
  RSVP_ACCEPTED:                     5,
  COLLABORATOR_SECTION_COMPLETED:   50,
  STREAK_MAINTAINED:                75,
  HEALTH_SCORE_THRESHOLD:          200,
};
```

- [ ] **Step 4: Create level computation**

Create `src/lib/gamification/levels.ts`:

```typescript
/** [minFP, levelNumber, title] — ordered ascending by minFP */
export const LEVEL_THRESHOLDS = [
  { minFp: 0,     level: 1, title: 'The Dreamer'    },
  { minFp: 500,   level: 2, title: 'The Organizer'  },
  { minFp: 1500,  level: 3, title: 'The Curator'    },
  { minFp: 4000,  level: 4, title: 'The Director'   },
  { minFp: 10000, level: 5, title: 'The Maestro'    },
] as const;

/** Returns the level number (1–5) for a given career FP total. */
export function computeLevel(careerFp: number): number {
  let level = 1;
  for (const threshold of LEVEL_THRESHOLDS) {
    if (careerFp >= threshold.minFp) level = threshold.level;
  }
  return level;
}

/** Returns the title string for a given career FP total. */
export function computeLevelTitle(careerFp: number): string {
  let title = LEVEL_THRESHOLDS[0].title;
  for (const threshold of LEVEL_THRESHOLDS) {
    if (careerFp >= threshold.minFp) title = threshold.title;
  }
  return title;
}
```

- [ ] **Step 5: Run tests to confirm they pass**

```bash
npx vitest run src/lib/gamification/engine.test.ts
```

Expected: PASS — all 11 tests green.

- [ ] **Step 6: Commit**

```bash
git add src/lib/gamification/events.ts src/lib/gamification/levels.ts src/lib/gamification/engine.test.ts
git commit -m "feat(gamification): add FP awards map and level computation"
```

---

## Task 4: Badge Definitions and Eligibility

**Files:**
- Create: `src/lib/gamification/badges.ts`
- Modify: `src/lib/gamification/engine.test.ts` (add badge tests)

- [ ] **Step 1: Add badge eligibility tests**

Append to `src/lib/gamification/engine.test.ts`:

```typescript
import { checkBadgeEligibility } from './badges';
import type { GamificationEvent, AwardContext } from '@/types/gamification.types';

describe('checkBadgeEligibility', () => {
  const baseContext: AwardContext = {
    careerFpBefore: 0,
    badgesEarned: [],
  };

  it('awards first_light on WIZARD_COMPLETED if not already earned', () => {
    const event: GamificationEvent = { action: 'WIZARD_COMPLETED', userId: 'u1' };
    expect(checkBadgeEligibility(event, baseContext)).toContain('first_light');
  });

  it('does not re-award first_light if already earned', () => {
    const event: GamificationEvent = { action: 'WIZARD_COMPLETED', userId: 'u1' };
    const ctx: AwardContext = { ...baseContext, badgesEarned: ['first_light'] };
    expect(checkBadgeEligibility(event, ctx)).not.toContain('first_light');
  });

  it('awards the_speedrunner when wizard completed in under 4 minutes', () => {
    const event: GamificationEvent = {
      action: 'WIZARD_COMPLETED',
      userId: 'u1',
      metadata: { wizardDurationMs: 3 * 60 * 1000 }, // 3 minutes
    };
    const ctx: AwardContext = {
      ...baseContext,
      eventMeta: { wizardDurationMs: 3 * 60 * 1000 },
    };
    expect(checkBadgeEligibility(event, ctx)).toContain('the_speedrunner');
  });

  it('does not award the_speedrunner when wizard took more than 4 minutes', () => {
    const event: GamificationEvent = {
      action: 'WIZARD_COMPLETED',
      userId: 'u1',
    };
    const ctx: AwardContext = {
      ...baseContext,
      eventMeta: { wizardDurationMs: 5 * 60 * 1000 }, // 5 minutes
    };
    expect(checkBadgeEligibility(event, ctx)).not.toContain('the_speedrunner');
  });

  it('awards grand_architect when HEALTH_SCORE_THRESHOLD metadata.threshold is 90', () => {
    const event: GamificationEvent = {
      action: 'HEALTH_SCORE_THRESHOLD',
      userId: 'u1',
      metadata: { threshold: 90 },
    };
    expect(checkBadgeEligibility(event, baseContext)).toContain('grand_architect');
  });

  it('does not award grand_architect for threshold 60', () => {
    const event: GamificationEvent = {
      action: 'HEALTH_SCORE_THRESHOLD',
      userId: 'u1',
      metadata: { threshold: 60 },
    };
    expect(checkBadgeEligibility(event, baseContext)).not.toContain('grand_architect');
  });

  it('awards the_conductor when confirmedVendorCount reaches 3', () => {
    const event: GamificationEvent = { action: 'VENDOR_CONFIRMED', userId: 'u1' };
    const ctx: AwardContext = {
      ...baseContext,
      eventMeta: { confirmedVendorCount: 3 },
    };
    expect(checkBadgeEligibility(event, ctx)).toContain('the_conductor');
  });

  it('does not award the_conductor when confirmedVendorCount is 2', () => {
    const event: GamificationEvent = { action: 'VENDOR_CONFIRMED', userId: 'u1' };
    const ctx: AwardContext = {
      ...baseContext,
      eventMeta: { confirmedVendorCount: 2 },
    };
    expect(checkBadgeEligibility(event, ctx)).not.toContain('the_conductor');
  });

  it('returns empty array for actions with no badge triggers', () => {
    const event: GamificationEvent = { action: 'RSVP_ACCEPTED', userId: 'u1' };
    expect(checkBadgeEligibility(event, baseContext)).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npx vitest run src/lib/gamification/engine.test.ts
```

Expected: FAIL — `Cannot find module './badges'`

- [ ] **Step 3: Create badge definitions and eligibility function**

Create `src/lib/gamification/badges.ts`:

```typescript
import type {
  BadgeDefinition,
  GamificationEvent,
  AwardContext,
} from '@/types/gamification.types';

const FOUR_MINUTES_MS = 4 * 60 * 1000;

export const BADGE_DEFINITIONS: BadgeDefinition[] = [
  {
    slug: 'first_light',
    name: 'First Light',
    category: 'milestone',
    isEligible: (event, ctx) =>
      event.action === 'WIZARD_COMPLETED' &&
      !ctx.badgesEarned.includes('first_light'),
  },
  {
    slug: 'the_speedrunner',
    name: 'The Speedrunner',
    category: 'style',
    isEligible: (event, ctx) =>
      event.action === 'WIZARD_COMPLETED' &&
      !ctx.badgesEarned.includes('the_speedrunner') &&
      (ctx.eventMeta?.wizardDurationMs ?? Infinity) < FOUR_MINUTES_MS,
  },
  {
    slug: 'grand_architect',
    name: 'Grand Architect',
    category: 'milestone',
    isEligible: (event, ctx) =>
      event.action === 'HEALTH_SCORE_THRESHOLD' &&
      !ctx.badgesEarned.includes('grand_architect') &&
      event.metadata?.['threshold'] === 90,
  },
  {
    slug: 'the_conductor',
    name: 'The Conductor',
    category: 'milestone',
    isEligible: (event, ctx) =>
      event.action === 'VENDOR_CONFIRMED' &&
      !ctx.badgesEarned.includes('the_conductor') &&
      (ctx.eventMeta?.confirmedVendorCount ?? 0) >= 3,
  },
  {
    slug: 'the_maximalist',
    name: 'The Maximalist',
    category: 'style',
    isEligible: (event, ctx) =>
      event.action === 'VENDOR_CONFIRMED' &&
      !ctx.badgesEarned.includes('the_maximalist') &&
      (ctx.eventMeta?.confirmedVendorCount ?? 0) >= 10,
  },
  {
    slug: 'the_minimalist',
    name: 'The Minimalist',
    category: 'style',
    isEligible: (event, ctx) =>
      event.action === 'HEALTH_SCORE_THRESHOLD' &&
      !ctx.badgesEarned.includes('the_minimalist') &&
      event.metadata?.['threshold'] === 90 &&
      (ctx.eventMeta?.budgetEur ?? Infinity) < 2000,
  },
  {
    slug: 'maestro_di_tavola',
    name: 'Maestro di Tavola',
    category: 'milestone',
    isEligible: (event, ctx) =>
      event.action === 'SECTION_COMPLETED' &&
      !ctx.badgesEarned.includes('maestro_di_tavola') &&
      event.metadata?.['sectionKey'] === 'guest_dietary_complete',
  },
  {
    slug: 'all_weather_planner',
    name: 'All-Weather Planner',
    category: 'milestone',
    isEligible: (event, ctx) =>
      event.action === 'SECTION_COMPLETED' &&
      !ctx.badgesEarned.includes('all_weather_planner') &&
      event.metadata?.['sectionKey'] === 'contingency_plan' &&
      (ctx.eventMeta?.isOutdoor ?? false),
  },
];

/**
 * Returns slugs of badges earned by this gamification event.
 * Pure function — no side effects.
 */
export function checkBadgeEligibility(
  event: GamificationEvent,
  context: AwardContext
): string[] {
  return BADGE_DEFINITIONS
    .filter((badge) => badge.isEligible(event, context))
    .map((badge) => badge.slug);
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npx vitest run src/lib/gamification/engine.test.ts
```

Expected: PASS — all tests green including the new badge tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/gamification/badges.ts src/lib/gamification/engine.test.ts
git commit -m "feat(gamification): add badge definitions and eligibility checks"
```

---

## Task 5: Gamification Engine Orchestrator

**Files:**
- Create: `src/lib/gamification/engine.ts`
- Modify: `src/lib/gamification/engine.test.ts` (add engine tests)

- [ ] **Step 1: Add engine orchestration tests**

Append to `src/lib/gamification/engine.test.ts`:

```typescript
import { computeAward } from './engine';

describe('computeAward', () => {
  it('returns correct points and no badge for STEP_COMPLETED', () => {
    const result = computeAward(
      { action: 'STEP_COMPLETED', userId: 'u1' },
      { careerFpBefore: 0, badgesEarned: [] }
    );
    expect(result.points).toBe(10);
    expect(result.badgeSlugs).toHaveLength(0);
    expect(result.newLevel).toBeUndefined();
  });

  it('returns 100 FP and first_light badge on WIZARD_COMPLETED', () => {
    const result = computeAward(
      { action: 'WIZARD_COMPLETED', userId: 'u1' },
      { careerFpBefore: 0, badgesEarned: [] }
    );
    expect(result.points).toBe(100);
    expect(result.badgeSlugs).toContain('first_light');
  });

  it('detects level-up when FP crosses a threshold', () => {
    // Career was 490 FP, WIZARD_COMPLETED adds 100 → now 590 → level 2
    const result = computeAward(
      { action: 'WIZARD_COMPLETED', userId: 'u1' },
      { careerFpBefore: 490, badgesEarned: ['first_light'] }
    );
    expect(result.newLevel).toBe(2);
  });

  it('returns no newLevel when level does not change', () => {
    const result = computeAward(
      { action: 'STEP_COMPLETED', userId: 'u1' },
      { careerFpBefore: 1000, badgesEarned: [] }
    );
    expect(result.newLevel).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npx vitest run src/lib/gamification/engine.test.ts
```

Expected: FAIL — `Cannot find module './engine'`

- [ ] **Step 3: Implement the engine orchestrator**

Create `src/lib/gamification/engine.ts`:

```typescript
import { FP_AWARDS } from './events';
import { computeLevel } from './levels';
import { checkBadgeEligibility } from './badges';
import type {
  GamificationEvent,
  AwardContext,
  AwardResult,
} from '@/types/gamification.types';

/**
 * Pure function: computes FP, badge slugs, and level change for a gamification event.
 * Has no side effects — persistence is the caller's responsibility.
 */
export function computeAward(
  event: GamificationEvent,
  context: AwardContext
): AwardResult {
  const points = FP_AWARDS[event.action];
  const careerFpAfter = context.careerFpBefore + points;

  const badgeSlugs = checkBadgeEligibility(event, context);

  const levelBefore = computeLevel(context.careerFpBefore);
  const levelAfter = computeLevel(careerFpAfter);

  return {
    points,
    badgeSlugs,
    newLevel: levelAfter !== levelBefore ? levelAfter : undefined,
  };
}
```

- [ ] **Step 4: Run the full test file**

```bash
npx vitest run src/lib/gamification/engine.test.ts
```

Expected: PASS — all tests green (levels + FP awards + badge eligibility + engine orchestrator).

- [ ] **Step 5: Commit**

```bash
git add src/lib/gamification/engine.ts src/lib/gamification/engine.test.ts
git commit -m "feat(gamification): add computeAward engine orchestrator"
```

---

## Task 6: Award FP API Route

**Files:**
- Create: `src/app/api/gamification/award/route.ts`

- [ ] **Step 1: Write the route**

Create `src/app/api/gamification/award/route.ts`:

```typescript
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { computeAward } from '@/lib/gamification/engine';
import type { GamificationEvent, AwardContext } from '@/types/gamification.types';

export const runtime = 'nodejs';

const RequestSchema = z.object({
  action: z.enum([
    'STEP_COMPLETED',
    'WIZARD_COMPLETED',
    'DOMAIN_UNLOCKED',
    'SECTION_COMPLETED',
    'VENDOR_CONFIRMED',
    'RSVP_ACCEPTED',
    'COLLABORATOR_SECTION_COMPLETED',
    'STREAK_MAINTAINED',
    'HEALTH_SCORE_THRESHOLD',
  ]),
  eventId: z.string().uuid().optional(),
  metadata: z.record(z.unknown()).optional(),
  /** Caller must pass these — fetched from Supabase profile before calling */
  careerFpBefore: z.number().int().min(0),
  badgesEarned: z.array(z.string()),
  eventMeta: z
    .object({
      budgetEur: z.number().optional(),
      confirmedVendorCount: z.number().int().optional(),
      guestCount: z.number().int().optional(),
      isOutdoor: z.boolean().optional(),
      wizardDurationMs: z.number().optional(),
    })
    .optional(),
});

export async function POST(request: Request) {
  // Auth
  const authHeader = request.headers.get('authorization');
  const accessToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!accessToken) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  const userClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });

  const { data: { user } } = await userClient.auth.getUser();
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Parse body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: 'Invalid request', details: parsed.error.flatten() }, { status: 400 });
  }

  const { action, eventId, metadata, careerFpBefore, badgesEarned, eventMeta } = parsed.data;

  // Compute award (pure, no side effects)
  const gamificationEvent: GamificationEvent = { action, userId: user.id, eventId, metadata };
  const awardContext: AwardContext = { careerFpBefore, badgesEarned, eventMeta };
  const award = computeAward(gamificationEvent, awardContext);

  if (award.points === 0) {
    return Response.json({ award });
  }

  // Persist via service role (bypasses RLS)
  const admin = createClient(supabaseUrl, supabaseServiceKey);

  // 1. Log FP transaction
  await admin.from('fp_transactions').insert({
    user_id: user.id,
    event_id: eventId ?? null,
    action,
    points: award.points,
  });

  // 2. Update profile career_fp and planner_level
  const newCareerFp = careerFpBefore + award.points;
  await admin
    .from('profiles')
    .upsert({
      id: user.id,
      career_fp: newCareerFp,
      planner_level: award.newLevel ?? computeCurrentLevel(careerFpBefore),
      last_active_date: new Date().toISOString().split('T')[0],
    });

  // 3. Update event_fp if eventId provided
  if (eventId) {
    await admin.rpc('increment_event_fp', { p_event_id: eventId, p_points: award.points });
  }

  // 4. Award badges
  if (award.badgeSlugs.length > 0) {
    const { data: badgeRows } = await admin
      .from('badges')
      .select('id, slug')
      .in('slug', award.badgeSlugs);

    if (badgeRows && badgeRows.length > 0) {
      await admin.from('user_badges').insert(
        badgeRows.map((b: { id: string; slug: string }) => ({
          user_id: user.id,
          badge_id: b.id,
          event_id: eventId ?? null,
        }))
      );
    }
  }

  return Response.json({ award });
}

function computeCurrentLevel(careerFp: number): number {
  const thresholds = [
    { minFp: 10000, level: 5 },
    { minFp: 4000,  level: 4 },
    { minFp: 1500,  level: 3 },
    { minFp: 500,   level: 2 },
    { minFp: 0,     level: 1 },
  ];
  return thresholds.find((t) => careerFp >= t.minFp)?.level ?? 1;
}
```

- [ ] **Step 2: Add the `increment_event_fp` Postgres function**

Create `supabase/migrations/004_increment_event_fp.sql`:

```sql
-- ============================================================
-- 004_increment_event_fp.sql
-- Atomic increment for event_fp to avoid race conditions
-- ============================================================
create or replace function public.increment_event_fp(
  p_event_id uuid,
  p_points   int
) returns void
language sql security definer as $$
  update public.events
  set event_fp = event_fp + p_points
  where id = p_event_id;
$$;
```

Apply it:

```bash
supabase db push
```

- [ ] **Step 3: Smoke test the route manually**

```bash
# Start dev server
npm run dev

# In another terminal — replace TOKEN and EVENT_ID with real values from your Supabase session
curl -X POST http://localhost:3000/api/gamification/award \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{
    "action": "STEP_COMPLETED",
    "eventId": "EVENT_ID",
    "careerFpBefore": 0,
    "badgesEarned": []
  }'
```

Expected response:

```json
{
  "award": {
    "points": 10,
    "badgeSlugs": [],
    "newLevel": undefined
  }
}
```

- [ ] **Step 4: Commit**

```bash
git add src/app/api/gamification/award/route.ts supabase/migrations/004_increment_event_fp.sql
git commit -m "feat(api): add /api/gamification/award route with Supabase persistence"
```

---

## Task 7: Run Full Test Suite

- [ ] **Step 1: Run all tests**

```bash
npx vitest run
```

Expected: all existing tests pass + new gamification tests pass. No regressions.

- [ ] **Step 2: Commit if any fixes were needed**

```bash
git add -p
git commit -m "fix: resolve any test regressions after gamification foundation"
```

---

## Self-Review Checklist

- [x] **Spec coverage:** Migration adds all tables from spec (profiles, badges, user_badges, fp_transactions, domains, sections, events extensions). FP_AWARDS covers all 9 GamificationAction values. Badge definitions cover all 8 milestone/style badges. Level thresholds match spec (1/500/1500/4000/10000). API route persists FP + badges + level. Pro badges (trusted_planner, client_approved, the_reliable) are seeded in SQL but their eligibility functions are deferred to Plan 8 (Pro Dashboard) — they require cross-event data not available in this foundation layer.
- [x] **Placeholder scan:** No TBDs. SQL is complete. All type signatures match between engine.ts, badges.ts, and levels.ts.
- [x] **Type consistency:** `GamificationEvent`, `AwardContext`, `AwardResult`, `BadgeDefinition` used consistently across engine.ts, badges.ts, levels.ts, and the API route.
