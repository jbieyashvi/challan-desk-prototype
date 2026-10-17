import { useEffect, useId, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

interface Props {
  open: boolean
  onClose: () => void
  title: string
  description?: ReactNode
  children: ReactNode
  footer?: ReactNode
  /** Supporting context shown beside the form (stacks above it on narrow screens). */
  aside?: ReactNode
  asideLabel?: string
  variant?: 'dialog' | 'drawer'
  size?: 'sm' | 'md' | 'lg'
  /** Prevents closing with Esc or the backdrop while something is in progress. */
  busy?: boolean
}

/** Keyboard-operable dialog and drawer: focus trap, Esc to close, focus restored on close. */
export function Modal({ open, onClose, title, description, children, footer, aside, asideLabel = 'Summary', variant = 'dialog', size = 'md', busy }: Props) {
  const panel = useRef<HTMLDivElement>(null)
  const titleId = useId()
  const descId = useId()
  const closeRef = useRef(onClose)
  closeRef.current = onClose
  const busyRef = useRef(busy)
  busyRef.current = busy

  useEffect(() => {
    if (!open) return
    const previous = document.activeElement as HTMLElement | null
    const el = panel.current
    const first = el?.querySelector<HTMLElement>('[data-autofocus]') ?? el?.querySelector<HTMLElement>(`.modal__body ${FOCUSABLE}`) ?? el
    first?.focus()
    document.body.style.overflow = 'hidden'

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !busyRef.current) {
        e.stopPropagation()
        closeRef.current()
      }
      if (e.key === 'Tab' && el) {
        const items = Array.from(el.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((n) => n.offsetParent !== null)
        if (items.length === 0) return
        const firstItem = items[0]
        const last = items[items.length - 1]
        if (e.shiftKey && document.activeElement === firstItem) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault()
          firstItem.focus()
        }
      }
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
      previous?.focus?.()
    }
  }, [open])

  if (!open) return null
  return createPortal(
    <div className={`overlay overlay--${variant}`} onMouseDown={(e) => e.target === e.currentTarget && !busy && onClose()}>
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
        className={`modal modal--${variant} modal--${size}${aside ? ' modal--split' : ''}`}
        tabIndex={-1}
      >
        <header className="modal__header">
          <div>
            <h2 id={titleId} className="modal__title">
              {title}
            </h2>
            {description && (
              <div id={descId} className="modal__desc">
                {description}
              </div>
            )}
          </div>
          <button type="button" className="icon-btn" onClick={onClose} disabled={busy} aria-label="Close">
            <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden>
              <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </button>
        </header>
        {aside ? (
          <div className="modal__body modal__body--split">
            <aside className="modal__aside" aria-label={asideLabel}>{aside}</aside>
            <div className="modal__main">{children}</div>
          </div>
        ) : (
          <div className="modal__body">{children}</div>
        )}
        {footer && <footer className="modal__footer">{footer}</footer>}
      </div>
    </div>,
    document.body,
  )
}
