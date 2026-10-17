// Small structural components shared by every screen.
import type { ReactNode } from 'react'
import type { Tone } from '../domain/labels'
import type { ActivityEntry } from '../domain/types'
import { formatDateTime } from '../domain/format'

export function PageHeader({ eyebrow, title, description, actions, meta }: {
  eyebrow?: ReactNode
  title: ReactNode
  description?: ReactNode
  actions?: ReactNode
  meta?: ReactNode
}) {
  return (
    <header className="page-header">
      <div className="page-header__text">
        {eyebrow && <div className="page-header__eyebrow">{eyebrow}</div>}
        <h1 className="page-header__title">{title}</h1>
        {description && <p className="page-header__desc">{description}</p>}
        {meta && <div className="page-header__meta">{meta}</div>}
      </div>
      {actions && <div className="page-header__actions">{actions}</div>}
    </header>
  )
}

export function Card({ title, subtitle, actions, children, className, padded = true, as: As = 'section' }: {
  title?: ReactNode
  subtitle?: ReactNode
  actions?: ReactNode
  children: ReactNode
  className?: string
  padded?: boolean
  as?: 'section' | 'div'
}) {
  return (
    <As className={['card', className].filter(Boolean).join(' ')}>
      {(title || actions) && (
        <div className="card__header">
          <div>
            {title && <h2 className="card__title">{title}</h2>}
            {subtitle && <p className="card__subtitle">{subtitle}</p>}
          </div>
          {actions && <div className="card__actions">{actions}</div>}
        </div>
      )}
      <div className={padded ? 'card__body' : undefined}>{children}</div>
    </As>
  )
}

export function Callout({ tone = 'info', title, children, actions }: { tone?: Tone; title?: ReactNode; children?: ReactNode; actions?: ReactNode }) {
  return (
    <div className={`callout callout--${tone}`} role={tone === 'danger' ? 'alert' : undefined}>
      <div className="callout__text">
        {title && <strong className="callout__title">{title}</strong>}
        {children && <div className="callout__body">{children}</div>}
      </div>
      {actions && <div className="callout__actions">{actions}</div>}
    </div>
  )
}

export function EmptyState({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="empty">
      <svg width="36" height="36" viewBox="0 0 36 36" aria-hidden className="empty__icon">
        <rect x="5" y="8" width="26" height="20" rx="3" fill="none" stroke="currentColor" strokeWidth="1.6" />
        <path d="M5 14h26" stroke="currentColor" strokeWidth="1.6" />
      </svg>
      <p className="empty__title">{title}</p>
      {children && <p className="empty__body">{children}</p>}
      {action && <div className="empty__action">{action}</div>}
    </div>
  )
}

export function DescList({ items, columns = 1 }: { items: { term: ReactNode; value: ReactNode }[]; columns?: 1 | 2 | 3 }) {
  return (
    <dl className={`dl dl--${columns}`}>
      {items.map((it, i) => (
        <div key={i} className="dl__row">
          <dt>{it.term}</dt>
          <dd>{it.value}</dd>
        </div>
      ))}
    </dl>
  )
}

export function ActivityList({ items, emptyText = 'No activity yet.' }: { items: ActivityEntry[]; emptyText?: string }) {
  if (items.length === 0) return <p className="muted">{emptyText}</p>
  const sorted = [...items].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
  return (
    <ol className="activity" aria-label="Activity history, newest first">
      {sorted.map((e) => (
        <li key={e.id} className={`activity__item activity__item--${e.tone ?? 'neutral'}`}>
          <span className="activity__marker" aria-hidden />
          <div className="activity__content">
            <div className="activity__head">
              <strong>{e.title}</strong>
              <time dateTime={e.at}>{formatDateTime(e.at)}</time>
            </div>
            <div className="activity__actor">{e.actor}</div>
            {e.detail && <p className="activity__detail">{e.detail}</p>}
          </div>
        </li>
      ))}
    </ol>
  )
}

export function SimulatedNote({ children }: { children: ReactNode }) {
  return (
    <p className="sim-note">
      <span className="sim-note__tag">Simulated</span>
      {children}
    </p>
  )
}

/**
 * Sample inputs and test instructions for exploring the prototype, folded away so they do not read
 * as product copy. Simulation labels (SimulatedNote, "Prototype only" legends) stay visible elsewhere.
 */
export function DemoExamples({ children, title = 'Demo examples' }: { children: ReactNode; title?: string }) {
  return (
    <details className="demo-examples">
      <summary><span className="sim-note__tag">Prototype</span>{title}</summary>
      <div className="demo-examples__body">{children}</div>
    </details>
  )
}

/** A row of key facts under a page header: amount, vehicle, time. Values are large and tabular. */
export function FactStrip({ items }: { items: { term: ReactNode; value: ReactNode; sub?: ReactNode; emphasis?: boolean }[] }) {
  return (
    <dl className="facts">
      {items.map((it, i) => (
        <div key={i} className={`facts__item${it.emphasis ? ' facts__item--emphasis' : ''}`}>
          <dt>{it.term}</dt>
          <dd>{it.value}</dd>
          {it.sub && <dd className="facts__sub">{it.sub}</dd>}
        </div>
      ))}
    </dl>
  )
}

/** Secondary content that stays one click away: source metadata, activity history. */
export function Disclosure({ title, summary, children, defaultOpen }: { title: ReactNode; summary?: ReactNode; children: ReactNode; defaultOpen?: boolean }) {
  return (
    <details className="disclosure" open={defaultOpen}>
      <summary>
        <span className="disclosure__title">{title}</span>
        {summary && <span className="disclosure__summary">{summary}</span>}
        <svg className="disclosure__chev" width="14" height="14" viewBox="0 0 16 16" aria-hidden>
          <path d="M4 6l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </summary>
      <div className="disclosure__body">{children}</div>
    </details>
  )
}
