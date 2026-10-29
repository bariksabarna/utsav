// @vitest-environment node
/**
 * API integration tests.
 *
 * Responsibilities: prove validation, security boundaries, SSE framing, and the
 * fallback path without any live model or network call.
 * FR IDs: FR-IDE-001, FR-AST-001, FR-SEC-002, FR-SEC-003.
 */

import pino from 'pino';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { readConfig } from '../src/config.js';
import { FallbackProvider } from '../src/llm/fallback.js';
import type { LlmProvider } from '../src/llm/provider.js';
import { AiService } from '../src/llm/service.js';

const digest = {
  eventType: 'Wedding' as const,
  subType: 'Traditional wedding',
  guests: 220,
  budget: 900000,
  cityTier: 2 as const,
  venue: 'Banquet hall',
  dietary: ['Vegetarian'],
  language: 'English',
  season: 'winter' as const,
};

const plan = {
  eventType: 'Wedding',
  subType: 'Traditional wedding',
  date: '2026-12-12',
  guests: 220,
  budget: 900000,
  cityTier: 2 as const,
  venue: 'Banquet hall',
  dietary: ['Vegetarian'],
  budgetLines: [
    { categoryId: 'catering', label: 'Catering', planned: 360000 },
    { categoryId: 'venue', label: 'Venue', planned: 220000 },
  ],
  topTasks: ['Confirm venue', 'Book caterer'],
  risks: ['Monsoon backup needed'],
};

class FakeProvider implements LlmProvider {
  readonly name = 'fake';
  readonly model = 'fake-model';

  async generateIdeas() {
    return [
      {
        id: 'theme-test',
        category: 'theme' as const,
        title: 'Test idea',
        description: 'A useful test idea.',
        whyItFits: 'It proves the route works.',
        costBand: 'low' as const,
        effort: 'easy' as const,
      },
    ];
  }

  async generateAssistant() {
    return {
      text: 'Confirm the caterer and keep contingency untouched.',
      patch: {
        kind: 'task-add' as const,
        task: {
          title: 'Confirm caterer in writing',
          categoryId: 'catering',
          due: '2026-11-01',
          phase: 'Booking',
          durationDays: 0,
          dependsOn: [],
        },
        reason: 'Written confirmation protects the menu and price.',
      },
    };
  }

  async generateReview() {
    return [
      {
        id: 'review-test',
        level: 'medium' as const,
        title: 'Test risk',
        detail: 'A test risk detail.',
        fix: 'Apply the test fix.',
      },
    ];
  }
}

class BrokenProvider extends FakeProvider {
  override async generateIdeas(): Promise<never> {
    throw new Error('provider down');
  }
}

const config = {
  ...readConfig({ NODE_ENV: 'test', ALLOWED_ORIGINS: 'http://localhost:5173' }),
  geminiApiKey: '',
};

const logger = pino({ level: 'silent' });

function appWith(service: AiService) {
  return createApp({ config, service, logger });
}

describe('Utsav API', () => {
  it('reports health without touching the AI layer', async () => {
    const response = await request(appWith(new AiService({ primary: new FakeProvider(), fallback: new FallbackProvider(), ttlMs: 1000 }))).get(
      '/api/health',
    );
    expect(response.status).toBe(200);
    expect(response.body.status).toBe('ok');
    expect(response.body.ai).toBe('fallback');
  });

  it('returns ideas from the configured provider', async () => {
    const response = await request(appWith(new AiService({ primary: new FakeProvider(), fallback: new FallbackProvider(), ttlMs: 1000 })))
      .post('/api/ideas')
      .set('Origin', 'http://localhost:5173')
      .send({ context: digest, count: 2, lockedIds: [], locale: 'en' });
    expect(response.status).toBe(200);
    expect(response.body.source).toBe('gemini');
    expect(response.body.ideas).toHaveLength(1);
    expect(response.body.ideas[0].id).toBe('theme-test');
  });

  it('rejects invalid bodies with problem details', async () => {
    const response = await request(appWith(new AiService({ primary: new FakeProvider(), fallback: new FallbackProvider(), ttlMs: 1000 })))
      .post('/api/ideas')
      .send({ context: { ...digest, guests: -1 }, count: 99, lockedIds: [], locale: 'en' });
    expect(response.status).toBe(400);
    expect(response.type).toContain('application/problem+json');
    expect(response.body.code).toBe('VALIDATION_ERROR');
  });

  it('requires a JSON content type for writes', async () => {
    const response = await request(appWith(new AiService({ primary: new FakeProvider(), fallback: new FallbackProvider(), ttlMs: 1000 })))
      .post('/api/ideas')
      .set('Content-Type', 'text/plain')
      .send('not json');
    expect(response.status).toBe(415);
    expect(response.body.code).toBe('UNSUPPORTED_MEDIA_TYPE');
  });

  it('blocks unknown origins', async () => {
    const response = await request(appWith(new AiService({ primary: new FakeProvider(), fallback: new FallbackProvider(), ttlMs: 1000 })))
      .get('/api/health')
      .set('Origin', 'https://evil.example');
    expect(response.status).toBe(403);
    expect(response.body.code).toBe('ORIGIN_NOT_ALLOWED');
  });

  it('streams assistant tokens, one patch, and done', async () => {
    const response = await request(appWith(new AiService({ primary: new FakeProvider(), fallback: new FallbackProvider(), ttlMs: 1000 })))
      .post('/api/assistant')
      .send({ messages: [{ role: 'user', content: 'What next?' }], plan, locale: 'en' });
    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toContain('text/event-stream');
    expect(response.text).toContain('event: meta');
    expect(response.text).toContain('event: token');
    expect(response.text).toContain('event: patch');
    expect(response.text).toContain('event: done');
    expect(response.text).toContain('Confirm the caterer');
  });

  it('falls back when the provider fails', async () => {
    const response = await request(appWith(new AiService({ primary: new BrokenProvider(), fallback: new FallbackProvider(), ttlMs: 1000 })))
      .post('/api/ideas')
      .send({ context: digest, count: 3, lockedIds: [], locale: 'en' });
    expect(response.status).toBe(200);
    expect(response.body.source).toBe('fallback');
    expect(response.body.ideas.length).toBe(3);
  });

  it('returns review risks from the provider', async () => {
    const response = await request(appWith(new AiService({ primary: new FakeProvider(), fallback: new FallbackProvider(), ttlMs: 1000 })))
      .post('/api/review')
      .send({ plan, locale: 'en' });
    expect(response.status).toBe(200);
    expect(response.body.source).toBe('gemini');
    expect(response.body.risks[0].id).toBe('review-test');
  });

  it('sets security headers and a request id', async () => {
    const response = await request(appWith(new AiService({ primary: new FakeProvider(), fallback: new FallbackProvider(), ttlMs: 1000 }))).get(
      '/api/health',
    );
    expect(response.headers['x-content-type-options']).toBe('nosniff');
    expect(response.headers['referrer-policy']).toBe('no-referrer');
    expect(response.headers['content-security-policy']).toContain("default-src 'self'");
    expect(response.headers['x-request-id']).toBeTruthy();
  });

  it('rejects oversized JSON bodies', async () => {
    const response = await request(appWith(new AiService({ primary: new FakeProvider(), fallback: new FallbackProvider(), ttlMs: 1000 })))
      .post('/api/ideas')
      .send({ context: digest, count: 1, lockedIds: [], locale: 'en', focus: 'x'.repeat(40000) });
    expect(response.status).toBe(413);
    expect(response.body.code).toBe('PAYLOAD_TOO_LARGE');
  });

  it('rate limits AI routes', async () => {
    const app = createApp({
      config: { ...config, aiRequestsPerMinute: 1 },
      service: new AiService({ primary: new FakeProvider(), fallback: new FallbackProvider(), ttlMs: 1000 }),
      logger,
    });
    const body = { context: digest, count: 2, lockedIds: [], locale: 'en' };
    expect((await request(app).post('/api/ideas').send(body)).status).toBe(200);
    const blocked = await request(app).post('/api/ideas').send(body);
    expect(blocked.status).toBe(429);
    expect(blocked.body.code).toBe('RATE_LIMITED');
  });

  it('returns a problem for unknown API routes', async () => {
    const response = await request(appWith(new AiService({ primary: new FakeProvider(), fallback: new FallbackProvider(), ttlMs: 1000 }))).get(
      '/api/missing',
    );
    expect(response.status).toBe(404);
    expect(response.body.code).toBe('NOT_FOUND');
  });
});
