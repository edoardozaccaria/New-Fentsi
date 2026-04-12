/**
 * Sandbox page — preview isolato dei componenti UI atomici.
 * Visibile su /sandbox in dev. Non collegare a navigation.
 */
import { BudgetRing } from '@/components/ui/BudgetRing';
import { DarkBentoCard } from '@/components/ui/DarkBentoCard';
import { EmptyVendorState } from '@/components/ui/EmptyVendorState';

export default function SandboxPage() {
  return (
    <>
      <div
        className="min-h-screen px-6 py-16"
        style={{ background: '#0b0a09' }}
      >
        <div className="mx-auto max-w-4xl space-y-20">
          {/* ── Header ───────────────────────────────────────────────── */}
          <div className="border-b border-[#2a2520] pb-8">
            <p
              className="text-xs tracking-[0.18em] uppercase mb-3"
              style={{ color: '#6b6258' }}
            >
              Sandbox · Design System
            </p>
            <h1
              className="font-serif leading-none"
              style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)', color: '#f0ebe3' }}
            >
              UI Components
            </h1>
            <p
              className="mt-3 text-sm"
              style={{ color: '#6b6258', maxWidth: '38ch' }}
            >
              Palette: warm dark editorial. Font: DM Serif Display + Outfit.
              Radius: 8px throughout. One separator method per component.
            </p>
          </div>

          {/* ── BudgetRing ───────────────────────────────────────────── */}
          <section className="space-y-6">
            <div className="flex items-baseline gap-4">
              <h2
                className="font-serif"
                style={{ fontSize: '1.5rem', color: '#f0ebe3' }}
              >
                BudgetRing
              </h2>
              <span
                className="text-xs tracking-widest uppercase"
                style={{ color: '#6b6258' }}
              >
                3 states
              </span>
            </div>

            <div className="flex flex-wrap gap-10 items-end">
              <div className="flex flex-col items-center gap-3">
                <BudgetRing
                  percentage={42}
                  spent={4200}
                  total={10000}
                  size={128}
                />
                <span className="text-xs" style={{ color: '#6b6258' }}>
                  safe — 42%
                </span>
              </div>

              <div className="flex flex-col items-center gap-3">
                <BudgetRing
                  percentage={78}
                  spent={7800}
                  total={10000}
                  size={128}
                />
                <span className="text-xs" style={{ color: '#6b6258' }}>
                  warning — 78%
                </span>
              </div>

              <div className="flex flex-col items-center gap-3">
                <BudgetRing
                  percentage={95}
                  spent={9500}
                  total={10000}
                  size={128}
                />
                <span className="text-xs" style={{ color: '#6b6258' }}>
                  danger — 95%
                </span>
              </div>

              {/* Hero size — the number is the protagonist */}
              <div className="flex flex-col items-center gap-3">
                <BudgetRing
                  percentage={60}
                  spent={6000}
                  total={10000}
                  size={176}
                />
                <span className="text-xs" style={{ color: '#6b6258' }}>
                  size=176 — hero
                </span>
              </div>
            </div>
          </section>

          {/* ── DarkBentoCard ────────────────────────────────────────── */}
          <section className="space-y-6">
            <div className="flex items-baseline gap-4">
              <h2
                className="font-serif"
                style={{ fontSize: '1.5rem', color: '#f0ebe3' }}
              >
                DarkBentoCard
              </h2>
              <span
                className="text-xs tracking-widest uppercase"
                style={{ color: '#6b6258' }}
              >
                accent variants
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <DarkBentoCard className="p-5">
                <p className="text-xs mb-1.5" style={{ color: '#6b6258' }}>
                  accent=none
                </p>
                <p className="text-sm" style={{ color: '#f0ebe3' }}>
                  Base card. Border is the only separator.
                </p>
              </DarkBentoCard>

              <DarkBentoCard accent="gold" className="p-5">
                <p className="text-xs mb-1.5" style={{ color: '#6b6258' }}>
                  accent=gold
                </p>
                <p className="text-sm" style={{ color: '#f0ebe3' }}>
                  Safe / on-track state.
                </p>
              </DarkBentoCard>

              <DarkBentoCard accent="warning" className="p-5">
                <p className="text-xs mb-1.5" style={{ color: '#6b6258' }}>
                  accent=warning
                </p>
                <p className="text-sm" style={{ color: '#f0ebe3' }}>
                  Budget approaching limit.
                </p>
              </DarkBentoCard>

              <DarkBentoCard accent="danger" className="p-5">
                <p className="text-xs mb-1.5" style={{ color: '#6b6258' }}>
                  accent=danger
                </p>
                <p className="text-sm" style={{ color: '#f0ebe3' }}>
                  Budget exceeded.
                </p>
              </DarkBentoCard>

              <DarkBentoCard accent="muted" className="p-5">
                <p className="text-xs mb-1.5" style={{ color: '#6b6258' }}>
                  accent=muted
                </p>
                <p className="text-sm" style={{ color: '#f0ebe3' }}>
                  Neutral / inactive.
                </p>
              </DarkBentoCard>

              <DarkBentoCard accent="gold" interactive className="p-5">
                <p className="text-xs mb-1.5" style={{ color: '#6b6258' }}>
                  interactive=true
                </p>
                <p className="text-sm" style={{ color: '#f0ebe3' }}>
                  Hover: border brightens.
                </p>
              </DarkBentoCard>
            </div>
          </section>

          {/* ── Composizione: BudgetRing + DarkBentoCard ─────────────── */}
          <section className="space-y-6">
            <div className="flex items-baseline gap-4">
              <h2
                className="font-serif"
                style={{ fontSize: '1.5rem', color: '#f0ebe3' }}
              >
                Composizione
              </h2>
              <span
                className="text-xs tracking-widest uppercase"
                style={{ color: '#6b6258' }}
              >
                BudgetRing in DarkBentoCard
              </span>
            </div>

            {/* Asymmetric layout — not a uniform grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                {
                  label: 'Catering',
                  pct: 42,
                  spent: 4200,
                  total: 10000,
                  accent: 'gold' as const,
                },
                {
                  label: 'Fiori',
                  pct: 78,
                  spent: 3900,
                  total: 5000,
                  accent: 'warning' as const,
                },
                {
                  label: 'Venue',
                  pct: 95,
                  spent: 19000,
                  total: 20000,
                  accent: 'danger' as const,
                },
              ].map(({ label, pct, spent, total, accent }) => (
                <DarkBentoCard
                  key={label}
                  accent={accent}
                  interactive
                  className="p-6 flex flex-col items-center gap-4"
                >
                  <BudgetRing
                    percentage={pct}
                    spent={spent}
                    total={total}
                    size={108}
                  />
                  <div className="text-center">
                    <p
                      className="text-sm font-medium"
                      style={{ color: '#f0ebe3' }}
                    >
                      {label}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: '#6b6258' }}>
                      budget €{total.toLocaleString('it-IT')}
                    </p>
                  </div>
                </DarkBentoCard>
              ))}
            </div>
          </section>

          {/* ── EmptyVendorState ─────────────────────────────────────── */}
          <section className="space-y-6">
            <div className="flex items-baseline gap-4">
              <h2
                className="font-serif"
                style={{ fontSize: '1.5rem', color: '#f0ebe3' }}
              >
                EmptyVendorState
              </h2>
              <span
                className="text-xs tracking-widest uppercase"
                style={{ color: '#6b6258' }}
              >
                empty states
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl">
              <EmptyVendorState />

              <EmptyVendorState
                title="Nessuna spesa registrata"
                description="Le spese appariranno qui non appena aggiungi un fornitore."
                action={
                  <button className="text-xs font-medium px-3 py-1.5 rounded-[8px] transition-colors duration-200 text-[#c9975b] bg-[rgba(201,151,91,0.08)] hover:bg-[rgba(201,151,91,0.15)]">
                    + Aggiungi fornitore
                  </button>
                }
              />
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
