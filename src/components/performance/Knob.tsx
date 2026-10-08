import { useParamControl } from '../../hooks/useParamControl'
import { ModReadout } from './ModReadout'

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
  resetOnDoubleClick?: boolean
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
  resetOnDoubleClick = false,
}: KnobProps) {

  // Knob feel: full range over 150px of vertical drag
  const ctl = useParamControl({
    paramId, label, value, min, max, step, onChange,
    axis: 'y', dragSpanPx: 150, statusText, resetOnDoubleClick,
  })
  const {
    isDragging, isHovered, isDropTarget, isAutomationTarget, isInAssignmentMode,
    assigningColor, isDepthDragging, depthDragDisplay, depthSourceName, routings, dotDragging,
  } = ctl
  const readoutDepth = isDepthDragging ? { name: depthSourceName, value: depthDragDisplay, color: assigningColor } : null
  const hasRouting = routings.length > 0
  const sourceInfo = hasRouting ? routings[0] : null

  const normalized = (value - min) / (max - min)

  const dimensions = {
    xs: { width: 48, height: 22 },
    sm: { width: 52, height: 24 },
    md: { width: 56, height: 26 },
    lg: { width: 72, height: 32 },
  }[size]

  const displayValue = formatValue
    ? formatValue(value)
    : step && step >= 1
      ? value.toFixed(0)
      : value.toFixed(1)

  const ariaProps = {
    'data-param-control': '',
    'data-param-id': paramId,
    'data-assigning': isInAssignmentMode || isDropTarget ? '' : undefined,
    'data-locked': isAutomationTarget ? '' : undefined,
    tabIndex: paramId ? 0 : undefined,
    role: 'slider',
    'aria-label': label,
    'aria-valuemin': min,
    'aria-valuemax': max,
    'aria-valuenow': value,
    'aria-valuetext': displayValue,
  } as const

  // Determine ring color: routing source > effect color
  const arcColor = sourceInfo ? sourceInfo.color : color

  const isCompact = size === 'xs'

  // Arc knob geometry
  const arcSize = 40
  const arcStroke = 3
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

  // Modulation range: first routing's depth swings the value, drawn as a 5px arc in the source's colour
  const modDepth = sourceInfo ? sourceInfo.depth : 0
  const modLo = Math.max(0, Math.min(1, normalized + Math.min(0, modDepth)))
  const modHi = Math.max(0, Math.min(1, normalized + Math.max(0, modDepth)))
  const showModArc = hasRouting && modHi - modLo > 0.005
  const dotPos = polarToCartesian(arcCenter, arcCenter, arcRadius, valueAngle)

  return (
    <div
      className="flex flex-col items-center relative"
      style={{ gap: isCompact ? 2 : 3, minWidth: isCompact ? 48 : undefined }}
      {...ctl.wrapperProps}
    >
      {/* Label */}
      {!showArc && <span
        className="leading-none font-medium whitespace-nowrap"
        style={{
          color: 'var(--text-secondary)',
          fontFamily: 'var(--font-sans)',
          fontSize: isCompact ? 10 : 10.5,
        }}
      >
        {label}
      </span>}

      {showArc ? (
        /* Circular arc knob */
        <div
          {...ctl.rootProps}
          {...ariaProps}
          className="relative select-none touch-none flex flex-col items-center"
          style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
        >
          <ModReadout depth={readoutDepth} dot={dotDragging} />
          {(isAutomationTarget || isInAssignmentMode || isDropTarget) && (
            <span
              aria-hidden
              data-knob-ring={isAutomationTarget ? 'lock' : 'assign'}
              className="absolute pointer-events-none"
              style={{
                left: 0, top: 0, width: arcSize, height: arcSize, borderRadius: '50%', boxSizing: 'border-box',
                border: isAutomationTarget
                  ? `1px solid ${color}`
                  : `1px dashed ${assigningColor ?? 'var(--text-secondary)'}`,
              }}
            />
          )}
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
              stroke={isHovered || isDragging ? 'var(--bg-hover)' : 'var(--bg-elevated)'}
              strokeWidth={arcStroke}
              strokeLinecap="round"
              style={{ transition: 'stroke var(--dur-quick) var(--ease-out-expo)' }}
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
                  transition: 'opacity var(--dur-quick) var(--ease-out-expo)',
                }}
              />
            )}
            {/* Modulation range */}
            {showModArc && (
              <path
                d={describeArc(arcCenter, arcCenter, arcRadius, startAngle + modLo * angleRange, startAngle + modHi * angleRange)}
                fill="none"
                stroke={sourceInfo?.color ?? 'var(--mod)'}
                strokeWidth={5}
                strokeLinecap="butt"
                opacity={0.55}
              />
            )}
            {/* Position dot */}
            <circle cx={dotPos.x} cy={dotPos.y} r={2.6} fill="#fff" />
          </svg>
          {/* Value below arc */}
          <span
            className="tabular-nums"
            style={{
              fontSize: 11,
              fontWeight: 500,
              color: 'var(--text-primary)',
              fontFamily: 'var(--font-mono)',
              marginTop: 1,
              lineHeight: 1.2,
            }}
          >
            {displayValue}
          </span>
          <span
            style={{
              fontSize: 10.5,
              color: 'var(--text-muted)',
              fontFamily: 'var(--font-sans)',
              lineHeight: 1.2,
            }}
          >
            {label}
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
        <ModReadout depth={readoutDepth} dot={dotDragging} />

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
