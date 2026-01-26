import * as RadixSlider from '@radix-ui/react-slider'
import { useState } from 'react'

interface SliderProps {
  label: string
  value: number
  min: number
  max: number
  step?: number
  onChange: (value: number) => void
}

export function Slider({ label, value, min, max, step = 0.01, onChange }: SliderProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [inputValue, setInputValue] = useState(String(value))

  const handleInputSubmit = () => {
    const parsed = parseFloat(inputValue)
    if (!isNaN(parsed)) {
      onChange(Math.max(min, Math.min(max, parsed)))
    }
    setIsEditing(false)
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between items-center">
        <span className="label">{label}</span>
        {isEditing ? (
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onBlur={handleInputSubmit}
            onKeyDown={(e) => e.key === 'Enter' && handleInputSubmit()}
            className="w-16 bg-transparent border border-muted px-1 text-sm text-right focus:outline-none focus:border-accent-yellow"
            autoFocus
          />
        ) : (
          <span
            className="value cursor-pointer hover:text-accent-yellow"
            onClick={() => {
              setInputValue(String(value.toFixed(3)))
              setIsEditing(true)
            }}
          >
            {value.toFixed(3)}
          </span>
        )}
      </div>
      <RadixSlider.Root
        className="relative flex items-center h-5 w-full select-none touch-none"
        value={[value]}
        min={min}
        max={max}
        step={step}
        onValueChange={([v]) => onChange(v)}
      >
        <RadixSlider.Track className="relative grow h-[2px] bg-muted">
          <RadixSlider.Range className="absolute h-full bg-accent-yellow" />
        </RadixSlider.Track>
        <RadixSlider.Thumb className="block w-3 h-3 bg-base-light border border-muted hover:bg-accent-yellow focus:outline-none" />
      </RadixSlider.Root>
    </div>
  )
}
