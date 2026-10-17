// List controls shared by the Vehicles and Challans screens: status tabs, a toolbar with
// search and frequent filters, a "More filters" disclosure and the applied-filter chips.
import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'

export interface TabItem {
  key: string
  label: string
  count: number
  to: string
  active: boolean
}

/** Status tabs. Each one is a link to an existing filtered URL, so tabs, Overview numbers and filters always agree. */
export function StatusTabs({ items, label }: { items: TabItem[]; label: string }) {
  return (
    <nav className="tabs" aria-label={label}>
      {items.map((t) => (
        <Link key={t.key} to={t.to} replace className={`tabs__item${t.active ? ' is-active' : ''}`} aria-current={t.active ? 'page' : undefined}>
          <span>{t.label}</span>
          <span className="tabs__count">{t.count}</span>
        </Link>
      ))}
    </nav>
  )
}

export function Toolbar({ children, more, moreCount = 0 }: { children: ReactNode; more?: ReactNode; moreCount?: number }) {
  const [open, setOpen] = useState(moreCount > 0)
  const panelId = useId()
  const btn = useRef<HTMLButtonElement>(null)
  // Applying a filter from a tab or chip never hides a panel that has active filters in it.
  useEffect(() => {
    if (moreCount > 0) setOpen(true)
  }, [moreCount])

  return (
    <div className="toolbar">
      <div className="toolbar__row" role="search">
        {children}
        {more && (
          <button
            ref={btn}
            type="button"
            className={`btn btn--secondary toolbar__more${open ? ' is-open' : ''}`}
            aria-expanded={open}
            aria-controls={panelId}
            onClick={() => setOpen(!open)}
          >
            <FilterIcon />
            <span>More filters</span>
            {moreCount > 0 && <span className="count-pill" aria-label={`${moreCount} active`}>{moreCount}</span>}
          </button>
        )}
      </div>
      {more && open && (
        <div
          id={panelId}
          className="toolbar__panel"
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              setOpen(false)
              btn.current?.focus()
            }
          }}
        >
          {more}
        </div>
      )}
    </div>
  )
}

export interface AppliedFilter {
  key: string
  label: string
  value: string
  onRemove: () => void
}

/** Applied-filter chips with "Reset all". Renders nothing when no filter is applied. */
export function AppliedFilters({ items, onReset }: { items: AppliedFilter[]; onReset: () => void }) {
  if (items.length === 0) return null
  return (
    <div className="applied">
      <ul className="applied__list" aria-label="Applied filters">
        {items.map((f) => (
          <li key={f.key} className="filter-chip">
            <span>
              <span className="filter-chip__key">{f.label}:</span> {f.value}
            </span>
            <button type="button" className="filter-chip__remove" onClick={f.onRemove} aria-label={`Remove filter ${f.label}: ${f.value}`}>
              <svg width="10" height="10" viewBox="0 0 16 16" aria-hidden>
                <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          </li>
        ))}
        <li>
          <button type="button" className="link-btn" onClick={onReset}>Reset all</button>
        </li>
      </ul>
    </div>
  )
}

/** Footer of a list surface: the filtered count (announced on change) and optional totals. */
export function TableFooter({ result, children }: { result: ReactNode; children?: ReactNode }) {
  return (
    <div className="table-foot">
      <span className="table-foot__result" aria-live="polite">{result}</span>
      {children}
    </div>
  )
}

/** Search box for a list toolbar. The label is kept for screen readers; the placeholder says what it searches. */
export function SearchField({ id, label, placeholder, value, onChange }: { id: string; label: string; placeholder: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="field field--grow">
      <label className="sr-only" htmlFor={id}>{label}</label>
      <div className="search-input">
        <SearchIcon />
        <input id={id} className="input" type="search" placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)} />
      </div>
    </div>
  )
}

const FilterIcon = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden>
    <path d="M2.5 4h11M4.5 8h7M6.5 12h3" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
)

const SearchIcon = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden>
    <circle cx="7" cy="7" r="4.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
    <path d="M10.5 10.5L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
)
