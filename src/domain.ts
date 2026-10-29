/**
 * Legacy domain adapters for the Utsav planning engine.
 *
 * Responsibilities: preserve the original small API used by early screens and
 * tests while delegating to the typed engines in `src/engine`.
 * FR IDs: FR-BUD-001, FR-TIM-001, FR-VEN-001, FR-RUL-001, FR-DSH-003,
 * FR-EXP-002.
 */

import { allocatePlanBudget } from './engine/budget';
import { createPlanContext, deriveContext } from './engine/context';
import { evaluateRules } from './engine/rules';
import { scheduleTimeline } from './engine/timeline';
import type {
  BudgetPlan,
  CategoryId,
  DietaryChoice as EngineDietaryChoice,
  EventType,
  PlanContext,
  Priority,
  RiskFlag as EngineRiskFlag,
  RuleResult as EngineRuleResult,
  TimelinePhase,
  VendorStatus as EngineVendorStatus,
} from './engine/types';
import { planVendors } from './engine/vendors';

export type { EventType } from './engine/types';
export type VenueType = 'Indoor Hall' | 'Outdoor' | 'Home' | 'Community Ground';
export type LanguageOption = 'English' | 'हिन्दी' | 'বাংলা';
export type DietaryChoice = EngineDietaryChoice;

export type BudgetEntry = {
  label: string;
  amount: number;
  detail: string;
};

export type { TimelinePhase };

export type TimelineTask = {
  title: string;
  due: string;
  status: 'Ready' | 'Due soon' | 'At risk';
  phase: TimelinePhase;
  rushMode: boolean;
};

export type VendorStatus = 'Shortlist' | 'Contacted' | 'Quote received' | 'Booked' | 'Paid';

export type VendorChecklist = {
  name: string;
  stage: string;
  status: VendorStatus;
  notes: string;
  budgetShare: number;
  leadTime: string;
  mustAsk: string[];
  contractChecklist: string[];
  redFlags: string[];
  pricePerHead: number;
  mapsUrl: string;
};

export type IdeaCard = {
  title: string;
  category: string;
  description: string;
  costBand: string;
};

export type NextAction = {
  title: string;
  detail: string;
};

export type RiskFlag = {
  label: string;
  level: 'low' | 'medium' | 'high';
  note: string;
};

export type RuleResult = {
  id: string;
  title: string;
  detail: string;
  effect: string;
};

const legacyVenue = (
  venue: VenueType,
): PlanContext['venue'] => venue;

const categoryDetails: Record<CategoryId, string> = {
  venue: 'Hall, decor, rentals',
  catering: 'Menu, service, drinks',
  decor: 'Floral, lighting, setup',
  photography: 'Photos and reels',
  attire: 'Outfits and beauty',
  music: 'DJ and live music',
  rituals: 'Priest and ritual items',
  invitations: 'Print and digital invites',
  transport: 'Guest and family transport',
  gifts: 'Favours and return gifts',
  contingency: 'Buffer for lead-time price changes',
  permits: 'Permissions, NOC, insurance',
  staffing: 'Volunteers and setup crew',
  sound: 'Audio, lighting, power',
  activities: 'Games, host, activities',
  cake: 'Cake, desserts, snacks',
  travel: 'Travel and transfers',
  stay: 'Accommodation blocks',
  security: 'Security, safety, medical',
  livestream: 'Streaming and backup link',
};

const legacyStatus: Record<EngineVendorStatus, VendorStatus> = {
  'To shortlist': 'Shortlist',
  Shortlist: 'Shortlist',
  Contacted: 'Contacted',
  'Quote received': 'Quote received',
  Booked: 'Booked',
  Paid: 'Paid',
};

/** Builds a legacy context from the original small function arguments. */
function contextFor(
  eventType: EventType,
  overrides: Partial<PlanContext> = {},
): PlanContext {
  return createPlanContext(eventType, overrides);
}

/** Converts engine budget lines to the legacy budget entry shape. */
function toBudgetEntries(budget: BudgetPlan): BudgetEntry[] {
  return budget.lines.map((line) => ({
    label: line.label,
    amount: line.planned,
    detail: categoryDetails[line.categoryId],
  }));
}

/**
 * Allocates the total budget across event categories.
 *
 * @param eventType - The type of event
 * @param total - The total budget in Indian Rupees
 * @param priorities - Optional top-three priorities
 * @returns Array of integer budget entries that sum to the total
 */
export function allocateBudget(
  eventType: EventType,
  total: number,
  priorities: Priority[] = [],
): BudgetEntry[] {
  const ctx = contextFor(eventType, { budget: total, priorities });
  const derived = deriveContext(ctx, new Date().toISOString().slice(0, 10));
  const rules = evaluateRules(ctx, derived);
  return toBudgetEntries(allocatePlanBudget(ctx, derived, rules));
}

/**
 * Generates a dependency-aware timeline for the event.
 *
 * @param eventType - The type of event
 * @param date - The event date in ISO format (YYYY-MM-DD)
 * @returns Ordered timeline tasks with phases and statuses
 */
export function generateTimeline(eventType: EventType, date: string): TimelineTask[] {
  const ctx = contextFor(eventType, { date });
  const today = new Date().toISOString().slice(0, 10);
  const derived = deriveContext(ctx, today);
  const rules = evaluateRules(ctx, derived);
  const timeline = scheduleTimeline(ctx, derived, rules, today);

  return timeline.tasks.map((task) => {
    let status: TimelineTask['status'] = 'Ready';
    if (task.flags.includes('at-risk') || task.flags.includes('overdue')) {
      status = 'At risk';
    } else if (task.flags.includes('due-soon')) {
      status = 'Due soon';
    }

    return {
      title: task.title,
      due: task.due,
      status,
      phase: task.phase,
      rushMode: task.rushMode,
    };
  });
}

/**
 * Generates a vendor checklist tailored to the event type.
 *
 * @param eventType - The type of event
 * @returns Vendor categories with questions, contracts, red flags, and Maps links
 */
export function generateVendorChecklist(eventType: EventType): VendorChecklist[] {
  const ctx = contextFor(eventType);
  const derived = deriveContext(ctx, new Date().toISOString().slice(0, 10));
  const rules = evaluateRules(ctx, derived);

  return planVendors(ctx, rules).map((vendor) => ({
    name: vendor.name,
    stage: vendor.status,
    status: legacyStatus[vendor.status],
    notes: vendor.notes,
    budgetShare: vendor.budgetShare,
    leadTime: `${vendor.leadTimeDays} days`,
    mustAsk: vendor.mustAsk,
    contractChecklist: vendor.contractChecklist,
    redFlags: vendor.redFlags,
    pricePerHead: vendor.pricePerHead,
    mapsUrl: vendor.mapsUrl,
  }));
}

/**
 * builds export and sharing links for the event plan.
 *
 * @param eventType - The type of event
 * @param date - The event date in ISO format
 * @param title - The title or description for the event
 * @returns Object containing calendar, CSV, and JSON export links
 */
export function buildExportLinks(
  eventType: EventType,
  date: string,
  title: string,
): { calendar: string; csv: string; json: string } {
  const eventLabel = title || `${eventType} plan`;
  const encodedTitle = encodeURIComponent(eventLabel);
  const formattedDate = date.replace(/-/g, '');

  return {
    calendar: `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodedTitle}&details=${encodedTitle}&dates=${formattedDate}T090000Z/${formattedDate}T220000Z`,
    csv: `https://example.com/export/${encodeURIComponent(eventType)}-${encodeURIComponent(date)}.csv?title=${encodedTitle}`,
    json: `https://example.com/export/${encodeURIComponent(eventType)}-${encodeURIComponent(date)}.json?title=${encodedTitle}`,
  };
}

/**
 * Generates personalised idea cards for the event.
 *
 * @param eventType - The type of event
 * @returns Idea cards with titles, categories, descriptions, and cost bands
 */
export function generateIdeas(eventType: EventType): IdeaCard[] {
  const base: Record<EventType, IdeaCard[]> = {
    Wedding: [
      {
        title: 'Garden welcome',
        category: 'Decor',
        description: 'Floral arch, warm light.',
        costBand: '₹ 60k-₹ 1.2L',
      },
      {
        title: 'Live music',
        category: 'Entertainment',
        description: 'Acoustic and folk set.',
        costBand: '₹ 80k-₹ 2L',
      },
      {
        title: 'Chef menu',
        category: 'Catering',
        description: 'Regional favourites, lighter style.',
        costBand: '₹ 1L-₹ 3L',
      },
    ],
    Birthday: [
      {
        title: 'Game zone',
        category: 'Entertainment',
        description: 'Age games and photo spots.',
        costBand: '₹ 20k-₹ 70k',
      },
      {
        title: 'Dessert table',
        category: 'Food',
        description: 'Mini desserts and cake.',
        costBand: '₹ 15k-₹ 60k',
      },
      {
        title: 'Photo wall',
        category: 'Decor',
        description: 'Backdrop for selfies.',
        costBand: '₹ 12k-₹ 35k',
      },
    ],
    'Community Event': [
      {
        title: 'Welcome desk',
        category: 'Operations',
        description: 'Visible check-in, easier flow.',
        costBand: '₹ 30k-₹ 80k',
      },
      {
        title: 'Rain-safe setup',
        category: 'Planning',
        description: 'Cover and backup signage.',
        costBand: '₹ 40k-₹ 1L',
      },
      {
        title: 'Food court',
        category: 'Catering',
        description: 'Fast meal stations.',
        costBand: '₹ 50k-₹ 1.5L',
      },
    ],
  };

  return base[eventType];
}

/**
 * Generates event-specific planning rule summaries.
 *
 * @param eventType - The type of event
 * @returns Rule descriptions
 */
export function generateRules(eventType: EventType): string[] {
  const ctx = contextFor(eventType);
  const derived = deriveContext(ctx, new Date().toISOString().slice(0, 10));
  return evaluateRules(ctx, derived).map((ruleResult) => `${ruleResult.title}: ${ruleResult.detail}`);
}

/**
 * Generates prioritised next actions based on event context.
 *
 * @param eventType - The type of event
 * @param budget - Total budget in Rupees
 * @param guests - Number of guests
 * @param dietary - Dietary preference
 * @param language - Preferred language
 * @returns Actionable next steps
 */
export function generateNextActions(
  eventType: EventType,
  budget: number,
  guests: number,
  dietary: DietaryChoice = 'Vegetarian',
  language: LanguageOption = 'English',
): NextAction[] {
  const languageLabel =
    language === 'हिन्दी' ? 'Hindi' : language === 'বাংলা' ? 'Bangla' : 'English';

  const base: Record<EventType, NextAction[]> = {
    Wedding: [
      {
        title: 'Venue check',
        detail: `Lock seating for ${guests} guests with ${dietary.toLowerCase()} food.`,
      },
      {
        title: 'Vendor check',
        detail: `Review caterer, décor, and photo team against the ${budget >= 1500000 ? 'premium' : 'balanced'} budget.`,
      },
      {
        title: 'Guest update',
        detail: `Share the final schedule in ${languageLabel}.`,
      },
    ],
    Birthday: [
      {
        title: 'Venue comfort',
        detail: `Confirm space for ${guests} guests with ${dietary.toLowerCase()} food.`,
      },
      {
        title: 'Activity flow',
        detail: 'Set cake, games, and photos in a clear order.',
      },
      {
        title: 'Family brief',
        detail: `Send the timeline in ${languageLabel}.`,
      },
    ],
    'Community Event': [
      {
        title: 'Permits and staff',
        detail: `Finalise permits and volunteers for ${guests} guests.`,
      },
      {
        title: 'Stage and signs',
        detail: `Check audio, lighting, and signs in ${languageLabel}.`,
      },
      {
        title: 'Backup review',
        detail: 'Confirm weather cover and staffing before event day.',
      },
    ],
  };

  return base[eventType];
}

/**
 * Generates risk flags based on event parameters.
 *
 * @param eventType - The type of event
 * @param budget - Total budget in Rupees
 * @param guests - Number of guests
 * @param cityTier - City tier
 * @param venue - Venue type
 * @returns Risk flags with levels and notes
 */
export function generateRiskFlags(
  eventType: EventType,
  budget: number,
  guests: number,
  cityTier: 1 | 2 | 3,
  venue: VenueType,
): RiskFlag[] {
  const ctx = contextFor(eventType, {
    budget,
    guests,
    cityTier,
    venue: legacyVenue(venue),
  });
  const derived = deriveContext(ctx, new Date().toISOString().slice(0, 10));
  const risks: RiskFlag[] = evaluateRules(ctx, derived).flatMap((result) =>
    result.risk
      ? [{ label: result.risk.label, level: result.risk.level, note: result.risk.note }]
      : [],
  );

  const outdoor = venue === 'Outdoor' || venue === 'Community Ground';
  if (outdoor && !risks.some((risk) => risk.label.toLowerCase().includes('weather'))) {
    risks.push({
      label: 'Weather backup',
      level: 'high',
      note: 'Outdoor venues need rain cover and backup power.',
    });
  }

  if (risks.length === 0) {
    risks.push({
      label: 'Low risk',
      level: 'low',
      note: 'Current constraints look manageable.',
    });
  }

  return risks;
}

/**
 * Generates applied rules with explanations.
 *
 * @param eventType - The type of event
 * @param budget - Total budget in Rupees
 * @param guests - Number of guests
 * @param cityTier - City tier
 * @param venue - Venue type
 * @returns Applied rules with IDs, titles, details, and effects
 */
export function generateRuleSet(
  eventType: EventType,
  budget: number,
  guests: number,
  cityTier: 1 | 2 | 3,
  venue: VenueType,
): RuleResult[] {
  const ctx = contextFor(eventType, {
    budget,
    guests,
    cityTier,
    venue: legacyVenue(venue),
  });
  const derived = deriveContext(ctx, new Date().toISOString().slice(0, 10));
  const results: EngineRuleResult[] = evaluateRules(ctx, derived);

  if (results.length === 0) {
    return [
      {
        id: 'R-000',
        title: 'Balanced',
        detail: 'Current needs stay manageable.',
        effect: 'Kept the plan simple and low-risk.',
      },
    ];
  }

  return results.map((result) => ({
    id: result.id,
    title: result.title,
    detail: result.detail,
    effect: result.effect,
  }));
}

/**
 * Generates budget guidance and recommendations.
 *
 * @param eventType - The type of event
 * @param budget - Total budget in Rupees
 * @param guests - Number of guests
 * @param cityTier - City tier
 * @param venue - Venue type
 * @returns Guidance strings
 */
export function generateBudgetGuidance(
  eventType: EventType,
  budget: number,
  guests: number,
  cityTier: 1 | 2 | 3,
  venue: VenueType,
): string[] {
  const guidance: string[] = [];

  if (venue === 'Outdoor' || venue === 'Community Ground') {
    guidance.push('Weather backup is essential for outdoor venues.');
  }

  if (guests > 250) {
    guidance.push('Consider fewer guests or more venue capacity.');
  }

  if (eventType === 'Wedding' && cityTier === 1 && budget < 1500000) {
    guidance.push('Tier-1 wedding venues may need a stronger contingency.');
  }

  if (guidance.length === 0) {
    guidance.push('The current budget and guest count look balanced.');
  }

  return guidance;
}

/**
 * Calculates plan readiness from budget and guest count.
 *
 * @param budget - Total budget in Rupees
 * @param guests - Number of guests
 * @returns Readiness score (0-100)
 */
export function calculateReadiness(budget: number, guests: number): number {
  const guestScore = Math.min(40, guests / 10);
  const budgetScore = Math.min(60, budget / 35000);
  return Math.min(100, Math.round(guestScore + budgetScore));
}

/**
 * Exposes the modern engine's risk flag shape for consumers that need IDs.
 */
export type EngineRisk = EngineRiskFlag;
