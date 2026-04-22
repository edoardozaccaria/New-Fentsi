import { Decimal } from "@prisma/client/runtime/library";
import { prisma } from "../config/database";
import { planGenerationQueue } from "../config/queue";
import { geocodeCity } from "./geocoding.service";
import { searchVendors } from "./foursquare.service";
import { generateEventPlan, type WizardData } from "./ai.service";

// ─── Types ────────────────────────────────────

interface SubmitWizardData {
  event_type: string;
  event_date: string;
  guest_count: number;
  budget_total: number;
  budget_currency?: string;
  location_city: string;
  venue_preference: string;
  aesthetic_style: unknown;
  top_priorities: unknown;
  services_wanted: string[];
  extra_notes?: string;
}

interface SubmitWizardResult {
  submissionId: string;
  status: "processing";
}

interface SubmissionStatus {
  status: string;
  plan?: EventPlanWithVendors | null;
}

interface EventPlanWithVendors {
  id: string;
  title: string;
  event_type: string;
  event_date: string;
  location_city: string;
  guest_count: number;
  budget_total: Decimal;
  ai_summary: string;
  budget_breakdown: unknown;
  timeline: unknown;
  ai_tips: unknown;
  style_notes: string;
  tokens_used: number | null;
  generated_at: Date | null;
  vendors: Array<{
    id: string;
    foursquare_id: string;
    name: string;
    category: string;
    vendor_type: string;
    address: string;
    city: string;
    lat: Decimal;
    lng: Decimal;
    price_range: string;
    rating: Decimal | null;
    phone: string | null;
    website: string | null;
    foursquare_url: string | null;
    photo_urls: unknown;
    ai_match_score: number;
    ai_match_reason: string;
  }>;
}

// ─── Helper: Map VendorType string to Prisma enum ──

function mapVendorType(
  vendorType: string,
):
  | "venue"
  | "catering"
  | "photography"
  | "videography"
  | "florist"
  | "dj"
  | "band"
  | "decorator"
  | "cake"
  | "planner"
  | "rental"
  | "transport"
  | "other" {
  const mapping: Record<string, string> = {
    venue: "venue",
    catering: "catering",
    photographer: "photography",
    photography: "photography",
    videographer: "videography",
    videography: "videography",
    florist: "florist",
    dj: "dj",
    live_music: "band",
    band: "band",
    mc: "other",
    lighting: "decorator",
    decorator: "decorator",
    cake: "cake",
    planner: "planner",
    rental: "rental",
    transport: "transport",
  };

  return (mapping[vendorType] ?? "other") as ReturnType<typeof mapVendorType>;
}

function mapPriceRange(
  range: string,
): "budget" | "moderate" | "premium" | "luxury" {
  const valid = ["budget", "moderate", "premium", "luxury"];
  return valid.includes(range)
    ? (range as ReturnType<typeof mapPriceRange>)
    : "moderate";
}

// ─── Core: Generate Plan ──────────────────────

export async function generatePlan(submissionId: string) {
  let submission;

  try {
    // Step 1: Load wizard submission from DB
    submission = await prisma.wizardSubmission.findUnique({
      where: { id: submissionId },
    });

    if (!submission) {
      throw new Error(`Wizard submission not found: ${submissionId}`);
    }

    // Update status to processing
    await prisma.wizardSubmission.update({
      where: { id: submissionId },
      data: { status: "processing" },
    });

    // Step 2: Geocode city
    const { lat, lng } = await geocodeCity(submission.location_city);

    await prisma.wizardSubmission.update({
      where: { id: submissionId },
      data: {
        location_lat: new Decimal(lat.toFixed(7)),
        location_lng: new Decimal(lng.toFixed(7)),
      },
    });

    // Step 3: Search Foursquare vendors (parallel for all services)
    const servicesWanted = submission.services_wanted as string[];
    const vendors = await searchVendors({
      lat,
      lng,
      services: servicesWanted,
      budget: Number(submission.budget_total),
      guestCount: submission.guest_count,
    });

    // Step 4: Call AI with wizard data + vendor results
    const wizardData: WizardData = {
      event_type: submission.event_type,
      event_date: submission.event_date,
      guest_count: submission.guest_count,
      budget_total: Number(submission.budget_total),
      budget_currency: submission.budget_currency,
      location_city: submission.location_city,
      venue_preference: submission.venue_preference,
      aesthetic_style: submission.aesthetic_style as
        | string[]
        | Record<string, unknown>,
      top_priorities: submission.top_priorities as
        | string[]
        | Record<string, unknown>,
      services_wanted: servicesWanted,
      extra_notes: submission.extra_notes ?? undefined,
    };

    const { plan: aiPlan, tokens_used } = await generateEventPlan(
      wizardData,
      vendors,
    );

    // Step 5: Merge AI response with vendor data
    const vendorScoreMap = new Map(
      aiPlan.vendor_scores.map((vs) => [vs.foursquare_id, vs]),
    );

    const enrichedVendors = vendors.map((vendor) => {
      const score = vendorScoreMap.get(vendor.foursquare_id);
      return {
        ...vendor,
        ai_match_score: score?.score ?? 50,
        ai_match_reason:
          score?.reason ?? "Vendor trovato nella zona richiesta.",
      };
    });

    // Sort by AI score descending
    enrichedVendors.sort((a, b) => b.ai_match_score - a.ai_match_score);

    // Step 6: Save event_plan + plan_vendors in a transaction
    const eventPlan = await prisma.$transaction(async (tx) => {
      const plan = await tx.eventPlan.create({
        data: {
          wizard_submission_id: submissionId,
          user_id: submission.user_id,
          title: aiPlan.title,
          event_type: submission.event_type,
          event_date: submission.event_date,
          location_city: submission.location_city,
          guest_count: submission.guest_count,
          budget_total: submission.budget_total,
          ai_summary: aiPlan.ai_summary,
          budget_breakdown: aiPlan.budget_breakdown as unknown as object,
          timeline: aiPlan.timeline as unknown as object,
          ai_tips: aiPlan.ai_tips as unknown as object,
          style_notes: aiPlan.style_notes,
          tokens_used,
          generated_at: new Date(),
        },
      });

      // Create plan vendors
      if (enrichedVendors.length > 0) {
        await tx.planVendor.createMany({
          data: enrichedVendors.map((v) => ({
            plan_id: plan.id,
            foursquare_id: v.foursquare_id,
            name: v.name,
            category: v.category,
            vendor_type: mapVendorType(v.vendor_type),
            address: v.address,
            city: v.city,
            lat: new Decimal(v.lat.toFixed(7)),
            lng: new Decimal(v.lng.toFixed(7)),
            price_range: mapPriceRange(v.price_range),
            rating: v.rating != null ? new Decimal(v.rating.toFixed(1)) : null,
            phone: v.phone,
            website: v.website,
            foursquare_url: v.foursquare_url,
            photo_urls: v.photo_urls as unknown as object,
            ai_match_score: v.ai_match_score,
            ai_match_reason: v.ai_match_reason,
          })),
        });
      }

      return tx.eventPlan.findUnique({
        where: { id: plan.id },
        include: { vendors: true },
      });
    });

    // Step 7: Update submission status to completed
    await prisma.wizardSubmission.update({
      where: { id: submissionId },
      data: { status: "completed" },
    });

    // Step 8: Return the complete plan
    return eventPlan;
  } catch (error) {
    // On any error, mark the submission as failed
    console.error(
      `[WizardService] Plan generation failed for ${submissionId}:`,
      error,
    );

    try {
      await prisma.wizardSubmission.update({
        where: { id: submissionId },
        data: { status: "failed" },
      });
    } catch (updateError) {
      console.error(
        "[WizardService] Failed to update submission status:",
        updateError,
      );
    }

    throw error;
  }
}

// ─── Submit Wizard ────────────────────────────

export async function submitWizard(
  data: SubmitWizardData,
  userId?: string,
  sessionId?: string,
): Promise<SubmitWizardResult> {
  // Create wizard submission in DB
  const submission = await prisma.wizardSubmission.create({
    data: {
      user_id: userId ?? null,
      session_id: sessionId ?? null,
      event_type: data.event_type as never,
      event_date: data.event_date,
      guest_count: data.guest_count,
      budget_total: new Decimal(data.budget_total),
      budget_currency: data.budget_currency ?? "EUR",
      location_city: data.location_city,
      venue_preference: data.venue_preference as never,
      aesthetic_style: data.aesthetic_style as object,
      top_priorities: data.top_priorities as object,
      services_wanted: data.services_wanted as object,
      extra_notes: data.extra_notes ?? null,
      status: "pending",
    },
  });

  // Add job to BullMQ queue
  await planGenerationQueue.add("generate-plan", {
    submissionId: submission.id,
  });

  return {
    submissionId: submission.id,
    status: "processing",
  };
}

// ─── Get Submission Status ────────────────────

export async function getSubmissionStatus(
  submissionId: string,
): Promise<SubmissionStatus> {
  const submission = await prisma.wizardSubmission.findUnique({
    where: { id: submissionId },
    include: {
      event_plan: {
        include: {
          vendors: {
            orderBy: { ai_match_score: "desc" },
          },
        },
      },
    },
  });

  if (!submission) {
    throw new Error(`Submission not found: ${submissionId}`);
  }

  return {
    status: submission.status,
    plan: submission.event_plan ?? null,
  };
}

export default { generatePlan, submitWizard, getSubmissionStatus };
