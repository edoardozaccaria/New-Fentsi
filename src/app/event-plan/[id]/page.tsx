import { createClient } from '@supabase/supabase-js';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { InquiryDialog } from '@/components/event-plan/InquiryDialog';
import { BudgetPieChart } from '@/components/event-plan/BudgetPieChart';
import { FloatingActionBar } from '@/components/event-plan/FloatingActionBar';
import type {
  PlanOverview,
  AlertItem,
  AlertSeverity,
} from '@/types/plan.types';

// ---------------------------------------------------------------------------
// DB row types
// ---------------------------------------------------------------------------

interface SupplierRow {
  id: string;
  name: string;
  category: string;
  description: string;
  estimated_price_usd: number;
  city: string;
  is_verified: boolean;
}

interface EventRow {
  id: string;
  event_type: string;
  event_date: string | null;
  duration: string | null;
  guest_count: number;
  city: string;
  budget_usd: number;
  required_services: string[];
  output_language: string | null;
  plan_data: PlanOverview | null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatEur(n: number) {
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(n);
}

function capitalize(s: string) {
  return s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

// ---------------------------------------------------------------------------
// Timeline — 5 fixed milestones calculated from event date
// ---------------------------------------------------------------------------

interface Milestone {
  label: string;
  offset: string;
  tasks: string[];
}

const MILESTONE_TEMPLATES: Array<{
  monthsBefore: number;
  label: string;
  tasks: string[];
}> = [
  {
    monthsBefore: 6,
    label: '6 mesi prima',
    tasks: [
      'Conferma venue e firma contratto',
      'Definisci budget finale e categorie di spesa',
      'Prenota catering e fotografo',
      'Invia save-the-date agli ospiti',
    ],
  },
  {
    monthsBefore: 3,
    label: '3 mesi prima',
    tasks: [
      'Conferma musicisti/DJ e fiorista',
      'Organizza trasporti per ospiti fuori città',
      'Invia inviti formali',
      'Definisci menu e richieste dietetiche',
    ],
  },
  {
    monthsBefore: 1,
    label: '1 mese prima',
    tasks: [
      'Conferma numero definitivo di ospiti',
      'Sopralluogo finale alla venue',
      'Coordinamento fornitori e rundown evento',
      'Verifica permessi e assicurazioni',
    ],
  },
  {
    monthsBefore: 0,
    label: '1 settimana prima',
    tasks: [
      'Conferma orari con tutti i fornitori',
      'Prepara buste paga/pagamenti finali',
      'Organizza kit emergenza (cerotti, aghi, spilloni…)',
      'Briefing finale con wedding planner o coordinatore',
    ],
  },
  {
    monthsBefore: -1,
    label: "Il giorno dell'evento",
    tasks: [
      'Arrivo anticipato alla venue per setup',
      'Accoglienza ospiti e gestione flussi',
      'Coordina con fornitori in loco',
      'Goditi ogni momento!',
    ],
  },
];

function buildTimeline(eventDate: string | null): Milestone[] {
  if (!eventDate) {
    return MILESTONE_TEMPLATES.map((t) => ({
      label: t.label,
      offset: '',
      tasks: t.tasks,
    }));
  }

  const evDate = new Date(eventDate + 'T00:00:00');

  return MILESTONE_TEMPLATES.map((t) => {
    let offsetDate: Date;
    if (t.monthsBefore === 0) {
      offsetDate = new Date(evDate);
      offsetDate.setDate(evDate.getDate() - 7);
    } else if (t.monthsBefore === -1) {
      offsetDate = new Date(evDate);
    } else {
      offsetDate = new Date(evDate);
      offsetDate.setMonth(evDate.getMonth() - t.monthsBefore);
    }

    const offset = offsetDate.toLocaleDateString('it-IT', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });

    return { label: t.label, offset, tasks: t.tasks };
  });
}

// ---------------------------------------------------------------------------
// Alert colours
// ---------------------------------------------------------------------------

const ALERT_SEVERITY_STYLES: Record<
  AlertSeverity,
  { border: string; bg: string; dot: string; text: string }
> = {
  high: {
    border: '#b5505a',
    bg: '#1a0d0f',
    dot: '#b5505a',
    text: '#d07070',
  },
  medium: {
    border: '#c27a3a',
    bg: '#1a1208',
    dot: '#c27a3a',
    text: '#d09050',
  },
  low: {
    border: '#2a2520',
    bg: '#111009',
    dot: '#4a4540',
    text: '#9a8f86',
  },
};

const ALERT_TYPE_LABEL: Record<AlertItem['type'], string> = {
  permit: 'PERMESSO',
  seasonal: 'STAGIONALE',
  cultural: 'CULTURALE',
  logistic: 'LOGISTICA',
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="flex items-center gap-4 border-b pb-3"
      style={{ borderColor: '#2a2520' }}
    >
      <h2
        className="font-serif"
        style={{ fontSize: '1.25rem', color: '#f0ebe3' }}
      >
        {children}
      </h2>
    </div>
  );
}

function AlertCard({ alert }: { alert: AlertItem }) {
  const styles = ALERT_SEVERITY_STYLES[alert.severity];
  return (
    <div
      className="flex gap-4 rounded-lg border px-5 py-4"
      style={{ background: styles.bg, borderColor: styles.border }}
    >
      <div
        className="mt-1.5 shrink-0 rounded-full"
        style={{ width: 8, height: 8, background: styles.dot }}
      />
      <div className="space-y-0.5 min-w-0">
        <p className="text-xs tracking-widest" style={{ color: styles.dot }}>
          {ALERT_TYPE_LABEL[alert.type]}
        </p>
        <p className="text-sm leading-relaxed" style={{ color: styles.text }}>
          {alert.message}
        </p>
      </div>
    </div>
  );
}

function VenueCard({
  supplier,
  eventId,
}: {
  supplier: SupplierRow;
  eventId: string;
}) {
  // Derive a style match score deterministically from the name (cosmetic for MVP)
  const matchScore = 75 + (supplier.name.charCodeAt(0) % 20);

  return (
    <div
      className="flex flex-col justify-between rounded-lg border p-5 space-y-4"
      style={{ background: '#111009', borderColor: '#2a2520' }}
    >
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-2">
          <p
            className="text-sm font-medium leading-snug"
            style={{ color: '#f0ebe3' }}
          >
            {supplier.name}
          </p>
          <div className="flex flex-col items-end gap-1 shrink-0">
            {supplier.is_verified && (
              <span
                className="text-xs px-1.5 py-0.5 rounded"
                style={{
                  background: '#0f2010',
                  color: '#6acc6a',
                  border: '1px solid #2a5a2a',
                }}
              >
                ✓ Verificato
              </span>
            )}
            <span
              className="text-xs px-2 py-0.5 rounded-full"
              style={{
                background: '#1a1410',
                color: '#c9975b',
                border: '1px solid #3a2a18',
              }}
            >
              Match {matchScore}%
            </span>
          </div>
        </div>
        <p className="text-xs leading-relaxed" style={{ color: '#6b6258' }}>
          {supplier.description}
        </p>
      </div>

      <div className="space-y-3">
        <p
          className="text-sm font-medium tabular-nums"
          style={{ color: '#c9975b' }}
        >
          {formatEur(supplier.estimated_price_usd)}
        </p>
        <InquiryDialog
          supplierId={supplier.id}
          supplierName={supplier.name}
          eventId={eventId}
        />
      </div>
    </div>
  );
}

function SupplierCard({
  supplier,
  eventId,
}: {
  supplier: SupplierRow;
  eventId: string;
}) {
  return (
    <div
      className="flex flex-col justify-between rounded-lg border p-5 space-y-4"
      style={{ background: '#111009', borderColor: '#2a2520' }}
    >
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-2">
          <p
            className="text-sm font-medium leading-snug"
            style={{ color: '#f0ebe3' }}
          >
            {supplier.name}
          </p>
          {supplier.is_verified && (
            <span
              className="shrink-0 text-xs px-1.5 py-0.5 rounded"
              style={{
                background: '#0f2010',
                color: '#6acc6a',
                border: '1px solid #2a5a2a',
              }}
            >
              ✓ Verified
            </span>
          )}
        </div>
        <p className="text-xs leading-relaxed" style={{ color: '#6b6258' }}>
          {supplier.description}
        </p>
      </div>

      <div className="space-y-3">
        <p
          className="text-sm font-medium tabular-nums"
          style={{ color: '#c9975b' }}
        >
          {formatEur(supplier.estimated_price_usd)}
        </p>
        <InquiryDialog
          supplierId={supplier.id}
          supplierName={supplier.name}
          eventId={eventId}
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page — server component
// ---------------------------------------------------------------------------

export default async function EventPlanPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // Build plan URL for sharing
  const headersList = await headers();
  const host = headersList.get('host') ?? 'localhost:3000';
  const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
  const planUrl = `${protocol}://${host}/event-plan/${id}`;

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const [
    { data: event, error: eventError },
    { data: suppliers, error: suppliersError },
  ] = await Promise.all([
    supabase.from('events').select('*').eq('id', id).single(),
    supabase
      .from('event_suppliers')
      .select('*')
      .eq('event_id', id)
      .order('category'),
  ]);

  if (eventError || !event || suppliersError) {
    notFound();
  }

  const ev = event as EventRow;
  const typedSuppliers = (suppliers ?? []) as SupplierRow[];
  const plan = ev.plan_data;

  // Separate venue suppliers from others
  const venueSuppliers = typedSuppliers.filter(
    (s) => s.category === 'venue' || s.category === 'venues'
  );

  // Group non-venue suppliers by category
  const grouped: Record<string, SupplierRow[]> = {};
  for (const s of typedSuppliers) {
    if (s.category === 'venue' || s.category === 'venues') continue;
    if (!grouped[s.category]) grouped[s.category] = [];
    grouped[s.category]!.push(s);
  }

  const timeline = buildTimeline(ev.event_date);

  return (
    <div className="min-h-screen pb-28" style={{ background: '#0b0a09' }}>
      {/* Nav */}
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
        <a
          href="/create-event/wizard"
          className="text-xs border px-3 py-1.5 rounded-lg transition-colors"
          style={{ borderColor: '#3a3530', color: '#6b6258' }}
        >
          Nuovo evento
        </a>
      </nav>

      <main className="mx-auto max-w-3xl px-6 py-12 space-y-14">
        {/* ── PlanHero ─────────────────────────────────────── */}
        <section className="space-y-4">
          <p
            className="text-xs tracking-[0.2em] uppercase"
            style={{ color: '#6b6258' }}
          >
            Il tuo piano evento
          </p>
          <h1
            className="font-serif leading-tight"
            style={{ fontSize: 'clamp(2rem, 5vw, 3rem)', color: '#f0ebe3' }}
          >
            {capitalize(ev.event_type)}
          </h1>

          <div className="flex flex-wrap gap-3">
            {[
              ev.city,
              ev.event_date
                ? new Date(ev.event_date + 'T00:00:00').toLocaleDateString(
                    'it-IT',
                    { month: 'long', day: 'numeric', year: 'numeric' }
                  )
                : null,
              `${ev.guest_count} ospiti`,
              formatEur(ev.budget_usd),
            ]
              .filter(Boolean)
              .map((tag, i) => (
                <span
                  key={i}
                  className="text-xs px-3 py-1.5 rounded-full border"
                  style={{
                    background: '#111009',
                    borderColor: '#2a2520',
                    color: '#9a8f86',
                  }}
                >
                  {tag}
                </span>
              ))}
          </div>
        </section>

        {/* ── VenueSection ─────────────────────────────────── */}
        {venueSuppliers.length > 0 && (
          <section className="space-y-4">
            <div
              className="flex items-center gap-4 border-b pb-3"
              style={{ borderColor: '#2a2520' }}
            >
              <h2
                className="font-serif"
                style={{ fontSize: '1.25rem', color: '#f0ebe3' }}
              >
                Venue
              </h2>
              <span
                className="text-xs tracking-widest uppercase"
                style={{ color: '#4a4540' }}
              >
                {venueSuppliers.length} opzioni
              </span>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {venueSuppliers.map((s) => (
                <VenueCard key={s.id} supplier={s} eventId={ev.id} />
              ))}
            </div>
          </section>
        )}

        {/* ── BudgetSection ─────────────────────────────────── */}
        {plan?.budgetBreakdown && (
          <section className="space-y-4">
            <SectionHeading>Budget</SectionHeading>
            <div
              className="rounded-lg border p-6"
              style={{ background: '#111009', borderColor: '#2a2520' }}
            >
              <BudgetPieChart
                breakdown={plan.budgetBreakdown}
                budgetEur={ev.budget_usd}
              />
            </div>
          </section>
        )}

        {/* ── TimelineSection ───────────────────────────────── */}
        <section className="space-y-6">
          <SectionHeading>Timeline</SectionHeading>
          <div className="relative space-y-0">
            {timeline.map((milestone, i) => (
              <div key={i} className="flex gap-5">
                {/* Vertical line + dot */}
                <div className="flex flex-col items-center">
                  <div
                    className="rounded-full shrink-0"
                    style={{
                      width: 10,
                      height: 10,
                      background:
                        i === timeline.length - 1 ? '#c9975b' : '#3a3530',
                      marginTop: 4,
                    }}
                  />
                  {i < timeline.length - 1 && (
                    <div
                      className="w-px flex-1 my-1"
                      style={{ background: '#1e1c1a', minHeight: 48 }}
                    />
                  )}
                </div>

                {/* Content */}
                <div className="pb-8 min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-3 mb-2">
                    <p
                      className="text-sm font-medium"
                      style={{
                        color:
                          i === timeline.length - 1 ? '#c9975b' : '#f0ebe3',
                      }}
                    >
                      {milestone.label}
                    </p>
                    {milestone.offset && (
                      <p className="text-xs" style={{ color: '#4a4540' }}>
                        {milestone.offset}
                      </p>
                    )}
                  </div>
                  <ul className="space-y-1.5">
                    {milestone.tasks.map((task, j) => (
                      <li key={j} className="flex gap-2.5">
                        <span
                          style={{
                            color: '#3a3530',
                            flexShrink: 0,
                            marginTop: 1,
                          }}
                        >
                          —
                        </span>
                        <span
                          className="text-sm leading-relaxed"
                          style={{ color: '#6b6258' }}
                        >
                          {task}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── CateringSection ───────────────────────────────── */}
        {plan?.catering && (
          <section className="space-y-4">
            <SectionHeading>Catering</SectionHeading>
            <div
              className="rounded-lg border p-6 space-y-4"
              style={{
                background: '#111009',
                borderColor: '#2a2520',
                borderLeft: '2px solid #c9975b',
              }}
            >
              <div className="space-y-1">
                <p
                  className="text-xs tracking-widest uppercase"
                  style={{ color: '#6b6258' }}
                >
                  Approccio
                </p>
                <p
                  className="text-sm leading-relaxed"
                  style={{ color: '#f0ebe3' }}
                >
                  {plan.catering.approach}
                </p>
              </div>
              <div className="space-y-1">
                <p
                  className="text-xs tracking-widest uppercase"
                  style={{ color: '#6b6258' }}
                >
                  Concept menù
                </p>
                <p
                  className="text-sm leading-relaxed"
                  style={{ color: '#9a8f86' }}
                >
                  {plan.catering.menuConcept}
                </p>
              </div>
            </div>
          </section>
        )}

        {/* ── AlertsSection ─────────────────────────────────── */}
        {plan?.alerts && plan.alerts.length > 0 && (
          <section className="space-y-4">
            <SectionHeading>Avvisi</SectionHeading>
            <div className="space-y-3">
              {plan.alerts.map((alert, i) => (
                <AlertCard key={i} alert={alert} />
              ))}
            </div>
          </section>
        )}

        {/* ── Logistics ─────────────────────────────────────── */}
        {plan?.logistics &&
          (plan.logistics.transportation.length > 0 ||
            plan.logistics.accommodation.length > 0) && (
            <section className="space-y-4">
              <SectionHeading>Logistica</SectionHeading>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {plan.logistics.transportation.length > 0 && (
                  <div
                    className="rounded-lg border p-5 space-y-3"
                    style={{ background: '#111009', borderColor: '#2a2520' }}
                  >
                    <p
                      className="text-xs tracking-widest uppercase"
                      style={{ color: '#6b6258' }}
                    >
                      Trasporti
                    </p>
                    <ul className="space-y-2">
                      {plan.logistics.transportation.map((tip, i) => (
                        <li key={i} className="flex gap-3">
                          <span style={{ color: '#c9975b', flexShrink: 0 }}>
                            —
                          </span>
                          <span
                            className="text-sm leading-relaxed"
                            style={{ color: '#9a8f86' }}
                          >
                            {tip}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {plan.logistics.accommodation.length > 0 && (
                  <div
                    className="rounded-lg border p-5 space-y-3"
                    style={{ background: '#111009', borderColor: '#2a2520' }}
                  >
                    <p
                      className="text-xs tracking-widest uppercase"
                      style={{ color: '#6b6258' }}
                    >
                      Alloggio
                    </p>
                    <ul className="space-y-2">
                      {plan.logistics.accommodation.map((tip, i) => (
                        <li key={i} className="flex gap-3">
                          <span style={{ color: '#c9975b', flexShrink: 0 }}>
                            —
                          </span>
                          <span
                            className="text-sm leading-relaxed"
                            style={{ color: '#9a8f86' }}
                          >
                            {tip}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </section>
          )}

        {/* ── Suppliers by category ─────────────────────────── */}
        {Object.entries(grouped).map(([category, catSuppliers]) => (
          <section key={category} className="space-y-4">
            <div
              className="flex items-center gap-4 border-b pb-3"
              style={{ borderColor: '#2a2520' }}
            >
              <h2
                className="font-serif"
                style={{ fontSize: '1.25rem', color: '#f0ebe3' }}
              >
                {capitalize(category)}
              </h2>
              <span
                className="text-xs tracking-widest uppercase"
                style={{ color: '#4a4540' }}
              >
                {catSuppliers.length} opzioni
              </span>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {catSuppliers.map((supplier) => (
                <SupplierCard
                  key={supplier.id}
                  supplier={supplier}
                  eventId={ev.id}
                />
              ))}
            </div>
          </section>
        ))}
      </main>

      {/* ── FloatingActionBar ─────────────────────────────── */}
      <FloatingActionBar planUrl={planUrl} />
    </div>
  );
}
