import type { ButtonHTMLAttributes, ReactNode } from 'react'

type PrimaryButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode
  variant?: 'primary' | 'secondary' | 'danger'
}

export default function PrimaryButton({ children, className = '', variant = 'primary', ...props }: PrimaryButtonProps) {
  const variantClass =
    variant === 'secondary'
      ? 'ui-btn-secondary'
      : variant === 'danger'
        ? 'ui-btn-danger'
        : 'ui-btn-primary'
  return (
    <button {...props} className={`ui-btn ${variantClass} ${className}`.trim()}>
      {children}
    </button>
  )
}

