import { describe, it, expect, vi, beforeEach } from 'vitest';
import { buildDealLinks } from '../index';

const BASE_INPUT = {
  location: 'Austin, TX',
  eventType: 'wedding',
  guestCount: 80,
  eventDate: '2026-09-15',
  style: 'rustic',
  budget: 30000,
};

describe('buildDealLinks', () => {
  beforeEach(() => {
    vi.stubEnv('BOOKING_AFFILIATE_ID', 'test-booking-id');
    vi.stubEnv('AMAZON_ASSOCIATES_TAG', 'test-tag-20');
  });

  it('returns all 6 categories for wedding', () => {
    const result = buildDealLinks(BASE_INPUT);
    expect(result.accommodation).toHaveLength(3);
    expect(result.venues).toHaveLength(3);
    expect(result.catering).toHaveLength(3);
    expect(result.florists).toHaveLength(3);
    expect(result.eventPlanners).toHaveLength(3);
    expect(result.decor).toHaveLength(3);
  });

  it('returns only relevant categories for birthday', () => {
    const result = buildDealLinks({ ...BASE_INPUT, eventType: 'birthday' });
    expect(result.accommodation).toBeUndefined();
    expect(result.florists).toBeUndefined();
    expect(result.eventPlanners).toBeUndefined();
    expect(result.venues).toHaveLength(3);
    expect(result.catering).toHaveLength(3);
    expect(result.decor).toHaveLength(3);
  });

  it('returns venues + catering + decor for unknown event type', () => {
    const result = buildDealLinks({ ...BASE_INPUT, eventType: 'unknown_xyz' });
    expect(result.venues).toHaveLength(3);
    expect(result.catering).toHaveLength(3);
    expect(result.decor).toHaveLength(3);
    expect(result.accommodation).toBeUndefined();
  });

  it('skips accommodation when eventDate is null', () => {
    const result = buildDealLinks({ ...BASE_INPUT, eventDate: null });
    expect(result.accommodation).toBeUndefined();
  });

  it('includes affiliate id in booking URLs', () => {
    const result = buildDealLinks(BASE_INPUT);
    result.accommodation!.forEach((l) =>
      expect(l.url).toContain('aid=test-booking-id')
    );
  });

  it('includes associates tag in amazon URLs', () => {
    const result = buildDealLinks(BASE_INPUT);
    result.decor!.forEach((l) => expect(l.url).toContain('tag=test-tag-20'));
  });

  it('uses style in amazon decor keywords', () => {
    const result = buildDealLinks({ ...BASE_INPUT, style: 'bohemian' });
    result.decor!.forEach((l) => expect(l.url).toContain('bohemian'));
  });
});
