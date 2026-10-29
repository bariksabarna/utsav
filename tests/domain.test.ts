import { describe, expect, it } from 'vitest';
import {
  allocateBudget,
  buildExportLinks,
  generateBudgetGuidance,
  generateNextActions,
  generateRiskFlags,
  generateRuleSet,
  generateTimeline,
  generateVendorChecklist,
} from '../src/domain';

describe('[FR-BUD-001] budget engine', () => {
  it('keeps the total budget aligned across all event types', () => {
    const wedding = allocateBudget('Wedding', 1500000);
    const birthday = allocateBudget('Birthday', 600000);
    const community = allocateBudget('Community Event', 400000);

    expect(wedding.reduce((sum, item) => sum + item.amount, 0)).toBe(1500000);
    expect(birthday.reduce((sum, item) => sum + item.amount, 0)).toBe(600000);
    expect(community.reduce((sum, item) => sum + item.amount, 0)).toBe(400000);
  });
});

describe('[FR-TIM-001] timeline generation', () => {
  it('creates a realistic due-list for a wedding timeline', () => {
    const timeline = generateTimeline('Wedding', '2026-12-12');
    const firstTask = timeline[0];
    const lastTask = timeline.at(-1);

    expect(timeline.length).toBeGreaterThan(0);
    expect(firstTask).toBeDefined();
    expect(firstTask?.title).toContain('venue');
    expect(lastTask?.status).toBe('At risk');
  });

  it('uses phase labels and rush mode when the event is near', () => {
    const timeline = generateTimeline('Wedding', '2026-10-30');
    const nearTask = timeline.find((task) => task.title.toLowerCase().includes('rehearsal'));

    expect(nearTask?.phase).toBe('Final Countdown');
    expect(timeline.some((task) => task.rushMode === true)).toBe(true);
  });
});

describe('[FR-VEN-001] vendor checklist generation', () => {
  it('returns the core vendor categories for each event type', () => {
    const weddingVendors = generateVendorChecklist('Wedding');
    const birthdayVendors = generateVendorChecklist('Birthday');
    const communityVendors = generateVendorChecklist('Community Event');

    expect(weddingVendors[0]?.name).toBe('Venue');
    expect(birthdayVendors[0]?.name).toBe('Venue');
    expect(communityVendors[0]?.name).toBe('Permits');
  });
});

describe('[FR-VEN-004] vendor comparison metadata', () => {
  it('includes quote-normalised data and a Google Maps search link', () => {
    const weddingVendors = generateVendorChecklist('Wedding');
    const venue = weddingVendors[0];

    expect(venue?.pricePerHead).toBeGreaterThan(0);
    expect(venue?.mapsUrl).toContain('google.com/maps/search/?api=1&query=');
    expect(venue?.mustAsk?.length).toBeGreaterThan(0);
  });
});

describe('[FR-DSH-003] next action guidance', () => {
  it('provides practical actions that reflect the event preferences and audience', () => {
    const actions = generateNextActions('Wedding', 1500000, 250, 'Vegetarian', 'हिन्दी');

    expect(actions.length).toBeGreaterThan(0);
    expect(actions[0]?.title).toContain('Venue');
    expect(actions.some((action) => action.detail.toLowerCase().includes('vegetarian'))).toBe(true);
    expect(actions.some((action) => action.detail.toLowerCase().includes('hindi'))).toBe(true);
  });
});

describe('[FR-RUL-002] risk flag generation', () => {
  it('flags the major operational issues for a high-guest outdoor wedding', () => {
    const risks = generateRiskFlags('Wedding', 1500000, 350, 1, 'Outdoor');

    expect(risks.length).toBeGreaterThan(0);
    expect(risks.some((risk) => risk.label.toLowerCase().includes('weather'))).toBe(true);
    expect(risks.some((risk) => risk.label.toLowerCase().includes('guest'))).toBe(true);
  });
});

describe('[FR-VEN-003] vendor status pipeline', () => {
  it('marks vendor categories with a clear stage and status progression', () => {
    const weddingVendors = generateVendorChecklist('Wedding');

    expect(weddingVendors[0]?.status).toBe('Booked');
    expect(weddingVendors[1]?.status).toBe('Quote received');
    expect(weddingVendors[2]?.status).toBe('Shortlist');
  });
});

describe('[FR-EXP-002] export-ready plan links', () => {
  it('creates calendar and spreadsheet links from the selected event data', () => {
    const links = buildExportLinks('Wedding', '2026-12-12', 'Aarav & Meera');

    expect(links.calendar).toContain('google.com/calendar');
    expect(links.csv).toContain('Aarav%20%26%20Meera');
    expect(links.csv).toContain('csv');
  });
});

describe('[FR-RUL-001] rule set and budget guidance', () => {
  it('exposes deterministic rule IDs and concrete budget actions', () => {
    const rules = generateRuleSet('Wedding', 1500000, 350, 1, 'Outdoor');
    const guidance = generateBudgetGuidance('Wedding', 1500000, 350, 1, 'Outdoor');

    expect(rules.length).toBeGreaterThan(0);
    expect(rules[0]?.id).toMatch(/^R-/);
    expect(guidance.some((item) => item.toLowerCase().includes('weather'))).toBe(true);
  });
});
