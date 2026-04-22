'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { useOnboardingStore } from '@/lib/store'
import StepButton from '@/components/ui/StepButton'
import { Calendar, Clock } from 'lucide-react'

export default function StepDate() {
  const { data, updateData, nextStep } = useOnboardingStore()
  const [undecided, setUndecided] = useState(false)

  const handleUndecided = () => {
    setUndecided(true)
    updateData({ eventDate: null })
    setTimeout(() => nextStep(), 400)
  }

  return (
    <div className="space-y-4">
      {/* Date picker */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-5 rounded-2xl glass border border-white/8"
      >
        <div className="flex items-center gap-2 mb-4 text-white/50">
          <Calendar size={16} />
          <span className="text-sm">Select a date</span>
        </div>
        <input
          type="date"
          value={data.eventDate || ''}
          min={new Date().toISOString().split('T')[0]}
          onChange={(e) => updateData({ eventDate: e.target.value })}
          className="w-full bg-transparent text-white text-xl font-semibold focus:outline-none cursor-pointer"
          style={{ colorScheme: 'dark' }}
        />
      </motion.div>

      {/* Upcoming seasons quick picks */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: '🌸 Spring', date: '2026-05-15' },
          { label: '☀️ Summer', date: '2026-07-20' },
          { label: '🍂 Autumn', date: '2026-10-11' },
        ].map((s) => (
          <motion.button
            key={s.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => updateData({ eventDate: s.date })}
            className={`py-3 px-2 rounded-xl text-xs font-medium transition-all border ${
              data.eventDate === s.date
                ? 'border-rose-500 bg-rose-500/15 text-white'
                : 'border-white/8 bg-white/[0.03] text-white/60 hover:border-white/20'
            }`}
          >
            {s.label}
          </motion.button>
        ))}
      </div>

      {/* Not decided yet */}
      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        onClick={handleUndecided}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-white/40 text-sm hover:text-white/70 transition-colors"
      >
        <Clock size={14} />
        I haven&apos;t decided on a date yet
      </motion.button>

      <StepButton
        onClick={nextStep}
        disabled={!data.eventDate && !undecided}
      />
    </div>
  )
}
