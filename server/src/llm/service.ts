/**
 * Resilience layer around the AI provider.
 *
 * Responsibilities: cache successful answers, deduplicate in-flight work, fall
 * back on any provider failure, and never cache invalid output.
 * FR IDs: FR-AI-003, FR-AI-005, FR-SEC-004.
 */

import type { AssistantReply, Idea, ReviewRisk } from '../../../src/api/types.js';
import type { AssistantRequestInput, IdeasRequestInput, PlanDigestInput } from '../schemas.js';
import type { LlmProvider } from './provider.js';

/** AI result with provenance for the UI. */
export interface AiResult<T> {
  data: T;
  source: 'gemini' | 'fallback';
  model?: string;
}

interface CacheEntry {
  value: AiResult<unknown>;
  expiresAt: number;
}

/**
 * Wraps a primary provider with a deterministic fallback and a bounded cache.
 */
export class AiService {
  readonly #primary: LlmProvider | null;
  readonly #fallback: LlmProvider;
  readonly #ttlMs: number;
  readonly #maxEntries: number;
  readonly #cache = new Map<string, CacheEntry>();
  readonly #inflight = new Map<string, Promise<AiResult<unknown>>>();
  readonly #onFallback: (error: unknown) => void;

  constructor(options: {
    primary: LlmProvider | null;
    fallback: LlmProvider;
    ttlMs: number;
    maxEntries?: number;
    onFallback?: (error: unknown) => void;
  }) {
    this.#primary = options.primary;
    this.#fallback = options.fallback;
    this.#ttlMs = options.ttlMs;
    this.#maxEntries = options.maxEntries ?? 200;
    this.#onFallback = options.onFallback ?? (() => undefined);
  }

  #key(feature: string, payload: unknown): string {
    return `${feature}:${JSON.stringify(payload)}`;
  }

  #read<T>(key: string): AiResult<T> | undefined {
    const entry = this.#cache.get(key);
    if (!entry) return undefined;
    if (entry.expiresAt <= Date.now()) {
      this.#cache.delete(key);
      return undefined;
    }
    this.#cache.delete(key);
    this.#cache.set(key, entry);
    return entry.value as AiResult<T>;
  }

  #write<T>(key: string, value: AiResult<T>): void {
    this.#cache.set(key, { value, expiresAt: Date.now() + this.#ttlMs });
    while (this.#cache.size > this.#maxEntries) {
      const oldest = this.#cache.keys().next().value;
      if (!oldest) break;
      this.#cache.delete(oldest);
    }
  }

  async #run<T>(
    key: string,
    primary: (() => Promise<T>) | null,
    fallback: () => Promise<T>,
    primaryModel?: string,
  ): Promise<AiResult<T>> {
    const cached = this.#read<T>(key);
    if (cached) return cached;

    const pending = this.#inflight.get(key);
    if (pending) return pending as Promise<AiResult<T>>;

    const work = (async (): Promise<AiResult<T>> => {
      if (!primary) {
        const data = await fallback();
        const result: AiResult<T> = { data, source: 'fallback' };
        this.#write(key, result);
        return result;
      }
      try {
        const data = await primary();
        const result: AiResult<T> = {
          data,
          source: 'gemini',
          ...(primaryModel ? { model: primaryModel } : {}),
        };
        this.#write(key, result);
        return result;
      } catch (error) {
        this.#onFallback(error);
        const data = await fallback();
        const result: AiResult<T> = { data, source: 'fallback' };
        this.#write(key, result);
        return result;
      } finally {
        this.#inflight.delete(key);
      }
    })();

    this.#inflight.set(key, work as Promise<AiResult<unknown>>);
    return work;
  }

  ideas(request: IdeasRequestInput): Promise<AiResult<Idea[]>> {
    const primary = this.#primary;
    return this.#run(
      this.#key('ideas', request),
      primary ? () => primary.generateIdeas(request) : null,
      () => this.#fallback.generateIdeas(request),
      primary?.model,
    );
  }

  assistant(request: AssistantRequestInput): Promise<AiResult<AssistantReply>> {
    const primary = this.#primary;
    return this.#run(
      this.#key('assistant', request),
      primary ? () => primary.generateAssistant(request) : null,
      () => this.#fallback.generateAssistant(request),
      primary?.model,
    );
  }

  review(plan: PlanDigestInput, locale: 'en' | 'hi' | 'bn'): Promise<AiResult<ReviewRisk[]>> {
    const primary = this.#primary;
    return this.#run(
      this.#key('review', { plan, locale }),
      primary ? () => primary.generateReview(plan, locale) : null,
      () => this.#fallback.generateReview(plan, locale),
      primary?.model,
    );
  }
}
