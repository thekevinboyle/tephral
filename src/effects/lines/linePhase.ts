// Each Line track's position while the sequencer plays (spec §2; playback spec §2), written by the playback line
// pass and read by the lanes' rAF playheads. pos = loops since Play (beats / line.beats); head = the x being read.
// Outside React; Map.set on existing keys only, per frame.
const pos = new Map<string, number>()
const head = new Map<string, number>()
let passes = 0
const frac = (v: number) => v - Math.floor(v)

export const getLinePos = (id: string): number | null => pos.get(id) ?? null
export const getLinePhase = (id: string): number | null => { const p = pos.get(id); return p === undefined ? null : frac(p) }
export const getLineHead = (id: string): number | null => head.get(id) ?? null
export const setLinePos = (id: string, p: number, x: number): void => { pos.set(id, p); head.set(id, x) }
export const deleteLinePhase = (id: string): void => { pos.delete(id); head.delete(id) }
export const clearLinePhases = (): void => { pos.clear(); head.clear(); masterPos = null; masterHead = null }

// The master line's position and x while the sequencer plays (lines editor spec §3); null when stopped
let masterPos: number | null = null
let masterHead: number | null = null
export const getMasterPos = (): number | null => masterPos
export const getMasterPhase = (): number | null => (masterPos === null ? null : frac(masterPos))
export const getMasterHead = (): number | null => masterHead
export const setMasterPos = (p: number | null, x: number | null = null): void => { masterPos = p; masterHead = x }

/** Dev only: counts Line tracks processed by the line pass (the harness checks it stays put with none). */
export const noteLinePass = (): void => { passes++ }
export const getLinePassCount = (): number => passes
