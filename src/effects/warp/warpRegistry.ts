// The editor's way to the video warp compositor (thumbnails), without threading it through the layout.
// Canvas sets it when it creates the compositor and clears it on unmount.
import type { WarpCompositor } from './WarpCompositor'

let active: WarpCompositor | null = null

export function setActiveWarpCompositor(c: WarpCompositor | null): void { active = c }
export function getActiveWarpCompositor(): WarpCompositor | null { return active }
