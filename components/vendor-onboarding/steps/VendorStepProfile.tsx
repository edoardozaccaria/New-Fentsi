'use client'

import { motion } from 'framer-motion'
import { Building2, Phone, Mail, Globe, Instagram } from 'lucide-react'
import { useVendorOnboardingStore } from '@/lib/vendor-onboarding-store'
import StepButton from '@/components/ui/StepButton'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export default function VendorStepProfile() {
  const { data, updateData, nextStep } = useVendorOnboardingStore()

  const canContinue =
    data.businessName.trim().length > 0 &&
    EMAIL_REGEX.test(data.businessEmail.trim())

  const fields = [
    {
      key:         'businessName' as const,
      icon:        Building2,
      placeholder: 'Business name',
      type:        'text',
      required:    true,
    },
    {
      key:         'businessEmail' as const,
      icon:        Mail,
      placeholder: 'Business email',
      type:        'email',
      required:    true,
    },
    {
      key:         'businessPhone' as const,
      icon:        Phone,
      placeholder: 'Phone number (optional)',
      type:        'tel',
      required:    false,
    },
    {
      key:         'website' as const,
      icon:        Globe,
      placeholder: 'Website URL (optional)',
      type:        'url',
      required:    false,
    },
    {
      key:         'instagram' as const,
      icon:        Instagram,
      placeholder: '@instagram_handle (optional)',
      type:        'text',
      required:    false,
    },
  ]

  return (
    <div className="space-y-4">
      {fields.map((f, i) => (
        <motion.div
          key={f.key}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.07 }}
        >
          <div className="relative">
            <f.icon
              size={16}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30"
            />
            <input
              type={f.type}
              value={data[f.key]}
              onChange={(e) => updateData({ [f.key]: e.target.value })}
              placeholder={f.placeholder}
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-4 pl-11 text-white placeholder-white/30 focus:outline-none focus:border-rose-500/50 transition-colors"
            />
          </div>
        </motion.div>
      ))}

      <StepButton onClick={nextStep} disabled={!canContinue}>
        Continue
      </StepButton>
    </div>
  )
}
