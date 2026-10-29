/**
 * Vendor checklist engine.
 *
 * Responsibilities: select vendor categories by context and rules, attach
 * must-ask questions, contract checks, red flags, lead times, and Maps links,
 * and expose the pipeline status used by the UI.
 * FR IDs: FR-VEN-001 to FR-VEN-007.
 */

import type { CategoryId, PlanContext, RuleResult, VendorPlan, VendorStatus } from './types';

interface VendorTemplate {
  name: string;
  notes: string;
  leadTimeDays: number;
  mustAsk: string[];
  contractChecklist: string[];
  redFlags: string[];
  pricePerHead: number;
  mapsQuery: string;
  budgetShare: number;
}

const vendorLibrary: Record<CategoryId, VendorTemplate> = {
  venue: {
    name: 'Venue',
    notes: 'Check power, parking, and cancellation terms.',
    leadTimeDays: 120,
    mustAsk: ['Capacity?', 'Power backup?', 'Cancellation policy?'],
    contractChecklist: ['Floor plan', 'Payment schedule', 'Power clause'],
    redFlags: ['No backup plan', 'Parking issues', 'Hidden charges'],
    pricePerHead: 1850,
    mapsQuery: 'event venue near me',
    budgetShare: 0.3,
  },
  catering: {
    name: 'Caterer',
    notes: 'Confirm dietary needs and tasting before booking.',
    leadTimeDays: 90,
    mustAsk: ['Jain or vegan menu?', 'Staffing count?', 'Tasting included?'],
    contractChecklist: ['Menu', 'Staff plan', 'Billing terms'],
    redFlags: ['No menu quote', 'Hidden fees', 'No tasting'],
    pricePerHead: 1450,
    mapsQuery: 'event caterer near me',
    budgetShare: 0.25,
  },
  decor: {
    name: 'Decorator',
    notes: 'Share reference photos and rain backup needs.',
    leadTimeDays: 60,
    mustAsk: ['Setup time?', 'Rain backup?', 'Removal included?'],
    contractChecklist: ['Mood board', 'Setup window', 'Damage terms'],
    redFlags: ['No setup plan', 'Reused stock', 'No removal clause'],
    pricePerHead: 420,
    mapsQuery: 'event decorator near me',
    budgetShare: 0.12,
  },
  photography: {
    name: 'Photographer',
    notes: 'Confirm edited output, reels, and shooter count.',
    leadTimeDays: 60,
    mustAsk: ['Edited output?', 'Reels included?', 'Shooter count?'],
    contractChecklist: ['Delivery date', 'Footage rights', 'Travel terms'],
    redFlags: ['No sample work', 'Extra-hour fees', 'No backup'],
    pricePerHead: 450,
    mapsQuery: 'event photographer near me',
    budgetShare: 0.12,
  },
  attire: {
    name: 'Attire & beauty',
    notes: 'Book trials early during peak season.',
    leadTimeDays: 60,
    mustAsk: ['Trial included?', 'Alteration time?', 'Travel charge?'],
    contractChecklist: ['Trial date', 'Delivery date', 'Alteration terms'],
    redFlags: ['No trial', 'Rush fee', 'No alteration window'],
    pricePerHead: 380,
    mapsQuery: 'bridal attire and makeup near me',
    budgetShare: 0.07,
  },
  music: {
    name: 'Music / DJ',
    notes: 'Confirm sound limits and curfew.',
    leadTimeDays: 45,
    mustAsk: ['Sound limit?', 'Backup equipment?', 'Curfew?'],
    contractChecklist: ['Equipment list', 'Power needs', 'Timing'],
    redFlags: ['No backup', 'No sound permission', 'Overtime fee'],
    pricePerHead: 220,
    mapsQuery: 'DJ and live music near me',
    budgetShare: 0.05,
  },
  rituals: {
    name: 'Priest / officiant',
    notes: 'Confirm muhurat and ritual items.',
    leadTimeDays: 45,
    mustAsk: ['Muhurat confirmed?', 'Ritual items?', 'Language?'],
    contractChecklist: ['Date and time', 'Item list', 'Honorarium'],
    redFlags: ['No muhurat', 'Incomplete item list', 'No backup'],
    pricePerHead: 120,
    mapsQuery: 'wedding priest near me',
    budgetShare: 0.03,
  },
  invitations: {
    name: 'Invitations',
    notes: 'Check print and delivery timelines.',
    leadTimeDays: 30,
    mustAsk: ['Print proof?', 'Delivery date?', 'Digital copy?'],
    contractChecklist: ['Proof', 'Delivery date', 'Quantity'],
    redFlags: ['No proof', 'Late delivery', 'No digital copy'],
    pricePerHead: 90,
    mapsQuery: 'invitation printing near me',
    budgetShare: 0.02,
  },
  transport: {
    name: 'Transport',
    notes: 'Confirm pickups, drivers, and safe return.',
    leadTimeDays: 30,
    mustAsk: ['Driver hours?', 'Backup vehicle?', 'Safe return?'],
    contractChecklist: ['Route plan', 'Driver list', 'Return plan'],
    redFlags: ['No backup', 'No driver list', 'No return plan'],
    pricePerHead: 160,
    mapsQuery: 'event transport near me',
    budgetShare: 0.02,
  },
  gifts: {
    name: 'Gifts & favours',
    notes: 'Agree quantity and delivery date.',
    leadTimeDays: 21,
    mustAsk: ['Quantity?', 'Delivery date?', 'Gift wrapping?'],
    contractChecklist: ['Quantity', 'Delivery', 'Return policy'],
    redFlags: ['No delivery date', 'No sample', 'No return policy'],
    pricePerHead: 120,
    mapsQuery: 'event gifts and favours near me',
    budgetShare: 0.02,
  },
  contingency: {
    name: 'Contingency',
    notes: 'Keep this reserve untouched until final payments.',
    leadTimeDays: 0,
    mustAsk: ['What is covered?', 'Who approves?'],
    contractChecklist: ['Reserve policy'],
    redFlags: ['Spent too early'],
    pricePerHead: 0,
    mapsQuery: 'event planning',
    budgetShare: 0.05,
  },
  permits: {
    name: 'Permits',
    notes: 'File early with the local authority.',
    leadTimeDays: 90,
    mustAsk: ['Who files?', 'Deadline?', 'Documents needed?'],
    contractChecklist: ['Permit copy', 'Deadline', 'Safety sign-off'],
    redFlags: ['No checklist', 'Late filing', 'No authority contact'],
    pricePerHead: 230,
    mapsQuery: 'municipal permit office near me',
    budgetShare: 0.12,
  },
  staffing: {
    name: 'Volunteers & staffing',
    notes: 'Assign rosters, shifts, and check-in owners.',
    leadTimeDays: 60,
    mustAsk: ['How many?', 'Shift plan?', 'Check-in owner?'],
    contractChecklist: ['Roster', 'Duties', 'Check-in'],
    redFlags: ['No backup', 'Low coverage', 'No briefing'],
    pricePerHead: 120,
    mapsQuery: 'event volunteers near me',
    budgetShare: 0.16,
  },
  sound: {
    name: 'Sound / lighting',
    notes: 'Confirm power backup and coverage.',
    leadTimeDays: 45,
    mustAsk: ['Backup power?', 'Coverage area?', 'Setup time?'],
    contractChecklist: ['Equipment list', 'Power plan', 'Timing'],
    redFlags: ['No backup', 'Cable issues', 'No hours listed'],
    pricePerHead: 260,
    mapsQuery: 'sound and lighting vendor near me',
    budgetShare: 0.08,
  },
  activities: {
    name: 'Host / games',
    notes: 'Match energy and age group.',
    leadTimeDays: 21,
    mustAsk: ['Games list?', 'Age fit?', 'Setup time?'],
    contractChecklist: ['Game list', 'Setup', 'Backup plan'],
    redFlags: ['No backup', 'Bad age fit', 'No briefing'],
    pricePerHead: 290,
    mapsQuery: 'birthday host and games near me',
    budgetShare: 0.1,
  },
  cake: {
    name: 'Cake & desserts',
    notes: 'Confirm allergens and delivery time.',
    leadTimeDays: 14,
    mustAsk: ['Flavours?', 'Allergens?', 'Delivery time?'],
    contractChecklist: ['Design', 'Servings', 'Delivery'],
    redFlags: ['No allergen note', 'No delivery time', 'No substitute'],
    pricePerHead: 240,
    mapsQuery: 'cake shop near me',
    budgetShare: 0.08,
  },
  travel: {
    name: 'Travel',
    notes: 'Block seats and share the final itinerary.',
    leadTimeDays: 60,
    mustAsk: ['Group fare?', 'Cancellation?', 'Airport transfer?'],
    contractChecklist: ['Itinerary', 'Fare rules', 'Transfer plan'],
    redFlags: ['No refund rules', 'No transfer', 'No backup'],
    pricePerHead: 1200,
    mapsQuery: 'travel agent near me',
    budgetShare: 0.06,
  },
  stay: {
    name: 'Stay',
    notes: 'Hold room blocks with a clear release date.',
    leadTimeDays: 60,
    mustAsk: ['Room block?', 'Release date?', 'Breakfast?'],
    contractChecklist: ['Room list', 'Release date', 'Payment terms'],
    redFlags: ['No release date', 'No backup rooms', 'Hidden fees'],
    pricePerHead: 900,
    mapsQuery: 'hotels near event venue',
    budgetShare: 0.06,
  },
  security: {
    name: 'Security & safety',
    notes: 'Plan entry, exit, and medical support.',
    leadTimeDays: 30,
    mustAsk: ['Guard count?', 'Medical tent?', 'Entry plan?'],
    contractChecklist: ['Deployment plan', 'Medical contact', 'Escalation'],
    redFlags: ['Too few guards', 'No medical plan', 'No briefing'],
    pricePerHead: 100,
    mapsQuery: 'event security agency near me',
    budgetShare: 0.04,
  },
  livestream: {
    name: 'Livestream',
    notes: 'Test connectivity and keep a backup link.',
    leadTimeDays: 14,
    mustAsk: ['Backup connection?', 'Camera count?', 'Recording?'],
    contractChecklist: ['Test date', 'Backup link', 'Recording rights'],
    redFlags: ['No backup', 'No test', 'No recording'],
    pricePerHead: 180,
    mapsQuery: 'event livestream service near me',
    budgetShare: 0.03,
  },
};

const baseCategories: Record<PlanContext['eventType'], CategoryId[]> = {
  Wedding: [
    'venue',
    'catering',
    'photography',
    'decor',
    'attire',
    'music',
    'rituals',
    'invitations',
    'transport',
  ],
  Birthday: ['venue', 'catering', 'cake', 'activities', 'decor', 'photography', 'gifts'],
  'Community Event': [
    'permits',
    'staffing',
    'sound',
    'venue',
    'catering',
    'decor',
    'security',
    'invitations',
    'transport',
  ],
};

const statusRank: VendorStatus[] = [
  'To shortlist',
  'Shortlist',
  'Contacted',
  'Quote received',
  'Booked',
  'Paid',
];

/** Chooses a plausible starter status from category and lead time. */
function starterStatus(category: CategoryId, leadTimeDays: number): VendorStatus {
  if (category === 'venue') {
    return 'Booked';
  }
  if (category === 'catering' || category === 'cake' || category === 'sound') {
    return 'Quote received';
  }
  if (leadTimeDays >= 60) {
    return 'Shortlist';
  }
  return 'To shortlist';
}

/** Builds a Maps deep link without an API key. */
function mapsUrl(query: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

/**
 * Returns the ordered vendor pipeline used by the UI.
 *
 * @returns Pipeline states from first contact to paid
 */
export function vendorStatusPipeline(): VendorStatus[] {
  return [...statusRank];
}

/**
 * Plans vendor categories for a context.
 *
 * @param ctx - Validated plan context
 * @param firedRules - Rules that may add vendor categories
 * @returns Ordered vendor categories with checklist content
 */
export function planVendors(ctx: PlanContext, firedRules: RuleResult[]): VendorPlan[] {
  const categories = [...baseCategories[ctx.eventType]];

  for (const result of firedRules) {
    for (const category of result.vendorCategories ?? []) {
      if (!categories.includes(category)) {
        categories.push(category);
      }
    }
  }

  const tierFactor = ctx.cityTier === 1 ? 1 : ctx.cityTier === 2 ? 0.7 : 0.45;

  return categories.map((category) => {
    const template = vendorLibrary[category];
    return {
      categoryId: category,
      name: template.name,
      status: starterStatus(category, template.leadTimeDays),
      notes: template.notes,
      budgetShare: template.budgetShare,
      leadTimeDays: template.leadTimeDays,
      mustAsk: [...template.mustAsk],
      contractChecklist: [...template.contractChecklist],
      redFlags: [...template.redFlags],
      pricePerHead: Math.round(template.pricePerHead * tierFactor),
      mapsUrl: mapsUrl(`${template.mapsQuery} ${ctx.cityTier === 1 ? 'metropolitan city' : 'city'}`),
    };
  });
}

/**
 * Advances a vendor status if the target is later in the pipeline.
 *
 * @param current - Current status
 * @param next - Requested status
 * @returns The later of the two statuses
 */
export function advanceVendorStatus(current: VendorStatus, next: VendorStatus): VendorStatus {
  return statusRank.indexOf(next) > statusRank.indexOf(current) ? next : current;
}
