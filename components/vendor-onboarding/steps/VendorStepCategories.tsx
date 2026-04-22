'use client'

import { motion } from 'framer-motion'
import { useVendorOnboardingStore, VENDOR_CATEGORIES, VendorCategoryId } from '@/lib/vendor-onboarding-store'
import StepButton from '@/components/ui/StepButton'

export default function VendorStepCategories() {
  const { data, updateData, nextStep } = useVendorOnboardingStore()

  const toggle = (id: VendorCategoryId) => {
    const current = data.categories
    if (current.includes(id)) {
      updateData({ categories: current.filter((c) => c !== id) })
    } else {
      updateData({ categories: [...current, id] })
    }
  }

  return (
    <div className="space-y-4">
      <div className="text-xs text-white/30 text-center mb-2">
        {data.categories.length === 0
          ? 'Select at least one'
          : `${data.categories.length} selected`}
      </div>

      <div className="grid grid-cols-2 gap-3">
        {VENDOR_CATEGORIES.map((cat, i) => {
          const selected = data.categories.includes(cat.id)
          return (
            <motion.button
              key={cat.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => toggle(cat.id)}
              className={`relative p-4 rounded-2xl text-left transition-all border-2 ${
                selected
                  ? 'border-rose-500 bg-rose-500/10'
                  : 'border-white/8 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.06]'
              }`}
            >
              <div className="text-xl mb-2">{cat.emoji}</div>
              <div className="font-semibold text-sm leading-tight">{cat.label}</div>

              {selected && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute top-3 right-3 w-5 h-5 rounded-full bg-rose-500 flex items-center justify-center"
                >
                  <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                    <path
                      d="M1 4L3.5 6.5L9 1"
                      stroke="white"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </motion.div>
              )}
            </motion.button>
          )
        })}
      </div>

      <StepButton onClick={nextStep} disabled={data.categories.length === 0}>
        Continue
      </StepButton>
    </div>
  )
}
