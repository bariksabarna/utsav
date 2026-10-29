/**
 * Readiness scoring.
 *
 * Responsibilities: combine task progress, critical vendor coverage, budget
 * health, and open high-severity risks into a transparent 0-100 score.
 * FR IDs: FR-DSH-002, FR-VEN-007.
 */

import type {
  BudgetPlan,
  CategoryId,
  PlanContext,
  ReadinessResult,
  RiskFlag,
  ScheduledTask,
  VendorPlan,
} from './types';

const phaseWeight: Record<ScheduledTask['phase'], number> = {
  Foundation: 1,
  Booking: 1.2,
  Detailing: 1.5,
  'Final Countdown': 2,
  'Event Day': 2,
  'Post-event': 1,
};

const criticalByEvent: Record<PlanContext['eventType'], CategoryId[]> = {
  Wedding: ['venue', 'catering', 'photography'],
  Birthday: ['venue', 'catering', 'cake'],
  'Community Event': ['permits', 'venue', 'staffing', 'sound'],
};

/** Returns critical vendor categories for an event type. */
function criticalCategories(ctx: PlanContext): CategoryId[] {
  return criticalByEvent[ctx.eventType];
}

/**
 * Calculates readiness with a textual breakdown.
 *
 * @param ctx - Validated plan context
 * @param budget - Allocated budget plan
 * @param tasks - Scheduled tasks
 * @param vendors - Planned vendor categories
 * @param risks - Open risk flags
 * @param doneTaskIds - Task IDs marked done by the user
 * @returns Score and component breakdown
 */
export function calculatePlanReadiness(
  ctx: PlanContext,
  budget: BudgetPlan,
  tasks: ScheduledTask[],
  vendors: VendorPlan[],
  risks: RiskFlag[],
  doneTaskIds: ReadonlySet<string> = new Set<string>(),
): ReadinessResult {
  const totalWeight = tasks.reduce((sum, task) => sum + phaseWeight[task.phase], 0);
  const doneWeight = tasks
    .filter((task) => doneTaskIds.has(task.id))
    .reduce((sum, task) => sum + phaseWeight[task.phase], 0);
  const taskProgress = totalWeight > 0 ? (doneWeight / totalWeight) * 100 : 0;

  const critical = criticalCategories(ctx);
  const booked = critical.filter((category) =>
    vendors.some(
      (vendor) =>
        vendor.categoryId === category && (vendor.status === 'Booked' || vendor.status === 'Paid'),
    ),
  ).length;
  const vendorCoverage = critical.length > 0 ? (booked / critical.length) * 100 : 100;

  const budgetHealth = budget.status === 'infeasible' ? 40 : budget.gap > 0 ? 70 : 100;
  const highRisks = risks.filter((risk) => risk.level === 'high').length;
  const riskPenaltyInverse = Math.max(0, 100 - highRisks * 10);

  const score = Math.round(
    taskProgress * 0.4 +
      vendorCoverage * 0.25 +
      budgetHealth * 0.2 +
      riskPenaltyInverse * 0.15,
  );

  return {
    score: Math.min(100, Math.max(0, score)),
    taskProgress: Math.round(taskProgress),
    vendorCoverage: Math.round(vendorCoverage),
    budgetHealth,
    riskPenaltyInverse,
    breakdown: [
      `Tasks complete: ${Math.round(taskProgress)}%`,
      `Critical vendors booked: ${booked} of ${critical.length}`,
      budget.status === 'feasible'
        ? 'Budget covers essential floors'
        : `Budget is short by ₹${budget.gap.toLocaleString('en-IN')}`,
      highRisks > 0 ? `${highRisks} high-severity risk flag(s)` : 'No high-severity risks',
    ],
  };
}
