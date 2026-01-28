import { type ReactNode, useEffect } from 'react'

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
        className={`absolute top-0 bottom-0 w-80 z-50 transition-transform duration-300 overflow-hidden ${
          side === 'left' ? 'left-0 border-r' : 'right-0 border-l'
        } ${
          open
            ? 'translate-x-0'
            : side === 'left'
              ? '-translate-x-full'
              : 'translate-x-full'
        }`}
        style={{
          backgroundColor: '#f5f5f5',
          borderColor: '#d0d0d0',
        }}
      >
        <div className="h-full overflow-auto">
          {children}
        </div>
      </div>
    </>
  )
}
