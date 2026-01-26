interface MinimalToggleProps {
  label: string
  pressed: boolean
  onPressedChange: (pressed: boolean) => void
}

export function MinimalToggle({ label, pressed, onPressedChange }: MinimalToggleProps) {
  return (
    <button
      onClick={() => onPressedChange(!pressed)}
      className="flex items-center justify-between py-2 w-full group"
    >
      <span className="text-xs uppercase text-muted group-hover:text-base-light">
        {label}
      </span>
      <div
        className={`w-8 h-4 rounded-full transition-colors relative ${
          pressed ? 'bg-accent-yellow' : 'bg-muted/30'
        }`}
      >
        <div
          className={`absolute top-0.5 w-3 h-3 rounded-full bg-base-light transition-transform ${
            pressed ? 'translate-x-4' : 'translate-x-0.5'
          }`}
        />
      </div>
    </button>
  )
}
