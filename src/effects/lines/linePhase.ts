// Each Line track's phase while the sequencer plays (spec §2), written by the playback line pass and read by the
// lanes' rAF playheads. Outside React; Map.set on existing keys only, per frame.
const phases = new Map<string, number>()
let passes = 0

export const getLinePhase = (id: string): number | null => phases.get(id) ?? null
export const setLinePhase = (id: string, p: number): void => { phases.set(id, p) }
export const deleteLinePhase = (id: string): void => { phases.delete(id) }
export const clearLinePhases = (): void => { phases.clear() }

/** Dev only: counts Line tracks processed by the line pass (the harness checks it stays put with none). */
export const noteLinePass = (): void => { passes++ }
export const getLinePassCount = (): number => passes
