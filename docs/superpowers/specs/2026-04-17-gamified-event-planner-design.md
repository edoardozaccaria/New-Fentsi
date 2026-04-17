# New-Fentsi — Gamified AI Event Planner: Design Spec

**Date:** 2026-04-17
**Status:** Approved
**Scope:** Full product redesign — gamification layer, AI orchestration, two-phase UX

---

## 0. Context & Constraints

- **Codebase:** Existing Next.js app, Supabase backend, warm dark editorial design system
- **Users:** Two roles — Consumer (planning own event) and Pro (managing client events)
- **Emotional arc:** Excitement during creation → Confidence at the finish line
- **AI:** Invisible — no chatbot, no companion character. Intelligence surfaces through smart suggestions, unlocks, and generated content
- **Collaboration:** Async — one owner, invited contributors with scoped access
- **Gamification:** Real mechanics (points, badges, unlocks) presented through the editorial design language — sophisticated, not playful
- **Health Score:** Measures completeness + coherence (not risk intelligence — that's v2)
- **Platform:** Browser-only — users install nothing. All AI runs server-side

---

## 1. System Architecture

### Two-Phase Structure

```
PHASE 1: CREATION SPRINT          PHASE 2: LIVING PLAN
─────────────────────────         ──────────────────────────────
  Wizard (12 steps)          →      Event Plan Dashboard
  Fast. Momentum. Micro-            Slower. Strategic. Rewards
  rewards every step.               compound over time.
  5–15 minutes to complete.         Active until event day.
```

### AI Routing Layer

All AI calls originate from Next.js API routes. The orchestration layer decides which engine to call based on task type, never exposing this split to the client.

```
USER ACTION (browser)
        │
        ▼
Next.js API Route (orchestration)
        │
        ├──→ Gemma 4 (Ollama, localhost:11434)
        │    Free. <100ms. High-frequency lightweight tasks.
        │    Health check on startup; falls back to static rules if unavailable.
        │
        ├──→ Claude Haiku 4.5
        │    ~$0.001/1K tokens. Fast NL tasks needing better quality than Gemma.
        │
        ├──→ Claude Sonnet 4.6  ← default for most generation
        │    ~$0.003/1K tokens. Plan generation, recommendations, explanations.
        │    Prompt caching mandatory on all system prompts.
        │
        └──→ Claude Opus 4.7
             ~$0.015/1K tokens. Pro cross-event analysis only.
             Gated behind Pro tier.
        │
        ▼
Supabase (persisted state)
Zustand (ephemeral UI state)
```

### Gemma 4 Service Contract

- Assumed running as a persistent Ollama server on the deployment host
- `/api/ai/health` endpoint checks Gemma availability on app startup
- If unavailable: all Gemma tasks fall back to deterministic static rules; no UX breakage; no user-facing error
- Gemma never receives guest PII — only anonymized, structured data

---

## 2. Task Allocation Table

| Feature / Task | Engine | Rationale |
|---|---|---|
| Health Score coherence checks | Gemma 4 | Real-time, high-frequency, deterministic logic |
| Badge eligibility evaluation | Gemma 4 | Rule-based, runs on every state change |
| FP calculation | Gemma 4 | Pure arithmetic, no cloud needed |
| Domain unlock threshold evaluation | Gemma 4 | Score comparison, instant |
| Budget plausibility check (per input) | Gemma 4 | Heuristic, privacy-sensitive (budget stays local) |
| Dietary conflict detection | Gemma 4 | Rule scan, guest PII never leaves server boundary |
| Streak calculation | Gemma 4 | Date arithmetic |
| Wizard field hints (city → venue type) | Haiku | Fast NL, quality matters for UX |
| Health Score explanation ("what's holding you back") | Haiku | Short NL output, high frequency |
| Surprise reward copy | Haiku | Short, punchy — doesn't need Sonnet |
| Collaborator section assignment suggestions | Haiku | Short reasoning, low stakes |
| Full event plan generation (post-wizard) | Sonnet | Deep reasoning, long-form, creative personalization |
| Vendor category recommendations | Sonnet | Multi-factor ranking, world knowledge |
| Timeline + milestone sequencing | Sonnet | Multi-constraint reasoning |
| Experience suggestions (theme, music, lighting, food) | Sonnet | Creative, personalized |
| Guest dietary catering note generation | Sonnet | Synthesis of anonymized guest data |
| Contingency plan generation | Sonnet | Complex "what if" reasoning |
| Domain diff-aware re-generation | Sonnet | Targeted regeneration when user edits inputs |
| Pro: cross-event insight analysis | Opus | Long-context, multi-event, Pro-only |

### Cost Optimization Rules

1. **Prompt caching** on all Claude calls — event context (type, size, date, budget, location, vibe word) cached as system prompt prefix
2. **Streaming** on all plan generation — user sees output appear in real time; no waiting for completion
3. **Tool use / structured output** on all Claude calls — never parse prose; typed JSON via tool calls
4. **Cache results in Supabase** — generated Domain sections are stored; never re-generated unless inputs change
5. **Diff-aware regeneration** — if user changes budget, only regenerate Budget domain, not the full plan
6. **Haiku for short outputs** — any Claude task with output under ~200 tokens routes to Haiku first

---

## 3. Core Modules

### 3.1 Onboarding Engine
Drives the Creation Sprint (wizard). Manages step state, validates inputs, fires micro-reward animations, assembles the final payload for plan generation.

- Step state machine: advance, retreat; Pro users can skip Steps 0–2 with smart defaults
- Per-step Gemma 4 calls for instant field feedback (budget plausibility, city validation)
- Micro-reward events emitted on each step completion (`STEP_COMPLETED`)
- On wizard complete: assembles full context → Claude Sonnet streams plan → sections written to Supabase

### 3.2 Plan Builder
Manages the living plan (Phase 2). Owns the 6-Domain game board, section editing, and Claude API calls for content generation.

- Domain lock/unlock state driven by Health Score thresholds
- Streaming Claude responses rendered into Domain sections in real time
- Diff-aware regeneration: tracks which sections depend on which wizard inputs; only regenerates affected sections on change
- Optimistic UI updates — changes feel instant before Supabase confirms

### 3.3 Health Score Engine
Single source of truth for plan quality. Recomputed on every relevant state change.

```
Health Score = (Completeness × 0.6) + (Coherence × 0.4)

Completeness = % of required fields filled across all unlocked Domains

Coherence checks (each deducts up to 10 points if violated):
  - Budget ÷ guest count plausible for event type + location
  - Venue confirmed if event date < 90 days away
  - Vendor count matches event scale
  - No date conflicts in timeline milestones
  - Dietary needs have corresponding catering notes
```

- Coherence computed by Gemma 4 (fast, server-side)
- Score emits events subscribed to by Gamification Engine (`HEALTH_SCORE_CHANGED`, `THRESHOLD_CROSSED`)
- Score always accompanied by a Haiku-generated plain-language explanation of what's holding it back

### 3.4 Gamification Engine
Stateless reactive system — listens to events from other modules, awards FP, evaluates badges, updates levels. Never initiates actions.

Events it listens for:
- `STEP_COMPLETED` → +10 FP
- `WIZARD_COMPLETED` → +100 FP bonus
- `DOMAIN_UNLOCKED` → +25 FP
- `SECTION_COMPLETED` → +25–75 FP (scales with domain complexity)
- `VENDOR_CONFIRMED` → +150 FP
- `RSVP_ACCEPTED` → +5 FP per guest
- `COLLABORATOR_SECTION_COMPLETED` → +50 FP to owner
- `STREAK_MAINTAINED` (7 days) → +75 FP
- `HEALTH_SCORE_THRESHOLD` (60, 75, 90) → +200 FP each
- `SURPRISE_REWARD_TRIGGER` → evaluated at specific action milestones

All computation via Gemma 4. Persists to Supabase via FPTransaction log. Syncs to Zustand for immediate UI.

### 3.5 Guest Manager
Full lifecycle: invitations, RSVPs, dietary needs, accessibility, seating (if unlocked).

- Import: manual entry or CSV upload
- RSVP: shareable link — guests self-register without a Fentsi account
- Gemma 4 scans dietary tags for conflicts (e.g. same guest tagged both vegan and pescatarian)
- Guest PII never sent to Claude API — anonymized headcount + dietary category summary only
- Seating arrangement tool unlocked as surprise reward at 50 confirmed guests

### 3.6 Vendor Matcher
Recommends, tracks, and confirms vendors. Highest-FP actions live here.

- Claude Sonnet generates ranked vendor categories for the specific event type + scale
- Vendor status pipeline: `suggested → contacted → quoted → confirmed → contracted`
- Each transition awards incremental FP; `confirmed` is the primary reward moment (150 FP)
- Confirmed vendor count feeds Health Score Engine for coherence checks
- No third-party marketplace integration in v1 — user manually adds vendor details

### 3.7 Collaboration Hub
Async co-planning — invitations, section assignments, guest input collection.

- Owner invites collaborators by email; each gets a scoped role
- Claude Haiku suggests which domains to delegate based on event context
- Collaborator completes assigned domain → owner notified → 50 FP awarded to owner; collaborator earns FP on their own profile (requires Fentsi account)
- Guest input form: shareable link, no account required, feeds into Guest Manager

### 3.8 Pro Dashboard
Multi-event command center for professional planners.

- Aggregate view: all active client events with Health Scores, next actions, upcoming milestones
- Unified next-action feed across all events
- Claude Opus weekly cross-event insight panel (Pro-only): patterns, budget warnings, vendor reliability signals
- Client approval flow: read-only shareable plan link; client can comment; owner resolves
- Pro badges displayed on a shareable planner profile page

---

## 4. Data Model

```
User
├── id, email, role: 'consumer' | 'pro'
├── planner_level: 1–5
├── total_fp: number
├── streak_days: number
├── last_active_date: date
└── badges: UserBadge[]

Event
├── id, name, vibe_word
├── type: EventType
├── subtype: string (optional)
├── owner_id → User
├── status: 'draft' | 'active' | 'completed' | 'archived'
├── health_score: number (0–100)
├── completeness_score: number
├── coherence_score: number
├── total_fp_earned: number
└── domains: Domain[]

Domain
├── id, event_id → Event
├── type: 'core' | 'budget' | 'people' | 'venue' | 'experience' | 'execution'
├── locked: boolean
├── completeness: number (0–100)
├── sections: Section[]
└── last_generated_at: timestamp

Section
├── id, domain_id → Domain
├── key: string
├── content: JSON (typed per section key)
├── generated_by: 'claude' | 'gemma' | 'user'
└── last_edited_at: timestamp

Guest
├── id, event_id → Event
├── name, email (optional)
├── rsvp_status: 'pending' | 'accepted' | 'declined'
├── dietary_needs: string[]
├── accessibility_needs: string[]
└── added_by: 'owner' | 'collaborator' | 'self'

Vendor
├── id, event_id → Event
├── category: string
├── name, contact, notes
├── status: 'suggested' | 'contacted' | 'quoted' | 'confirmed' | 'contracted'
├── cost_estimate: number
├── cost_confirmed: number
└── confirmed_date: date

Badge
├── id, slug
├── name, description
└── category: 'milestone' | 'style' | 'pro'

UserBadge
├── user_id → User
├── badge_id → Badge
└── event_id → Event

FPTransaction
├── id, user_id → User
├── event_id → Event (nullable)
├── action: string
├── points: number
└── created_at: timestamp

EventCollaborator
├── event_id → Event
├── user_id → User (nullable)
├── email: string
├── role: 'co-planner' | 'viewer' | 'client'
├── assigned_domain: DomainType (nullable)
└── invite_status: 'pending' | 'accepted'

WizardSnapshot
├── id, event_id → Event
├── step_data: JSON
├── completed_at: timestamp
└── plan_generated: boolean
```

### Domain Unlock Thresholds

| Domain | Unlocks at Health Score |
|---|---|
| Core | Always open (wizard output) |
| Budget | 25 |
| People | 30 |
| Venue & Logistics | 45 |
| Experience | 55 |
| Execution | 70 (or early via surprise reward: first vendor confirmed) |

### Data Locality Rules

| Data | Storage | Rule |
|---|---|---|
| Event structure, Domains, Sections | Supabase | Persistent, collaborative |
| Guest names, dietary, accessibility | Supabase (RLS) | Owner + collaborator only; never sent to Claude |
| Vendor contact details | Supabase (RLS) | Owner only |
| Health Score, FP, badges, levels | Supabase | Cross-device persistent |
| Wizard step state (in-progress) | Zustand | Ephemeral until commit |
| Gemma 4 coherence computation inputs | Memory only | Never persisted; only result stored |
| Claude API prompts | Never logged | Assembled per-request from Supabase data |

---

## 5. Gamification Engine Spec

### Point Economy

Single currency: **Fentsi Points (FP)**. Points are never deducted — only awarded.

Two scopes:
- **Event FP** — earned on a specific event, shown on the event card
- **Career FP** — global accumulation across all events, drives Planner Level

### Planner Levels

| Level | Career FP | Title |
|---|---|---|
| 1 | 0 | *The Dreamer* |
| 2 | 500 | *The Organizer* |
| 3 | 1,500 | *The Curator* |
| 4 | 4,000 | *The Director* |
| 5 | 10,000 | *The Maestro* |

### Badge System

Displayed as embossed dark-gold medallions. Three categories:

**Milestone Badges:**
- *First Light* — Complete first wizard
- *The Full Picture* — One Domain at 100%
- *Grand Architect* — Health Score 90+ on any event
- *The Conductor* — First event with 3+ confirmed vendors
- *Maestro di Tavola* — Guest list + dietary needs fully complete
- *All-Weather Planner* — Contingency plan added to an outdoor event

**Style Badges:**
- *The Minimalist* — Budget under €2,000, Health Score 80+
- *The Maximalist* — 10+ vendors confirmed on one event
- *The Speedrunner* — Wizard completed in under 4 minutes
- *The Perfectionist* — All 6 Domains at 100% before event date

**Pro Badges:**
- *Trusted Planner* — 5+ events managed to completion
- *Client Approved* — 3+ events with client sign-off
- *The Reliable* — Zero missed vendor deadlines across 10 events

### Surprise Rewards

Triggered at specific milestones, no prior warning. Presented as a dark card sliding up from screen bottom:

| Trigger | Reward |
|---|---|
| Event named in Step 0 | Unlock: shareable event cover card |
| First vendor confirmed | Early unlock: Execution Domain (skips score gate) |
| 50 guests confirmed | Unlock: seating arrangement tool |
| Health Score hits 90 | Unlock: printable/shareable event brief PDF |

---

## 6. UX Flow

### Phase 1 — Creation Sprint (Consumer)

```
Step 0 — Event Identity
  Name the event + pick a vibe word (intimate / electric / elegant / wild / cozy / grand)
  ★ Event name animates into page header as user types
  ★ On confirm: "Your event has a name. It's real now." → surprise unlock: cover card

Steps 1–10 — Core Wizard Questions
  Each step: single question, full-screen, minimal chrome
  ★ Per step: circular progress arc fills; dark-gold stamp seals answer; "+10" FP floats up
  ★ Step 4 (guest count >50): "This is a real party." micro-message
  ★ Step 5 (budget): Gemma 4 instant plausibility signal ("Plausible for [type] in [location]")
  ★ Step 10 (review): Health Score ring previewed for first time (~40 pts, pulsing)

Step 11 — Commit
  CTA: "Launch My Plan"
  ★ 100 FP bonus animates
  ★ Level progress fills (typically reaches Level 2: "The Organizer")
  ★ First badge: "First Light" — embossed medallion reveal
  ★ Claude Sonnet streams plan into Domains in real time (user watches it build)
```

### Phase 2 — Living Plan Loop

```
Event Plan Dashboard
  ├── Health Score ring (prominent, center-top) + Haiku explanation below it
  ├── 6 Domain cards (Core open; others locked/unlocking)
  ├── "Next unlock at score 45 — add your budget →" persistent nudge
  └── FP total + Level indicator (top-right, subtle)

Domain interaction loop:
  1. Domain card shimmers on unlock
  2. User opens Domain → Claude Sonnet streams content
  3. User edits inline → Gemma 4 recalculates coherence in real time
  4. Health Score ring updates live
  5. Next domain shimmer-unlocks at threshold

Key moments:
  - Vendor confirmed: 150 FP burst + "The Conductor" badge progress
  - Health Score 60: +200 FP bonus
  - Health Score 75: +200 FP bonus + contingency plan generated
  - Health Score 90: +200 FP bonus + "Grand Architect" badge reveal + event brief unlock
  - Event day: plan locks, archive state begins
  - Post-event: user rates plan vs reality → stored as personalization metadata
```

### Pro User Flow

```
Home: Pro Dashboard (not the wizard)
  → Grid of client events with Health Scores + next actions
  → "New Client Event" → abbreviated wizard with Pro defaults
  → Per-event: same Phase 2 loop
  → Weekly: Claude Opus cross-event insight panel
  → Client approval: read-only share link → comment → resolve
  ★ FP accumulates globally across all client events
  ★ Pro badges track across portfolio
```

---

## 7. Open Questions & Decisions Made

### Decisions Made (balanced defaults)

| Question | Decision |
|---|---|
| FP scope | Dual: per-event FP shown on event card + Career FP for level/badge progression |
| Health Score visibility during wizard | First shown at Step 10 (Review) only — avoids early anxiety |
| Collaborator FP | Collaborators earn FP on their own profile (requires Fentsi account) |
| Plan regeneration on edit | Diff-aware: only regenerate sections dependent on changed inputs |
| Free vs Pro boundary | Consumer: single event, all 6 Domains, all badges. Pro: multi-event dashboard, Opus insights, client approval flow, Pro badges |
| Gemma 4 availability | Health check on startup; graceful fallback to static rules; no user-facing error |
| Pro mode gamification | Full gamification available; "Focus Mode" toggle collapses FP/badge UI for planners who find it distracting |

### Remaining Open Questions (for next design cycle)

1. **Marketplace in v2?** Vendor Matcher currently requires manual entry. A curated vendor directory (region-gated) would dramatically increase Phase 2 engagement.
2. **Mobile app?** Current design is web-only. A native app would unlock push notifications for streak reminders and RSVP alerts — high-value for gamification retention.
3. **Event templates?** Pro users could save a completed event as a template (e.g. "Corporate dinner, 100 pax") to fast-start similar future events.

### Risks

| Risk | Probability | Impact | Mitigation |
|---|---|---|---|
| Domain unlock pacing feels slow | Medium | High | Two fast paths: surprise reward (vendor → Execution early) + streak bonus |
| Health Score feels arbitrary | Low | High | Always pair score with Haiku-generated plain-language explanation |
| Claude API cost at scale | Medium | High | Prompt caching, Haiku routing, Supabase result caching, diff-aware regen |
| Gemma 4 coherence degrades to static rules too often | Medium | Medium | Static rules must be genuinely useful, not just placeholder logic |
| Pro users find gamification patronizing | Medium | Medium | Focus Mode toggle; Pro badge aesthetic is award-like, not game-like |

### Prototype Priority

1. Health Score ring + Domain unlock shimmer animation
2. Wizard micro-rewards (stamp animation + FP float)
3. Claude Sonnet plan streaming into Domains
4. Gemma 4 coherence check via Ollama API route
