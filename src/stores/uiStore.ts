import { create } from 'zustand'

type TabId = 'source' | 'glitch' | 'vision' | 'export'

interface UIState {
  activeTab: TabId
  drawerOpen: boolean
  drawerHeight: number // percentage of viewport

  setActiveTab: (tab: TabId) => void
  setDrawerOpen: (open: boolean) => void
  setDrawerHeight: (height: number) => void
  toggleDrawer: () => void
}

export const useUIStore = create<UIState>((set) => ({
  activeTab: 'source',
  drawerOpen: true,
  drawerHeight: 40, // 40% of viewport

  setActiveTab: (tab) => set({ activeTab: tab }),
  setDrawerOpen: (open) => set({ drawerOpen: open }),
  setDrawerHeight: (height) => set({ drawerHeight: Math.min(80, Math.max(20, height)) }),
  toggleDrawer: () => set((state) => ({ drawerOpen: !state.drawerOpen })),
}))
