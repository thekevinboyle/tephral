# strand-tracer Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a fully client-side web app for real-time photo/video manipulation with 5 stackable effect modules, full parameter control, and preset system.

**Architecture:** React UI controls a Three.js rendering pipeline. Each effect module is a custom GLSL shader pass. EffectComposer chains passes together. Zustand manages all state. Media inputs (webcam/file) feed textures to the pipeline.

**Tech Stack:** Vite, React 18, TypeScript, Three.js, GLSL, Radix UI, Tailwind CSS, Zustand, idb-keyval

---

## Phase 1: Project Scaffolding

### Task 1.1: Initialize Vite Project

**Files:**
- Create: `package.json`
- Create: `vite.config.ts`
- Create: `tsconfig.json`
- Create: `index.html`
- Create: `src/main.tsx`
- Create: `src/App.tsx`

**Step 1: Create Vite project with React + TypeScript**

Run:
```bash
cd /Users/kevin/Documents/web/strand-tracer
npm create vite@latest . -- --template react-ts
```

Expected: Scaffolds project, prompts to overwrite (select yes for existing directory)

**Step 2: Install dependencies**

Run:
```bash
npm install
```

Expected: `node_modules` created, `package-lock.json` generated

**Step 3: Verify dev server starts**

Run:
```bash
npm run dev
```

Expected: Server starts on http://localhost:5173, shows Vite + React page

**Step 4: Commit**

```bash
git add -A
git commit -m "chore: initialize vite react-ts project"
```

---

### Task 1.2: Install Core Dependencies

**Files:**
- Modify: `package.json`

**Step 1: Install Three.js and postprocessing**

Run:
```bash
npm install three @types/three postprocessing
```

**Step 2: Install UI dependencies**

Run:
```bash
npm install @radix-ui/react-slider @radix-ui/react-select @radix-ui/react-toggle @radix-ui/react-dropdown-menu
```

**Step 3: Install state management**

Run:
```bash
npm install zustand idb-keyval
```

**Step 4: Install Tailwind CSS**

Run:
```bash
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

**Step 5: Install drag-drop for effect chain**

Run:
```bash
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

**Step 6: Commit**

```bash
git add package.json package-lock.json tailwind.config.js postcss.config.js
git commit -m "chore: install core dependencies"
```

---

### Task 1.3: Configure Tailwind with Brutalist Theme

**Files:**
- Modify: `tailwind.config.js`
- Create: `src/index.css`
- Modify: `src/main.tsx`

**Step 1: Configure Tailwind**

Replace `tailwind.config.js`:

```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        base: {
          dark: '#0f0f0f',
          light: '#f5f5f5',
        },
        accent: {
          yellow: '#ffcc00',
          orange: '#ff6600',
        },
        muted: '#666666',
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'IBM Plex Mono', 'monospace'],
      },
      spacing: {
        'grid': '8px',
      },
    },
  },
  plugins: [],
}
```

**Step 2: Create base styles**

Create `src/index.css`:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700&display=swap');

@layer base {
  * {
    box-sizing: border-box;
  }

  body {
    @apply bg-base-dark text-base-light font-mono antialiased;
    margin: 0;
    padding: 0;
  }

  /* Brutalist: no rounded corners anywhere */
  * {
    border-radius: 0 !important;
  }
}

@layer components {
  .panel {
    @apply border border-muted p-4;
  }

  .label {
    @apply text-xs uppercase tracking-wider text-muted;
  }

  .value {
    @apply text-sm font-mono text-base-light;
  }
}
```

**Step 3: Import CSS in main.tsx**

Modify `src/main.tsx`:

```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
```

**Step 4: Verify styles load**

Run: `npm run dev`

Expected: Dark background (#0f0f0f), JetBrains Mono font applied

**Step 5: Commit**

```bash
git add tailwind.config.js src/index.css src/main.tsx
git commit -m "feat: configure tailwind with brutalist theme"
```

---

### Task 1.4: Create Project Directory Structure

**Files:**
- Create: `src/components/.gitkeep`
- Create: `src/effects/.gitkeep`
- Create: `src/shaders/.gitkeep`
- Create: `src/stores/.gitkeep`
- Create: `src/hooks/.gitkeep`
- Create: `src/utils/.gitkeep`
- Create: `src/presets/.gitkeep`
- Create: `public/textures/.gitkeep`

**Step 1: Create directories**

Run:
```bash
mkdir -p src/components src/effects src/shaders src/stores src/hooks src/utils src/presets public/textures
touch src/components/.gitkeep src/effects/.gitkeep src/shaders/.gitkeep src/stores/.gitkeep src/hooks/.gitkeep src/utils/.gitkeep src/presets/.gitkeep public/textures/.gitkeep
```

**Step 2: Commit**

```bash
git add .
git commit -m "chore: create project directory structure"
```

---

## Phase 2: Core Rendering Pipeline

### Task 2.1: Create Base Three.js Canvas Component

**Files:**
- Create: `src/components/Canvas.tsx`
- Create: `src/hooks/useThree.ts`

**Step 1: Create useThree hook**

Create `src/hooks/useThree.ts`:

```typescript
import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'

export function useThree(containerRef: React.RefObject<HTMLDivElement>) {
  const [renderer, setRenderer] = useState<THREE.WebGLRenderer | null>(null)
  const [scene] = useState(() => new THREE.Scene())
  const [camera] = useState(() => new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1))
  const frameIdRef = useRef<number>(0)

  useEffect(() => {
    if (!containerRef.current) return

    const container = containerRef.current
    const width = container.clientWidth
    const height = container.clientHeight

    const newRenderer = new THREE.WebGLRenderer({
      antialias: false,
      preserveDrawingBuffer: true
    })
    newRenderer.setSize(width, height)
    newRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    container.appendChild(newRenderer.domElement)

    setRenderer(newRenderer)

    const handleResize = () => {
      const w = container.clientWidth
      const h = container.clientHeight
      newRenderer.setSize(w, h)
    }

    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      cancelAnimationFrame(frameIdRef.current)
      newRenderer.dispose()
      container.removeChild(newRenderer.domElement)
    }
  }, [containerRef])

  return { renderer, scene, camera, frameIdRef }
}
```

**Step 2: Create Canvas component**

Create `src/components/Canvas.tsx`:

```tsx
import { useRef, useEffect } from 'react'
import { useThree } from '../hooks/useThree'

export function Canvas() {
  const containerRef = useRef<HTMLDivElement>(null)
  const { renderer, scene, camera, frameIdRef } = useThree(containerRef)

  useEffect(() => {
    if (!renderer) return

    // Basic render loop - will be replaced with effect pipeline
    const animate = () => {
      frameIdRef.current = requestAnimationFrame(animate)
      renderer.render(scene, camera)
    }
    animate()

    return () => {
      cancelAnimationFrame(frameIdRef.current)
    }
  }, [renderer, scene, camera, frameIdRef])

  return (
    <div
      ref={containerRef}
      className="w-full h-full bg-black"
    />
  )
}
```

**Step 3: Verify component renders**

Modify `src/App.tsx`:

```tsx
import { Canvas } from './components/Canvas'

function App() {
  return (
    <div className="w-screen h-screen">
      <Canvas />
    </div>
  )
}

export default App
```

Run: `npm run dev`

Expected: Black canvas fills viewport

**Step 4: Commit**

```bash
git add src/hooks/useThree.ts src/components/Canvas.tsx src/App.tsx
git commit -m "feat: add base three.js canvas component"
```

---

### Task 2.2: Create Shader Pass Infrastructure

**Files:**
- Create: `src/effects/types.ts`
- Create: `src/effects/BaseEffect.ts`
- Create: `src/shaders/passthrough.glsl`

**Step 1: Define effect types**

Create `src/effects/types.ts`:

```typescript
export type BlendMode = 'normal' | 'add' | 'multiply' | 'screen' | 'difference' | 'overlay'

export interface EffectConfig {
  id: string
  name: string
  enabled: boolean
  blendMode: BlendMode
  mix: number // 0-1
  parameters: Record<string, number | boolean | string>
}

export interface EffectModule {
  id: string
  name: string
  defaultParameters: Record<string, number | boolean | string>
  createPass: (parameters: Record<string, number | boolean | string>) => THREE.ShaderMaterial
  updatePass: (material: THREE.ShaderMaterial, parameters: Record<string, number | boolean | string>) => void
}
```

**Step 2: Create passthrough shader**

Create `src/shaders/passthrough.glsl`:

```glsl
// Vertex shader
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}

// Fragment shader
uniform sampler2D tDiffuse;
varying vec2 vUv;

void main() {
  gl_FragColor = texture2D(tDiffuse, vUv);
}
```

**Step 3: Create base effect class**

Create `src/effects/BaseEffect.ts`:

```typescript
import * as THREE from 'three'
import { Pass, FullScreenQuad } from 'postprocessing'

export class ShaderPassEffect extends Pass {
  material: THREE.ShaderMaterial
  fsQuad: FullScreenQuad

  constructor(material: THREE.ShaderMaterial) {
    super('ShaderPassEffect')
    this.material = material
    this.fsQuad = new FullScreenQuad(material)
  }

  render(
    renderer: THREE.WebGLRenderer,
    inputBuffer: THREE.WebGLRenderTarget,
    outputBuffer: THREE.WebGLRenderTarget
  ) {
    this.material.uniforms.tDiffuse.value = inputBuffer.texture

    renderer.setRenderTarget(this.renderToScreen ? null : outputBuffer)
    this.fsQuad.render(renderer)
  }

  dispose() {
    this.material.dispose()
    this.fsQuad.dispose()
  }
}
```

**Step 4: Commit**

```bash
git add src/effects/types.ts src/effects/BaseEffect.ts src/shaders/passthrough.glsl
git commit -m "feat: add shader pass infrastructure"
```

---

### Task 2.3: Create Effect Composition Engine

**Files:**
- Create: `src/effects/EffectPipeline.ts`
- Modify: `src/components/Canvas.tsx`

**Step 1: Create effect pipeline**

Create `src/effects/EffectPipeline.ts`:

```typescript
import * as THREE from 'three'
import { EffectComposer, RenderPass, EffectPass, BlendFunction } from 'postprocessing'
import { EffectConfig, BlendMode } from './types'

const BLEND_FUNCTION_MAP: Record<BlendMode, BlendFunction> = {
  normal: BlendFunction.NORMAL,
  add: BlendFunction.ADD,
  multiply: BlendFunction.MULTIPLY,
  screen: BlendFunction.SCREEN,
  difference: BlendFunction.DIFFERENCE,
  overlay: BlendFunction.OVERLAY,
}

export class EffectPipeline {
  private composer: EffectComposer
  private passes: Map<string, EffectPass> = new Map()
  private inputTexture: THREE.Texture | null = null
  private quad: THREE.Mesh
  private quadScene: THREE.Scene
  private camera: THREE.OrthographicCamera

  constructor(renderer: THREE.WebGLRenderer) {
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
    this.quadScene = new THREE.Scene()

    // Fullscreen quad for input texture
    const geometry = new THREE.PlaneGeometry(2, 2)
    const material = new THREE.MeshBasicMaterial({ map: null })
    this.quad = new THREE.Mesh(geometry, material)
    this.quadScene.add(this.quad)

    this.composer = new EffectComposer(renderer)
    const renderPass = new RenderPass(this.quadScene, this.camera)
    this.composer.addPass(renderPass)
  }

  setInputTexture(texture: THREE.Texture) {
    this.inputTexture = texture
    ;(this.quad.material as THREE.MeshBasicMaterial).map = texture
    ;(this.quad.material as THREE.MeshBasicMaterial).needsUpdate = true
  }

  setSize(width: number, height: number) {
    this.composer.setSize(width, height)
  }

  render() {
    if (!this.inputTexture) return
    this.composer.render()
  }

  dispose() {
    this.composer.dispose()
    this.quad.geometry.dispose()
    ;(this.quad.material as THREE.Material).dispose()
  }
}
```

**Step 2: Update Canvas to use pipeline**

Modify `src/components/Canvas.tsx`:

```tsx
import { useRef, useEffect, useState } from 'react'
import * as THREE from 'three'
import { useThree } from '../hooks/useThree'
import { EffectPipeline } from '../effects/EffectPipeline'

export function Canvas() {
  const containerRef = useRef<HTMLDivElement>(null)
  const { renderer, scene, camera, frameIdRef } = useThree(containerRef)
  const [pipeline, setPipeline] = useState<EffectPipeline | null>(null)

  // Initialize pipeline when renderer is ready
  useEffect(() => {
    if (!renderer) return

    const newPipeline = new EffectPipeline(renderer)
    setPipeline(newPipeline)

    // Create test texture (checkerboard pattern)
    const size = 256
    const data = new Uint8Array(size * size * 4)
    for (let i = 0; i < size; i++) {
      for (let j = 0; j < size; j++) {
        const idx = (i * size + j) * 4
        const isLight = ((i >> 4) + (j >> 4)) % 2 === 0
        const val = isLight ? 200 : 50
        data[idx] = val
        data[idx + 1] = val
        data[idx + 2] = val
        data[idx + 3] = 255
      }
    }
    const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat)
    texture.needsUpdate = true
    newPipeline.setInputTexture(texture)

    return () => {
      newPipeline.dispose()
    }
  }, [renderer])

  // Render loop
  useEffect(() => {
    if (!pipeline || !renderer) return

    pipeline.setSize(
      containerRef.current?.clientWidth || 800,
      containerRef.current?.clientHeight || 600
    )

    const animate = () => {
      frameIdRef.current = requestAnimationFrame(animate)
      pipeline.render()
    }
    animate()

    return () => {
      cancelAnimationFrame(frameIdRef.current)
    }
  }, [pipeline, renderer, frameIdRef])

  return (
    <div
      ref={containerRef}
      className="w-full h-full bg-black"
    />
  )
}
```

**Step 3: Verify checkerboard renders**

Run: `npm run dev`

Expected: Checkerboard pattern visible in canvas

**Step 4: Commit**

```bash
git add src/effects/EffectPipeline.ts src/components/Canvas.tsx
git commit -m "feat: add effect composition engine with EffectComposer"
```

---

## Phase 3: Media Input Layer

### Task 3.1: Create Media Store

**Files:**
- Create: `src/stores/mediaStore.ts`

**Step 1: Create Zustand store for media state**

Create `src/stores/mediaStore.ts`:

```typescript
import { create } from 'zustand'

export type MediaSource = 'none' | 'webcam' | 'file' | 'image-url'

interface MediaState {
  source: MediaSource
  videoElement: HTMLVideoElement | null
  imageElement: HTMLImageElement | null
  isPlaying: boolean
  isLoading: boolean
  error: string | null

  // Actions
  setSource: (source: MediaSource) => void
  setVideoElement: (el: HTMLVideoElement | null) => void
  setImageElement: (el: HTMLImageElement | null) => void
  setIsPlaying: (playing: boolean) => void
  setIsLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  reset: () => void
}

export const useMediaStore = create<MediaState>((set) => ({
  source: 'none',
  videoElement: null,
  imageElement: null,
  isPlaying: false,
  isLoading: false,
  error: null,

  setSource: (source) => set({ source }),
  setVideoElement: (el) => set({ videoElement: el }),
  setImageElement: (el) => set({ imageElement: el }),
  setIsPlaying: (playing) => set({ isPlaying: playing }),
  setIsLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),
  reset: () => set({
    source: 'none',
    videoElement: null,
    imageElement: null,
    isPlaying: false,
    isLoading: false,
    error: null,
  }),
}))
```

**Step 2: Commit**

```bash
git add src/stores/mediaStore.ts
git commit -m "feat: add media store for input state management"
```

---

### Task 3.2: Create Webcam Hook

**Files:**
- Create: `src/hooks/useWebcam.ts`

**Step 1: Create webcam access hook**

Create `src/hooks/useWebcam.ts`:

```typescript
import { useEffect, useRef, useCallback } from 'react'
import { useMediaStore } from '../stores/mediaStore'

export function useWebcam() {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const {
    setVideoElement,
    setIsPlaying,
    setIsLoading,
    setError,
    setSource,
    source
  } = useMediaStore()

  const startWebcam = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      // Create hidden video element
      const video = document.createElement('video')
      video.playsInline = true
      video.muted = true
      videoRef.current = video

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        },
        audio: false
      })

      streamRef.current = stream
      video.srcObject = stream

      await video.play()

      setVideoElement(video)
      setSource('webcam')
      setIsPlaying(true)
      setIsLoading(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to access webcam')
      setIsLoading(false)
    }
  }, [setVideoElement, setSource, setIsPlaying, setIsLoading, setError])

  const stopWebcam = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
      videoRef.current = null
    }
    setVideoElement(null)
    setIsPlaying(false)
    if (source === 'webcam') {
      setSource('none')
    }
  }, [setVideoElement, setIsPlaying, setSource, source])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopWebcam()
    }
  }, [stopWebcam])

  return { startWebcam, stopWebcam }
}
```

**Step 2: Commit**

```bash
git add src/hooks/useWebcam.ts
git commit -m "feat: add webcam access hook"
```

---

### Task 3.3: Create File Upload Hook

**Files:**
- Create: `src/hooks/useFileUpload.ts`

**Step 1: Create file upload hook**

Create `src/hooks/useFileUpload.ts`:

```typescript
import { useCallback } from 'react'
import { useMediaStore } from '../stores/mediaStore'

const SUPPORTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const SUPPORTED_VIDEO_TYPES = ['video/mp4', 'video/webm']

export function useFileUpload() {
  const {
    setVideoElement,
    setImageElement,
    setIsPlaying,
    setIsLoading,
    setError,
    setSource,
    reset
  } = useMediaStore()

  const uploadFile = useCallback(async (file: File) => {
    reset()
    setIsLoading(true)

    try {
      if (SUPPORTED_IMAGE_TYPES.includes(file.type)) {
        const img = new Image()
        const url = URL.createObjectURL(file)

        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve()
          img.onerror = () => reject(new Error('Failed to load image'))
          img.src = url
        })

        setImageElement(img)
        setSource('file')
        setIsLoading(false)
      } else if (SUPPORTED_VIDEO_TYPES.includes(file.type)) {
        const video = document.createElement('video')
        video.playsInline = true
        video.muted = true
        video.loop = true

        const url = URL.createObjectURL(file)
        video.src = url

        await new Promise<void>((resolve, reject) => {
          video.onloadeddata = () => resolve()
          video.onerror = () => reject(new Error('Failed to load video'))
        })

        await video.play()

        setVideoElement(video)
        setSource('file')
        setIsPlaying(true)
        setIsLoading(false)
      } else {
        throw new Error(`Unsupported file type: ${file.type}`)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load file')
      setIsLoading(false)
    }
  }, [reset, setVideoElement, setImageElement, setSource, setIsPlaying, setIsLoading, setError])

  return { uploadFile }
}
```

**Step 2: Commit**

```bash
git add src/hooks/useFileUpload.ts
git commit -m "feat: add file upload hook for images and videos"
```

---

### Task 3.4: Create Video Texture Hook

**Files:**
- Create: `src/hooks/useVideoTexture.ts`
- Modify: `src/components/Canvas.tsx`

**Step 1: Create video texture hook**

Create `src/hooks/useVideoTexture.ts`:

```typescript
import { useEffect, useState } from 'react'
import * as THREE from 'three'
import { useMediaStore } from '../stores/mediaStore'

export function useVideoTexture() {
  const { videoElement, imageElement, source } = useMediaStore()
  const [texture, setTexture] = useState<THREE.Texture | null>(null)

  useEffect(() => {
    if (source === 'none') {
      setTexture(null)
      return
    }

    if (videoElement) {
      const videoTexture = new THREE.VideoTexture(videoElement)
      videoTexture.minFilter = THREE.LinearFilter
      videoTexture.magFilter = THREE.LinearFilter
      videoTexture.format = THREE.RGBAFormat
      setTexture(videoTexture)

      return () => {
        videoTexture.dispose()
      }
    }

    if (imageElement) {
      const imageTexture = new THREE.Texture(imageElement)
      imageTexture.minFilter = THREE.LinearFilter
      imageTexture.magFilter = THREE.LinearFilter
      imageTexture.needsUpdate = true
      setTexture(imageTexture)

      return () => {
        imageTexture.dispose()
      }
    }
  }, [videoElement, imageElement, source])

  return texture
}
```

**Step 2: Update Canvas to use media texture**

Modify `src/components/Canvas.tsx`:

```tsx
import { useRef, useEffect, useState } from 'react'
import * as THREE from 'three'
import { useThree } from '../hooks/useThree'
import { useVideoTexture } from '../hooks/useVideoTexture'
import { EffectPipeline } from '../effects/EffectPipeline'

export function Canvas() {
  const containerRef = useRef<HTMLDivElement>(null)
  const { renderer, frameIdRef } = useThree(containerRef)
  const [pipeline, setPipeline] = useState<EffectPipeline | null>(null)
  const mediaTexture = useVideoTexture()

  // Initialize pipeline
  useEffect(() => {
    if (!renderer) return

    const newPipeline = new EffectPipeline(renderer)
    setPipeline(newPipeline)

    return () => {
      newPipeline.dispose()
    }
  }, [renderer])

  // Update input texture when media changes
  useEffect(() => {
    if (!pipeline) return

    if (mediaTexture) {
      pipeline.setInputTexture(mediaTexture)
    } else {
      // Show placeholder when no media
      const size = 256
      const data = new Uint8Array(size * size * 4)
      for (let i = 0; i < size * size * 4; i += 4) {
        data[i] = 20
        data[i + 1] = 20
        data[i + 2] = 20
        data[i + 3] = 255
      }
      const placeholder = new THREE.DataTexture(data, size, size, THREE.RGBAFormat)
      placeholder.needsUpdate = true
      pipeline.setInputTexture(placeholder)
    }
  }, [pipeline, mediaTexture])

  // Render loop
  useEffect(() => {
    if (!pipeline || !renderer || !containerRef.current) return

    pipeline.setSize(
      containerRef.current.clientWidth,
      containerRef.current.clientHeight
    )

    const animate = () => {
      frameIdRef.current = requestAnimationFrame(animate)
      pipeline.render()
    }
    animate()

    return () => {
      cancelAnimationFrame(frameIdRef.current)
    }
  }, [pipeline, renderer, frameIdRef])

  return (
    <div
      ref={containerRef}
      className="w-full h-full bg-black"
    />
  )
}
```

**Step 3: Commit**

```bash
git add src/hooks/useVideoTexture.ts src/components/Canvas.tsx
git commit -m "feat: connect media input to rendering pipeline"
```

---

## Phase 4: Effect Module — Glitch Engine

### Task 4.1: Create RGB Split Shader

**Files:**
- Create: `src/shaders/rgbSplit.frag`
- Create: `src/shaders/rgbSplit.vert`
- Create: `src/effects/glitch-engine/RGBSplitEffect.ts`

**Step 1: Create vertex shader**

Create `src/shaders/rgbSplit.vert`:

```glsl
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
```

**Step 2: Create fragment shader**

Create `src/shaders/rgbSplit.frag`:

```glsl
uniform sampler2D tDiffuse;
uniform vec2 redOffset;
uniform vec2 greenOffset;
uniform vec2 blueOffset;
uniform float amount;

varying vec2 vUv;

void main() {
  vec2 rUv = vUv + redOffset * amount;
  vec2 gUv = vUv + greenOffset * amount;
  vec2 bUv = vUv + blueOffset * amount;

  float r = texture2D(tDiffuse, rUv).r;
  float g = texture2D(tDiffuse, gUv).g;
  float b = texture2D(tDiffuse, bUv).b;

  gl_FragColor = vec4(r, g, b, 1.0);
}
```

**Step 3: Create effect class**

Create `src/effects/glitch-engine/RGBSplitEffect.ts`:

```typescript
import * as THREE from 'three'
import { Effect, BlendFunction } from 'postprocessing'

import vertexShader from '../../shaders/rgbSplit.vert?raw'
import fragmentShader from '../../shaders/rgbSplit.frag?raw'

export interface RGBSplitParams {
  redOffsetX: number
  redOffsetY: number
  greenOffsetX: number
  greenOffsetY: number
  blueOffsetX: number
  blueOffsetY: number
  amount: number
}

export const DEFAULT_RGB_SPLIT_PARAMS: RGBSplitParams = {
  redOffsetX: 0.01,
  redOffsetY: 0,
  greenOffsetX: 0,
  greenOffsetY: 0,
  blueOffsetX: -0.01,
  blueOffsetY: 0,
  amount: 1,
}

export class RGBSplitEffect extends Effect {
  constructor(params: Partial<RGBSplitParams> = {}) {
    const p = { ...DEFAULT_RGB_SPLIT_PARAMS, ...params }

    super('RGBSplitEffect', fragmentShader, {
      blendFunction: BlendFunction.NORMAL,
      uniforms: new Map<string, THREE.Uniform>([
        ['redOffset', new THREE.Uniform(new THREE.Vector2(p.redOffsetX, p.redOffsetY))],
        ['greenOffset', new THREE.Uniform(new THREE.Vector2(p.greenOffsetX, p.greenOffsetY))],
        ['blueOffset', new THREE.Uniform(new THREE.Vector2(p.blueOffsetX, p.blueOffsetY))],
        ['amount', new THREE.Uniform(p.amount)],
      ]),
    })
  }

  updateParams(params: Partial<RGBSplitParams>) {
    if (params.redOffsetX !== undefined || params.redOffsetY !== undefined) {
      const offset = this.uniforms.get('redOffset')!.value as THREE.Vector2
      if (params.redOffsetX !== undefined) offset.x = params.redOffsetX
      if (params.redOffsetY !== undefined) offset.y = params.redOffsetY
    }
    if (params.greenOffsetX !== undefined || params.greenOffsetY !== undefined) {
      const offset = this.uniforms.get('greenOffset')!.value as THREE.Vector2
      if (params.greenOffsetX !== undefined) offset.x = params.greenOffsetX
      if (params.greenOffsetY !== undefined) offset.y = params.greenOffsetY
    }
    if (params.blueOffsetX !== undefined || params.blueOffsetY !== undefined) {
      const offset = this.uniforms.get('blueOffset')!.value as THREE.Vector2
      if (params.blueOffsetX !== undefined) offset.x = params.blueOffsetX
      if (params.blueOffsetY !== undefined) offset.y = params.blueOffsetY
    }
    if (params.amount !== undefined) {
      this.uniforms.get('amount')!.value = params.amount
    }
  }
}
```

**Step 4: Commit**

```bash
git add src/shaders/rgbSplit.vert src/shaders/rgbSplit.frag src/effects/glitch-engine/RGBSplitEffect.ts
git commit -m "feat: add RGB split effect shader"
```

---

### Task 4.2: Create Block Displacement Shader

**Files:**
- Create: `src/shaders/blockDisplace.frag`
- Create: `src/effects/glitch-engine/BlockDisplaceEffect.ts`

**Step 1: Create fragment shader**

Create `src/shaders/blockDisplace.frag`:

```glsl
uniform sampler2D tDiffuse;
uniform float blockSize;
uniform float displaceChance;
uniform float displaceDistance;
uniform float time;
uniform float seed;

varying vec2 vUv;

// Pseudo-random function
float random(vec2 st) {
  return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
}

void main() {
  // Calculate block coordinates
  vec2 blockCoord = floor(vUv / blockSize) * blockSize;

  // Generate random value for this block
  float rand = random(blockCoord + seed + floor(time * 10.0));

  vec2 uv = vUv;

  // Displace if random value is below threshold
  if (rand < displaceChance) {
    float displaceX = (random(blockCoord + 0.1 + seed) - 0.5) * 2.0 * displaceDistance;
    float displaceY = (random(blockCoord + 0.2 + seed) - 0.5) * 2.0 * displaceDistance;
    uv += vec2(displaceX, displaceY);
  }

  gl_FragColor = texture2D(tDiffuse, uv);
}
```

**Step 2: Create effect class**

Create `src/effects/glitch-engine/BlockDisplaceEffect.ts`:

```typescript
import * as THREE from 'three'
import { Effect, BlendFunction } from 'postprocessing'

import fragmentShader from '../../shaders/blockDisplace.frag?raw'

export interface BlockDisplaceParams {
  blockSize: number
  displaceChance: number
  displaceDistance: number
  seed: number
  animated: boolean
}

export const DEFAULT_BLOCK_DISPLACE_PARAMS: BlockDisplaceParams = {
  blockSize: 0.05,
  displaceChance: 0.1,
  displaceDistance: 0.02,
  seed: 0,
  animated: true,
}

export class BlockDisplaceEffect extends Effect {
  private startTime: number

  constructor(params: Partial<BlockDisplaceParams> = {}) {
    const p = { ...DEFAULT_BLOCK_DISPLACE_PARAMS, ...params }

    super('BlockDisplaceEffect', fragmentShader, {
      blendFunction: BlendFunction.NORMAL,
      uniforms: new Map<string, THREE.Uniform>([
        ['blockSize', new THREE.Uniform(p.blockSize)],
        ['displaceChance', new THREE.Uniform(p.displaceChance)],
        ['displaceDistance', new THREE.Uniform(p.displaceDistance)],
        ['time', new THREE.Uniform(0)],
        ['seed', new THREE.Uniform(p.seed)],
      ]),
    })

    this.startTime = performance.now()
  }

  update(_renderer: THREE.WebGLRenderer, _inputBuffer: THREE.WebGLRenderTarget, deltaTime: number) {
    this.uniforms.get('time')!.value = (performance.now() - this.startTime) / 1000
  }

  updateParams(params: Partial<BlockDisplaceParams>) {
    if (params.blockSize !== undefined) {
      this.uniforms.get('blockSize')!.value = params.blockSize
    }
    if (params.displaceChance !== undefined) {
      this.uniforms.get('displaceChance')!.value = params.displaceChance
    }
    if (params.displaceDistance !== undefined) {
      this.uniforms.get('displaceDistance')!.value = params.displaceDistance
    }
    if (params.seed !== undefined) {
      this.uniforms.get('seed')!.value = params.seed
    }
  }

  randomize() {
    this.uniforms.get('seed')!.value = Math.random() * 1000
  }
}
```

**Step 3: Commit**

```bash
git add src/shaders/blockDisplace.frag src/effects/glitch-engine/BlockDisplaceEffect.ts
git commit -m "feat: add block displacement effect shader"
```

---

### Task 4.3: Create Scan Lines Shader

**Files:**
- Create: `src/shaders/scanLines.frag`
- Create: `src/effects/glitch-engine/ScanLinesEffect.ts`

**Step 1: Create fragment shader**

Create `src/shaders/scanLines.frag`:

```glsl
uniform sampler2D tDiffuse;
uniform float lineCount;
uniform float lineOpacity;
uniform float lineFlicker;
uniform float time;

varying vec2 vUv;

float random(float x) {
  return fract(sin(x * 12.9898) * 43758.5453);
}

void main() {
  vec4 color = texture2D(tDiffuse, vUv);

  // Calculate scan line position
  float linePos = mod(vUv.y * lineCount, 1.0);

  // Create scan line pattern (darker every other line)
  float scanLine = step(0.5, linePos);

  // Add flicker
  float flicker = 1.0 - lineFlicker * random(floor(time * 30.0) + floor(vUv.y * lineCount));

  // Apply scan lines
  float darkness = mix(1.0, 1.0 - lineOpacity, scanLine) * flicker;

  gl_FragColor = vec4(color.rgb * darkness, color.a);
}
```

**Step 2: Create effect class**

Create `src/effects/glitch-engine/ScanLinesEffect.ts`:

```typescript
import * as THREE from 'three'
import { Effect, BlendFunction } from 'postprocessing'

import fragmentShader from '../../shaders/scanLines.frag?raw'

export interface ScanLinesParams {
  lineCount: number
  lineOpacity: number
  lineFlicker: number
}

export const DEFAULT_SCAN_LINES_PARAMS: ScanLinesParams = {
  lineCount: 300,
  lineOpacity: 0.15,
  lineFlicker: 0.05,
}

export class ScanLinesEffect extends Effect {
  constructor(params: Partial<ScanLinesParams> = {}) {
    const p = { ...DEFAULT_SCAN_LINES_PARAMS, ...params }

    super('ScanLinesEffect', fragmentShader, {
      blendFunction: BlendFunction.NORMAL,
      uniforms: new Map<string, THREE.Uniform>([
        ['lineCount', new THREE.Uniform(p.lineCount)],
        ['lineOpacity', new THREE.Uniform(p.lineOpacity)],
        ['lineFlicker', new THREE.Uniform(p.lineFlicker)],
        ['time', new THREE.Uniform(0)],
      ]),
    })
  }

  update() {
    this.uniforms.get('time')!.value = performance.now() / 1000
  }

  updateParams(params: Partial<ScanLinesParams>) {
    if (params.lineCount !== undefined) {
      this.uniforms.get('lineCount')!.value = params.lineCount
    }
    if (params.lineOpacity !== undefined) {
      this.uniforms.get('lineOpacity')!.value = params.lineOpacity
    }
    if (params.lineFlicker !== undefined) {
      this.uniforms.get('lineFlicker')!.value = params.lineFlicker
    }
  }
}
```

**Step 3: Commit**

```bash
git add src/shaders/scanLines.frag src/effects/glitch-engine/ScanLinesEffect.ts
git commit -m "feat: add scan lines effect shader"
```

---

### Task 4.4: Create Glitch Engine Module Store

**Files:**
- Create: `src/stores/glitchEngineStore.ts`
- Create: `src/effects/glitch-engine/index.ts`

**Step 1: Create effect module store**

Create `src/stores/glitchEngineStore.ts`:

```typescript
import { create } from 'zustand'
import {
  RGBSplitParams,
  DEFAULT_RGB_SPLIT_PARAMS
} from '../effects/glitch-engine/RGBSplitEffect'
import {
  BlockDisplaceParams,
  DEFAULT_BLOCK_DISPLACE_PARAMS
} from '../effects/glitch-engine/BlockDisplaceEffect'
import {
  ScanLinesParams,
  DEFAULT_SCAN_LINES_PARAMS
} from '../effects/glitch-engine/ScanLinesEffect'

interface GlitchEngineState {
  enabled: boolean

  // Sub-effect enabled states
  rgbSplitEnabled: boolean
  blockDisplaceEnabled: boolean
  scanLinesEnabled: boolean

  // Parameters
  rgbSplit: RGBSplitParams
  blockDisplace: BlockDisplaceParams
  scanLines: ScanLinesParams

  // Actions
  setEnabled: (enabled: boolean) => void
  setRGBSplitEnabled: (enabled: boolean) => void
  setBlockDisplaceEnabled: (enabled: boolean) => void
  setScanLinesEnabled: (enabled: boolean) => void
  updateRGBSplit: (params: Partial<RGBSplitParams>) => void
  updateBlockDisplace: (params: Partial<BlockDisplaceParams>) => void
  updateScanLines: (params: Partial<ScanLinesParams>) => void
  reset: () => void
}

export const useGlitchEngineStore = create<GlitchEngineState>((set) => ({
  enabled: true,

  rgbSplitEnabled: true,
  blockDisplaceEnabled: false,
  scanLinesEnabled: false,

  rgbSplit: { ...DEFAULT_RGB_SPLIT_PARAMS },
  blockDisplace: { ...DEFAULT_BLOCK_DISPLACE_PARAMS },
  scanLines: { ...DEFAULT_SCAN_LINES_PARAMS },

  setEnabled: (enabled) => set({ enabled }),
  setRGBSplitEnabled: (enabled) => set({ rgbSplitEnabled: enabled }),
  setBlockDisplaceEnabled: (enabled) => set({ blockDisplaceEnabled: enabled }),
  setScanLinesEnabled: (enabled) => set({ scanLinesEnabled: enabled }),

  updateRGBSplit: (params) => set((state) => ({
    rgbSplit: { ...state.rgbSplit, ...params }
  })),
  updateBlockDisplace: (params) => set((state) => ({
    blockDisplace: { ...state.blockDisplace, ...params }
  })),
  updateScanLines: (params) => set((state) => ({
    scanLines: { ...state.scanLines, ...params }
  })),

  reset: () => set({
    enabled: true,
    rgbSplitEnabled: true,
    blockDisplaceEnabled: false,
    scanLinesEnabled: false,
    rgbSplit: { ...DEFAULT_RGB_SPLIT_PARAMS },
    blockDisplace: { ...DEFAULT_BLOCK_DISPLACE_PARAMS },
    scanLines: { ...DEFAULT_SCAN_LINES_PARAMS },
  }),
}))
```

**Step 2: Create module index**

Create `src/effects/glitch-engine/index.ts`:

```typescript
export { RGBSplitEffect, DEFAULT_RGB_SPLIT_PARAMS } from './RGBSplitEffect'
export type { RGBSplitParams } from './RGBSplitEffect'

export { BlockDisplaceEffect, DEFAULT_BLOCK_DISPLACE_PARAMS } from './BlockDisplaceEffect'
export type { BlockDisplaceParams } from './BlockDisplaceEffect'

export { ScanLinesEffect, DEFAULT_SCAN_LINES_PARAMS } from './ScanLinesEffect'
export type { ScanLinesParams } from './ScanLinesEffect'
```

**Step 3: Commit**

```bash
git add src/stores/glitchEngineStore.ts src/effects/glitch-engine/index.ts
git commit -m "feat: add glitch engine module store"
```

---

### Task 4.5: Wire Glitch Engine to Pipeline

**Files:**
- Modify: `src/effects/EffectPipeline.ts`
- Modify: `src/components/Canvas.tsx`

**Step 1: Update EffectPipeline to support effects**

Modify `src/effects/EffectPipeline.ts`:

```typescript
import * as THREE from 'three'
import { EffectComposer, RenderPass, EffectPass, Effect } from 'postprocessing'
import { RGBSplitEffect, BlockDisplaceEffect, ScanLinesEffect } from './glitch-engine'

export class EffectPipeline {
  private composer: EffectComposer
  private inputTexture: THREE.Texture | null = null
  private quad: THREE.Mesh
  private quadScene: THREE.Scene
  private camera: THREE.OrthographicCamera

  // Effect instances
  rgbSplit: RGBSplitEffect | null = null
  blockDisplace: BlockDisplaceEffect | null = null
  scanLines: ScanLinesEffect | null = null

  private effectPass: EffectPass | null = null

  constructor(renderer: THREE.WebGLRenderer) {
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
    this.quadScene = new THREE.Scene()

    const geometry = new THREE.PlaneGeometry(2, 2)
    const material = new THREE.MeshBasicMaterial({ map: null })
    this.quad = new THREE.Mesh(geometry, material)
    this.quadScene.add(this.quad)

    this.composer = new EffectComposer(renderer)
    const renderPass = new RenderPass(this.quadScene, this.camera)
    this.composer.addPass(renderPass)

    // Initialize effects
    this.rgbSplit = new RGBSplitEffect()
    this.blockDisplace = new BlockDisplaceEffect()
    this.scanLines = new ScanLinesEffect()
  }

  updateEffects(config: {
    rgbSplitEnabled: boolean
    blockDisplaceEnabled: boolean
    scanLinesEnabled: boolean
  }) {
    // Remove existing effect pass
    if (this.effectPass) {
      this.composer.removePass(this.effectPass)
      this.effectPass = null
    }

    // Collect enabled effects
    const effects: Effect[] = []

    if (config.rgbSplitEnabled && this.rgbSplit) {
      effects.push(this.rgbSplit)
    }
    if (config.blockDisplaceEnabled && this.blockDisplace) {
      effects.push(this.blockDisplace)
    }
    if (config.scanLinesEnabled && this.scanLines) {
      effects.push(this.scanLines)
    }

    // Add new effect pass if there are effects
    if (effects.length > 0) {
      this.effectPass = new EffectPass(this.camera, ...effects)
      this.composer.addPass(this.effectPass)
    }
  }

  setInputTexture(texture: THREE.Texture) {
    this.inputTexture = texture
    ;(this.quad.material as THREE.MeshBasicMaterial).map = texture
    ;(this.quad.material as THREE.MeshBasicMaterial).needsUpdate = true
  }

  setSize(width: number, height: number) {
    this.composer.setSize(width, height)
  }

  render() {
    if (!this.inputTexture) return
    this.composer.render()
  }

  dispose() {
    this.composer.dispose()
    this.quad.geometry.dispose()
    ;(this.quad.material as THREE.Material).dispose()
    this.rgbSplit?.dispose()
    this.blockDisplace?.dispose()
    this.scanLines?.dispose()
  }
}
```

**Step 2: Update Canvas to sync store with pipeline**

Modify `src/components/Canvas.tsx`:

```tsx
import { useRef, useEffect, useState } from 'react'
import * as THREE from 'three'
import { useThree } from '../hooks/useThree'
import { useVideoTexture } from '../hooks/useVideoTexture'
import { EffectPipeline } from '../effects/EffectPipeline'
import { useGlitchEngineStore } from '../stores/glitchEngineStore'

export function Canvas() {
  const containerRef = useRef<HTMLDivElement>(null)
  const { renderer, frameIdRef } = useThree(containerRef)
  const [pipeline, setPipeline] = useState<EffectPipeline | null>(null)
  const mediaTexture = useVideoTexture()

  const {
    enabled: glitchEnabled,
    rgbSplitEnabled,
    blockDisplaceEnabled,
    scanLinesEnabled,
    rgbSplit,
    blockDisplace,
    scanLines
  } = useGlitchEngineStore()

  // Initialize pipeline
  useEffect(() => {
    if (!renderer) return

    const newPipeline = new EffectPipeline(renderer)
    setPipeline(newPipeline)

    return () => {
      newPipeline.dispose()
    }
  }, [renderer])

  // Sync effect parameters
  useEffect(() => {
    if (!pipeline) return

    pipeline.rgbSplit?.updateParams(rgbSplit)
    pipeline.blockDisplace?.updateParams(blockDisplace)
    pipeline.scanLines?.updateParams(scanLines)

    pipeline.updateEffects({
      rgbSplitEnabled: glitchEnabled && rgbSplitEnabled,
      blockDisplaceEnabled: glitchEnabled && blockDisplaceEnabled,
      scanLinesEnabled: glitchEnabled && scanLinesEnabled,
    })
  }, [
    pipeline,
    glitchEnabled,
    rgbSplitEnabled,
    blockDisplaceEnabled,
    scanLinesEnabled,
    rgbSplit,
    blockDisplace,
    scanLines
  ])

  // Update input texture
  useEffect(() => {
    if (!pipeline) return

    if (mediaTexture) {
      pipeline.setInputTexture(mediaTexture)
    } else {
      const size = 256
      const data = new Uint8Array(size * size * 4)
      for (let i = 0; i < size * size * 4; i += 4) {
        data[i] = 20
        data[i + 1] = 20
        data[i + 2] = 20
        data[i + 3] = 255
      }
      const placeholder = new THREE.DataTexture(data, size, size, THREE.RGBAFormat)
      placeholder.needsUpdate = true
      pipeline.setInputTexture(placeholder)
    }
  }, [pipeline, mediaTexture])

  // Render loop
  useEffect(() => {
    if (!pipeline || !renderer || !containerRef.current) return

    pipeline.setSize(
      containerRef.current.clientWidth,
      containerRef.current.clientHeight
    )

    const animate = () => {
      frameIdRef.current = requestAnimationFrame(animate)
      pipeline.render()
    }
    animate()

    return () => {
      cancelAnimationFrame(frameIdRef.current)
    }
  }, [pipeline, renderer, frameIdRef])

  return (
    <div
      ref={containerRef}
      className="w-full h-full bg-black"
    />
  )
}
```

**Step 3: Verify effects render**

Run: `npm run dev`

Expected: When webcam/file is loaded, RGB split effect visible by default

**Step 4: Commit**

```bash
git add src/effects/EffectPipeline.ts src/components/Canvas.tsx
git commit -m "feat: wire glitch engine effects to rendering pipeline"
```

---

## Phase 5: Basic UI Components

### Task 5.1: Create Slider Component

**Files:**
- Create: `src/components/ui/Slider.tsx`

**Step 1: Create brutalist slider**

Create `src/components/ui/Slider.tsx`:

```tsx
import * as RadixSlider from '@radix-ui/react-slider'
import { useState } from 'react'

interface SliderProps {
  label: string
  value: number
  min: number
  max: number
  step?: number
  onChange: (value: number) => void
}

export function Slider({ label, value, min, max, step = 0.01, onChange }: SliderProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [inputValue, setInputValue] = useState(String(value))

  const handleInputSubmit = () => {
    const parsed = parseFloat(inputValue)
    if (!isNaN(parsed)) {
      onChange(Math.max(min, Math.min(max, parsed)))
    }
    setIsEditing(false)
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between items-center">
        <span className="label">{label}</span>
        {isEditing ? (
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onBlur={handleInputSubmit}
            onKeyDown={(e) => e.key === 'Enter' && handleInputSubmit()}
            className="w-16 bg-transparent border border-muted px-1 text-sm text-right focus:outline-none focus:border-accent-yellow"
            autoFocus
          />
        ) : (
          <span
            className="value cursor-pointer hover:text-accent-yellow"
            onClick={() => {
              setInputValue(String(value.toFixed(3)))
              setIsEditing(true)
            }}
          >
            {value.toFixed(3)}
          </span>
        )}
      </div>
      <RadixSlider.Root
        className="relative flex items-center h-5 w-full select-none touch-none"
        value={[value]}
        min={min}
        max={max}
        step={step}
        onValueChange={([v]) => onChange(v)}
      >
        <RadixSlider.Track className="relative grow h-[2px] bg-muted">
          <RadixSlider.Range className="absolute h-full bg-accent-yellow" />
        </RadixSlider.Track>
        <RadixSlider.Thumb className="block w-3 h-3 bg-base-light border border-muted hover:bg-accent-yellow focus:outline-none" />
      </RadixSlider.Root>
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add src/components/ui/Slider.tsx
git commit -m "feat: add brutalist slider component"
```

---

### Task 5.2: Create Toggle Component

**Files:**
- Create: `src/components/ui/Toggle.tsx`

**Step 1: Create brutalist toggle**

Create `src/components/ui/Toggle.tsx`:

```tsx
import * as RadixToggle from '@radix-ui/react-toggle'

interface ToggleProps {
  label: string
  pressed: boolean
  onPressedChange: (pressed: boolean) => void
}

export function Toggle({ label, pressed, onPressedChange }: ToggleProps) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="label">{label}</span>
      <RadixToggle.Root
        className={`w-8 h-4 border ${
          pressed
            ? 'bg-accent-yellow border-accent-yellow'
            : 'bg-transparent border-muted'
        }`}
        pressed={pressed}
        onPressedChange={onPressedChange}
      >
        <span className="sr-only">{label}</span>
      </RadixToggle.Root>
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add src/components/ui/Toggle.tsx
git commit -m "feat: add brutalist toggle component"
```

---

### Task 5.3: Create Panel Component

**Files:**
- Create: `src/components/ui/Panel.tsx`

**Step 1: Create panel container**

Create `src/components/ui/Panel.tsx`:

```tsx
import { ReactNode } from 'react'

interface PanelProps {
  title: string
  children: ReactNode
  collapsed?: boolean
  onToggleCollapse?: () => void
}

export function Panel({ title, children, collapsed, onToggleCollapse }: PanelProps) {
  return (
    <div className="border border-muted">
      <button
        className="w-full flex items-center justify-between p-3 hover:bg-muted/10"
        onClick={onToggleCollapse}
      >
        <span className="text-sm font-bold uppercase tracking-wider">{title}</span>
        <span className="text-muted">{collapsed ? '+' : '-'}</span>
      </button>
      {!collapsed && (
        <div className="p-3 pt-0 flex flex-col gap-3">
          {children}
        </div>
      )}
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add src/components/ui/Panel.tsx
git commit -m "feat: add panel container component"
```

---

### Task 5.4: Create UI Component Index

**Files:**
- Create: `src/components/ui/index.ts`

**Step 1: Export all UI components**

Create `src/components/ui/index.ts`:

```typescript
export { Slider } from './Slider'
export { Toggle } from './Toggle'
export { Panel } from './Panel'
```

**Step 2: Commit**

```bash
git add src/components/ui/index.ts
git commit -m "feat: add ui component index"
```

---

## Phase 6: Effect Control Panels

### Task 6.1: Create Glitch Engine Control Panel

**Files:**
- Create: `src/components/effects/GlitchEnginePanel.tsx`

**Step 1: Create panel with all controls**

Create `src/components/effects/GlitchEnginePanel.tsx`:

```tsx
import { useState } from 'react'
import { Panel, Slider, Toggle } from '../ui'
import { useGlitchEngineStore } from '../../stores/glitchEngineStore'

export function GlitchEnginePanel() {
  const [collapsed, setCollapsed] = useState(false)
  const [activeTab, setActiveTab] = useState<'rgb' | 'block' | 'scan'>('rgb')

  const {
    enabled,
    setEnabled,
    rgbSplitEnabled,
    setRGBSplitEnabled,
    blockDisplaceEnabled,
    setBlockDisplaceEnabled,
    scanLinesEnabled,
    setScanLinesEnabled,
    rgbSplit,
    updateRGBSplit,
    blockDisplace,
    updateBlockDisplace,
    scanLines,
    updateScanLines,
  } = useGlitchEngineStore()

  return (
    <Panel
      title="GLITCH ENGINE"
      collapsed={collapsed}
      onToggleCollapse={() => setCollapsed(!collapsed)}
    >
      <Toggle label="ENABLED" pressed={enabled} onPressedChange={setEnabled} />

      {enabled && (
        <>
          {/* Sub-effect tabs */}
          <div className="flex gap-1 border-b border-muted pb-2">
            {(['rgb', 'block', 'scan'] as const).map((tab) => (
              <button
                key={tab}
                className={`px-2 py-1 text-xs uppercase ${
                  activeTab === tab
                    ? 'bg-accent-yellow text-base-dark'
                    : 'text-muted hover:text-base-light'
                }`}
                onClick={() => setActiveTab(tab)}
              >
                {tab === 'rgb' ? 'RGB SPLIT' : tab === 'block' ? 'BLOCK' : 'SCAN'}
              </button>
            ))}
          </div>

          {/* RGB Split controls */}
          {activeTab === 'rgb' && (
            <div className="flex flex-col gap-3">
              <Toggle
                label="RGB SPLIT"
                pressed={rgbSplitEnabled}
                onPressedChange={setRGBSplitEnabled}
              />
              {rgbSplitEnabled && (
                <>
                  <Slider
                    label="AMOUNT"
                    value={rgbSplit.amount}
                    min={0}
                    max={2}
                    onChange={(v) => updateRGBSplit({ amount: v })}
                  />
                  <Slider
                    label="RED X"
                    value={rgbSplit.redOffsetX}
                    min={-0.1}
                    max={0.1}
                    onChange={(v) => updateRGBSplit({ redOffsetX: v })}
                  />
                  <Slider
                    label="RED Y"
                    value={rgbSplit.redOffsetY}
                    min={-0.1}
                    max={0.1}
                    onChange={(v) => updateRGBSplit({ redOffsetY: v })}
                  />
                  <Slider
                    label="BLUE X"
                    value={rgbSplit.blueOffsetX}
                    min={-0.1}
                    max={0.1}
                    onChange={(v) => updateRGBSplit({ blueOffsetX: v })}
                  />
                  <Slider
                    label="BLUE Y"
                    value={rgbSplit.blueOffsetY}
                    min={-0.1}
                    max={0.1}
                    onChange={(v) => updateRGBSplit({ blueOffsetY: v })}
                  />
                </>
              )}
            </div>
          )}

          {/* Block Displace controls */}
          {activeTab === 'block' && (
            <div className="flex flex-col gap-3">
              <Toggle
                label="BLOCK DISPLACE"
                pressed={blockDisplaceEnabled}
                onPressedChange={setBlockDisplaceEnabled}
              />
              {blockDisplaceEnabled && (
                <>
                  <Slider
                    label="BLOCK SIZE"
                    value={blockDisplace.blockSize}
                    min={0.01}
                    max={0.2}
                    onChange={(v) => updateBlockDisplace({ blockSize: v })}
                  />
                  <Slider
                    label="CHANCE"
                    value={blockDisplace.displaceChance}
                    min={0}
                    max={1}
                    onChange={(v) => updateBlockDisplace({ displaceChance: v })}
                  />
                  <Slider
                    label="DISTANCE"
                    value={blockDisplace.displaceDistance}
                    min={0}
                    max={0.1}
                    onChange={(v) => updateBlockDisplace({ displaceDistance: v })}
                  />
                </>
              )}
            </div>
          )}

          {/* Scan Lines controls */}
          {activeTab === 'scan' && (
            <div className="flex flex-col gap-3">
              <Toggle
                label="SCAN LINES"
                pressed={scanLinesEnabled}
                onPressedChange={setScanLinesEnabled}
              />
              {scanLinesEnabled && (
                <>
                  <Slider
                    label="LINE COUNT"
                    value={scanLines.lineCount}
                    min={50}
                    max={800}
                    step={1}
                    onChange={(v) => updateScanLines({ lineCount: v })}
                  />
                  <Slider
                    label="OPACITY"
                    value={scanLines.lineOpacity}
                    min={0}
                    max={0.5}
                    onChange={(v) => updateScanLines({ lineOpacity: v })}
                  />
                  <Slider
                    label="FLICKER"
                    value={scanLines.lineFlicker}
                    min={0}
                    max={0.3}
                    onChange={(v) => updateScanLines({ lineFlicker: v })}
                  />
                </>
              )}
            </div>
          )}
        </>
      )}
    </Panel>
  )
}
```

**Step 2: Commit**

```bash
git add src/components/effects/GlitchEnginePanel.tsx
git commit -m "feat: add glitch engine control panel"
```

---

### Task 6.2: Create Media Input Panel

**Files:**
- Create: `src/components/MediaInputPanel.tsx`

**Step 1: Create media controls**

Create `src/components/MediaInputPanel.tsx`:

```tsx
import { useRef } from 'react'
import { Panel } from './ui'
import { useMediaStore } from '../stores/mediaStore'
import { useWebcam } from '../hooks/useWebcam'
import { useFileUpload } from '../hooks/useFileUpload'

export function MediaInputPanel() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { source, isLoading, error } = useMediaStore()
  const { startWebcam, stopWebcam } = useWebcam()
  const { uploadFile } = useFileUpload()

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      uploadFile(file)
    }
  }

  return (
    <Panel title="INPUT">
      <div className="flex flex-col gap-2">
        {/* Webcam button */}
        <button
          className={`w-full py-2 border text-xs uppercase tracking-wider ${
            source === 'webcam'
              ? 'bg-accent-yellow text-base-dark border-accent-yellow'
              : 'border-muted hover:border-base-light'
          }`}
          onClick={() => source === 'webcam' ? stopWebcam() : startWebcam()}
          disabled={isLoading}
        >
          {source === 'webcam' ? 'STOP WEBCAM' : 'START WEBCAM'}
        </button>

        {/* File upload button */}
        <button
          className="w-full py-2 border border-muted text-xs uppercase tracking-wider hover:border-base-light"
          onClick={() => fileInputRef.current?.click()}
          disabled={isLoading}
        >
          UPLOAD FILE
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*"
          onChange={handleFileChange}
          className="hidden"
        />

        {/* Status */}
        {isLoading && (
          <span className="text-xs text-muted">LOADING...</span>
        )}
        {error && (
          <span className="text-xs text-red-500">{error}</span>
        )}
        {source !== 'none' && !isLoading && (
          <span className="text-xs text-accent-yellow">
            SOURCE: {source.toUpperCase()}
          </span>
        )}
      </div>
    </Panel>
  )
}
```

**Step 2: Commit**

```bash
git add src/components/MediaInputPanel.tsx
git commit -m "feat: add media input control panel"
```

---

### Task 6.3: Create Main App Layout

**Files:**
- Modify: `src/App.tsx`

**Step 1: Assemble main layout**

Modify `src/App.tsx`:

```tsx
import { Canvas } from './components/Canvas'
import { MediaInputPanel } from './components/MediaInputPanel'
import { GlitchEnginePanel } from './components/effects/GlitchEnginePanel'

function App() {
  return (
    <div className="w-screen h-screen flex flex-col">
      {/* Header */}
      <header className="h-12 border-b border-muted flex items-center justify-between px-4">
        <h1 className="text-sm font-bold uppercase tracking-widest">STRAND-TRACER</h1>
        <div className="flex gap-2">
          <button className="px-3 py-1 border border-muted text-xs uppercase hover:border-base-light">
            CAPTURE
          </button>
          <button className="px-3 py-1 border border-muted text-xs uppercase hover:border-base-light">
            EXPORT
          </button>
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left sidebar - effect chain */}
        <aside className="w-64 border-r border-muted p-2 flex flex-col gap-2 overflow-y-auto">
          <MediaInputPanel />
          <GlitchEnginePanel />
        </aside>

        {/* Canvas */}
        <main className="flex-1">
          <Canvas />
        </main>
      </div>
    </div>
  )
}

export default App
```

**Step 2: Verify full UI renders**

Run: `npm run dev`

Expected: Full layout visible with sidebar controls, header, and canvas

**Step 3: Commit**

```bash
git add src/App.tsx
git commit -m "feat: assemble main app layout with sidebar"
```

---

## Summary: Phases 1-6 Complete

This plan covers the foundation through the first working effect module with UI controls:

- **Phase 1**: Project scaffolding with Vite, React, TypeScript, Tailwind
- **Phase 2**: Core Three.js rendering pipeline with EffectComposer
- **Phase 3**: Media input layer (webcam, file upload)
- **Phase 4**: Glitch Engine module (RGB split, block displace, scan lines)
- **Phase 5**: Base UI components (Slider, Toggle, Panel)
- **Phase 6**: Effect control panels and main layout

---

## Remaining Phases (to be detailed):

- **Phase 7**: Signal Decay module (VHS, static, datamosh)
- **Phase 8**: Strand Tracer module (trails, echoes, connections)
- **Phase 9**: Industrial Corruption module (rust, mesh, grime)
- **Phase 10**: Particle Dissolution module (WebGPU compute)
- **Phase 11**: Effect composition (ordering, blend modes, feedback)
- **Phase 12**: Preset system (save/load/factory presets)
- **Phase 13**: Export system (PNG, WebM capture)
- **Phase 14**: Polish and factory presets

---

*Plan continues in next document or on request.*
