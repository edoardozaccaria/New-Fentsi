import type { DealLinks, DealLinksInput } from '@/types/deals.types';
import { getRelevantCategories } from './categoryMap';
import {
  buildBookingAccommodationLinks,
  buildBookingVenueLinks,
  buildGoogleMapsLinks,
  buildAmazonDecorLinks,
} from './urlBuilders';

function deriveCheckInOut(eventDate: string): {
  checkIn: string;
  checkOut: string;
} {
  const d = new Date(eventDate + 'T00:00:00');
  const checkIn = new Date(d);
  checkIn.setDate(d.getDate() - 1);
  const checkOut = new Date(d);
  checkOut.setDate(d.getDate() + 1);
  return {
    checkIn: checkIn.toISOString().split('T')[0]!,
    checkOut: checkOut.toISOString().split('T')[0]!,
  };
}

export function buildDealLinks(input: DealLinksInput): Partial<DealLinks> {
  const bookingId = process.env.BOOKING_AFFILIATE_ID ?? '';
  const amazonTag = process.env.AMAZON_ASSOCIATES_TAG ?? '';
  const categories = getRelevantCategories(input.eventType);
  const result: Partial<DealLinks> = {};

  for (const category of categories) {
    switch (category) {
      case 'accommodation': {
        if (!input.eventDate) break;
        const { checkIn, checkOut } = deriveCheckInOut(input.eventDate);
        result.accommodation = buildBookingAccommodationLinks({
          location: input.location,
          guestCount: input.guestCount,
          checkIn,
          checkOut,
          budget: input.budget,
          affiliateId: bookingId,
        });
        break;
      }
      case 'venues':
        result.venues = buildBookingVenueLinks({
          location: input.location,
          affiliateId: bookingId,
        });
        break;
      case 'catering':
        result.catering = buildGoogleMapsLinks({
          location: input.location,
          category: 'catering',
        });
        break;
      case 'florists':
        result.florists = buildGoogleMapsLinks({
          location: input.location,
          category: 'florists',
        });
        break;
      case 'eventPlanners':
        result.eventPlanners = buildGoogleMapsLinks({
          location: input.location,
          category: 'eventPlanners',
        });
        break;
      case 'decor':
        result.decor = buildAmazonDecorLinks({
          style: input.style,
          eventType: input.eventType,
          budget: input.budget,
          associatesTag: amazonTag,
        });
        break;
    }
  }

  return result;
}
