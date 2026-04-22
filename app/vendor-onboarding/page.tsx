'use client'

import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Sparkles } from 'lucide-react'
import Link from 'next/link'
import { useVendorOnboardingStore } from '@/lib/vendor-onboarding-store'

import VendorStepProfile    from '@/components/vendor-onboarding/steps/VendorStepProfile'
import VendorStepCategories from '@/components/vendor-onboarding/steps/VendorStepCategories'
import VendorStepShowcase   from '@/components/vendor-onboarding/steps/VendorStepShowcase'

// ── Step metadata ─────────────────────────────────────────────────────────────

const STEP_TITLES = [
  'Tell us about your business',
  'What services do you offer?',
  'Create your showcase',
]

const STEP_SUBTITLES = [
  'Appear in front of couples searching for vendors',
  'Select every category that applies',
  'Make a great first impression',
]

const STEPS = [VendorStepProfile, VendorStepCategories, VendorStepShowcase]

// ── Page ──────────────────────────────────────────────────────────────────────

export default function VendorOnboardingPage() {
  const { step, prevStep, reset } = useVendorOnboardingStore()
  const router = useRouter()

  const StepComponent = STEPS[step]
  const progress = ((step + 1) / STEPS.length) * 100

  // Reset store when the wizard is first visited so the user always starts fresh
  useEffect(() => {
    reset()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="min-h-screen bg-[#09090F] flex flex-col">

      {/* ─── Header ──────────────────────────────────────────────────────── */}
      <header className="flex items-center justify-between px-6 py-5 flex-shrink-0">
        <Link
          href="/"
          className="flex items-center gap-2 text-white/60 hover:text-white transition-colors"
        >
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-rose-500 to-orange-400 flex items-center justify-center">
            <Sparkles size={15} className="text-white" />
          </div>
          <span className="font-semibold text-sm">fentsi</span>
        </Link>

        {/* Progress bar */}
        <div className="flex-1 max-w-xs mx-8">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs text-white/30">
              {step + 1} of {STEPS.length}
            </span>
            <span className="text-xs text-white/30">{Math.round(progress)}%</span>
          </div>
          <div className="h-1 bg-white/10 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-rose-500 to-orange-400 rounded-full"
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.4, ease: 'easeInOut' }}
            />
          </div>
        </div>

        {step > 0 ? (
          <button
            onClick={prevStep}
            className="flex items-center gap-1.5 text-white/40 hover:text-white text-sm transition-colors"
          >
            <ArrowLeft size={16} />
            Back
          </button>
        ) : (
          <div className="w-20" />
        )}
      </header>

      {/* ─── Step Content ────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-8">
        <div className="w-full max-w-xl">

          {/* Step title */}
          <AnimatePresence mode="wait">
            <motion.div
              key={`title-${step}`}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.3 }}
              className="mb-8 text-center"
            >
              <p className="text-xs uppercase tracking-widest text-rose-400/80 font-medium mb-3">
                {STEP_SUBTITLES[step]}
              </p>
              <h2 className="text-2xl md:text-3xl font-bold text-white leading-snug">
                {STEP_TITLES[step]}
              </h2>
            </motion.div>
          </AnimatePresence>

          {/* Step component */}
          <AnimatePresence mode="wait">
            <motion.div
              key={`step-${step}`}
              initial={{ opacity: 0, x: 30, scale: 0.98 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: -30, scale: 0.98 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            >
              <StepComponent />
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* ─── Step dots ───────────────────────────────────────────────────── */}
      <div className="flex items-center justify-center gap-1.5 py-6">
        {STEPS.map((_, i) => (
          <div
            key={i}
            className={`rounded-full transition-all duration-300 ${
              i === step
                ? 'w-6 h-2 bg-rose-500'
                : i < step
                ? 'w-2 h-2 bg-white/30'
                : 'w-2 h-2 bg-white/10'
            }`}
          />
        ))}
      </div>
    </div>
  )
}
