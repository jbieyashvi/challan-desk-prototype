// In-page tabs (ARIA tab pattern): arrow keys move between tabs, only the active panel renders.
// For list views that change the URL filter, use StatusTabs in Filters.tsx instead.
import { useId, useRef, type ReactNode } from 'react'

export interface TabDef {
  key: string
  label: string
  count?: number
}

export function Tabs({ tabs, value, onChange, label, children }: { tabs: TabDef[]; value: string; onChange: (key: string) => void; label: string; children: ReactNode }) {
  const id = useId()
  const refs = useRef<(HTMLButtonElement | null)[]>([])
  const move = (i: number) => {
    const n = (i + tabs.length) % tabs.length
    onChange(tabs[n].key)
    refs.current[n]?.focus()
  }
  const active = tabs.findIndex((t) => t.key === value)
  return (
    <div className="page-tabs">
      <div className="tabs" role="tablist" aria-label={label}>
        {tabs.map((t, i) => (
          <button
            key={t.key}
            ref={(el) => { refs.current[i] = el }}
            type="button"
            role="tab"
            id={`${id}-tab-${t.key}`}
            aria-selected={t.key === value}
            aria-controls={`${id}-panel`}
            tabIndex={t.key === value ? 0 : -1}
            className={`tabs__item${t.key === value ? ' is-active' : ''}`}
            onClick={() => onChange(t.key)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowRight') { e.preventDefault(); move(i + 1) }
              else if (e.key === 'ArrowLeft') { e.preventDefault(); move(i - 1) }
              else if (e.key === 'Home') { e.preventDefault(); move(0) }
              else if (e.key === 'End') { e.preventDefault(); move(tabs.length - 1) }
            }}
          >
            <span>{t.label}</span>
            {t.count !== undefined && <span className="tabs__count">{t.count}</span>}
          </button>
        ))}
      </div>
      <div role="tabpanel" id={`${id}-panel`} aria-labelledby={`${id}-tab-${tabs[Math.max(0, active)]?.key}`} className="page-tabs__panel">
        {children}
      </div>
    </div>
  )
}
