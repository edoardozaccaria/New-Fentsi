import Link from 'next/link';
import { BudgetRing } from '@/components/ui/BudgetRing';
import { DarkBentoCard } from '@/components/ui/DarkBentoCard';

// ─── Static budget data ────────────────────────────────────────────────────
const WEDDING_DATE = new Date('2026-06-14T00:00:00');

const CATEGORIES = [
  {
    id: 'venue',
    label: 'Venue',
    spent: 19000,
    total: 20000,
    accent: 'danger' as const,
    note: 'Villa Borghese · acconto versato',
  },
  {
    id: 'catering',
    label: 'Catering',
    spent: 7800,
    total: 18000,
    accent: 'gold' as const,
    note: '€10.200 ancora disponibili',
  },
  {
    id: 'florals',
    label: 'Florals',
    spent: 3900,
    total: 5000,
    accent: 'warning' as const,
    note: 'Verifica preventivo finale',
  },
  {
    id: 'attire',
    label: 'Attire',
    spent: 3200,
    total: 8000,
    accent: 'gold' as const,
    note: 'Abito · smoking · accessori',
  },
];

const TOTAL_BUDGET = CATEGORIES.reduce((s, c) => s + c.total, 0); // 51 000
const TOTAL_SPENT = CATEGORIES.reduce((s, c) => s + c.spent, 0); // 33 900
const TOTAL_PCT = Math.round((TOTAL_SPENT / TOTAL_BUDGET) * 100); // 66

// ─── Helpers ───────────────────────────────────────────────────────────────

type Category = (typeof CATEGORIES)[number];

function pct(c: Category) {
  return Math.round((c.spent / c.total) * 100);
}

function formatEur(n: number) {
  return '€\u202f' + n.toLocaleString('it-IT');
}

function daysUntil(target: Date): number {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.max(
    0,
    Math.ceil((target.getTime() - now.getTime()) / 86_400_000)
  );
}

// ─── Components ────────────────────────────────────────────────────────────

function ProgressBar({ pct: value }: { pct: number }) {
  const barColor =
    value >= 90 ? '#b5505a' : value >= 70 ? '#c27a3a' : '#c9975b';

  return (
    <div
      className="w-full rounded-full overflow-hidden"
      style={{ height: 3, background: '#2a2520' }}
    >
      <div
        style={{
          width: `${value}%`,
          height: '100%',
          background: barColor,
          borderRadius: 9999,
        }}
      />
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────

export default function HomePage() {
  const days = daysUntil(WEDDING_DATE);
  const [venue, catering, florals, attire] = CATEGORIES as [
    Category,
    Category,
    Category,
    Category,
  ];

  return (
    <div className="min-h-screen" style={{ background: '#0b0a09' }}>
      {/* ── Top nav ──────────────────────────────────────────────────── */}
      <nav
        className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b"
        style={{ background: '#0b0a09', borderColor: '#2a2520' }}
      >
        <span
          className="text-sm font-semibold tracking-[0.12em] uppercase"
          style={{ color: '#c9975b' }}
        >
          Fentsi
        </span>
        <div className="flex items-center gap-4">
          <span className="text-xs" style={{ color: '#6b6258' }}>
            14 Giugno 2026
          </span>
          <Link
            href="/create-event/wizard"
            className="text-xs font-medium px-4 py-1.5 rounded-lg transition-colors"
            style={{ background: '#c9975b', color: '#0b0a09' }}
          >
            + Nuovo evento
          </Link>
        </div>
      </nav>

      <main className="mx-auto max-w-5xl px-6 py-12 space-y-14">
        {/* ── Hero ─────────────────────────────────────────────────────── */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
          {/* Greeting — 2 of 3 columns */}
          <div className="md:col-span-2 space-y-4">
            <p
              className="text-xs tracking-[0.2em] uppercase"
              style={{ color: '#6b6258' }}
            >
              Il vostro giorno speciale
            </p>
            <h1
              className="font-serif leading-[0.95] tracking-tight"
              style={{
                fontSize: 'clamp(2.75rem, 6vw, 4.5rem)',
                color: '#f0ebe3',
              }}
            >
              Edoardo
              <br />
              <span style={{ color: '#c9975b' }}>&amp;</span> Sofia
            </h1>
            <p className="text-sm" style={{ color: '#6b6258' }}>
              Milano &mdash; 14 Giugno 2026
              {days > 0 && (
                <>
                  {' · '}
                  <span style={{ color: '#f0ebe3' }}>{days} giorni</span>
                  {' rimasti'}
                </>
              )}
            </p>
          </div>

          {/* Total budget summary card — 1 of 3 columns */}
          <DarkBentoCard accent="gold" className="p-6 space-y-4 md:col-span-1">
            <p
              className="text-xs tracking-widest uppercase"
              style={{ color: '#6b6258' }}
            >
              Budget totale
            </p>
            <div>
              <p
                className="font-serif leading-none"
                style={{ fontSize: '2.25rem', color: '#f0ebe3' }}
              >
                {formatEur(TOTAL_BUDGET)}
              </p>
              <p className="text-sm mt-1" style={{ color: '#6b6258' }}>
                {formatEur(TOTAL_SPENT)} spesi &middot; {100 - TOTAL_PCT}%
                rimasto
              </p>
            </div>
            <div className="space-y-1.5">
              <ProgressBar pct={TOTAL_PCT} />
              <p className="text-xs tabular-nums" style={{ color: '#6b6258' }}>
                {TOTAL_PCT}% allocato
              </p>
            </div>
          </DarkBentoCard>
        </section>

        {/* ── Category label ───────────────────────────────────────────── */}
        <div
          className="flex items-baseline gap-4 border-b pb-4"
          style={{ borderColor: '#2a2520' }}
        >
          <h2
            className="font-serif"
            style={{ fontSize: '1.5rem', color: '#f0ebe3' }}
          >
            Budget per categoria
          </h2>
          <span
            className="text-xs tracking-widest uppercase"
            style={{ color: '#6b6258' }}
          >
            4 voci
          </span>
        </div>

        {/* ── Bento grid ───────────────────────────────────────────────── */}
        {/*
          Desktop (lg): 3-col asymmetric bento
            Col 1       | Col 2    | Col 3
            Venue ×2    | Catering | Florals    ← row 1
            Venue ×2    | Attire (spans 2)      ← row 2

          Mobile: single-column stack
        */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 lg:grid-rows-2 gap-4">
          {/* ── Venue — tall hero card ──────────────────────────────── */}
          <DarkBentoCard
            accent="danger"
            interactive
            className="lg:row-span-2 p-6 flex flex-col items-center justify-between gap-6 min-h-[280px] lg:min-h-0"
          >
            <div className="w-full flex items-center justify-between">
              <span
                className="text-xs tracking-widest uppercase"
                style={{ color: '#6b6258' }}
              >
                Venue
              </span>
              <span
                className="text-xs tabular-nums"
                style={{ color: '#b5505a' }}
              >
                {pct(venue)}%
              </span>
            </div>

            <BudgetRing
              percentage={pct(venue)}
              spent={venue.spent}
              total={venue.total}
              size={152}
            />

            <div className="w-full space-y-2">
              <div className="flex items-baseline justify-between">
                <span
                  className="font-serif"
                  style={{ fontSize: '1.5rem', color: '#f0ebe3' }}
                >
                  {formatEur(venue.spent)}
                </span>
                <span
                  className="text-xs tabular-nums"
                  style={{ color: '#6b6258' }}
                >
                  / {formatEur(venue.total)}
                </span>
              </div>
              <ProgressBar pct={pct(venue)} />
              <p className="text-xs" style={{ color: '#6b6258' }}>
                {venue.note}
              </p>
            </div>
          </DarkBentoCard>

          {/* ── Catering ────────────────────────────────────────────── */}
          <DarkBentoCard
            accent="gold"
            interactive
            className="p-5 flex flex-col gap-4"
          >
            <div className="flex items-center justify-between">
              <span
                className="text-xs tracking-widest uppercase"
                style={{ color: '#6b6258' }}
              >
                Catering
              </span>
              <span
                className="text-xs tabular-nums"
                style={{ color: '#c9975b' }}
              >
                {pct(catering)}%
              </span>
            </div>
            <div className="flex items-center gap-4">
              <BudgetRing
                percentage={pct(catering)}
                spent={catering.spent}
                total={catering.total}
                size={88}
              />
              <div className="space-y-1 min-w-0">
                <p
                  className="font-serif leading-none truncate"
                  style={{ fontSize: '1.35rem', color: '#f0ebe3' }}
                >
                  {formatEur(catering.spent)}
                </p>
                <p className="text-xs" style={{ color: '#6b6258' }}>
                  di {formatEur(catering.total)}
                </p>
              </div>
            </div>
            <div className="space-y-1.5">
              <ProgressBar pct={pct(catering)} />
              <p className="text-xs" style={{ color: '#6b6258' }}>
                {catering.note}
              </p>
            </div>
          </DarkBentoCard>

          {/* ── Florals ─────────────────────────────────────────────── */}
          <DarkBentoCard
            accent="warning"
            interactive
            className="p-5 flex flex-col gap-4"
          >
            <div className="flex items-center justify-between">
              <span
                className="text-xs tracking-widest uppercase"
                style={{ color: '#6b6258' }}
              >
                Florals
              </span>
              <span
                className="text-xs tabular-nums"
                style={{ color: '#c27a3a' }}
              >
                {pct(florals)}%
              </span>
            </div>
            <div className="flex items-center gap-4">
              <BudgetRing
                percentage={pct(florals)}
                spent={florals.spent}
                total={florals.total}
                size={88}
              />
              <div className="space-y-1 min-w-0">
                <p
                  className="font-serif leading-none truncate"
                  style={{ fontSize: '1.35rem', color: '#f0ebe3' }}
                >
                  {formatEur(florals.spent)}
                </p>
                <p className="text-xs" style={{ color: '#6b6258' }}>
                  di {formatEur(florals.total)}
                </p>
              </div>
            </div>
            <div className="space-y-1.5">
              <ProgressBar pct={pct(florals)} />
              <p className="text-xs" style={{ color: '#6b6258' }}>
                {florals.note}
              </p>
            </div>
          </DarkBentoCard>

          {/* ── Attire — wide horizontal card ───────────────────────── */}
          <DarkBentoCard
            accent="gold"
            interactive
            className="sm:col-span-2 lg:col-span-2 p-5 flex items-center gap-6"
          >
            <BudgetRing
              percentage={pct(attire)}
              spent={attire.spent}
              total={attire.total}
              size={96}
            />

            <div className="flex-1 space-y-3 min-w-0">
              <div className="flex items-center justify-between">
                <span
                  className="text-xs tracking-widest uppercase"
                  style={{ color: '#6b6258' }}
                >
                  Attire
                </span>
                <span
                  className="text-xs tabular-nums"
                  style={{ color: '#c9975b' }}
                >
                  {pct(attire)}%
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <span
                  className="font-serif"
                  style={{ fontSize: '1.75rem', color: '#f0ebe3' }}
                >
                  {formatEur(attire.spent)}
                </span>
                <span className="text-sm" style={{ color: '#6b6258' }}>
                  di {formatEur(attire.total)}
                </span>
              </div>
              <div className="space-y-1.5">
                <ProgressBar pct={pct(attire)} />
                <p className="text-xs" style={{ color: '#6b6258' }}>
                  {attire.note}
                </p>
              </div>
            </div>
          </DarkBentoCard>
        </div>

        {/* ── Footer rule ──────────────────────────────────────────────── */}
        <div
          className="flex items-center justify-between pt-2 border-t text-xs"
          style={{ borderColor: '#2a2520', color: '#6b6258' }}
        >
          <span>Fentsi · Wedding Planner</span>
          <span>
            {formatEur(TOTAL_BUDGET - TOTAL_SPENT)} ancora disponibili
          </span>
        </div>
      </main>
    </div>
  );
}
