import { useState } from 'react'
import { useEffectSequencerStore, type TimeScale } from '../../stores/effectSequencerStore'
import { Knob } from '../performance/Knob'

const LED = '#88FFaa'
const LED_DIM = '#88FFaa30'
const LED_BG = '#0a0f0a'

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

  const [page, setPage] = useState<ParamPage>('length')

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
          backgroundColor: LED_BG,
          borderRadius: 4,
          border: '1px solid #1a2a1a',
          boxShadow: 'inset 0 1px 4px rgba(0,0,0,0.6), 0 0 8px rgba(136,255,170,0.03)',
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
            style={{ color: LED, fontSize: 11, width: 14, opacity: 0.7 }}
          >
            ◂
          </button>
          <span
            className="flex-1 text-center text-[10px] tracking-[0.2em] font-bold"
            style={{ color: LED, textShadow: `0 0 6px ${LED}60` }}
          >
            {PAGES[pageIdx].label}
          </span>
          <button
            onClick={nextPage}
            className="flex-shrink-0 text-right"
            style={{ color: LED, fontSize: 11, width: 14, opacity: 0.7 }}
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
                backgroundColor: i === pageIdx ? LED : LED_DIM,
                boxShadow: i === pageIdx ? `0 0 4px ${LED}80` : 'none',
              }}
            />
          ))}
        </div>

        {/* Divider */}
        <div style={{ height: 1, backgroundColor: LED_DIM }} />

        {/* Big value */}
        <div
          className="text-center font-black tabular-nums"
          style={{
            fontSize: 32,
            lineHeight: 1,
            color: isDisabled ? LED_DIM : LED,
            textShadow: isDisabled ? 'none' : `0 0 12px ${LED}50, 0 0 24px ${LED}20`,
            padding: '4px 0',
          }}
        >
          {knob.displayValue}
        </div>

        {/* Range bar */}
        <div
          style={{
            height: 3,
            backgroundColor: LED_DIM,
            borderRadius: 1,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${((knob.value - knob.min) / (knob.max - knob.min || 1)) * 100}%`,
              backgroundColor: LED,
              opacity: isDisabled ? 0.2 : 0.8,
              boxShadow: `0 0 4px ${LED}40`,
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
                backgroundColor: s.active ? LED : LED_DIM,
                boxShadow: s.active ? `0 0 2px ${LED}40` : 'none',
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
                  backgroundColor: s.active ? LED : LED_DIM,
                  boxShadow: s.active ? `0 0 2px ${LED}40` : 'none',
                }}
              />
            ))}
          </div>
        )}

        {/* Retrig hint */}
        {page === 'retrig' && stepIdx === null && (
          <div
            className="text-[8px] text-center tracking-wider"
            style={{ color: LED_DIM }}
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
          color={LED}
          onChange={knob.onChange}
          formatValue={() => ''}
        />
      </div>
    </div>
  )
}
