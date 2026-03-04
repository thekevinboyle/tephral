// KOJIMA HUD — flat monochrome tokens, zero radius, zero shadow
export const BLOCK = {
  bg: '#000000',
  bgElevated: '#0A0A0A',
  text: '#FFFFFF',
  textSecondary: '#888888',
  textGhost: '#444444',
  accent: '#FFFFFF',
  radius: 0,
  shadow: 'none',
  inset: 'none',
  // Section wrapper constants
  sectionRadius: 0,
  sectionBg: '#050505',
  sectionBorder: '#333333',
  accentLine: 1,
  microVisualOpacity: 0.20,
} as const

// Shared spring configs for tactile interactions (unchanged)
export const SPRING = {
  snappy: { tension: 500, friction: 22 },
  bouncy: { tension: 400, friction: 18 },
  pop:    { tension: 600, friction: 20 },
  smooth: { tension: 280, friction: 24 },
} as const
