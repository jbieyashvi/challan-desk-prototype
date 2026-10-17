import { Children, type ReactNode } from 'react'
import { CheckIcon } from '../features/shared'

/** One step of an ordered process. The state is derived from data by the caller, never stored. */
export type StepState = 'done' | 'current' | 'upcoming' | 'blocked' | 'skipped' | 'failed' | 'attention' | 'preset'

export const STEP_LABEL: Record<StepState, string> = {
  done: 'Done',
  current: 'Current step',
  upcoming: 'Not yet',
  blocked: 'Blocked',
  skipped: 'Not required',
  failed: 'Failed',
  attention: 'Needs a check',
  /** A default the user has not confirmed yet; it can still change. */
  preset: 'Default, not confirmed',
}

/**
 * Render inside <ol className="steps">. The step that needs action is expanded; a done step with a
 * `summary` collapses to that one line, and its details (receipt, references) fold under "Details".
 * `keepOpen` leaves a done step's content visible, e.g. when it holds the only action left.
 */
export function Step({ n, title, state, note, summary, keepOpen, children }: {
  n: number
  title: string
  state: StepState
  note?: string
  summary?: ReactNode
  keepOpen?: boolean
  children?: ReactNode
}) {
  const active = state === 'current' || state === 'failed' || state === 'attention'
  const collapsed = state === 'done' && summary !== undefined && !keepOpen
  // Conditional children can all be false; only render (or offer "Details" for) real content.
  const hasContent = Children.toArray(children).length > 0
  return (
    <li className={`step step--${state}${collapsed ? ' step--collapsed' : ''}`} aria-current={active ? 'step' : undefined}>
      <span className="step__marker" aria-hidden>{state === 'done' ? <CheckIcon ok /> : n}</span>
      <div className="step__body">
        <div className="step__head">
          <h3 className="step__title">{title}</h3>
          <span className="step__state">{STEP_LABEL[state]}</span>
        </div>
        {summary !== undefined && state === 'done' && <p className="step__summary">{summary}</p>}
        {note && <p className="step__note">{note}</p>}
        {hasContent && state !== 'skipped' && (collapsed ? (
          <details className="step__more">
            <summary>Details</summary>
            <div className="step__content">{children}</div>
          </details>
        ) : (
          <div className="step__content">{children}</div>
        ))}
      </div>
    </li>
  )
}
