/**
 * Plan context defaults and derivation.
 *
 * Responsibilities: provide safe defaults for sample scenarios and derive
 * values shared by the budget and timeline engines. Validation lives in
 * `schema.ts` so the client bundle only loads Zod for external input.
 * FR IDs: FR-ONB-001, FR-ONB-002, FR-BUD-004.
 */

import type {
  DerivedContext,
  DietaryChoice,
  EventSubType,
  EventType,
  LanguageOption,
  PlanContext,
  Priority,
  VenueType,
} from './types';

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

const defaultSubType: Record<EventType, EventSubType> = {
  Wedding: 'Bengali',
  Birthday: 'Kids',
  'Community Event': 'Puja',
};

const cateringFloors: Record<EventType, Record<1 | 2 | 3, number>> = {
  Wedding: { 1: 900, 2: 600, 3: 380 },
  Birthday: { 1: 600, 2: 400, 3: 250 },
  'Community Event': { 1: 250, 2: 180, 3: 120 },
};

const venueFloors: Record<EventType, Record<VenueType, Record<1 | 2 | 3, number>>> = {
  Wedding: {
    'Indoor Hall': { 1: 300000, 2: 150000, 3: 80000 },
    Outdoor: { 1: 200000, 2: 100000, 3: 50000 },
    Home: { 1: 0, 2: 0, 3: 0 },
    'Community Ground': { 1: 80000, 2: 40000, 3: 20000 },
    Destination: { 1: 500000, 2: 300000, 3: 180000 },
  },
  Birthday: {
    'Indoor Hall': { 1: 25000, 2: 15000, 3: 8000 },
    Outdoor: { 1: 15000, 2: 10000, 3: 5000 },
    Home: { 1: 0, 2: 0, 3: 0 },
    'Community Ground': { 1: 8000, 2: 5000, 3: 2500 },
    Destination: { 1: 150000, 2: 100000, 3: 60000 },
  },
  'Community Event': {
    'Indoor Hall': { 1: 50000, 2: 30000, 3: 15000 },
    Outdoor: { 1: 35000, 2: 20000, 3: 10000 },
    Home: { 1: 0, 2: 0, 3: 0 },
    'Community Ground': { 1: 15000, 2: 8000, 3: 4000 },
    Destination: { 1: 200000, 2: 150000, 3: 100000 },
  },
};

const rushThresholds: Record<EventType, number> = {
  Wedding: 30,
  Birthday: 10,
  'Community Event': 21,
};

/**
 * Builds a complete sample context for an event type.
 *
 * @param eventType - Event type used to choose realistic defaults
 * @param overrides - Optional partial context overrides
 * @returns A valid plan context
 */
export function createPlanContext(
  eventType: EventType,
  overrides: Partial<PlanContext> = {},
): PlanContext {
  const base: PlanContext = {
    eventType,
    subType: defaultSubType[eventType],
    title: `${eventType} plan`,
    date: new Date(Date.now() + 120 * 86_400_000).toISOString().slice(0, 10),
    startTime: '18:00',
    guests: eventType === 'Community Event' ? 1500 : eventType === 'Birthday' ? 40 : 250,
    children: eventType === 'Birthday' ? 20 : 0,
    budget:
      eventType === 'Community Event' ? 400000 : eventType === 'Birthday' ? 60000 : 1500000,
    currency: 'INR',
    cityTier: eventType === 'Community Event' ? 3 : eventType === 'Birthday' ? 2 : 1,
    venue: eventType === 'Community Event' ? 'Community Ground' : 'Indoor Hall',
    vibeTags: [],
    dietary: ['Vegetarian'],
    priorities: [],
    language: 'English',
    elderlyGuests: false,
    liveMusic: false,
    servesAlcohol: false,
    multiDay: false,
    livestream: false,
  };

  return { ...base, ...overrides };
}

/**
 * Returns whole days between two ISO dates using UTC math.
 *
 * @param from - Start date in YYYY-MM-DD form
 * @param to - End date in YYYY-MM-DD form
 * @returns Day difference; negative when `to` is in the past
 */
export function daysBetween(from: string, to: string): number {
  const start = Date.parse(`${from}T00:00:00Z`);
  const end = Date.parse(`${to}T00:00:00Z`);
  return Math.ceil((end - start) / 86_400_000);
}

/**
 * Derives shared values used by the rules, budget, and timeline engines.
 *
 * @param ctx - Validated plan context
 * @param today - Injected current date in YYYY-MM-DD form
 * @returns Derived planning values
 */
export function deriveContext(ctx: PlanContext, today: string): DerivedContext {
  const daysUntil = daysBetween(today, ctx.date);
  const month = Number(ctx.date.slice(5, 7)) - 1;
  const rushMode = daysUntil < rushThresholds[ctx.eventType];
  const cateringFloor =
    ctx.guests * cateringFloors[ctx.eventType][ctx.cityTier] * (ctx.multiDay ? 1.15 : 1);
  const venueFloor = venueFloors[ctx.eventType][ctx.venue][ctx.cityTier];
  const floors = Math.round(cateringFloor) + venueFloor;
  const contingencyRate =
    ctx.venue === 'Outdoor' || ctx.venue === 'Community Ground' || ctx.guests > 300 || rushMode
      ? 0.1
      : 0.05;

  return {
    daysUntil,
    rushMode,
    perHeadBudget: ctx.guests > 0 ? Math.round(ctx.budget / ctx.guests) : 0,
    month,
    monsoon: month >= 5 && month <= 8,
    summer: month >= 2 && month <= 4,
    peakSeason: month >= 9 || month <= 1,
    cateringFloor: Math.round(cateringFloor),
    venueFloor,
    infeasible: floors > ctx.budget,
    budgetGap: Math.max(0, floors - ctx.budget),
    contingencyRate,
  };
}

/**
 * Normalises a raw priority string into a supported priority.
 *
 * @param value - Candidate priority label
 * @returns A supported priority or undefined
 */
export function toPriority(value: string): Priority | undefined {
  return priorities.find((priority) => priority === value);
}

/**
 * Normalises a raw dietary string into a supported choice.
 *
 * @param value - Candidate dietary label
 * @returns A supported dietary choice or undefined
 */
export function toDietaryChoice(value: string): DietaryChoice | undefined {
  return dietaryChoices.find((choice) => choice === value);
}

/**
 * Normalises a raw language string into a supported language.
 *
 * @param value - Candidate language label
 * @returns A supported language or undefined
 */
export function toLanguage(value: string): LanguageOption | undefined {
  return languages.find((language) => language === value);
}

/**
 * Normalises a raw venue string into a supported venue.
 *
 * @param value - Candidate venue label
 * @returns A supported venue or undefined
 */
export function toVenue(value: string): VenueType | undefined {
  return venues.find((venue) => venue === value);
}
