import type { Preset } from '../stores/presetLibraryStore'
import type { BankSnapshot } from '../stores/bankStore'
import {
  DEFAULT_SEG_VOXEL_PARAMS, DEFAULT_SEG_ECHO_PARAMS, DEFAULT_SEG_MATTER_PARAMS,
  DEFAULT_SEG_STALE_PARAMS, DEFAULT_SEG_TORN_PARAMS,
  DEFAULT_SEG_REDACT_PARAMS, DEFAULT_SEG_FACELOCK_PARAMS, DEFAULT_SEG_BACKDROP_PARAMS,
} from '../stores/segStore'
import { defaultEffectOrder } from '../stores/routingStore'

export const FACTORY_FOLDER_ID = 'folder_factory'
export const SEG_EXP_PRESET_ID = 'factory_seg_exp'
export const SEG_EXP_SEEDED_KEY = 'factory_seg_exp_seeded'
export const FACE_SCAN_PRESET_ID = 'factory_face_scan'
export const FACE_SCAN_SEEDED_KEY = 'factory_face_scan_seeded'

const SEG_EXP_CHAIN = ['seg_stale', 'seg_matter', 'seg_voxel', 'seg_echo', 'seg_torn']

/** A copy of `base` with every effect switched off (and no slicer or warp), for a factory preset to switch its own on. */
function allOff(base: BankSnapshot): BankSnapshot {
  const effects = structuredClone(base)
  delete effects.slicer // optional in BankSnapshot; applyEffects skips it when absent
  delete effects.warp // factory presets never carry a time warp (applyEffects resets it to off)
  for (const section of Object.values(effects) as unknown[]) {
    if (section && typeof section === 'object') {
      for (const k of Object.keys(section as Record<string, unknown>)) {
        // sections use both `fooEnabled` and plain `enabled` (contour, landmarks, stipple…)
        if ((k === 'enabled' || k.endsWith('Enabled')) && typeof (section as Record<string, unknown>)[k] === 'boolean') {
          (section as Record<string, unknown>)[k] = false
        }
      }
    }
  }
  return effects
}

const FACE_SCAN_CHAIN = ['seg_backdrop', 'seg_redact', 'seg_facelock']

/**
 * seg.cpu's SEG_exp_35 "FACE SCAN" reel: the background swaps between the picture, oil slick, zebra
 * and edges on the beat with the people left in their boxes, each person is redacted in turn, and
 * the clearest face is locked with an enlarged crop and scan readouts.
 */
export function buildFaceScanPreset(now: number, base: BankSnapshot): Preset {
  const effects = allOff(base)
  const seg = effects.seg!
  effects.seg = {
    ...seg,
    backdropEnabled: true, redactEnabled: true, faceLockEnabled: true,
    backdropParams: { ...DEFAULT_SEG_BACKDROP_PARAMS, beats: 4, keep: 2 },
    redactParams: { ...DEFAULT_SEG_REDACT_PARAMS, coverage: 0.6, reshuffleBeats: 2, linger: 0.5 },
    faceLockParams: { ...DEFAULT_SEG_FACELOCK_PARAMS },
  }
  effects.effectOrder = [...FACE_SCAN_CHAIN, ...defaultEffectOrder.filter((id) => !FACE_SCAN_CHAIN.includes(id))]
  return {
    id: FACE_SCAN_PRESET_ID,
    name: 'FACE SCAN',
    folderId: FACTORY_FOLDER_ID,
    thumbnail: null,
    createdAt: now,
    updatedAt: now,
    effects,
  }
}

/**
 * The reference reel's look: torn stale background, swapped object
 * materials, cube-mosaic person with echoes, ragged border. Built from a
 * capture of the current state (passed in by presetLibraryStore, which
 * avoids a circular import), so the snapshot shape always matches the
 * running app's BankSnapshot.
 *
 * Only the sections BankSnapshot carries are switched off: glitch, ascii,
 * stipple, contour, landmarks and trend. Applying it leaves the motion,
 * destruction, acid, strand and morph stores as they are (BankSnapshot has
 * no sections for them), and the slicer section is dropped so the slicer
 * keeps its current state too.
 */
export function buildSegExpPreset(now: number, base: BankSnapshot): Preset {
  const effects = allOff(base)
  effects.seg = {
    voxelEnabled: true, echoEnabled: true, matterEnabled: true, staleEnabled: true, tornEnabled: true,
    voxelParams: { ...DEFAULT_SEG_VOXEL_PARAMS, size: 14, depth: 2.2, scatter: 0.5, shading: 0.7 },
    echoParams: { ...DEFAULT_SEG_ECHO_PARAMS, copies: 4, delay: 3, decay: 0.7, offsetX: 0.025, offsetY: -0.01 },
    matterParams: { ...DEFAULT_SEG_MATTER_PARAMS, coverage: 0.4, autoReshuffle: true, reshuffleBeats: 4 },
    staleParams: { ...DEFAULT_SEG_STALE_PARAMS, cellSize: 32, threshold: 0.18, refresh: 0.03, autoBurst: true, burstBeats: 8 },
    tornParams: { ...DEFAULT_SEG_TORN_PARAMS, depth: 0.035, blockSize: 18 },
  }
  // Our chain first in order, everything else after (effectOrder is top-level on BankSnapshot)
  effects.effectOrder = [...SEG_EXP_CHAIN, ...defaultEffectOrder.filter((id) => !SEG_EXP_CHAIN.includes(id))]

  return {
    id: SEG_EXP_PRESET_ID,
    name: 'SEG_EXP',
    folderId: FACTORY_FOLDER_ID,
    thumbnail: null,
    createdAt: now,
    updatedAt: now,
    effects,
  }
}
