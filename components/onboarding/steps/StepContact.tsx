'use client'

import { useState, useRef } from 'react'
import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { useOnboardingStore } from '@/lib/store'
import { getMockPlan } from '@/lib/ai'
import { apiFetch, ApiError } from '@/lib/api-client'
import { getSupabase } from '@/lib/supabase'
import toast from 'react-hot-toast'
import StepButton from '@/components/ui/StepButton'
import { User, Mail, Phone, Lock, Sparkles, CheckCircle2 } from 'lucide-react'

// RFC 5322-inspired email regex — rejects "@", "a@", "@b.com"
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

// ── Map frontend wizard data → backend wizard/submit schema ──────────────────

const STYLE_MAP: Record<string, string> = {
  romantic: 'romantic',
  modern: 'modern',
  rustic: 'rustic',
  boho: 'bohemian',
  luxury: 'luxury',
  minimalist: 'minimalist',
  vintage: 'vintage',
  tropical: 'fun',
}

const PRIORITY_MAP: Record<string, string> = {
  food_drinks: 'catering',
  photography: 'photography',
  venue: 'venue',
  music_entertainment: 'music',
  flowers_decor: 'decor',
  outfit_look: 'experience',
  honeymoon: 'experience',
  budget_savings: 'budget_optimization',
}

const SERVICE_MAP: Record<string, string> = {
  catering: 'catering',
  photography: 'photographer',
  video: 'videographer',
  dj_music: 'dj',
  flowers_decor: 'florist',
  wedding_cake: 'cake',
  wedding_planner: 'mc',
  transport: 'transport',
  entertainment: 'live_music',
  lighting: 'lighting',
}

const EVENT_TYPE_MAP: Record<string, string> = {
  wedding: 'wedding',
  birthday: 'birthday',
  anniversary: 'anniversary',
  corporate: 'corporate',
  christening: 'other',
  graduation: 'graduation',
  other: 'other',
}

const VENUE_PREF_MAP: Record<string, string> = {
  chosen: 'both',
  ideas: 'both',
  help: 'surprise_me',
}

function buildWizardPayload(data: ReturnType<typeof useOnboardingStore.getState>['data']) {
  const mappedPriorities = [
    ...new Set(
      data.priorities
        .map((p) => PRIORITY_MAP[p])
        .filter(Boolean)
    ),
  ].slice(0, 3)

  const mappedServices = data.services
    .map((s) => SERVICE_MAP[s])
    .filter(Boolean)

  const extraParts: string[] = []
  if (data.contactPhone) extraParts.push(`Phone: ${data.contactPhone}`)
  if (data.locationDetails) extraParts.push(`Venue notes: ${data.locationDetails}`)

  return {
    event_type: EVENT_TYPE_MAP[data.eventType || 'other'] || 'other',
    event_date: data.eventDate || new Date(Date.now() + 180 * 86400000).toISOString().slice(0, 10),
    guest_count: data.guestsCount,
    budget_total: data.budget,
    location_city: data.region || 'Not specified',
    venue_preference: VENUE_PREF_MAP[data.locationType || 'help'] || 'surprise_me',
    aesthetic_style: data.styles.map((s) => STYLE_MAP[s] || s).slice(0, 3),
    top_priorities: mappedPriorities.length > 0 ? mappedPriorities : ['catering'],
    services_wanted: mappedServices.length > 0 ? mappedServices : ['catering'],
    extra_notes: extraParts.join('. ').slice(0, 300) || undefined,
  }
}

// ── Poll for async plan result ───────────────────────────────────────────────

async function pollForPlan(
  submissionId: string,
  signal: AbortSignal
): Promise<{ status: string; plan_id: string | null }> {
  const MAX_POLLS = 60 // 2 minutes max (2s intervals)
  for (let i = 0; i < MAX_POLLS; i++) {
    if (signal.aborted) throw new Error('Polling cancelled')

    const result = await apiFetch<{
      submission_id: string
      status: string
      plan_id: string | null
    }>(`/wizard/${submissionId}/status`)

    if (result.status === 'completed' && result.plan_id) {
      return result
    }
    if (result.status === 'failed') {
      throw new Error('Plan generation failed on the server')
    }

    // Wait 2 seconds before next poll
    await new Promise((resolve) => setTimeout(resolve, 2000))
  }
  throw new Error('Plan generation timed out')
}

export default function StepContact() {
  const {
    data, updateData, setPlan, setGenerating, isGenerating,
    setEventId, setSubmissionId, setPlanId,
  } = useOnboardingStore()
  const router = useRouter()
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [otpSent, setOtpSent] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  const validate = () => {
    const errs: Record<string, string> = {}
    if (!data.contactName.trim()) errs.name = 'Name is required'
    if (!EMAIL_REGEX.test(data.contactEmail.trim()))
      errs.email = 'Please enter a valid email address (e.g. you@example.com)'
    return errs
  }

  const handleSubmit = async () => {
    if (isGenerating) return
    const errs = validate()
    if (Object.keys(errs).length) {
      setErrors(errs)
      return
    }
    setErrors({})
    setGenerating(true)

    // ── Step 1: Send Magic Link via Supabase ─────────────────────────────────
    try {
      const supabase = getSupabase()
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email: data.contactEmail.trim(),
        options: {
          // Will redirect to /auth/callback after clicking the magic link
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          data: { full_name: data.contactName.trim() },
        },
      })
      if (otpError) {
        // Non-fatal: log but continue — plan generation still proceeds
        console.warn('[StepContact] OTP error:', otpError.message)
      } else {
        setOtpSent(true)
        toast.success('Magic link sent! Check your inbox.')
      }
    } catch (otpErr) {
      console.warn('[StepContact] OTP unexpected error:', otpErr)
    }

    // ── Step 2: Generate the event plan ─────────────────────────────────────
    // Cancel any previous polling
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    try {
      // Submit wizard data to the backend
      const payload = buildWizardPayload(data)
      const submission = await apiFetch<{
        submission_id: string
        status: string
      }>('/wizard/submit', {
        method: 'POST',
        body: payload,
      })

      setSubmissionId(submission.submission_id)
      toast.success('Plan generation started!')

      // Poll for completion
      const result = await pollForPlan(submission.submission_id, controller.signal)
      setPlanId(result.plan_id)

      // Navigate to dashboard with the plan ID
      router.push(`/dashboard?planId=${result.plan_id}`)
    } catch (err) {
      if (controller.signal.aborted) return

      // If backend is unavailable, fall back to local generation
      if (err instanceof ApiError) {
        toast.error(`Server error: ${err.message}`)
      }

      // Fallback to mock plan for development / when backend is down
      const mockPlan = getMockPlan(data)
      setPlan(mockPlan)
      toast.success('Plan created! (demo mode)')
      router.push('/dashboard')
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Magic link sent confirmation */}
      {otpSent && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-3"
        >
          <CheckCircle2 size={16} className="text-emerald-400 flex-shrink-0" />
          <p className="text-xs text-emerald-300">
            Magic link sent to <strong>{data.contactEmail}</strong> — check your inbox to save your plan.
          </p>
        </motion.div>
      )}

      {/* Teaser card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-4 rounded-2xl bg-gradient-to-br from-rose-500/15 to-orange-400/10 border border-rose-500/20 flex items-start gap-3"
      >
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-rose-500 to-orange-400 flex items-center justify-center flex-shrink-0">
          <Sparkles size={15} className="text-white" />
        </div>
        <div className="text-sm">
          <div className="font-semibold mb-0.5 text-white">Your plan is almost ready</div>
          <div className="text-white/50 text-xs">
            Optimised budget, selected vendors, complete timeline. I&apos;ll send it all via email.
          </div>
        </div>
      </motion.div>

      {/* Form fields */}
      <div className="space-y-3">
        {/* Name */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <div className="relative">
            <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" />
            <input
              type="text"
              value={data.contactName}
              onChange={(e) => updateData({ contactName: e.target.value })}
              placeholder="Your name"
              className={`w-full bg-white/5 border rounded-2xl px-4 py-4 pl-11 text-white placeholder-white/30 focus:outline-none transition-colors ${
                errors.name ? 'border-red-500/50' : 'border-white/10 focus:border-rose-500/50'
              }`}
            />
          </div>
          {errors.name && <p className="text-red-400 text-xs mt-1 ml-2">{errors.name}</p>}
        </motion.div>

        {/* Email */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <div className="relative">
            <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" />
            <input
              type="email"
              value={data.contactEmail}
              onChange={(e) => updateData({ contactEmail: e.target.value })}
              placeholder="Your email"
              className={`w-full bg-white/5 border rounded-2xl px-4 py-4 pl-11 text-white placeholder-white/30 focus:outline-none transition-colors ${
                errors.email ? 'border-red-500/50' : 'border-white/10 focus:border-rose-500/50'
              }`}
            />
          </div>
          {errors.email && <p className="text-red-400 text-xs mt-1 ml-2">{errors.email}</p>}
        </motion.div>

        {/* Phone (optional) */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <div className="relative">
            <Phone size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" />
            <input
              type="tel"
              value={data.contactPhone}
              onChange={(e) => updateData({ contactPhone: e.target.value })}
              placeholder="Phone (optional)"
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-4 pl-11 text-white placeholder-white/30 focus:outline-none focus:border-rose-500/50 transition-colors"
            />
          </div>
        </motion.div>
      </div>

      {/* Privacy note */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="flex items-start gap-2 text-xs text-white/25"
      >
        <Lock size={11} className="mt-0.5 flex-shrink-0" />
        <span>Your data is protected. We never share it with third parties.</span>
      </motion.div>

      <StepButton
        onClick={handleSubmit}
        disabled={!data.contactName || !data.contactEmail}
        loading={isGenerating}
      >
        Create my event plan
      </StepButton>
    </div>
  )
}
