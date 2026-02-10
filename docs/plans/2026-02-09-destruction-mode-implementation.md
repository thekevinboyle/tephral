# Destruction Mode Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a hidden chaos mode activated by ↓↓ Shift+D+M that stacks extreme effects, adds datamosh shader, and blacks out the UI with glitch overlays.

**Architecture:** Zustand store tracks active state. Key detection hook listens globally. Chaos hook force-enables effects and runs random modulation. Overlay component covers UI with glitch animation. DatamoshEffect shader simulates I-frame corruption. Screenshot captured to clip bin on exit.

**Tech Stack:** React, Zustand, Three.js, postprocessing library, GLSL shaders

---

### Task 1: Create Destruction Mode Store

**Files:**
- Create: `src/stores/destructionModeStore.ts`

**Step 1: Create the store**

```typescript
import { create } from 'zustand'

interface DestructionModeState {
  active: boolean
  escapeHeldStart: number | null

  activate: () => void
  deactivate: () => void
  setEscapeHeldStart: (time: number | null) => void
}

export const useDestructionModeStore = create<DestructionModeState>((set) => ({
  active: false,
  escapeHeldStart: null,

  activate: () => set({ active: true }),
  deactivate: () => set({ active: false, escapeHeldStart: null }),
  setEscapeHeldStart: (time) => set({ escapeHeldStart: time }),
}))
```

**Step 2: Verify no TypeScript errors**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add src/stores/destructionModeStore.ts
git commit -m "feat(destruction): add destruction mode store"
```

---

### Task 2: Create Key Detection Hook

**Files:**
- Create: `src/hooks/useDestructionMode.ts`

**Step 1: Create the hook with key combo detection**

```typescript
import { useEffect, useRef, useCallback } from 'react'
import { useDestructionModeStore } from '../stores/destructionModeStore'

const ARROW_SEQUENCE_TIMEOUT = 500
const COMBO_TIMEOUT = 1000
const ESCAPE_HOLD_DURATION = 2000

export function useDestructionMode() {
  const { active, activate, deactivate, escapeHeldStart, setEscapeHeldStart } = useDestructionModeStore()

  const arrowPresses = useRef<number[]>([])
  const awaitingCombo = useRef(false)
  const comboTimeout = useRef<number | null>(null)
  const escapeCheckInterval = useRef<number | null>(null)

  // Check for ↓↓ sequence
  const handleArrowDown = useCallback((timestamp: number) => {
    const now = timestamp
    // Filter out old presses
    arrowPresses.current = arrowPresses.current.filter(t => now - t < ARROW_SEQUENCE_TIMEOUT)
    arrowPresses.current.push(now)

    if (arrowPresses.current.length >= 2) {
      // Two down arrows within timeout - await combo
      awaitingCombo.current = true
      arrowPresses.current = []

      // Reset combo window after timeout
      if (comboTimeout.current) clearTimeout(comboTimeout.current)
      comboTimeout.current = window.setTimeout(() => {
        awaitingCombo.current = false
      }, COMBO_TIMEOUT)
    }
  }, [])

  // Check for Shift+D+M combo
  const checkCombo = useCallback((e: KeyboardEvent) => {
    if (!awaitingCombo.current) return false
    if (e.shiftKey && e.key.toLowerCase() === 'd') {
      // Need to also check M is pressed - use a Set to track
      return true
    }
    return false
  }, [])

  useEffect(() => {
    const pressedKeys = new Set<string>()

    const handleKeyDown = (e: KeyboardEvent) => {
      pressedKeys.add(e.key.toLowerCase())

      // Handle escape hold for exit
      if (active && e.key === 'Escape') {
        if (!escapeHeldStart) {
          setEscapeHeldStart(Date.now())
          // Start checking if held long enough
          escapeCheckInterval.current = window.setInterval(() => {
            const start = useDestructionModeStore.getState().escapeHeldStart
            if (start && Date.now() - start >= ESCAPE_HOLD_DURATION) {
              deactivate()
              if (escapeCheckInterval.current) {
                clearInterval(escapeCheckInterval.current)
                escapeCheckInterval.current = null
              }
            }
          }, 100)
        }
        return
      }

      // Handle activation sequence
      if (!active) {
        if (e.key === 'ArrowDown') {
          handleArrowDown(Date.now())
          return
        }

        // Check for Shift+D+M combo
        if (awaitingCombo.current && e.shiftKey) {
          const hasD = pressedKeys.has('d')
          const hasM = pressedKeys.has('m')
          if (hasD && hasM) {
            awaitingCombo.current = false
            if (comboTimeout.current) {
              clearTimeout(comboTimeout.current)
              comboTimeout.current = null
            }
            activate()
          }
        }
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      pressedKeys.delete(e.key.toLowerCase())

      // Cancel escape hold if released early
      if (e.key === 'Escape' && escapeHeldStart) {
        setEscapeHeldStart(null)
        if (escapeCheckInterval.current) {
          clearInterval(escapeCheckInterval.current)
          escapeCheckInterval.current = null
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
      if (comboTimeout.current) clearTimeout(comboTimeout.current)
      if (escapeCheckInterval.current) clearInterval(escapeCheckInterval.current)
    }
  }, [active, activate, deactivate, escapeHeldStart, setEscapeHeldStart, handleArrowDown])

  return { active }
}
```

**Step 2: Verify no TypeScript errors**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add src/hooks/useDestructionMode.ts
git commit -m "feat(destruction): add key combo detection hook"
```

---

### Task 3: Create DatamoshEffect GPU Shader

**Files:**
- Create: `src/effects/glitch-engine/DatamoshEffect.ts`

**Step 1: Create the datamosh shader**

```typescript
import * as THREE from 'three'
import { Effect, BlendFunction } from 'postprocessing'

const fragmentShader = `
uniform sampler2D previousFrame;
uniform sampler2D motionTexture;
uniform float intensity;
uniform float blockSize;
uniform float keyframeChance;
uniform float time;
uniform bool hasPrevious;
uniform vec2 resolution;

// Pseudo-random
float rand(vec2 co) {
  return fract(sin(dot(co.xy, vec2(12.9898, 78.233))) * 43758.5453);
}

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  if (!hasPrevious) {
    outputColor = inputColor;
    return;
  }

  // Block-based sampling (simulates macroblocks)
  vec2 blockUV = floor(uv * resolution / blockSize) * blockSize / resolution;

  // Fake motion vector - sample offset based on luminance difference
  vec4 prevBlock = texture2D(previousFrame, blockUV);
  vec4 currBlock = texture2D(inputBuffer, blockUV);
  float lumDiff = abs(dot(currBlock.rgb - prevBlock.rgb, vec3(0.299, 0.587, 0.114)));

  // Create chaotic motion vectors
  float angle = rand(blockUV + time) * 6.28318;
  float magnitude = lumDiff * intensity * 0.1;
  vec2 motionOffset = vec2(cos(angle), sin(angle)) * magnitude;

  // Keyframe drop simulation - occasionally reset to current frame
  float dropRand = rand(blockUV + floor(time * 10.0));
  bool isKeyframe = dropRand < keyframeChance;

  // Sample with motion bleeding
  vec2 sampleUV = uv + motionOffset;
  sampleUV = clamp(sampleUV, 0.0, 1.0);

  vec4 moshed;
  if (isKeyframe) {
    moshed = inputColor;
  } else {
    // Blend previous frame with motion offset
    vec4 prev = texture2D(previousFrame, sampleUV);
    moshed = mix(prev, inputColor, 0.1 + rand(uv + time) * 0.2);
  }

  // Add block artifacts
  float blockEdge = step(0.9, fract(uv.x * resolution.x / blockSize)) +
                    step(0.9, fract(uv.y * resolution.y / blockSize));
  moshed.rgb = mix(moshed.rgb, moshed.rgb * 0.8, blockEdge * 0.3 * intensity);

  // Color channel separation for extra corruption
  float separation = intensity * 0.02;
  moshed.r = texture2D(previousFrame, sampleUV + vec2(separation, 0.0)).r * 0.5 + moshed.r * 0.5;
  moshed.b = texture2D(previousFrame, sampleUV - vec2(separation, 0.0)).b * 0.5 + moshed.b * 0.5;

  outputColor = moshed;
}
`

export interface DatamoshParams {
  intensity: number    // 0-1
  blockSize: number    // 4-32
  keyframeChance: number // 0-0.1 (lower = more corruption)
}

export const DEFAULT_DATAMOSH_PARAMS: DatamoshParams = {
  intensity: 0.8,
  blockSize: 16,
  keyframeChance: 0.02,
}

export class DatamoshEffect extends Effect {
  private previousTarget: THREE.WebGLRenderTarget | null = null
  private copyMaterial: THREE.ShaderMaterial | null = null
  private copyScene: THREE.Scene | null = null
  private copyCamera: THREE.OrthographicCamera | null = null
  private time = 0

  constructor(params: Partial<DatamoshParams> = {}) {
    const p = { ...DEFAULT_DATAMOSH_PARAMS, ...params }

    super('DatamoshEffect', fragmentShader, {
      blendFunction: BlendFunction.NORMAL,
      uniforms: new Map<string, THREE.Uniform>([
        ['previousFrame', new THREE.Uniform(null)],
        ['motionTexture', new THREE.Uniform(null)],
        ['intensity', new THREE.Uniform(p.intensity)],
        ['blockSize', new THREE.Uniform(p.blockSize)],
        ['keyframeChance', new THREE.Uniform(p.keyframeChance)],
        ['time', new THREE.Uniform(0)],
        ['hasPrevious', new THREE.Uniform(false)],
        ['resolution', new THREE.Uniform(new THREE.Vector2(1920, 1080))],
      ]),
    })
  }

  initialize(renderer: THREE.WebGLRenderer, alpha: boolean, frameBufferType: number) {
    super.initialize?.(renderer, alpha, frameBufferType)

    const size = renderer.getSize(new THREE.Vector2())

    this.previousTarget = new THREE.WebGLRenderTarget(size.x, size.y, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
    })

    this.copyMaterial = new THREE.ShaderMaterial({
      uniforms: { tDiffuse: { value: null } },
      vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: `uniform sampler2D tDiffuse; varying vec2 vUv; void main() { gl_FragColor = texture2D(tDiffuse, vUv); }`,
    })

    this.copyScene = new THREE.Scene()
    this.copyCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.copyMaterial)
    this.copyScene.add(quad)

    (this.uniforms.get('resolution')!.value as THREE.Vector2).set(size.x, size.y)
  }

  update(_renderer: THREE.WebGLRenderer, _inputBuffer: THREE.WebGLRenderTarget, deltaTime?: number) {
    this.time += deltaTime || 0.016
    this.uniforms.get('time')!.value = this.time

    if (this.previousTarget) {
      this.uniforms.get('previousFrame')!.value = this.previousTarget.texture
      this.uniforms.get('hasPrevious')!.value = true
    }
  }

  captureFrame(renderer: THREE.WebGLRenderer, outputBuffer: THREE.WebGLRenderTarget) {
    if (!this.previousTarget || !this.copyMaterial || !this.copyScene || !this.copyCamera) {
      return
    }

    this.copyMaterial.uniforms.tDiffuse.value = outputBuffer.texture
    renderer.setRenderTarget(this.previousTarget)
    renderer.render(this.copyScene, this.copyCamera)
    renderer.setRenderTarget(null)
  }

  setSize(width: number, height: number) {
    super.setSize?.(width, height)
    this.previousTarget?.setSize(width, height)
    ;(this.uniforms.get('resolution')!.value as THREE.Vector2).set(width, height)
  }

  updateParams(params: Partial<DatamoshParams>) {
    if (params.intensity !== undefined) this.uniforms.get('intensity')!.value = params.intensity
    if (params.blockSize !== undefined) this.uniforms.get('blockSize')!.value = params.blockSize
    if (params.keyframeChance !== undefined) this.uniforms.get('keyframeChance')!.value = params.keyframeChance
  }

  dispose() {
    super.dispose()
    this.previousTarget?.dispose()
    this.copyMaterial?.dispose()
  }
}
```

**Step 2: Add export to glitch-engine index**

Edit `src/effects/glitch-engine/index.ts` - add:
```typescript
export { DatamoshEffect, DEFAULT_DATAMOSH_PARAMS } from './DatamoshEffect'
export type { DatamoshParams } from './DatamoshEffect'
```

**Step 3: Verify no TypeScript errors**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 4: Commit**

```bash
git add src/effects/glitch-engine/DatamoshEffect.ts src/effects/glitch-engine/index.ts
git commit -m "feat(destruction): add datamosh GPU shader"
```

---

### Task 4: Integrate DatamoshEffect into EffectPipeline

**Files:**
- Modify: `src/effects/EffectPipeline.ts`

**Step 1: Import DatamoshEffect**

Add to imports:
```typescript
import { DatamoshEffect } from './glitch-engine'
```

**Step 2: Add datamosh property**

Add after other effect instances (~line 58):
```typescript
datamosh: DatamoshEffect | null = null
```

**Step 3: Initialize in constructor**

Add after other effect initializations (~line 113):
```typescript
this.datamosh = new DatamoshEffect()
```

**Step 4: Add to getEffectById switch**

Add case:
```typescript
case 'datamosh': return this.datamosh
```

**Step 5: Add to updateEffects config type**

Add to config parameter type:
```typescript
datamoshEnabled: boolean
```

**Step 6: Add to enabledMap in updateEffects**

Add:
```typescript
datamosh: config.datamoshEnabled,
```

**Step 7: Add to dispose method**

Add:
```typescript
this.datamosh?.dispose()
```

**Step 8: Add captureFrame call in render method**

After feedbackLoop captureFrame, add:
```typescript
this.datamosh?.captureFrame(renderer, outputBuffer)
```

**Step 9: Verify no TypeScript errors**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 10: Commit**

```bash
git add src/effects/EffectPipeline.ts
git commit -m "feat(destruction): integrate datamosh into effect pipeline"
```

---

### Task 5: Create Destruction Chaos Hook

**Files:**
- Create: `src/hooks/useDestructionChaos.ts`

**Step 1: Create the chaos engine hook**

```typescript
import { useEffect, useRef } from 'react'
import { useDestructionModeStore } from '../stores/destructionModeStore'
import { useGlitchEngineStore, type GlitchSnapshot } from '../stores/glitchEngineStore'

// Chaos parameters - cranked to extreme values
const CHAOS_EFFECTS = {
  rgbSplit: { amount: 50, angle: 0 },
  blockDisplace: { intensity: 0.8, blockSize: 32 },
  feedbackLoop: { decay: 0.95, zoom: 1.02, rotation: 2, hueShift: 15 },
  chromaticAberration: { offset: 20 },
  vhsTracking: { intensity: 0.8, noiseIntensity: 0.5 },
  noise: { intensity: 0.4 },
  staticDisplacement: { intensity: 0.6 },
}

export function useDestructionChaos() {
  const { active } = useDestructionModeStore()
  const glitchStore = useGlitchEngineStore()

  const savedState = useRef<GlitchSnapshot | null>(null)
  const modulationInterval = useRef<number | null>(null)

  useEffect(() => {
    if (active) {
      // Save current state
      savedState.current = {
        rgbSplitEnabled: glitchStore.rgbSplitEnabled,
        rgbSplit: { ...glitchStore.rgbSplit },
        blockDisplaceEnabled: glitchStore.blockDisplaceEnabled,
        blockDisplace: { ...glitchStore.blockDisplace },
        scanLinesEnabled: glitchStore.scanLinesEnabled,
        scanLines: { ...glitchStore.scanLines },
        noiseEnabled: glitchStore.noiseEnabled,
        noise: { ...glitchStore.noise },
        pixelateEnabled: glitchStore.pixelateEnabled,
        pixelate: { ...glitchStore.pixelate },
        edgeDetectionEnabled: glitchStore.edgeDetectionEnabled,
        edgeDetection: { ...glitchStore.edgeDetection },
        chromaticAberrationEnabled: glitchStore.chromaticAberrationEnabled,
        chromaticAberration: { ...glitchStore.chromaticAberration },
        vhsTrackingEnabled: glitchStore.vhsTrackingEnabled,
        vhsTracking: { ...glitchStore.vhsTracking },
        lensDistortionEnabled: glitchStore.lensDistortionEnabled,
        lensDistortion: { ...glitchStore.lensDistortion },
        ditherEnabled: glitchStore.ditherEnabled,
        dither: { ...glitchStore.dither },
        posterizeEnabled: glitchStore.posterizeEnabled,
        posterize: { ...glitchStore.posterize },
        staticDisplacementEnabled: glitchStore.staticDisplacementEnabled,
        staticDisplacement: { ...glitchStore.staticDisplacement },
        colorGradeEnabled: glitchStore.colorGradeEnabled,
        colorGrade: { ...glitchStore.colorGrade },
        feedbackLoopEnabled: glitchStore.feedbackLoopEnabled,
        feedbackLoop: { ...glitchStore.feedbackLoop },
      }

      // Enable chaos effects
      glitchStore.setRgbSplitEnabled(true)
      glitchStore.setRgbSplit(CHAOS_EFFECTS.rgbSplit)
      glitchStore.setBlockDisplaceEnabled(true)
      glitchStore.setBlockDisplace(CHAOS_EFFECTS.blockDisplace)
      glitchStore.setFeedbackLoopEnabled(true)
      glitchStore.setFeedbackLoop(CHAOS_EFFECTS.feedbackLoop)
      glitchStore.setChromaticAberrationEnabled(true)
      glitchStore.setChromaticAberration(CHAOS_EFFECTS.chromaticAberration)
      glitchStore.setVhsTrackingEnabled(true)
      glitchStore.setVhsTracking(CHAOS_EFFECTS.vhsTracking)
      glitchStore.setNoiseEnabled(true)
      glitchStore.setNoise(CHAOS_EFFECTS.noise)
      glitchStore.setStaticDisplacementEnabled(true)
      glitchStore.setStaticDisplacement(CHAOS_EFFECTS.staticDisplacement)

      // Start randomized modulation
      modulationInterval.current = window.setInterval(() => {
        const store = useGlitchEngineStore.getState()

        // Random parameter tweaks
        store.setRgbSplit({
          amount: 30 + Math.random() * 40,
          angle: Math.random() * 360,
        })

        store.setBlockDisplace({
          intensity: 0.5 + Math.random() * 0.5,
          blockSize: 8 + Math.floor(Math.random() * 48),
        })

        store.setFeedbackLoop({
          decay: 0.85 + Math.random() * 0.14,
          zoom: 0.98 + Math.random() * 0.06,
          rotation: -5 + Math.random() * 10,
          hueShift: Math.random() * 30,
          offsetX: -0.02 + Math.random() * 0.04,
          offsetY: -0.02 + Math.random() * 0.04,
        })

        store.setNoise({
          intensity: 0.2 + Math.random() * 0.4,
        })
      }, 100 + Math.random() * 400)

    } else if (savedState.current) {
      // Restore previous state
      const s = savedState.current
      glitchStore.setRgbSplitEnabled(s.rgbSplitEnabled)
      glitchStore.setRgbSplit(s.rgbSplit)
      glitchStore.setBlockDisplaceEnabled(s.blockDisplaceEnabled)
      glitchStore.setBlockDisplace(s.blockDisplace)
      glitchStore.setScanLinesEnabled(s.scanLinesEnabled)
      glitchStore.setScanLines(s.scanLines)
      glitchStore.setNoiseEnabled(s.noiseEnabled)
      glitchStore.setNoise(s.noise)
      glitchStore.setPixelateEnabled(s.pixelateEnabled)
      glitchStore.setPixelate(s.pixelate)
      glitchStore.setEdgeDetectionEnabled(s.edgeDetectionEnabled)
      glitchStore.setEdgeDetection(s.edgeDetection)
      glitchStore.setChromaticAberrationEnabled(s.chromaticAberrationEnabled)
      glitchStore.setChromaticAberration(s.chromaticAberration)
      glitchStore.setVhsTrackingEnabled(s.vhsTrackingEnabled)
      glitchStore.setVhsTracking(s.vhsTracking)
      glitchStore.setLensDistortionEnabled(s.lensDistortionEnabled)
      glitchStore.setLensDistortion(s.lensDistortion)
      glitchStore.setDitherEnabled(s.ditherEnabled)
      glitchStore.setDither(s.dither)
      glitchStore.setPosterizeEnabled(s.posterizeEnabled)
      glitchStore.setPosterize(s.posterize)
      glitchStore.setStaticDisplacementEnabled(s.staticDisplacementEnabled)
      glitchStore.setStaticDisplacement(s.staticDisplacement)
      glitchStore.setColorGradeEnabled(s.colorGradeEnabled)
      glitchStore.setColorGrade(s.colorGrade)
      glitchStore.setFeedbackLoopEnabled(s.feedbackLoopEnabled)
      glitchStore.setFeedbackLoop(s.feedbackLoop)

      savedState.current = null

      // Stop modulation
      if (modulationInterval.current) {
        clearInterval(modulationInterval.current)
        modulationInterval.current = null
      }
    }

    return () => {
      if (modulationInterval.current) {
        clearInterval(modulationInterval.current)
        modulationInterval.current = null
      }
    }
  }, [active, glitchStore])

  return { active }
}
```

**Step 2: Verify no TypeScript errors**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add src/hooks/useDestructionChaos.ts
git commit -m "feat(destruction): add chaos engine hook"
```

---

### Task 6: Create Destruction Overlay Component

**Files:**
- Create: `src/components/DestructionOverlay.tsx`

**Step 1: Create the overlay component**

```typescript
import { useEffect, useRef, useState } from 'react'
import { useDestructionModeStore } from '../stores/destructionModeStore'

const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-=[]{}|;:,.<>?~`░▒▓█▀▄▌▐'
const CHAR_SIZE = 14
const FADE_DURATION = 500

export function DestructionOverlay() {
  const { active } = useDestructionModeStore()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isVisible, setIsVisible] = useState(false)
  const [opacity, setOpacity] = useState(0)
  const animationRef = useRef<number | null>(null)

  // Handle visibility and fade
  useEffect(() => {
    if (active) {
      setIsVisible(true)
      setOpacity(1)
    } else if (isVisible) {
      // Fade out
      const start = Date.now()
      const fadeOut = () => {
        const elapsed = Date.now() - start
        const progress = Math.min(1, elapsed / FADE_DURATION)
        setOpacity(1 - progress)
        if (progress < 1) {
          requestAnimationFrame(fadeOut)
        } else {
          setIsVisible(false)
        }
      }
      fadeOut()
    }
  }, [active, isVisible])

  // Glitch animation
  useEffect(() => {
    if (!isVisible || !canvasRef.current) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    let frame = 0
    const columns = Math.ceil(canvas.width / CHAR_SIZE)
    const rows = Math.ceil(canvas.height / CHAR_SIZE)
    const drops: number[] = new Array(columns).fill(0).map(() => Math.random() * rows)
    const speeds: number[] = new Array(columns).fill(0).map(() => 0.5 + Math.random() * 2)

    const animate = () => {
      frame++

      // Semi-transparent black for trail effect
      ctx.fillStyle = 'rgba(0, 0, 0, 0.1)'
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      ctx.font = `${CHAR_SIZE}px monospace`

      for (let i = 0; i < columns; i++) {
        // Random character
        const char = CHARS[Math.floor(Math.random() * CHARS.length)]

        // Glitch effect - occasionally reverse or stutter
        const glitch = Math.random() < 0.05
        if (glitch) {
          drops[i] = Math.random() * rows
        }

        const x = i * CHAR_SIZE
        const y = drops[i] * CHAR_SIZE

        // Color variation
        const hue = (frame + i * 10) % 360
        const brightness = 40 + Math.random() * 20
        ctx.fillStyle = `hsla(${hue}, 70%, ${brightness}%, 0.8)`

        ctx.fillText(char, x, y)

        // Move drop
        drops[i] += speeds[i]

        // Reset with random chance
        if (drops[i] > rows && Math.random() > 0.98) {
          drops[i] = 0
          speeds[i] = 0.5 + Math.random() * 2
        }
      }

      // Horizontal tear lines
      if (Math.random() < 0.1) {
        const tearY = Math.random() * canvas.height
        const tearHeight = 2 + Math.random() * 10
        ctx.fillStyle = `rgba(255, 255, 255, ${0.1 + Math.random() * 0.2})`
        ctx.fillRect(0, tearY, canvas.width, tearHeight)
      }

      // Static bursts
      if (Math.random() < 0.03) {
        const burstX = Math.random() * canvas.width
        const burstY = Math.random() * canvas.height
        const burstSize = 50 + Math.random() * 150
        const imageData = ctx.createImageData(burstSize, burstSize)
        for (let j = 0; j < imageData.data.length; j += 4) {
          const noise = Math.random() * 255
          imageData.data[j] = noise
          imageData.data[j + 1] = noise
          imageData.data[j + 2] = noise
          imageData.data[j + 3] = 100 + Math.random() * 50
        }
        ctx.putImageData(imageData, burstX, burstY)
      }

      animationRef.current = requestAnimationFrame(animate)
    }

    animate()

    return () => {
      window.removeEventListener('resize', resize)
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [isVisible])

  if (!isVisible) return null

  return (
    <div
      className="fixed inset-0 pointer-events-none"
      style={{
        zIndex: 9999,
        opacity,
        transition: active ? 'none' : `opacity ${FADE_DURATION}ms ease-out`,
      }}
    >
      {/* Dim layer */}
      <div
        className="absolute inset-0"
        style={{
          backgroundColor: 'rgba(0, 0, 0, 0.9)',
          // Cut out the canvas area - assumes canvas is centered
          // This will be refined based on actual canvas position
        }}
      />
      {/* Glitch overlay */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0"
        style={{
          opacity: 0.25,
          mixBlendMode: 'screen',
        }}
      />
    </div>
  )
}
```

**Step 2: Verify no TypeScript errors**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add src/components/DestructionOverlay.tsx
git commit -m "feat(destruction): add UI takeover overlay component"
```

---

### Task 7: Wire Up in PerformanceLayout

**Files:**
- Modify: `src/components/performance/PerformanceLayout.tsx`
- Modify: `src/components/Canvas.tsx`

**Step 1: Add imports to PerformanceLayout**

Add:
```typescript
import { useDestructionMode } from '../../hooks/useDestructionMode'
import { useDestructionChaos } from '../../hooks/useDestructionChaos'
import { DestructionOverlay } from '../DestructionOverlay'
```

**Step 2: Initialize hooks in PerformanceLayout**

Add after other hook calls:
```typescript
// Initialize destruction mode (hidden feature)
useDestructionMode()
useDestructionChaos()
```

**Step 3: Add DestructionOverlay to render**

Add at the end of the return, before the closing fragment/div:
```typescript
<DestructionOverlay />
```

**Step 4: Update Canvas.tsx to pass datamoshEnabled**

In Canvas.tsx, add to the updateEffects call:
```typescript
datamoshEnabled: useDestructionModeStore.getState().active,
```

And import:
```typescript
import { useDestructionModeStore } from '../stores/destructionModeStore'
```

**Step 5: Verify no TypeScript errors**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 6: Commit**

```bash
git add src/components/performance/PerformanceLayout.tsx src/components/Canvas.tsx
git commit -m "feat(destruction): wire up destruction mode in layout"
```

---

### Task 8: Add Screenshot Capture on Exit

**Files:**
- Modify: `src/hooks/useDestructionMode.ts`
- Modify: `src/stores/clipStore.ts`

**Step 1: Add captureDestructionFrame function to clipStore**

Add to clipStore.ts:
```typescript
// Add to interface
captureDestructionFrame: (canvas: HTMLCanvasElement) => Promise<void>

// Add implementation in create
captureDestructionFrame: async (canvas: HTMLCanvasElement) => {
  try {
    const dataUrl = canvas.toDataURL('image/png')
    const response = await fetch(dataUrl)
    const blob = await response.blob()

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const id = generateUUID()
    const url = URL.createObjectURL(blob)

    set((state) => ({
      clips: [
        ...state.clips,
        {
          id,
          blob,
          url,
          thumbnailUrl: dataUrl,
          duration: 0,
          createdAt: Date.now(),
          frames: [],
        },
      ],
    }))
  } catch (error) {
    console.error('Failed to capture destruction frame:', error)
    // Silently fail - screenshot is a bonus
  }
},
```

**Step 2: Call capture before deactivate in useDestructionMode**

Update the escape hold completion in useDestructionMode.ts:

Import:
```typescript
import { useClipStore } from '../stores/clipStore'
```

In the escape check interval, before deactivate():
```typescript
// Capture screenshot before deactivating
const canvas = document.querySelector('canvas') as HTMLCanvasElement
if (canvas) {
  useClipStore.getState().captureDestructionFrame(canvas)
}
deactivate()
```

**Step 3: Verify no TypeScript errors**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 4: Commit**

```bash
git add src/hooks/useDestructionMode.ts src/stores/clipStore.ts
git commit -m "feat(destruction): capture screenshot to clip bin on exit"
```

---

### Task 9: Manual Testing

**Step 1: Start dev server**

Run: `npm run dev`

**Step 2: Test activation**

1. Press ↓ twice quickly (within 500ms)
2. Within 1 second, press Shift+D+M simultaneously
3. Expected: Chaos effects activate, UI dims with glitch overlay

**Step 3: Test chaos**

1. Observe canvas - should have extreme RGB split, block displacement, feedback, etc.
2. Effects should constantly evolve (random modulation)

**Step 4: Test exit**

1. Hold Escape for 2+ seconds
2. Expected: Screenshot captured, overlay fades out, effects restore to previous state

**Step 5: Verify screenshot**

1. Check clip bin for new clip named with timestamp
2. Should show the chaos frame that was captured

**Step 6: Final commit**

```bash
git add -A
git commit -m "feat(destruction): complete destruction mode implementation"
```

---

## Files Summary

| File | Action |
|------|--------|
| `src/stores/destructionModeStore.ts` | Create |
| `src/hooks/useDestructionMode.ts` | Create |
| `src/effects/glitch-engine/DatamoshEffect.ts` | Create |
| `src/effects/glitch-engine/index.ts` | Modify |
| `src/effects/EffectPipeline.ts` | Modify |
| `src/hooks/useDestructionChaos.ts` | Create |
| `src/components/DestructionOverlay.tsx` | Create |
| `src/components/performance/PerformanceLayout.tsx` | Modify |
| `src/components/Canvas.tsx` | Modify |
| `src/stores/clipStore.ts` | Modify |
