interface ColorGradeVizProps {
  saturation: number
  color: string
}

export function ColorGradeViz({ saturation }: ColorGradeVizProps) {
  const sat = saturation / 100

  return (
    <svg width="80" height="24" viewBox="0 0 80 24" className="rounded">
      {/* RGB curves */}
      <path
        d={`M 10,20 Q 25,${20 - sat * 8} 40,12 Q 55,${4 + sat * 4} 70,4`}
        fill="none"
        stroke="#ff4444"
        strokeWidth="1.5"
        opacity={0.7}
      />
      <path
        d={`M 10,20 Q 30,${18 - sat * 6} 40,12 Q 50,${6 + sat * 2} 70,4`}
        fill="none"
        stroke="#44ff44"
        strokeWidth="1.5"
        opacity={0.7}
      />
      <path
        d={`M 10,20 Q 35,${16 - sat * 4} 40,12 Q 45,${8} 70,4`}
        fill="none"
        stroke="#4444ff"
        strokeWidth="1.5"
        opacity={0.7}
      />
      {/* Diagonal guide */}
      <line x1="10" y1="20" x2="70" y2="4" stroke="#666" strokeWidth="0.5" opacity={0.3} />
    </svg>
  )
}
