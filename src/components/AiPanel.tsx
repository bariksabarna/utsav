/**
 * Optional AI surfaces for ideas, review, and the streaming assistant.
 *
 * Responsibilities: keep AI strictly additive, show provenance, require explicit
 * confirmation before any patch is applied, and stay useful when offline.
 * FR IDs: FR-IDE-001, FR-IDE-003, FR-AST-001, FR-AST-004, FR-DSH-004.
 */

import { useState, type FormEvent, type ReactElement } from 'react';
import { assistantRequest, fetchIdeas, fetchReview, streamAssistant, type ApiError } from '../api/client';
import { localeFor, toContextDigest, toPlanDigest } from '../api/digest';
import type { Idea, PlanPatch, ReviewRisk } from '../api/types';
import type { Plan } from '../engine/types';
import type { TranslationKey } from '../i18n';

interface AiPanelProps {
  plan: Plan;
  t: (key: TranslationKey) => string;
  onApplyPatch: (patch: PlanPatch) => void;
  onShortlist: (ideaId: string) => void;
  shortlisted: string[];
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

/**
 * Renders ideas, plan review, and the assistant.
 *
 * @param props - Plan, translations, and patch handlers
 * @returns React element
 */
function AiPanel({ plan, t, onApplyPatch, onShortlist, shortlisted }: AiPanelProps): ReactElement {
  const locale = localeFor(plan.context.language);
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [ideaSource, setIdeaSource] = useState<'gemini' | 'fallback' | null>(null);
  const [locked, setLocked] = useState<Set<string>>(new Set());
  const [focus, setFocus] = useState('');
  const [ideasLoading, setIdeasLoading] = useState(false);
  const [ideasError, setIdeasError] = useState('');

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [reply, setReply] = useState('');
  const [assistantSource, setAssistantSource] = useState<'gemini' | 'fallback' | null>(null);
  const [streaming, setStreaming] = useState(false);
  const [assistantError, setAssistantError] = useState('');
  const [pendingPatch, setPendingPatch] = useState<PlanPatch | null>(null);

  const [reviewRisks, setReviewRisks] = useState<ReviewRisk[]>([]);
  const [reviewSource, setReviewSource] = useState<'gemini' | 'fallback' | null>(null);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewError, setReviewError] = useState('');

  const generate = async (): Promise<void> => {
    setIdeasLoading(true);
    setIdeasError('');
    try {
      const response = await fetchIdeas({
        context: { ...toContextDigest(plan), ...(focus ? { focus } : {}) },
        ...(focus ? { focus } : {}),
        count: 4,
        lockedIds: [...locked],
        locale,
      });
      setIdeaSource(response.source);
      setIdeas((current) => {
        const kept = current.filter((idea) => locked.has(idea.id));
        const titles = new Set(kept.map((idea) => idea.title));
        const fresh = response.ideas.filter((idea) => !titles.has(idea.title));
        return [...kept, ...fresh].slice(0, 6);
      });
    } catch (error) {
      setIdeasError((error as ApiError).message || t('aiError'));
    } finally {
      setIdeasLoading(false);
    }
  };

  const send = async (text: string): Promise<void> => {
    const message = text.trim().slice(0, 1000);
    if (!message || streaming) return;
    const history: ChatMessage[] = [...messages, { role: 'user', content: message }];
    setMessages(history);
    setDraft('');
    setReply('');
    setAssistantError('');
    setPendingPatch(null);
    setStreaming(true);
    let answer = '';
    try {
      await streamAssistant(assistantRequest(history, toPlanDigest(plan), locale), (event) => {
        if (event.type === 'meta') setAssistantSource(event.data.source);
        if (event.type === 'token') {
          answer += event.data.text;
          setReply(answer);
        }
        if (event.type === 'patch') setPendingPatch(event.data);
      });
      setMessages([...history, { role: 'assistant', content: answer }]);
      setReply('');
    } catch (error) {
      setAssistantError((error as ApiError).message || t('aiError'));
    } finally {
      setStreaming(false);
    }
  };

  const review = async (): Promise<void> => {
    setReviewLoading(true);
    setReviewError('');
    try {
      const response = await fetchReview(toPlanDigest(plan), locale);
      setReviewRisks(response.risks);
      setReviewSource(response.source);
    } catch (error) {
      setReviewError((error as ApiError).message || t('aiError'));
    } finally {
      setReviewLoading(false);
    }
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    void send(draft);
  };

  return (
    <div className="ai-grid">
      <section className="card-block ai-card" aria-labelledby="ideas-heading">
        <h4 id="ideas-heading">{t('aiIdeas')}</h4>
        <p className="small-note">{t('ideasEmpty')}</p>
        <div className="field-row">
          <label htmlFor="idea-focus">{t('focusLabel')}</label>
          <input
            id="idea-focus"
            type="text"
            maxLength={120}
            value={focus}
            placeholder={t('focusPlaceholder')}
            onChange={(event) => setFocus(event.target.value)}
          />
        </div>
        <div className="actions">
          <button type="button" onClick={() => void generate()} disabled={ideasLoading}>
            {ideasLoading ? t('assistantThinking') : ideas.length ? t('regenerate') : t('generateIdeas')}
          </button>
          {ideaSource && <span className="chip">{ideaSource === 'gemini' ? t('sourceGemini') : t('sourceFallback')}</span>}
        </div>
        {ideaSource === 'fallback' && <p className="good-note">{t('fallbackNote')}</p>}
        {ideasError && <p className="alert" role="alert">{ideasError}</p>}
        {ideas.length > 0 && (
          <ul className="idea-list">
            {ideas.map((idea) => (
              <li key={idea.id}>
                <div className="idea-head">
                  <strong>{idea.title}</strong>
                  <span className="chip accent">{idea.category}</span>
                </div>
                <small>{idea.description}</small>
                <p>{idea.whyItFits}</p>
                <div className="idea-meta">
                  <span>{idea.costBand}</span>
                  <span>{idea.effort}</span>
                </div>
                <div className="actions">
                  <label className="toggle-row compact">
                    <input
                      type="checkbox"
                      checked={locked.has(idea.id)}
                      onChange={() =>
                        setLocked((current) => {
                          const next = new Set(current);
                          if (next.has(idea.id)) next.delete(idea.id);
                          else next.add(idea.id);
                          return next;
                        })
                      }
                    />
                    <span>{t('lockIdea')}</span>
                  </label>
                  <button
                    type="button"
                    className="secondary"
                    disabled={shortlisted.includes(idea.id)}
                    onClick={() => onShortlist(idea.id)}
                  >
                    {shortlisted.includes(idea.id) ? t('shortlisted') : t('shortlist')}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card-block ai-card" aria-labelledby="assistant-heading">
        <h4 id="assistant-heading">{t('assistant')}</h4>
        <p className="small-note">{t('assistantIntro')}</p>
        <div className="quick-prompts">
          {[t('quickBudget'), t('quickNext'), t('quickDiet')].map((prompt) => (
            <button key={prompt} type="button" className="secondary" onClick={() => void send(prompt)} disabled={streaming}>
              {prompt}
            </button>
          ))}
        </div>
        <ul className="chat-log" aria-live="polite">
          {messages.map((message, index) => (
            <li key={`${message.role}-${index}`} className={message.role}>
              <strong>{message.role === 'user' ? 'You' : 'Utsav'}</strong>
              <p>{message.content}</p>
            </li>
          ))}
          {reply && (
            <li className="assistant">
              <strong>Utsav</strong>
              <p>{reply}</p>
            </li>
          )}
        </ul>
        <form className="assistant-form" onSubmit={handleSubmit}>
          <label htmlFor="assistant-input">{t('assistant')}</label>
          <textarea
            id="assistant-input"
            rows={3}
            maxLength={1000}
            value={draft}
            placeholder={t('assistantPlaceholder')}
            onChange={(event) => setDraft(event.target.value)}
          />
          <button type="submit" disabled={streaming || draft.trim().length === 0}>
            {streaming ? t('assistantThinking') : t('send')}
          </button>
        </form>
        {assistantSource && (
          <p className="small-note">
            {assistantSource === 'gemini' ? t('sourceGemini') : t('sourceFallback')}
          </p>
        )}
        {assistantError && <p className="alert" role="alert">{assistantError}</p>}
        {pendingPatch && (
          <div className="patch-card" role="group" aria-label={t('applyPatch')}>
            <strong>{t('applyPatch')}</strong>
            <p>{pendingPatch.reason}</p>
            <div className="actions">
              <button
                type="button"
                onClick={() => {
                  onApplyPatch(pendingPatch);
                  setPendingPatch(null);
                }}
              >
                {t('applyPatch')}
              </button>
              <button type="button" className="secondary" onClick={() => setPendingPatch(null)}>
                {t('dismissPatch')}
              </button>
            </div>
          </div>
        )}
      </section>

      <section className="card-block ai-card" aria-labelledby="review-heading">
        <h4 id="review-heading">{t('review')}</h4>
        <div className="actions">
          <button type="button" onClick={() => void review()} disabled={reviewLoading}>
            {reviewLoading ? t('assistantThinking') : t('review')}
          </button>
          {reviewSource && (
            <span className="chip">{reviewSource === 'gemini' ? t('sourceGemini') : t('sourceFallback')}</span>
          )}
        </div>
        {reviewError && <p className="alert" role="alert">{reviewError}</p>}
        {reviewRisks.length > 0 && (
          <ul className="data-list">
            {reviewRisks.map((risk) => (
              <li key={risk.id}>
                <span>{risk.title}</span>
                <strong>{risk.level}</strong>
                <small>{risk.detail}</small>
                <small>{risk.fix}</small>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

export { AiPanel };
