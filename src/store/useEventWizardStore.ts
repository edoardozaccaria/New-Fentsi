// Event planning wizard store.
// Persisted to sessionStorage so draft survives page refreshes within the
// same browser tab but is discarded when the tab is closed.

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

import type {
  EventType,
  EventStyle,
  VenuePreference,
  RequiredService,
} from '@/types/plan.types';

// ---------------------------------------------------------------------------
// Wizard state shape
// ---------------------------------------------------------------------------

export interface EventWizardState {
  // Step 1
  eventType: EventType | null;
  // Step 2
  eventDate: string | null; // ISO date string "YYYY-MM-DD"
  // Step 3
  guestCount: number;
  // Step 4
  city: string;
  // Step 5
  venuePreference: VenuePreference | null;
  // Step 6
  budgetUsd: number;
  // Step 7
  stylePreferences: EventStyle[];
  // Step 8
  requiredServices: RequiredService[];
  // Step 9
  specialRequests: string;
  // Progress
  currentStep: number;
  lastStepCompleted: number;
}

export interface EventWizardActions {
  setEventType: (v: EventType) => void;
  setEventDate: (v: string) => void;
  setGuestCount: (v: number) => void;
  setCity: (v: string) => void;
  setVenuePreference: (v: VenuePreference) => void;
  setBudgetUsd: (v: number) => void;
  setStylePreferences: (v: EventStyle[]) => void;
  toggleStyle: (v: EventStyle) => void;
  setRequiredServices: (v: RequiredService[]) => void;
  toggleService: (v: RequiredService) => void;
  setSpecialRequests: (v: string) => void;
  goToStep: (step: number) => void;
  nextStep: () => void;
  prevStep: () => void;
  completeStep: (step: number) => void;
  reset: () => void;
}

export type EventWizardStore = EventWizardState & EventWizardActions;

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

const DEFAULT_STATE: EventWizardState = {
  eventType: null,
  eventDate: null,
  guestCount: 50,
  city: '',
  venuePreference: null,
  budgetUsd: 20000,
  stylePreferences: [],
  requiredServices: [],
  specialRequests: '',
  currentStep: 1,
  lastStepCompleted: 0,
};

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

const ssrSafeStorage = () => {
  if (typeof window === 'undefined') {
    return {
      getItem: () => null,
      setItem: () => undefined,
      removeItem: () => undefined,
    };
  }
  return window.sessionStorage;
};

export const useEventWizardStore = create<EventWizardStore>()(
  persist(
    (set, get) => ({
      ...DEFAULT_STATE,

      setEventType: (eventType) => set({ eventType }),
      setEventDate: (eventDate) => set({ eventDate }),
      setGuestCount: (guestCount) => set({ guestCount }),
      setCity: (city) => set({ city }),
      setVenuePreference: (venuePreference) => set({ venuePreference }),
      setBudgetUsd: (budgetUsd) => set({ budgetUsd }),

      setStylePreferences: (stylePreferences) => set({ stylePreferences }),
      toggleStyle: (style) => {
        const { stylePreferences } = get();
        set({
          stylePreferences: stylePreferences.includes(style)
            ? stylePreferences.filter((s) => s !== style)
            : [...stylePreferences, style],
        });
      },

      setRequiredServices: (requiredServices) => set({ requiredServices }),
      toggleService: (service) => {
        const { requiredServices } = get();
        set({
          requiredServices: requiredServices.includes(service)
            ? requiredServices.filter((s) => s !== service)
            : [...requiredServices, service],
        });
      },

      setSpecialRequests: (specialRequests) => set({ specialRequests }),

      goToStep: (step) => set({ currentStep: step }),
      nextStep: () =>
        set((s) => ({ currentStep: Math.min(10, s.currentStep + 1) })),
      prevStep: () =>
        set((s) => ({ currentStep: Math.max(1, s.currentStep - 1) })),
      completeStep: (step) =>
        set((s) => ({
          lastStepCompleted: Math.max(s.lastStepCompleted, step),
          currentStep: Math.min(10, step + 1),
        })),

      reset: () => set({ ...DEFAULT_STATE }),
    }),
    {
      name: 'fentsi-event-wizard',
      storage: createJSONStorage(ssrSafeStorage),
    }
  )
);
