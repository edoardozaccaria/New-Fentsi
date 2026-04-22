'use client'

import { motion } from 'framer-motion'
import { useOnboardingStore } from '@/lib/store'
import { EventService } from '@/types/event'
import StepButton from '@/components/ui/StepButton'

const SERVICES: { type: EventService; label: string; emoji: string }[] = [
  { type: 'catering', label: 'Catering', emoji: '🍽️' },
  { type: 'photography', label: 'Photography', emoji: '📸' },
  { type: 'video', label: 'Videography', emoji: '🎬' },
  { type: 'dj_music', label: 'DJ / Live Music', emoji: '🎵' },
  { type: 'flowers_decor', label: 'Flowers & Décor', emoji: '💐' },
  { type: 'wedding_cake', label: 'Wedding Cake', emoji: '🎂' },
  { type: 'wedding_planner', label: 'Event Planner', emoji: '📋' },
  { type: 'transport', label: 'Transport', emoji: '🚗' },
  { type: 'entertainment', label: 'Entertainment', emoji: '🎭' },
  { type: 'lighting', label: 'Lighting Design', emoji: '💡' },
]

export default function StepServices() {
  const { data, updateData, nextStep } = useOnboardingStore()

  const toggle = (s: EventService) => {
    const current = data.services
    if (current.includes(s)) {
      updateData({ services: current.filter((x) => x !== s) })
    } else {
      updateData({ services: [...current, s] })
    }
  }

  return (
    <div className="space-y-4">
      <div className="text-xs text-white/30 text-center mb-2">
        Select all the services you need
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        {SERVICES.map((s, i) => {
          const selected = data.services.includes(s.type)
          return (
            <motion.button
              key={s.type}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.04 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => toggle(s.type)}
              className={`flex items-center gap-3 p-4 rounded-2xl text-left transition-all border-2 ${
                selected
                  ? 'border-rose-500 bg-rose-500/10'
                  : 'border-white/8 bg-white/[0.03] hover:border-white/20'
              }`}
            >
              <span className="text-xl">{s.emoji}</span>
              <span className={`font-medium text-sm ${selected ? 'text-white' : 'text-white/70'}`}>
                {s.label}
              </span>
              {selected && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="ml-auto w-5 h-5 rounded-full bg-rose-500 flex-shrink-0"
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

      {data.services.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center text-xs text-rose-400/70"
        >
          {data.services.length} service{data.services.length !== 1 ? 's' : ''} selected
        </motion.div>
      )}

      <StepButton onClick={nextStep} disabled={data.services.length === 0} />
    </div>
  )
}
