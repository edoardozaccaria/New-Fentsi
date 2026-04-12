import { describe, it, expect, beforeEach } from 'vitest';
import { useEventWizardStore } from './useEventWizardStore';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getState() {
  return useEventWizardStore.getState();
}

function reset() {
  useEventWizardStore.getState().reset();
}

// ---------------------------------------------------------------------------
// Initial state
// ---------------------------------------------------------------------------

describe('useEventWizardStore — initial state', () => {
  beforeEach(reset);

  it('eventType is null', () => {
    expect(getState().eventType).toBeNull();
  });

  it('eventDate is null', () => {
    expect(getState().eventDate).toBeNull();
  });

  it('guestCount defaults to 50', () => {
    expect(getState().guestCount).toBe(50);
  });

  it('city is empty string', () => {
    expect(getState().city).toBe('');
  });

  it('venuePreference is null', () => {
    expect(getState().venuePreference).toBeNull();
  });

  it('budgetUsd defaults to 20 000', () => {
    expect(getState().budgetUsd).toBe(20_000);
  });

  it('stylePreferences is an empty array', () => {
    expect(getState().stylePreferences).toEqual([]);
  });

  it('requiredServices is an empty array', () => {
    expect(getState().requiredServices).toEqual([]);
  });

  it('duration defaults to full_day', () => {
    expect(getState().duration).toBe('full_day');
  });

  it('specialRequirements is an empty array', () => {
    expect(getState().specialRequirements).toEqual([]);
  });

  it('specialRequests is empty string', () => {
    expect(getState().specialRequests).toBe('');
  });

  it('outputLanguage defaults to it', () => {
    expect(getState().outputLanguage).toBe('it');
  });

  it('currentStep starts at 1', () => {
    expect(getState().currentStep).toBe(1);
  });

  it('lastStepCompleted starts at 0', () => {
    expect(getState().lastStepCompleted).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Field updates
// ---------------------------------------------------------------------------

describe('useEventWizardStore — field updates', () => {
  beforeEach(reset);

  it('setEventType updates eventType', () => {
    getState().setEventType('wedding');
    expect(getState().eventType).toBe('wedding');
  });

  it('setEventDate updates eventDate', () => {
    getState().setEventDate('2025-06-15');
    expect(getState().eventDate).toBe('2025-06-15');
  });

  it('setGuestCount updates guestCount', () => {
    getState().setGuestCount(120);
    expect(getState().guestCount).toBe(120);
  });

  it('setCity updates city', () => {
    getState().setCity('Milano');
    expect(getState().city).toBe('Milano');
  });

  it('setVenuePreference updates venuePreference', () => {
    getState().setVenuePreference('outdoor');
    expect(getState().venuePreference).toBe('outdoor');
  });

  it('setBudgetUsd updates budgetUsd', () => {
    getState().setBudgetUsd(35_000);
    expect(getState().budgetUsd).toBe(35_000);
  });

  it('setDuration updates duration', () => {
    getState().setDuration('weekend');
    expect(getState().duration).toBe('weekend');
  });

  it('setSpecialRequests updates specialRequests', () => {
    getState().setSpecialRequests('Gluten-free menu');
    expect(getState().specialRequests).toBe('Gluten-free menu');
  });

  it('setOutputLanguage updates outputLanguage', () => {
    getState().setOutputLanguage('en');
    expect(getState().outputLanguage).toBe('en');
  });
});

// ---------------------------------------------------------------------------
// Toggle actions
// ---------------------------------------------------------------------------

describe('useEventWizardStore — toggleStyle', () => {
  beforeEach(reset);

  it('adds a style that is not present', () => {
    getState().toggleStyle('rustic');
    expect(getState().stylePreferences).toContain('rustic');
  });

  it('removes a style that is already present', () => {
    getState().toggleStyle('rustic');
    getState().toggleStyle('rustic');
    expect(getState().stylePreferences).not.toContain('rustic');
  });

  it('can hold multiple styles simultaneously', () => {
    getState().toggleStyle('rustic');
    getState().toggleStyle('modern');
    expect(getState().stylePreferences).toEqual(['rustic', 'modern']);
  });
});

describe('useEventWizardStore — toggleService', () => {
  beforeEach(reset);

  it('adds a service that is not present', () => {
    getState().toggleService('catering');
    expect(getState().requiredServices).toContain('catering');
  });

  it('removes a service that is already present', () => {
    getState().toggleService('catering');
    getState().toggleService('catering');
    expect(getState().requiredServices).not.toContain('catering');
  });
});

describe('useEventWizardStore — toggleSpecialRequirement', () => {
  beforeEach(reset);

  it('adds a requirement not already present', () => {
    getState().toggleSpecialRequirement('accessible');
    expect(getState().specialRequirements).toContain('accessible');
  });

  it('removes a requirement already present', () => {
    getState().toggleSpecialRequirement('accessible');
    getState().toggleSpecialRequirement('accessible');
    expect(getState().specialRequirements).not.toContain('accessible');
  });
});

// ---------------------------------------------------------------------------
// Navigation
// ---------------------------------------------------------------------------

describe('useEventWizardStore — navigation', () => {
  beforeEach(reset);

  it('nextStep increments currentStep', () => {
    getState().nextStep();
    expect(getState().currentStep).toBe(2);
  });

  it('nextStep does not exceed 10', () => {
    useEventWizardStore.setState({ currentStep: 10 });
    getState().nextStep();
    expect(getState().currentStep).toBe(10);
  });

  it('prevStep decrements currentStep', () => {
    useEventWizardStore.setState({ currentStep: 5 });
    getState().prevStep();
    expect(getState().currentStep).toBe(4);
  });

  it('prevStep does not go below 1', () => {
    getState().prevStep();
    expect(getState().currentStep).toBe(1);
  });

  it('goToStep sets an arbitrary step', () => {
    getState().goToStep(7);
    expect(getState().currentStep).toBe(7);
  });

  it('completeStep advances currentStep and updates lastStepCompleted', () => {
    getState().completeStep(3);
    expect(getState().currentStep).toBe(4);
    expect(getState().lastStepCompleted).toBe(3);
  });

  it('completeStep does not lower lastStepCompleted', () => {
    getState().completeStep(5);
    getState().completeStep(2);
    expect(getState().lastStepCompleted).toBe(5);
  });
});

// ---------------------------------------------------------------------------
// reset()
// ---------------------------------------------------------------------------

describe('useEventWizardStore — reset()', () => {
  beforeEach(reset);

  it('resets all fields to defaults after modification', () => {
    getState().setEventType('wedding');
    getState().setCity('Roma');
    getState().setBudgetUsd(100_000);
    getState().toggleStyle('luxury');
    getState().nextStep();
    getState().nextStep();

    getState().reset();

    const s = getState();
    expect(s.eventType).toBeNull();
    expect(s.city).toBe('');
    expect(s.budgetUsd).toBe(20_000);
    expect(s.stylePreferences).toEqual([]);
    expect(s.currentStep).toBe(1);
    expect(s.lastStepCompleted).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// All 10 steps have required field slots
// ---------------------------------------------------------------------------

describe('useEventWizardStore — all 10 step fields are defined', () => {
  beforeEach(reset);

  it('step 1 — eventType slot exists (may be null)', () => {
    expect('eventType' in getState()).toBe(true);
  });

  it('step 2 — city slot exists', () => {
    expect('city' in getState()).toBe(true);
  });

  it('step 3 — eventDate slot exists (may be null)', () => {
    expect('eventDate' in getState()).toBe(true);
  });

  it('step 3 — duration slot exists', () => {
    expect('duration' in getState()).toBe(true);
  });

  it('step 4 — guestCount slot exists', () => {
    expect(typeof getState().guestCount).toBe('number');
  });

  it('step 5 — budgetUsd slot exists', () => {
    expect(typeof getState().budgetUsd).toBe('number');
  });

  it('step 6 — stylePreferences slot exists', () => {
    expect(Array.isArray(getState().stylePreferences)).toBe(true);
  });

  it('step 7 — requiredServices slot exists', () => {
    expect(Array.isArray(getState().requiredServices)).toBe(true);
  });

  it('step 8 — specialRequirements slot exists', () => {
    expect(Array.isArray(getState().specialRequirements)).toBe(true);
  });

  it('step 9 — outputLanguage slot exists', () => {
    expect(typeof getState().outputLanguage).toBe('string');
  });

  it('step 10 — navigation state (currentStep) exists', () => {
    expect(typeof getState().currentStep).toBe('number');
  });
});
