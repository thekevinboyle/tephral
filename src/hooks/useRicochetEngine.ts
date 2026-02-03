import { useEffect, useRef } from 'react'
import { useRicochetStore } from '../stores/ricochetStore'

/**
 * Get vertices of a regular polygon centered at origin with radius 1
 */
function getPolygonVertices(sides: number): { x: number; y: number }[] {
  const vertices: { x: number; y: number }[] = []
  for (let i = 0; i < sides; i++) {
    // Start from top (-90 degrees) and go clockwise
    const angle = (i / sides) * Math.PI * 2 - Math.PI / 2
    vertices.push({
      x: Math.cos(angle) * 0.85,
      y: Math.sin(angle) * 0.85,
    })
  }
  return vertices
}

/**
 * Check if a point is inside a polygon using ray casting
 */
function isPointInPolygon(px: number, py: number, vertices: { x: number; y: number }[]): boolean {
  let inside = false
  const n = vertices.length
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = vertices[i].x, yi = vertices[i].y
    const xj = vertices[j].x, yj = vertices[j].y
    if (((yi > py) !== (yj > py)) && (px < (xj - xi) * (py - yi) / (yj - yi) + xi)) {
      inside = !inside
    }
  }
  return inside
}

/**
 * Find the closest edge and reflect velocity
 */
function findCollisionAndReflect(
  px: number,
  py: number,
  vx: number,
  vy: number,
  vertices: { x: number; y: number }[],
  bounciness: number
): { x: number; y: number; vx: number; vy: number; edge: number } | null {
  const n = vertices.length
  let closestDist = Infinity
  let closestEdge = -1
  let closestNormal = { x: 0, y: 0 }
  let closestPoint = { x: px, y: py }

  for (let i = 0; i < n; i++) {
    const v1 = vertices[i]
    const v2 = vertices[(i + 1) % n]

    // Edge vector
    const ex = v2.x - v1.x
    const ey = v2.y - v1.y
    const edgeLen = Math.sqrt(ex * ex + ey * ey)

    // Normal (pointing inward)
    const nx = -ey / edgeLen
    const ny = ex / edgeLen

    // Distance from point to line
    const dx = px - v1.x
    const dy = py - v1.y
    const dist = dx * nx + dy * ny

    // Check if point is past this edge (negative distance means outside)
    if (dist < closestDist) {
      // Project point onto edge to check if it's within edge bounds
      const t = (dx * ex + dy * ey) / (edgeLen * edgeLen)
      if (t >= 0 && t <= 1) {
        closestDist = dist
        closestEdge = i
        closestNormal = { x: nx, y: ny }
        // Point on edge closest to ball
        closestPoint = {
          x: v1.x + t * ex,
          y: v1.y + t * ey,
        }
      }
    }
  }

  // If ball is outside (negative distance to any edge)
  if (closestDist < 0.02) {
    // Reflect velocity around normal
    const dot = vx * closestNormal.x + vy * closestNormal.y
    const newVx = (vx - 2 * dot * closestNormal.x) * bounciness
    const newVy = (vy - 2 * dot * closestNormal.y) * bounciness

    // Push ball back inside
    const pushX = closestPoint.x + closestNormal.x * 0.03
    const pushY = closestPoint.y + closestNormal.y * 0.03

    return {
      x: pushX,
      y: pushY,
      vx: newVx,
      vy: newVy,
      edge: closestEdge,
    }
  }

  return null
}

export function useRicochetEngine() {
  const store = useRicochetStore()
  const animationRef = useRef<number | null>(null)
  const lastTimeRef = useRef<number>(0)

  useEffect(() => {
    if (!store.enabled) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
        animationRef.current = null
      }
      return
    }

    const loop = (timestamp: number) => {
      const deltaTime = lastTimeRef.current ? (timestamp - lastTimeRef.current) / 1000 : 0.016
      lastTimeRef.current = timestamp

      const {
        sides,
        gravity,
        bounciness,
        friction,
        decay,
        ballX,
        ballY,
        velocityX,
        velocityY,
        freeSpeed,
        updateBall,
        triggerHit,
        decayOutput,
      } = useRicochetStore.getState()

      // Get polygon vertices
      const vertices = getPolygonVertices(sides)

      // Apply physics
      let vx = velocityX
      let vy = velocityY

      // Apply gravity (downward)
      vy += gravity * 0.001 * freeSpeed

      // Apply friction
      const frictionFactor = 1 - friction * deltaTime * 2
      vx *= frictionFactor
      vy *= frictionFactor

      // Update position
      let x = ballX + vx * freeSpeed
      let y = ballY + vy * freeSpeed

      // Check collision with edges
      const collision = findCollisionAndReflect(x, y, vx, vy, vertices, bounciness)
      if (collision) {
        x = collision.x
        y = collision.y
        vx = collision.vx
        vy = collision.vy
        triggerHit(collision.edge)
      }

      // Keep ball inside bounds (safety check)
      if (!isPointInPolygon(x, y, vertices)) {
        // Reset if somehow escaped
        x = 0
        y = 0
        const angle = Math.random() * Math.PI * 2
        const speed = 0.02
        vx = Math.cos(angle) * speed
        vy = Math.sin(angle) * speed
      }

      // Minimum velocity to keep things interesting
      const speed = Math.sqrt(vx * vx + vy * vy)
      if (speed < 0.005) {
        const boost = 0.01 / speed
        vx *= boost
        vy *= boost
      }

      updateBall(x, y, vx, vy)

      // Decay output
      decayOutput(decay * deltaTime * 3)

      animationRef.current = requestAnimationFrame(loop)
    }

    animationRef.current = requestAnimationFrame(loop)

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [store.enabled])
}
