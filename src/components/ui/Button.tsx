import { type ButtonHTMLAttributes, type ReactNode, forwardRef } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode
  variant?: 'default' | 'danger' | 'active'
  size?: 'sm' | 'md' | 'lg'
}

/**
 * Standardized button component with consistent styling across the app.
 *
 * Variants:
 * - default: Standard button with hover effect
 * - danger: Red button for destructive actions
 * - active: Highlighted state (e.g., toggle on)
 *
 * Sizes:
 * - sm: Compact (h-7, px-2, text-[11px])
 * - md: Standard (h-8, px-3, text-[12px])
 * - lg: Large (h-9, px-4, text-[13px])
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ children, variant = 'default', size = 'md', disabled, className = '', style, ...props }, ref) => {
    const sizeClasses = {
      sm: 'h-7 px-2 text-[11px]',
      md: 'h-8 px-3 text-[12px]',
      lg: 'h-9 px-4 text-[13px]',
    }

    const getStyles = () => {
      if (disabled) {
        return {
          backgroundColor: 'var(--bg-elevated)',
          border: '1px solid var(--border)',
          color: 'var(--text-muted)',
          opacity: 0.5,
          cursor: 'not-allowed',
        }
      }

      switch (variant) {
        case 'danger':
          return {
            backgroundColor: '#ef4444',
            border: '1px solid #ef4444',
            color: '#fff',
          }
        case 'active':
          return {
            backgroundColor: 'var(--accent-blue)',
            border: '1px solid var(--accent-blue)',
            color: '#fff',
          }
        default:
          return {
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border)',
            color: 'var(--text-muted)',
          }
      }
    }

    const handleMouseEnter = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (disabled) return
      if (variant === 'default') {
        e.currentTarget.style.backgroundColor = 'var(--bg-elevated)'
      } else if (variant === 'danger') {
        e.currentTarget.style.backgroundColor = '#dc2626'
      } else if (variant === 'active') {
        e.currentTarget.style.backgroundColor = '#2563eb'
      }
    }

    const handleMouseLeave = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (disabled) return
      const styles = getStyles()
      e.currentTarget.style.backgroundColor = styles.backgroundColor as string
    }

    return (
      <button
        ref={ref}
        disabled={disabled}
        className={`${sizeClasses[size]} rounded font-medium transition-colors active:scale-95 ${className}`}
        style={{
          ...getStyles(),
          ...style,
        }}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        {...props}
      >
        {children}
      </button>
    )
  }
)

Button.displayName = 'Button'
