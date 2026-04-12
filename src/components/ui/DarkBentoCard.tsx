import { cn } from '@/lib/utils';

interface DarkBentoCardProps {
  children: React.ReactNode;
  className?: string;
  /**
   * Accent color rendered as a 2px left border stripe — editorial, not glowy.
   * Visually anchors the card's semantic meaning.
   */
  accent?: 'gold' | 'warning' | 'danger' | 'muted' | 'none';
  /** Rende la card cliccabile con hover lift */
  interactive?: boolean;
  onClick?: () => void;
}

// Single 2px left-border accent — one separator method only (border)
const accentStripe: Record<
  NonNullable<DarkBentoCardProps['accent']>,
  string
> = {
  gold: 'border-l-[2px] border-l-[#c9975b]',
  warning: 'border-l-[2px] border-l-[#c27a3a]',
  danger: 'border-l-[2px] border-l-[#b5505a]',
  muted: 'border-l-[2px] border-l-[#2a2520]',
  none: '',
};

export function DarkBentoCard({
  children,
  className,
  accent = 'none',
  interactive = false,
  onClick,
}: DarkBentoCardProps) {
  const Tag = interactive ? 'button' : 'div';

  return (
    <Tag
      onClick={onClick}
      className={cn(
        // Base — warm surface, single border separator, committed radius
        'rounded-[8px] overflow-hidden',
        'bg-[#141210]',
        'border border-[#2a2520]',
        // Accent left stripe
        accentStripe[accent],
        // Interactive states — border shift only, no shadow stack
        interactive &&
          'cursor-pointer transition-colors duration-200 ease-out hover:border-[#3d342b] active:border-[#2a2520]',
        // Focus ring accessibile
        interactive &&
          'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#c9975b]/60',
        className
      )}
    >
      {children}
    </Tag>
  );
}
