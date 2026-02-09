/**
 * Dot-matrix style icons for the app
 * Each icon is built from small circles arranged in a grid pattern
 */

interface IconProps {
  size?: number
  color?: string
  className?: string
}

const DOT_RADIUS = 0.8
const GRID_STEP = 2

// Helper to create dot at grid position
const Dot = ({ x, y }: { x: number; y: number }) => (
  <circle cx={x * GRID_STEP + 1} cy={y * GRID_STEP + 1} r={DOT_RADIUS} />
)

// Shuffle/Random icon - two crossing arrows
export function ShuffleIcon({ size = 16, color = 'currentColor', className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill={color} className={className}>
      {/* Top arrow going right-down */}
      <Dot x={0} y={1} />
      <Dot x={1} y={1} />
      <Dot x={2} y={2} />
      <Dot x={3} y={3} />
      <Dot x={4} y={4} />
      <Dot x={5} y={3} />
      <Dot x={6} y={2} />
      <Dot x={6} y={3} />
      <Dot x={6} y={4} />
      {/* Bottom arrow going right-up */}
      <Dot x={0} y={6} />
      <Dot x={1} y={6} />
      <Dot x={2} y={5} />
      <Dot x={3} y={4} />
      <Dot x={4} y={3} />
      <Dot x={5} y={4} />
      <Dot x={6} y={5} />
      <Dot x={6} y={4} />
      <Dot x={6} y={3} />
    </svg>
  )
}

// Dice icon - classic dice face
export function DiceIcon({ size = 16, color = 'currentColor', className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill={color} className={className}>
      {/* Border */}
      <Dot x={1} y={0} /><Dot x={2} y={0} /><Dot x={3} y={0} /><Dot x={4} y={0} /><Dot x={5} y={0} />
      <Dot x={0} y={1} /><Dot x={6} y={1} />
      <Dot x={0} y={2} /><Dot x={6} y={2} />
      <Dot x={0} y={3} /><Dot x={6} y={3} />
      <Dot x={0} y={4} /><Dot x={6} y={4} />
      <Dot x={0} y={5} /><Dot x={6} y={5} />
      <Dot x={1} y={6} /><Dot x={2} y={6} /><Dot x={3} y={6} /><Dot x={4} y={6} /><Dot x={5} y={6} />
      {/* Dots - 5 pattern */}
      <Dot x={2} y={2} />
      <Dot x={4} y={2} />
      <Dot x={3} y={3} />
      <Dot x={2} y={4} />
      <Dot x={4} y={4} />
    </svg>
  )
}

// Play icon - right-pointing triangle
export function PlayIcon({ size = 16, color = 'currentColor', className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill={color} className={className}>
      <Dot x={2} y={1} />
      <Dot x={2} y={2} /><Dot x={3} y={2} />
      <Dot x={2} y={3} /><Dot x={3} y={3} /><Dot x={4} y={3} />
      <Dot x={2} y={4} /><Dot x={3} y={4} /><Dot x={4} y={4} /><Dot x={5} y={4} />
      <Dot x={2} y={5} /><Dot x={3} y={5} /><Dot x={4} y={5} />
      <Dot x={2} y={6} /><Dot x={3} y={6} />
      <Dot x={2} y={7} />
    </svg>
  )
}

// Pause icon - two vertical bars
export function PauseIcon({ size = 16, color = 'currentColor', className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill={color} className={className}>
      <Dot x={2} y={1} /><Dot x={3} y={1} /><Dot x={5} y={1} /><Dot x={6} y={1} />
      <Dot x={2} y={2} /><Dot x={3} y={2} /><Dot x={5} y={2} /><Dot x={6} y={2} />
      <Dot x={2} y={3} /><Dot x={3} y={3} /><Dot x={5} y={3} /><Dot x={6} y={3} />
      <Dot x={2} y={4} /><Dot x={3} y={4} /><Dot x={5} y={4} /><Dot x={6} y={4} />
      <Dot x={2} y={5} /><Dot x={3} y={5} /><Dot x={5} y={5} /><Dot x={6} y={5} />
      <Dot x={2} y={6} /><Dot x={3} y={6} /><Dot x={5} y={6} /><Dot x={6} y={6} />
    </svg>
  )
}

// Stop icon - square
export function StopIcon({ size = 16, color = 'currentColor', className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill={color} className={className}>
      <Dot x={2} y={2} /><Dot x={3} y={2} /><Dot x={4} y={2} /><Dot x={5} y={2} />
      <Dot x={2} y={3} /><Dot x={3} y={3} /><Dot x={4} y={3} /><Dot x={5} y={3} />
      <Dot x={2} y={4} /><Dot x={3} y={4} /><Dot x={4} y={4} /><Dot x={5} y={4} />
      <Dot x={2} y={5} /><Dot x={3} y={5} /><Dot x={4} y={5} /><Dot x={5} y={5} />
    </svg>
  )
}

// Record icon - filled circle
export function RecordIcon({ size = 16, color = 'currentColor', className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill={color} className={className}>
      <Dot x={3} y={1} /><Dot x={4} y={1} />
      <Dot x={2} y={2} /><Dot x={3} y={2} /><Dot x={4} y={2} /><Dot x={5} y={2} />
      <Dot x={1} y={3} /><Dot x={2} y={3} /><Dot x={3} y={3} /><Dot x={4} y={3} /><Dot x={5} y={3} /><Dot x={6} y={3} />
      <Dot x={1} y={4} /><Dot x={2} y={4} /><Dot x={3} y={4} /><Dot x={4} y={4} /><Dot x={5} y={4} /><Dot x={6} y={4} />
      <Dot x={2} y={5} /><Dot x={3} y={5} /><Dot x={4} y={5} /><Dot x={5} y={5} />
      <Dot x={3} y={6} /><Dot x={4} y={6} />
    </svg>
  )
}

// Skip forward icon - two triangles
export function SkipForwardIcon({ size = 16, color = 'currentColor', className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill={color} className={className}>
      <Dot x={1} y={1} /><Dot x={4} y={1} />
      <Dot x={1} y={2} /><Dot x={2} y={2} /><Dot x={4} y={2} /><Dot x={5} y={2} />
      <Dot x={1} y={3} /><Dot x={2} y={3} /><Dot x={3} y={3} /><Dot x={4} y={3} /><Dot x={5} y={3} /><Dot x={6} y={3} />
      <Dot x={1} y={4} /><Dot x={2} y={4} /><Dot x={4} y={4} /><Dot x={5} y={4} />
      <Dot x={1} y={5} /><Dot x={4} y={5} />
    </svg>
  )
}

// Skip backward icon
export function SkipBackwardIcon({ size = 16, color = 'currentColor', className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill={color} className={className}>
      <Dot x={3} y={1} /><Dot x={6} y={1} />
      <Dot x={2} y={2} /><Dot x={3} y={2} /><Dot x={5} y={2} /><Dot x={6} y={2} />
      <Dot x={1} y={3} /><Dot x={2} y={3} /><Dot x={3} y={3} /><Dot x={4} y={3} /><Dot x={5} y={3} /><Dot x={6} y={3} />
      <Dot x={2} y={4} /><Dot x={3} y={4} /><Dot x={5} y={4} /><Dot x={6} y={4} />
      <Dot x={3} y={5} /><Dot x={6} y={5} />
    </svg>
  )
}

// Undo icon - curved arrow left
export function UndoIcon({ size = 16, color = 'currentColor', className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill={color} className={className}>
      <Dot x={2} y={1} />
      <Dot x={1} y={2} /><Dot x={3} y={2} /><Dot x={4} y={2} /><Dot x={5} y={2} />
      <Dot x={0} y={3} /><Dot x={6} y={3} />
      <Dot x={1} y={4} /><Dot x={6} y={4} />
      <Dot x={6} y={5} />
      <Dot x={5} y={6} />
    </svg>
  )
}

// Redo icon - curved arrow right
export function RedoIcon({ size = 16, color = 'currentColor', className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill={color} className={className}>
      <Dot x={5} y={1} />
      <Dot x={2} y={2} /><Dot x={3} y={2} /><Dot x={4} y={2} /><Dot x={6} y={2} />
      <Dot x={1} y={3} /><Dot x={7} y={3} />
      <Dot x={1} y={4} /><Dot x={6} y={4} />
      <Dot x={1} y={5} />
      <Dot x={2} y={6} />
    </svg>
  )
}

// Loop/repeat icon
export function LoopIcon({ size = 16, color = 'currentColor', className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill={color} className={className}>
      <Dot x={5} y={0} />
      <Dot x={2} y={1} /><Dot x={3} y={1} /><Dot x={4} y={1} /><Dot x={6} y={1} />
      <Dot x={1} y={2} /><Dot x={6} y={2} />
      <Dot x={1} y={3} /><Dot x={6} y={3} />
      <Dot x={1} y={4} /><Dot x={6} y={4} />
      <Dot x={1} y={5} /><Dot x={3} y={5} /><Dot x={4} y={5} /><Dot x={5} y={5} />
      <Dot x={2} y={6} />
    </svg>
  )
}

// Grid icon - 3x3 dots
export function GridIcon({ size = 16, color = 'currentColor', className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill={color} className={className}>
      <Dot x={1} y={1} /><Dot x={3} y={1} /><Dot x={5} y={1} />
      <Dot x={1} y={3} /><Dot x={3} y={3} /><Dot x={5} y={3} />
      <Dot x={1} y={5} /><Dot x={3} y={5} /><Dot x={5} y={5} />
    </svg>
  )
}

// Settings/gear icon
export function SettingsIcon({ size = 16, color = 'currentColor', className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill={color} className={className}>
      <Dot x={3} y={0} />
      <Dot x={1} y={1} /><Dot x={2} y={1} /><Dot x={3} y={1} /><Dot x={4} y={1} /><Dot x={5} y={1} />
      <Dot x={0} y={2} /><Dot x={2} y={2} /><Dot x={4} y={2} /><Dot x={6} y={2} />
      <Dot x={0} y={3} /><Dot x={2} y={3} /><Dot x={4} y={3} /><Dot x={6} y={3} />
      <Dot x={0} y={4} /><Dot x={2} y={4} /><Dot x={4} y={4} /><Dot x={6} y={4} />
      <Dot x={1} y={5} /><Dot x={2} y={5} /><Dot x={3} y={5} /><Dot x={4} y={5} /><Dot x={5} y={5} />
      <Dot x={3} y={6} />
    </svg>
  )
}

// Waveform icon
export function WaveformIcon({ size = 16, color = 'currentColor', className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill={color} className={className}>
      <Dot x={0} y={3} />
      <Dot x={1} y={2} /><Dot x={1} y={3} /><Dot x={1} y={4} />
      <Dot x={2} y={1} /><Dot x={2} y={2} /><Dot x={2} y={3} /><Dot x={2} y={4} /><Dot x={2} y={5} />
      <Dot x={3} y={0} /><Dot x={3} y={1} /><Dot x={3} y={2} /><Dot x={3} y={3} /><Dot x={3} y={4} /><Dot x={3} y={5} /><Dot x={3} y={6} />
      <Dot x={4} y={1} /><Dot x={4} y={2} /><Dot x={4} y={3} /><Dot x={4} y={4} /><Dot x={4} y={5} />
      <Dot x={5} y={2} /><Dot x={5} y={3} /><Dot x={5} y={4} />
      <Dot x={6} y={3} />
    </svg>
  )
}

// Layers icon
export function LayersIcon({ size = 16, color = 'currentColor', className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill={color} className={className}>
      <Dot x={3} y={0} />
      <Dot x={2} y={1} /><Dot x={3} y={1} /><Dot x={4} y={1} />
      <Dot x={1} y={2} /><Dot x={2} y={2} /><Dot x={3} y={2} /><Dot x={4} y={2} /><Dot x={5} y={2} />
      <Dot x={0} y={3} /><Dot x={1} y={3} /><Dot x={2} y={3} /><Dot x={3} y={3} /><Dot x={4} y={3} /><Dot x={5} y={3} /><Dot x={6} y={3} />
      <Dot x={1} y={4} /><Dot x={2} y={4} /><Dot x={3} y={4} /><Dot x={4} y={4} /><Dot x={5} y={4} />
      <Dot x={2} y={5} /><Dot x={3} y={5} /><Dot x={4} y={5} />
      <Dot x={3} y={6} />
    </svg>
  )
}

// Sliders/mixer icon
export function SlidersIcon({ size = 16, color = 'currentColor', className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill={color} className={className}>
      <Dot x={1} y={1} /><Dot x={3} y={1} /><Dot x={5} y={1} />
      <Dot x={1} y={2} /><Dot x={3} y={2} /><Dot x={5} y={2} />
      <Dot x={0} y={3} /><Dot x={1} y={3} /><Dot x={2} y={3} /><Dot x={3} y={3} /><Dot x={5} y={3} />
      <Dot x={1} y={4} /><Dot x={3} y={4} /><Dot x={4} y={4} /><Dot x={5} y={4} /><Dot x={6} y={4} />
      <Dot x={1} y={5} /><Dot x={3} y={5} /><Dot x={5} y={5} />
      <Dot x={1} y={6} /><Dot x={3} y={6} /><Dot x={5} y={6} />
    </svg>
  )
}

// Zap/lightning icon
export function ZapIcon({ size = 16, color = 'currentColor', className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill={color} className={className}>
      <Dot x={4} y={0} /><Dot x={5} y={0} />
      <Dot x={3} y={1} /><Dot x={4} y={1} />
      <Dot x={2} y={2} /><Dot x={3} y={2} /><Dot x={4} y={2} /><Dot x={5} y={2} /><Dot x={6} y={2} />
      <Dot x={3} y={3} /><Dot x={4} y={3} />
      <Dot x={2} y={4} /><Dot x={3} y={4} />
      <Dot x={1} y={5} /><Dot x={2} y={5} />
      <Dot x={1} y={6} />
    </svg>
  )
}

// Eye icon
export function EyeIcon({ size = 16, color = 'currentColor', className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill={color} className={className}>
      <Dot x={2} y={1} /><Dot x={3} y={1} /><Dot x={4} y={1} />
      <Dot x={1} y={2} /><Dot x={3} y={2} /><Dot x={5} y={2} />
      <Dot x={0} y={3} /><Dot x={2} y={3} /><Dot x={3} y={3} /><Dot x={4} y={3} /><Dot x={6} y={3} />
      <Dot x={1} y={4} /><Dot x={3} y={4} /><Dot x={5} y={4} />
      <Dot x={2} y={5} /><Dot x={3} y={5} /><Dot x={4} y={5} />
    </svg>
  )
}

// Camera icon
export function CameraIcon({ size = 16, color = 'currentColor', className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill={color} className={className}>
      <Dot x={2} y={0} /><Dot x={3} y={0} /><Dot x={4} y={0} />
      <Dot x={0} y={1} /><Dot x={1} y={1} /><Dot x={2} y={1} /><Dot x={3} y={1} /><Dot x={4} y={1} /><Dot x={5} y={1} /><Dot x={6} y={1} />
      <Dot x={0} y={2} /><Dot x={3} y={2} /><Dot x={6} y={2} />
      <Dot x={0} y={3} /><Dot x={2} y={3} /><Dot x={3} y={3} /><Dot x={4} y={3} /><Dot x={6} y={3} />
      <Dot x={0} y={4} /><Dot x={3} y={4} /><Dot x={6} y={4} />
      <Dot x={0} y={5} /><Dot x={1} y={5} /><Dot x={2} y={5} /><Dot x={3} y={5} /><Dot x={4} y={5} /><Dot x={5} y={5} /><Dot x={6} y={5} />
    </svg>
  )
}

// Folder icon
export function FolderIcon({ size = 16, color = 'currentColor', className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill={color} className={className}>
      <Dot x={0} y={1} /><Dot x={1} y={1} /><Dot x={2} y={1} />
      <Dot x={0} y={2} /><Dot x={1} y={2} /><Dot x={2} y={2} /><Dot x={3} y={2} /><Dot x={4} y={2} /><Dot x={5} y={2} /><Dot x={6} y={2} />
      <Dot x={0} y={3} /><Dot x={6} y={3} />
      <Dot x={0} y={4} /><Dot x={6} y={4} />
      <Dot x={0} y={5} /><Dot x={6} y={5} />
      <Dot x={0} y={6} /><Dot x={1} y={6} /><Dot x={2} y={6} /><Dot x={3} y={6} /><Dot x={4} y={6} /><Dot x={5} y={6} /><Dot x={6} y={6} />
    </svg>
  )
}

// Download icon
export function DownloadIcon({ size = 16, color = 'currentColor', className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill={color} className={className}>
      <Dot x={3} y={0} />
      <Dot x={3} y={1} />
      <Dot x={3} y={2} />
      <Dot x={1} y={3} /><Dot x={2} y={3} /><Dot x={3} y={3} /><Dot x={4} y={3} /><Dot x={5} y={3} />
      <Dot x={2} y={4} /><Dot x={3} y={4} /><Dot x={4} y={4} />
      <Dot x={3} y={5} />
      <Dot x={0} y={6} /><Dot x={1} y={6} /><Dot x={2} y={6} /><Dot x={3} y={6} /><Dot x={4} y={6} /><Dot x={5} y={6} /><Dot x={6} y={6} />
    </svg>
  )
}

// Upload icon
export function UploadIcon({ size = 16, color = 'currentColor', className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill={color} className={className}>
      <Dot x={3} y={0} />
      <Dot x={2} y={1} /><Dot x={3} y={1} /><Dot x={4} y={1} />
      <Dot x={1} y={2} /><Dot x={2} y={2} /><Dot x={3} y={2} /><Dot x={4} y={2} /><Dot x={5} y={2} />
      <Dot x={3} y={3} />
      <Dot x={3} y={4} />
      <Dot x={3} y={5} />
      <Dot x={0} y={6} /><Dot x={1} y={6} /><Dot x={2} y={6} /><Dot x={3} y={6} /><Dot x={4} y={6} /><Dot x={5} y={6} /><Dot x={6} y={6} />
    </svg>
  )
}

// Plus icon
export function PlusIcon({ size = 16, color = 'currentColor', className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill={color} className={className}>
      <Dot x={3} y={1} />
      <Dot x={3} y={2} />
      <Dot x={1} y={3} /><Dot x={2} y={3} /><Dot x={3} y={3} /><Dot x={4} y={3} /><Dot x={5} y={3} />
      <Dot x={3} y={4} />
      <Dot x={3} y={5} />
    </svg>
  )
}

// Minus icon
export function MinusIcon({ size = 16, color = 'currentColor', className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill={color} className={className}>
      <Dot x={1} y={3} /><Dot x={2} y={3} /><Dot x={3} y={3} /><Dot x={4} y={3} /><Dot x={5} y={3} />
    </svg>
  )
}

// X/Close icon
export function CloseIcon({ size = 16, color = 'currentColor', className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill={color} className={className}>
      <Dot x={1} y={1} /><Dot x={5} y={1} />
      <Dot x={2} y={2} /><Dot x={4} y={2} />
      <Dot x={3} y={3} />
      <Dot x={2} y={4} /><Dot x={4} y={4} />
      <Dot x={1} y={5} /><Dot x={5} y={5} />
    </svg>
  )
}

// Check icon
export function CheckIcon({ size = 16, color = 'currentColor', className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill={color} className={className}>
      <Dot x={6} y={1} />
      <Dot x={5} y={2} />
      <Dot x={4} y={3} />
      <Dot x={0} y={4} /><Dot x={3} y={4} />
      <Dot x={1} y={5} /><Dot x={2} y={5} />
    </svg>
  )
}

// Arrow up icon
export function ArrowUpIcon({ size = 16, color = 'currentColor', className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill={color} className={className}>
      <Dot x={3} y={0} />
      <Dot x={2} y={1} /><Dot x={3} y={1} /><Dot x={4} y={1} />
      <Dot x={1} y={2} /><Dot x={3} y={2} /><Dot x={5} y={2} />
      <Dot x={3} y={3} />
      <Dot x={3} y={4} />
      <Dot x={3} y={5} />
      <Dot x={3} y={6} />
    </svg>
  )
}

// Arrow down icon
export function ArrowDownIcon({ size = 16, color = 'currentColor', className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill={color} className={className}>
      <Dot x={3} y={0} />
      <Dot x={3} y={1} />
      <Dot x={3} y={2} />
      <Dot x={3} y={3} />
      <Dot x={1} y={4} /><Dot x={3} y={4} /><Dot x={5} y={4} />
      <Dot x={2} y={5} /><Dot x={3} y={5} /><Dot x={4} y={5} />
      <Dot x={3} y={6} />
    </svg>
  )
}

// Arrow left icon
export function ArrowLeftIcon({ size = 16, color = 'currentColor', className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill={color} className={className}>
      <Dot x={2} y={3} />
      <Dot x={1} y={2} /><Dot x={1} y={3} /><Dot x={1} y={4} />
      <Dot x={0} y={3} />
      <Dot x={2} y={1} /><Dot x={2} y={5} />
      <Dot x={3} y={3} /><Dot x={4} y={3} /><Dot x={5} y={3} /><Dot x={6} y={3} />
    </svg>
  )
}

// Arrow right icon
export function ArrowRightIcon({ size = 16, color = 'currentColor', className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill={color} className={className}>
      <Dot x={0} y={3} /><Dot x={1} y={3} /><Dot x={2} y={3} /><Dot x={3} y={3} />
      <Dot x={4} y={1} /><Dot x={4} y={5} />
      <Dot x={5} y={2} /><Dot x={5} y={3} /><Dot x={5} y={4} />
      <Dot x={6} y={3} />
    </svg>
  )
}
