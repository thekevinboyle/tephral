import * as RadixToggle from '@radix-ui/react-toggle'

interface ToggleProps {
  label: string
  pressed: boolean
  onPressedChange: (pressed: boolean) => void
}

export function Toggle({ label, pressed, onPressedChange }: ToggleProps) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="label">{label}</span>
      <RadixToggle.Root
        className={`w-8 h-4 border ${
          pressed
            ? 'bg-accent-red border-accent-red'
            : 'bg-transparent border-muted'
        }`}
        pressed={pressed}
        onPressedChange={onPressedChange}
      >
        <span className="sr-only">{label}</span>
      </RadixToggle.Root>
    </div>
  )
}
