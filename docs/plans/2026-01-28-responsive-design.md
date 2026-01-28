# Responsive Design Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make Tephral's desktop UI responsive with collapsible side panels and enforced minimum widths.

**Architecture:** Desktop-first approach with slide-out drawers for side panels at medium breakpoint, minimum width enforcement below 1024px.

**Tech Stack:** React, Zustand, Tailwind CSS breakpoints, CSS transitions

---

## Breakpoints

| Breakpoint | Width | Behavior |
|------------|-------|----------|
| Large | ≥1200px | Full layout, all panels visible |
| Medium | 1024-1199px | Side panels become slide-out drawers |
| Minimum | <1024px | Horizontal scroll, no further degradation |

---

## Task 1: Add Drawer State to uiStore

**Files:**
- Modify: `src/stores/uiStore.ts`

**Step 1: Add drawer state and actions**

Add to the UIState interface and store:

```typescript
// Add to interface
leftDrawerOpen: boolean
rightDrawerOpen: boolean
setLeftDrawerOpen: (open: boolean) => void
setRightDrawerOpen: (open: boolean) => void
toggleLeftDrawer: () => void
toggleRightDrawer: () => void

// Add to store
leftDrawerOpen: false,
rightDrawerOpen: false,
setLeftDrawerOpen: (open) => set({ leftDrawerOpen: open }),
setRightDrawerOpen: (open) => set({ rightDrawerOpen: open }),
toggleLeftDrawer: () => set((s) => ({ leftDrawerOpen: !s.leftDrawerOpen })),
toggleRightDrawer: () => set((s) => ({ rightDrawerOpen: !s.rightDrawerOpen })),
```

**Step 2: Commit**

```bash
git add src/stores/uiStore.ts
git commit -m "feat: add drawer state to uiStore"
```

---

## Task 2: Create SlideDrawer Component

**Files:**
- Create: `src/components/ui/SlideDrawer.tsx`

**Step 1: Create the component**

```typescript
import { ReactNode, useEffect } from 'react'

interface SlideDrawerProps {
  open: boolean
  onClose: () => void
  side: 'left' | 'right'
  children: ReactNode
}

export function SlideDrawer({ open, onClose, side, children }: SlideDrawerProps) {
  // Close on Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [open, onClose])

  return (
    <>
      {/* Backdrop */}
      <div
        className={`absolute inset-0 bg-black/30 transition-opacity z-40 ${
          open ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className={`absolute top-0 bottom-0 w-80 bg-white border-${side === 'left' ? 'r' : 'l'} border-gray-200 z-50 transition-transform duration-300 ${
          side === 'left' ? 'left-0' : 'right-0'
        } ${
          open
            ? 'translate-x-0'
            : side === 'left'
              ? '-translate-x-full'
              : 'translate-x-full'
        }`}
      >
        {children}
      </div>
    </>
  )
}
```

**Step 2: Commit**

```bash
git add src/components/ui/SlideDrawer.tsx
git commit -m "feat: add SlideDrawer component"
```

---

## Task 3: Create DrawerTrigger Component

**Files:**
- Create: `src/components/ui/DrawerTrigger.tsx`

**Step 1: Create the component**

```typescript
interface DrawerTriggerProps {
  side: 'left' | 'right'
  onClick: () => void
  icon: 'folder' | 'sliders'
}

export function DrawerTrigger({ side, onClick, icon }: DrawerTriggerProps) {
  return (
    <button
      onClick={onClick}
      className={`absolute top-1/2 -translate-y-1/2 z-30 bg-white/90 backdrop-blur-sm border border-gray-300 rounded-full p-2 shadow-sm hover:bg-gray-50 transition-colors ${
        side === 'left' ? 'left-2' : 'right-2'
      }`}
      title={icon === 'folder' ? 'Presets (P)' : 'Parameters (E)'}
    >
      {icon === 'folder' ? (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
        </svg>
      ) : (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="4" y1="21" x2="4" y2="14" />
          <line x1="4" y1="10" x2="4" y2="3" />
          <line x1="12" y1="21" x2="12" y2="12" />
          <line x1="12" y1="8" x2="12" y2="3" />
          <line x1="20" y1="21" x2="20" y2="16" />
          <line x1="20" y1="12" x2="20" y2="3" />
          <line x1="1" y1="14" x2="7" y2="14" />
          <line x1="9" y1="8" x2="15" y2="8" />
          <line x1="17" y1="16" x2="23" y2="16" />
        </svg>
      )}
    </button>
  )
}
```

**Step 2: Commit**

```bash
git add src/components/ui/DrawerTrigger.tsx
git commit -m "feat: add DrawerTrigger component"
```

---

## Task 4: Add Keyboard Shortcuts

**Files:**
- Modify: `src/stores/uiStore.ts` or create `src/hooks/useDrawerShortcuts.ts`

**Step 1: Create keyboard shortcut hook**

Create `src/hooks/useDrawerShortcuts.ts`:

```typescript
import { useEffect } from 'react'
import { useUIStore } from '../stores/uiStore'

export function useDrawerShortcuts() {
  const { toggleLeftDrawer, toggleRightDrawer } = useUIStore()

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      // Ignore if typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return

      if (e.key === 'p' || e.key === 'P') {
        e.preventDefault()
        toggleLeftDrawer()
      }
      if (e.key === 'e' || e.key === 'E') {
        e.preventDefault()
        toggleRightDrawer()
      }
    }

    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [toggleLeftDrawer, toggleRightDrawer])
}
```

**Step 2: Commit**

```bash
git add src/hooks/useDrawerShortcuts.ts
git commit -m "feat: add keyboard shortcuts for drawers (P/E)"
```

---

## Task 5: Update PerformanceLayout with Responsive Breakpoints

**Files:**
- Modify: `src/components/performance/PerformanceLayout.tsx`

**Step 1: Add imports and hooks**

```typescript
import { SlideDrawer } from '../ui/SlideDrawer'
import { DrawerTrigger } from '../ui/DrawerTrigger'
import { useUIStore } from '../../stores/uiStore'
import { useDrawerShortcuts } from '../../hooks/useDrawerShortcuts'
```

**Step 2: Add state and hook usage**

Inside component:

```typescript
const {
  leftDrawerOpen,
  rightDrawerOpen,
  setLeftDrawerOpen,
  setRightDrawerOpen,
  toggleLeftDrawer,
  toggleRightDrawer,
} = useUIStore()

useDrawerShortcuts()
```

**Step 3: Update preview section**

Replace the preview section with responsive version:

```typescript
{/* Preview section */}
<div
  className="flex-shrink-0 m-3 mb-0 flex rounded-xl overflow-hidden relative"
  style={{
    height: 'calc(55vh - 12px)',
    border: '1px solid #d0d0d0',
  }}
>
  {/* Preset Library Panel - visible on xl, drawer on smaller */}
  <div
    className="flex-shrink-0 hidden xl:block"
    style={{
      width: '280px',
      backgroundColor: '#f5f5f5',
      borderRight: '1px solid #d0d0d0',
    }}
  >
    <PresetLibraryPanel canvasRef={captureRef} />
  </div>

  {/* Canvas area (center) */}
  <div
    className="relative flex-1 min-w-0"
    style={{ backgroundColor: '#1a1a1a' }}
  >
    {/* Drawer triggers - visible only when panels are hidden */}
    <div className="xl:hidden">
      <DrawerTrigger side="left" onClick={toggleLeftDrawer} icon="folder" />
    </div>
    <div className="xl:hidden">
      <DrawerTrigger side="right" onClick={toggleRightDrawer} icon="sliders" />
    </div>

    {/* Slide-out drawers */}
    <SlideDrawer open={leftDrawerOpen} onClose={() => setLeftDrawerOpen(false)} side="left">
      <PresetLibraryPanel canvasRef={captureRef} />
    </SlideDrawer>
    <SlideDrawer open={rightDrawerOpen} onClose={() => setRightDrawerOpen(false)} side="right">
      <ExpandedParameterPanel />
    </SlideDrawer>

    {/* Canvas */}
    <div className="w-full h-full">
      <Canvas ref={canvasRef} />
    </div>

    {/* Thumbnail filmstrip */}
    <ThumbnailFilmstrip />
  </div>

  {/* Expanded Parameter Panel - visible on xl, drawer on smaller */}
  <div className="flex-shrink-0 hidden xl:block" style={{ width: '340px' }}>
    <ExpandedParameterPanel />
  </div>
</div>
```

**Step 4: Update bottom section with minimum widths**

```typescript
{/* Bottom section - 3 columns with min-widths */}
<div
  className="flex-1 min-h-0 flex mx-3 mt-3 mb-3 gap-3 overflow-x-auto"
>
  {/* Column 1: Banks + Button grid */}
  <div
    className="min-h-0 flex flex-col rounded-xl overflow-hidden"
    style={{
      flex: '1 1 280px',
      minWidth: '280px',
      backgroundColor: '#ffffff',
      border: '1px solid #d0d0d0',
    }}
  >
    <div
      className="flex-shrink-0"
      style={{
        height: '52px',
        borderBottom: '1px solid #e5e5e5',
      }}
    >
      <BankPanel />
    </div>
    <div className="flex-1 min-h-0">
      <PerformanceGrid />
    </div>
  </div>

  {/* Column 2: Sequencer */}
  <div
    className="rounded-xl overflow-hidden"
    style={{
      flex: '1.5 1 200px',
      minWidth: '200px',
      backgroundColor: '#ffffff',
      border: '1px solid #d0d0d0',
    }}
  >
    <SequencerPanel />
  </div>

  {/* Column 3: XY Pad + Mix Controls */}
  <div
    className="flex flex-col gap-3"
    style={{
      flex: '0.8 1 180px',
      minWidth: '180px',
    }}
  >
    {/* XY Pad - maintains square aspect */}
    <div
      className="flex-1 rounded-xl overflow-hidden relative flex items-center justify-center"
      style={{
        backgroundColor: '#ffffff',
        border: '1px solid #d0d0d0',
      }}
    >
      <div className="w-full h-full" style={{ aspectRatio: '1', maxHeight: '100%', maxWidth: '100%' }}>
        <XYPad />
      </div>
    </div>

    {/* Mix Controls */}
    <div
      className="flex-shrink-0 rounded-xl overflow-hidden"
      style={{
        height: '80px',
        backgroundColor: '#ffffff',
        border: '1px solid #d0d0d0',
      }}
    >
      <MixControls />
    </div>
  </div>
</div>
```

**Step 5: Add global minimum width**

Update root div:

```typescript
<div
  className="w-screen h-screen flex flex-col overflow-hidden"
  style={{ backgroundColor: '#e5e5e5', minWidth: '1024px' }}
>
```

**Step 6: Commit**

```bash
git add src/components/performance/PerformanceLayout.tsx
git commit -m "feat: add responsive breakpoints with drawer panels"
```

---

## Task 6: Close Drawers on Breakpoint Change

**Files:**
- Modify: `src/components/performance/PerformanceLayout.tsx`

**Step 1: Add resize listener to close drawers when going back to large breakpoint**

```typescript
import { useEffect } from 'react'

// Inside component, add:
useEffect(() => {
  const handleResize = () => {
    // Close drawers when viewport is large enough to show panels
    if (window.innerWidth >= 1280) {
      setLeftDrawerOpen(false)
      setRightDrawerOpen(false)
    }
  }

  window.addEventListener('resize', handleResize)
  return () => window.removeEventListener('resize', handleResize)
}, [setLeftDrawerOpen, setRightDrawerOpen])
```

**Step 2: Commit**

```bash
git add src/components/performance/PerformanceLayout.tsx
git commit -m "feat: auto-close drawers on viewport resize"
```

---

## Summary

**New files:**
- `src/components/ui/SlideDrawer.tsx`
- `src/components/ui/DrawerTrigger.tsx`
- `src/hooks/useDrawerShortcuts.ts`

**Modified files:**
- `src/stores/uiStore.ts`
- `src/components/performance/PerformanceLayout.tsx`

**Behavior:**
- ≥1200px: Full layout with side panels visible
- 1024-1199px: Side panels hidden, accessible via drawer triggers or P/E keys
- <1024px: Horizontal scrollbar, layout maintains minimum widths
- XY Pad maintains square aspect ratio
- Effect grid priority: minimum 280px to keep buttons usable
