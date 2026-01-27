import { useRef, useCallback } from 'react'

interface BankButtonProps {
  label: string        // 'A', 'B', 'C', or 'D'
  index: number        // 0-3
  isEmpty: boolean     // true if bank slot has no data
  isActive: boolean    // true if this bank is currently loaded
  onLoad: () => void   // Called on single click (if not empty)
  onSave: () => void   // Called on double-click
}

export function BankButton({
  label,
  isEmpty,
  isActive,
  onLoad,
  onSave,
}: BankButtonProps) {
  const lastClickTime = useRef<number>(0)

  const handleClick = useCallback(() => {
    const now = Date.now()
    if (now - lastClickTime.current < 300) {
      // Double-click - save
      onSave()
    } else if (!isEmpty) {
      // Single click - load (only if not empty)
      onLoad()
    }
    lastClickTime.current = now
  }, [isEmpty, onLoad, onSave])

  // Determine visual state styles
  const getStyles = () => {
    if (isActive) {
      // Active (loaded) state
      return {
        backgroundColor: '#ffffff',
        border: '2px solid #6366f1',
        color: '#1a1a1a',
      }
    } else if (isEmpty) {
      // Empty state
      return {
        backgroundColor: 'transparent',
        border: '1px dashed #d0d0d0',
        color: '#999999',
      }
    } else {
      // Filled (not active) state
      return {
        backgroundColor: '#ffffff',
        border: '1px solid #d0d0d0',
        color: '#1a1a1a',
      }
    }
  }

  const styles = getStyles()

  return (
    <button
      onClick={handleClick}
      className="w-full h-full flex items-center justify-center rounded-lg text-[16px] font-medium select-none"
      style={styles}
    >
      {label}
    </button>
  )
}
