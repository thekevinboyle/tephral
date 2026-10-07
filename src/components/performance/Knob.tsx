import { useParamControl } from '../../hooks/useParamControl'
import { getParamStatusText } from '../../config/statusDescriptions'

interface KnobProps {
  label: string
  value: number
  min?: number
  max?: number
  step?: number
  color?: string
  size?: 'xs' | 'sm' | 'md' | 'lg'
  onChange: (value: number) => void
  formatValue?: (value: number) => string
  paramId?: string
  showArc?: boolean
  showValue?: boolean
  statusText?: string
}

export function Knob({
  label,
  value,
  min = 0,
  max = 100,
  step,
  color = 'var(--text-muted)',
  size = 'md',
  onChange,
  formatValue,
  paramId,
  showArc,
  statusText,
}: KnobProps) {
  const resolvedStatusText = statusText ?? getParamStatusText(label)

  // Knob feel: full range over 150px of vertical drag
  const ctl = useParamControl({
    paramId, label, value, min, max, step, onChange,
    axis: 'y', dragSpanPx: 150, statusText: resolvedStatusText,
  })
  const {
    isDragging, isHovered, isDropTarget, isAutomationTarget, isInAssignmentMode,
    assigningColor, isDepthDragging, depthDragDisplay, depthSourceName, routings, dotDragging,
  } = ctl
  const hasRouting = routings.length > 0
  const sourceInfo = hasRouting ? routings[0] : null

  const normalized = (value - min) / (max - min)

  const dimensions = {
    xs: { width: 48, height: 22 },
    sm: { width: 52, height: 24 },
    md: { width: 56, height: 26 },
    lg: { width: 72, height: 32 },
  }[size]

  const ariaProps = {
    'data-param-control': '',
    'data-param-id': paramId,
    tabIndex: 0,
    role: 'slider',
    'aria-label': label,
    'aria-valuemin': min,
    'aria-valuemax': max,
    'aria-valuenow': value,
  } as const

  const displayValue = formatValue
    ? formatValue(value)
    : step && step >= 1
      ? value.toFixed(0)
      : value.toFixed(1)

  // Determine ring color: routing source > effect color
  const arcColor = sourceInfo ? sourceInfo.color : color

  const isCompact = size === 'xs'

  // Arc knob geometry
  const arcSize = { xs: 28, sm: 32, md: 36, lg: 44 }[size]
  const arcStroke = 2.5
  const arcRadius = (arcSize - arcStroke) / 2
  const arcCenter = arcSize / 2
  // Arc spans 270° (from 135° to 405°)
  const startAngle = 135
  const endAngle = 405
  const angleRange = endAngle - startAngle
  const valueAngle = startAngle + normalized * angleRange

  const polarToCartesian = (cx: number, cy: number, r: number, angleDeg: number) => {
    const rad = (angleDeg - 90) * Math.PI / 180
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) }
  }

  const describeArc = (cx: number, cy: number, r: number, start: number, end: number) => {
    const s = polarToCartesian(cx, cy, r, start)
    const e = polarToCartesian(cx, cy, r, end)
    const largeArc = end - start > 180 ? 1 : 0
    return `M ${s.x} ${s.y} A ${r} ${r} 0 ${largeArc} 1 ${e.x} ${e.y}`
  }

  // Indicator line drawn at 12 o'clock (angle 360) and rotated into place via CSS
  // transform — lets the settle spring animate on transform only (no path recompute)
  const indicatorEnd = polarToCartesian(arcCenter, arcCenter, arcRadius - 3, 360)
  const indicatorStart = polarToCartesian(arcCenter, arcCenter, arcRadius * 0.35, 360)
  const indicatorRotation = valueAngle - 360 // continuous over [-225°, +45°], no wrap

  // 12 o'clock reference tick
  const tickOuter = polarToCartesian(arcCenter, arcCenter, arcRadius, 360)
  const tickInner = polarToCartesian(arcCenter, arcCenter, arcRadius - 3, 360)

  return (
    <div
      className="flex flex-col items-center relative"
      style={{ gap: isCompact ? 2 : 3, minWidth: isCompact ? 48 : undefined }}
    >
      {/* Label */}
      <span
        className="uppercase leading-none font-bold"
        style={{
          color: 'var(--text-muted)',
          fontFamily: 'var(--font-mono)',
          letterSpacing: '0.1em',
          fontSize: isCompact ? 8 : 9,
        }}
      >
        {label}
      </span>

      {showArc ? (
        /* Circular arc knob */
        <div
          {...ctl.rootProps}
          {...ariaProps}
          className="relative select-none touch-none flex flex-col items-center"
          style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
        >
          <svg
            width={arcSize}
            height={arcSize}
            className={hasRouting && !isDragging ? 'alive-active' : undefined}
            style={{
              borderRadius: '50%',
              transform: isDragging ? 'scale(1.05)' : 'scale(1)',
              transition: `transform ${isDragging ? 'var(--dur-instant) var(--ease-snap)' : 'var(--dur-settle) var(--ease-out-back)'}`,
            }}
          >
            {/* Background track */}
            <path
              d={describeArc(arcCenter, arcCenter, arcRadius, startAngle, endAngle)}
              fill="none"
              stroke={isHovered || isDragging ? 'var(--border-emphasis)' : 'var(--border)'}
              strokeWidth={arcStroke}
              strokeLinecap="round"
              style={{ transition: 'stroke var(--dur-quick) var(--ease-out-expo)' }}
            />
            {/* 12 o'clock reference tick */}
            <line
              x1={tickInner.x} y1={tickInner.y}
              x2={tickOuter.x} y2={tickOuter.y}
              stroke="var(--text-ghost)"
              strokeWidth={1}
            />
            {/* Active arc */}
            {normalized > 0.005 && (
              <path
                d={describeArc(arcCenter, arcCenter, arcRadius, startAngle, valueAngle)}
                fill="none"
                stroke={arcColor}
                strokeWidth={arcStroke}
                strokeLinecap="round"
                style={{
                  opacity: isDragging ? 1 : 0.9,
                  filter: isDragging ? 'drop-shadow(0 0 3px var(--accent-glow))' : 'none',
                  transition: 'opacity var(--dur-quick) var(--ease-out-expo), filter var(--dur-quick) var(--ease-out-expo)',
                }}
              />
            )}
            {/* Indicator line — rotated group so release settles with spring */}
            <g
              style={{
                transform: `rotate(${indicatorRotation}deg)`,
                transformOrigin: `${arcCenter}px ${arcCenter}px`,
                transition: isDragging ? 'none' : 'transform var(--dur-settle) var(--ease-out-back)',
              }}
            >
              <line
                x1={indicatorStart.x} y1={indicatorStart.y}
                x2={indicatorEnd.x} y2={indicatorEnd.y}
                stroke={isDragging ? 'var(--accent)' : arcColor}
                strokeWidth={1.5}
                strokeLinecap="round"
                style={{
                  filter: isDragging ? 'drop-shadow(0 0 2px var(--accent-glow))' : 'none',
                  transition: 'stroke var(--dur-quick) var(--ease-out-expo), filter var(--dur-quick) var(--ease-out-expo)',
                }}
              />
            </g>
          </svg>
          {/* Value below arc */}
          <span
            className="tabular-nums font-bold"
            style={{
              fontSize: isCompact ? 9 : 10,
              color: isDragging ? 'var(--accent)' : arcColor,
              textShadow: isDragging ? '0 0 6px var(--accent-glow)' : 'none',
              fontFamily: 'var(--font-mono)',
              letterSpacing: '0.06em',
              marginTop: -2,
              transition: 'color var(--dur-quick) var(--ease-out-expo), text-shadow var(--dur-quick) var(--ease-out-expo)',
            }}
          >
            {displayValue}
          </span>
        </div>
      ) : (
      /* Rectangular value container — all pointer events */
      <div
        {...ctl.rootProps}
        {...ariaProps}
        className={`relative select-none touch-none ${hasRouting && !isDragging && !isAutomationTarget ? 'alive-active' : ''}`}
        style={{
          width: dimensions.width,
          height: dimensions.height,
          cursor: isDragging ? 'grabbing' : 'grab',
          border: isAutomationTarget
            ? '1px solid #FF4060'
            : isInAssignmentMode && !hasRouting
              ? `1px solid ${assigningColor}`
              : isDropTarget
                ? '1px solid var(--accent)'
                : isDragging && !hasRouting
                  ? '1px solid var(--accent)'
                  : `1px solid ${hasRouting ? (sourceInfo?.color ?? 'var(--border)') : isHovered ? 'var(--border-emphasis)' : 'var(--border)'}`,
          backgroundColor: '#000000',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: isDragging ? '0 0 10px var(--accent-glow)' : 'none',
          transform: isDragging ? 'scale(1.03)' : 'scale(1)',
          transition: `border-color var(--dur-quick) var(--ease-out-expo), box-shadow var(--dur-quick) var(--ease-out-expo), transform ${isDragging ? 'var(--dur-instant) var(--ease-snap)' : 'var(--dur-settle) var(--ease-out-back)'}`,
          animation: isAutomationTarget ? 'hud-blink 0.5s step-end infinite' : undefined,
        }}
      >
        {/* Depth drag indicator */}
        {isDepthDragging && (
          <div className="absolute -top-6 left-1/2 -translate-x-1/2 px-1.5 py-0.5 text-[9px] font-bold tabular-nums whitespace-nowrap z-20"
            style={{
              backgroundColor: assigningColor ?? 'var(--accent)',
              color: '#000',
            }}>
            {(() => {
              const name = depthSourceName
              const sign = depthDragDisplay > 0 ? '+' : ''
              return name ? `${name}: ${sign}${(depthDragDisplay * 100).toFixed(0)}%` : `${sign}${(depthDragDisplay * 100).toFixed(0)}%`
            })()}
          </div>
        )}

        {/* Dot drag tooltip */}
        {dotDragging && (
          <div className="absolute -top-6 left-1/2 -translate-x-1/2 px-1.5 py-0.5 text-[9px] font-bold tabular-nums whitespace-nowrap z-20"
            style={{ backgroundColor: dotDragging.color, color: '#000' }}>
            {dotDragging.name}: {dotDragging.depth > 0 ? '+' : ''}{(dotDragging.depth * 100).toFixed(0)}%
          </div>
        )}

        {/* Value */}
        <span
          className="tabular-nums font-bold"
          style={{
            fontSize: isCompact ? 10 : 12,
            color: isDragging ? 'var(--accent)' : arcColor,
            textShadow: isDragging ? '0 0 6px var(--accent-glow)' : 'none',
            fontFamily: 'var(--font-mono)',
            letterSpacing: '0.06em',
            transition: 'color var(--dur-quick) var(--ease-out-expo), text-shadow var(--dur-quick) var(--ease-out-expo)',
          }}
        >
          {displayValue}
        </span>

        {/* Fill bar at bottom — scaleX so external value changes settle with spring */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: 1,
            backgroundColor: arcColor,
            opacity: isDragging ? 0.9 : 0.4,
            transform: `scaleX(${normalized})`,
            transformOrigin: 'left',
            transition: isDragging
              ? 'opacity var(--dur-quick) var(--ease-out-expo)'
              : 'transform var(--dur-settle) var(--ease-out-back), opacity var(--dur-quick) var(--ease-out-expo)',
          }}
        />
      </div>
      )}

      {/* Modulation indicators */}
      {routings.length > 0 && (
        <div className="flex" style={{ gap: 2 }}>
          {routings.map(r => (
            <div
              key={r.id}
              {...ctl.dotProps(r)}
              className="cursor-ns-resize touch-none hover:opacity-100 transition-opacity"
              style={{
                width: isCompact ? 14 : 18,
                height: 3,
                backgroundColor: r.color,
                opacity: 0.7,
              }}
              title={`${r.name}: ${r.depth > 0 ? '+' : ''}${Math.round(r.depth * 100)}%. Drag to adjust, double-click to remove`}
            />
          ))}
        </div>
      )}

      {/* Modulation context menu */}
      {ctl.contextMenu}
    </div>
  )
}
