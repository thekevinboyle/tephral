import { create } from 'zustand'
import type { WarpTool } from '../performance/lines/LinePlot'
import type { WarpPoint } from '../../effects/warp/warpMath'

interface LineEditState {
  tool: WarpTool
  selected: number | null
  setTool: (t: WarpTool) => void
  setSelected: (i: number | null) => void
}

/** The lane editor's tool and selected point. One lane (the selected track's) is edited at a time. */
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
