import { useState, useEffect, useRef, memo } from 'react'

interface TypewriterTextProps {
  text: string
  speed?: number
  showCursor?: boolean
  className?: string
  style?: React.CSSProperties
}

export const TypewriterText = memo(function TypewriterText({
  text,
  speed = 30,
  showCursor = true,
  className,
  style,
}: TypewriterTextProps) {
  const [displayed, setDisplayed] = useState('')
  const [done, setDone] = useState(false)
  const prevText = useRef(text)

  useEffect(() => {
    // Reset on text change
    if (text !== prevText.current) {
      setDisplayed('')
      setDone(false)
      prevText.current = text
    }

    let i = 0
    setDisplayed('')
    setDone(false)

    const interval = setInterval(() => {
      i++
      if (i <= text.length) {
        setDisplayed(text.slice(0, i))
      } else {
        setDone(true)
        clearInterval(interval)
      }
    }, speed)

    return () => clearInterval(interval)
  }, [text, speed])

  return (
    <span className={className} style={style}>
      {displayed}
      {showCursor && (
        <span style={{
          display: 'inline-block',
          width: '1ch',
          height: '1em',
          backgroundColor: done ? 'var(--text-ghost)' : 'var(--text-muted)',
          marginLeft: 1,
          verticalAlign: 'text-bottom',
          animation: done ? 'hud-typewriter-cursor 1s step-end infinite' : undefined,
        }} />
      )}
    </span>
  )
})
