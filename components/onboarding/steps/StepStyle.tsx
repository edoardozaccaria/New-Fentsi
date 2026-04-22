'use client'

import { motion } from 'framer-motion'
import { useOnboardingStore } from '@/lib/store'
import { EventStyle } from '@/types/event'
import StepButton from '@/components/ui/StepButton'

const STYLES: { type: EventStyle; label: string; emoji: string; desc: string; gradient: string }[] = [
  {
    type: 'romantic',
    label: 'Romantic',
    emoji: '🌹',
    desc: 'Roses, candles, dreamy atmosphere',
    gradient: 'from-pink-500/20 to-rose-500/10',
  },
  {
    type: 'modern',
    label: 'Modern Minimal',
    emoji: '⬜',
    desc: 'Clean lines, black & white, geometry',
    gradient: 'from-slate-500/20 to-zinc-500/10',
  },
  {
    type: 'rustic',
    label: 'Rustic',
    emoji: '🪵',
    desc: 'Wood, stone, countryside charm',
    gradient: 'from-amber-700/20 to-orange-700/10',
  },
  {
    type: 'boho',
    label: 'Bohemian',
    emoji: '🌿',
    desc: 'Dried flowers, macramé, free spirit',
    gradient: 'from-green-600/20 to-emerald-600/10',
  },
  {
    type: 'luxury',
    label: 'Luxury',
    emoji: '✦',
    desc: 'Gold, crystal, limitless elegance',
    gradient: 'from-amber-400/20 to-yellow-400/10',
  },
  {
    type: 'minimalist',
    label: 'Minimalist',
    emoji: '○',
    desc: 'Less is more. Discreet elegance',
    gradient: 'from-white/10 to-white/5',
  },
  {
    type: 'vintage',
    label: 'Vintage',
    emoji: '📷',
    desc: '50s–70s retro, nostalgic chic',
    gradient: 'from-amber-700/20 to-amber-800/10',
  },
  {
    type: 'tropical',
    label: 'Tropical',
    emoji: '🌴',
    desc: 'Vivid colours, lush leaves, eternal summer',
    gradient: 'from-teal-500/20 to-cyan-500/10',
  },
]

export default function StepStyle() {
  const { data, updateData, nextStep } = useOnboardingStore()

  const toggleStyle = (style: EventStyle) => {
    const current = data.styles
    if (current.includes(style)) {
      updateData({ styles: current.filter((s) => s !== style) })
    } else if (current.length < 3) {
      updateData({ styles: [...current, style] })
    }
  }

  return (
    <div className="space-y-4">
      <div className="text-xs text-white/30 text-center mb-2">
        Choose up to 3 styles · {data.styles.length}/3 selected
      </div>

      <div className="grid grid-cols-2 gap-3">
        {STYLES.map((s, i) => {
          const selected = data.styles.includes(s.type)
          const maxReached = data.styles.length >= 3 && !selected
          return (
            <motion.button
              key={s.type}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              whileHover={{ scale: maxReached ? 1 : 1.02 }}
              whileTap={{ scale: maxReached ? 1 : 0.97 }}
              onClick={() => toggleStyle(s.type)}
              disabled={maxReached}
              className={`relative p-4 rounded-2xl text-left transition-all border-2 overflow-hidden ${
                selected
                  ? 'border-rose-500 bg-rose-500/10'
                  : maxReached
                  ? 'border-white/5 opacity-40 cursor-not-allowed'
                  : 'border-white/8 bg-white/[0.03] hover:border-white/20'
              }`}
            >
              {selected && (
                <div className={`absolute inset-0 bg-gradient-to-br ${s.gradient} opacity-50`} />
              )}
              <div className="relative z-10">
                <div className="text-xl mb-2">{s.emoji}</div>
                <div className="font-semibold text-sm mb-0.5">{s.label}</div>
                <div className="text-xs text-white/40">{s.desc}</div>
              </div>
              {selected && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute top-3 right-3 w-5 h-5 rounded-full bg-rose-500"
                >
                  <svg viewBox="0 0 20 20" fill="none" className="w-full h-full p-1">
                    <path d="M4 10L8 14L16 6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </motion.div>
              )}
            </motion.button>
          )
        })}
      </div>

      <StepButton onClick={nextStep} disabled={data.styles.length === 0} />
    </div>
  )
}
