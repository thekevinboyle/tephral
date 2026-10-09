import { create } from 'zustand'
import type { WarpTool } from '../performance/lines/LinePlot'
import type { WarpPoint } from '../../effects/warp/warpMath'

interface LineEditState {
  tool: WarpTool
  selected: number | null
  setTool: (t: WarpTool) => void
  setSelected: (i: number | null) => void
}

/** The Lines view editor's tool and selected point (the open tab's line). */
export const useLineEditStore = create<LineEditState>((set) => ({
  tool: 'draw',
  selected: null,
  setTool: (tool) => set({ tool }),
  setSelected: (selected) => set({ selected }),
}))

interface LinePickState {
  /** The loaded line's name, kept with the tab and the points it produced (an edit or the dice shows Custom). */
  pick: { tab: string; name: string; points: WarpPoint[] } | null
  setPick: (p: LinePickState['pick']) => void
}

/** Shared by the Lines view's Lines ▾ and the side panel's Presets ▾. */
export const useLinePickStore = create<LinePickState>((set) => ({
  pick: null,
  setPick: (pick) => set({ pick }),
}))

// Dev only: LinesView renders, so the harness can check it does not re-render on every sequencer step
let linesViewRenders = 0
export const noteLinesViewRender = (): void => { linesViewRenders++ }
export const getLinesViewRenders = (): number => linesViewRenders
