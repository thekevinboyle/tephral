export function HudScanOverlay() {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 9999,
        overflow: 'hidden',
      }}
    >
      {/* Horizontal scan line — sweeps top to bottom */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          height: 1,
          backgroundColor: '#FFFFFF',
          opacity: 0.03,
          animation: 'hud-scan-line 8s linear infinite',
        }}
      />
    </div>
  )
}
