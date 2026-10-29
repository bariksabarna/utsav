/**
 * Local persistence and saved-plan validation.
 *
 * Responsibilities: store planner state on this device, reject malformed saved
 * data, and keep the core planner working when storage is unavailable.
 * FR IDs: FR-PER-001, FR-PER-002, FR-PER-005.
 */

import type { PlanPatch } from './api/types';
import type { DietaryChoice, EventSubType, EventType, LanguageOption, Priority, VenueType, VendorStatus } from './engine/types';
import {
  defaultForm,
  dietaryOptions,
  languageOptions,
  priorityOptions,
  subTypeOptions,
  venueOptions,
  vendorStatusOptions,
  type FormState,
} from './form';

const STORAGE_KEY = 'utsav.state.v1';

/** A task added by an accepted AI patch. */
export interface ExtraTask {
  id: string;
  title: string;
  categoryId: string;
  due: string;
  phase: string;
  reason: string;
}

/** Everything persisted for a local plan. */
export interface SavedState {
  version: 1;
  form: FormState;
  vendorStatuses: Record<string, VendorStatus>;
  doneTaskIds: string[];
  theme: 'light' | 'dark';
  budgetOverrides: Record<string, number>;
  extraTasks: ExtraTask[];
  dueOverrides: Record<string, string>;
  shortlistedIdeas: string[];
  extraVendorCategories: string[];
}

function storage(): Storage | null {
  try {
    if (typeof window === 'undefined') return null;
    return window.localStorage;
  } catch {
    return null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function oneOf<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return typeof value === 'string' && (allowed as readonly string[]).includes(value)
    ? (value as T)
    : fallback;
}

function clampInt(value: unknown, fallback: number, min: number, max: number): number {
  const numeric = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.min(max, Math.max(min, Math.round(numeric)));
}

function isDate(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

/**
 * Validates and merges a stored form over defaults.
 *
 * @param raw - Unknown saved value
 * @returns Safe form state
 */
export function sanitizeForm(raw: unknown): FormState {
  if (!isRecord(raw)) return { ...defaultForm };
  const eventType = oneOf<EventType>(raw.eventType, ['Wedding', 'Birthday', 'Community Event'], defaultForm.eventType);
  const subType = oneOf<EventSubType>(raw.subType, subTypeOptions[eventType], subTypeOptions[eventType][0] ?? defaultForm.subType);

  return {
    eventType,
    subType,
    budget: clampInt(raw.budget, defaultForm.budget, 50_000, 100_000_000),
    guests: clampInt(raw.guests, defaultForm.guests, 1, 5000),
    children: clampInt(raw.children, defaultForm.children, 0, 1000),
    venue: oneOf<VenueType>(raw.venue, venueOptions, defaultForm.venue),
    cityTier: clampInt(raw.cityTier, defaultForm.cityTier, 1, 3) as 1 | 2 | 3,
    date: isDate(raw.date) ? raw.date : defaultForm.date,
    startTime: typeof raw.startTime === 'string' && /^\d{2}:\d{2}$/.test(raw.startTime) ? raw.startTime : defaultForm.startTime,
    dietary: oneOf<DietaryChoice>(raw.dietary, dietaryOptions, defaultForm.dietary),
    language: oneOf<LanguageOption>(raw.language, languageOptions, defaultForm.language),
    priority: oneOf<Priority | 'Balanced'>(raw.priority, priorityOptions, defaultForm.priority),
    elderlyGuests: raw.elderlyGuests === true,
    liveMusic: raw.liveMusic === true,
    servesAlcohol: raw.servesAlcohol === true,
    multiDay: raw.multiDay === true,
    livestream: raw.livestream === true,
  };
}

function sanitizeVendorStatuses(raw: unknown): Record<string, VendorStatus> {
  if (!isRecord(raw)) return {};
  const result: Record<string, VendorStatus> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (typeof value === 'string' && (vendorStatusOptions as string[]).includes(value)) {
      result[key.slice(0, 60)] = value as VendorStatus;
    }
  }
  return result;
}

function sanitizeNumberRecord(raw: unknown): Record<string, number> {
  if (!isRecord(raw)) return {};
  const result: Record<string, number> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (typeof value === 'number' && Number.isFinite(value) && value >= 0) {
      result[key.slice(0, 60)] = Math.round(value);
    }
  }
  return result;
}

function sanitizeStringRecord(raw: unknown): Record<string, string> {
  if (!isRecord(raw)) return {};
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (isDate(value)) result[key.slice(0, 60)] = value;
  }
  return result;
}

function sanitizeExtraTasks(raw: unknown): ExtraTask[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(isRecord)
    .filter(
      (task) =>
        typeof task.id === 'string' &&
        typeof task.title === 'string' &&
        typeof task.categoryId === 'string' &&
        isDate(task.due) &&
        typeof task.phase === 'string' &&
        typeof task.reason === 'string',
    )
    .slice(0, 40)
    .map((task) => ({
      id: String(task.id).slice(0, 80),
      title: String(task.title).slice(0, 140),
      categoryId: String(task.categoryId).slice(0, 60),
      due: String(task.due),
      phase: String(task.phase).slice(0, 60),
      reason: String(task.reason).slice(0, 180),
    }));
}

function sanitizeStringArray(raw: unknown, max: number): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((item): item is string => typeof item === 'string').slice(0, max);
}

/**
 * Validates an unknown saved-state document.
 *
 * @param raw - Parsed JSON value
 * @returns Safe state or null
 */
export function sanitizeSavedState(raw: unknown): SavedState | null {
  if (!isRecord(raw) || raw.version !== 1) return null;
  return {
    version: 1,
    form: sanitizeForm(raw.form),
    vendorStatuses: sanitizeVendorStatuses(raw.vendorStatuses),
    doneTaskIds: sanitizeStringArray(raw.doneTaskIds, 500),
    theme: raw.theme === 'dark' ? 'dark' : 'light',
    budgetOverrides: sanitizeNumberRecord(raw.budgetOverrides),
    extraTasks: sanitizeExtraTasks(raw.extraTasks),
    dueOverrides: sanitizeStringRecord(raw.dueOverrides),
    shortlistedIdeas: sanitizeStringArray(raw.shortlistedIdeas, 50),
    extraVendorCategories: sanitizeStringArray(raw.extraVendorCategories, 20),
  };
}

/**
 * Loads a saved state from this device.
 *
 * @returns Validated state or null
 */
export function loadState(): SavedState | null {
  const store = storage();
  if (!store) return null;
  try {
    const text = store.getItem(STORAGE_KEY);
    if (!text) return null;
    return sanitizeSavedState(JSON.parse(text) as unknown);
  } catch {
    return null;
  }
}

/**
 * Saves state without throwing when storage is full or blocked.
 *
 * @param state - Current planner state
 * @returns True when the write succeeded
 */
export function saveState(state: SavedState): boolean {
  const store = storage();
  if (!store) return false;
  try {
    store.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}

/** Removes the saved plan from this device. */
export function clearState(): void {
  const store = storage();
  if (!store) return;
  try {
    store.removeItem(STORAGE_KEY);
  } catch {
    // Storage may be blocked; the in-memory plan still works.
  }
}

/**
 * Builds the patch summary shown after a suggestion is accepted.
 *
 * @param patch - Accepted patch
 * @returns Plain-language summary
 */
export function describePatch(patch: PlanPatch): string {
  if (patch.kind === 'budget') return `${patch.categoryId} budget set to ₹ ${patch.newPlanned.toLocaleString('en-IN')}.`;
  if (patch.kind === 'task-add') return `Added task: ${patch.task.title}.`;
  if (patch.kind === 'task-reschedule') return `Moved task ${patch.taskId} to ${patch.newDue}.`;
  if (patch.kind === 'vendor-category-add') return `Added vendor category: ${patch.categoryId}.`;
  return `Shortlisted ${patch.ideaIds.length} idea(s).`;
}
