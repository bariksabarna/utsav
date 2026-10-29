/**
 * Curated deterministic fallback for every AI feature.
 *
 * Responsibilities: keep ideas, assistant guidance, and plan review useful when
 * Gemini is unavailable, unconfigured, slow, or returns invalid output.
 * FR IDs: FR-AI-003, FR-AI-005, FR-IDE-004.
 */

import type { AssistantReply, Idea, IdeaCategory, ReviewRisk } from '../../../src/api/types.js';
import type { AssistantRequestInput, IdeasRequestInput, PlanDigestInput } from '../schemas.js';
import type { LlmProvider } from './provider.js';

interface IdeaTemplate {
  category: IdeaCategory;
  title: string;
  description: string;
  why: string;
  costBand: Idea['costBand'];
  effort: Idea['effort'];
  tasks?: string[];
}

const wedIdeaBank: IdeaTemplate[] = [
  {
    category: 'theme',
    title: 'Heritage courtyard welcome',
    description: 'A warm welcome with brass lamps, marigold strings, and a short folk performance at the entrance.',
    why: 'It uses Indian craft cues and gives guests a memorable arrival moment without a large build.',
    costBand: 'medium',
    effort: 'moderate',
    tasks: ['Book folk performers', 'Confirm brass lamp rental'],
  },
  {
    category: 'menu',
    title: 'Regional thali stations',
    description: 'Two regional thalis with live counters for breads and chaat, plus a clearly labelled Jain and vegan station.',
    why: 'Thali stations handle mixed diets and large guest counts better than a single plated menu.',
    costBand: 'medium',
    effort: 'moderate',
    tasks: ['Finalise regional menu', 'Confirm live counter equipment'],
  },
  {
    category: 'decor',
    title: 'Marigold and brass canopy',
    description: 'A low-cost canopy of marigold strings, rented brass pots, and warm fairy lights.',
    why: 'Marigold is seasonal, affordable, and photographs well in both daylight and evening light.',
    costBand: 'low',
    effort: 'easy',
  },
  {
    category: 'entertainment',
    title: 'Dhol-led baraat loop',
    description: 'A 20-minute dhol and brass-band loop with a planned start and end point to avoid traffic delays.',
    why: 'A short, routed baraat keeps energy high and controls cost and neighbourhood noise.',
    costBand: 'medium',
    effort: 'moderate',
    tasks: ['Confirm dhol team', 'Share route plan with venue'],
  },
  {
    category: 'favours',
    title: 'Spice and sweet hamper',
    description: 'Small reusable jars with a regional spice blend and two mithai, packed with a handwritten tag.',
    why: 'It is a useful, culturally familiar favour that travels well and suits most budgets.',
    costBand: 'low',
    effort: 'easy',
    tasks: ['Order jars', 'Confirm mithai shelf life'],
  },
  {
    category: 'activity',
    title: 'Mehendi and folk-art corner',
    description: 'Two mehendi artists beside a block-printing table where guests can make a small keepsake.',
    why: 'It gives waiting guests something to do and works across age groups.',
    costBand: 'low',
    effort: 'easy',
  },
];

const birthdayIdeaBank: IdeaTemplate[] = [
  {
    category: 'theme',
    title: 'Colour-block carnival',
    description: 'Bright colour zones, a photo wall, and a simple passport-style activity card for guests.',
    why: 'Colour zones make a small venue feel bigger and keep children moving between activities.',
    costBand: 'medium',
    effort: 'moderate',
  },
  {
    category: 'menu',
    title: 'Mini-bite picnic spread',
    description: 'Small wraps, fruit cups, and a build-your-own chaat bar with allergy labels.',
    why: 'Mini bites reduce waste and let guests with different diets choose safely.',
    costBand: 'low',
    effort: 'easy',
  },
  {
    category: 'decor',
    title: 'Balloon arch with paper fans',
    description: 'A reusable paper-fan backdrop with a small balloon arch rather than a full balloon wall.',
    why: 'Paper fans cut plastic use and cost while still creating a strong photo backdrop.',
    costBand: 'low',
    effort: 'easy',
  },
  {
    category: 'entertainment',
    title: 'Storyteller and music corner',
    description: 'A 30-minute storyteller session followed by a curated playlist and a bubble machine.',
    why: 'It works for mixed ages without the noise and cost of a full stage show.',
    costBand: 'medium',
    effort: 'moderate',
  },
  {
    category: 'favours',
    title: 'Seed-paper return gift',
    description: 'Plantable seed paper notebooks with a small pencil, packed in a cloth pouch.',
    why: 'It is useful, low-waste, and memorable for both children and adults.',
    costBand: 'low',
    effort: 'easy',
  },
  {
    category: 'activity',
    title: 'DIY cookie decorating',
    description: 'A supervised cookie-decorating table with numbered seating and allergy-safe icing.',
    why: 'It keeps children engaged while adults eat and needs very little floor space.',
    costBand: 'low',
    effort: 'easy',
  },
];

const communityIdeaBank: IdeaTemplate[] = [
  {
    category: 'theme',
    title: 'Neighbourhood festival market',
    description: 'Local artisans and home cooks run small stalls around one shared stage.',
    why: 'It supports local livelihoods and gives the event a purpose beyond entertainment.',
    costBand: 'medium',
    effort: 'moderate',
  },
  {
    category: 'menu',
    title: 'Community potluck with safety labels',
    description: 'A potluck with labelled allergens, a vegetarian-only table, and a volunteer serving rota.',
    why: 'It lowers food cost and builds participation while keeping dietary needs visible.',
    costBand: 'low',
    effort: 'moderate',
  },
  {
    category: 'decor',
    title: 'Rangoli and fabric bunting',
    description: 'Volunteer-made rangoli at entrances and reusable fabric bunting across the hall.',
    why: 'It uses community participation instead of paid decor and can be stored for reuse.',
    costBand: 'low',
    effort: 'easy',
  },
  {
    category: 'entertainment',
    title: 'Open-mic and local performance slot',
    description: 'A 45-minute open mic with two local performance groups and a fixed soundcheck.',
    why: 'It gives local talent a stage and keeps the programme predictable.',
    costBand: 'medium',
    effort: 'moderate',
  },
  {
    category: 'favours',
    title: 'Sapling and recipe booklet',
    description: 'A native sapling with a printed recipe booklet contributed by community members.',
    why: 'It is a low-cost takeaway with a longer life than plastic mementos.',
    costBand: 'low',
    effort: 'easy',
  },
  {
    category: 'activity',
    title: 'Skill-share corner',
    description: 'Short volunteer-led sessions on craft, first aid, or financial literacy between performances.',
    why: 'It adds value for attendees and uses existing community expertise.',
    costBand: 'low',
    effort: 'moderate',
  },
];

function bankFor(eventType: string): IdeaTemplate[] {
  if (eventType === 'Wedding') return wedIdeaBank;
  if (eventType === 'Birthday') return birthdayIdeaBank;
  return communityIdeaBank;
}

function stableHash(value: string): number {
  let hash = 0;
  for (const char of value) {
    hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  }
  return hash;
}

/**
 * Curated provider used when the live model cannot answer.
 */
export class FallbackProvider implements LlmProvider {
  readonly name = 'fallback';

  async generateIdeas(request: IdeasRequestInput): Promise<Idea[]> {
    const bank = bankFor(request.context.eventType);
    const focus = `${request.focus ?? request.context.focus ?? ''}${request.context.dietary.join(' ')}`;
    const start = stableHash(focus + request.count) % bank.length;
    const rotated = [...bank.slice(start), ...bank.slice(0, start)];
    const ideas: Idea[] = rotated.slice(0, request.count).map((template, index) => ({
      id: `fallback-${request.context.eventType.toLowerCase().replace(/\s+/g, '-')}-${template.category}-${index + 1}`,
      category: template.category,
      title: template.title,
      description: template.description,
      whyItFits: template.why,
      costBand: template.costBand,
      effort: template.effort,
      ...(template.tasks ? { tasks: template.tasks } : {}),
    }));
    return ideas;
  }

  async generateAssistant(request: AssistantRequestInput): Promise<AssistantReply> {
    const latest = [...request.messages].reverse().find((message) => message.role === 'user');
    const text = latest?.content.toLowerCase() ?? '';
    const plan = request.plan;
    const perGuest = Math.round(plan.budget / Math.max(1, plan.guests));
    const largest = [...plan.budgetLines].sort((a, b) => b.planned - a.planned)[0];
    const daysLeft = Math.ceil((Date.parse(plan.date) - Date.now()) / 86_400_000);

    if (/overspend|budget|cost|reduce/.test(text) && largest) {
      return {
        text: `Your largest line is ${largest.label} at INR ${largest.planned.toLocaleString('en-IN')}. The plan spends about INR ${perGuest.toLocaleString('en-IN')} per guest. Start by trimming 10% from the largest line and moving it to contingency, then re-check catering and venue floors before confirming vendors.`,
      };
    }

    if (/task|next|priorit|order/.test(text)) {
      const next = plan.topTasks.slice(0, 3);
      return {
        text: next.length
          ? `Do these next: ${next.map((task, index) => `${index + 1}. ${task}`).join(' ')} Keep one owner and one due date per task, and confirm venue and catering before spending on decor.`
          : 'Add at least one task with an owner and due date, then confirm venue and catering before decor. Rush plans should reserve the largest buffer for permits and vendor confirmations.',
      };
    }

    if (/diet|food|jain|vegan|allerg/.test(text)) {
      const dietary = plan.dietary.length ? plan.dietary.join(', ') : 'no restrictions recorded';
      return {
        text: `Recorded dietary needs: ${dietary}. Ask the caterer for a written allergen matrix, separate serving tools, and a named lead for each special meal. Confirm final guest counts 7 days before the event.`,
      };
    }

    if (daysLeft <= 30) {
      return {
        text: `Only ${Math.max(0, daysLeft)} days remain. Lock venue, catering, and permits today, then send a one-page run-of-show to every vendor. Avoid adding new decor scope and keep a 10% contingency untouched.`,
      };
    }

    return {
      text: `Your plan is at INR ${perGuest.toLocaleString('en-IN')} per guest with ${plan.topTasks.length} open tasks. Confirm the venue and catering first, then assign one owner to each task and keep contingency untouched until the final week.`,
    };
  }

  async generateReview(plan: PlanDigestInput): Promise<ReviewRisk[]> {
    const risks: ReviewRisk[] = [];
    const perGuest = Math.round(plan.budget / Math.max(1, plan.guests));
    const month = Number(plan.date.slice(5, 7));
    const daysLeft = Math.ceil((Date.parse(plan.date) - Date.now()) / 86_400_000);
    const catering = plan.budgetLines.find((line) => /cater|food|menu/i.test(line.label));

    if (perGuest < 800) {
      risks.push({
        id: 'review-budget-per-guest',
        level: 'high',
        title: 'Budget per guest is very tight',
        detail: `The plan allows about INR ${perGuest} per guest, which is below a safe catering and venue buffer in most Indian cities.`,
        fix: 'Reduce guest count, move to a daytime slot, or raise the budget before confirming vendors.',
      });
    }

    if (daysLeft < 30) {
      risks.push({
        id: 'review-lead-time',
        level: 'high',
        title: 'Compressed booking window',
        detail: `Only ${Math.max(0, daysLeft)} days remain, so venue, permits, and catering may already be booked elsewhere.`,
        fix: 'Call two backup venues today and ask each vendor for written confirmation within 48 hours.',
      });
    }

    if (catering && catering.planned < plan.budget * 0.3) {
      risks.push({
        id: 'review-catering-share',
        level: 'medium',
        title: 'Catering share looks low',
        detail: 'Catering is below 30% of the total budget, which can lead to small portions or hidden add-ons.',
        fix: 'Ask for a per-plate quote including service, rentals, and taxes, then rebalance from decor.',
      });
    }

    if (month >= 6 && month <= 9) {
      risks.push({
        id: 'review-monsoon',
        level: 'medium',
        title: 'Monsoon contingency needed',
        detail: 'The event falls in the monsoon window, so outdoor plans need a covered backup and transport buffer.',
        fix: 'Reserve a covered backup area and add 45 minutes of buffer to vendor arrival times.',
      });
    }

    if (plan.dietary.length > 0) {
      risks.push({
        id: 'review-dietary',
        level: 'medium',
        title: 'Dietary handling must be explicit',
        detail: `The plan records ${plan.dietary.join(', ')} needs but does not prove the caterer can separate preparation.`,
        fix: 'Get a written allergen matrix and a named kitchen lead for each special meal.',
      });
    }

    if (plan.budgetLines.length === 0) {
      risks.push({
        id: 'review-no-budget-lines',
        level: 'high',
        title: 'No budget allocation found',
        detail: 'The plan digest has no budget lines, so overspend and vendor floors cannot be checked.',
        fix: 'Regenerate the budget before contacting vendors.',
      });
    }

    return risks.slice(0, 6);
  }
}
