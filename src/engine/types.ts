/**
 * Shared domain types for the Utsav planning engine.
 *
 * Responsibilities: describe plan context, derived plan entities, rule
 * outcomes, and the aggregate plan consumed by the UI and API layers.
 * FR IDs: FR-ONB-001, FR-RUL-001, FR-RUL-002, FR-BUD-001, FR-TIM-001,
 * FR-VEN-001, FR-DSH-002.
 */

/** Supported celebration types. */
export type EventType = 'Wedding' | 'Birthday' | 'Community Event';

/** Wedding sub-types used to tailor rules, weights, and vendor categories. */
export type WeddingSubType =
  | 'Bengali'
  | 'North Indian'
  | 'South Indian'
  | 'Christian'
  | 'Muslim'
  | 'Court'
  | 'Destination';

/** Birthday sub-types. */
export type BirthdaySubType = 'Kids' | 'Milestone' | 'Surprise';

/** Community event sub-types. */
export type CommunitySubType = 'Puja' | 'Society Fest' | 'Fundraiser' | 'College Fest';

/** All supported event sub-types. */
export type EventSubType = WeddingSubType | BirthdaySubType | CommunitySubType;

/** Venue styles that influence risk and budget floors. */
export type VenueType =
  | 'Indoor Hall'
  | 'Outdoor'
  | 'Home'
  | 'Community Ground'
  | 'Destination';

/** User interface language. */
export type LanguageOption = 'English' | 'हिन्दी' | 'বাংলা';

/** Dietary requirements that shape catering and ideas. */
export type DietaryChoice =
  | 'Vegetarian'
  | 'Vegan'
  | 'Jain'
  | 'Halal'
  | 'No beef'
  | 'No pork'
  | 'Gluten-free'
  | 'Nut-free';

/** Budget categories that can be prioritised or boosted by rules. */
export type CategoryId =
  | 'venue'
  | 'catering'
  | 'decor'
  | 'photography'
  | 'attire'
  | 'music'
  | 'rituals'
  | 'invitations'
  | 'transport'
  | 'gifts'
  | 'contingency'
  | 'permits'
  | 'staffing'
  | 'sound'
  | 'activities'
  | 'cake'
  | 'travel'
  | 'stay'
  | 'security'
  | 'livestream';

/** User-selectable budget priorities. */
export type Priority = 'Catering' | 'Photography' | 'Decor' | 'Music' | 'Venue' | 'Attire';

/** Context captured by onboarding and used by every deterministic engine. */
export interface PlanContext {
  eventType: EventType;
  subType: EventSubType;
  title: string;
  date: string;
  startTime: string;
  guests: number;
  children: number;
  budget: number;
  currency: 'INR' | 'USD' | 'EUR' | 'GBP';
  cityTier: 1 | 2 | 3;
  venue: VenueType;
  vibeTags: string[];
  dietary: DietaryChoice[];
  priorities: Priority[];
  language: LanguageOption;
  elderlyGuests: boolean;
  liveMusic: boolean;
  servesAlcohol: boolean;
  multiDay: boolean;
  livestream: boolean;
}

/** Values derived once from the context so rules stay pure and cheap. */
export interface DerivedContext {
  daysUntil: number;
  rushMode: boolean;
  perHeadBudget: number;
  month: number;
  monsoon: boolean;
  summer: boolean;
  peakSeason: boolean;
  cateringFloor: number;
  venueFloor: number;
  infeasible: boolean;
  budgetGap: number;
  contingencyRate: number;
}

/** A budget line with planned, estimated, and actual tracking values. */
export interface BudgetLine {
  categoryId: CategoryId;
  label: string;
  planned: number;
  estimated: number;
  actual: number;
  floor: number;
  status: 'under' | 'on-track' | 'near' | 'over';
}

/** A single scheduled task. */
export interface ScheduledTask {
  id: string;
  templateId: string;
  title: string;
  categoryId: CategoryId;
  phase: TimelinePhase;
  due: string;
  leadDays: number;
  dependsOn: string[];
  status: 'todo' | 'in-progress' | 'done';
  flags: Array<'overdue' | 'due-soon' | 'at-risk' | 'custom' | 'rule-added'>;
  rushMode: boolean;
}

/** Timeline phases from foundation to post-event follow-up. */
export type TimelinePhase =
  | 'Foundation'
  | 'Booking'
  | 'Detailing'
  | 'Final Countdown'
  | 'Event Day'
  | 'Post-event';

/** Vendor pipeline states. */
export type VendorStatus =
  | 'To shortlist'
  | 'Shortlist'
  | 'Contacted'
  | 'Quote received'
  | 'Booked'
  | 'Paid';

/** A vendor category with checklist content and quote-normalisation data. */
export interface VendorPlan {
  categoryId: CategoryId;
  name: string;
  status: VendorStatus;
  notes: string;
  budgetShare: number;
  leadTimeDays: number;
  mustAsk: string[];
  contractChecklist: string[];
  redFlags: string[];
  pricePerHead: number;
  mapsUrl: string;
}

/** A day-of run-of-show segment. */
export interface RunOfShowSegment {
  time: string;
  title: string;
  owner: string;
}

/** A risk surfaced by a rule. */
export interface RiskFlag {
  id: string;
  label: string;
  level: 'low' | 'medium' | 'high';
  note: string;
}

/** A fired rule with its user-facing explanation and effect. */
export interface RuleResult {
  id: string;
  title: string;
  detail: string;
  effect: string;
  risk?: RiskFlag;
  budgetBoosts?: Partial<Record<CategoryId, number>>;
  extraTasks?: RuleTask[];
  vendorCategories?: CategoryId[];
}

/** Task template contributed by a rule. */
export interface RuleTask {
  templateId: string;
  title: string;
  categoryId: CategoryId;
  leadDays: number;
  rushable: boolean;
  skippable: boolean;
  dependsOn: string[];
}

/** Rule definition contract. */
export interface Rule {
  id: string;
  title: string;
  evaluate: (ctx: PlanContext, derived: DerivedContext) => RuleResult | null;
}

/** Readiness score with a transparent breakdown. */
export interface ReadinessResult {
  score: number;
  taskProgress: number;
  vendorCoverage: number;
  budgetHealth: number;
  riskPenaltyInverse: number;
  breakdown: string[];
}

/** Budget allocation result including feasibility guidance. */
export interface BudgetPlan {
  lines: BudgetLine[];
  total: number;
  perHead: number;
  contingencyRate: number;
  contingency: number;
  status: 'feasible' | 'infeasible';
  gap: number;
  suggestions: string[];
  firedRuleIds: string[];
}

/** Complete plan produced by the deterministic engines. */
export interface Plan {
  context: PlanContext;
  derived: DerivedContext;
  budget: BudgetPlan;
  tasks: ScheduledTask[];
  skippedTasks: ScheduledTask[];
  vendors: VendorPlan[];
  rules: RuleResult[];
  risks: RiskFlag[];
  runOfShow: RunOfShowSegment[];
  readiness: ReadinessResult;
}
