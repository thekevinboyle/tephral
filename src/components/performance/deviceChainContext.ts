import { createContext } from 'react'
import type React from 'react'

/** Chain-level handlers DeviceChain hands to every DeviceCard. The value is created once, so it never re-renders a card. */
export interface DeviceChainActions {
  select: (id: string) => void
  toggleBypass: (id: string) => void
  remove: (id: string) => void
  move: (id: string, dir: -1 | 1) => void
  focusSibling: (id: string, dir: -1 | 1) => void
  dragStart: (id: string, ev: React.DragEvent) => void
  dragOver: (id: string, ev: React.DragEvent) => void
  dragLeave: (ev: React.DragEvent) => void
  drop: (id: string, ev: React.DragEvent) => void
  dragEnd: () => void
  hover: (id: string | null) => void
}

const noop = () => {}
export const DeviceChainContext = createContext<DeviceChainActions>({
  select: noop, toggleBypass: noop, remove: noop, move: noop, focusSibling: noop,
  dragStart: noop, dragOver: noop, dragLeave: noop, drop: noop, dragEnd: noop, hover: noop,
})
