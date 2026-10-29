/**
 * Integer budget allocation engine.
 *
 * Responsibilities: reserve contingency, apply priority and rule weights,
 * enforce essential floors, detect infeasibility, and allocate whole rupees
 * with largest-remainder rounding so the sum always equals the total budget.
 * FR IDs: FR-BUD-001 to FR-BUD-008.
 */

import type {
  BudgetLine,
  BudgetPlan,
  CategoryId,
  DerivedContext,
  PlanContext,
  Priority,
  RuleResult,
} from './types';

type Weights = Record<CategoryId, number>;

const labels: Record<CategoryId, string> = {
  venue: 'Venue',
  catering: 'Catering',
  decor: 'Decor',
  photography: 'Photography',
  attire: 'Attire & beauty',
  music: 'Music & entertainment',
  rituals: 'Rituals & priest',
  invitations: 'Invitations',
  transport: 'Transport',
  gifts: 'Gifts & favours',
  contingency: 'Contingency',
  permits: 'Permits & NOC',
  staffing: 'Staffing & volunteers',
  sound: 'Sound & lighting',
  activities: 'Games & activities',
  cake: 'Cake & desserts',
  travel: 'Travel',
  stay: 'Stay',
  security: 'Security & safety',
  livestream: 'Livestream',
};

function emptyWeights(): Weights {
  return {
    venue: 0,
    catering: 0,
    decor: 0,
    photography: 0,
    attire: 0,
    music: 0,
    rituals: 0,
    invitations: 0,
    transport: 0,
    gifts: 0,
    contingency: 0,
    permits: 0,
    staffing: 0,
    sound: 0,
    activities: 0,
    cake: 0,
    travel: 0,
    stay: 0,
    security: 0,
    livestream: 0,
  };
}

const baseWeights: Record<PlanContext['eventType'], Weights> = {
  Wedding: {
    ...emptyWeights(),
    venue: 30,
    catering: 26,
    decor: 12,
    photography: 12,
    attire: 7,
    music: 5,
    rituals: 3,
    invitations: 2,
    transport: 1,
    gifts: 1,
    security: 1,
  },
  Birthday: {
    ...emptyWeights(),
    venue: 22,
    catering: 20,
    decor: 16,
    activities: 12,
    cake: 8,
    photography: 7,
    gifts: 5,
    invitations: 4,
    music: 4,
    transport: 2,
  },
  'Community Event': {
    ...emptyWeights(),
    venue: 15,
    permits: 12,
    catering: 18,
    staffing: 16,
    decor: 15,
    sound: 8,
    security: 5,
    invitations: 4,
    transport: 3,
    gifts: 2,
    rituals: 2,
  },
};

const subTypeTweaks: Partial<Record<PlanContext['subType'], Partial<Weights>>> = {
  Bengali: { rituals: 2, catering: 3, decor: 1, attire: -2 },
  'North Indian': { rituals: 2, catering: 2, attire: -1, photography: 1 },
  'South Indian': { rituals: 3, catering: 2, decor: 1, music: -1 },
  Christian: { venue: 2, catering: 2, rituals: -1, music: 1 },
  Muslim: { catering: 3, rituals: 1, music: -1 },
  Court: { venue: -6, catering: -3, attire: 2, photography: 2, invitations: 2, gifts: 2 },
  Destination: { travel: 6, stay: 6, venue: -3, decor: -2, gifts: -2, invitations: -1 },
  Kids: { activities: 5, cake: 3, gifts: 2, venue: -3, music: -2 },
  Milestone: { decor: 3, photography: 2, cake: -1, activities: -1 },
  Surprise: { invitations: 2, activities: 2, decor: 1, venue: -1 },
  Puja: { permits: 2, rituals: 3, decor: 2, sound: 2 },
  'Society Fest': { activities: 3, sound: 2, permits: 2, staffing: 1 },
  Fundraiser: { permits: 2, staffing: 2, invitations: 2, gifts: -1 },
  'College Fest': { activities: 4, sound: 3, staffing: 2, permits: 2, rituals: -2 },
};

const priorityCategory: Record<Priority, CategoryId> = {
  Catering: 'catering',
  Photography: 'photography',
  Decor: 'decor',
  Music: 'music',
  Venue: 'venue',
  Attire: 'attire',
};

const priorityMultipliers = [1.25, 1.2, 1.15];

/** Clamps a weight to zero so tweaks cannot create negative budgets. */
function positive(value: number): number {
  return Math.max(0, value);
}

/**
 * Builds the weighted category map for a context.
 *
 * @param ctx - Validated plan context
 * @param firedRules - Rules that fired and may boost categories
 * @returns Non-negative category weights
 */
export function buildWeights(ctx: PlanContext, firedRules: RuleResult[]): Weights {
  const weights = { ...baseWeights[ctx.eventType] };
  const tweaks = subTypeTweaks[ctx.subType] ?? {};

  for (const [key, value] of Object.entries(tweaks)) {
    const category = key as CategoryId;
    weights[category] = positive(weights[category] + (value ?? 0));
  }

  ctx.priorities.slice(0, 3).forEach((priority, index) => {
    const category = priorityCategory[priority];
    weights[category] = positive(weights[category] * (priorityMultipliers[index] ?? 1));
  });

  for (const result of firedRules) {
    if (!result.budgetBoosts) {
      continue;
    }
    for (const [key, value] of Object.entries(result.budgetBoosts)) {
      const category = key as CategoryId;
      weights[category] = positive(weights[category] + (value ?? 0));
    }
  }

  weights.contingency = 0;
  return weights;
}

/** Distributes integer units proportionally with largest-remainder rounding. */
function largestRemainder(amount: number, weights: Weights): Weights {
  const categories = Object.keys(weights) as CategoryId[];
  const totalWeight = categories.reduce((sum, category) => sum + weights[category], 0);
  const result = emptyWeights();

  if (amount <= 0 || totalWeight <= 0) {
    return result;
  }

  const remainders: Array<{ category: CategoryId; remainder: number }> = [];
  let assigned = 0;

  for (const category of categories) {
    const raw = (amount * weights[category]) / totalWeight;
    const floor = Math.floor(raw);
    result[category] = floor;
    assigned += floor;
    remainders.push({ category, remainder: raw - floor });
  }

  remainders.sort((a, b) => b.remainder - a.remainder);

  for (let index = 0; index < amount - assigned; index += 1) {
    const entry = remainders[index % remainders.length];
    if (entry) {
      result[entry.category] += 1;
    }
  }

  return result;
}

/** Enforces minimum floors by pulling the shortfall from categories with slack. */
function enforceFloors(
  allocation: Weights,
  floors: Partial<Record<CategoryId, number>>,
): { allocation: Weights; paid: boolean } {
  const next = { ...allocation };
  const entries = Object.entries(floors) as Array<[CategoryId, number]>;

  for (const [category, floor] of entries) {
    const shortfall = floor - next[category];
    if (shortfall <= 0) {
      continue;
    }

    const donors = (Object.keys(next) as CategoryId[])
      .filter((candidate) => candidate !== category)
      .map((candidate) => ({ candidate, slack: next[candidate] - (floors[candidate] ?? 0) }))
      .filter((entry) => entry.slack > 0)
      .sort((a, b) => b.slack - a.slack);

    let remaining = shortfall;
    for (const donor of donors) {
      if (remaining <= 0) {
        break;
      }
      const take = Math.min(remaining, donor.slack);
      next[donor.candidate] -= take;
      next[category] += take;
      remaining -= take;
    }

    if (remaining > 0) {
      return { allocation: next, paid: false };
    }
  }

  return { allocation: next, paid: true };
}

/** Estimates a guest count that fits the available budget. */
function affordableGuests(ctx: PlanContext, derived: DerivedContext): number {
  const perGuest =
    ctx.guests > 0 ? (derived.cateringFloor + derived.venueFloor) / ctx.guests : 0;
  if (perGuest <= 0) {
    return ctx.guests;
  }
  return Math.max(1, Math.floor(ctx.budget / perGuest));
}

/**
 * Allocates a budget for a validated context.
 *
 * @param ctx - Validated plan context
 * @param derived - Derived planning values
 * @param firedRules - Rules that fired and may change weights
 * @returns Budget lines, totals, feasibility, gaps, and suggestions
 */
export function allocatePlanBudget(
  ctx: PlanContext,
  derived: DerivedContext,
  firedRules: RuleResult[],
): BudgetPlan {
  const weights = buildWeights(ctx, firedRules);
  const contingency = Math.round(ctx.budget * derived.contingencyRate);
  const available = Math.max(0, ctx.budget - contingency);
  const rawAllocation = largestRemainder(available, weights);
  const floors: Partial<Record<CategoryId, number>> = {
    venue: derived.venueFloor,
    catering: derived.cateringFloor,
  };
  const enforced = enforceFloors(rawAllocation, floors);
  const allocation = enforced.allocation;

  const lines: BudgetLine[] = (Object.keys(allocation) as CategoryId[])
    .filter((category) => allocation[category] > 0)
    .map((category) => ({
      categoryId: category,
      label: labels[category],
      planned: allocation[category],
      estimated: allocation[category],
      actual: allocation[category],
      floor: floors[category] ?? 0,
      status: 'on-track',
    }));

  if (contingency > 0) {
    lines.push({
      categoryId: 'contingency',
      label: labels.contingency,
      planned: contingency,
      estimated: contingency,
      actual: contingency,
      floor: 0,
      status: 'on-track',
    });
  }

  const gap = Math.max(0, derived.budgetGap);
  const feasible = !derived.infeasible && enforced.paid;
  const suggestions = feasible
    ? []
    : [
        `Reduce to about ${affordableGuests(ctx, derived)} guests`,
        ctx.venue === 'Home' || ctx.venue === 'Community Ground'
          ? 'Increase the total budget or add a sponsor'
          : 'Switch to a home or community venue',
        `Add about ₹${gap.toLocaleString('en-IN')} to cover the essentials gap`,
      ];

  return {
    lines,
    total: ctx.budget,
    perHead: derived.perHeadBudget,
    contingencyRate: derived.contingencyRate,
    contingency,
    status: feasible ? 'feasible' : 'infeasible',
    gap,
    suggestions,
    firedRuleIds: firedRules.map((result) => result.id),
  };
}
