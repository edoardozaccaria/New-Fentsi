import { PackageSearch } from 'lucide-react';
import { DarkBentoCard } from './DarkBentoCard';
import { cn } from '@/lib/utils';

interface EmptyVendorStateProps {
  /** Testo principale dello stato vuoto */
  title?: string;
  /** Descrizione secondaria */
  description?: string;
  /** Azione opzionale (es. CTA button) */
  action?: React.ReactNode;
  className?: string;
}

export function EmptyVendorState({
  title = 'Nessun fornitore',
  description = 'Aggiungi il tuo primo fornitore per iniziare a tracciare le spese.',
  action,
  className,
}: EmptyVendorStateProps) {
  return (
    <DarkBentoCard className={cn('p-8', className)}>
      <div className="flex flex-col items-center justify-center text-center gap-4 py-4">
        {/* Icona — bordered box, no blur halo */}
        <div className="flex items-center justify-center w-12 h-12 rounded-[8px] bg-[#1c1915] border border-[#2a2520]">
          <PackageSearch
            size={22}
            className="text-[#c9975b]"
            strokeWidth={1.5}
          />
        </div>

        {/* Testi */}
        <div className="flex flex-col gap-1.5">
          <p className="text-sm font-medium text-[#f0ebe3] leading-snug">
            {title}
          </p>
          <p className="text-xs text-[#6b6258] leading-relaxed max-w-[220px]">
            {description}
          </p>
        </div>

        {/* CTA opzionale */}
        {action && <div className="mt-1">{action}</div>}
      </div>
    </DarkBentoCard>
  );
}
