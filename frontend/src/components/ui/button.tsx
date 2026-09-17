import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'

const styles = {
  ghost:
    'inline-flex items-center justify-center rounded-2xl bg-transparent text-sm font-medium',
}

type ButtonProps = {
  variant?: 'ghost'
  className?: string
  children?: ReactNode
  to?: string
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'>

export function Button({
  className,
  variant = 'ghost',
  type = 'button',
  to,
  children,
  ...props
}: ButtonProps) {
  const cls = cn(styles[variant], className)
  if (to) {
    return (
      <Link to={to} className={cls}>
        {children}
      </Link>
    )
  }
  return (
    <button type={type} className={cls} {...props}>
      {children}
    </button>
  )
}
