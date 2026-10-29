/**
 * Converts an engine plan into compact API payloads.
 *
 * Responsibilities: cap arrays and strip fields the AI never needs so prompts
 * stay small and predictable.
 * FR IDs: FR-IDE-001, FR-AST-001, FR-DSH-004.
 */

import type { ContextDigest, PlanDigest } from './types';
import type { Plan } from '../engine/types';

/**
 * Maps the plan language label to an API locale.
 *
 * @param language - UI/plan language
 * @returns API locale code
 */
export function localeFor(language: Plan['context']['language']): 'en' | 'hi' | 'bn' {
  if (language === 'हिन्दी') return 'hi';
  if (language === 'বাংলা') return 'bn';
  return 'en';
}

/**
 * Derives a season label from the event month.
 *
 * @param month - One-based month
 * @returns Season used by the ideas API
 */
export function seasonFor(month: number): ContextDigest['season'] {
  if (month >= 3 && month <= 5) return 'summer';
  if (month >= 6 && month <= 9) return 'monsoon';
  if (month >= 10 && month <= 11) return 'autumn';
  return 'winter';
}

/**
 * Builds the ideas context digest.
 *
 * @param plan - Complete plan
 * @returns Bounded context payload
 */
export function toContextDigest(plan: Plan): ContextDigest {
  return {
    eventType: plan.context.eventType,
    subType: plan.context.subType,
    guests: plan.context.guests,
    budget: plan.context.budget,
    cityTier: plan.context.cityTier,
    venue: plan.context.venue,
    dietary: plan.context.dietary.slice(0, 8),
    language: plan.context.language,
    season: seasonFor(plan.derived.month),
  };
}

/**
 * Builds the assistant and review digest.
 *
 * @param plan - Complete plan
 * @returns Bounded plan payload
 */
export function toPlanDigest(plan: Plan): PlanDigest {
  return {
    eventType: plan.context.eventType,
    subType: plan.context.subType,
    date: plan.context.date,
    guests: plan.context.guests,
    budget: plan.context.budget,
    cityTier: plan.context.cityTier,
    venue: plan.context.venue,
    dietary: plan.context.dietary.slice(0, 8),
    budgetLines: plan.budget.lines.slice(0, 20).map((line) => ({
      categoryId: line.categoryId,
      label: line.label,
      planned: line.planned,
    })),
    topTasks: plan.tasks.slice(0, 8).map((task) => task.title),
    risks: plan.risks.slice(0, 8).map((risk) => `${risk.label}: ${risk.note}`),
  };
}
