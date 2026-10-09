// The line editing tools (Draw, Steps, Curve, Erase), shared by the warp's toolbar and the Line tracks' toolbar.
import type { WarpTool } from './LinePlot'

export const LINE_TOOLS: { id: WarpTool; name: string; status: string }[] = [
  { id: 'draw', name: 'Draw', status: 'Click or double-click to add a point, drag to move, double-click a point to delete. Shift paints steps, Alt snaps to the grid, Alt-drag a curve handle moves every curve.' },
  { id: 'steps', name: 'Steps', status: 'Steps: drag to paint a staircase on the quantize grid (repeats). Shift while drawing does the same' },
  { id: 'curve', name: 'Curve', status: 'Curve: drag up or down over a segment to bend it' },
  { id: 'erase', name: 'Erase', status: 'Erase: drag over points to remove them' },
]
