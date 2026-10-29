/**
 * Plan export, import, and print helpers.
 *
 * Responsibilities: produce portable CSV, JSON, and ICS files on device without
 * a server, and validate imported plan files before use.
 * FR IDs: FR-EXP-001, FR-EXP-002, FR-EXP-003, FR-PER-005.
 */

import type { Plan } from './engine/types';
import { sanitizeSavedState, type SavedState } from './persistence';

function download(filename: string, content: string, mime: string): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = 'noopener';
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function csvCell(value: string | number): string {
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function icsText(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
}

/**
 * Downloads the plan as CSV.
 *
 * @param plan - Complete plan
 */
export function downloadCsv(plan: Plan): void {
  const rows: Array<Array<string | number>> = [
    ['Type', 'Title', 'Phase', 'Due', 'Amount'],
    ...plan.budget.lines.map((line) => ['Budget', line.label, '', '', line.planned]),
    ...plan.tasks.map((task) => ['Task', task.title, task.phase, task.due, '']),
  ];
  const csv = rows.map((row) => row.map(csvCell).join(',')).join('\r\n');
  download('utsav-plan.csv', `\uFEFF${csv}`, 'text/csv;charset=utf-8');
}

/**
 * Downloads the saved plan state as JSON.
 *
 * @param state - Current app state
 */
export function downloadState(state: SavedState): void {
  download('utsav-plan.json', JSON.stringify(state, null, 2), 'application/json');
}

/**
 * Downloads a calendar file for the event.
 *
 * @param plan - Complete plan
 */
export function downloadIcs(plan: Plan): void {
  const [year = '2026', month = '01', day = '01'] = plan.context.date.split('-');
  const [hour = '18', minute = '00'] = plan.context.startTime.split(':');
  const start = `${year}${month}${day}T${hour}${minute}00`;
  const endHour = String((Number(hour) + 3) % 24).padStart(2, '0');
  const end = `${year}${month}${day}T${endHour}${minute}00`;
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Utsav//Event Planner//EN',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${plan.context.date}-${Date.now()}@utsav.local`,
    `DTSTAMP:${stamp}`,
    `DTSTART:${start}`,
    `DTEND:${end}`,
    `SUMMARY:${icsText(plan.context.title)}`,
    `DESCRIPTION:${icsText(`${plan.context.eventType} • ${plan.context.guests} guests • budget ₹${plan.context.budget.toLocaleString('en-IN')}`)}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ];
  download('utsav-event.ics', lines.join('\r\n'), 'text/calendar;charset=utf-8');
}

/**
 * Opens the browser print dialog.
 */
export function printPlan(): void {
  window.print();
}

/**
 * Reads and validates a saved plan file.
 *
 * @param file - User-selected JSON file
 * @returns Validated state or null
 */
export async function readPlanFile(file: File): Promise<SavedState | null> {
  try {
    const text = await file.text();
    return sanitizeSavedState(JSON.parse(text) as unknown);
  } catch {
    return null;
  }
}
