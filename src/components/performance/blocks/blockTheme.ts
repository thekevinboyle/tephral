// Dark grayscale palette — matches app theme tokens
export const BLOCK = {
  bg: 'rgba(255,255,255,0.03)',
  bgElevated: 'rgba(255,255,255,0.06)',
  text: 'var(--text-primary)',
  textSecondary: 'var(--text-muted)',
  textGhost: 'var(--text-ghost)',
  accent: 'var(--accent)',
  radius: 8,
  shadow: 'var(--shadow-button)',
  inset: 'inset 0 1px 3px rgba(0,0,0,0.4)',
} as const

// Shared spring configs for tactile interactions
export const SPRING = {
  snappy: { tension: 500, friction: 22 },
  bouncy: { tension: 400, friction: 18 },
  pop:    { tension: 600, friction: 20 },
  smooth: { tension: 280, friction: 24 },
} as const
