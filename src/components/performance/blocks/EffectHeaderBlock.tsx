import { useState } from 'react'
import { useSpring, useTransition, animated } from '@react-spring/web'
import { useEffectDisable } from '../../../hooks/useEffectDisable'
import { EFFECTS, STRAND_EFFECTS, MOTION_EFFECTS, DESTRUCTION_EFFECTS, PAGE_NAMES } from '../../../config/effects'
import { SPRING } from './blockTheme'
import { HudGlyph, type HudGlyphType } from '../../ui/HudGlyph'

const ALL_EFFECTS = [...EFFECTS, ...STRAND_EFFECTS, ...MOTION_EFFECTS, ...DESTRUCTION_EFFECTS]

function getCategory(effectId: string): string {
  const e = ALL_EFFECTS.find(ef => ef.id === effectId)
  if (e) return PAGE_NAMES[e.page] ?? ''
  return ''
}

const CATEGORY_GLYPH: Record<string, HudGlyphType> = {
  ACID: 'brackets',
  VISION: 'eye',
  GLITCH: 'crosshair',
  STRAND: 'diamond',
  MOTION: 'asterisk',
  DESTROY: 'hexagon',
}

interface EffectHeaderBlockProps {
  effectId: string
  bypassed?: boolean
  onBypassToggle?: () => void
}

export function EffectHeaderBlock({ effectId, bypassed = false, onBypassToggle }: EffectHeaderBlockProps) {
  const effect = ALL_EFFECTS.find(e => e.id === effectId)
  const label = effect?.label ?? effectId
  const color = effect?.color ?? 'var(--text-muted)'
  const category = getCategory(effectId)
  const { disableEffect } = useEffectDisable()
  const [closeHovered, setCloseHovered] = useState(false)

  const glyphType = CATEGORY_GLYPH[category] ?? 'crosshair'

  // Bypass state spring
  const bypassSpring = useSpring({
    opacity: bypassed ? 0.3 : 1,
    barHeight: bypassed ? 0 : 1,
    config: SPRING.smooth,
  })

  // Press-down spring
  const [pressSpring, pressApi] = useSpring(() => ({
    scale: 1,
    config: SPRING.snappy,
  }))

  // Name transition
  const nameTransitions = useTransition(label, {
    from: { opacity: 0, y: 12 },
    enter: { opacity: 1, y: 0 },
    leave: { opacity: 0, y: -12 },
    config: SPRING.smooth,
    keys: label,
  })

  const handleClick = () => {
    if (!onBypassToggle) return
    pressApi.start({
      scale: 0.98,
      onRest: () => pressApi.start({ scale: 1 }),
    })
    onBypassToggle()
  }

  return (
    <animated.div
      onClick={handleClick}
      style={{
        position: 'relative',
        height: 120,
        overflow: 'hidden',
        cursor: onBypassToggle ? 'pointer' : 'default',
        background: '#000000',
        border: '1px solid var(--border)',
        opacity: bypassSpring.opacity,
        scale: pressSpring.scale,
      }}
    >
      {/* Category bracket label */}
      <div
        style={{
          position: 'absolute',
          top: 10,
          left: 12,
          fontSize: 9,
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.14em',
          color: 'var(--text-ghost)',
          fontFamily: 'var(--font-mono)',
        }}
      >
        [ {category} ]
      </div>

      {/* Effect name */}
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 40px', overflow: 'hidden' }}>
        {nameTransitions((style, item) => {
          const nameLen = item.length
          const fontSize = nameLen > 10 ? 22 : nameLen > 7 ? 28 : 36
          return (
            <animated.div
              style={{
                position: 'absolute',
                fontSize,
                fontWeight: 800,
                textTransform: 'uppercase',
                letterSpacing: '0.12em',
                color: bypassed ? 'var(--text-ghost)' : '#FFFFFF',
                textDecoration: bypassed ? 'line-through' : 'none',
                textDecorationColor: 'var(--text-ghost)',
                whiteSpace: 'nowrap',
                fontFamily: 'var(--font-mono)',
                animation: bypassed ? 'hud-pulse 2s ease-in-out infinite' : undefined,
                ...style,
              }}
            >
              {item}
            </animated.div>
          )
        })}
      </div>

      {/* Category glyph — top right */}
      <div style={{
        position: 'absolute',
        top: 8,
        right: 44,
        opacity: 0.15,
        pointerEvents: 'none',
      }}>
        <HudGlyph glyph={glyphType} size={40} color={color} animate="spin" />
      </div>

      {/* Close button */}
      <button
        onClick={(e) => {
          e.stopPropagation()
          disableEffect(effectId)
        }}
        onMouseEnter={() => setCloseHovered(true)}
        onMouseLeave={() => setCloseHovered(false)}
        className="opacity-0 hover:opacity-100 transition-opacity"
        style={{
          position: 'absolute',
          top: 8,
          right: 8,
          width: 28,
          height: 28,
          border: closeHovered ? '1px solid #FFFFFF' : '1px solid var(--border)',
          backgroundColor: closeHovered ? '#FFFFFF' : 'transparent',
          color: closeHovered ? '#000000' : 'var(--text-muted)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'var(--font-mono)',
          fontSize: 12,
          fontWeight: 700,
        }}
      >
        X
      </button>

      {/* Color accent bar at bottom — 1px line */}
      <animated.div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: bypassSpring.barHeight,
          backgroundColor: color,
          opacity: 0.3,
        }}
      />
    </animated.div>
  )
}
