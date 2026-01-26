import { ReactNode } from 'react'
import { useUIStore } from '../../stores/uiStore'
import { TabBar } from './TabBar'
import { ChevronUpIcon, ChevronDownIcon } from './Icons'

interface BottomDrawerProps {
  children: ReactNode
}

export function BottomDrawer({ children }: BottomDrawerProps) {
  const { drawerOpen, drawerHeight, toggleDrawer } = useUIStore()

  return (
    <div
      className="fixed bottom-0 left-0 right-0 bg-base-dark/95 backdrop-blur-sm border-t border-muted/30 transition-transform duration-300 ease-out flex flex-col"
      style={{
        height: `${drawerHeight}vh`,
        transform: drawerOpen ? 'translateY(0)' : `translateY(calc(100% - 52px))`
      }}
    >
      {/* Drag handle */}
      <button
        onClick={toggleDrawer}
        className="flex items-center justify-center py-2 hover:bg-muted/10 transition-colors"
      >
        <div className="w-12 h-1 bg-muted/50 rounded-full" />
        <span className="absolute right-4">
          {drawerOpen ? <ChevronDownIcon size={16} className="text-muted" /> : <ChevronUpIcon size={16} className="text-muted" />}
        </span>
      </button>

      {/* Content area */}
      <div className="flex-1 overflow-y-auto px-4 pb-2">
        {children}
      </div>

      {/* Tab bar */}
      <TabBar />
    </div>
  )
}
