'use client';

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import type { BudgetBreakdown } from '@/types/plan.types';

// ---------------------------------------------------------------------------
// Palette — warm editorial, one slice per category
// ---------------------------------------------------------------------------

const CATEGORY_COLORS: Record<string, string> = {
  catering: '#c9975b',
  venue: '#b5845a',
  photography: '#8f6b4a',
  video: '#7a5a3d',
  flowers_decor: '#d4a96a',
  music: '#a07848',
  transportation: '#6b5038',
  other: '#4a3828',
};

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
// Custom tooltip
// ---------------------------------------------------------------------------

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; payload: { pct: number } }>;
}) {
  if (!active || !payload?.length) return null;
  const item = payload[0]!;
  return (
    <div
      className="rounded-lg border px-4 py-3 text-sm"
      style={{
        background: '#1a1814',
        borderColor: '#2a2520',
        color: '#f0ebe3',
      }}
    >
      <p className="font-medium">{capitalize(item.name)}</p>
      <p style={{ color: '#c9975b' }}>{formatEur(item.value)}</p>
      <p style={{ color: '#6b6258' }}>{item.payload.pct}%</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface Props {
  breakdown: BudgetBreakdown;
  budgetEur: number;
}

export function BudgetPieChart({ breakdown, budgetEur }: Props) {
  const entries = Object.entries(breakdown)
    .filter(([k, v]) => k !== 'contingency_eur' && (v as number) > 0)
    .sort(([, a], [, b]) => (b as number) - (a as number));

  const total = entries.reduce((s, [, v]) => s + (v as number), 0);

  const data = entries.map(([key, value]) => ({
    name: key,
    value: value as number,
    pct: total > 0 ? Math.round(((value as number) / total) * 100) : 0,
  }));

  const totalWithContingency = total + breakdown.contingency_eur;
  const isOverBudget = totalWithContingency > budgetEur;

  return (
    <div className="space-y-6">
      {/* Pie chart */}
      <div style={{ height: 260 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={65}
              outerRadius={100}
              paddingAngle={2}
              dataKey="value"
            >
              {data.map((entry) => (
                <Cell
                  key={entry.name}
                  fill={CATEGORY_COLORS[entry.name] ?? '#3a3530'}
                  stroke="transparent"
                />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend
              formatter={(value) => (
                <span style={{ color: '#9a8f86', fontSize: 12 }}>
                  {capitalize(value)}
                </span>
              )}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Breakdown table */}
      <div className="space-y-0 divide-y" style={{ borderColor: '#1e1c1a' }}>
        {data.map((item) => (
          <div
            key={item.name}
            className="flex items-center justify-between gap-4 py-2.5"
            style={{ borderColor: '#1e1c1a' }}
          >
            <div className="flex items-center gap-3 min-w-0">
              <span
                className="shrink-0 rounded-full"
                style={{
                  width: 8,
                  height: 8,
                  background: CATEGORY_COLORS[item.name] ?? '#3a3530',
                }}
              />
              <span className="text-sm truncate" style={{ color: '#9a8f86' }}>
                {capitalize(item.name)}
              </span>
            </div>
            <div className="flex items-center gap-6 shrink-0">
              <span
                className="text-xs tabular-nums w-8 text-right"
                style={{ color: '#4a4540' }}
              >
                {item.pct}%
              </span>
              <span
                className="text-sm tabular-nums w-24 text-right"
                style={{ color: '#f0ebe3' }}
              >
                {formatEur(item.value)}
              </span>
            </div>
          </div>
        ))}

        {/* Contingency row */}
        <div
          className="flex items-center justify-between gap-4 py-2.5"
          style={{ borderColor: '#1e1c1a' }}
        >
          <div className="flex items-center gap-3">
            <span
              className="shrink-0 rounded-full"
              style={{ width: 8, height: 8, background: '#2a2520' }}
            />
            <span className="text-sm" style={{ color: '#6b6258' }}>
              Contingenza (10%)
            </span>
          </div>
          <span className="text-sm tabular-nums" style={{ color: '#c9975b' }}>
            {formatEur(breakdown.contingency_eur)}
          </span>
        </div>

        {/* Total row */}
        <div
          className="flex items-center justify-between gap-4 pt-4 pb-1"
          style={{ borderColor: '#2a2520', borderTopWidth: 1 }}
        >
          <span
            className="text-xs tracking-widest uppercase"
            style={{ color: '#6b6258' }}
          >
            Totale stimato
          </span>
          <div className="flex items-center gap-3">
            <span
              className="text-xs px-2 py-0.5 rounded-full"
              style={
                isOverBudget
                  ? { background: '#1a0d0f', color: '#b5505a' }
                  : { background: '#0f2010', color: '#6acc6a' }
              }
            >
              {isOverBudget ? 'Attenzione: supera budget' : 'Entro budget'}
            </span>
            <span
              className="text-sm font-medium tabular-nums"
              style={{ color: '#f0ebe3' }}
            >
              {formatEur(totalWithContingency)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
