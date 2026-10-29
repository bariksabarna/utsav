/**
 * Validated plan input entry point.
 *
 * Responsibilities: parse untrusted external input before handing it to the
 * deterministic engine. Kept out of the client planning path so Zod is only
 * loaded when external JSON is imported.
 * FR IDs: FR-ONB-002, FR-PER-005.
 */

import { buildPlan } from './plan';
import { parsePlanContext } from './schema';
import type { Plan } from './types';

/**
 * Builds a plan from untrusted onboarding input.
 *
 * @param input - Untrusted plan context
 * @param today - Injected current date in YYYY-MM-DD form
 * @returns A validated, complete plan
 */
export function buildPlanFromInput(input: unknown, today?: string): Plan {
  return buildPlan(parsePlanContext(input), today);
}
