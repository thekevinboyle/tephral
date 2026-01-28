import { create } from 'zustand'

// ============================================================================
// Types
// ============================================================================

export type BlendMode = 'multiply' | 'screen' | 'overlay' | 'softLight'

export interface TextureOverlayState {
  enabled: boolean
  textureId: string          // e.g., 'grain_fine', 'dust', 'paper'
  blendMode: BlendMode
  opacity: number            // 0-1, default 0.5
  scale: number              // 0.5-3, default 1
  animated: boolean          // default true
  animationSpeed: number     // 0.1-2, default 1

  // Actions
  setEnabled: (enabled: boolean) => void
  setTextureId: (id: string) => void
  setBlendMode: (mode: BlendMode) => void
  setOpacity: (opacity: number) => void
  setScale: (scale: number) => void
  setAnimated: (animated: boolean) => void
  setAnimationSpeed: (speed: number) => void
  reset: () => void
}

// ============================================================================
// Default Values
// ============================================================================

const DEFAULT_STATE = {
  enabled: false,
  textureId: 'grain_fine',
  blendMode: 'overlay' as BlendMode,
  opacity: 0.5,
  scale: 1,
  animated: true,
  animationSpeed: 1,
}

// ============================================================================
// Store Implementation
// ============================================================================

export const useTextureOverlayStore = create<TextureOverlayState>((set) => ({
  ...DEFAULT_STATE,

  setEnabled: (enabled) => set({ enabled }),

  setTextureId: (id) => set({ textureId: id }),

  setBlendMode: (mode) => set({ blendMode: mode }),

  setOpacity: (opacity) => set({ opacity: Math.max(0, Math.min(1, opacity)) }),

  setScale: (scale) => set({ scale: Math.max(0.5, Math.min(3, scale)) }),

  setAnimated: (animated) => set({ animated }),

  setAnimationSpeed: (speed) => set({ animationSpeed: Math.max(0.1, Math.min(2, speed)) }),

  reset: () => set({ ...DEFAULT_STATE }),
}))
