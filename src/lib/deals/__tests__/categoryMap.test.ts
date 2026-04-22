import { describe, it, expect } from 'vitest';
import { getRelevantCategories } from '../categoryMap';

describe('getRelevantCategories', () => {
  it('returns all 6 categories for wedding', () => {
    const cats = getRelevantCategories('wedding');
    expect(cats).toContain('accommodation');
    expect(cats).toContain('venues');
    expect(cats).toContain('catering');
    expect(cats).toContain('florists');
    expect(cats).toContain('eventPlanners');
    expect(cats).toContain('decor');
    expect(cats).toHaveLength(6);
  });

  it('excludes accommodation for birthday', () => {
    const cats = getRelevantCategories('birthday');
    expect(cats).not.toContain('accommodation');
    expect(cats).not.toContain('florists');
    expect(cats).not.toContain('eventPlanners');
  });

  it('excludes florists for corporate', () => {
    const cats = getRelevantCategories('corporate');
    expect(cats).not.toContain('florists');
  });

  it('returns venues + catering + decor for unknown eventType', () => {
    const cats = getRelevantCategories('unknown_type');
    expect(cats).toContain('venues');
    expect(cats).toContain('catering');
    expect(cats).toContain('decor');
  });
});
