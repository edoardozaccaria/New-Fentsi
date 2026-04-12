'use client';

import { motion } from 'framer-motion';

interface BudgetRingProps {
  percentage: number; // 0–100
  spent: number;
  total: number;
  currency?: string;
  size?: number; // diameter in px, default 120
}

const RADIUS = 44;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const STROKE_WIDTH = 10;

// Semantic arc colors — single solid tones, no gradient-on-gradient
const ARC_COLOR = {
  safe: '#c9975b', // amber gold
  warning: '#c27a3a', // deep amber
  danger: '#b5505a', // dusty rose-red
} as const;

const TEXT_COLOR = {
  safe: '#f0ebe3',
  warning: '#c27a3a',
  danger: '#b5505a',
} as const;

export function BudgetRing({
  percentage,
  spent,
  currency = '€',
  size = 120,
}: BudgetRingProps) {
  const clampedPct = Math.min(100, Math.max(0, percentage));
  const dashOffset = CIRCUMFERENCE * (1 - clampedPct / 100);

  const state =
    clampedPct >= 90 ? 'danger' : clampedPct >= 70 ? 'warning' : 'safe';
  const arcColor = ARC_COLOR[state];
  const textColor = TEXT_COLOR[state];

  return (
    <div
      className="relative flex flex-col items-center justify-center"
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        className="-rotate-90"
        aria-label={`Budget utilizzato: ${clampedPct.toFixed(0)}%`}
        role="img"
      >
        {/* Track — warm dark, not cool blue-black */}
        <circle
          cx="50"
          cy="50"
          r={RADIUS}
          fill="none"
          stroke="#2a2520"
          strokeWidth={STROKE_WIDTH}
          strokeLinecap="round"
        />

        {/* Progress arc — single semantic color, no gradient */}
        <motion.circle
          cx="50"
          cy="50"
          r={RADIUS}
          fill="none"
          stroke={arcColor}
          strokeWidth={STROKE_WIDTH}
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          initial={{ strokeDashoffset: CIRCUMFERENCE }}
          animate={{ strokeDashoffset: dashOffset }}
          transition={{ duration: 0.9, ease: 'easeOut' }}
        />
      </svg>

      {/* Center text — percentage is the protagonist */}
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5">
        <span
          className="tabular-nums leading-none font-serif"
          style={{ fontSize: size * 0.22, color: textColor }}
        >
          {clampedPct.toFixed(0)}%
        </span>
        <span
          className="tabular-nums leading-none"
          style={{ fontSize: size * 0.095, color: '#6b6258' }}
        >
          {currency}
          {spent.toLocaleString('it-IT')}
        </span>
      </div>
    </div>
  );
}
