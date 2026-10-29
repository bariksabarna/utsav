/**
 * Utsav application shell.
 *
 * Responsibilities: capture event context, run the deterministic planning
 * engine locally, persist the plan on device, and render budget, timeline,
 * vendors, risks, exports, and optional AI surfaces.
 * FR IDs: FR-ONB-001, FR-ONB-004, FR-RUL-003, FR-BUD-005, FR-TIM-007,
 * FR-VEN-003, FR-DSH-001, FR-DSH-003, FR-EXP-001, FR-PER-001, FR-AI-004.
 */

import { lazy, Suspense, useEffect, useMemo, useRef, useState, type ChangeEvent, type ReactElement } from 'react';
import { TaskRow } from './components/TaskRow';
import type { PlanPatch } from './api/types';
import { createPlanContext } from './engine/context';
import { buildPlan } from './engine/plan';
import type { LanguageOption, ScheduledTask, VendorStatus } from './engine/types';
import {
  defaultForm,
  dietaryOptions,
  eventOptions,
  languageOptions,
  priorityOptions,
  subTypeOptions,
  venueOptions,
  vendorStatusOptions,
  type FormState,
} from './form';
import { downloadCsv, downloadIcs, downloadState, printPlan, readPlanFile } from './exports';
import { english, makeTranslator, type Dictionary, type TranslationKey } from './i18n';
import {
  clearState,
  describePatch,
  loadState,
  saveState,
  type ExtraTask,
  type SavedState,
} from './persistence';

interface AppliedChange {
  id: string;
  label: string;
  patch: PlanPatch;
}

const AiPanel = lazy(async () => {
  const module = await import('./components/AiPanel');
  return { default: module.AiPanel };
});

const today = new Date().toISOString().slice(0, 10);

const languageLoaders: Partial<Record<LanguageOption, () => Promise<{ default: Dictionary }>>> = {
  हिन्दी: () => import('./i18n.hi'),
  বাংলা: () => import('./i18n.bn'),
};

/**
 * Formats a number as Indian currency (INR).
 *
 * @param value - The numeric value to format
 * @returns Formatted currency string
 */
function formatCurrency(value: number): string {
  return `₹ ${new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: 0,
  }).format(value)}`;
}

/**
 * Derives a human-readable task status from engine flags.
 *
 * @param task - Scheduled task with flags
 * @param t - Translation lookup
 * @returns Status label with text, never colour alone
 */
function taskStatus(task: ScheduledTask, t: (key: TranslationKey) => string): string {
  if (task.flags.includes('overdue')) return t('overdue');
  if (task.flags.includes('at-risk')) return t('atRisk');
  if (task.flags.includes('due-soon')) return t('dueSoon');
  return t('onTrack');
}

/**
 * Main application component for Utsav - AI Celebration & Event Planner.
 *
 * @returns React element
 */
function App(): ReactElement {
  const [initial] = useState<SavedState | null>(() => loadState());
  const [form, setForm] = useState<FormState>(initial?.form ?? defaultForm);
  const [vendorStatuses, setVendorStatuses] = useState<Record<string, VendorStatus>>(
    initial?.vendorStatuses ?? {},
  );
  const [doneTaskIds, setDoneTaskIds] = useState<string[]>(initial?.doneTaskIds ?? []);
  const [theme, setTheme] = useState<'light' | 'dark'>(initial?.theme ?? 'light');
  const [budgetOverrides, setBudgetOverrides] = useState<Record<string, number>>(
    initial?.budgetOverrides ?? {},
  );
  const [extraTasks, setExtraTasks] = useState<ExtraTask[]>(initial?.extraTasks ?? []);
  const [dueOverrides, setDueOverrides] = useState<Record<string, string>>(
    initial?.dueOverrides ?? {},
  );
  const [shortlistedIdeas, setShortlistedIdeas] = useState<string[]>(
    initial?.shortlistedIdeas ?? [],
  );
  const [extraVendorCategories, setExtraVendorCategories] = useState<string[]>(
    initial?.extraVendorCategories ?? [],
  );
  const [appliedChanges, setAppliedChanges] = useState<AppliedChange[]>([]);
  const [saveOk, setSaveOk] = useState(true);
  const [importMessage, setImportMessage] = useState('');
  const fileInput = useRef<HTMLInputElement>(null);
  const [dictionary, setDictionary] = useState<Dictionary>(english);

  useEffect(() => {
    let active = true;
    const loader = languageLoaders[form.language];
    if (!loader) {
      setDictionary(english);
      return () => {
        active = false;
      };
    }
    void loader()
      .then((module) => {
        if (active) setDictionary(module.default);
      })
      .catch(() => {
        if (active) setDictionary(english);
      });
    return () => {
      active = false;
    };
  }, [form.language]);

  const t = useMemo(() => makeTranslator(dictionary), [dictionary]);

  const doneSet = useMemo(() => new Set(doneTaskIds), [doneTaskIds]);

  const plan = useMemo(
    () =>
      buildPlan(
        createPlanContext(form.eventType, {
          subType: form.subType,
          title: `${form.eventType} plan`,
          date: form.date,
          startTime: form.startTime,
          guests: form.guests,
          children: form.children,
          budget: form.budget,
          cityTier: form.cityTier,
          venue: form.venue,
          dietary: [form.dietary],
          priorities: form.priority === 'Balanced' ? [] : [form.priority],
          language: form.language,
          elderlyGuests: form.elderlyGuests,
          liveMusic: form.liveMusic,
          servesAlcohol: form.servesAlcohol,
          multiDay: form.multiDay,
          livestream: form.livestream,
        }),
        today,
        doneSet,
      ),
    [form, doneSet],
  );

  const savedState = useMemo<SavedState>(
    () => ({
      version: 1,
      form,
      vendorStatuses,
      doneTaskIds,
      theme,
      budgetOverrides,
      extraTasks,
      dueOverrides,
      shortlistedIdeas,
      extraVendorCategories,
    }),
    [
      form,
      vendorStatuses,
      doneTaskIds,
      theme,
      budgetOverrides,
      extraTasks,
      dueOverrides,
      shortlistedIdeas,
      extraVendorCategories,
    ],
  );

  useEffect(() => {
    setSaveOk(saveState(savedState));
  }, [savedState]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  const toggleDone = (id: string): void => {
    setDoneTaskIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  };

  const handleEventTypeChange = (value: FormState['eventType']): void => {
    setForm((current) => ({
      ...current,
      eventType: value,
      subType: subTypeOptions[value][0] ?? current.subType,
    }));
  };

  const resetPlan = (): void => {
    clearState();
    setForm(defaultForm);
    setVendorStatuses({});
    setDoneTaskIds([]);
    setTheme('light');
    setBudgetOverrides({});
    setExtraTasks([]);
    setDueOverrides({});
    setShortlistedIdeas([]);
    setExtraVendorCategories([]);
    setAppliedChanges([]);
    setImportMessage('');
  };

  const applyPatch = (patch: PlanPatch): void => {
    if (patch.kind === 'budget') {
      setBudgetOverrides((current) => ({ ...current, [patch.categoryId]: patch.newPlanned }));
    }
    if (patch.kind === 'task-add') {
      setExtraTasks((current) => [
        ...current,
        {
          id: `ai-${Date.now()}-${current.length}`,
          title: patch.task.title,
          categoryId: patch.task.categoryId,
          due: patch.task.due,
          phase: patch.task.phase,
          reason: patch.reason,
        },
      ]);
    }
    if (patch.kind === 'task-reschedule') {
      setDueOverrides((current) => ({ ...current, [patch.taskId]: patch.newDue }));
    }
    if (patch.kind === 'vendor-category-add') {
      setExtraVendorCategories((current) =>
        current.includes(patch.categoryId) ? current : [...current, patch.categoryId],
      );
    }
    if (patch.kind === 'ideas-shortlist') {
      setShortlistedIdeas((current) => [...new Set([...current, ...patch.ideaIds])]);
    }
    setAppliedChanges((current) => [
      ...current,
      { id: `patch-${Date.now()}-${current.length}`, label: describePatch(patch), patch },
    ]);
    setImportMessage(t('patchApplied'));
  };

  const shortlistIdea = (ideaId: string): void => {
    applyPatch({
      kind: 'ideas-shortlist',
      ideaIds: [ideaId],
      reason: 'Shortlisted from the ideas panel.',
    });
  };

  const undoLast = (): void => {
    const last = appliedChanges[appliedChanges.length - 1];
    if (!last) return;
    const patch = last.patch;
    if (patch.kind === 'budget') {
      setBudgetOverrides((current) => {
        const next = { ...current };
        delete next[patch.categoryId];
        return next;
      });
    }
    if (patch.kind === 'task-add') {
      setExtraTasks((current) =>
        current.filter((task) => !(task.title === patch.task.title && task.due === patch.task.due)),
      );
    }
    if (patch.kind === 'task-reschedule') {
      setDueOverrides((current) => {
        const next = { ...current };
        delete next[patch.taskId];
        return next;
      });
    }
    if (patch.kind === 'vendor-category-add') {
      setExtraVendorCategories((current) => current.filter((item) => item !== patch.categoryId));
    }
    if (patch.kind === 'ideas-shortlist') {
      setShortlistedIdeas((current) =>
        current.filter((item) => !(patch.ideaIds as string[]).includes(item)),
      );
    }
    setAppliedChanges((current) => current.slice(0, -1));
    setImportMessage(t('undo'));
  };

  const handleImport = async (event: ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    const state = await readPlanFile(file);
    if (!state) {
      setImportMessage('That file is not a valid Utsav plan.');
      return;
    }
    setForm(state.form);
    setVendorStatuses(state.vendorStatuses);
    setDoneTaskIds(state.doneTaskIds);
    setTheme(state.theme);
    setBudgetOverrides(state.budgetOverrides);
    setExtraTasks(state.extraTasks);
    setDueOverrides(state.dueOverrides);
    setShortlistedIdeas(state.shortlistedIdeas);
    setExtraVendorCategories(state.extraVendorCategories);
    setAppliedChanges([]);
    setImportMessage(state.form.eventType ? 'Plan loaded.' : '');
  };

  const budgetLines = plan.budget.lines.map((line) => {
    const override = budgetOverrides[line.categoryId];
    return override === undefined ? line : { ...line, planned: override };
  });
  const budgetPercent =
    plan.budget.total > 0 ? Math.round((plan.budget.contingency / plan.budget.total) * 100) : 0;
  const topTasks = plan.tasks.slice(0, 5);

  return (
    <>
      <a href="#main-content" className="skip-link">
        {t('skip')}
      </a>

      <header className="site-header">
        <div className="brand-row">
          <span className="brand-mark" aria-hidden="true">
            U
          </span>
          <span className="brand-name">Utsav</span>
        </div>
        <nav aria-label="Main navigation" className="nav">
          <a href="#planner">{t('planner')}</a>
          <a href="#features">{t('features')}</a>
          <a href="#dashboard">{t('dashboard')}</a>
        </nav>
        <button
          type="button"
          className="secondary theme-toggle"
          aria-pressed={theme === 'dark'}
          onClick={() => setTheme((current) => (current === 'light' ? 'dark' : 'light'))}
        >
          {t('theme')}: {theme === 'light' ? t('themeDark') : t('themeLight')}
        </button>
      </header>

      <main id="main-content" className="layout">
        <section className="hero" aria-labelledby="hero-title">
          <div className="hero-copy">
            <p className="eyebrow">{t('eyebrow')}</p>
            <h1 id="hero-title">{t('heroTitle')}</h1>
            <p className="lede">{t('heroLede')}</p>
            <div className="actions">
              <a className="button-link" href="#planner">
                {t('startPlanning')}
              </a>
              <button type="button" className="secondary" onClick={resetPlan}>
                {t('samplePlan')}
              </button>
            </div>
            <p className="small-note">
              {saveOk ? t('saved') : 'Storage is blocked, so this plan stays in memory only.'}
            </p>
          </div>

          <aside className="card preview" aria-label="Planning preview card">
            <div className="preview-top">
              <span className="chip">
                {form.eventType} • {form.subType}
              </span>
              <span className="chip accent">
                {form.guests} {t('guestCount')}
              </span>
            </div>
            <h2>{form.eventType} plan</h2>
            <ul>
              <li>{formatCurrency(form.budget)} {t('budget')}</li>
              <li>
                {form.guests} {t('guestCount')}
              </li>
              <li>{form.venue}</li>
              <li>
                {plan.derived.daysUntil} {t('daysToGo')}
              </li>
            </ul>
          </aside>
        </section>

        <section id="features" className="feature-grid" aria-label={t('features')}>
          <article className="feature-panel">
            <h3>{t('event')}</h3>
            <p>{t('eventFeature')}</p>
          </article>
          <article className="feature-panel">
            <h3>{t('rules')}</h3>
            <p>
              {plan.rules.length} {t('rulesFeature')}
            </p>
          </article>
          <article className="feature-panel">
            <h3>{t('plan')}</h3>
            <p>{t('planFeature')}</p>
          </article>
        </section>

        <section id="planner" className="planner-panel" aria-labelledby="planner-heading">
          <h2 id="planner-heading">{t('chooseEvent')}</h2>
          <ul className="event-types" aria-label={t('eventType')}>
            {eventOptions.map((option) => (
              <li key={option}>
                <button
                  type="button"
                  aria-pressed={form.eventType === option}
                  className={form.eventType === option ? 'selected' : ''}
                  onClick={() => handleEventTypeChange(option)}
                >
                  {option}
                </button>
              </li>
            ))}
          </ul>

          <div className="planner-shell">
            <div className="planner-form">
              <div className="field-row">
                <label htmlFor="subType">{t('subType')}</label>
                <select
                  id="subType"
                  value={form.subType}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      subType: event.target.value as FormState['subType'],
                    }))
                  }
                >
                  {subTypeOptions[form.eventType].map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>

              <div className="field-row">
                <label htmlFor="budget">{t('budget')}</label>
                <input
                  id="budget"
                  type="number"
                  min={50000}
                  step={1000}
                  value={form.budget}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      budget: Number(event.target.value) || 0,
                    }))
                  }
                />
              </div>

              <div className="field-row">
                <label htmlFor="guests">{t('guests')}</label>
                <input
                  id="guests"
                  type="number"
                  min={1}
                  step={10}
                  value={form.guests}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      guests: Number(event.target.value) || 0,
                    }))
                  }
                />
              </div>

              <div className="field-row">
                <label htmlFor="children">{t('children')}</label>
                <input
                  id="children"
                  type="number"
                  min={0}
                  step={1}
                  value={form.children}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      children: Number(event.target.value) || 0,
                    }))
                  }
                />
              </div>

              <div className="field-row">
                <label htmlFor="date">{t('eventDate')}</label>
                <input
                  id="date"
                  type="date"
                  min={today}
                  value={form.date}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, date: event.target.value }))
                  }
                />
              </div>

              <div className="field-row">
                <label htmlFor="startTime">{t('startTime')}</label>
                <input
                  id="startTime"
                  type="time"
                  value={form.startTime}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, startTime: event.target.value }))
                  }
                />
              </div>

              <div className="field-row">
                <label htmlFor="venue">{t('venue')}</label>
                <select
                  id="venue"
                  value={form.venue}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      venue: event.target.value as FormState['venue'],
                    }))
                  }
                >
                  {venueOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>

              <div className="field-row">
                <label htmlFor="cityTier">{t('cityTier')}</label>
                <select
                  id="cityTier"
                  value={String(form.cityTier)}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      cityTier: Number(event.target.value) as 1 | 2 | 3,
                    }))
                  }
                >
                  <option value="1">Tier 1</option>
                  <option value="2">Tier 2</option>
                  <option value="3">Tier 3</option>
                </select>
              </div>

              <div className="field-row">
                <label htmlFor="dietary">{t('dietary')}</label>
                <select
                  id="dietary"
                  value={form.dietary}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      dietary: event.target.value as FormState['dietary'],
                    }))
                  }
                >
                  {dietaryOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>

              <div className="field-row">
                <label htmlFor="priority">{t('priority')}</label>
                <select
                  id="priority"
                  value={form.priority}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      priority: event.target.value as FormState['priority'],
                    }))
                  }
                >
                  {priorityOptions.map((option) => (
                    <option key={option} value={option}>
                      {option === 'Balanced' ? t('priorityBalanced') : option}
                    </option>
                  ))}
                </select>
              </div>

              <div className="field-row">
                <label htmlFor="language">{t('language')}</label>
                <select
                  id="language"
                  value={form.language}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      language: event.target.value as LanguageOption,
                    }))
                  }
                >
                  {languageOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>

              <fieldset className="toggle-group">
                <legend>{t('additionalContext')}</legend>
                {(
                  [
                    ['elderlyGuests', t('elderly')],
                    ['liveMusic', t('liveMusic')],
                    ['servesAlcohol', t('alcohol')],
                    ['multiDay', t('multiDay')],
                    ['livestream', t('livestream')],
                  ] as Array<[keyof FormState, string]>
                ).map(([key, label]) => (
                  <label key={key} className="toggle-row">
                    <input
                      type="checkbox"
                      checked={Boolean(form[key])}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          [key]: event.target.checked,
                        }))
                      }
                    />
                    <span>{label}</span>
                  </label>
                ))}
              </fieldset>

              <div className="actions">
                <button type="button" className="secondary" onClick={resetPlan}>
                  {t('resetPlan')}
                </button>
              </div>
            </div>

            <div id="dashboard" className="plan-card" aria-live="polite">
              <div className="summary-row">
                <div>
                  <p className="meta-label">{t('budgetStatus')}</p>
                  <h3>{formatCurrency(plan.budget.total)}</h3>
                  <small>
                    {formatCurrency(plan.budget.perHead)} {t('perGuest')} • {budgetPercent}%{' '}
                    {t('contingency')}
                  </small>
                </div>
                <div className="score-box">
                  <span>{t('readiness')}</span>
                  <strong>{plan.readiness.score}/100</strong>
                </div>
              </div>

              {plan.budget.status === 'infeasible' ? (
                <div className="alert" role="alert">
                  <h4>
                    {t('budgetShort')} {formatCurrency(plan.budget.gap)}
                  </h4>
                  <p>{t('essentialFloors')}</p>
                  <ul>
                    {plan.budget.suggestions.map((suggestion) => (
                      <li key={suggestion}>{suggestion}</li>
                    ))}
                  </ul>
                </div>
              ) : (
                <p className="good-note">{t('budgetCovers')}</p>
              )}

              <div className="card-block">
                <h4>{t('budget')}</h4>
                <ul className="data-list">
                  {budgetLines.map((line) => (
                    <li key={line.categoryId}>
                      <span>{line.label}</span>
                      <strong>{formatCurrency(line.planned)}</strong>
                      <small>
                        {line.status}
                        {budgetOverrides[line.categoryId] !== undefined ? ' • AI suggestion' : ''}
                      </small>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="card-block">
                <h4>{t('readinessBreakdown')}</h4>
                <ul className="rule-list">
                  {plan.readiness.breakdown.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>

              <div className="card-block">
                <h4>{t('nextTasks')}</h4>
                <ul className="timeline-list">
                  {topTasks.map((task) => (
                    <TaskRow
                      key={task.id}
                      title={task.title}
                      phase={task.phase}
                      due={dueOverrides[task.id] ?? task.due}
                      done={doneSet.has(task.id)}
                      status={taskStatus(task, t)}
                      rush={task.rushMode}
                      t={t}
                      onToggle={() => toggleDone(task.id)}
                    />
                  ))}
                </ul>
              </div>

              <div className="card-block">
                <h4>{t('risks')}</h4>
                <ul className="data-list">
                  {plan.risks.map((risk) => (
                    <li key={risk.id}>
                      <span>{risk.label}</span>
                      <strong>{risk.level}</strong>
                      <small>{risk.note}</small>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="card-block">
                <h4>{t('timeline')}</h4>
                {plan.skippedTasks.length > 0 && (
                  <p className="good-note">
                    {plan.skippedTasks.length} optional task(s) moved to the skip or compress list
                    because of rush mode.
                  </p>
                )}
                <ul className="timeline-list">
                  {plan.tasks.map((task) => (
                    <TaskRow
                      key={task.id}
                      title={task.title}
                      phase={task.phase}
                      due={dueOverrides[task.id] ?? task.due}
                      done={doneSet.has(task.id)}
                      status={taskStatus(task, t)}
                      rush={task.rushMode}
                      t={t}
                      onToggle={() => toggleDone(task.id)}
                    />
                  ))}
                </ul>
              </div>

              {extraTasks.length > 0 && (
                <div className="card-block">
                  <h4>{t('aiAddedTasks')}</h4>
                  <ul className="timeline-list">
                    {extraTasks.map((task) => (
                      <TaskRow
                        key={task.id}
                        title={task.title}
                        phase={task.phase}
                        due={dueOverrides[task.id] ?? task.due}
                        done={doneSet.has(task.id)}
                        status={t('onTrack')}
                        note={task.reason}
                        t={t}
                        onToggle={() => toggleDone(task.id)}
                      />
                    ))}
                  </ul>
                </div>
              )}

              {appliedChanges.length > 0 && (
                <div className="card-block">
                  <h4>{t('patchApplied')}</h4>
                  <ul className="rule-list">
                    {appliedChanges.map((change) => (
                      <li key={change.id}>{change.label}</li>
                    ))}
                  </ul>
                  <button type="button" className="secondary" onClick={undoLast}>
                    {t('undo')}
                  </button>
                </div>
              )}

              <div className="card-block">
                <h4>{t('runOfShow')}</h4>
                <table className="data-table">
                  <caption>
                    {t('runShowCaption')} {form.date}
                  </caption>
                  <thead>
                    <tr>
                      <th scope="col">Time</th>
                      <th scope="col">Segment</th>
                      <th scope="col">Owner</th>
                    </tr>
                  </thead>
                  <tbody>
                    {plan.runOfShow.map((segment) => (
                      <tr key={`${segment.time}-${segment.title}`}>
                        <td>{segment.time}</td>
                        <td>{segment.title}</td>
                        <td>{segment.owner}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="card-block">
                <h4>{t('vendors')}</h4>
                {extraVendorCategories.length > 0 && (
                  <p className="small-note">
                    AI added categories: {extraVendorCategories.join(', ')}.
                  </p>
                )}
                <ul className="vendor-list">
                  {plan.vendors.map((vendor) => {
                    const status = vendorStatuses[vendor.categoryId] ?? vendor.status;
                    return (
                      <li key={vendor.categoryId}>
                        <strong>{vendor.name}</strong>
                        <label>
                          <span className="sr-only">
                            {t('statusFor')} {vendor.name}
                          </span>
                          <select
                            value={status}
                            onChange={(event) => {
                              const nextStatus = event.target.value as VendorStatus;
                              setVendorStatuses((current) => ({
                                ...current,
                                [vendor.categoryId]: nextStatus,
                              }));
                            }}
                            aria-label={`${t('statusFor')} ${vendor.name}`}
                          >
                            {vendorStatusOptions.map((option) => (
                              <option key={option} value={option}>
                                {option}
                              </option>
                            ))}
                          </select>
                        </label>
                        <small>
                          {formatCurrency(vendor.pricePerHead)} / guest • {vendor.leadTimeDays} days
                          lead time
                        </small>
                        <small>{vendor.notes}</small>
                        <details>
                          <summary>
                            {t('checklist')} {vendor.name}
                          </summary>
                          <p>
                            {t('mustAsk')}: {vendor.mustAsk.join(' ')}
                          </p>
                          <p>
                            {t('contract')}: {vendor.contractChecklist.join(' ')}
                          </p>
                          <p>
                            {t('redFlags')}: {vendor.redFlags.join(' ')}
                          </p>
                        </details>
                        <a href={vendor.mapsUrl} target="_blank" rel="noopener noreferrer">
                          {t('findMaps')}
                        </a>
                      </li>
                    );
                  })}
                </ul>
              </div>

              <div className="card-block">
                <h4>{t('exportShare')}</h4>
                <div className="actions">
                  <button type="button" onClick={() => downloadCsv(plan)}>
                    {t('exportCsv')}
                  </button>
                  <button type="button" className="secondary" onClick={() => downloadIcs(plan)}>
                    {t('exportIcs')}
                  </button>
                  <button
                    type="button"
                    className="secondary"
                    onClick={() => downloadState(savedState)}
                  >
                    {t('exportJson')}
                  </button>
                  <button type="button" className="secondary" onClick={printPlan}>
                    {t('print')}
                  </button>
                  <button
                    type="button"
                    className="secondary"
                    onClick={() => fileInput.current?.click()}
                  >
                    {t('importPlan')}
                  </button>
                  <input
                    ref={fileInput}
                    type="file"
                    accept="application/json,.json"
                    className="sr-only"
                    aria-label={t('importPlan')}
                    onChange={(event) => void handleImport(event)}
                  />
                </div>
                {importMessage && <p className="small-note">{importMessage}</p>}
              </div>

              <Suspense fallback={<p className="small-note">Loading AI tools…</p>}>
                <AiPanel
                  plan={plan}
                  t={t}
                  onApplyPatch={applyPatch}
                  onShortlist={shortlistIdea}
                  shortlisted={shortlistedIdeas}
                />
              </Suspense>

              <div className="card-block">
                <h4>{t('why')}</h4>
                <ul className="rule-list">
                  {plan.rules.length === 0 && <li>R-000 — Balanced: no special rules fired.</li>}
                  {plan.rules.map((ruleResult) => (
                    <li key={ruleResult.id}>
                      <strong>{ruleResult.id}</strong> — {ruleResult.title}: {ruleResult.detail}{' '}
                      <em>{ruleResult.effect}</em>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}

export { App };
