'use client'

import { motion } from 'framer-motion'
import { useOnboardingStore } from '@/lib/store'
import { EventPriority } from '@/types/event'
import StepButton from '@/components/ui/StepButton'

const PRIORITIES: { type: EventPriority; label: string; emoji: string; desc: string }[] = [
  { type: 'food_drinks', label: 'Food & Drinks', emoji: '🍽️', desc: 'Unforgettable menu' },
  { type: 'photography', label: 'Photography', emoji: '📸', desc: 'Memories forever' },
  { type: 'venue', label: 'WOW Venue', emoji: '🏛️', desc: 'The venue makes the event' },
  { type: 'music_entertainment', label: 'Music & Show', emoji: '🎵', desc: 'Dance floor packed' },
  { type: 'flowers_decor', label: 'Flowers & Décor', emoji: '💐', desc: 'Curated aesthetics' },
  { type: 'outfit_look', label: 'Outfit & Look', emoji: '👗', desc: 'First impressions count' },
  { type: 'honeymoon', label: 'Honeymoon', emoji: '✈️', desc: 'The trip of a lifetime' },
  { type: 'budget_savings', label: 'Budget Savings', emoji: '💰', desc: 'Optimise every euro' },
]

export default function StepPriorities() {
  const { data, updateData, nextStep } = useOnboardingStore()

  const togglePriority = (p: EventPriority) => {
    const current = data.priorities
    if (current.includes(p)) {
      updateData({ priorities: current.filter((x) => x !== p) })
    } else if (current.length < 3) {
      updateData({ priorities: [...current, p] })
    }
  }

  const getRank = (p: EventPriority) => {
    const idx = data.priorities.indexOf(p)
    return idx === -1 ? null : idx + 1
  }

  return (
    <div className="space-y-4">
      <div className="text-xs text-white/30 text-center mb-2">
        Choose your top 3 priorities · order = importance
      </div>

      <div className="grid grid-cols-2 gap-3">
        {PRIORITIES.map((p, i) => {
          const rank = getRank(p.type)
          const maxReached = data.priorities.length >= 3 && !rank
          return (
            <motion.button
              key={p.type}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              whileHover={{ scale: maxReached ? 1 : 1.02 }}
              whileTap={{ scale: maxReached ? 1 : 0.97 }}
              onClick={() => togglePriority(p.type)}
              disabled={maxReached}
              className={`relative p-4 rounded-2xl text-left transition-all border-2 ${
                rank
                  ? 'border-rose-500 bg-rose-500/10'
                  : maxReached
                  ? 'border-white/5 opacity-40 cursor-not-allowed'
                  : 'border-white/8 bg-white/[0.03] hover:border-white/20'
              }`}
            >
              {rank && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute top-3 right-3 w-6 h-6 rounded-full bg-gradient-to-br from-rose-500 to-orange-400 flex items-center justify-center text-xs font-bold"
                >
                  {rank}
                </motion.div>
              )}
              <div className="text-xl mb-2">{p.emoji}</div>
              <div className="font-semibold text-sm mb-0.5">{p.label}</div>
              <div className="text-xs text-white/40">{p.desc}</div>
            </motion.button>
          )
        })}
      </div>

      {data.priorities.length === 3 && (
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center text-xs text-white/30"
        >
          Perfect! Fentsi will optimise the budget based on these priorities
        </motion.div>
      )}

      <StepButton onClick={nextStep} disabled={data.priorities.length === 0} />
    </div>
  )
}
