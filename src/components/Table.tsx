import { useLayoutEffect, useRef, useState, type ReactNode } from 'react'

export interface Column<T> {
  key: string
  header: ReactNode
  render: (row: T) => ReactNode
  align?: 'left' | 'right'
  width?: string
  /** Hidden below 1200px to keep the table readable at 1024px. */
  secondary?: boolean
  /** Extra class on the header and cells, e.g. 'col-action'. */
  className?: string
}
const colClass = <T,>(c: Column<T>) => [c.secondary && 'col-secondary', c.className].filter(Boolean).join(' ') || undefined

export function DataTable<T>({ columns, rows, rowKey, onRowClick, caption, empty, rowLabel, minWidth }: {
  columns: Column<T>[]
  rows: T[]
  rowKey: (r: T) => string
  onRowClick?: (r: T) => void
  caption: string
  empty?: ReactNode
  rowLabel?: (r: T) => string
  /** Below this width the table scrolls sideways instead of squeezing its columns. */
  minWidth?: number
}) {
  // Sticky headers need a wrapper that does not scroll sideways, so they switch on only while the table fits.
  const wrap = useRef<HTMLDivElement>(null)
  const [fits, setFits] = useState(false)
  useLayoutEffect(() => {
    const el = wrap.current
    if (!el) return
    const measure = () => setFits((el.firstElementChild as HTMLElement).offsetWidth <= el.clientWidth)
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [minWidth])
  return (
    <div ref={wrap} className={`table-wrap${fits ? ' table-wrap--fits' : ''}`}>
      <table className="table" style={minWidth ? { minWidth } : undefined}>
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c.key} scope="col" style={{ width: c.width, textAlign: c.align }} className={colClass(c)}>
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="table__empty">
                {empty}
              </td>
            </tr>
          ) : (
            rows.map((r) => (
              <tr
                key={rowKey(r)}
                className={onRowClick ? 'is-clickable' : undefined}
                onClick={(e) => {
                  if (!onRowClick) return
                  if ((e.target as HTMLElement).closest('a,button,input,select,label')) return
                  onRowClick(r)
                }}
                aria-label={rowLabel?.(r)}
              >
                {columns.map((c) => (
                  <td key={c.key} style={{ textAlign: c.align }} className={colClass(c)}>
                    {c.render(r)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}
