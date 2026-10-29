/**
 * Browser API client tests.
 *
 * FR IDs: FR-IDE-001, FR-AST-001, FR-AI-005.
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError, assistantRequest, fetchIdeas, streamAssistant } from '../src/api/client';
import type { AssistantEvent } from '../src/api/client';

const request = {
  context: {
    eventType: 'Wedding' as const,
    subType: 'Bengali',
    guests: 200,
    budget: 1000000,
    cityTier: 1 as const,
    venue: 'Indoor Hall',
    dietary: ['Vegetarian'],
    language: 'English',
    season: 'winter' as const,
  },
  count: 2,
  lockedIds: [],
  locale: 'en' as const,
};

const plan = {
  eventType: 'Wedding',
  subType: 'Bengali',
  date: '2026-12-12',
  guests: 200,
  budget: 1000000,
  cityTier: 1 as const,
  venue: 'Indoor Hall',
  dietary: ['Vegetarian'],
  budgetLines: [{ categoryId: 'catering', label: 'Catering', planned: 400000 }],
  topTasks: ['Confirm venue'],
  risks: [],
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('API client', () => {
  it('validates and returns ideas', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            ideas: [
              {
                id: 'theme-1',
                category: 'theme',
                title: 'Heritage welcome',
                description: 'A warm arrival.',
                whyItFits: 'Fits the venue.',
                costBand: 'low',
                effort: 'easy',
              },
              { id: 'bad' },
            ],
            source: 'gemini',
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
      ),
    );
    const response = await fetchIdeas(request);
    expect(response.ideas).toHaveLength(1);
    expect(response.source).toBe('gemini');
  });

  it('rejects an empty or invalid ideas response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify({ ideas: [], source: 'gemini' }), { status: 200 })),
    );
    await expect(fetchIdeas(request)).rejects.toBeInstanceOf(ApiError);
  });

  it('surfaces safe problem details', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        new Response(JSON.stringify({ code: 'RATE_LIMITED', detail: 'Wait a minute.' }), { status: 429 }),
      ),
    );
    await expect(fetchIdeas(request)).rejects.toMatchObject({
      status: 429,
      code: 'RATE_LIMITED',
      message: 'Wait a minute.',
    });
  });

  it('parses streamed assistant events', async () => {
    const body = [
      'event: meta\ndata: {"source":"gemini","model":"gemini-test"}\n\n',
      'event: token\ndata: {"text":"Confirm "}\n\n',
      'event: token\ndata: {"text":"the venue."}\n\n',
      'event: patch\ndata: {"kind":"task-add","task":{"title":"Book venue","categoryId":"venue","due":"2026-11-01","phase":"Booking","durationDays":0,"dependsOn":[]},"reason":"Protect the date."}\n\n',
      'event: done\ndata: {"ok":true}\n\n',
    ].join('');
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(body, { status: 200, headers: { 'Content-Type': 'text/event-stream' } })),
    );
    const events: AssistantEvent[] = [];
    await streamAssistant(assistantRequest([{ role: 'user', content: 'What next?' }], plan, 'en'), (event) =>
      events.push(event),
    );
    expect(events.map((event) => event.type)).toEqual(['meta', 'token', 'token', 'patch', 'done']);
    expect(events.filter((event) => event.type === 'token').map((event) => (event.type === 'token' ? event.data.text : '')).join('')).toBe('Confirm the venue.');
  });

  it('ignores malformed stream frames', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('event: token\ndata: not-json\n\n', { status: 200 })),
    );
    const events: AssistantEvent[] = [];
    await streamAssistant(assistantRequest([{ role: 'user', content: 'Hi' }], plan, 'en'), (event) =>
      events.push(event),
    );
    expect(events).toHaveLength(0);
  });

  it('reports an unreachable service', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => Promise.reject(new Error('offline'))));
    await expect(fetchIdeas(request)).rejects.toMatchObject({ code: 'NETWORK_ERROR' });
  });
});
