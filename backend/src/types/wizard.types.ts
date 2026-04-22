import type { WizardInput } from '../validators/wizard.schema';
import type { EventPlan } from './plan.types';

/** Payload stored when a user submits the wizard form. */
export interface WizardSubmission {
  id: string;
  user_id: string | null;
  session_id: string | null;
  answers: WizardInput;
  created_at: string;
}

/** Request body sent to the plan-generation endpoint. */
export interface PlanGenerationRequest {
  wizard: WizardInput;
  session_id?: string;
}

/** Successful response from the plan-generation endpoint. */
export interface PlanGenerationResponse {
  plan_id: string;
  plan: EventPlan;
  credits_remaining: number | null;
  generated_at: string;
}
