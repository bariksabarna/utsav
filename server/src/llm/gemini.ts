/**
 * Gemini provider for Utsav.
 *
 * Responsibilities: call Gemini with bounded prompts, a request timeout, strict
 * JSON validation, one repair retry, and a model fallback. Never trust model
 * output before validation.
 * FR IDs: FR-AI-001, FR-AI-002, FR-SEC-004.
 */

import { GoogleGenAI } from '@google/genai';
import type { AssistantReply, Idea, ReviewRisk } from '../../../src/api/types.js';
import {
  AssistantReplySchema,
  IdeasResponseSchema,
  ReviewResponseSchema,
  type AssistantRequestInput,
  type IdeasRequestInput,
  type PlanDigestInput,
} from '../schemas.js';
import { buildAssistantPrompt, buildIdeasPrompt, buildReviewPrompt, GUARDRAILS } from './prompts.js';
import type { LlmProvider } from './provider.js';

interface GeminiOptions {
  apiKey: string;
  models: string[];
  timeoutMs?: number;
}

interface ParsedResult<T> {
  value: T;
  model: string;
}

function slug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48);
}

function stripFence(text: string): string {
  return text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
}

/**
 * Live Gemini provider with strict structured-output validation.
 */
export class GeminiProvider implements LlmProvider {
  readonly name = 'gemini';
  readonly model: string;
  readonly #client: GoogleGenAI;
  readonly #models: string[];
  readonly #timeoutMs: number;

  constructor(options: GeminiOptions) {
    if (!options.apiKey) {
      throw new Error('GEMINI_API_KEY is required for GeminiProvider');
    }
    this.#client = new GoogleGenAI({ apiKey: options.apiKey });
    this.#models = options.models;
    this.model = options.models[0] ?? 'gemini-2.5-flash';
    this.#timeoutMs = options.timeoutMs ?? 20_000;
  }

  async #generateJson<T>(
    contents: string,
    parse: (value: unknown) => T,
  ): Promise<ParsedResult<T>> {
    let lastError: unknown;
    for (const model of this.#models) {
      for (let attempt = 0; attempt < 2; attempt += 1) {
        try {
          const controller = new AbortController();
          const timer = setTimeout(() => controller.abort(), this.#timeoutMs);
          try {
            const response = await this.#client.models.generateContent({
              model,
              contents,
              config: {
                systemInstruction: GUARDRAILS,
                responseMimeType: 'application/json',
                temperature: attempt === 0 ? 0.6 : 0.2,
                maxOutputTokens: 1400,
                abortSignal: controller.signal,
              },
            });
            const text = response.text;
            if (!text) throw new Error('Gemini returned an empty response');
            const parsed = JSON.parse(stripFence(text)) as unknown;
            return { value: parse(parsed), model };
          } finally {
            clearTimeout(timer);
          }
        } catch (error) {
          lastError = error;
        }
      }
    }
    throw lastError instanceof Error ? lastError : new Error('Gemini request failed');
  }

  async generateIdeas(request: IdeasRequestInput): Promise<Idea[]> {
    const prompt = buildIdeasPrompt(request);
    const { value } = await this.#generateJson(prompt.contents, (raw) =>
      IdeasResponseSchema.parse(raw).ideas,
    );
    return value.slice(0, request.count).map((idea) => {
      const normalized: Idea = {
        id: `${idea.category}-${slug(idea.title) || 'idea'}`,
        category: idea.category,
        title: idea.title,
        description: idea.description,
        whyItFits: idea.whyItFits,
        costBand: idea.costBand,
        effort: idea.effort,
      };
      if (idea.tasks && idea.tasks.length > 0) {
        normalized.tasks = idea.tasks;
      }
      return normalized;
    });
  }

  async generateAssistant(request: AssistantRequestInput): Promise<AssistantReply> {
    const prompt = buildAssistantPrompt(request);
    const { value } = await this.#generateJson(prompt.contents, (raw) =>
      AssistantReplySchema.parse(raw),
    );
    return value.patch ? { text: value.text, patch: value.patch } : { text: value.text };
  }

  async generateReview(
    plan: PlanDigestInput,
    locale: 'en' | 'hi' | 'bn',
  ): Promise<ReviewRisk[]> {
    const prompt = buildReviewPrompt(plan, locale);
    const { value } = await this.#generateJson(prompt.contents, (raw) =>
      ReviewResponseSchema.parse(raw).risks,
    );
    return value;
  }
}
