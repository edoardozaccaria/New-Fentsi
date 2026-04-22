'use client'

import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useOnboardingStore } from '@/lib/store'
import { LocationType } from '@/types/event'
import StepButton from '@/components/ui/StepButton'
import { MapPin, Lightbulb, Search } from 'lucide-react'

const OPTIONS: { type: LocationType; icon: React.ElementType; title: string; desc: string }[] = [
  {
    type: 'chosen',
    icon: MapPin,
    title: 'I already have a venue',
    desc: 'I know exactly where I want to celebrate',
  },
  {
    type: 'ideas',
    icon: Lightbulb,
    title: 'I have some ideas',
    desc: 'I have a vibe in mind but haven\'t chosen yet',
  },
  {
    type: 'help',
    icon: Search,
    title: 'Help me find one',
    desc: 'No idea yet — Fentsi will help me find the perfect venue',
  },
]

export default function StepLocation() {
  const { data, updateData, nextStep } = useOnboardingStore()

  const handleSelect = (type: LocationType) => {
    updateData({ locationType: type })
    if (type === 'help') setTimeout(() => nextStep(), 300)
  }

  return (
    <div className="space-y-4">
      {OPTIONS.map((opt, i) => {
        const selected = data.locationType === opt.type
        return (
          <motion.button
            key={opt.type}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.08 }}
            whileHover={{ x: 4 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => handleSelect(opt.type)}
            className={`w-full flex items-center gap-4 p-5 rounded-2xl text-left transition-all border-2 ${
              selected
                ? 'border-rose-500 bg-rose-500/10'
                : 'border-white/8 bg-white/[0.03] hover:border-white/20'
            }`}
          >
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                selected ? 'bg-rose-500/20' : 'bg-white/5'
              }`}
            >
              <opt.icon size={22} className={selected ? 'text-rose-400' : 'text-white/50'} />
            </div>
            <div>
              <div className="font-semibold text-sm mb-0.5">{opt.title}</div>
              <div className="text-xs text-white/40">{opt.desc}</div>
            </div>
            {selected && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="ml-auto w-6 h-6 rounded-full bg-rose-500 flex items-center justify-center flex-shrink-0"
              >
                <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                  <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </motion.div>
            )}
          </motion.button>
        )
      })}

      {/* Text input if has ideas or already chosen */}
      <AnimatePresence>
        {(data.locationType === 'chosen' || data.locationType === 'ideas') && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <input
              type="text"
              value={data.locationDetails}
              onChange={(e) => updateData({ locationDetails: e.target.value })}
              placeholder={
                data.locationType === 'chosen'
                  ? 'Venue name (e.g. Villa Belvedere, Tuscany)'
                  : 'Describe the atmosphere you\'re looking for…'
              }
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white placeholder-white/30 focus:outline-none focus:border-rose-500/50 transition-colors"
            />
          </motion.div>
        )}
      </AnimatePresence>

      {data.locationType && data.locationType !== 'help' && (
        <StepButton onClick={nextStep} disabled={!data.locationType} />
      )}
    </div>
  )
}
