export interface EmotionScores {
  neutral: number
  happiness: number
  surprise: number
  anger: number
  sadness: number
}

interface Point {
  x: number
  y: number
  z?: number
}

function distance(a: Point, b: Point): number {
  const dx = a.x - b.x
  const dy = a.y - b.y
  return Math.sqrt(dx * dx + dy * dy)
}

/**
 * Derive approximate emotion scores from MediaPipe Face Mesh 468 landmarks.
 * Uses geometric heuristics — not accurate, but reactive and convincing.
 *
 * Key landmark indices (MediaPipe Face Mesh):
 * - 13, 14: upper/lower lip (mouth openness)
 * - 61, 291: left/right mouth corners
 * - 159, 145: left eye upper/lower lid
 * - 386, 374: right eye upper/lower lid
 * - 70, 63: left brow inner/outer
 * - 300, 293: right brow inner/outer
 * - 10: forehead top
 * - 152: chin bottom
 */
export function deriveEmotions(landmarks: Point[]): EmotionScores {
  if (landmarks.length < 468) {
    return { neutral: 1, happiness: 0, surprise: 0, anger: 0, sadness: 0 }
  }

  const faceHeight = distance(landmarks[10], landmarks[152])
  if (faceHeight < 0.001) {
    return { neutral: 1, happiness: 0, surprise: 0, anger: 0, sadness: 0 }
  }

  const mouthOpen = distance(landmarks[13], landmarks[14]) / faceHeight
  const mouthWidth = distance(landmarks[61], landmarks[291]) / faceHeight
  const leftEyeOpen = distance(landmarks[159], landmarks[145]) / faceHeight
  const rightEyeOpen = distance(landmarks[386], landmarks[374]) / faceHeight
  const eyeOpen = (leftEyeOpen + rightEyeOpen) / 2
  const leftBrowHeight = distance(landmarks[70], landmarks[159]) / faceHeight
  const rightBrowHeight = distance(landmarks[300], landmarks[386]) / faceHeight
  const browHeight = (leftBrowHeight + rightBrowHeight) / 2

  const happiness = Math.min(1, Math.max(0, (mouthWidth - 0.25) * 4 + mouthOpen * 3))
  const surprise = Math.min(1, Math.max(0, (eyeOpen - 0.04) * 15 + (mouthOpen - 0.03) * 10))
  const anger = Math.min(1, Math.max(0, (0.06 - browHeight) * 20))
  const sadness = Math.min(1, Math.max(0, (0.22 - mouthWidth) * 5 + (0.035 - eyeOpen) * 10))

  const emotionSum = happiness + surprise + anger + sadness
  const neutral = Math.max(0, 1 - emotionSum)
  const total = neutral + happiness + surprise + anger + sadness

  return {
    neutral: neutral / total,
    happiness: happiness / total,
    surprise: surprise / total,
    anger: anger / total,
    sadness: sadness / total,
  }
}
