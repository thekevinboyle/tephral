/**
 * Sample frames down to target count, evenly distributed
 */
export function sampleFrames(frames: ImageData[], maxFrames: number): ImageData[] {
  if (frames.length <= maxFrames) {
    return [...frames]
  }

  const sampled: ImageData[] = []
  const step = frames.length / maxFrames

  for (let i = 0; i < maxFrames; i++) {
    const index = Math.floor(i * step)
    sampled.push(frames[index])
  }

  return sampled
}

export const MAX_FRAMES_PER_CLIP = 150
