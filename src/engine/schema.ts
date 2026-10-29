/**
 * Zod validation at the untrusted input boundary.
 *
 * Responsibilities: validate onboarding payloads with strict object rules.
 * This module is kept separate from the planning engine so the client bundle
 * only pays for Zod when a plan is parsed from external input.
 * FR IDs: FR-ONB-002, FR-PER-005.
 */

import { z } from 'zod';
import type { EventSubType, PlanContext } from './types';

const eventTypes = ['Wedding', 'Birthday', 'Community Event'] as const;
const venues = [
  'Indoor Hall',
  'Outdoor',
  'Home',
  'Community Ground',
  'Destination',
] as const;
const languages = ['English', 'हिन्दी', 'বাংলা'] as const;
const dietaryChoices = [
  'Vegetarian',
  'Vegan',
  'Jain',
  'Halal',
  'No beef',
  'No pork',
  'Gluten-free',
  'Nut-free',
] as const;
const priorities = [
  'Catering',
  'Photography',
  'Decor',
  'Music',
  'Venue',
  'Attire',
] as const;
const subTypes: readonly EventSubType[] = [
  'Bengali',
  'North Indian',
  'South Indian',
  'Christian',
  'Muslim',
  'Court',
  'Destination',
  'Kids',
  'Milestone',
  'Surprise',
  'Puja',
  'Society Fest',
  'Fundraiser',
  'College Fest',
];

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD')
  .refine((value) => !Number.isNaN(Date.parse(`${value}T00:00:00Z`)), 'Invalid date');

/** Strict schema for all user-supplied plan context. */
export const PlanContextSchema = z
  .object({
    eventType: z.enum(eventTypes),
    subType: z.enum(subTypes as [EventSubType, ...EventSubType[]]),
    title: z.string().trim().min(1).max(80),
    date: isoDate,
    startTime: z.string().regex(/^\d{2}:\d{2}$/),
    guests: z.number().int().min(1).max(10000),
    children: z.number().int().min(0).max(10000),
    budget: z.number().int().min(0).max(1_000_000_000),
    currency: z.enum(['INR', 'USD', 'EUR', 'GBP']),
    cityTier: z.union([z.literal(1), z.literal(2), z.literal(3)]),
    venue: z.enum(venues),
    vibeTags: z.array(z.string().trim().min(1).max(24)).max(6),
    dietary: z.array(z.enum(dietaryChoices)).max(8),
    priorities: z.array(z.enum(priorities)).max(3),
    language: z.enum(languages),
    elderlyGuests: z.boolean(),
    liveMusic: z.boolean(),
    servesAlcohol: z.boolean(),
    multiDay: z.boolean(),
    livestream: z.boolean(),
  })
  .strict();

/** Input shape accepted by the context parser. */
export type PlanContextInput = z.input<typeof PlanContextSchema>;

/**
 * Parses and validates a plan context.
 *
 * @param input - Untrusted onboarding input
 * @returns The validated context or Zod's structured error
 */
export function parsePlanContext(input: unknown): PlanContext {
  return PlanContextSchema.parse(input);
}
