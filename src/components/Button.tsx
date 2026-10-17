import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { Link, type LinkProps } from 'react-router-dom'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
export type ButtonSize = 'md' | 'sm'

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  icon?: ReactNode
}

const cls = (variant: ButtonVariant, size: ButtonSize, extra?: string) =>
  ['btn', `btn--${variant}`, size === 'sm' && 'btn--sm', extra].filter(Boolean).join(' ')

export const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  { variant = 'secondary', size = 'md', loading, icon, children, className, disabled, type = 'button', ...rest },
  ref,
) {
  return (
    <button ref={ref} type={type} className={cls(variant, size, className)} disabled={disabled || loading} aria-busy={loading || undefined} {...rest}>
      {loading ? <span className="spinner" aria-hidden /> : icon}
      <span>{children}</span>
    </button>
  )
})

export function ButtonLink({ variant = 'secondary', size = 'md', className, children, ...rest }: LinkProps & { variant?: ButtonVariant; size?: ButtonSize }) {
  return (
    <Link className={cls(variant, size, className)} {...rest}>
      <span>{children}</span>
    </Link>
  )
}

/**
 * Quiet text link with an arrow, for routine navigation such as "View" and "Review".
 * Buttons stay for actions that move money or retry something.
 */
export function ActionLink({ className, children, ...rest }: LinkProps) {
  return (
    <Link className={['link-arrow', className].filter(Boolean).join(' ')} {...rest}>
      <span>{children}</span>
      <span className="link-arrow__icon" aria-hidden>→</span>
    </Link>
  )
}
