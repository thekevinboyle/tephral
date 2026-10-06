// KOJIMA HUD — flat monochrome tokens, zero radius, zero shadow
export const BLOCK = {
  bg: 'var(--bg-primary)',
  bgElevated: 'var(--bg-elevated)',
  text: 'var(--text-primary)',
  textSecondary: 'var(--text-secondary)',
  textGhost: 'var(--text-ghost)',
  accent: 'var(--text-primary)',
  radius: 0,
  shadow: 'none',
  inset: 'none',
  // Section wrapper constants
  sectionRadius: 0,
  sectionBg: 'var(--bg-void)',
  sectionBorder: 'var(--border)',
  accentLine: 1,
  microVisualOpacity: 0.25,
} as const

// Shared spring configs for tactile interactions (unchanged)
export const SPRING = {
  snappy: { tension: 500, friction: 22 },
  bouncy: { tension: 400, friction: 18 },
  pop:    { tension: 600, friction: 20 },
  smooth: { tension: 280, friction: 24 },
} as const
