import { HorizontalCrossfader } from './HorizontalCrossfader'
import { ShapeMorpher } from '../ui/MicroVisuals'

export function MiddleSection() {
  return (
    <div className="h-full flex items-center px-3 panel-gradient-up">
      <ShapeMorpher value={0.5} size={20} color="var(--text-ghost)" className="opacity-15 mr-2 flex-shrink-0" />
      <div className="flex-1">
        <HorizontalCrossfader />
      </div>
      <ShapeMorpher value={1} size={20} color="var(--text-ghost)" className="opacity-15 ml-2 flex-shrink-0" />
    </div>
  )
}
