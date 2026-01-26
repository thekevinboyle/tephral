import { create } from 'zustand'

export interface PointNetworkParams {
  // Points
  pointRadius: number
  pointColor: string
  pointOpacity: number
  showPoints: boolean

  // Lines
  lineColor: string
  lineColorSecondary: string
  lineOpacity: number
  lineWidth: number
  lineCurve: number       // 0 = straight, 1 = fully curved
  showLines: boolean

  // Connection rules
  maxDistance: number     // max distance for connecting points (normalized)
  connectionMode: 'nearest' | 'delaunay' | 'all' | 'mesh'
  maxConnections: number  // max connections per point

  // Labels
  showLabels: boolean
  labelPrefix: string     // e.g., "codecore_"
  labelFontSize: number
  labelColor: string

  // Animation
  animateLines: boolean
  flowSpeed: number
  pulsePoints: boolean
}

export const DEFAULT_POINT_NETWORK_PARAMS: PointNetworkParams = {
  pointRadius: 4,
  pointColor: '#00ffff',
  pointOpacity: 1.0,
  showPoints: true,

  lineColor: '#ff3366',
  lineColorSecondary: '#ffffff',
  lineOpacity: 0.8,
  lineWidth: 1,
  lineCurve: 0.3,
  showLines: true,

  maxDistance: 0.15,
  connectionMode: 'nearest',
  maxConnections: 4,

  showLabels: true,
  labelPrefix: 'codecore_',
  labelFontSize: 8,
  labelColor: '#ffffff',

  animateLines: true,
  flowSpeed: 1.0,
  pulsePoints: true,
}

export interface PointNetworkSnapshot {
  enabled: boolean
  params: PointNetworkParams
}

interface PointNetworkState {
  enabled: boolean
  params: PointNetworkParams

  setEnabled: (enabled: boolean) => void
  updateParams: (params: Partial<PointNetworkParams>) => void
  reset: () => void
  getSnapshot: () => PointNetworkSnapshot
  applySnapshot: (snapshot: PointNetworkSnapshot) => void
}

export const usePointNetworkStore = create<PointNetworkState>((set, get) => ({
  enabled: false,
  params: { ...DEFAULT_POINT_NETWORK_PARAMS },

  setEnabled: (enabled) => set({ enabled }),
  updateParams: (params) => set((state) => ({
    params: { ...state.params, ...params },
  })),
  reset: () => set({
    enabled: false,
    params: { ...DEFAULT_POINT_NETWORK_PARAMS },
  }),

  getSnapshot: () => ({
    enabled: get().enabled,
    params: { ...get().params },
  }),

  applySnapshot: (snapshot) => set({
    enabled: snapshot.enabled,
    params: { ...snapshot.params },
  }),
}))
