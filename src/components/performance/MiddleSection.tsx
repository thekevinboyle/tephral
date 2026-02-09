import { HorizontalCrossfader } from './HorizontalCrossfader'

export function MiddleSection() {
  return (
    <div className="h-full flex items-center px-3 panel-gradient-up">
      <div className="flex-1">
        <HorizontalCrossfader />
      </div>
    </div>
  )
}
