import { create } from 'zustand'

export type PolygonSides = 3 | 4 | 5 | 6 | 8

export interface RicochetState {
  // Core parameters
  enabled: boolean
  sides: PolygonSides
  gravity: number        // 0-1, affects downward pull
  bounciness: number     // 0-1, energy retained on bounce
  friction: number       // 0-1, velocity decay over time
  decay: number          // 0-1, output decay rate

  // Ball state
  ballX: number          // -1 to 1, center is 0
  ballY: number          // -1 to 1, center is 0
  velocityX: number
  velocityY: number

  // Output
  currentValue: number   // 0-1, decays after hit
  lastHitEdge: number    // Which edge was last hit (0-indexed)

  // Timing
  syncMode: 'sync' | 'free'
  freeSpeed: number      // Multiplier for free mode

  // Actions
  setEnabled: (enabled: boolean) => void
  setSides: (sides: PolygonSides) => void
  setGravity: (gravity: number) => void
  setBounciness: (bounciness: number) => void
  setFriction: (friction: number) => void
  setDecay: (decay: number) => void
  setSyncMode: (mode: 'sync' | 'free') => void
  setFreeSpeed: (speed: number) => void

  // Physics updates (called by engine)
  updateBall: (x: number, y: number, vx: number, vy: number) => void
  triggerHit: (edge: number) => void
  decayOutput: (amount: number) => void
  resetBall: () => void
}

// Get random initial velocity
function getRandomVelocity(): { vx: number; vy: number } {
  const angle = Math.random() * Math.PI * 2
  const speed = 0.02 + Math.random() * 0.02
  return {
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
  }
}

export const useRicochetStore = create<RicochetState>((set) => {
  const initial = getRandomVelocity()

  return {
    enabled: true, // Always enabled - this is a modulation source, not an effect
    sides: 6,
    gravity: 0.3,
    bounciness: 0.8,
    friction: 0.02,
    decay: 0.5,

    ballX: 0,
    ballY: 0,
    velocityX: initial.vx,
    velocityY: initial.vy,

    currentValue: 0,
    lastHitEdge: -1,

    syncMode: 'free',
    freeSpeed: 1,

    setEnabled: (enabled) => set({ enabled }),
    setSides: (sides) => set({ sides }),
    setGravity: (gravity) => set({ gravity: Math.max(0, Math.min(1, gravity)) }),
    setBounciness: (bounciness) => set({ bounciness: Math.max(0, Math.min(1, bounciness)) }),
    setFriction: (friction) => set({ friction: Math.max(0, Math.min(1, friction)) }),
    setDecay: (decay) => set({ decay: Math.max(0, Math.min(1, decay)) }),
    setSyncMode: (mode) => set({ syncMode: mode }),
    setFreeSpeed: (speed) => set({ freeSpeed: Math.max(0.1, Math.min(3, speed)) }),

    updateBall: (x, y, vx, vy) => set({ ballX: x, ballY: y, velocityX: vx, velocityY: vy }),

    triggerHit: (edge) => set({ currentValue: 1, lastHitEdge: edge }),

    decayOutput: (amount) => set((state) => ({
      currentValue: Math.max(0, state.currentValue - amount),
    })),

    resetBall: () => {
      const v = getRandomVelocity()
      set({
        ballX: 0,
        ballY: 0,
        velocityX: v.vx,
        velocityY: v.vy,
        currentValue: 0,
        lastHitEdge: -1,
      })
    },
  }
})
