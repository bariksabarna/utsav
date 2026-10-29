/**
 * API digest mapping tests.
 *
 * FR IDs: FR-IDE-001, FR-AST-001, FR-DSH-004.
 */

import { describe, expect, it } from 'vitest';
import { localeFor, seasonFor, toContextDigest, toPlanDigest } from '../src/api/digest';
import { buildSamplePlan } from '../src/engine/plan';

describe('API digests', () => {
  it('maps plan languages to API locales', () => {
    expect(localeFor('English')).toBe('en');
    expect(localeFor('हिन्दी')).toBe('hi');
    expect(localeFor('বাংলা')).toBe('bn');
  });

  it('derives seasons from event months', () => {
    expect(seasonFor(4)).toBe('summer');
    expect(seasonFor(7)).toBe('monsoon');
    expect(seasonFor(10)).toBe('autumn');
    expect(seasonFor(1)).toBe('winter');
  });

  it('bounds context and plan digests', () => {
    const plan = buildSamplePlan('Wedding', {
      dietary: ['Vegetarian', 'Jain', 'Vegan', 'No beef', 'No pork', 'Nut-free', 'Gluten-free', 'Halal', 'Vegan'],
    });
    const context = toContextDigest(plan);
    const digest = toPlanDigest(plan);

    expect(context.dietary).toHaveLength(8);
    expect(context.eventType).toBe('Wedding');
    expect(context.budget).toBe(plan.context.budget);
    expect(digest.budgetLines.length).toBeLessThanOrEqual(20);
    expect(digest.topTasks.length).toBeLessThanOrEqual(8);
    expect(digest.risks.length).toBeLessThanOrEqual(8);
    expect(digest.date).toBe(plan.context.date);
  });
});
