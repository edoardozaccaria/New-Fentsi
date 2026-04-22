import { describe, it, expect } from 'vitest';
import {
  buildBookingAccommodationLinks,
  buildBookingVenueLinks,
  buildGoogleMapsLinks,
  buildAmazonDecorLinks,
} from '../urlBuilders';

describe('buildBookingAccommodationLinks', () => {
  it('returns 3 links with booking source', () => {
    const links = buildBookingAccommodationLinks({
      location: 'New York',
      guestCount: 50,
      checkIn: '2026-09-14',
      checkOut: '2026-09-15',
      budget: 20000,
      affiliateId: 'test123',
    });
    expect(links).toHaveLength(3);
    links.forEach((l) => expect(l.source).toBe('booking'));
  });

  it('includes affiliate id in all URLs', () => {
    const links = buildBookingAccommodationLinks({
      location: 'Austin',
      guestCount: 20,
      checkIn: '2026-06-01',
      checkOut: '2026-06-02',
      budget: 10000,
      affiliateId: 'myaid',
    });
    links.forEach((l) => expect(l.url).toContain('aid=myaid'));
  });

  it('omits aid param when affiliateId is empty', () => {
    const links = buildBookingAccommodationLinks({
      location: 'Austin',
      guestCount: 10,
      checkIn: '2026-06-01',
      checkOut: '2026-06-02',
      budget: 5000,
      affiliateId: '',
    });
    links.forEach((l) => expect(l.url).not.toContain('aid='));
  });
});

describe('buildBookingVenueLinks', () => {
  it('returns 3 booking venue links for the given location', () => {
    const links = buildBookingVenueLinks({
      location: 'Miami',
      affiliateId: 'x',
    });
    expect(links).toHaveLength(3);
    links.forEach((l) => {
      expect(l.source).toBe('booking');
      expect(l.url).toContain('booking.com');
    });
  });
});

describe('buildGoogleMapsLinks', () => {
  it('returns 3 google_maps links for catering', () => {
    const links = buildGoogleMapsLinks({
      location: 'Chicago',
      category: 'catering',
    });
    expect(links).toHaveLength(3);
    links.forEach((l) => expect(l.source).toBe('google_maps'));
  });

  it('returns 3 google_maps links for florists', () => {
    const links = buildGoogleMapsLinks({
      location: 'Portland',
      category: 'florists',
    });
    expect(links).toHaveLength(3);
  });

  it('returns 3 google_maps links for eventPlanners', () => {
    const links = buildGoogleMapsLinks({
      location: 'Seattle',
      category: 'eventPlanners',
    });
    expect(links).toHaveLength(3);
  });
});

describe('buildAmazonDecorLinks', () => {
  it('returns 3 amazon links with tag', () => {
    const links = buildAmazonDecorLinks({
      style: 'rustic',
      eventType: 'wedding',
      budget: 15000,
      associatesTag: 'fentsi-20',
    });
    expect(links).toHaveLength(3);
    links.forEach((l) => {
      expect(l.source).toBe('amazon');
      expect(l.url).toContain('amazon.com');
      expect(l.url).toContain('tag=fentsi-20');
    });
  });

  it('omits tag param when associatesTag is empty', () => {
    const links = buildAmazonDecorLinks({
      style: 'modern',
      eventType: 'corporate',
      budget: 8000,
      associatesTag: '',
    });
    links.forEach((l) => expect(l.url).not.toContain('tag='));
  });

  it('uses style and eventType in search keywords', () => {
    const links = buildAmazonDecorLinks({
      style: 'bohemian',
      eventType: 'birthday',
      budget: 3000,
      associatesTag: '',
    });
    expect(links[0]!.url).toContain('bohemian');
    expect(links[0]!.url).toContain('birthday');
  });
});
