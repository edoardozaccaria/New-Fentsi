import { createClient } from '@supabase/supabase-js';
import { notFound } from 'next/navigation';
import { InquiryDialog } from '@/components/event-plan/InquiryDialog';

// ---------------------------------------------------------------------------
// Types
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
  guest_count: number;
  city: string;
  budget_usd: number;
  required_services: string[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatUsd(n: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(n);
}

function capitalize(s: string) {
  return s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

// ---------------------------------------------------------------------------
// Server component — fetch from Supabase
// ---------------------------------------------------------------------------

export default async function EventPlanPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

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

  const typedEvent = event as EventRow;
  const typedSuppliers = (suppliers ?? []) as SupplierRow[];

  // Group suppliers by category
  const grouped: Record<string, SupplierRow[]> = {};
  for (const s of typedSuppliers) {
    if (!grouped[s.category]) grouped[s.category] = [];
    grouped[s.category]!.push(s);
  }

  return (
    <div className="min-h-screen" style={{ background: '#0b0a09' }}>
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
          New event
        </a>
      </nav>

      <main className="mx-auto max-w-3xl px-6 py-12 space-y-14">
        {/* Event header */}
        <section className="space-y-4">
          <p
            className="text-xs tracking-[0.2em] uppercase"
            style={{ color: '#6b6258' }}
          >
            Your event plan
          </p>
          <h1
            className="font-serif leading-tight"
            style={{ fontSize: 'clamp(2rem, 5vw, 3rem)', color: '#f0ebe3' }}
          >
            {capitalize(typedEvent.event_type)}
          </h1>

          <div className="flex flex-wrap gap-3">
            {[
              typedEvent.city,
              typedEvent.event_date
                ? new Date(
                    typedEvent.event_date + 'T00:00:00'
                  ).toLocaleDateString('en-US', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                  })
                : null,
              `${typedEvent.guest_count} guests`,
              formatUsd(typedEvent.budget_usd),
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

        {/* Suppliers by category */}
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
                {catSuppliers.length} options
              </span>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {catSuppliers.map((supplier) => (
                <SupplierCard
                  key={supplier.id}
                  supplier={supplier}
                  eventId={typedEvent.id}
                />
              ))}
            </div>
          </section>
        ))}
      </main>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Supplier card (server-rendered, client dialog)
// ---------------------------------------------------------------------------

function SupplierCard({
  supplier,
  eventId,
}: {
  supplier: SupplierRow;
  eventId: string;
}) {
  return (
    <div
      className="flex flex-col justify-between rounded-xl border p-5 space-y-4"
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
          {formatUsd(supplier.estimated_price_usd)}
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
