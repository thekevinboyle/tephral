import { sampleLine, type WarpPoint } from '../../../effects/warp/warpMath'

const EPS = 1e-9

/** SVG path `d` for the line through `points` (bent segments sampled in 24 steps), mapped by X and Y. */
export function linePath(points: WarpPoint[], X: (x: number) => number, Y: (y: number) => number): string {
  let d = ''
  points.forEach((p, i) => {
    if (i === 0) { d = `M${X(p.x).toFixed(1)} ${Y(p.y).toFixed(1)}`; return }
    const a = points[i - 1]
    if (p.bend && p.x - a.x > EPS) {
      for (let k = 1; k <= 24; k++) {
        const x = a.x + ((p.x - a.x) * k) / 24
        const y = k === 24 ? p.y : sampleLine([a, p], x)
        d += ` L${X(x).toFixed(1)} ${Y(y).toFixed(1)}`
      }
    } else d += ` L${X(p.x).toFixed(1)} ${Y(p.y).toFixed(1)}`
  })
  return d
}
