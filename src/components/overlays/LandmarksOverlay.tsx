import { useRef, useEffect } from 'react'
import { useLandmarksStore } from '../../stores/landmarksStore'

interface Props {
  width: number
  height: number
}

// Target frame rate
const TARGET_FPS = 30
const FRAME_INTERVAL = 1000 / TARGET_FPS

export function LandmarksOverlay({ width, height }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const frameIdRef = useRef<number>(0)
  const lastFrameTimeRef = useRef<number>(0)
  const isRunningRef = useRef<boolean>(false)

  // Store refs for animation loop
  const storeRef = useRef(useLandmarksStore.getState())
  const sizeRef = useRef({ width, height })

  // Sync refs
  const { enabled, currentMode } = useLandmarksStore()
  storeRef.current = useLandmarksStore.getState()
  sizeRef.current = { width, height }

  const isActive = enabled && currentMode !== 'off'

  // Animation loop
  useEffect(() => {
    if (!isActive) {
      isRunningRef.current = false
      return
    }

    isRunningRef.current = true

    const animate = (timestamp: number) => {
      if (!isRunningRef.current) return

      const elapsed = timestamp - lastFrameTimeRef.current
      if (elapsed < FRAME_INTERVAL) {
        frameIdRef.current = requestAnimationFrame(animate)
        return
      }
      lastFrameTimeRef.current = timestamp

      const canvas = canvasRef.current
      const ctx = canvas?.getContext('2d')
      if (!canvas || !ctx) {
        frameIdRef.current = requestAnimationFrame(animate)
        return
      }

      const currentStore = storeRef.current
      const { width: w, height: h } = sizeRef.current

      ctx.clearRect(0, 0, w, h)

      // Draw face landmarks
      if (currentStore.currentMode === 'face' || currentStore.currentMode === 'holistic') {
        for (const face of currentStore.faces) {
          // Draw face mesh points
          ctx.fillStyle = 'rgba(100, 200, 255, 0.8)'
          for (const landmark of face.points) {
            const x = landmark.point.x * w
            const y = landmark.point.y * h
            ctx.beginPath()
            ctx.arc(x, y, 1.5, 0, Math.PI * 2)
            ctx.fill()
          }

          // Draw face bounding box
          ctx.strokeStyle = 'rgba(100, 200, 255, 0.8)'
          ctx.lineWidth = 1.5
          ctx.strokeRect(
            face.boundingBox.x * w,
            face.boundingBox.y * h,
            face.boundingBox.width * w,
            face.boundingBox.height * h
          )

          // Draw key facial feature connections
          drawFaceConnections(ctx, face.points, w, h)
        }
      }

      // Draw hand landmarks
      if (currentStore.currentMode === 'hands' || currentStore.currentMode === 'holistic') {
        for (const hand of currentStore.hands) {
          const color = hand.handedness === 'Left' ? 'rgba(255, 150, 100, 0.9)' : 'rgba(100, 255, 150, 0.9)'

          // Draw hand points
          ctx.fillStyle = color
          for (const landmark of hand.points) {
            const x = landmark.point.x * w
            const y = landmark.point.y * h
            ctx.beginPath()
            ctx.arc(x, y, 3, 0, Math.PI * 2)
            ctx.fill()
          }

          // Draw hand skeleton connections
          drawHandConnections(ctx, hand.points, w, h, color)
        }
      }

      // Draw pose landmarks
      if (currentStore.currentMode === 'pose' || currentStore.currentMode === 'holistic') {
        for (const pose of currentStore.poses) {
          // Draw pose points
          ctx.fillStyle = 'rgba(255, 200, 100, 0.9)'
          for (const landmark of pose.points) {
            if (landmark.visibility && landmark.visibility < 0.5) continue
            const x = landmark.point.x * w
            const y = landmark.point.y * h
            ctx.beginPath()
            ctx.arc(x, y, 4, 0, Math.PI * 2)
            ctx.fill()
          }

          // Draw pose skeleton connections
          drawPoseConnections(ctx, pose.points, w, h)
        }
      }

      frameIdRef.current = requestAnimationFrame(animate)
    }

    frameIdRef.current = requestAnimationFrame(animate)

    return () => {
      isRunningRef.current = false
      cancelAnimationFrame(frameIdRef.current)
    }
  }, [isActive])

  if (!isActive) return null

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className="absolute inset-0 pointer-events-none"
      style={{ zIndex: 10 }}
    />
  )
}

// Draw connections between face landmarks (eyes, nose, mouth outline)
function drawFaceConnections(
  ctx: CanvasRenderingContext2D,
  points: { point: { x: number; y: number } }[],
  w: number,
  h: number
) {
  ctx.strokeStyle = 'rgba(100, 200, 255, 0.5)'
  ctx.lineWidth = 1

  // Simplified face mesh connections - just outline key features
  // Left eye: points 33, 133, 157, 158, 159, 160, 161, 163 (approximate)
  // Right eye: points 362, 263, 386, 387, 388, 389, 390, 398 (approximate)
  // Lips outer: points 61, 146, 91, 181, 84, 17, 314, 405, 321, 375, 291 (approximate)

  const eyeIndices = [
    [33, 133, 160, 159, 158, 157, 173, 33], // Left eye
    [362, 263, 387, 386, 385, 384, 398, 362], // Right eye
  ]

  const lipIndices = [61, 146, 91, 181, 84, 17, 314, 405, 321, 375, 291, 61]

  // Draw eye outlines
  for (const indices of eyeIndices) {
    ctx.beginPath()
    for (let i = 0; i < indices.length; i++) {
      const idx = indices[i]
      if (idx >= points.length) continue
      const p = points[idx].point
      if (i === 0) {
        ctx.moveTo(p.x * w, p.y * h)
      } else {
        ctx.lineTo(p.x * w, p.y * h)
      }
    }
    ctx.stroke()
  }

  // Draw lip outline
  ctx.beginPath()
  for (let i = 0; i < lipIndices.length; i++) {
    const idx = lipIndices[i]
    if (idx >= points.length) continue
    const p = points[idx].point
    if (i === 0) {
      ctx.moveTo(p.x * w, p.y * h)
    } else {
      ctx.lineTo(p.x * w, p.y * h)
    }
  }
  ctx.stroke()
}

// Draw hand skeleton connections
function drawHandConnections(
  ctx: CanvasRenderingContext2D,
  points: { point: { x: number; y: number } }[],
  w: number,
  h: number,
  color: string
) {
  ctx.strokeStyle = color
  ctx.lineWidth = 2

  // Hand connections (MediaPipe 21 landmarks)
  const connections = [
    [0, 1], [1, 2], [2, 3], [3, 4], // Thumb
    [0, 5], [5, 6], [6, 7], [7, 8], // Index
    [0, 9], [9, 10], [10, 11], [11, 12], // Middle
    [0, 13], [13, 14], [14, 15], [15, 16], // Ring
    [0, 17], [17, 18], [18, 19], [19, 20], // Pinky
    [5, 9], [9, 13], [13, 17], // Palm
  ]

  for (const [a, b] of connections) {
    if (a >= points.length || b >= points.length) continue
    const pa = points[a].point
    const pb = points[b].point
    ctx.beginPath()
    ctx.moveTo(pa.x * w, pa.y * h)
    ctx.lineTo(pb.x * w, pb.y * h)
    ctx.stroke()
  }
}

// Draw pose skeleton connections
function drawPoseConnections(
  ctx: CanvasRenderingContext2D,
  points: { point: { x: number; y: number }; visibility?: number }[],
  w: number,
  h: number
) {
  ctx.strokeStyle = 'rgba(255, 200, 100, 0.7)'
  ctx.lineWidth = 2

  // Pose connections (MediaPipe 33 landmarks)
  const connections = [
    // Face
    [0, 1], [1, 2], [2, 3], [3, 7],
    [0, 4], [4, 5], [5, 6], [6, 8],
    [9, 10],
    // Torso
    [11, 12], [11, 23], [12, 24], [23, 24],
    // Arms
    [11, 13], [13, 15], [15, 17], [15, 19], [15, 21], [17, 19],
    [12, 14], [14, 16], [16, 18], [16, 20], [16, 22], [18, 20],
    // Legs
    [23, 25], [25, 27], [27, 29], [27, 31], [29, 31],
    [24, 26], [26, 28], [28, 30], [28, 32], [30, 32],
  ]

  for (const [a, b] of connections) {
    if (a >= points.length || b >= points.length) continue
    const pa = points[a]
    const pb = points[b]
    // Skip low visibility connections
    if ((pa.visibility && pa.visibility < 0.5) || (pb.visibility && pb.visibility < 0.5)) continue

    ctx.beginPath()
    ctx.moveTo(pa.point.x * w, pa.point.y * h)
    ctx.lineTo(pb.point.x * w, pb.point.y * h)
    ctx.stroke()
  }
}
