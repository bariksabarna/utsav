/**
 * Provider contracts for Utsav AI features.
 *
 * Responsibilities: keep routes independent of Gemini and make deterministic
 * fallbacks interchangeable with the live model in tests.
 * FR IDs: FR-AI-003, FR-AI-005.
 */

import type { AssistantReply, Idea, ReviewRisk } from '../../../src/api/types.js';
import type { AssistantRequestInput, IdeasRequestInput, PlanDigestInput } from '../schemas.js';

/** Anything that can answer the three AI features. */
export interface LlmProvider {
  readonly name: string;
  readonly model?: string;
  generateIdeas(request: IdeasRequestInput): Promise<Idea[]>;
  generateAssistant(request: AssistantRequestInput): Promise<AssistantReply>;
  generateReview(plan: PlanDigestInput, locale: 'en' | 'hi' | 'bn'): Promise<ReviewRisk[]>;
}
