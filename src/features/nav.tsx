// Return navigation. Each link into a detail page carries where the user came from, so
// "Back to …" returns to that exact place (list filters, tab and search included).
// The origin is kept in router location state, which survives reloads of the same entry.
import type { ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'

export interface Origin {
  /** pathname + search of the page to return to. */
  to: string
  /** Full link text, e.g. "Back to vehicle MH 12 AB 1234". */
  label: string
  /** The page's own origin, restored when the user goes back to it. */
  from?: Origin
}

const MAX_DEPTH = 4
const trim = (o: Origin | undefined, depth = 0): Origin | undefined =>
  !o ? undefined : depth >= MAX_DEPTH ? { to: o.to, label: o.label } : { ...o, from: trim(o.from, depth + 1) }

/** The origin this page was opened with, if any. */
export function useOrigin(): Origin | undefined {
  const { state } = useLocation()
  const from = (state as { from?: Origin } | null)?.from
  return from && typeof from.to === 'string' && typeof from.label === 'string' ? from : undefined
}

/**
 * Link state for leaving the current page towards a child page.
 * `label` is how the child's back link should name this page.
 */
export function useLinkState(label: string): { from: Origin } {
  const { pathname, search } = useLocation()
  const origin = useOrigin()
  return { from: trim({ to: pathname + search, label, from: origin })! }
}

/** Link state for returning to the page we came from (keeps that page's own origin). */
export function useParentState(): { from?: Origin } | undefined {
  const origin = useOrigin()
  return origin?.from ? { from: origin.from } : undefined
}

/** Router state to keep when a page only changes its own query (tab, filter). */
export function useKeepState() {
  return useLocation().state
}

/**
 * "Back to …" link. Uses `target` when the page always returns to one place, else the origin
 * when there is one, else the parent route, so direct URLs and new tabs still have a way back.
 */
export function BackLink({ fallback, target: fixed }: { fallback: Origin; target?: Origin }) {
  const origin = useOrigin()
  const target = fixed ?? origin ?? fallback
  return (
    <Link className="backlink" to={target.to} state={target.from ? { from: target.from } : undefined}>
      <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden>
        <path d="M10 3.5L5.5 8l4.5 4.5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span>{target.label}</span>
    </Link>
  )
}

/** Back link (return action) and breadcrumb (location indicator) on one line. */
export function PageNav({ fallback, target, children }: { fallback: Origin; target?: Origin; children: ReactNode }) {
  return (
    <div className="page-nav">
      <BackLink fallback={fallback} target={target} />
      <nav className="breadcrumb" aria-label="Breadcrumb">{children}</nav>
    </div>
  )
}
