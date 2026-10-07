import { memo, useCallback, useMemo } from 'react'
import { EFFECT_PARAM_REGISTRY, type LockableParam, type LockableSelectParam } from '../../config/effectParams'
import { EFFECTS, STRAND_EFFECTS, MOTION_EFFECTS, DESTRUCTION_EFFECTS } from '../../config/effects'
import { EffectHeaderBlock } from './blocks/EffectHeaderBlock'
import { ToggleBlock } from './blocks/ToggleBlock'
import { SelectBlock } from './blocks/SelectBlock'
import { BlockExtras } from './ExpandedParameterPanel_v2'
import { Knob } from './Knob'
import { ParamBar } from './ParamBar'
import { useParamValue } from '../../hooks/useParamValue'
import { formatParamValue } from '../../utils/paramBar'

const ALL_EFFECTS = [...EFFECTS, ...STRAND_EFFECTS, ...MOTION_EFFECTS, ...DESTRUCTION_EFFECTS]
const isToggle = (p: LockableParam) => p.min === 0 && p.max === 1 && p.step >= 1

const StripKnob = memo(function StripKnob({ effectId, param }: { effectId: string; param: LockableParam }) {
  const value = useParamValue(param)
  const onChange = useCallback((v: number) => param.apply(v), [param])
  return (
    <Knob
      label={param.label} value={value} min={param.min} max={param.max} step={param.step}
      onChange={onChange} paramId={`${effectId}.${param.id}`} size="md" formatValue={formatParamValue}
      resetOnDoubleClick
    />
  )
})

const ParamToggle = memo(function ParamToggle({ param }: { param: LockableParam }) {
  const value = useParamValue(param)
  return <ToggleBlock label={param.label} value={value >= 0.5} onChange={(on) => param.apply(on ? 1 : 0)} />
})

const ParamSelect = memo(function ParamSelect({ effectId, param }: { effectId: string; param: LockableSelectParam }) {
  // Adapt the string-valued select to the numeric live-value hook: track its option index
  const indexParam = useMemo<LockableParam>(() => ({
    id: param.id, label: param.label, min: 0, max: Math.max(1, param.options.length - 1), step: 1,
    apply: () => {},
    read: () => Math.max(0, param.options.findIndex((o) => o.value === param.read())),
  }), [param])
  const idx = useParamValue(indexParam)
  return (
    <SelectBlock
      label={param.label} value={param.options[idx]?.value ?? param.read()} options={param.options}
      onChange={(v) => param.apply(v)} paramId={`${effectId}.${param.id}`}
    />
  )
})

export const EffectSettings = memo(function EffectSettings({ effectId }: { effectId: string }) {
  const color = ALL_EFFECTS.find((e) => e.id === effectId)?.color ?? 'var(--text-primary)'
  // getParams() builds closures; build once per effect so memoised children see stable param objects
  const { strip, bars, toggles, selects } = useMemo(() => {
    const entry = EFFECT_PARAM_REGISTRY[effectId]
    const all = entry?.getParams() ?? []
    const numeric = all.filter((p) => !isToggle(p))
    return {
      strip: numeric.slice(0, 4),
      bars: numeric.slice(4),
      toggles: all.filter(isToggle),
      selects: entry?.getSelectParams?.() ?? [],
    }
  }, [effectId])
  return (
    <div data-effect-settings={effectId} style={{ ['--fx' as string]: color, display: 'flex', flexDirection: 'column', gap: 8 }}>
      <EffectHeaderBlock effectId={effectId} />
      {strip.length > 0 && (
        <div data-knob-strip style={{ background: 'var(--bg-surface)', margin: '0 -8px', padding: '6px 8px 4px', borderBottom: '1px solid var(--border)' }}>
          <span className="hud-label" style={{ fontSize: 9, color: 'var(--text-muted)' }}>Main</span>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', justifyItems: 'center', gap: 4, marginTop: 2 }}>
            {strip.map((p) => <StripKnob key={p.id} effectId={effectId} param={p} />)}
          </div>
        </div>
      )}
      {bars.length > 0 && <div>{bars.map((p) => <ParamBar key={p.id} effectId={effectId} param={p} />)}</div>}
      {toggles.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4 }}>
          {toggles.map((p) => <ParamToggle key={p.id} param={p} />)}
        </div>
      )}
      {selects.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {selects.map((p) => <ParamSelect key={p.id} effectId={effectId} param={p} />)}
        </div>
      )}
      <BlockExtras effectId={effectId} />
    </div>
  )
})
