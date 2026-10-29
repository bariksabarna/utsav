/**
 * Strict request and response schemas for the Utsav API.
 *
 * Responsibilities: reject malformed or oversized input at the trust boundary
 * before any prompt construction or model call.
 * FR IDs: FR-SEC-003, FR-IDE-001, FR-AST-001, FR-DSH-004.
 */

import { z } from 'zod';

const locale = z.enum(['en', 'hi', 'bn']);
const cityTier = z.union([z.literal(1), z.literal(2), z.literal(3)]);
const eventType = z.enum(['Wedding', 'Birthday', 'Community Event']);
const category = z.enum(['theme', 'menu', 'decor', 'entertainment', 'favours', 'activity']);
const costBand = z.enum(['low', 'medium', 'high']);
const effort = z.enum(['easy', 'moderate', 'involved']);
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected YYYY-MM-DD');

/** Validated idea shape returned by the model. */
export const IdeaSchema = z.object({
  id: z.string().min(1).max(64),
  category,
  title: z.string().min(1).max(90),
  description: z.string().min(1).max(280),
  whyItFits: z.string().min(1).max(180),
  costBand,
  effort,
  tasks: z.array(z.string().min(1).max(90)).max(5).optional(),
});

/** Validated idea list from the model. */
export const IdeasResponseSchema = z.object({
  ideas: z.array(IdeaSchema).min(1).max(6),
});

/** Compact planning context accepted by the ideas endpoint. */
export const ContextDigestSchema = z.object({
  eventType,
  subType: z.string().min(1).max(80),
  guests: z.number().int().min(1).max(5000),
  budget: z.number().int().min(1000).max(100_000_000),
  cityTier,
  venue: z.string().min(1).max(80),
  dietary: z.array(z.string().min(1).max(40)).max(8),
  language: z.string().min(1).max(40),
  season: z.enum(['summer', 'monsoon', 'autumn', 'winter']),
  focus: z.string().max(120).optional(),
});

/** Ideas request body. */
export const IdeasRequestSchema = z.object({
  context: ContextDigestSchema,
  focus: z.string().max(120).optional(),
  count: z.number().int().min(1).max(6),
  lockedIds: z.array(z.string().min(1).max(64)).max(20),
  locale,
});

/** Budget line inside a plan digest. */
export const DigestBudgetLineSchema = z.object({
  categoryId: z.string().min(1).max(60),
  label: z.string().min(1).max(80),
  planned: z.number().int().min(0).max(100_000_000),
});

/** Plan digest accepted by assistant and review endpoints. */
export const PlanDigestSchema = z.object({
  eventType: z.string().min(1).max(80),
  subType: z.string().min(1).max(80),
  date: isoDate,
  guests: z.number().int().min(1).max(5000),
  budget: z.number().int().min(1000).max(100_000_000),
  cityTier,
  venue: z.string().min(1).max(80),
  dietary: z.array(z.string().min(1).max(40)).max(8),
  budgetLines: z.array(DigestBudgetLineSchema).max(32),
  topTasks: z.array(z.string().min(1).max(140)).max(12),
  risks: z.array(z.string().min(1).max(180)).max(12),
});

/** Assistant message. */
export const AssistantMessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().min(1).max(1000),
});

/** Assistant request body. */
export const AssistantRequestSchema = z.object({
  messages: z.array(AssistantMessageSchema).min(1).max(12),
  plan: PlanDigestSchema,
  locale,
});

/** Validated patch proposal. The client must confirm before applying. */
export const PlanPatchSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('budget'),
    categoryId: z.string().min(1).max(60),
    newPlanned: z.number().int().min(0).max(100_000_000),
    reason: z.string().min(1).max(180),
  }),
  z.object({
    kind: z.literal('task-add'),
    task: z.object({
      title: z.string().min(1).max(140),
      categoryId: z.string().min(1).max(60),
      due: isoDate,
      phase: z.string().min(1).max(60),
      durationDays: z.number().int().min(0).max(180),
      dependsOn: z.array(z.string().min(1).max(60)).max(6),
    }),
    reason: z.string().min(1).max(180),
  }),
  z.object({
    kind: z.literal('task-reschedule'),
    taskId: z.string().min(1).max(60),
    newDue: isoDate,
    reason: z.string().min(1).max(180),
  }),
  z.object({
    kind: z.literal('vendor-category-add'),
    categoryId: z.string().min(1).max(60),
    reason: z.string().min(1).max(180),
  }),
  z.object({
    kind: z.literal('ideas-shortlist'),
    ideaIds: z.array(z.string().min(1).max(64)).min(1).max(12),
    reason: z.string().min(1).max(180),
  }),
]);

/** Model assistant payload before it is streamed to the client. */
export const AssistantReplySchema = z.object({
  text: z.string().min(1).max(4000),
  patch: PlanPatchSchema.optional(),
});

/** A single plan-review risk. */
export const ReviewRiskSchema = z.object({
  id: z.string().min(1).max(64),
  level: z.enum(['low', 'medium', 'high']),
  title: z.string().min(1).max(90),
  detail: z.string().min(1).max(220),
  fix: z.string().min(1).max(180),
});

/** Plan review model payload. */
export const ReviewResponseSchema = z.object({
  risks: z.array(ReviewRiskSchema).max(8),
});

export type IdeasRequestInput = z.infer<typeof IdeasRequestSchema>;
export type AssistantRequestInput = z.infer<typeof AssistantRequestSchema>;
export type PlanDigestInput = z.infer<typeof PlanDigestSchema>;
export type PlanPatchInput = z.infer<typeof PlanPatchSchema>;
