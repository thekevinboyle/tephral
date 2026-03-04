import { useState, useCallback } from 'react'
import { useEffectSequencerStore, type TimeScale } from '../../stores/effectSequencerStore'
import { EFFECT_PARAM_REGISTRY } from '../../config/effectParams'
import { Knob } from '../performance/Knob'

const LED = '#88FFaa'
const LED_DIM = '#88FFaa30'
const LED_BG = '#0a0f0a'

const TOOL_FG = '#BBBBBB'
const TOOL_DIM = '#BBBBBB30'
const TOOL_BG = '#0a0a0a'

const TIME_SCALE_VALUES: TimeScale[] = [0.25, 0.5, 0.75, 1, 1.5, 2, 3, 4]
const TIME_SCALE_LABELS: Record<number, string> = {
  0.25: '¼', 0.5: '½', 0.75: '¾', 1: '1x', 1.5: '3/2', 2: '2x', 3: '3x', 4: '4x',
}

const RETRIG_VALUES = [0, 2, 3, 4, 6, 8]

type ParamPage = 'length' | 'clock' | 'eucl-hits' | 'eucl-rot' | 'retrig'

const PAGES: { id: ParamPage; label: string }[] = [
  { id: 'length', label: 'LENGTH' },
  { id: 'clock', label: 'CLOCK' },
  { id: 'eucl-hits', label: 'EUCL HITS' },
  { id: 'eucl-rot', label: 'EUCL ROT' },
  { id: 'retrig', label: 'RETRIG' },
]

type ToolPage = 'random' | 'rnd-all' | 'rnd-locks' | 'clear'

const TOOL_PAGES: { id: ToolPage; label: string }[] = [
  { id: 'random', label: 'RANDOM' },
  { id: 'rnd-all', label: 'RND ALL' },
  { id: 'rnd-locks', label: 'RND LOCKS' },
  { id: 'clear', label: 'CLEAR' },
]

interface TrackParamPanelProps {
  effectId: string
}

export function TrackParamPanel({ effectId }: TrackParamPanelProps) {
  const track = useEffectSequencerStore((s) => s.tracks[effectId])
  const setTrackLength = useEffectSequencerStore((s) => s.setTrackLength)
  const setTrackTimeScale = useEffectSequencerStore((s) => s.setTrackTimeScale)
  const applyEuclidean = useEffectSequencerStore((s) => s.applyEuclidean)
  const setStepRetrig = useEffectSequencerStore((s) => s.setStepRetrig)
  const selectedStep = useEffectSequencerStore((s) => s.selectedStep)
  const randomizeTrack = useEffectSequencerStore((s) => s.randomizeTrack)
  const randomizeAllTracks = useEffectSequencerStore((s) => s.randomizeAllTracks)
  const randomizeLocks = useEffectSequencerStore((s) => s.randomizeLocks)
  const setAutomationParam = useEffectSequencerStore((s) => s.setAutomationParam)
  const clearTrack = useEffectSequencerStore((s) => s.clearTrack)

  const [page, setPage] = useState<ParamPage>('length')
  const [toolPage, setToolPage] = useState<ToolPage>('random')
  const [density, setDensity] = useState(40)
  const [lastAction, setLastAction] = useState<string | null>(null)

  if (!track) return null

  const eucHits = track.euclidean?.hits ?? Math.floor(track.length / 4)
  const eucRotation = track.euclidean?.rotation ?? 0
  const stepIdx = selectedStep?.effectId === effectId ? selectedStep.stepIndex : null
  const currentRetrig = stepIdx !== null ? (track.steps[stepIdx]?.retrig ?? 0) : 0

  const pageIdx = PAGES.findIndex((p) => p.id === page)

  const prevPage = () => setPage(PAGES[(pageIdx - 1 + PAGES.length) % PAGES.length].id)
  const nextPage = () => setPage(PAGES[(pageIdx + 1) % PAGES.length].id)

  const getKnobConfig = () => {
    switch (page) {
      case 'length':
        return {
          value: track.length,
          min: 1,
          max: 32,
          step: 1,
          displayValue: String(track.length),
          onChange: (v: number) => setTrackLength(effectId, Math.round(v)),
        }
      case 'clock': {
        const tsIdx = TIME_SCALE_VALUES.indexOf(track.timeScale ?? 1)
        return {
          value: tsIdx >= 0 ? tsIdx : 3,
          min: 0,
          max: TIME_SCALE_VALUES.length - 1,
          step: 1,
          displayValue: TIME_SCALE_LABELS[track.timeScale ?? 1] ?? '1x',
          onChange: (v: number) => {
            const idx = Math.round(v)
            setTrackTimeScale(effectId, TIME_SCALE_VALUES[idx])
          },
        }
      }
      case 'eucl-hits':
        return {
          value: eucHits,
          min: 0,
          max: track.length,
          step: 1,
          displayValue: String(eucHits),
          onChange: (v: number) => applyEuclidean(effectId, Math.round(v), eucRotation),
        }
      case 'eucl-rot':
        return {
          value: eucRotation,
          min: 0,
          max: Math.max(0, track.length - 1),
          step: 1,
          displayValue: String(eucRotation),
          onChange: (v: number) => applyEuclidean(effectId, eucHits, Math.round(v)),
        }
      case 'retrig': {
        const rtIdx = RETRIG_VALUES.indexOf(currentRetrig)
        return {
          value: rtIdx >= 0 ? rtIdx : 0,
          min: 0,
          max: RETRIG_VALUES.length - 1,
          step: 1,
          displayValue: currentRetrig === 0 ? 'OFF' : `${currentRetrig}x`,
          onChange: (v: number) => {
            if (stepIdx !== null) setStepRetrig(effectId, stepIdx, RETRIG_VALUES[Math.round(v)])
          },
          disabled: stepIdx === null,
        }
      }
    }
  }

  const knob = getKnobConfig()
  const stepsToShow = track.steps.slice(0, track.length)
  const isDisabled = 'disabled' in knob && knob.disabled

  // Tool pages
  const toolPageIdx = TOOL_PAGES.findIndex((p) => p.id === toolPage)
  const prevToolPage = () => setToolPage(TOOL_PAGES[(toolPageIdx - 1 + TOOL_PAGES.length) % TOOL_PAGES.length].id)
  const nextToolPage = () => setToolPage(TOOL_PAGES[(toolPageIdx + 1) % TOOL_PAGES.length].id)

  const executeTool = useCallback(() => {
    const d = density / 100
    switch (toolPage) {
      case 'random':
        randomizeTrack(effectId, d)
        setLastAction('DONE')
        break
      case 'rnd-all':
        randomizeAllTracks(d)
        setLastAction('DONE')
        break
      case 'rnd-locks': {
        const entry = EFFECT_PARAM_REGISTRY[effectId]
        if (!entry) return
        const allParams = entry.getParams()
        const params = allParams.map((p) => ({
          id: p.id, min: p.min, max: p.max, step: p.step,
        }))
        randomizeLocks(effectId, params)
        if (allParams.length > 0) {
          const p = allParams[0]
          setAutomationParam({
            effectId,
            paramId: p.id,
            fullParamId: `${effectId}.${p.id}`,
            label: p.label,
            min: p.min,
            max: p.max,
            step: p.step,
          })
        }
        setLastAction('DONE')
        break
      }
      case 'clear':
        clearTrack(effectId)
        setLastAction('CLR')
        break
    }
    setTimeout(() => setLastAction(null), 600)
  }, [toolPage, density, effectId, randomizeTrack, randomizeAllTracks, randomizeLocks, clearTrack, setAutomationParam])

  const getToolDisplayValue = () => {
    if (lastAction) return lastAction
    switch (toolPage) {
      case 'random':
      case 'rnd-all':
        return `${density}%`
      case 'rnd-locks':
        return 'RND'
      case 'clear':
        return 'CLR'
    }
  }

  const toolHasKnob = toolPage === 'random' || toolPage === 'rnd-all'

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      style={{
        width: 180,
        flexShrink: 0,
        backgroundColor: '#111',
        borderRight: '2px solid #222',
        display: 'flex',
        flexDirection: 'column',
        padding: 6,
        gap: 6,
      }}
    >
      {/* LED Screen */}
      <div
        style={{
          backgroundColor: TOOL_BG,
          borderRadius: 4,
          border: '1px solid #1a1a1a',
          boxShadow: 'inset 0 1px 4px rgba(0,0,0,0.6)',
          padding: '8px 10px',
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
          fontFamily: 'var(--font-mono, monospace)',
        }}
      >
        {/* Page nav row */}
        <div className="flex items-center">
          <button
            onClick={prevPage}
            className="flex-shrink-0"
            style={{ color: TOOL_FG, fontSize: 16, width: 20, opacity: 0.7 }}
          >
            ◂
          </button>
          <span
            className="flex-1 text-center text-[10px] tracking-[0.2em] font-bold"
            style={{ color: TOOL_FG }}
          >
            {PAGES[pageIdx].label}
          </span>
          <button
            onClick={nextPage}
            className="flex-shrink-0 text-right"
            style={{ color: TOOL_FG, fontSize: 16, width: 20, opacity: 0.7 }}
          >
            ▸
          </button>
        </div>

        {/* Page dots */}
        <div className="flex justify-center gap-1">
          {PAGES.map((p, i) => (
            <button
              key={p.id}
              onClick={() => setPage(p.id)}
              style={{
                width: 4,
                height: 4,
                borderRadius: '50%',
                backgroundColor: i === pageIdx ? TOOL_FG : TOOL_DIM,
              }}
            />
          ))}
        </div>

        {/* Divider */}
        <div style={{ height: 1, backgroundColor: TOOL_DIM }} />

        {/* Big value */}
        <div
          className="text-center font-black tabular-nums"
          style={{
            fontSize: 32,
            lineHeight: 1,
            color: isDisabled ? TOOL_DIM : TOOL_FG,
            padding: '4px 0',
          }}
        >
          {knob.displayValue}
        </div>

        {/* Range bar */}
        <div
          style={{
            height: 3,
            backgroundColor: TOOL_DIM,
            borderRadius: 1,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${((knob.value - knob.min) / (knob.max - knob.min || 1)) * 100}%`,
              backgroundColor: TOOL_FG,
              opacity: isDisabled ? 0.2 : 0.8,
              transition: 'width 0.04s',
            }}
          />
        </div>

        {/* Mini step pattern */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${Math.min(16, track.length)}, 1fr)`,
            gap: 1,
          }}
        >
          {stepsToShow.slice(0, 16).map((s, i) => (
            <div
              key={i}
              style={{
                aspectRatio: '1',
                backgroundColor: s.active ? TOOL_FG : TOOL_DIM,
              }}
            />
          ))}
        </div>
        {track.length > 16 && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(16, 1fr)`,
              gap: 1,
              marginTop: -4,
            }}
          >
            {stepsToShow.slice(16).map((s, i) => (
              <div
                key={i + 16}
                style={{
                  aspectRatio: '1',
                  backgroundColor: s.active ? TOOL_FG : TOOL_DIM,
                }}
              />
            ))}
          </div>
        )}

        {/* Retrig hint */}
        {page === 'retrig' && stepIdx === null && (
          <div
            className="text-[8px] text-center tracking-wider"
            style={{ color: TOOL_DIM }}
          >
            SELECT STEP
          </div>
        )}
      </div>

      {/* Knob below the screen */}
      <div className="flex justify-center" style={{ opacity: isDisabled ? 0.3 : 1 }}>
        <Knob
          label=""
          value={knob.value}
          min={knob.min}
          max={knob.max}
          step={knob.step}
          size="md"
          showArc
          color={TOOL_FG}
          onChange={knob.onChange}
          formatValue={() => ''}
        />
      </div>

      {/* Spacer between sections */}
      <div style={{ height: 32 }} />

      {/* Tool LED Screen */}
      <div
        style={{
          backgroundColor: TOOL_BG,
          borderRadius: 4,
          border: '1px solid #1a1a1a',
          boxShadow: 'inset 0 1px 4px rgba(0,0,0,0.6)',
          padding: '8px 10px',
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
          fontFamily: 'var(--font-mono, monospace)',
        }}
      >
        {/* Tool page nav */}
        <div className="flex items-center">
          <button
            onClick={prevToolPage}
            className="flex-shrink-0"
            style={{ color: TOOL_FG, fontSize: 16, width: 20, opacity: 0.7 }}
          >
            ◂
          </button>
          <span
            className="flex-1 text-center text-[10px] tracking-[0.2em] font-bold"
            style={{ color: TOOL_FG }}
          >
            {TOOL_PAGES[toolPageIdx].label}
          </span>
          <button
            onClick={nextToolPage}
            className="flex-shrink-0 text-right"
            style={{ color: TOOL_FG, fontSize: 16, width: 20, opacity: 0.7 }}
          >
            ▸
          </button>
        </div>

        {/* Tool page dots */}
        <div className="flex justify-center gap-1">
          {TOOL_PAGES.map((p, i) => (
            <button
              key={p.id}
              onClick={() => setToolPage(p.id)}
              style={{
                width: 4,
                height: 4,
                borderRadius: '50%',
                backgroundColor: i === toolPageIdx ? TOOL_FG : TOOL_DIM,
              }}
            />
          ))}
        </div>

        {/* Divider */}
        <div style={{ height: 1, backgroundColor: TOOL_DIM }} />

        {/* Big value */}
        <div
          className="text-center font-black tabular-nums"
          style={{
            fontSize: 32,
            lineHeight: 1,
            color: TOOL_FG,
            padding: '4px 0',
          }}
        >
          {getToolDisplayValue()}
        </div>

        {/* Density bar (for random/rnd-all) */}
        {toolHasKnob && (
          <div
            style={{
              height: 3,
              backgroundColor: TOOL_DIM,
              borderRadius: 1,
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                height: '100%',
                width: `${density}%`,
                backgroundColor: TOOL_FG,
                opacity: 0.8,
                transition: 'width 0.04s',
              }}
            />
          </div>
        )}

        {/* Execute button */}
        <button
          onClick={executeTool}
          className="text-[9px] font-bold tracking-[0.15em] uppercase"
          style={{
            color: TOOL_BG,
            backgroundColor: TOOL_FG,
            border: 'none',
            borderRadius: 2,
            padding: '4px 0',
            cursor: 'pointer',
          }}
        >
          {toolPage === 'clear' ? '⊘ CLEAR' : '▶ EXECUTE'}
        </button>
      </div>

      {/* Tool knob (density) */}
      {toolHasKnob && (
        <div className="flex justify-center">
          <Knob
            label=""
            value={density}
            min={0}
            max={100}
            step={5}
            size="md"
            showArc
            color={TOOL_FG}
            onChange={(v) => setDensity(Math.round(v))}
            formatValue={() => ''}
          />
        </div>
      )}
    </div>
  )
}
