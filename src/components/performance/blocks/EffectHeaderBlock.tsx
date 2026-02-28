import { useState } from 'react'
import { useSpring, useTransition, animated } from '@react-spring/web'
import { useEffectDisable } from '../../../hooks/useEffectDisable'
import { EFFECTS, STRAND_EFFECTS, MOTION_EFFECTS, DESTRUCTION_EFFECTS } from '../../../config/effects'
import { BLOCK, SPRING } from './blockTheme'

const ALL_EFFECTS = [...EFFECTS, ...STRAND_EFFECTS, ...MOTION_EFFECTS, ...DESTRUCTION_EFFECTS]

function getCategory(effectId: string): string {
  if (EFFECTS.find(e => e.id === effectId)) return 'GLITCH'
  if (STRAND_EFFECTS.find(e => e.id === effectId)) return 'STRAND'
  if (MOTION_EFFECTS.find(e => e.id === effectId)) return 'MOTION'
  if (DESTRUCTION_EFFECTS.find(e => e.id === effectId)) return 'DESTROY'
  return ''
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

  // Bypass state spring — opacity + letter spacing
  const bypassSpring = useSpring({
    opacity: bypassed ? 0.3 : 1,
    barHeight: bypassed ? 0 : 4,
    config: SPRING.smooth,
  })

  // Press-down spring
  const [pressSpring, pressApi] = useSpring(() => ({
    scale: 1,
    config: SPRING.snappy,
  }))

  // Close button rotation spring
  const closeSpring = useSpring({
    rotate: closeHovered ? 90 : 0,
    config: SPRING.snappy,
  })

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
        borderRadius: BLOCK.radius,
        overflow: 'hidden',
        cursor: onBypassToggle ? 'pointer' : 'default',
        background: `linear-gradient(135deg, ${color}15 0%, rgba(255,255,255,0.03) 60%)`,
        border: '1px solid rgba(255,255,255,0.06)',
        boxShadow: BLOCK.shadow,
        opacity: bypassSpring.opacity,
        scale: pressSpring.scale,
      }}
    >
      {/* Category */}
      <div
        style={{
          position: 'absolute',
          top: 14,
          left: 16,
          fontSize: 10,
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.12em',
          color: `${color}80`,
        }}
      >
        {category}
      </div>

      {/* Effect name */}
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {nameTransitions((style, item) => (
          <animated.div
            style={{
              position: 'absolute',
              fontSize: 48,
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: bypassed ? '0.12em' : '0.04em',
              color: bypassed ? 'var(--text-ghost)' : 'var(--text-primary)',
              textDecoration: bypassed ? 'line-through' : 'none',
              textDecorationColor: 'var(--text-ghost)',
              whiteSpace: 'nowrap',
              transition: 'letter-spacing 0.3s ease-out',
              ...style,
            }}
          >
            {item}
          </animated.div>
        ))}
      </div>

      {/* Close button — top right, visible on hover */}
      <animated.button
        onClick={(e) => {
          e.stopPropagation()
          disableEffect(effectId)
        }}
        onMouseEnter={() => setCloseHovered(true)}
        onMouseLeave={() => setCloseHovered(false)}
        className="opacity-0 hover:opacity-100 transition-opacity"
        style={{
          position: 'absolute',
          top: 10,
          right: 10,
          width: 28,
          height: 28,
          borderRadius: 4,
          border: 'none',
          backgroundColor: 'rgba(255,255,255,0.06)',
          color: 'var(--text-muted)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          rotate: closeSpring.rotate.to(r => `${r}deg`),
        }}
      >
        <svg width="14" height="14" viewBox="0 0 12 12">
          <path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </animated.button>

      {/* Color accent bar at bottom — spring-animated height */}
      <animated.div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: bypassSpring.barHeight,
          backgroundColor: color,
          opacity: 0.6,
        }}
      />
    </animated.div>
  )
}
