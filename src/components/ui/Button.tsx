import { type ButtonHTMLAttributes, type ReactNode, forwardRef } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode
  variant?: 'default' | 'danger' | 'active'
  size?: 'sm' | 'md' | 'lg'
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ children, variant = 'default', size = 'md', disabled, className = '', style, ...props }, ref) => {
    const sizeClasses = {
      sm: 'h-6 px-2 text-[10px]',
      md: 'h-7 px-2.5 text-[11px]',
      lg: 'h-8 px-3 text-[12px]',
    }

    const isActive = variant === 'danger' || variant === 'active'

    const getStyles = (): React.CSSProperties => {
      if (disabled) {
        return {
          backgroundColor: 'transparent',
          border: '1px solid var(--border)',
          color: 'var(--text-ghost)',
          opacity: 0.5,
          cursor: 'not-allowed',
        }
      }

      if (isActive) {
        return {
          backgroundColor: '#FFFFFF',
          border: '1px solid #FFFFFF',
          color: '#000000',
        }
      }

      return {
        backgroundColor: 'transparent',
        border: '1px solid var(--border)',
        color: 'var(--text-muted)',
      }
    }

    const handleMouseEnter = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (disabled) return
      if (!isActive) {
        e.currentTarget.style.borderColor = 'var(--text-muted)'
        e.currentTarget.style.color = 'var(--text-primary)'
      }
    }

    const handleMouseLeave = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (disabled) return
      if (!isActive) {
        e.currentTarget.style.borderColor = 'var(--border)'
        e.currentTarget.style.color = 'var(--text-muted)'
      }
    }

    return (
      <button
        ref={ref}
        disabled={disabled}
        className={`${sizeClasses[size]} font-bold transition-colors ${className}`}
        style={{
          fontFamily: 'var(--font-mono)',
          letterSpacing: '0.08em',
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
