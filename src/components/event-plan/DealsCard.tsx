import type { LinkOption, DealSource } from '@/types/deals.types';

const SOURCE_BADGE: Record<
  DealSource,
  { label: string; color: string; bg: string; border: string }
> = {
  booking: {
    label: 'Booking.com',
    color: '#60a5fa',
    bg: '#0a1628',
    border: '#1e3a5f',
  },
  amazon: {
    label: 'Amazon',
    color: '#fb923c',
    bg: '#1a0f05',
    border: '#5a2f10',
  },
  google_maps: {
    label: 'Google Maps',
    color: '#4ade80',
    bg: '#061a0e',
    border: '#145a2a',
  },
};

interface DealsCardProps {
  title: string;
  deals: LinkOption[];
}

export function DealsCard({ title, deals }: DealsCardProps) {
  if (deals.length === 0) return null;

  const hasAffiliate = deals.some(
    (d) => d.source === 'booking' || d.source === 'amazon'
  );

  return (
    <div
      className="rounded-lg border p-5 space-y-3 mt-4"
      style={{ background: '#0e0d0b', borderColor: '#2a2520' }}
    >
      <p
        className="text-xs tracking-widest uppercase"
        style={{ color: '#6b6258' }}
      >
        {title}
      </p>

      <ul className="space-y-2">
        {deals.map((link, i) => {
          const badge = SOURCE_BADGE[link.source];
          return (
            <li
              key={link.url}
              className="flex items-center justify-between gap-3"
            >
              <a
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm leading-relaxed hover:underline"
                style={{ color: '#c9975b' }}
              >
                {link.label}
              </a>
              <span
                className="shrink-0 text-xs px-2 py-0.5 rounded-full"
                style={{
                  color: badge.color,
                  background: badge.bg,
                  border: `1px solid ${badge.border}`,
                }}
              >
                {badge.label}
              </span>
            </li>
          );
        })}
      </ul>

      {hasAffiliate && (
        <p className="text-xs" style={{ color: '#4a4540' }}>
          🔗 Affiliate link — Fentsi may earn a commission at no extra cost to
          you.
        </p>
      )}
    </div>
  );
}
