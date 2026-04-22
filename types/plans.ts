export type AllocationCategory =
  | "venue"
  | "catering"
  | "decor"
  | "entertainment"
  | "av"
  | "photo_video"
  | "misc";

export interface EventTypePreset {
  id: string;
  name: string;
  minBudget: number;
  guestTiers: string[];
  budgetPresets: { value: number; label: string }[];
}

export interface PlanBriefAsset {
  id: string;
  type: "image" | "link" | "doc";
  url: string;
  title?: string;
  meta?: unknown;
}

export interface PlanDraft {
  id?: string;
  eventTypeId?: string;
  guestTierId?: string;
  totalBudget?: number;
  autoRebalance: boolean;
  allocations: Record<AllocationCategory, number>;
  choices: {
    venueStyle?: string;
    cateringStyles?: string[];
    decorMood?: string;
    extras?: string[];
  };
  brief: {
    description: string;
    assets: PlanBriefAsset[];
  };
  consent: boolean;
  locale: "it" | "en";
  lastStepCompleted: number;
}
