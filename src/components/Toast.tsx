import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'
import type { Tone } from '../domain/labels'

interface ToastItem {
  id: number
  tone: Tone
  title: string
  body?: string
}

const Ctx = createContext<(t: Omit<ToastItem, 'id'>) => void>(() => {})

let next = 0

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])
  const dismiss = (id: number) => setItems((xs) => xs.filter((x) => x.id !== id))
  const push = useCallback((t: Omit<ToastItem, 'id'>) => {
    const id = ++next
    setItems((xs) => [...xs.slice(-2), { ...t, id }])
    window.setTimeout(() => dismiss(id), 6000)
  }, [])
  return (
    <Ctx.Provider value={push}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {items.map((t) => (
          <Toast key={t.id} {...t} onDismiss={() => dismiss(t.id)} />
        ))}
      </div>
    </Ctx.Provider>
  )
}

export function Toast({ tone, title, body, onDismiss }: Omit<ToastItem, 'id'> & { onDismiss?: () => void }) {
  return (
    <div className={`toast toast--${tone}`}>
      <span className="toast__bar" aria-hidden />
      <div className="toast__text">
        <strong>{title}</strong>
        {body && <p>{body}</p>}
      </div>
      {onDismiss && (
        <button type="button" className="icon-btn icon-btn--sm" onClick={onDismiss} aria-label="Dismiss notification">
          <svg width="12" height="12" viewBox="0 0 16 16" aria-hidden>
            <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </button>
      )}
    </div>
  )
}

export const useToast = () => useContext(Ctx)
