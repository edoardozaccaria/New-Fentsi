'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { useOnboardingStore } from '@/lib/store'
import { EventType } from '@/types/event'
import { Heart, Cake, Star, Briefcase, Baby, GraduationCap, Sparkles } from 'lucide-react'

const EVENT_TYPES: { type: EventType; label: string; emoji: string; icon: React.ElementType; desc: string }[] = [
  { type: 'wedding', label: 'Wedding', emoji: '💍', icon: Heart, desc: 'The most beautiful day' },
  { type: 'birthday', label: 'Birthday', emoji: '🎂', icon: Cake, desc: 'Celebrate in style' },
  { type: 'anniversary', label: 'Anniversary', emoji: '✨', icon: Star, desc: 'A love worth celebrating' },
  { type: 'corporate', label: 'Corporate Event', emoji: '🏢', icon: Briefcase, desc: 'Team & business' },
  { type: 'christening', label: 'Christening', emoji: '🕊️', icon: Baby, desc: 'A new beginning' },
  { type: 'graduation', label: 'Graduation', emoji: '🎓', icon: GraduationCap, desc: 'A major milestone' },
  { type: 'other', label: 'Other event', emoji: '🎉', icon: Sparkles, desc: 'Make it your own' },
]

export default function StepEventType() {
  const { data, updateData, nextStep } = useOnboardingStore()

  const handleSelect = (type: EventType) => {
    updateData({ eventType: type })
    setTimeout(() => nextStep(), 300)
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      {EVENT_TYPES.map((item, i) => {
        const selected = data.eventType === item.type
        return (
          <motion.button
            key={item.type}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => handleSelect(item.type)}
            className={`relative p-5 rounded-2xl text-left transition-all border-2 ${
              selected
                ? 'border-rose-500 bg-rose-500/10'
                : 'border-white/8 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.06]'
            } ${item.type === 'other' ? 'col-span-2' : ''}`}
          >
            <div className="text-2xl mb-3">{item.emoji}</div>
            <div className="font-semibold text-sm mb-0.5">{item.label}</div>
            <div className="text-xs text-white/40">{item.desc}</div>
            {selected && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute top-3 right-3 w-5 h-5 rounded-full bg-rose-500 flex items-center justify-center"
              >
                <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                  <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </motion.div>
            )}
          </motion.button>
        )
      })}
    </div>
  )
}
