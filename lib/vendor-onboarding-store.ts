import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// ── Category definitions ──────────────────────────────────────────────────────

export const VENDOR_CATEGORIES = [
  { id: 'venue',           label: 'Venue / Location',  emoji: '🏛️' },
  { id: 'catering',        label: 'Catering',           emoji: '🍽️' },
  { id: 'photography',     label: 'Photography',        emoji: '📸' },
  { id: 'videography',     label: 'Videography',        emoji: '🎬' },
  { id: 'dj_music',        label: 'DJ & Music',         emoji: '🎵' },
  { id: 'flowers_decor',   label: 'Flowers & Decor',    emoji: '💐' },
  { id: 'wedding_cake',    label: 'Wedding Cake',       emoji: '🎂' },
  { id: 'wedding_planner', label: 'Wedding Planner',    emoji: '📋' },
  { id: 'transport',       label: 'Transport',          emoji: '🚗' },
  { id: 'entertainment',   label: 'Entertainment',      emoji: '🎭' },
  { id: 'lighting',        label: 'Lighting',           emoji: '💡' },
  { id: 'hair_makeup',     label: 'Hair & Makeup',      emoji: '💄' },
] as const

export type VendorCategoryId = (typeof VENDOR_CATEGORIES)[number]['id']

// ── Data shape ────────────────────────────────────────────────────────────────

export interface VendorOnboardingData {
  // Step 0 – Profile
  businessName:  string
  businessPhone: string
  businessEmail: string
  website:       string
  instagram:     string

  // Step 1 – Categories
  categories: VendorCategoryId[]

  // Step 2 – Showcase (cover image File is held in component state only)
  bio:                string
  basePrice:          number | null
  locationCity:       string
  coverImagePreview:  string | null   // object URL or data URL for preview
}

// ── Store interface ───────────────────────────────────────────────────────────

interface VendorOnboardingStore {
  step:         number
  data:         VendorOnboardingData
  isSubmitting: boolean

  setStep:       (step: number) => void
  nextStep:      () => void
  prevStep:      () => void
  updateData:    (updates: Partial<VendorOnboardingData>) => void
  setSubmitting: (v: boolean) => void
  reset:         () => void
}

// ── Initial state ─────────────────────────────────────────────────────────────

const initialData: VendorOnboardingData = {
  businessName:  '',
  businessPhone: '',
  businessEmail: '',
  website:       '',
  instagram:     '',
  categories:    [],
  bio:           '',
  basePrice:     null,
  locationCity:  '',
  coverImagePreview: null,
}

// ── Store ─────────────────────────────────────────────────────────────────────

export const useVendorOnboardingStore = create<VendorOnboardingStore>()(
  persist(
    (set) => ({
      step:         0,
      data:         initialData,
      isSubmitting: false,

      setStep:      (step) => set({ step }),
      nextStep:     () => set((s) => ({ step: Math.min(s.step + 1, 2) })),
      prevStep:     () => set((s) => ({ step: Math.max(s.step - 1, 0) })),
      updateData:   (updates) => set((s) => ({ data: { ...s.data, ...updates } })),
      setSubmitting:(v) => set({ isSubmitting: v }),
      reset:        () => set({ step: 0, data: initialData, isSubmitting: false }),
    }),
    {
      name: 'fentsi-vendor-onboarding',
      // Don't persist isSubmitting; also note that File objects can't be
      // serialised — only coverImagePreview (string) is persisted.
      partialize: (state) => ({
        step: state.step,
        data: state.data,
      }),
    }
  )
)
