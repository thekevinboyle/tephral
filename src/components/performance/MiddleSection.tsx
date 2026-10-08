import { HorizontalCrossfader } from './HorizontalCrossfader'

/** Crossfader row at the foot of the browser: Dry · track · Wet (the ends are labelled text buttons). */
export function MiddleSection() {
  return (
    <div className="h-full flex items-center px-1 panel-gradient-up">
      <div className="flex-1 min-w-0">
        <HorizontalCrossfader />
      </div>
    </div>
  )
}
