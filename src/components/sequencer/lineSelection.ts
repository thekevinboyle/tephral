import { create } from 'zustand'
import type { WarpTool } from '../performance/lines/LinePlot'

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
