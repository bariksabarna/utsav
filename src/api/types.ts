/**
 * HTTP API contracts shared by the client and server.
 *
 * Responsibilities: describe request and response payloads without importing
 * runtime validation code into the initial client bundle.
 * FR IDs: FR-IDE-001, FR-AST-001, FR-DSH-004.
 */

/** Idea categories returned by the AI or curated fallback bank. */
export type IdeaCategory = 'theme' | 'menu' | 'decor' | 'entertainment' | 'favours' | 'activity';

/** Cost bands used on idea cards. */
export type CostBand = 'low' | 'medium' | 'high';

/** Effort labels used on idea cards. */
export type Effort = 'easy' | 'moderate' | 'involved';

/** A personalised idea returned by the API. */
export interface Idea {
  id: string;
  category: IdeaCategory;
  title: string;
  description: string;
  whyItFits: string;
  costBand: CostBand;
  effort: Effort;
  tasks?: string[];
}

/** Compact context sent to the ideas endpoint. */
export interface ContextDigest {
  eventType: 'Wedding' | 'Birthday' | 'Community Event';
  subType: string;
  guests: number;
  budget: number;
  cityTier: 1 | 2 | 3;
  venue: string;
  dietary: string[];
  language: string;
  season: 'summer' | 'monsoon' | 'autumn' | 'winter';
  focus?: string;
}

/** Ideas request payload. */
export interface IdeasRequest {
  context: ContextDigest;
  focus?: string;
  count: number;
  lockedIds: string[];
  locale: 'en' | 'hi' | 'bn';
}

/** Ideas response payload. */
export interface IdeasResponse {
  ideas: Idea[];
  source: 'gemini' | 'fallback';
  model?: string;
}

/** A budget line in the plan digest. */
export interface DigestBudgetLine {
  categoryId: string;
  label: string;
  planned: number;
}

/** Compact plan sent to assistant and review endpoints. */
export interface PlanDigest {
  eventType: string;
  subType: string;
  date: string;
  guests: number;
  budget: number;
  cityTier: 1 | 2 | 3;
  venue: string;
  dietary: string[];
  budgetLines: DigestBudgetLine[];
  topTasks: string[];
  risks: string[];
}

/** Chat message sent to the assistant. */
export interface AssistantMessage {
  role: 'user' | 'assistant';
  content: string;
}

/** Assistant request payload. */
export interface AssistantRequest {
  messages: AssistantMessage[];
  plan: PlanDigest;
  locale: 'en' | 'hi' | 'bn';
}

/** A validated proposal that the client may apply after confirmation. */
export type PlanPatch =
  | { kind: 'budget'; categoryId: string; newPlanned: number; reason: string }
  | {
      kind: 'task-add';
      task: {
        title: string;
        categoryId: string;
        due: string;
        phase: string;
        durationDays: number;
        dependsOn: string[];
      };
      reason: string;
    }
  | { kind: 'task-reschedule'; taskId: string; newDue: string; reason: string }
  | { kind: 'vendor-category-add'; categoryId: string; reason: string }
  | { kind: 'ideas-shortlist'; ideaIds: string[]; reason: string };

/** Assistant response before streaming. */
export interface AssistantReply {
  text: string;
  patch?: PlanPatch;
}

/** A single plan-review risk. */
export interface ReviewRisk {
  id: string;
  level: 'low' | 'medium' | 'high';
  title: string;
  detail: string;
  fix: string;
}

/** Plan review response. */
export interface ReviewResponse {
  risks: ReviewRisk[];
  source: 'gemini' | 'fallback';
  model?: string;
}
