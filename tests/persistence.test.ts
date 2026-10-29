/**
 * Persistence and saved-plan validation tests.
 *
 * FR IDs: FR-PER-001, FR-PER-002, FR-PER-005.
 */

import { describe, expect, it } from 'vitest';
import { defaultForm } from '../src/form';
import {
  clearState,
  describePatch,
  loadState,
  sanitizeForm,
  sanitizeSavedState,
  saveState,
  type SavedState,
} from '../src/persistence';

const state: SavedState = {
  version: 1,
  form: { ...defaultForm, budget: 800000, guests: 120 },
  vendorStatuses: { catering: 'Booked' },
  doneTaskIds: ['task-1'],
  theme: 'dark',
  budgetOverrides: { catering: 300000 },
  extraTasks: [
    {
      id: 'ai-1',
      title: 'Confirm caterer',
      categoryId: 'catering',
      due: '2026-12-01',
      phase: 'Booking',
      reason: 'Protect the menu price.',
    },
  ],
  dueOverrides: { 'task-2': '2026-12-02' },
  shortlistedIdeas: ['theme-1'],
  extraVendorCategories: ['permits'],
};

describe('saved plan validation', () => {
  it('clamps invalid form numbers and falls back for unknown values', () => {
    const form = sanitizeForm({
      eventType: 'Unknown',
      subType: 'Unknown',
      budget: -1,
      guests: 999999,
      cityTier: 9,
      date: 'not-a-date',
      language: 'Klingon',
      elderlyGuests: 'yes',
    });
    expect(form.eventType).toBe(defaultForm.eventType);
    expect(form.budget).toBe(50000);
    expect(form.guests).toBe(5000);
    expect(form.cityTier).toBe(3);
    expect(form.date).toBe(defaultForm.date);
    expect(form.language).toBe(defaultForm.language);
    expect(form.elderlyGuests).toBe(false);
  });

  it('rejects malformed saved documents', () => {
    expect(sanitizeSavedState(null)).toBeNull();
    expect(sanitizeSavedState({ version: 2 })).toBeNull();
  });

  it('round-trips a plan through local storage', () => {
    expect(saveState(state)).toBe(true);
    const loaded = loadState();
    expect(loaded?.form.budget).toBe(800000);
    expect(loaded?.vendorStatuses.catering).toBe('Booked');
    expect(loaded?.extraTasks[0]?.title).toBe('Confirm caterer');
  });

  it('ignores invalid vendor statuses and overrides', () => {
    const loaded = sanitizeSavedState({
      ...state,
      vendorStatuses: { catering: 'Teleported', venue: 'Booked' },
      dueOverrides: { 'task-2': 'soon' },
    });
    expect(loaded?.vendorStatuses).toEqual({ venue: 'Booked' });
    expect(loaded?.dueOverrides).toEqual({});
  });

  it('clears saved state', () => {
    saveState(state);
    clearState();
    expect(loadState()).toBeNull();
  });

  it('describes every patch kind', () => {
    expect(describePatch({ kind: 'budget', categoryId: 'catering', newPlanned: 1, reason: 'x' })).toContain('catering');
    expect(
      describePatch({
        kind: 'task-add',
        task: { title: 'Book', categoryId: 'venue', due: '2026-01-01', phase: 'Booking', durationDays: 0, dependsOn: [] },
        reason: 'x',
      }),
    ).toContain('Book');
    expect(describePatch({ kind: 'task-reschedule', taskId: 't1', newDue: '2026-01-02', reason: 'x' })).toContain('t1');
    expect(describePatch({ kind: 'vendor-category-add', categoryId: 'permits', reason: 'x' })).toContain('permits');
    expect(describePatch({ kind: 'ideas-shortlist', ideaIds: ['a', 'b'], reason: 'x' })).toContain('2');
  });
});
