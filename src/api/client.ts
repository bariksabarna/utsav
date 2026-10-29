/**
 * Browser client for the Utsav API.
 *
 * Responsibilities: bound request time, validate response shapes before use,
 * and stream assistant events without trusting server text blindly.
 * FR IDs: FR-IDE-001, FR-AST-001, FR-AI-005.
 */

import type {
  AssistantRequest,
  AssistantReply,
  Idea,
  IdeasRequest,
  IdeasResponse,
  PlanPatch,
  ReviewResponse,
  ReviewRisk,
} from './types';

const API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? '';
const REQUEST_TIMEOUT_MS = 25_000;

/** An API problem rendered safely in the UI. */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

/** Assistant stream event union. */
export type AssistantEvent =
  | { type: 'meta'; data: { source: 'gemini' | 'fallback'; model: string | null } }
  | { type: 'token'; data: { text: string } }
  | { type: 'patch'; data: PlanPatch }
  | { type: 'done'; data: { ok: boolean } };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isIdea(value: unknown): value is Idea {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === 'string' &&
    typeof value.category === 'string' &&
    typeof value.title === 'string' &&
    typeof value.description === 'string' &&
    typeof value.whyItFits === 'string' &&
    typeof value.costBand === 'string' &&
    typeof value.effort === 'string'
  );
}

function isPatch(value: unknown): value is PlanPatch {
  if (!isRecord(value) || typeof value.kind !== 'string') return false;
  if (value.kind === 'budget') {
    return (
      typeof value.categoryId === 'string' &&
      typeof value.newPlanned === 'number' &&
      typeof value.reason === 'string'
    );
  }
  if (value.kind === 'task-add') {
    return isRecord(value.task) && typeof value.task.title === 'string';
  }
  if (value.kind === 'task-reschedule') {
    return typeof value.taskId === 'string' && typeof value.newDue === 'string';
  }
  if (value.kind === 'vendor-category-add') {
    return typeof value.categoryId === 'string';
  }
  if (value.kind === 'ideas-shortlist') {
    return Array.isArray(value.ideaIds);
  }
  return false;
}

async function fetchJson<T>(
  path: string,
  body: unknown,
  validate: (value: unknown) => T,
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(`${API_BASE}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!response.ok) {
      const problem = (await response.json().catch(() => ({}))) as Record<string, unknown>;
      throw new ApiError(
        response.status,
        typeof problem.code === 'string' ? problem.code : 'REQUEST_FAILED',
        typeof problem.detail === 'string' ? problem.detail : 'The request could not be completed.',
      );
    }
    return validate(await response.json());
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new ApiError(408, 'TIMEOUT', 'The AI service took too long. Curated fallback ideas are still available offline.');
    }
    throw new ApiError(0, 'NETWORK_ERROR', 'The AI service is unreachable. The planner still works offline.');
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Requests personalised ideas.
 *
 * @param request - Validated ideas request
 * @returns Ideas with provenance
 */
export async function fetchIdeas(request: IdeasRequest): Promise<IdeasResponse> {
  return fetchJson('/api/ideas', request, (value) => {
    if (!isRecord(value) || !Array.isArray(value.ideas)) {
      throw new ApiError(502, 'INVALID_RESPONSE', 'The ideas response was not valid.');
    }
    const ideas = value.ideas.filter(isIdea).slice(0, 6);
    if (ideas.length === 0) {
      throw new ApiError(502, 'INVALID_RESPONSE', 'The ideas response was empty.');
    }
    return {
      ideas,
      source: value.source === 'gemini' ? 'gemini' : 'fallback',
    };
  });
}

/**
 * Requests a plan review.
 *
 * @param plan - Plan digest
 * @param locale - Response language
 * @returns Risks with provenance
 */
export async function fetchReview(
  plan: AssistantRequest['plan'],
  locale: AssistantRequest['locale'],
): Promise<ReviewResponse> {
  return fetchJson('/api/review', { plan, locale }, (value) => {
    if (!isRecord(value) || !Array.isArray(value.risks)) {
      throw new ApiError(502, 'INVALID_RESPONSE', 'The review response was not valid.');
    }
    const risks = value.risks.filter((risk): risk is ReviewRisk => {
      if (!isRecord(risk)) return false;
      return (
        typeof risk.id === 'string' &&
        typeof risk.level === 'string' &&
        typeof risk.title === 'string' &&
        typeof risk.detail === 'string' &&
        typeof risk.fix === 'string'
      );
    });
    return { risks, source: value.source === 'gemini' ? 'gemini' : 'fallback' };
  });
}

function parseFrame(frame: string): AssistantEvent | null {
  let event = 'message';
  const data: string[] = [];
  for (const line of frame.split('\n')) {
    if (line.startsWith('event:')) event = line.slice(6).trim();
    if (line.startsWith('data:')) data.push(line.slice(5).trim());
  }
  if (data.length === 0) return null;
  let payload: unknown;
  try {
    payload = JSON.parse(data.join('\n')) as unknown;
  } catch {
    return null;
  }
  if (event === 'meta' && isRecord(payload) && (payload.source === 'gemini' || payload.source === 'fallback')) {
    return {
      type: 'meta',
      data: {
        source: payload.source,
        model: typeof payload.model === 'string' ? payload.model : null,
      },
    };
  }
  if (event === 'token' && isRecord(payload) && typeof payload.text === 'string') {
    return { type: 'token', data: { text: payload.text } };
  }
  if (event === 'patch' && isPatch(payload)) {
    return { type: 'patch', data: payload };
  }
  if (event === 'done') {
    return { type: 'done', data: { ok: true } };
  }
  return null;
}

/**
 * Streams an assistant reply.
 *
 * @param request - Validated assistant request
 * @param onEvent - Called for every valid SSE event
 * @param signal - Optional caller cancellation
 */
export async function streamAssistant(
  request: AssistantRequest,
  onEvent: (event: AssistantEvent) => void,
  signal?: AbortSignal,
): Promise<void> {
  const response = await fetch(`${API_BASE}/api/assistant`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
    ...(signal ? { signal } : {}),
  });
  if (!response.ok || !response.body) {
    const problem = (await response.json().catch(() => ({}))) as Record<string, unknown>;
    throw new ApiError(
      response.status,
      typeof problem.code === 'string' ? problem.code : 'ASSISTANT_FAILED',
      typeof problem.detail === 'string' ? problem.detail : 'The assistant could not answer.',
    );
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let split = buffer.indexOf('\n\n');
    while (split !== -1) {
      const frame = buffer.slice(0, split);
      buffer = buffer.slice(split + 2);
      const event = parseFrame(frame);
      if (event) onEvent(event);
      split = buffer.indexOf('\n\n');
    }
  }
}

/**
 * Builds an assistant request from local chat state.
 *
 * @param messages - Visible conversation
 * @param plan - Plan digest
 * @param locale - Response language
 * @returns Request body
 */
export function assistantRequest(
  messages: AssistantRequest['messages'],
  plan: AssistantRequest['plan'],
  locale: AssistantRequest['locale'],
): AssistantRequest {
  return { messages: messages.slice(-12), plan, locale };
}

export type { AssistantReply };
