import type { ComponentType, ReactNode } from 'react'
import { BLOCK } from './blockTheme'
import type { MicroVisualProps } from '../../ui/MicroVisuals'
import { CornerFrame } from '../../ui/CornerFrame'
import { HudGlyph, type HudGlyphType } from '../../ui/HudGlyph'

// Map old MicroVisual types to HudGlyph types for decoration
const GLYPH_MAP: Record<string, HudGlyphType> = {
  SignalAnalysis: 'eye',
  ShapeMorpher: 'diamond',
  DataGrid: 'brackets',
  OrbitalRings: 'asterisk',
  RadarSweep: 'crosshair',
  Crosshair: 'crosshair',
  TechReadout: 'brackets',
  IrisScanner: 'eye',
}

interface ParamSectionProps {
  label: string
  color?: string
  children: ReactNode
  visual?: ComponentType<MicroVisualProps>
}

export function ParamSection({ label, color, children, visual: Visual }: ParamSectionProps) {
  // Determine glyph from visual component name
  const glyphType: HudGlyphType = Visual
    ? GLYPH_MAP[Visual.displayName ?? Visual.name ?? ''] ?? 'diamond'
    : 'diamond'

  return (
    <CornerFrame
      label={label}
      color={color ?? BLOCK.accent}
      style={{
        backgroundColor: BLOCK.sectionBg,
        border: `1px solid ${BLOCK.sectionBorder}`,
      }}
    >
      {/* Accent line at top */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: BLOCK.accentLine,
          backgroundColor: color ?? BLOCK.accent,
          opacity: 0.3,
        }}
      />

      {/* Content */}
      <div style={{ padding: '4px 0 2px' }}>
        {children}
      </div>

      {/* Ghost HudGlyph */}
      <div
        style={{
          position: 'absolute',
          bottom: 4,
          right: 4,
          opacity: BLOCK.microVisualOpacity,
          pointerEvents: 'none',
        }}
      >
        <HudGlyph
          glyph={glyphType}
          size={20}
          color={color ?? 'var(--text-ghost)'}
          animate="pulse"
        />
      </div>
    </CornerFrame>
  )
}
