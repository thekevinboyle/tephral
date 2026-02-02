import { useRef, useCallback, useState } from 'react'

interface BankButtonProps {
  label: string        // 'A', 'B', 'C', or 'D'
  index: number        // 0-3
  isEmpty: boolean     // true if bank slot has no data
  isActive: boolean    // true if this bank is currently loaded
  onLoad: () => void   // Called on single click (if not empty)
  onSave: () => void   // Called on double-click
  onClear: () => void  // Called on right-click
}

export function BankButton({
  label,
  isEmpty,
  isActive,
  onLoad,
  onSave,
  onClear,
}: BankButtonProps) {
  const lastClickTime = useRef<number>(0)
  const [isFlashing, setIsFlashing] = useState(false)

  const handleClick = useCallback(() => {
    const now = Date.now()
    const isDoubleClick = now - lastClickTime.current < 300
    lastClickTime.current = now

    if (isEmpty) {
      // Empty bank: single click saves
      onSave()
      setIsFlashing(true)
      setTimeout(() => setIsFlashing(false), 150)
    } else if (isDoubleClick) {
      // Filled bank: double-click overwrites
      onSave()
      setIsFlashing(true)
      setTimeout(() => setIsFlashing(false), 150)
    } else {
      // Filled bank: single click loads
      onLoad()
    }
  }, [isEmpty, onLoad, onSave])

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    if (!isEmpty) {
      onClear()
    }
  }, [isEmpty, onClear])

  // Determine visual state styles
  const getStyles = () => {
    if (isActive) {
      // Active (loaded) state
      return {
        backgroundColor: 'var(--bg-surface)',
        border: '2px solid #6366f1',
        color: 'var(--text-primary)',
      }
    } else if (isEmpty) {
      // Empty state
      return {
        backgroundColor: 'transparent',
        border: '1px dashed var(--border)',
        color: 'var(--text-muted)',
      }
    } else {
      // Filled (not active) state
      return {
        backgroundColor: 'var(--bg-surface)',
        border: '1px solid var(--border)',
        color: 'var(--text-primary)',
      }
    }
  }

  const styles = getStyles()

  return (
    <button
      onClick={handleClick}
      onContextMenu={handleContextMenu}
      className="w-full h-full flex items-center justify-center rounded-lg text-[16px] font-medium select-none transition-all duration-100"
      style={{
        ...styles,
        boxShadow: isFlashing ? `0 0 20px ${isActive ? '#6366f1' : '#6366f1'}` : 'none',
        transform: isFlashing ? 'scale(1.05)' : 'scale(1)',
      }}
    >
      {label}
    </button>
  )
}
