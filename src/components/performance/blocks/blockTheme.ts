// KOJIMA HUD — flat monochrome tokens, zero radius, zero shadow
export const BLOCK = {
  bg: '#1e1e22',
  bgElevated: '#2e2e34',
  text: '#F0F0F2',
  textSecondary: '#B0B0B8',
  textGhost: '#55555e',
  accent: '#F0F0F2',
  radius: 0,
  shadow: 'none',
  inset: 'none',
  // Section wrapper constants
  sectionRadius: 0,
  sectionBg: '#1a1a1e',
  sectionBorder: '#3a3a42',
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
