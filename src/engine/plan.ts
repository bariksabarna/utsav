/**
 * Plan orchestration.
 *
 * Responsibilities: run the deterministic engines in order and assemble a
 * complete explainable plan. AI is never required for this path.
 * FR IDs: FR-ONB-004, FR-RUL-002, FR-BUD-001, FR-TIM-001, FR-VEN-001,
 * FR-DSH-002.
 */

import { allocatePlanBudget } from './budget';
import { createPlanContext, deriveContext } from './context';
import { calculatePlanReadiness } from './readiness';
import { evaluateRules } from './rules';
import { scheduleTimeline } from './timeline';
import type { EventType, Plan, PlanContext, RiskFlag } from './types';
import { planVendors } from './vendors';

/** Returns today's date in YYYY-MM-DD form. */
function defaultToday(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Builds a complete deterministic plan from validated context.
 *
 * @param ctx - Validated plan context
 * @param today - Injected current date in YYYY-MM-DD form
 * @param doneTaskIds - Optional task IDs marked done by the user
 * @returns Budget, tasks, vendors, fired rules, risks, and readiness
 */
export function buildPlan(
  ctx: PlanContext,
  today: string = defaultToday(),
  doneTaskIds: ReadonlySet<string> = new Set<string>(),
): Plan {
  const derived = deriveContext(ctx, today);
  const rules = evaluateRules(ctx, derived);
  const budget = allocatePlanBudget(ctx, derived, rules);
  const timeline = scheduleTimeline(ctx, derived, rules, today);
  const vendors = planVendors(ctx, rules);
  const risks = rules
    .map((result) => result.risk)
    .filter((risk): risk is RiskFlag => risk !== undefined);

  if (risks.length === 0) {
    risks.push({
      id: 'R-000',
      label: 'Low risk',
      level: 'low',
      note: 'Current constraints look manageable.',
    });
  }

  const readiness = calculatePlanReadiness(
    ctx,
    budget,
    timeline.tasks,
    vendors,
    risks,
    doneTaskIds,
  );

  return {
    context: ctx,
    derived,
    budget,
    tasks: timeline.tasks,
    skippedTasks: timeline.skippedTasks,
    vendors,
    rules,
    risks,
    runOfShow: timeline.runOfShow,
    readiness,
  };
}

/**
 * Builds a plan for a sample scenario.
 *
 * @param eventType - Event type to use for defaults
 * @param overrides - Optional context overrides
 * @param today - Injected current date in YYYY-MM-DD form
 * @returns A complete sample plan
 */
export function buildSamplePlan(
  eventType: EventType,
  overrides: Partial<PlanContext> = {},
  today?: string,
  doneTaskIds: ReadonlySet<string> = new Set<string>(),
): Plan {
  return buildPlan(createPlanContext(eventType, overrides), today, doneTaskIds);
}
