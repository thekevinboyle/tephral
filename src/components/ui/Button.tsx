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
 * - danger: Accent button for destructive actions
 * - active: Highlighted state (e.g., toggle on)
 *
 * Sizes:
 * - sm: Compact (h-6, px-2, text-[10px])
 * - md: Standard (h-7, px-2.5, text-[11px])
 * - lg: Large (h-8, px-3, text-[12px])
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ children, variant = 'default', size = 'md', disabled, className = '', style, ...props }, ref) => {
    const sizeClasses = {
      sm: 'h-6 px-2 text-[10px]',
      md: 'h-7 px-2.5 text-[11px]',
      lg: 'h-8 px-3 text-[12px]',
    }

    const getStyles = () => {
      if (disabled) {
        return {
          backgroundColor: 'var(--bg-elevated)',
          border: '1px solid var(--border)',
          color: 'var(--text-ghost)',
          opacity: 0.5,
          cursor: 'not-allowed',
        }
      }

      switch (variant) {
        case 'danger':
          return {
            backgroundColor: 'var(--accent)',
            border: '1px solid var(--accent)',
            color: 'var(--text-primary)',
            boxShadow: '0 0 4px var(--accent-glow)',
          }
        case 'active':
          return {
            backgroundColor: 'var(--accent)',
            border: '1px solid var(--accent)',
            color: 'var(--text-primary)',
            boxShadow: '0 0 4px var(--accent-glow)',
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
        e.currentTarget.style.backgroundColor = 'var(--bg-hover)'
      } else if (variant === 'danger' || variant === 'active') {
        e.currentTarget.style.backgroundColor = 'var(--accent-dim)'
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
        className={`${sizeClasses[size]} rounded-sm font-medium transition-colors active:scale-95 ${className}`}
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
