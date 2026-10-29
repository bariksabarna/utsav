/**
 * Accessible task row used by the dashboard and timeline.
 *
 * Responsibilities: expose a real checkbox with a text status so completion is
 * never conveyed by colour alone.
 * FR IDs: FR-TIM-006, FR-A11Y-002.
 */

import type { ReactElement } from 'react';
import type { TranslationKey } from '../i18n';

interface TaskRowProps {
  title: string;
  phase: string;
  due: string;
  done: boolean;
  status: string;
  rush?: boolean;
  note?: string;
  t: (key: TranslationKey) => string;
  onToggle: () => void;
}

/**
 * Renders one task with a completion checkbox.
 *
 * @param props - Task fields and handlers
 * @returns React element
 */
function TaskRow({ title, phase, due, done, status, rush, note, t, onToggle }: TaskRowProps): ReactElement {
  return (
    <li className={done ? 'task-row done' : 'task-row'}>
      <label className="task-check">
        <input
          type="checkbox"
          checked={done}
          onChange={onToggle}
          aria-label={`${done ? t('markTodo') : t('markDone')}: ${title}`}
        />
        <span>
          <strong>{title}</strong>
          <span className="task-meta">
            {phase} • Due {due}
            {rush ? ` • ${t('rush')}` : ''}
          </span>
          <em>{done ? t('done') : status}</em>
          {note && <small>{note}</small>}
        </span>
      </label>
    </li>
  );
}

export { TaskRow };
