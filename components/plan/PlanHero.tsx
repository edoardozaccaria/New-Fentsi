'use client'

import { motion } from 'framer-motion'
import { Users, MapPin, Calendar, Sparkles } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { EventPlan } from '@/types/event'

// ── Event type config ─────────────────────────────────────────────────────────
const EVENT_TYPE_LABELS: Record<string, string> = {
  wedding:     'Matrimonio',
  birthday:    'Compleanno',
  anniversary: 'Anniversario',
  corporate:   'Evento Aziendale',
  christening: 'Battesimo',
  graduation:  'Laurea',
  other:       'Evento',
}

const EVENT_ACCENT: Record<string, { from: string; glow: string }> = {
  wedding:     { from: 'from-rose-500/20 via-rose-800/10',    glow: '#f43f5e' },
  birthday:    { from: 'from-purple-600/20 via-purple-900/10', glow: '#9333ea' },
  anniversary: { from: 'from-amber-500/20 via-amber-800/10',  glow: '#f59e0b' },
  corporate:   { from: 'from-blue-500/20 via-blue-900/10',    glow: '#3b82f6' },
  christening: { from: 'from-cyan-500/20 via-cyan-900/10',    glow: '#06b6d4' },
  graduation:  { from: 'from-green-500/20 via-green-900/10',  glow: '#22c55e' },
  other:       { from: 'from-rose-500/20 via-rose-800/10',    glow: '#f43f5e' },
}

// ── SVG Circular Progress Ring ────────────────────────────────────────────────
function BudgetRing({ allocated, total }: { allocated: number; total: number }) {
  const r = 46
  const cx = 60
  const cy = 60
  const circumference = 2 * Math.PI * r
  const pct = total > 0 ? Math.min(allocated / total, 1) : 0
  const offset = circumference * (1 - pct)

  return (
    <div className="relative flex flex-col items-center gap-3">
      <div className="relative" style={{ width: 120, height: 120 }}>
        <svg width="120" height="120" viewBox="0 0 120 120" className="-rotate-90">
          {/* Track */}
          <circle
            cx={cx} cy={cy} r={r}
            fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8"
          />
          {/* Glow track */}
          <circle
            cx={cx} cy={cy} r={r}
            fill="none" stroke="rgba(244,63,94,0.08)" strokeWidth="14"
          />
          {/* Progress arc */}
          <motion.circle
            cx={cx} cy={cy} r={r}
            fill="none"
            stroke="url(#budgetGradient)"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1.6, ease: [0.25, 0.46, 0.45, 0.94], delay: 0.5 }}
          />
          <defs>
            <linearGradient id="budgetGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f43f5e" />
              <stop offset="100%" stopColor="#fb923c" />
            </linearGradient>
          </defs>
        </svg>

        {/* Center label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2 }}
            className="text-2xl font-bold text-white leading-none"
          >
            {Math.round(pct * 100)}%
          </motion.span>
          <span className="text-[10px] text-white/40 font-medium mt-0.5">allocato</span>
        </div>
      </div>

      {/* Budget label under ring */}
      <div className="text-center">
        <div className="text-sm font-bold text-white">{formatCurrency(total)}</div>
        <div className="text-[11px] text-white/35">budget totale</div>
      </div>
    </div>
  )
}

// ── Props ─────────────────────────────────────────────────────────────────────
export interface PlanHeroProps {
  plan: EventPlan
  eventType: string
  eventDate: string | null
  guestsCount: number
  totalBudget: number
  allocatedBudget: number
}

// ── Component ─────────────────────────────────────────────────────────────────
export function PlanHero({
  plan,
  eventType,
  eventDate,
  guestsCount,
  totalBudget,
  allocatedBudget,
}: PlanHeroProps) {
  const typeLabel  = EVENT_TYPE_LABELS[eventType] ?? 'Evento'
  const accent     = EVENT_ACCENT[eventType] ?? EVENT_ACCENT.other

  // Countdown
  const daysLeft = eventDate
    ? Math.ceil((new Date(eventDate).getTime() - Date.now()) / 86_400_000)
    : null

  const formattedDate = eventDate
    ? new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'long', year: 'numeric' }).format(
        new Date(eventDate)
      )
    : null

  return (
    <motion.div
      initial={{ opacity: 0, y: 28 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.65, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="relative rounded-3xl overflow-hidden mb-8"
    >
      {/* Layered backgrounds */}
      <div className={`absolute inset-0 bg-gradient-to-br ${accent.from} to-transparent`} />
      <div className="absolute inset-0 bg-[#111118]/75" />
      <div className="absolute inset-0 border border-white/8 rounded-3xl pointer-events-none" />

      {/* Ambient glows */}
      <div
        className="absolute -top-20 -right-20 w-80 h-80 rounded-full blur-3xl opacity-10"
        style={{ background: accent.glow }}
      />
      <div className="absolute -bottom-12 -left-12 w-56 h-56 rounded-full blur-3xl opacity-6 bg-orange-500" />

      {/* Content */}
      <div className="relative z-10 p-7 md:p-9">

        {/* Top bar: badge + countdown */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-7">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-rose-500 to-orange-400 flex items-center justify-center shadow-lg shadow-rose-500/25">
              <Sparkles size={13} className="text-white" />
            </div>
            <span className="text-xs font-bold uppercase tracking-widest text-rose-400/90">
              Piano {typeLabel}
            </span>
          </div>

          {daysLeft !== null && (
            <motion.div
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.45 }}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/7 border border-white/12 backdrop-blur-sm"
            >
              {daysLeft > 0 ? (
                <span className="text-xs text-white/70">
                  <span className="font-bold text-white text-sm">−{daysLeft}</span>{' '}
                  giorni al tuo {typeLabel}
                </span>
              ) : daysLeft === 0 ? (
                <span className="text-xs font-bold text-rose-400">Oggi è il grande giorno! 🎉</span>
              ) : (
                <span className="text-xs text-white/35">{typeLabel} concluso</span>
              )}
            </motion.div>
          )}
        </div>

        {/* Main row: text + budget ring */}
        <div className="flex flex-col md:flex-row md:items-start gap-8">

          {/* Left: title + summary + stats */}
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl md:text-[1.75rem] font-bold text-white leading-tight mb-2.5">
              {plan.title}
            </h1>
            <p className="text-white/50 text-sm leading-relaxed max-w-xl mb-7 line-clamp-2">
              {plan.summary}
            </p>

            {/* Stat chips */}
            <div className="flex flex-wrap gap-3">
              {guestsCount > 0 && (
                <StatChip icon={Users} label={`${guestsCount} ospiti`} />
              )}
              {formattedDate && (
                <StatChip icon={Calendar} label={formattedDate} />
              )}
              {plan.locationDisplay && (
                <StatChip icon={MapPin} label={plan.locationDisplay} truncate />
              )}
            </div>
          </div>

          {/* Right: budget ring */}
          <div className="flex-shrink-0 self-center md:self-start">
            <BudgetRing allocated={allocatedBudget} total={totalBudget} />
          </div>
        </div>
      </div>
    </motion.div>
  )
}

function StatChip({
  icon: Icon,
  label,
  truncate = false,
}: {
  icon: React.ElementType
  label: string
  truncate?: boolean
}) {
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/6 border border-white/8">
      <Icon size={13} className="text-rose-400 flex-shrink-0" />
      <span className={`text-sm font-medium text-white/80 ${truncate ? 'truncate max-w-[140px]' : ''}`}>
        {label}
      </span>
    </div>
  )
}
