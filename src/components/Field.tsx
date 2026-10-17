import { useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react'

interface Shared {
  label: string
  hint?: ReactNode
  error?: string
  required?: boolean
  hideLabel?: boolean
}

function Wrap({ id, label, hint, error, required, hideLabel, children }: Shared & { id: string; children: ReactNode }) {
  return (
    <div className={`field${error ? ' field--error' : ''}`}>
      <label htmlFor={id} className={hideLabel ? 'sr-only' : 'field__label'}>
        {label}
        {required && <span className="field__req"> (required)</span>}
      </label>
      {children}
      {hint && !error && (
        <p id={`${id}-hint`} className="field__hint">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="field__error" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}

const describedBy = (id: string, hint?: ReactNode, error?: string) => (error ? `${id}-error` : hint ? `${id}-hint` : undefined)

export function TextField({ label, hint, error, required, hideLabel, ...rest }: Shared & InputHTMLAttributes<HTMLInputElement>) {
  const id = useId()
  return (
    <Wrap {...{ id, label, hint, error, required, hideLabel }}>
      <input id={id} className="input" aria-invalid={!!error || undefined} aria-describedby={describedBy(id, hint, error)} required={required} {...rest} />
    </Wrap>
  )
}

export function TextArea({ label, hint, error, required, hideLabel, ...rest }: Shared & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const id = useId()
  return (
    <Wrap {...{ id, label, hint, error, required, hideLabel }}>
      <textarea id={id} className="input input--area" aria-invalid={!!error || undefined} aria-describedby={describedBy(id, hint, error)} required={required} {...rest} />
    </Wrap>
  )
}

export function SelectField({ label, hint, error, required, hideLabel, children, ...rest }: Shared & SelectHTMLAttributes<HTMLSelectElement>) {
  const id = useId()
  return (
    <Wrap {...{ id, label, hint, error, required, hideLabel }}>
      <select id={id} className="input input--select" aria-invalid={!!error || undefined} aria-describedby={describedBy(id, hint, error)} required={required} {...rest}>
        {children}
      </select>
    </Wrap>
  )
}

export interface ChoiceOption<T extends string> {
  value: T
  label: ReactNode
  description?: ReactNode
  disabled?: boolean
}

export function RadioGroup<T extends string>({ legend, name, value, onChange, options, error }: {
  legend: string
  name: string
  value: T | ''
  onChange: (v: T) => void
  options: ChoiceOption<T>[]
  error?: string
}) {
  return (
    <fieldset className={`choice-group${error ? ' field--error' : ''}`}>
      <legend className="field__label">{legend}</legend>
      {error && (
        <p className="field__error" role="alert">
          {error}
        </p>
      )}
      {options.map((o) => (
        <label key={o.value} className={`choice${value === o.value ? ' choice--selected' : ''}${o.disabled ? ' choice--disabled' : ''}`}>
          <input type="radio" name={name} value={o.value} checked={value === o.value} disabled={o.disabled} onChange={() => onChange(o.value)} />
          <span className="choice__body">
            <span className="choice__label">{o.label}</span>
            {o.description && <span className="choice__desc">{o.description}</span>}
          </span>
        </label>
      ))}
    </fieldset>
  )
}
