import { z } from "zod";

export const allocationCategorySchema = z.enum([
  "venue",
  "catering",
  "decor",
  "entertainment",
  "av",
  "photo_video",
  "misc",
]);

export const planAllocationsSchema = z.record(allocationCategorySchema, z.number().min(0).max(100));

export const planChoicesSchema = z.object({
  venueStyle: z.string().optional(),
  cateringStyles: z.array(z.string()).optional(),
  decorMood: z.string().optional(),
  extras: z.array(z.string()).optional(),
});

export const briefAssetSchema = z.object({
  id: z.string(),
  type: z.enum(["image", "link", "doc"]),
  url: z.string().url(),
  title: z.string().optional(),
  meta: z.any().optional(),
});

export const planBriefSchema = z.object({
  description: z.string(),
  assets: z.array(briefAssetSchema).optional(),
});

export const planUpsertSchema = z.object({
  planId: z.string().uuid().optional(),
  eventTypeId: z.string().uuid().optional(),
  guestTierId: z.string().optional(),
  totalBudget: z.number().min(300).optional(),
  allocations: planAllocationsSchema.optional(),
  choices: planChoicesSchema.optional(),
  brief: planBriefSchema.optional(),
  consent: z.boolean().optional(),
  locale: z.enum(["it", "en"]).optional(),
  lastStepCompleted: z.number().min(1).max(10).optional(),
});

export const generatePlanSchema = z.object({
  planId: z.string().uuid(),
  locale: z.enum(["it", "en"]).default("it"),
});

export const consentSchema = z.object({
  planId: z.string().uuid(),
  consent: z.boolean(),
});

export const referralClickSchema = z.object({
  planId: z.string().uuid(),
  vendorId: z.string().uuid().optional(),
  kind: z.enum(["direct", "aggregator", "affiliate"]),
  metadata: z.record(z.string(), z.any()).optional(),
});

export const referralConfirmSchema = z.object({
  referralId: z.string().uuid().optional(),
  planId: z.string().uuid(),
  vendorId: z.string().uuid().optional(),
  commission: z.number().min(0).optional(),
});

export const vendorQuerySchema = z.object({
  type: z.string().optional(),
  city: z.string().optional(),
  tags: z.string().optional(),
  direct: z.enum(["true", "false"]).optional(),
  aggregator: z.enum(["true", "false"]).optional(),
});

export const checkoutSchema = z.object({
  planId: z.string().uuid(),
  vendorId: z.string().uuid(),
  amount: z.number().min(1),
  currency: z.string().default("eur"),
  successUrl: z.string().url(),
  cancelUrl: z.string().url(),
});
