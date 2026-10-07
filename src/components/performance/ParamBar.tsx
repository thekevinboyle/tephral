import { memo, useCallback } from 'react'
import type { LockableParam } from '../../config/effectParams'
import { useParamValue } from '../../hooks/useParamValue'
import { useParamControl } from '../../hooks/useParamControl'
import { buildSegments, formatParamValue } from '../../utils/paramBar'

export const ParamBar = memo(function ParamBar({ effectId, param }: { effectId: string; param: LockableParam }) {
  const value = useParamValue(param)
  const onChange = useCallback((v: number) => param.apply(v), [param])
  const paramId = `${effectId}.${param.id}`
  const ctl = useParamControl({
    paramId, label: param.label, value,
    min: param.min, max: param.max, step: param.step, onChange, axis: 'x',
    resetOnDoubleClick: true,
  })
  const first = ctl.routings[0]
  const segs = buildSegments({ value, min: param.min, max: param.max, step: param.step, modDepth: first ? first.depth : null })
  return (
    <div
      className="param-bar"
      data-param-control
      data-param-id={paramId}
      data-state={ctl.isDragging ? 'drag' : undefined}
      data-locked={ctl.isAutomationTarget || undefined}
      data-assigning={ctl.isInAssignmentMode || undefined}
      data-drop={ctl.isDropTarget || undefined}
      style={{
        ...(ctl.assigningColor ? { ['--assign' as string]: ctl.assigningColor } : null),
      }}
      tabIndex={0}
      role="slider"
      aria-label={param.label}
      aria-valuemin={param.min}
      aria-valuemax={param.max}
      aria-valuenow={Math.min(param.max, Math.max(param.min, value))}
      aria-valuetext={formatParamValue(value)}
      {...ctl.wrapperProps}
      {...ctl.rootProps}
    >
      <span className="param-bar-name">{param.label}</span>
      <span className="param-bar-segs" aria-hidden>
        {segs.map((s, i) => (
          <i key={i} data-lit={s.lit || undefined} data-zero={s.zero || undefined} data-mod={s.mod || undefined} />
        ))}
      </span>
      <span className="param-bar-value">{formatParamValue(value)}</span>
      {ctl.routings.slice(0, 3).map((r, i) => (
        <span key={r.id} className="param-bar-src" title={`${r.name} ${Math.round(r.depth * 100)}%`}
          style={{ background: r.color, right: -1 + i * 8 }} {...ctl.dotProps(r)} />
      ))}
      {ctl.contextMenu}
    </div>
  )
})
