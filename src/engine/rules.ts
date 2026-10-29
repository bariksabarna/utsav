/**
 * Deterministic planning rules.
 *
 * Responsibilities: evaluate the documented rule catalogue against validated
 * context and derived values. Each rule returns either null (does not fire) or
 * a user-facing explanation plus optional budget, task, vendor, and risk
 * effects. Rules never mutate input.
 * FR IDs: FR-RUL-001, FR-RUL-002, FR-RUL-003, FR-RUL-004.
 */

import type { DerivedContext, PlanContext, Rule, RuleResult } from './types';

/** Creates a rule with a stable ID and pure evaluator. */
function rule(
  id: string,
  title: string,
  evaluate: Rule['evaluate'],
): Rule {
  return { id, title, evaluate };
}

const religiousWeddings = new Set(['Bengali', 'North Indian', 'South Indian', 'Christian', 'Muslim']);

const ruleCatalogue: Rule[] = [
  rule('R-001', 'Crowd and parking plan', (ctx) =>
    ctx.guests > 300
      ? {
          id: 'R-001',
          title: 'Crowd and parking plan',
          detail: 'More than 300 guests need welcome, seating, security, and parking support.',
          effect: 'Added a crowd plan task, security vendor, and extra contingency.',
          budgetBoosts: { security: 3 },
          vendorCategories: ['security'],
          extraTasks: [
            {
              templateId: 'rule-crowd',
              title: 'Confirm crowd, security, and parking plan',
              categoryId: 'security',
              leadDays: 45,
              rushable: true,
              skippable: false,
              dependsOn: [],
            },
          ],
          risk: {
            id: 'R-001',
            label: 'Guest flow',
            level: 'high',
            note: 'Over 300 guests need a welcome, seating, and parking plan.',
          },
        }
      : null,
  ),
  rule('R-002', 'Monsoon rain backup', (ctx, derived) =>
    derived.monsoon && (ctx.venue === 'Outdoor' || ctx.venue === 'Community Ground')
      ? {
          id: 'R-002',
          title: 'Monsoon rain backup',
          detail: 'Outdoor venues in the monsoon need covered backup space and power protection.',
          effect: 'Added a rain backup task and increased decor reserve.',
          budgetBoosts: { decor: 3 },
          vendorCategories: ['decor'],
          extraTasks: [
            {
              templateId: 'rule-rain',
              title: 'Lock rain cover and indoor fallback',
              categoryId: 'decor',
              leadDays: 14,
              rushable: false,
              skippable: false,
              dependsOn: [],
            },
          ],
          risk: {
            id: 'R-002',
            label: 'Weather backup',
            level: 'high',
            note: 'Outdoor venues need rain cover and backup power.',
          },
        }
      : null,
  ),
  rule('R-003', 'Summer heat plan', (ctx, derived) =>
    derived.summer && (ctx.venue === 'Outdoor' || ctx.venue === 'Community Ground')
      ? {
          id: 'R-003',
          title: 'Summer heat plan',
          detail: 'Summer outdoor events need shade, water, and cooling for guests.',
          effect: 'Added shade and hydration planning and raised the catering reserve.',
          budgetBoosts: { catering: 2 },
          extraTasks: [
            {
              templateId: 'rule-heat',
              title: 'Confirm shade, water, and cooling',
              categoryId: 'catering',
              leadDays: 7,
              rushable: true,
              skippable: true,
              dependsOn: [],
            },
          ],
          risk: {
            id: 'R-003',
            label: 'Heat risk',
            level: 'medium',
            note: 'Add shade and water stations for a summer outdoor event.',
          },
        }
      : null,
  ),
  rule('R-004', 'Rush mode', (_ctx, derived) =>
    derived.rushMode
      ? {
          id: 'R-004',
          title: 'Rush mode',
          detail: 'The event date is inside the critical booking window.',
          effect: 'Compressed lead times and flagged non-rushable work as at risk.',
          extraTasks: [
            {
              templateId: 'rule-rush',
              title: 'Book the critical venue and caterer today',
              categoryId: 'venue',
              leadDays: 1,
              rushable: true,
              skippable: false,
              dependsOn: [],
            },
          ],
          risk: {
            id: 'R-004',
            label: 'Rush mode',
            level: 'high',
            note: 'Book critical vendors immediately and compress the schedule.',
          },
        }
      : null,
  ),
  rule('R-005', 'Dietary catering check', (ctx) =>
    ctx.dietary.length > 0
      ? {
          id: 'R-005',
          title: 'Dietary catering check',
          detail: `Catering must cover ${ctx.dietary.join(', ').toLowerCase()}.`,
          effect: 'Added a dietary confirmation task and raised the catering reserve.',
          budgetBoosts: { catering: 2 },
          extraTasks: [
            {
              templateId: 'rule-diet',
              title: 'Confirm dietary menu and tasting',
              categoryId: 'catering',
              leadDays: 21,
              rushable: true,
              skippable: false,
              dependsOn: [],
            },
          ],
        }
      : null,
  ),
  rule('R-006', 'Kid-safe plan', (ctx) =>
    ctx.children > 0 || ctx.subType === 'Kids'
      ? {
          id: 'R-006',
          title: 'Kid-safe plan',
          detail: 'Children attending need safe play areas, age-fit activities, and return gifts.',
          effect: 'Added kid-safety and entertainer tasks.',
          budgetBoosts: { activities: 3, gifts: 1 },
          vendorCategories: ['activities'],
          extraTasks: [
            {
              templateId: 'rule-kids',
              title: 'Confirm kid-safe layout and entertainer',
              categoryId: 'activities',
              leadDays: 14,
              rushable: true,
              skippable: false,
              dependsOn: [],
            },
          ],
          risk: {
            id: 'R-006',
            label: 'Child safety',
            level: 'medium',
            note: 'Check play areas, age-fit games, and allergen controls.',
          },
        }
      : null,
  ),
  rule('R-007', 'Infeasible budget', (_ctx, derived) =>
    derived.infeasible
      ? {
          id: 'R-007',
          title: 'Budget is below the essentials floor',
          detail: 'Catering and venue floors alone exceed the available budget.',
          effect: 'Switched to infeasible mode with a gap and concrete options.',
          risk: {
            id: 'R-007',
            label: 'Budget gap',
            level: 'high',
            note: 'Reduce guest count, change venue, or raise the budget.',
          },
        }
      : null,
  ),
  rule('R-008', 'Frugal mode', (ctx, derived) => {
    const threshold = ctx.cityTier === 1 ? 2500 : ctx.cityTier === 2 ? 1500 : 900;
    return derived.perHeadBudget < threshold
      ? {
          id: 'R-008',
          title: 'Frugal mode',
          detail: 'The per-guest budget is tight for this city tier.',
          effect: 'Kept essentials first and suggested lower-cost options.',
          extraTasks: [
            {
              templateId: 'rule-frugal',
              title: 'Review essentials-first spending',
              categoryId: 'catering',
              leadDays: 30,
              rushable: true,
              skippable: true,
              dependsOn: [],
            },
          ],
          risk: {
            id: 'R-008',
            label: 'Tight per-head budget',
            level: 'medium',
            note: 'Prioritise essentials and confirm per-plate pricing early.',
          },
        }
      : null;
  }),
  rule('R-009', 'Destination logistics', (ctx) =>
    ctx.venue === 'Destination' || ctx.subType === 'Destination'
      ? {
          id: 'R-009',
          title: 'Destination logistics',
          detail: 'Destination events need travel, stay, and guest transport planning.',
          effect: 'Added travel and stay categories and tasks.',
          budgetBoosts: { travel: 4, stay: 4 },
          vendorCategories: ['transport', 'travel', 'stay'],
          extraTasks: [
            {
              templateId: 'rule-travel',
              title: 'Confirm travel and stay blocks',
              categoryId: 'travel',
              leadDays: 60,
              rushable: true,
              skippable: false,
              dependsOn: [],
            },
          ],
          risk: {
            id: 'R-009',
            label: 'Destination logistics',
            level: 'medium',
            note: 'Block travel and stay before sharing dates with guests.',
          },
        }
      : null,
  ),
  rule('R-010', 'Community permits and safety', (ctx) =>
    ctx.eventType === 'Community Event'
      ? {
          id: 'R-010',
          title: 'Community permits and safety',
          detail: 'Community events need permits, insurance, volunteers, sanitation, and first aid.',
          effect: 'Added permit, volunteer, safety, and ledger tasks.',
          budgetBoosts: { permits: 2, staffing: 2, security: 1 },
          vendorCategories: ['permits', 'staffing', 'security'],
          extraTasks: [
            {
              templateId: 'rule-permits',
              title: 'File permits, NOC, and insurance',
              categoryId: 'permits',
              leadDays: 90,
              rushable: false,
              skippable: false,
              dependsOn: [],
            },
            {
              templateId: 'rule-safety',
              title: 'Confirm sanitation, first aid, and volunteer roster',
              categoryId: 'staffing',
              leadDays: 30,
              rushable: true,
              skippable: false,
              dependsOn: ['rule-permits'],
            },
          ],
          risk: {
            id: 'R-010',
            label: 'Permit timing',
            level: 'high',
            note: 'Large events need permits, volunteers, and safety sign-offs early.',
          },
        }
      : null,
  ),
  rule('R-011', 'Ritual and officiant check', (ctx) =>
    ctx.eventType === 'Wedding' && religiousWeddings.has(ctx.subType)
      ? {
          id: 'R-011',
          title: 'Ritual and officiant check',
          detail: 'Religious weddings need an officiant, ritual items, and a confirmed muhurat.',
          effect: 'Added a rituals checklist and reserve.',
          budgetBoosts: { rituals: 2 },
          extraTasks: [
            {
              templateId: 'rule-rituals',
              title: 'Confirm officiant, muhurat, and ritual items',
              categoryId: 'rituals',
              leadDays: 45,
              rushable: true,
              skippable: false,
              dependsOn: [],
            },
          ],
        }
      : null,
  ),
  rule('R-012', 'Peak season lead time', (ctx, derived) =>
    derived.peakSeason
      ? {
          id: 'R-012',
          title: 'Peak season lead time',
          detail: 'Peak wedding and festive season bookings fill early.',
          effect: 'Added 30% lead time for venue and catering and raised their reserve.',
          budgetBoosts: { venue: 2, catering: 2 },
          extraTasks: [
            {
              templateId: 'rule-peak',
              title: 'Lock peak-season venue and caterer early',
              categoryId: 'venue',
              leadDays: 150,
              rushable: false,
              skippable: false,
              dependsOn: [],
            },
          ],
          risk: {
            id: 'R-012',
            label: 'Peak season',
            level: 'medium',
            note: ctx.eventType === 'Wedding' ? 'Book venue and caterer early.' : 'Confirm dates early.',
          },
        }
      : null,
  ),
  rule('R-013', 'Elderly guest comfort', (ctx) =>
    ctx.elderlyGuests
      ? {
          id: 'R-013',
          title: 'Elderly guest comfort',
          detail: 'Elderly guests need accessible seating, ramps, and nearby medical support.',
          effect: 'Added an accessibility task and transport reserve.',
          budgetBoosts: { transport: 1 },
          extraTasks: [
            {
              templateId: 'rule-elderly',
              title: 'Confirm accessible seating and medical contact',
              categoryId: 'transport',
              leadDays: 21,
              rushable: true,
              skippable: false,
              dependsOn: [],
            },
          ],
          risk: {
            id: 'R-013',
            label: 'Accessibility',
            level: 'medium',
            note: 'Confirm ramps, seating, and a nearby medical contact.',
          },
        }
      : null,
  ),
  rule('R-014', 'Photography shot list', (ctx) =>
    ctx.priorities.includes('Photography')
      ? {
          id: 'R-014',
          title: 'Photography shot list',
          detail: 'Photography is a top priority, so the plan reserves time for a shot list.',
          effect: 'Added a shot-list task and raised the photography reserve.',
          budgetBoosts: { photography: 3 },
          extraTasks: [
            {
              templateId: 'rule-photo',
              title: 'Share must-have photo and reel shot list',
              categoryId: 'photography',
              leadDays: 14,
              rushable: true,
              skippable: true,
              dependsOn: [],
            },
          ],
        }
      : null,
  ),
  rule('R-015', 'Local language plan', (ctx) =>
    ctx.language !== 'English'
      ? {
          id: 'R-015',
          title: 'Local language plan',
          detail: `Planning output and AI prompts should use ${ctx.language}.`,
          effect: 'Requested the preferred language for ideas and the assistant.',
        }
      : null,
  ),
  rule('R-016', 'Alcohol licence reminder', (ctx) =>
    ctx.servesAlcohol
      ? {
          id: 'R-016',
          title: 'Alcohol licence reminder',
          detail: 'Alcohol service needs a local licence check and safe transport.',
          effect: 'Added a licence and safe-transport task.',
          budgetBoosts: { transport: 2 },
          extraTasks: [
            {
              templateId: 'rule-alcohol',
              title: 'Verify alcohol licence and safe transport',
              categoryId: 'transport',
              leadDays: 30,
              rushable: true,
              skippable: false,
              dependsOn: [],
            },
          ],
          risk: {
            id: 'R-016',
            label: 'Alcohol compliance',
            level: 'medium',
            note: 'Verify local rules and arrange safe transport.',
          },
        }
      : null,
  ),
  rule('R-017', 'Sound permission and curfew', (ctx) =>
    ctx.liveMusic &&
    (ctx.venue === 'Outdoor' || ctx.venue === 'Community Ground' || ctx.venue === 'Home')
      ? {
          id: 'R-017',
          title: 'Sound permission and curfew',
          detail: 'Live music outdoors needs sound permission and a curfew check.',
          effect: 'Added a sound permission task and music vendor.',
          budgetBoosts: { music: 2 },
          vendorCategories: ['music'],
          extraTasks: [
            {
              templateId: 'rule-sound',
              title: 'Confirm sound permission and curfew',
              categoryId: 'music',
              leadDays: 21,
              rushable: true,
              skippable: false,
              dependsOn: [],
            },
          ],
          risk: {
            id: 'R-017',
            label: 'Noise permission',
            level: 'medium',
            note: 'Check local sound limits and curfew before booking music.',
          },
        }
      : null,
  ),
  rule('R-018', 'Large gathering safety', (ctx) =>
    ctx.guests > 1000
      ? {
          id: 'R-018',
          title: 'Large gathering safety',
          detail: 'Events over 1,000 guests need medical support and multiple entry and exit points.',
          effect: 'Added medical and volunteer-ratio tasks.',
          budgetBoosts: { staffing: 3, security: 2 },
          vendorCategories: ['security', 'staffing'],
          extraTasks: [
            {
              templateId: 'rule-medical',
              title: 'Confirm medical tent and entry/exit plan',
              categoryId: 'security',
              leadDays: 30,
              rushable: true,
              skippable: false,
              dependsOn: [],
            },
          ],
          risk: {
            id: 'R-018',
            label: 'Large gathering',
            level: 'high',
            note: 'Plan medical support and a 1:50 volunteer ratio.',
          },
        }
      : null,
  ),
  rule('R-019', 'Thin contingency cover', (ctx, derived) => {
    const remaining = ctx.budget - derived.cateringFloor - derived.venueFloor;
    return remaining < ctx.budget * 0.03
      ? {
          id: 'R-019',
          title: 'Thin contingency cover',
          detail: 'Essential floors leave less than 3% of the budget as a buffer.',
          effect: 'Flagged the budget warning and suggested a smaller scope.',
          risk: {
            id: 'R-019',
            label: 'Contingency low',
            level: 'high',
            note: 'Keep a buffer for price changes or reduce the scope.',
          },
        }
      : null;
  }),
  rule('R-020', 'Critical booking window', (_ctx, derived) =>
    derived.daysUntil >= 0 && derived.daysUntil <= 60
      ? {
          id: 'R-020',
          title: 'Critical booking window',
          detail: 'The event is within 60 days, so core vendors must be booked now.',
          effect: 'Surfaced the venue and caterer booking risk.',
          risk: {
            id: 'R-020',
            label: 'Book core vendors now',
            level: 'high',
            note: 'Confirm venue and caterer in the next few days.',
          },
        }
      : null,
  ),
  rule('R-021', 'Multi-day functions', (ctx) =>
    ctx.multiDay
      ? {
          id: 'R-021',
          title: 'Multi-day functions',
          detail: 'Multi-day events repeat decor, catering, and outfit needs per function.',
          effect: 'Raised decor and catering reserves and added a function plan task.',
          budgetBoosts: { decor: 3, catering: 3 },
          extraTasks: [
            {
              templateId: 'rule-multiday',
              title: 'Map each function to decor, food, and outfits',
              categoryId: 'decor',
              leadDays: 60,
              rushable: true,
              skippable: false,
              dependsOn: [],
            },
          ],
          risk: {
            id: 'R-021',
            label: 'Multi-day scope',
            level: 'medium',
            note: 'Plan each function separately to avoid duplicate spend.',
          },
        }
      : null,
  ),
  rule('R-022', 'Livestream test', (ctx) =>
    ctx.livestream
      ? {
          id: 'R-022',
          title: 'Livestream test',
          detail: 'Hybrid events need a livestream vendor and a connectivity test.',
          effect: 'Added a livestream vendor and a test task.',
          budgetBoosts: { livestream: 3 },
          vendorCategories: ['livestream'],
          extraTasks: [
            {
              templateId: 'rule-livestream',
              title: 'Test livestream connectivity and backup',
              categoryId: 'livestream',
              leadDays: 7,
              rushable: true,
              skippable: false,
              dependsOn: [],
            },
          ],
          risk: {
            id: 'R-022',
            label: 'Livestream risk',
            level: 'medium',
            note: 'Test connectivity and keep a backup connection.',
          },
        }
      : null,
  ),
  rule('R-023', 'Surprise secrecy plan', (ctx) =>
    ctx.subType === 'Surprise'
      ? {
          id: 'R-023',
          title: 'Surprise secrecy plan',
          detail: 'A surprise event needs a decoy invite and a tight information list.',
          effect: 'Added a secrecy plan task.',
          extraTasks: [
            {
              templateId: 'rule-surprise',
              title: 'Prepare decoy invite and secrecy list',
              categoryId: 'invitations',
              leadDays: 14,
              rushable: true,
              skippable: true,
              dependsOn: [],
            },
          ],
          risk: {
            id: 'R-023',
            label: 'Surprise secrecy',
            level: 'low',
            note: 'Keep the guest list small and use a decoy invite.',
          },
        }
      : null,
  ),
];

/** All documented rules in stable evaluation order. */
export const rules: readonly Rule[] = ruleCatalogue;

/**
 * Evaluates every rule and returns only those that fire.
 *
 * @param ctx - Validated plan context
 * @param derived - Derived planning values
 * @returns Ordered fired rule results
 */
export function evaluateRules(ctx: PlanContext, derived: DerivedContext): RuleResult[] {
  return rules
    .map((entry) => entry.evaluate(ctx, derived))
    .filter((result): result is RuleResult => result !== null);
}
