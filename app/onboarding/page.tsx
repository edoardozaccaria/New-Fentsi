'use client'

import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { useOnboardingStore } from '@/lib/store'
import { Sparkles, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

// Step components
import StepEventType from '@/components/onboarding/steps/StepEventType'
import StepDate from '@/components/onboarding/steps/StepDate'
import StepGuests from '@/components/onboarding/steps/StepGuests'
import StepBudget from '@/components/onboarding/steps/StepBudget'
import StepLocation from '@/components/onboarding/steps/StepLocation'
import StepStyle from '@/components/onboarding/steps/StepStyle'
import StepPriorities from '@/components/onboarding/steps/StepPriorities'
import StepServices from '@/components/onboarding/steps/StepServices'
import StepRegion from '@/components/onboarding/steps/StepRegion'
import StepContact from '@/components/onboarding/steps/StepContact'

const STEP_TITLES = [
  'What type of event are you planning?',
  'When will it take place?',
  'How many guests will you invite?',
  'What is your budget?',
  'Do you already have a venue in mind?',
  'What atmosphere do you want to create?',
  'What matters most to you?',
  'Which services do you need?',
  'Where in the world will it be?',
  'Almost there! Where should I send your plan?',
]

const STEP_SUBTITLES = [
  "Let's start with the basics",
  'Helps us understand your timeline',
  'Affects catering and space requirements',
  'We optimise every euro',
  'We help you find the perfect one',
  'Style shapes the entire plan',
  'We allocate budget based on your priorities',
  'Select everything you need',
  'We find the best local vendors for you',
  'Your plan arrives in under 60 seconds',
]

const STEPS = [
  StepEventType,
  StepDate,
  StepGuests,
  StepBudget,
  StepLocation,
  StepStyle,
  StepPriorities,
  StepServices,
  StepRegion,
  StepContact,
]

export default function OnboardingPage() {
  const { step, data, prevStep, reset } = useOnboardingStore()
  const router = useRouter()
  const StepComponent = STEPS[step]
  const progress = ((step + 1) / STEPS.length) * 100

  // Only reset on first mount if no data has been entered yet
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!data.eventType) reset()
  }, [])

  return (
    <div className="min-h-screen bg-[#09090F] flex flex-col">
      {/* ─── Header ───────────────────────────────────────────────────────── */}
      <header className="flex items-center justify-between px-6 py-5 flex-shrink-0">
        <Link href="/" className="flex items-center gap-2 text-white/60 hover:text-white transition-colors">
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

      {/* ─── Step Content ─────────────────────────────────────────────────── */}
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

      {/* ─── Step dots ────────────────────────────────────────────────────── */}
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
