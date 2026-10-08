// The line editing tools (Draw, Steps, Curve, Erase), shared by the warp's toolbar and the Line tracks' toolbar.
import type { WarpTool } from './LinePlot'

export const LINE_TOOLS: { id: WarpTool; name: string; status: string }[] = [
  { id: 'draw', name: 'Draw', status: 'Draw: click to add a point, drag to paint points, drag a point to move it. Hold Shift to paint steps, Alt snaps the height' },
  { id: 'steps', name: 'Steps', status: 'Steps: drag to paint a staircase on the quantize grid (repeats). Shift while drawing does the same' },
  { id: 'curve', name: 'Curve', status: 'Curve: drag up or down over a segment to bend it' },
  { id: 'erase', name: 'Erase', status: 'Erase: drag over points to remove them' },
]
