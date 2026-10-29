/**
 * Domain engine tests.
 *
 * Covers the typed context, rule registry, budget invariants, timeline
 * dependencies, vendor planning, readiness, and orchestration.
 * FR IDs: FR-ONB-002, FR-RUL-004, FR-BUD-001, FR-TIM-002, FR-VEN-001,
 * FR-DSH-002, FR-EXP-002.
 */

import { describe, expect, it } from 'vitest';
import {
  allocatePlanBudget,
  buildSamplePlan,
  createPlanContext,
  daysBetween,
  deriveContext,
  evaluateRules,
  parsePlanContext,
  PlanContextSchema,
  planVendors,
  rules,
  scheduleTimeline,
} from '../src/engine';
import type { EventType, PlanContext } from '../src/engine';

const today = '2027-06-01';

const base = (overrides: Partial<PlanContext> = {}): PlanContext =>
  createPlanContext('Wedding', {
    subType: 'Court',
    date: '2027-08-15',
    guests: 100,
    budget: 1000000,
    cityTier: 1,
    venue: 'Indoor Hall',
    dietary: [],
    priorities: [],
    children: 0,
    ...overrides,
  });

const fireCases: Record<string, PlanContext> = {
  'R-001': base({ guests: 350, budget: 2000000 }),
  'R-002': base({ venue: 'Outdoor', date: '2027-07-15' }),
  'R-003': base({ venue: 'Outdoor', date: '2028-04-15' }),
  'R-004': base({ date: '2027-06-15' }),
  'R-005': base({ dietary: ['Jain'] }),
  'R-006': base({ children: 5 }),
  'R-007': base({ guests: 500, budget: 100000 }),
  'R-008': base({ guests: 500, budget: 100000 }),
  'R-009': base({ venue: 'Destination' }),
  'R-010': createPlanContext('Community Event', { subType: 'Puja' }),
  'R-011': base({ subType: 'Bengali' }),
  'R-012': base({ date: '2027-11-15' }),
  'R-013': base({ elderlyGuests: true }),
  'R-014': base({ priorities: ['Photography'] }),
  'R-015': base({ language: 'हिन्दी' }),
  'R-016': base({ servesAlcohol: true }),
  'R-017': base({ liveMusic: true, venue: 'Outdoor' }),
  'R-018': base({ guests: 1500, budget: 5000000 }),
  'R-019': base({ guests: 100, budget: 400000 }),
  'R-020': base({ date: '2027-07-01' }),
  'R-021': base({ multiDay: true }),
  'R-022': base({ livestream: true }),
  'R-023': createPlanContext('Birthday', { subType: 'Surprise' }),
};

const evaluate = (ctx: PlanContext): string[] =>
  evaluateRules(ctx, deriveContext(ctx, today)).map((result) => result.id);

describe('[FR-RUL-004] rule registry', () => {
  it('contains 23 unique documented rule IDs', () => {
    expect(rules).toHaveLength(23);
    expect(new Set(rules.map((rule) => rule.id)).size).toBe(23);
    expect(rules.map((rule) => rule.id)).toEqual(
      Array.from({ length: 23 }, (_, index) => `R-${String(index + 1).padStart(3, '0')}`),
    );
  });

  it('has a does-not-fire case for every rule', () => {
    const fired = evaluate(base());
    for (const rule of rules) {
      expect(fired).not.toContain(rule.id);
    }
  });

  it('has a fires case for every rule', () => {
    for (const rule of rules) {
      expect(evaluate(fireCases[rule.id] ?? base())).toContain(rule.id);
    }
  });

  it('returns deterministic results for identical input', () => {
    expect(evaluate(fireCases['R-001'] ?? base())).toEqual(
      evaluate(fireCases['R-001'] ?? base()),
    );
  });
});

describe('[FR-BUD-001] budget engine', () => {
  it('allocates integers that sum exactly to the budget for each event type', () => {
    const eventTypes: EventType[] = ['Wedding', 'Birthday', 'Community Event'];
    for (const eventType of eventTypes) {
      const ctx = createPlanContext(eventType, { priorities: ['Catering', 'Photography'] });
      const derived = deriveContext(ctx, today);
      const fired = evaluateRules(ctx, derived);
      const budget = allocatePlanBudget(ctx, derived, fired);
      expect(budget.lines.reduce((sum, line) => sum + line.planned, 0)).toBe(ctx.budget);
      expect(budget.lines.every((line) => Number.isInteger(line.planned))).toBe(true);
      expect(budget.lines.every((line) => line.planned >= 0)).toBe(true);
    }
  });

  it('reserves 10 percent contingency for outdoor events', () => {
    const ctx = base({ venue: 'Outdoor' });
    const derived = deriveContext(ctx, today);
    const budget = allocatePlanBudget(ctx, derived, evaluateRules(ctx, derived));
    expect(budget.contingencyRate).toBe(0.1);
    expect(budget.lines.reduce((sum, line) => sum + line.planned, 0)).toBe(ctx.budget);
  });

  it('detects infeasible budgets and returns at least two options', () => {
    const ctx = base({ guests: 500, budget: 200000 });
    const derived = deriveContext(ctx, today);
    const budget = allocatePlanBudget(ctx, derived, evaluateRules(ctx, derived));
    expect(budget.status).toBe('infeasible');
    expect(budget.gap).toBeGreaterThan(0);
    expect(budget.suggestions.length).toBeGreaterThanOrEqual(2);
  });

  it('enforces essential floors when the budget is feasible', () => {
    const ctx = base();
    const derived = deriveContext(ctx, today);
    const budget = allocatePlanBudget(ctx, derived, evaluateRules(ctx, derived));
    const venue = budget.lines.find((line) => line.categoryId === 'venue');
    const catering = budget.lines.find((line) => line.categoryId === 'catering');
    expect(venue?.planned).toBeGreaterThanOrEqual(derived.venueFloor);
    expect(catering?.planned).toBeGreaterThanOrEqual(derived.cateringFloor);
  });
});

describe('[FR-TIM-002] timeline engine', () => {
  it('never schedules a task before its dependency', () => {
    const ctx = base();
    const derived = deriveContext(ctx, today);
    const timeline = scheduleTimeline(ctx, derived, evaluateRules(ctx, derived), today);
    const byId = new Map(timeline.tasks.map((task) => [task.templateId, task]));

    for (const task of timeline.tasks) {
      for (const dependency of task.dependsOn) {
        const prerequisite = byId.get(dependency);
        if (prerequisite) {
          expect(task.due >= prerequisite.due).toBe(true);
        }
      }
    }
  });

  it('compresses the timeline and skips optional work in rush mode', () => {
    const ctx = base({ date: '2027-06-10', guests: 100 });
    const derived = deriveContext(ctx, today);
    const timeline = scheduleTimeline(ctx, derived, evaluateRules(ctx, derived), today);
    expect(timeline.rushMode).toBe(true);
    expect(timeline.scale).toBeLessThan(1);
    expect(timeline.skippedTasks.length).toBeGreaterThan(0);
    expect(timeline.tasks.some((task) => task.flags.includes('at-risk'))).toBe(true);
  });

  it('builds a run-of-show around the start time', () => {
    const plan = buildSamplePlan('Wedding', { startTime: '18:00' }, today);
    expect(plan.runOfShow).toHaveLength(7);
    expect(plan.runOfShow[3]?.time).toBe('18:00');
    expect(plan.runOfShow[4]?.time).toBe('20:00');
  });

  it('throws on a circular dependency', () => {
    const ctx = base();
    const derived = deriveContext(ctx, today);
    const circular = {
      id: 'R-001',
      title: 'Circular',
      detail: 'bad',
      effect: 'bad',
      extraTasks: [
        {
          templateId: 'rule-a',
          title: 'A',
          categoryId: 'venue' as const,
          leadDays: 10,
          rushable: true,
          skippable: false,
          dependsOn: ['rule-b'],
        },
        {
          templateId: 'rule-b',
          title: 'B',
          categoryId: 'venue' as const,
          leadDays: 10,
          rushable: true,
          skippable: false,
          dependsOn: ['rule-a'],
        },
      ],
    };
    expect(() => scheduleTimeline(ctx, derived, [circular], today)).toThrow(/Circular/);
  });
});

describe('[FR-VEN-001] vendor engine', () => {
  it('adds rule-driven vendor categories without duplicates', () => {
    const ctx = base({ guests: 350, liveMusic: true, venue: 'Outdoor' });
    const derived = deriveContext(ctx, today);
    const vendors = planVendors(ctx, evaluateRules(ctx, derived));
    const ids = vendors.map((vendor) => vendor.categoryId);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toContain('security');
    expect(ids).toContain('music');
    expect(vendors.every((vendor) => vendor.mapsUrl.includes('google.com/maps/search'))).toBe(true);
  });
});

describe('[FR-DSH-002] readiness', () => {
  it('returns a bounded score with a breakdown', () => {
    const plan = buildSamplePlan('Wedding', {}, today);
    expect(plan.readiness.score).toBeGreaterThanOrEqual(0);
    expect(plan.readiness.score).toBeLessThanOrEqual(100);
    expect(plan.readiness.breakdown.length).toBeGreaterThanOrEqual(4);
  });

  it('rewards completed tasks', () => {
    const plan = buildSamplePlan('Wedding', {}, today);
    const firstTask = plan.tasks[0];
    const done = firstTask ? new Set([firstTask.id]) : new Set<string>();
    const improved = buildSamplePlan('Wedding', {}, today, done);
    expect(improved.readiness.score).toBeGreaterThanOrEqual(plan.readiness.score);
    expect(improved.readiness.taskProgress).toBeGreaterThan(plan.readiness.taskProgress);
  });
});

describe('[FR-ONB-002] context validation', () => {
  it('rejects unknown keys and impossible values', () => {
    expect(() => PlanContextSchema.parse({ ...base(), extra: true })).toThrow();
    expect(() => PlanContextSchema.parse({ ...base(), guests: 0 })).toThrow();
    expect(() => PlanContextSchema.parse({ ...base(), date: 'tomorrow' })).toThrow();
  });

  it('parses a valid context', () => {
    expect(parsePlanContext(base()).eventType).toBe('Wedding');
  });

  it('computes whole-day differences in UTC', () => {
    expect(daysBetween('2027-06-01', '2027-06-11')).toBe(10);
    expect(daysBetween('2027-06-11', '2027-06-01')).toBe(-10);
  });
});
