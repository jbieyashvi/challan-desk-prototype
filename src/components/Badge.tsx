import type { ReactNode } from 'react'
import type { Label, Tone } from '../domain/labels'

export function Badge({ tone = 'neutral', children, title }: { tone?: Tone; children: ReactNode; title?: string }) {
  return (
    <span className={`badge badge--${tone}`} title={title}>
      <span className="badge__dot" aria-hidden />
      {children}
    </span>
  )
}

/** A status badge. The dimension name is announced to screen readers so that "Paid" is never ambiguous. */
export function StatusBadge({ label, dimension }: { label: Label; dimension?: string }) {
  return (
    <Badge tone={label.tone}>
      {dimension && <span className="sr-only">{dimension}: </span>}
      {label.text}
    </Badge>
  )
}

export function Tag({ children }: { children: ReactNode }) {
  return <span className="tag">{children}</span>
}
