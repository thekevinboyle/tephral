import type { ReactNode } from 'react'

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
