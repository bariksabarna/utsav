/**
 * Backward-scheduled timeline engine.
 *
 * Responsibilities: select task templates, add rule tasks, honour
 * dependencies, compress lead times in rush mode, derive task flags, and
 * build the day-of run-of-show.
 * FR IDs: FR-TIM-001 to FR-TIM-008.
 */

import type {
  CategoryId,
  DerivedContext,
  PlanContext,
  RuleResult,
  RunOfShowSegment,
  ScheduledTask,
  TimelinePhase,
} from './types';

interface TaskTemplate {
  templateId: string;
  title: string;
  categoryId: CategoryId;
  leadDays: number;
  rushable: boolean;
  skippable: boolean;
  dependsOn: string[];
}

const templates: Record<PlanContext['eventType'], TaskTemplate[]> = {
  Wedding: [
    {
      templateId: 'w-venue',
      title: 'Lock venue and guest count',
      categoryId: 'venue',
      leadDays: 120,
      rushable: false,
      skippable: false,
      dependsOn: [],
    },
    {
      templateId: 'w-caterer',
      title: 'Shortlist caterer and decor team',
      categoryId: 'catering',
      leadDays: 90,
      rushable: true,
      skippable: false,
      dependsOn: ['w-venue'],
    },
    {
      templateId: 'w-attire',
      title: 'Confirm outfits and beauty trials',
      categoryId: 'attire',
      leadDays: 60,
      rushable: true,
      skippable: true,
      dependsOn: ['w-venue'],
    },
    {
      templateId: 'w-rituals',
      title: 'Confirm officiant and ritual items',
      categoryId: 'rituals',
      leadDays: 45,
      rushable: true,
      skippable: false,
      dependsOn: ['w-venue'],
    },
    {
      templateId: 'w-photo',
      title: 'Confirm entertainment and photo team',
      categoryId: 'photography',
      leadDays: 45,
      rushable: true,
      skippable: false,
      dependsOn: ['w-caterer'],
    },
    {
      templateId: 'w-invites',
      title: 'Final guest check and invites',
      categoryId: 'invitations',
      leadDays: 21,
      rushable: true,
      skippable: false,
      dependsOn: ['w-venue'],
    },
    {
      templateId: 'w-rehearsal',
      title: 'Run-of-show rehearsal',
      categoryId: 'venue',
      leadDays: 3,
      rushable: false,
      skippable: false,
      dependsOn: ['w-photo', 'w-invites'],
    },
  ],
  Birthday: [
    {
      templateId: 'b-theme',
      title: 'Finalize birthday theme and guest list',
      categoryId: 'activities',
      leadDays: 45,
      rushable: true,
      skippable: false,
      dependsOn: [],
    },
    {
      templateId: 'b-venue',
      title: 'Confirm venue and vendor checklist',
      categoryId: 'venue',
      leadDays: 30,
      rushable: false,
      skippable: false,
      dependsOn: ['b-theme'],
    },
    {
      templateId: 'b-cake',
      title: 'Cake, menu, and games plan',
      categoryId: 'cake',
      leadDays: 14,
      rushable: true,
      skippable: false,
      dependsOn: ['b-venue'],
    },
    {
      templateId: 'b-family',
      title: 'Send final schedule to family',
      categoryId: 'invitations',
      leadDays: 7,
      rushable: true,
      skippable: true,
      dependsOn: ['b-cake'],
    },
    {
      templateId: 'b-setup',
      title: 'Arrival and setup checklist',
      categoryId: 'venue',
      leadDays: 1,
      rushable: false,
      skippable: false,
      dependsOn: ['b-cake'],
    },
  ],
  'Community Event': [
    {
      templateId: 'c-permits',
      title: 'Confirm permits and volunteers',
      categoryId: 'permits',
      leadDays: 90,
      rushable: false,
      skippable: false,
      dependsOn: [],
    },
    {
      templateId: 'c-logistics',
      title: 'Book logistics and power support',
      categoryId: 'sound',
      leadDays: 60,
      rushable: true,
      skippable: false,
      dependsOn: ['c-permits'],
    },
    {
      templateId: 'c-stage',
      title: 'Finalize stage and signage',
      categoryId: 'decor',
      leadDays: 25,
      rushable: true,
      skippable: true,
      dependsOn: ['c-logistics'],
    },
    {
      templateId: 'c-dryrun',
      title: 'Dry run with performers',
      categoryId: 'sound',
      leadDays: 7,
      rushable: true,
      skippable: true,
      dependsOn: ['c-stage'],
    },
    {
      templateId: 'c-emergency',
      title: 'Event-day emergency plan',
      categoryId: 'security',
      leadDays: 1,
      rushable: false,
      skippable: false,
      dependsOn: ['c-dryrun'],
    },
  ],
};

const peakCategories = new Set<CategoryId>(['venue', 'catering', 'photography']);

/** Adds days to an ISO date without local timezone drift. */
function addDays(date: string, days: number): string {
  return new Date(Date.parse(`${date}T00:00:00Z`) + days * 86_400_000)
    .toISOString()
    .slice(0, 10);
}

/** Maps lead days to a timeline phase. */
function phaseFor(leadDays: number): TimelinePhase {
  if (leadDays >= 90) {
    return 'Foundation';
  }
  if (leadDays >= 30) {
    return 'Booking';
  }
  if (leadDays >= 8) {
    return 'Detailing';
  }
  if (leadDays >= 1) {
    return 'Final Countdown';
  }
  if (leadDays === 0) {
    return 'Event Day';
  }
  return 'Post-event';
}

/** Builds a map of template IDs to templates from base and rule tasks. */
function collectTemplates(
  ctx: PlanContext,
  firedRules: RuleResult[],
): Map<string, TaskTemplate> {
  const collected = new Map<string, TaskTemplate>();

  for (const template of templates[ctx.eventType]) {
    collected.set(template.templateId, template);
  }

  for (const result of firedRules) {
    for (const task of result.extraTasks ?? []) {
      if (!collected.has(task.templateId)) {
        collected.set(task.templateId, task);
      }
    }
  }

  return collected;
}

/** Computes the longest dependency chain in normal lead days. */
function criticalPath(all: Map<string, TaskTemplate>): number {
  const memo = new Map<string, number>();

  const visit = (id: string, visiting: Set<string>): number => {
    const cached = memo.get(id);
    if (cached !== undefined) {
      return cached;
    }
    const template = all.get(id);
    if (!template) {
      return 0;
    }
    if (visiting.has(id)) {
      throw new Error(`Circular task dependency at ${id}`);
    }
    visiting.add(id);
    const parent = template.dependsOn.reduce(
      (max, dependency) => Math.max(max, visit(dependency, visiting)),
      0,
    );
    visiting.delete(id);
    const total = parent + template.leadDays;
    memo.set(id, total);
    return total;
  };

  return Math.max(0, ...[...all.keys()].map((id) => visit(id, new Set<string>())));
}

/** Orders tasks with Kahn's algorithm and throws on cycles. */
function topologicalOrder(tasks: ScheduledTask[]): ScheduledTask[] {
  const byId = new Map(tasks.map((task) => [task.templateId, task]));
  const indegree = new Map<string, number>();
  const dependents = new Map<string, string[]>();

  for (const task of tasks) {
    const deps = task.dependsOn.filter((dependency) => byId.has(dependency));
    indegree.set(task.templateId, deps.length);
    for (const dependency of deps) {
      dependents.set(dependency, [...(dependents.get(dependency) ?? []), task.templateId]);
    }
  }

  const queue = tasks
    .filter((task) => (indegree.get(task.templateId) ?? 0) === 0)
    .map((task) => task.templateId);
  const ordered: ScheduledTask[] = [];

  while (queue.length > 0) {
    const id = queue.shift();
    if (!id) {
      break;
    }
    const task = byId.get(id);
    if (task) {
      ordered.push(task);
    }
    for (const dependent of dependents.get(id) ?? []) {
      const next = (indegree.get(dependent) ?? 1) - 1;
      indegree.set(dependent, next);
      if (next === 0) {
        queue.push(dependent);
      }
    }
  }

  if (ordered.length !== tasks.length) {
    throw new Error('Circular task dependency detected');
  }

  return ordered;
}

/** Formats an hour offset from the start time as HH:mm. */
function timeAt(startTime: string, offsetHours: number): string {
  const [hoursText, minutesText] = startTime.split(':');
  const startMinutes = Number(hoursText) * 60 + Number(minutesText);
  const total = ((startMinutes + offsetHours * 60) % 1440 + 1440) % 1440;
  const hours = Math.floor(total / 60)
    .toString()
    .padStart(2, '0');
  const minutes = (total % 60).toString().padStart(2, '0');
  return `${hours}:${minutes}`;
}

/**
 * Builds day-of run-of-show segments relative to the start time.
 *
 * @param ctx - Validated plan context
 * @returns Ordered run-of-show segments
 */
export function buildRunOfShow(ctx: PlanContext): RunOfShowSegment[] {
  const segments: Array<[number, string, string]> = [
    [-10, 'Venue access and setup begins', 'Venue lead'],
    [-8, 'Decor and sound check', 'Decor lead'],
    [-2, 'Guest arrival and welcome desk', 'Volunteer lead'],
    [0, 'Main ceremony or programme', 'Host'],
    [2, 'Dinner service', 'Catering lead'],
    [3, 'Music, photos, and activities', 'Entertainment lead'],
    [4, 'Wrap-up and vendor release', 'Planner'],
  ];

  return segments.map(([offset, title, owner]) => ({
    time: timeAt(ctx.startTime, offset),
    title,
    owner,
  }));
}

/**
 * Schedules all tasks for a context.
 *
 * @param ctx - Validated plan context
 * @param derived - Derived planning values
 * @param firedRules - Rules that fired and may add tasks
 * @param today - Injected current date in YYYY-MM-DD form
 * @returns Scheduled tasks, skipped tasks, rush flag, and run-of-show
 */
export function scheduleTimeline(
  ctx: PlanContext,
  derived: DerivedContext,
  firedRules: RuleResult[],
  today: string,
): {
  tasks: ScheduledTask[];
  skippedTasks: ScheduledTask[];
  runOfShow: RunOfShowSegment[];
  rushMode: boolean;
  scale: number;
} {
  const all = collectTemplates(ctx, firedRules);
  const path = criticalPath(all);
  const rushMode = derived.daysUntil < path;
  const scale = rushMode ? Math.min(1, Math.max(0.35, derived.daysUntil / Math.max(path, 1))) : 1;
  const peakFired = firedRules.some((result) => result.id === 'R-012');
  const tasks: ScheduledTask[] = [];
  const skippedTasks: ScheduledTask[] = [];

  for (const template of all.values()) {
    const seasonFactor = peakFired && peakCategories.has(template.categoryId) ? 1.3 : 1;
    const leadDays = Math.max(0, Math.round(template.leadDays * scale * seasonFactor));
    const due = addDays(ctx.date, -leadDays);
    const flags: ScheduledTask['flags'] = [];

    if (rushMode) {
      flags.push('at-risk');
    }
    if (template.templateId.startsWith('rule-')) {
      flags.push('rule-added');
    }
    if (due < today) {
      flags.push('overdue');
    } else if (Date.parse(`${due}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`) <= 7 * 86_400_000) {
      flags.push('due-soon');
    }
    if (rushMode && !template.rushable) {
      flags.push('at-risk');
    }

    const task: ScheduledTask = {
      id: template.templateId,
      templateId: template.templateId,
      title: template.title,
      categoryId: template.categoryId,
      phase: phaseFor(leadDays),
      due,
      leadDays,
      dependsOn: template.dependsOn,
      status: 'todo',
      flags: [...new Set(flags)],
      rushMode,
    };

    if (rushMode && template.skippable) {
      skippedTasks.push(task);
    } else {
      tasks.push(task);
    }
  }

  const ordered = topologicalOrder(tasks);
  const byId = new Map(ordered.map((task) => [task.templateId, task]));

  for (const task of ordered) {
    for (const dependency of task.dependsOn) {
      const prerequisite = byId.get(dependency);
      if (prerequisite && prerequisite.due > task.due) {
        task.due = prerequisite.due;
      }
    }
  }

  ordered.sort((a, b) => a.due.localeCompare(b.due) || a.templateId.localeCompare(b.templateId));

  return {
    tasks: ordered,
    skippedTasks: skippedTasks.sort((a, b) => a.due.localeCompare(b.due)),
    runOfShow: buildRunOfShow(ctx),
    rushMode,
    scale,
  };
}
