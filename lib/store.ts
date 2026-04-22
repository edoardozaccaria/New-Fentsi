import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { OnboardingData, EventPlan } from '@/types/event'

interface OnboardingStore {
  step: number
  data: OnboardingData
  plan: EventPlan | null
  isGenerating: boolean
  eventId: string | null
  /** Backend wizard submission ID (for async polling) */
  submissionId: string | null
  /** Backend plan ID (from completed submission) */
  planId: string | null

  setStep: (step: number) => void
  nextStep: () => void
  prevStep: () => void
  updateData: (updates: Partial<OnboardingData>) => void
  setPlan: (plan: EventPlan) => void
  setGenerating: (v: boolean) => void
  setEventId: (id: string) => void
  setSubmissionId: (id: string | null) => void
  setPlanId: (id: string | null) => void
  reset: () => void
}

const initialData: OnboardingData = {
  eventType: null,
  eventDate: null,
  guestsCount: 100,
  budget: 20000,
  locationType: null,
  locationDetails: '',
  styles: [],
  priorities: [],
  services: [],
  region: null,
  locationLat: null,
  locationLng: null,
  locationPlaceId: null,
  contactName: '',
  contactEmail: '',
  contactPhone: '',
}

export const useOnboardingStore = create<OnboardingStore>()(
  persist(
    (set) => ({
      step: 0,
      data: initialData,
      plan: null,
      isGenerating: false,
      eventId: null,
      submissionId: null,
      planId: null,

      setStep: (step) => set({ step }),
      nextStep: () => set((s) => ({ step: Math.min(s.step + 1, 9) })),
      prevStep: () => set((s) => ({ step: Math.max(s.step - 1, 0) })),
      updateData: (updates) => set((s) => ({ data: { ...s.data, ...updates } })),
      setPlan: (plan) => set({ plan }),
      setGenerating: (v) => set({ isGenerating: v }),
      setEventId: (id) => set({ eventId: id }),
      setSubmissionId: (id) => set({ submissionId: id }),
      setPlanId: (id) => set({ planId: id }),
      reset: () => set({ step: 0, data: initialData, plan: null, eventId: null, submissionId: null, planId: null, isGenerating: false }),
    }),
    {
      name: 'fentsi-onboarding',
      partialize: (state) => ({
        data: state.data,
        plan: state.plan,
        eventId: state.eventId,
        step: state.step,
      }),
    }
  )
)
