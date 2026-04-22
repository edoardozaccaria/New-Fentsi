"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

import { MIN_BUDGET, getRemainingBudgetPercent, updateAllocations } from "@/lib/wizard/budget";
import { guestTiers, getGuestTierById } from "@/lib/data/guest-tiers";
import { wizardSteps } from "@/lib/wizard/steps";
import type { AllocationCategory, EventTypePreset, PlanDraft } from "@/types/plans";

const defaultAllocations: Record<AllocationCategory, number> = {
  venue: 30,
  catering: 30,
  decor: 15,
  entertainment: 10,
  av: 5,
  photo_video: 5,
  misc: 5,
};

const createEmptyDraft = (): PlanDraft => ({
  id: undefined,
  eventTypeId: undefined,
  guestTierId: undefined,
  totalBudget: undefined,
  autoRebalance: true,
  allocations: { ...defaultAllocations },
  choices: {},
  brief: {
    description: "",
    assets: [],
  },
  consent: false,
  locale: "it",
  lastStepCompleted: 1,
});

type PlanWizardState = {
  currentStep: number;
  draft: PlanDraft;
  eventTypes: EventTypePreset[];
  setEventTypes: (eventTypes: EventTypePreset[]) => void;
  setLocale: (locale: "it" | "en") => void;
  setPlanId: (id: string) => void;
  setEventType: (eventTypeId: string) => void;
  setGuestTier: (guestTierId: string) => void;
  setBudget: (amount: number) => void;
  setAllocation: (category: AllocationCategory, percent: number) => void;
  toggleAutoRebalance: (value: boolean) => void;
  updateChoices: (changes: Partial<PlanDraft["choices"]>) => void;
  updateBrief: (changes: Partial<PlanDraft["brief"]>) => void;
  setConsent: (value: boolean) => void;
  goToStep: (step: number) => void;
  nextStep: () => void;
  prevStep: () => void;
  reset: () => void;
};

const fallbackStorage = {
  getItem: () => null,
  setItem: () => undefined,
  removeItem: () => undefined,
  clear: () => undefined,
  key: () => null,
  get length() {
    return 0;
  },
} as Storage;

const storage = createJSONStorage<PlanWizardState>(() =>
  typeof window === "undefined" ? fallbackStorage : window.sessionStorage,
);

export const usePlanWizard = create<PlanWizardState>()(
  persist(
    (set, get) => ({
      currentStep: 1,
      draft: createEmptyDraft(),
      eventTypes: [],
      setEventTypes: (eventTypes) =>
        set((state) => {
          const currentEvent = eventTypes.find((event) => event.id === state.draft.eventTypeId);
          const allowedGuestTier =
            currentEvent && state.draft.guestTierId && currentEvent.guestTiers.includes(state.draft.guestTierId)
              ? state.draft.guestTierId
              : undefined;

          return {
            eventTypes,
            draft: {
              ...state.draft,
              eventTypeId: currentEvent ? currentEvent.id : undefined,
              guestTierId: allowedGuestTier,
            },
          };
        }),
      setLocale: (locale) =>
        set((state) => ({ draft: { ...state.draft, locale } })),
      setPlanId: (id) =>
        set((state) => ({ draft: { ...state.draft, id } })),
      setEventType: (eventTypeId) =>
        set((state) => {
          const event = state.eventTypes.find((item) => item.id === eventTypeId);
          const allowed = event?.guestTiers ?? [];
          const currentTier = state.draft.guestTierId;
          const nextGuestTier = currentTier && allowed.includes(currentTier) ? currentTier : undefined;
          return {
            draft: {
              ...state.draft,
              eventTypeId,
              guestTierId: nextGuestTier,
            },
          };
        }),
      setGuestTier: (guestTierId) =>
        set((state) => ({
          draft: {
            ...state.draft,
            guestTierId,
          },
        })),
      setBudget: (amount) =>
        set((state) => ({
          draft: {
            ...state.draft,
            totalBudget: Math.max(MIN_BUDGET, amount),
          },
        })),
      setAllocation: (category, percent) =>
        set((state) => ({
          draft: {
            ...state.draft,
            allocations: updateAllocations({
              allocations: state.draft.allocations,
              category,
              nextPercent: percent,
              autoRebalance: state.draft.autoRebalance,
            }),
          },
        })),
      toggleAutoRebalance: (value) =>
        set((state) => ({
          draft: {
            ...state.draft,
            autoRebalance: value,
          },
        })),
      updateChoices: (changes) =>
        set((state) => ({
          draft: {
            ...state.draft,
            choices: {
              ...state.draft.choices,
              ...changes,
            },
          },
        })),
      updateBrief: (changes) =>
        set((state) => ({
          draft: {
            ...state.draft,
            brief: {
              ...state.draft.brief,
              ...changes,
            },
          },
        })),
      setConsent: (value) =>
        set((state) => ({
          draft: { ...state.draft, consent: value },
        })),
      goToStep: (step) =>
        set(() => ({
          currentStep: Math.min(Math.max(step, 1), wizardSteps.length),
        })),
      nextStep: () => {
        const { currentStep, draft } = get();
        set({
          draft: {
            ...draft,
            lastStepCompleted: Math.max(draft.lastStepCompleted, currentStep),
          },
        });
        get().goToStep(currentStep + 1);
      },
      prevStep: () => {
        const { currentStep } = get();
        get().goToStep(currentStep - 1);
      },
      reset: () => set({ currentStep: 1, draft: createEmptyDraft() }),
    }),
    {
      name: "fentsi-plan-wizard",
      storage,
      partialize: (state) => ({ draft: state.draft }),
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        const remaining = getRemainingBudgetPercent(state.draft.allocations);
        if (remaining < 0) {
          state.draft.allocations = { ...defaultAllocations };
        }
      },
    },
  ),
);

export function getAvailableGuestTiers(eventTypeId?: string) {
  if (!eventTypeId) return guestTiers;
  const event = getEventTypeById(eventTypeId);
  if (!event) return guestTiers;
  return guestTiers.filter((tier) => event.guestTiers.includes(tier.id));
}

export function getBudgetPresets(eventTypeId?: string) {
  const event = eventTypeId ? getEventTypeById(eventTypeId) : undefined;
  return event?.budgetPresets ?? [];
}

export function getEventTypes() {
  return usePlanWizard.getState().eventTypes;
}

export function getEventTypeById(id: string) {
  return usePlanWizard.getState().eventTypes.find((event) => event.id === id);
}
