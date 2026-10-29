/**
 * Optional AI surface tests.
 *
 * FR IDs: FR-IDE-001, FR-IDE-003, FR-AST-001, FR-AST-004.
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AiPanel } from '../src/components/AiPanel';
import { buildSamplePlan } from '../src/engine/plan';
import { english, makeTranslator } from '../src/i18n';
import type { AssistantEvent } from '../src/api/client';
import type { Idea, PlanPatch, ReviewRisk } from '../src/api/types';

vi.mock('../src/api/client', () => ({
  assistantRequest: vi.fn(() => ({ messages: [], digest: {}, locale: 'en' })),
  fetchIdeas: vi.fn(),
  fetchReview: vi.fn(),
  streamAssistant: vi.fn(),
}));

const { fetchIdeas, fetchReview, streamAssistant } = await import('../src/api/client');

const idea: Idea = {
  id: 'idea-1',
  title: 'Low-waste floral decor',
  description: 'Reuse marigold installations across ceremonies.',
  category: 'decor',
  whyItFits: 'Keeps the budget and waste down.',
  costBand: 'medium',
  effort: 'moderate',
};

const risk: ReviewRisk = {
  id: 'risk-1',
  title: 'Catering buffer is thin',
  level: 'high',
  detail: 'Guest count may rise.',
  fix: 'Add a 10% catering buffer.',
};

const patch: PlanPatch = {
  kind: 'budget',
  categoryId: 'catering',
  newPlanned: 300000,
  reason: 'Protect the menu price.',
};

function renderPanel() {
  const onApplyPatch = vi.fn();
  const onShortlist = vi.fn();
  render(
    <AiPanel
      plan={buildSamplePlan('Wedding')}
      t={makeTranslator(english)}
      onApplyPatch={onApplyPatch}
      onShortlist={onShortlist}
      shortlisted={[]}
    />,
  );
  return { onApplyPatch, onShortlist };
}

beforeEach(() => {
  vi.mocked(fetchIdeas).mockReset();
  vi.mocked(fetchReview).mockReset();
  vi.mocked(streamAssistant).mockReset();
});

describe('AI panel', () => {
  it('loads curated ideas and supports locking and shortlisting', async () => {
    vi.mocked(fetchIdeas).mockResolvedValue({ source: 'fallback', ideas: [idea] });
    const { onShortlist } = renderPanel();
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: english.generateIdeas }));
    expect(await screen.findByText(idea.title)).toBeInTheDocument();
    expect(screen.getAllByText(english.sourceFallback).length).toBeGreaterThan(0);

    await user.click(screen.getByRole('checkbox', { name: english.lockIdea }));
    expect(screen.getByRole('checkbox', { name: english.lockIdea })).toBeChecked();
    await user.click(screen.getByRole('button', { name: english.shortlist }));
    expect(onShortlist).toHaveBeenCalledWith(idea.id);
  });

  it('shows an error when ideas cannot load', async () => {
    vi.mocked(fetchIdeas).mockRejectedValue({ message: 'Offline' });
    renderPanel();
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: english.generateIdeas }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Offline');
  });

  it('shows review risks', async () => {
    vi.mocked(fetchReview).mockResolvedValue({ source: 'gemini', risks: [risk] });
    renderPanel();
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: english.review }));
    expect(await screen.findByText(risk.title)).toBeInTheDocument();
    expect(screen.getByText(risk.fix)).toBeInTheDocument();
  });

  it('streams a reply and applies a confirmed patch', async () => {
    vi.mocked(streamAssistant).mockImplementation(async (_request: unknown, onEvent: (event: AssistantEvent) => void) => {
      onEvent({ type: 'meta', data: { source: 'gemini', model: null } });
      onEvent({ type: 'token', data: { text: 'Add a buffer.' } });
      onEvent({ type: 'patch', data: patch });
    });
    const { onApplyPatch } = renderPanel();
    const user = userEvent.setup();

    await user.type(screen.getByPlaceholderText(english.assistantPlaceholder), 'What next?');
    await user.click(screen.getByRole('button', { name: english.send }));
    expect(await screen.findByText('Add a buffer.')).toBeInTheDocument();
    expect(await screen.findByText(patch.reason)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: english.applyPatch }));
    expect(onApplyPatch).toHaveBeenCalledWith(patch);
    await waitFor(() => expect(screen.queryByText(patch.reason)).not.toBeInTheDocument());
  });
});
