/**
 * Dry/wet (`effectMix`) shared by the two writers that can drive it at once: continuous modulation
 * (`useContinuousModulation`) and the step-sequencer gate (`useEffectSequencerPlayback`). Read and written
 * outside React, allocation-free per frame (Map.set on existing keys only).
 *
 * Rule: while a gate-mode track plays, a modulated Dry/wet becomes the gate's open-step level. Closed steps stay
 * at 0; open steps play at the modulated level (the modulation keeps writing while the step is open). With no
 * gate active for an effect, modulation writes `effectMix` directly. Audio and MIDI gates still own the mix.
 * While a Line track plays, the line scales the modulated (or user) Dry/wet: mix = ceiling × level.
 */

// Modulation side: the latest modulated level per effect and the frame it was written in
let frame = 0
const modLevel = new Map<string, number>()
const modFrame = new Map<string, number>()
// The user's own Dry/wet while a writer (gate or modulation) overrides it
const userMix = new Map<string, number>()
// Gate side: present while the sequencer gate drives the effect's mix; true = the current step is open
const gateOpen = new Map<string, boolean>()
// Line side (Line tracks, spec §3): present while a Line track drives the effect's mix; the line's level 0..1
const lineLevels = new Map<string, number>()

export function setLineLevel(effectId: string, level: number): void {
  lineLevels.set(effectId, level)
}

/** The track left Line mode, was removed, or an audio/MIDI gate took the mix. */
export function releaseLine(effectId: string): void {
  lineLevels.delete(effectId)
}

/** Sequencer stopped: no line drives any mix. */
export function clearLines(): void {
  lineLevels.clear()
}

export function isLineActive(effectId: string): boolean {
  return lineLevels.has(effectId)
}

/** Called once at the start of each modulation frame. */
export function beginMixModulationFrame(): void {
  frame++
}

/** True while modulation wrote this effect's Dry/wet in this frame or the one before. */
export function isMixModulated(effectId: string): boolean {
  const f = modFrame.get(effectId)
  return f !== undefined && frame - f <= 1
}

/**
 * Modulation reports a Dry/wet value. Returns what to write to `effectMix`: the value itself, or null when the
 * gate is active and closed (stays 0 until the next open step, which then uses this level).
 * `current` is the stored effectMix (the user's own value when modulation starts without a gate).
 */
export function noteModulatedMix(effectId: string, value: number, current: number): number | null {
  const gate = gateOpen.get(effectId)
  const line = lineLevels.get(effectId)
  if (!isMixModulated(effectId) && gate === undefined && line === undefined) userMix.set(effectId, current)
  modLevel.set(effectId, value)
  modFrame.set(effectId, frame)
  if (gate === false) return null
  return line === undefined ? value : value * line
}

/** The gate's open-step level: the modulated level while modulation runs, else the user's base. */
export function gateOpenLevel(effectId: string, base: number): number {
  return isMixModulated(effectId) ? (modLevel.get(effectId) as number) : base
}

/**
 * The user's own Dry/wet for the sequencer's pre-play snapshot (what Stop restores): never a modulated value.
 * Also remembered here, so modulation that keeps running across Stop/Play still knows it.
 */
export function captureUserMix(effectId: string, stored: number): number {
  const u = userMix.get(effectId)
  const base = isMixModulated(effectId) && u !== undefined ? u : stored
  userMix.set(effectId, base)
  return base
}

export function setGateOpen(effectId: string, open: boolean): void {
  gateOpen.set(effectId, open)
}

/** The sequencer gate no longer drives this effect's mix (track left gate mode). */
export function releaseGate(effectId: string): void {
  gateOpen.delete(effectId)
}

/** Sequencer stopped: no gate drives any mix. */
export function clearGates(): void {
  gateOpen.clear()
}
