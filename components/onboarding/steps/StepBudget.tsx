'use client'

import { motion } from 'framer-motion'
import { useOnboardingStore } from '@/lib/store'
import StepButton from '@/components/ui/StepButton'
import { formatCurrency } from '@/lib/utils'
import { TrendingUp } from 'lucide-react'

const BUDGET_RANGES = [
  { label: 'Essential', min: 5000, max: 10000, emoji: '🌱' },
  { label: 'Classic', min: 10000, max: 25000, emoji: '✨' },
  { label: 'Premium', min: 25000, max: 50000, emoji: '💎' },
  { label: 'Luxury', min: 50000, max: 100000, emoji: '👑' },
]

const MAX_BUDGET = 100000
const MIN_BUDGET = 1000

export default function StepBudget() {
  const { data, updateData, nextStep } = useOnboardingStore()
  const budget = data.budget
  const perPerson = Math.round(budget / data.guestsCount)

  const handleChange = (val: number) => {
    updateData({ budget: Math.max(MIN_BUDGET, Math.min(MAX_BUDGET, val)) })
  }

  const getBudgetTier = () => {
    if (budget < 10000) return { label: 'Essential', color: 'text-green-400' }
    if (budget < 25000) return { label: 'Classic', color: 'text-blue-400' }
    if (budget < 50000) return { label: 'Premium', color: 'text-purple-400' }
    return { label: 'Luxury', color: 'text-amber-400' }
  }

  const tier = getBudgetTier()

  return (
    <div className="space-y-5">
      {/* Big budget display */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="p-8 rounded-2xl glass border border-white/8 text-center"
      >
        <motion.div
          key={budget}
          initial={{ y: -5, opacity: 0.5 }}
          animate={{ y: 0, opacity: 1 }}
          className="text-5xl md:text-6xl font-bold gradient-text mb-1"
        >
          {formatCurrency(budget)}
        </motion.div>
        <div className={`text-sm font-medium mb-6 ${tier.color}`}>{tier.label}</div>

        {/* Slider */}
        <div className="px-2">
          <input
            type="range"
            min={MIN_BUDGET}
            max={MAX_BUDGET}
            step={500}
            value={budget}
            onChange={(e) => handleChange(Number(e.target.value))}
            className="w-full"
            style={{
              '--range-progress': `${((budget - MIN_BUDGET) / (MAX_BUDGET - MIN_BUDGET)) * 100}%`,
            } as React.CSSProperties}
          />
          <div className="flex justify-between text-xs text-white/30 mt-1">
            <span>€1,000</span>
            <span>€100,000</span>
          </div>
        </div>
      </motion.div>

      {/* Per person */}
      <div className="flex items-center gap-2 justify-center text-sm">
        <TrendingUp size={14} className="text-rose-400" />
        <span className="text-white/50">
          ~{formatCurrency(perPerson)} per person · {data.guestsCount} guests
        </span>
      </div>

      {/* Quick picks */}
      <div className="grid grid-cols-4 gap-2">
        {BUDGET_RANGES.map((r, i) => {
          const mid = Math.round((r.min + r.max) / 2)
          const selected = budget >= r.min && budget <= r.max
          return (
            <motion.button
              key={r.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleChange(mid)}
              className={`py-3 px-2 rounded-xl text-center text-xs transition-all border ${
                selected
                  ? 'border-rose-500 bg-rose-500/15'
                  : 'border-white/8 bg-white/[0.03] hover:border-white/20'
              }`}
            >
              <div className="text-base mb-1">{r.emoji}</div>
              <div className="font-semibold">{r.label}</div>
            </motion.button>
          )
        })}
      </div>

      <StepButton onClick={nextStep} />
    </div>
  )
}
