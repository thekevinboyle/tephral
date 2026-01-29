/**
 * chiralPathEffect.ts
 * Particles flowing along motion/edge vectors
 * Creates the chiral network path visual from Death Stranding
 */

import type { ChiralPathParams } from '../../../stores/strandStore'

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  trail: { x: number; y: number }[]
  life: number
}

let particles: Particle[] = []
let prevImageData: ImageData | null = null

export function renderChiralPath(
  sourceCtx: CanvasRenderingContext2D,
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  params: ChiralPathParams,
  deltaTime: number
): void {
  const { particleCount, trailLength, flowSpeed } = params

  // Get current frame
  const currentData = sourceCtx.getImageData(0, 0, width, height)

  // Initialize or adjust particle count
  while (particles.length < particleCount) {
    particles.push(createParticle(width, height))
  }
  while (particles.length > particleCount) {
    particles.pop()
  }

  // Calculate motion field if we have previous frame
  if (prevImageData && prevImageData.width === width && prevImageData.height === height) {
    const curr = currentData.data
    const prev = prevImageData.data

    // Update particles based on local motion
    for (const particle of particles) {
      // Sample motion at particle location
      const px = Math.floor(particle.x)
      const py = Math.floor(particle.y)

      if (px >= 1 && px < width - 1 && py >= 1 && py < height - 1) {
        // Calculate local motion by comparing brightness changes
        let motionX = 0
        let motionY = 0

        // Sample in a small neighborhood
        for (let dy = -2; dy <= 2; dy++) {
          for (let dx = -2; dx <= 2; dx++) {
            const sx = px + dx
            const sy = py + dy
            const i = (sy * width + sx) * 4

            const currBright = (curr[i] + curr[i + 1] + curr[i + 2]) / 3
            const prevBright = (prev[i] + prev[i + 1] + prev[i + 2]) / 3
            const diff = currBright - prevBright

            motionX += dx * diff * 0.01
            motionY += dy * diff * 0.01
          }
        }

        // Apply motion with flow speed
        particle.vx = particle.vx * 0.9 + motionX * flowSpeed
        particle.vy = particle.vy * 0.9 + motionY * flowSpeed

        // Add slight drift toward center if no motion
        const mag = Math.hypot(particle.vx, particle.vy)
        if (mag < 0.5) {
          particle.vx += (width / 2 - particle.x) * 0.001
          particle.vy += (height / 2 - particle.y) * 0.001
        }
      }

      // Update position
      particle.x += particle.vx * deltaTime * 60
      particle.y += particle.vy * deltaTime * 60

      // Add to trail
      particle.trail.unshift({ x: particle.x, y: particle.y })
      if (particle.trail.length > trailLength) {
        particle.trail.pop()
      }

      // Reset if out of bounds
      if (particle.x < 0 || particle.x >= width || particle.y < 0 || particle.y >= height) {
        Object.assign(particle, createParticle(width, height))
      }

      particle.life -= deltaTime
      if (particle.life <= 0) {
        Object.assign(particle, createParticle(width, height))
      }
    }
  }

  // Store current frame for next comparison
  prevImageData = currentData

  // Render particles and trails
  ctx.save()
  ctx.globalCompositeOperation = 'screen'

  for (const particle of particles) {
    if (particle.trail.length < 2) continue

    // Draw trail as gradient line
    ctx.beginPath()
    ctx.moveTo(particle.trail[0].x, particle.trail[0].y)

    for (let i = 1; i < particle.trail.length; i++) {
      ctx.lineTo(particle.trail[i].x, particle.trail[i].y)
    }

    const gradient = ctx.createLinearGradient(
      particle.trail[0].x, particle.trail[0].y,
      particle.trail[particle.trail.length - 1].x, particle.trail[particle.trail.length - 1].y
    )
    gradient.addColorStop(0, 'rgba(0, 212, 255, 0.8)')
    gradient.addColorStop(1, 'rgba(0, 212, 255, 0)')

    ctx.strokeStyle = gradient
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.stroke()
  }

  ctx.restore()
}

function createParticle(width: number, height: number): Particle {
  return {
    x: Math.random() * width,
    y: Math.random() * height,
    vx: (Math.random() - 0.5) * 2,
    vy: (Math.random() - 0.5) * 2,
    trail: [],
    life: 3 + Math.random() * 5
  }
}

export function resetChiralPath(): void {
  particles = []
  prevImageData = null
}
