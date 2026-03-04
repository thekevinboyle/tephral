// Bjorklund's algorithm for euclidean rhythm distribution
export function bjorklund(hits: number, steps: number): boolean[] {
  if (hits >= steps) return Array(steps).fill(true)
  if (hits <= 0) return Array(steps).fill(false)

  let pattern: number[][] = []
  let remainder: number[][] = []

  for (let i = 0; i < steps; i++) {
    if (i < hits) {
      pattern.push([1])
    } else {
      remainder.push([0])
    }
  }

  while (remainder.length > 1) {
    const newPattern: number[][] = []
    const minLen = Math.min(pattern.length, remainder.length)

    for (let i = 0; i < minLen; i++) {
      newPattern.push([...pattern[i], ...remainder[i]])
    }

    const leftoverPattern = pattern.slice(minLen)
    const leftoverRemainder = remainder.slice(minLen)

    pattern = newPattern
    remainder = leftoverPattern.length > 0 ? leftoverPattern : leftoverRemainder
  }

  const result = [...pattern, ...remainder].flat()
  return result.map(v => v === 1)
}

// Rotate pattern by offset
export function rotatePattern(pattern: boolean[], offset: number): boolean[] {
  if (offset === 0 || pattern.length === 0) return pattern
  const normalizedOffset = ((offset % pattern.length) + pattern.length) % pattern.length
  return [...pattern.slice(normalizedOffset), ...pattern.slice(0, normalizedOffset)]
}

// Generate a euclidean pattern with rotation applied
export function bjorklundPattern(hits: number, steps: number, rotation: number): boolean[] {
  return rotatePattern(bjorklund(hits, steps), rotation)
}
