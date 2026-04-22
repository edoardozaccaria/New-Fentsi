'use client'

import { motion } from 'framer-motion'
import { useOnboardingStore } from '@/lib/store'
import StepButton from '@/components/ui/StepButton'
import { Users } from 'lucide-react'

const QUICK_PICKS = [
  { label: 'Intimate', count: 20, desc: '< 30 guests' },
  { label: 'Small', count: 50, desc: '30–80 guests' },
  { label: 'Medium', count: 100, desc: '80–150 guests' },
  { label: 'Large', count: 200, desc: '150–300 guests' },
]

export default function StepGuests() {
  const { data, updateData, nextStep } = useOnboardingStore()
  const guests = data.guestsCount

  const updateGuests = (val: number) => updateData({ guestsCount: Math.max(1, Math.min(500, val)) })

  return (
    <div className="space-y-6">
      {/* Big number display */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center py-8 rounded-2xl glass border border-white/8"
      >
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={() => updateGuests(guests - 10)}
            className="w-12 h-12 rounded-full glass border border-white/15 text-2xl font-light hover:border-white/30 transition-colors active:scale-90"
          >
            −
          </button>
          <div>
            <motion.div
              key={guests}
              initial={{ scale: 1.2, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-6xl font-bold gradient-text"
            >
              {guests}
            </motion.div>
            <div className="text-white/40 text-sm mt-1">guests</div>
          </div>
          <button
            onClick={() => updateGuests(guests + 10)}
            className="w-12 h-12 rounded-full glass border border-white/15 text-2xl font-light hover:border-white/30 transition-colors active:scale-90"
          >
            +
          </button>
        </div>

        {/* Slider */}
        <div className="px-8 mt-6">
          <input
            type="range"
            min={1}
            max={500}
            value={guests}
            onChange={(e) => updateGuests(Number(e.target.value))}
            className="w-full"
            style={{ '--range-progress': `${(guests / 500) * 100}%` } as React.CSSProperties}
          />
          <div className="flex justify-between text-xs text-white/30 mt-1">
            <span>1</span>
            <span>500</span>
          </div>
        </div>
      </motion.div>

      {/* Quick picks */}
      <div className="grid grid-cols-4 gap-2">
        {QUICK_PICKS.map((p, i) => (
          <motion.button
            key={p.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => updateGuests(p.count)}
            className={`py-3 px-2 rounded-xl text-center text-xs transition-all border ${
              guests === p.count
                ? 'border-rose-500 bg-rose-500/15'
                : 'border-white/8 bg-white/[0.03] hover:border-white/20'
            }`}
          >
            <div className="font-semibold mb-0.5">{p.label}</div>
            <div className="text-white/40">{p.desc}</div>
          </motion.button>
        ))}
      </div>

      {/* Cost estimate hint */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="flex items-center gap-2 text-xs text-white/30 justify-center"
      >
        <Users size={12} />
        <span>
          Typical catering: ~€{Math.round(guests * 80).toLocaleString('en-US')} – €
          {Math.round(guests * 150).toLocaleString('en-US')}
        </span>
      </motion.div>

      <StepButton onClick={nextStep} />
    </div>
  )
}
