/**
 * Export and import helper tests.
 *
 * FR IDs: FR-EXP-001, FR-EXP-002, FR-EXP-003.
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildSamplePlan } from '../src/engine/plan';
import { defaultForm } from '../src/form';
import { downloadCsv, downloadIcs, downloadState, printPlan, readPlanFile } from '../src/exports';
import type { SavedState } from '../src/persistence';

const state: SavedState = {
  version: 1,
  form: defaultForm,
  vendorStatuses: {},
  doneTaskIds: [],
  theme: 'light',
  budgetOverrides: {},
  extraTasks: [],
  dueOverrides: {},
  shortlistedIdeas: [],
  extraVendorCategories: [],
};

afterEach(() => {
  vi.restoreAllMocks();
});

function stubDownloads() {
  const blobs: Blob[] = [];
  vi.stubGlobal('URL', {
    ...URL,
    createObjectURL: vi.fn((blob: Blob) => {
      blobs.push(blob);
      return 'blob:test';
    }),
    revokeObjectURL: vi.fn(),
  });
  const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
  return { blobs, click };
}

describe('plan exports', () => {
  it('downloads a CSV with budget and task rows', () => {
    const { blobs, click } = stubDownloads();
    downloadCsv(buildSamplePlan('Wedding'));
    expect(click).toHaveBeenCalled();
    expect(blobs[0]?.type).toContain('text/csv');
  });

  it('downloads an ICS calendar file', () => {
    const { blobs, click } = stubDownloads();
    downloadIcs(buildSamplePlan('Birthday'));
    expect(click).toHaveBeenCalled();
    expect(blobs[0]?.type).toContain('text/calendar');
  });

  it('downloads the saved state as JSON', () => {
    const { blobs, click } = stubDownloads();
    downloadState(state);
    expect(click).toHaveBeenCalled();
    expect(blobs[0]?.type).toContain('application/json');
  });

  it('opens the print dialog', () => {
    const print = vi.spyOn(window, 'print').mockImplementation(() => undefined);
    printPlan();
    expect(print).toHaveBeenCalled();
  });

  it('reads a valid plan file and rejects malformed JSON', async () => {
    const valid = {
      text: async () => JSON.stringify(state),
    } as File;
    const loaded = await readPlanFile(valid);
    expect(loaded?.form.eventType).toBe(defaultForm.eventType);

    const broken = {
      text: async () => '{not json',
    } as File;
    expect(await readPlanFile(broken)).toBeNull();
  });
});
