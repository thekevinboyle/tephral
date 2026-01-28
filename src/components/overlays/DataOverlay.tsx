/**
 * DataOverlay.tsx
 * HTML/CSS overlay for rendering text and data templates over video
 * Supports watermark, stats bar, title card, and social card layouts
 */

import { useMemo } from 'react'
import {
  useDataOverlayStore,
  type DataOverlayState,
  type DataField,
  type Template,
  type FontFamily,
  type WatermarkPosition,
  type DataOverlayStyle,
} from '../../stores/dataOverlayStore'
import { useRecordingStore } from '../../stores/recordingStore'
import { useGlitchEngineStore } from '../../stores/glitchEngineStore'

// ============================================================================
// Props
// ============================================================================

interface DataOverlayProps {
  width: number
  height: number
}

// ============================================================================
// Helpers
// ============================================================================

const FONT_MAP: Record<FontFamily, string> = {
  mono: "'JetBrains Mono', 'Fira Code', 'Consolas', monospace",
  sans: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
  serif: "Georgia, 'Times New Roman', serif",
}

function getFontFamily(font: FontFamily): string {
  return FONT_MAP[font]
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
}

function formatDate(): string {
  const now = new Date()
  return now.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

interface GlitchEffectStates {
  rgbSplitEnabled: boolean
  blockDisplaceEnabled: boolean
  scanLinesEnabled: boolean
  noiseEnabled: boolean
  pixelateEnabled: boolean
  edgeDetectionEnabled: boolean
  chromaticAberrationEnabled: boolean
  vhsTrackingEnabled: boolean
  lensDistortionEnabled: boolean
  ditherEnabled: boolean
  posterizeEnabled: boolean
  staticDisplacementEnabled: boolean
  colorGradeEnabled: boolean
  feedbackLoopEnabled: boolean
}

function countEnabledEffects(glitchStore: GlitchEffectStates): number {
  let count = 0
  if (glitchStore.rgbSplitEnabled) count++
  if (glitchStore.blockDisplaceEnabled) count++
  if (glitchStore.scanLinesEnabled) count++
  if (glitchStore.noiseEnabled) count++
  if (glitchStore.pixelateEnabled) count++
  if (glitchStore.edgeDetectionEnabled) count++
  if (glitchStore.chromaticAberrationEnabled) count++
  if (glitchStore.vhsTrackingEnabled) count++
  if (glitchStore.lensDistortionEnabled) count++
  if (glitchStore.ditherEnabled) count++
  if (glitchStore.posterizeEnabled) count++
  if (glitchStore.staticDisplacementEnabled) count++
  if (glitchStore.colorGradeEnabled) count++
  if (glitchStore.feedbackLoopEnabled) count++
  return count
}

function getFieldValue(
  field: DataField,
  duration: number,
  effectCount: number
): string {
  if (!field.isAuto) return field.value

  switch (field.id) {
    case 'duration':
      return formatDuration(duration)
    case 'date':
      return formatDate()
    case 'effectCount':
      return String(effectCount)
    default:
      return field.value
  }
}

function getWatermarkPositionStyle(position: WatermarkPosition): React.CSSProperties {
  switch (position) {
    case 'top-left':
      return { top: 16, left: 16 }
    case 'top-right':
      return { top: 16, right: 16 }
    case 'bottom-left':
      return { bottom: 16, left: 16 }
    case 'bottom-right':
      return { bottom: 16, right: 16 }
    default:
      return { bottom: 16, right: 16 }
  }
}

// ============================================================================
// Template Components
// ============================================================================

interface TemplateProps {
  fields: DataField[]
  style: DataOverlayStyle
  watermarkPosition: WatermarkPosition
  duration: number
  effectCount: number
}

function WatermarkTemplate({ fields, style, watermarkPosition, duration, effectCount }: TemplateProps) {
  const textField = fields.find((f) => f.id === 'text')
  if (!textField?.visible) return null

  const value = getFieldValue(textField, duration, effectCount)
  if (!value) return null

  return (
    <div
      className="absolute"
      style={{
        ...getWatermarkPositionStyle(watermarkPosition),
        fontFamily: getFontFamily(style.font),
        fontSize: style.fontSize,
        color: style.color,
        opacity: style.opacity,
      }}
    >
      <span
        style={{
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          padding: '4px 12px',
          borderRadius: '999px',
          display: 'inline-block',
        }}
      >
        {value}
      </span>
    </div>
  )
}

function StatsBarTemplate({ fields, style, duration, effectCount }: TemplateProps) {
  const visibleFields = fields.filter((f) => f.visible)
  if (visibleFields.length === 0) return null

  const fieldValues = visibleFields
    .map((f) => {
      const value = getFieldValue(f, duration, effectCount)
      return value || null
    })
    .filter(Boolean)

  if (fieldValues.length === 0) return null

  return (
    <div
      className="absolute left-0 right-0 bottom-0"
      style={{
        fontFamily: getFontFamily(style.font),
        fontSize: style.fontSize,
        color: style.color,
        opacity: style.opacity,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        padding: '8px 16px',
      }}
    >
      <div className="flex items-center justify-center gap-2">
        {fieldValues.map((value, idx) => (
          <span key={idx} className="flex items-center gap-2">
            {idx > 0 && <span style={{ opacity: 0.5 }}>|</span>}
            <span>{value}</span>
          </span>
        ))}
      </div>
    </div>
  )
}

function TitleCardTemplate({ fields, style, duration, effectCount }: TemplateProps) {
  const titleField = fields.find((f) => f.id === 'title')
  const subtitleField = fields.find((f) => f.id === 'subtitle')

  const titleValue = titleField?.visible ? getFieldValue(titleField, duration, effectCount) : null
  const subtitleValue = subtitleField?.visible ? getFieldValue(subtitleField, duration, effectCount) : null

  if (!titleValue && !subtitleValue) return null

  return (
    <div
      className="absolute inset-0 flex flex-col items-center justify-center text-center"
      style={{
        fontFamily: getFontFamily(style.font),
        color: style.color,
        opacity: style.opacity,
      }}
    >
      {titleValue && (
        <div
          style={{
            fontSize: style.fontSize * 2,
            fontWeight: 700,
            textShadow: '2px 2px 8px rgba(0, 0, 0, 0.8), 0 0 20px rgba(0, 0, 0, 0.5)',
            marginBottom: subtitleValue ? 8 : 0,
          }}
        >
          {titleValue}
        </div>
      )}
      {subtitleValue && (
        <div
          style={{
            fontSize: style.fontSize * 1.2,
            fontWeight: 400,
            textShadow: '1px 1px 4px rgba(0, 0, 0, 0.8), 0 0 10px rgba(0, 0, 0, 0.5)',
            opacity: 0.9,
          }}
        >
          {subtitleValue}
        </div>
      )}
    </div>
  )
}

function SocialCardTemplate({ fields, style, duration, effectCount }: TemplateProps) {
  const titleField = fields.find((f) => f.id === 'title')
  const subtitleField = fields.find((f) => f.id === 'subtitle')
  const durationField = fields.find((f) => f.id === 'duration')
  const effectCountField = fields.find((f) => f.id === 'effectCount')
  const brandingField = fields.find((f) => f.id === 'branding')

  const titleValue = titleField?.visible ? getFieldValue(titleField, duration, effectCount) : null
  const subtitleValue = subtitleField?.visible ? getFieldValue(subtitleField, duration, effectCount) : null
  const durationValue = durationField?.visible ? getFieldValue(durationField, duration, effectCount) : null
  const effectCountValue = effectCountField?.visible ? getFieldValue(effectCountField, duration, effectCount) : null
  const brandingValue = brandingField?.visible ? getFieldValue(brandingField, duration, effectCount) : null

  // Check if any content is visible
  const hasContent = titleValue || subtitleValue || durationValue || effectCountValue || brandingValue
  if (!hasContent) return null

  return (
    <div
      className="absolute"
      style={{
        bottom: 24,
        left: 24,
        fontFamily: getFontFamily(style.font),
        color: style.color,
        opacity: style.opacity,
      }}
    >
      <div
        style={{
          backgroundColor: 'rgba(0, 0, 0, 0.75)',
          borderRadius: 12,
          padding: '16px 20px',
          minWidth: 200,
          backdropFilter: 'blur(8px)',
        }}
      >
        {/* Title and Subtitle */}
        {(titleValue || subtitleValue) && (
          <div style={{ marginBottom: (durationValue || effectCountValue) ? 12 : 0 }}>
            {titleValue && (
              <div
                style={{
                  fontSize: style.fontSize * 1.25,
                  fontWeight: 600,
                  marginBottom: subtitleValue ? 4 : 0,
                }}
              >
                {titleValue}
              </div>
            )}
            {subtitleValue && (
              <div
                style={{
                  fontSize: style.fontSize * 0.875,
                  opacity: 0.7,
                }}
              >
                {subtitleValue}
              </div>
            )}
          </div>
        )}

        {/* Stats Row */}
        {(durationValue || effectCountValue) && (
          <div
            className="flex gap-4"
            style={{
              fontSize: style.fontSize,
              marginBottom: brandingValue ? 12 : 0,
            }}
          >
            {durationValue && (
              <div className="flex items-center gap-2">
                <span style={{ opacity: 0.6 }}>Duration</span>
                <span style={{ fontWeight: 600 }}>{durationValue}</span>
              </div>
            )}
            {effectCountValue && (
              <div className="flex items-center gap-2">
                <span style={{ opacity: 0.6 }}>Effects</span>
                <span style={{ fontWeight: 600 }}>{effectCountValue}</span>
              </div>
            )}
          </div>
        )}

        {/* Branding */}
        {brandingValue && (
          <div
            style={{
              fontSize: style.fontSize * 0.75,
              opacity: 0.5,
              borderTop: '1px solid rgba(255, 255, 255, 0.1)',
              paddingTop: 8,
              marginTop: 4,
            }}
          >
            {brandingValue}
          </div>
        )}
      </div>
    </div>
  )
}

// ============================================================================
// Main Component
// ============================================================================

export function DataOverlay(_props: DataOverlayProps) {
  const store = useDataOverlayStore()
  const recordingStore = useRecordingStore()
  const glitchStore = useGlitchEngineStore()

  const duration = recordingStore.duration
  const effectCount = useMemo(() => countEnabledEffects(glitchStore), [
    glitchStore.rgbSplitEnabled,
    glitchStore.blockDisplaceEnabled,
    glitchStore.scanLinesEnabled,
    glitchStore.noiseEnabled,
    glitchStore.pixelateEnabled,
    glitchStore.edgeDetectionEnabled,
    glitchStore.chromaticAberrationEnabled,
    glitchStore.vhsTrackingEnabled,
    glitchStore.lensDistortionEnabled,
    glitchStore.ditherEnabled,
    glitchStore.posterizeEnabled,
    glitchStore.staticDisplacementEnabled,
    glitchStore.colorGradeEnabled,
    glitchStore.feedbackLoopEnabled,
  ])

  // Don't render if not enabled
  if (!store.enabled) return null

  const templateProps: TemplateProps = {
    fields: store.fields,
    style: store.style,
    watermarkPosition: store.watermarkPosition,
    duration,
    effectCount,
  }

  return (
    <div
      className="absolute inset-0 pointer-events-none overflow-hidden"
      style={{ zIndex: 30 }}
    >
      {store.template === 'watermark' && <WatermarkTemplate {...templateProps} />}
      {store.template === 'statsBar' && <StatsBarTemplate {...templateProps} />}
      {store.template === 'titleCard' && <TitleCardTemplate {...templateProps} />}
      {store.template === 'socialCard' && <SocialCardTemplate {...templateProps} />}
    </div>
  )
}

// ============================================================================
// Canvas Export Function
// ============================================================================

interface CanvasRenderContext {
  fields: DataField[]
  style: DataOverlayStyle
  template: Template
  watermarkPosition: WatermarkPosition
  duration: number
  effectCount: number
}

function getCanvasFieldValue(
  field: DataField,
  duration: number,
  effectCount: number
): string {
  if (!field.isAuto) return field.value

  switch (field.id) {
    case 'duration':
      return formatDuration(duration)
    case 'date':
      return formatDate()
    case 'effectCount':
      return String(effectCount)
    default:
      return field.value
  }
}

function getCanvasFontFamily(font: FontFamily): string {
  switch (font) {
    case 'mono':
      return 'JetBrains Mono, Consolas, monospace'
    case 'sans':
      return 'system-ui, sans-serif'
    case 'serif':
      return 'Georgia, serif'
    default:
      return 'system-ui, sans-serif'
  }
}

function renderWatermarkToCanvas(
  ctx: CanvasRenderingContext2D,
  context: CanvasRenderContext,
  width: number,
  height: number
): void {
  const textField = context.fields.find((f) => f.id === 'text')
  if (!textField?.visible) return

  const value = getCanvasFieldValue(textField, context.duration, context.effectCount)
  if (!value) return

  const { style, watermarkPosition } = context
  const padding = 12
  const verticalPadding = 4
  const margin = 16

  ctx.font = `${style.fontSize}px ${getCanvasFontFamily(style.font)}`
  ctx.textBaseline = 'middle'

  const textMetrics = ctx.measureText(value)
  const textWidth = textMetrics.width
  const textHeight = style.fontSize

  // Calculate position
  let x: number
  let y: number

  switch (watermarkPosition) {
    case 'top-left':
      x = margin
      y = margin + textHeight / 2 + verticalPadding
      break
    case 'top-right':
      x = width - margin - textWidth - padding * 2
      y = margin + textHeight / 2 + verticalPadding
      break
    case 'bottom-left':
      x = margin
      y = height - margin - textHeight / 2 - verticalPadding
      break
    case 'bottom-right':
    default:
      x = width - margin - textWidth - padding * 2
      y = height - margin - textHeight / 2 - verticalPadding
      break
  }

  // Draw pill background
  ctx.globalAlpha = style.opacity
  ctx.fillStyle = 'rgba(0, 0, 0, 0.5)'
  const pillWidth = textWidth + padding * 2
  const pillHeight = textHeight + verticalPadding * 2
  const pillRadius = pillHeight / 2

  ctx.beginPath()
  ctx.roundRect(x, y - pillHeight / 2, pillWidth, pillHeight, pillRadius)
  ctx.fill()

  // Draw text
  ctx.fillStyle = style.color
  ctx.fillText(value, x + padding, y)
  ctx.globalAlpha = 1
}

function renderStatsBarToCanvas(
  ctx: CanvasRenderingContext2D,
  context: CanvasRenderContext,
  width: number,
  height: number
): void {
  const visibleFields = context.fields.filter((f) => f.visible)
  if (visibleFields.length === 0) return

  const fieldValues = visibleFields
    .map((f) => getCanvasFieldValue(f, context.duration, context.effectCount))
    .filter(Boolean)

  if (fieldValues.length === 0) return

  const { style } = context
  const barHeight = style.fontSize + 16
  const barY = height - barHeight

  // Draw background
  ctx.globalAlpha = style.opacity
  ctx.fillStyle = 'rgba(0, 0, 0, 0.6)'
  ctx.fillRect(0, barY, width, barHeight)

  // Draw text
  ctx.font = `${style.fontSize}px ${getCanvasFontFamily(style.font)}`
  ctx.fillStyle = style.color
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  const text = fieldValues.join(' | ')
  ctx.fillText(text, width / 2, barY + barHeight / 2)

  ctx.globalAlpha = 1
  ctx.textAlign = 'left'
}

function renderTitleCardToCanvas(
  ctx: CanvasRenderingContext2D,
  context: CanvasRenderContext,
  width: number,
  height: number
): void {
  const titleField = context.fields.find((f) => f.id === 'title')
  const subtitleField = context.fields.find((f) => f.id === 'subtitle')

  const titleValue = titleField?.visible
    ? getCanvasFieldValue(titleField, context.duration, context.effectCount)
    : null
  const subtitleValue = subtitleField?.visible
    ? getCanvasFieldValue(subtitleField, context.duration, context.effectCount)
    : null

  if (!titleValue && !subtitleValue) return

  const { style } = context
  ctx.globalAlpha = style.opacity
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  const centerX = width / 2
  const centerY = height / 2

  if (titleValue) {
    const titleFontSize = style.fontSize * 2
    ctx.font = `bold ${titleFontSize}px ${getCanvasFontFamily(style.font)}`
    ctx.fillStyle = style.color
    ctx.shadowColor = 'rgba(0, 0, 0, 0.8)'
    ctx.shadowBlur = 8
    ctx.shadowOffsetX = 2
    ctx.shadowOffsetY = 2

    const titleY = subtitleValue ? centerY - style.fontSize : centerY
    ctx.fillText(titleValue, centerX, titleY)
  }

  if (subtitleValue) {
    const subtitleFontSize = style.fontSize * 1.2
    ctx.font = `${subtitleFontSize}px ${getCanvasFontFamily(style.font)}`
    ctx.fillStyle = style.color
    ctx.shadowColor = 'rgba(0, 0, 0, 0.8)'
    ctx.shadowBlur = 4
    ctx.shadowOffsetX = 1
    ctx.shadowOffsetY = 1

    const subtitleY = titleValue ? centerY + style.fontSize * 1.5 : centerY
    ctx.fillText(subtitleValue, centerX, subtitleY)
  }

  // Reset shadow
  ctx.shadowColor = 'transparent'
  ctx.shadowBlur = 0
  ctx.shadowOffsetX = 0
  ctx.shadowOffsetY = 0
  ctx.globalAlpha = 1
  ctx.textAlign = 'left'
}

function renderSocialCardToCanvas(
  ctx: CanvasRenderingContext2D,
  context: CanvasRenderContext,
  _width: number,
  height: number
): void {
  const titleField = context.fields.find((f) => f.id === 'title')
  const subtitleField = context.fields.find((f) => f.id === 'subtitle')
  const durationField = context.fields.find((f) => f.id === 'duration')
  const effectCountField = context.fields.find((f) => f.id === 'effectCount')
  const brandingField = context.fields.find((f) => f.id === 'branding')

  const titleValue = titleField?.visible
    ? getCanvasFieldValue(titleField, context.duration, context.effectCount)
    : null
  const subtitleValue = subtitleField?.visible
    ? getCanvasFieldValue(subtitleField, context.duration, context.effectCount)
    : null
  const durationValue = durationField?.visible
    ? getCanvasFieldValue(durationField, context.duration, context.effectCount)
    : null
  const effectCountValue = effectCountField?.visible
    ? getCanvasFieldValue(effectCountField, context.duration, context.effectCount)
    : null
  const brandingValue = brandingField?.visible
    ? getCanvasFieldValue(brandingField, context.duration, context.effectCount)
    : null

  const hasContent = titleValue || subtitleValue || durationValue || effectCountValue || brandingValue
  if (!hasContent) return

  const { style } = context
  const cardX = 24
  const cardY = height - 24
  const cardPadding = 16
  const cardWidth = 220
  let cardHeight = cardPadding * 2

  // Calculate card height
  if (titleValue) cardHeight += style.fontSize * 1.25 + 4
  if (subtitleValue) cardHeight += style.fontSize * 0.875 + 8
  if (durationValue || effectCountValue) cardHeight += style.fontSize + 8
  if (brandingValue) cardHeight += style.fontSize * 0.75 + 16

  const cardTop = cardY - cardHeight

  ctx.globalAlpha = style.opacity

  // Draw card background
  ctx.fillStyle = 'rgba(0, 0, 0, 0.75)'
  ctx.beginPath()
  ctx.roundRect(cardX, cardTop, cardWidth, cardHeight, 12)
  ctx.fill()

  // Draw content
  let currentY = cardTop + cardPadding

  ctx.textAlign = 'left'
  ctx.textBaseline = 'top'
  ctx.fillStyle = style.color

  // Title
  if (titleValue) {
    ctx.font = `600 ${style.fontSize * 1.25}px ${getCanvasFontFamily(style.font)}`
    ctx.fillText(titleValue, cardX + cardPadding, currentY, cardWidth - cardPadding * 2)
    currentY += style.fontSize * 1.25 + 4
  }

  // Subtitle
  if (subtitleValue) {
    ctx.globalAlpha = style.opacity * 0.7
    ctx.font = `${style.fontSize * 0.875}px ${getCanvasFontFamily(style.font)}`
    ctx.fillText(subtitleValue, cardX + cardPadding, currentY, cardWidth - cardPadding * 2)
    currentY += style.fontSize * 0.875 + 12
    ctx.globalAlpha = style.opacity
  }

  // Stats row
  if (durationValue || effectCountValue) {
    ctx.font = `${style.fontSize}px ${getCanvasFontFamily(style.font)}`
    let statsX = cardX + cardPadding

    if (durationValue) {
      ctx.globalAlpha = style.opacity * 0.6
      ctx.fillText('Duration ', statsX, currentY)
      statsX += ctx.measureText('Duration ').width
      ctx.globalAlpha = style.opacity
      ctx.font = `600 ${style.fontSize}px ${getCanvasFontFamily(style.font)}`
      ctx.fillText(durationValue, statsX, currentY)
      statsX += ctx.measureText(durationValue).width + 16
    }

    if (effectCountValue) {
      ctx.font = `${style.fontSize}px ${getCanvasFontFamily(style.font)}`
      ctx.globalAlpha = style.opacity * 0.6
      ctx.fillText('Effects ', statsX, currentY)
      statsX += ctx.measureText('Effects ').width
      ctx.globalAlpha = style.opacity
      ctx.font = `600 ${style.fontSize}px ${getCanvasFontFamily(style.font)}`
      ctx.fillText(effectCountValue, statsX, currentY)
    }

    currentY += style.fontSize + 12
  }

  // Branding
  if (brandingValue) {
    // Draw separator line
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(cardX + cardPadding, currentY - 4)
    ctx.lineTo(cardX + cardWidth - cardPadding, currentY - 4)
    ctx.stroke()

    ctx.globalAlpha = style.opacity * 0.5
    ctx.font = `${style.fontSize * 0.75}px ${getCanvasFontFamily(style.font)}`
    ctx.fillText(brandingValue, cardX + cardPadding, currentY + 4, cardWidth - cardPadding * 2)
  }

  ctx.globalAlpha = 1
}

/**
 * Renders the data overlay to a canvas context for video export
 */
export function renderDataOverlayToCanvas(
  ctx: CanvasRenderingContext2D,
  state: DataOverlayState,
  width: number,
  height: number,
  options?: {
    duration?: number
    effectCount?: number
  }
): void {
  if (!state.enabled) return

  const context: CanvasRenderContext = {
    fields: state.fields,
    style: state.style,
    template: state.template,
    watermarkPosition: state.watermarkPosition,
    duration: options?.duration ?? 0,
    effectCount: options?.effectCount ?? 0,
  }

  switch (state.template) {
    case 'watermark':
      renderWatermarkToCanvas(ctx, context, width, height)
      break
    case 'statsBar':
      renderStatsBarToCanvas(ctx, context, width, height)
      break
    case 'titleCard':
      renderTitleCardToCanvas(ctx, context, width, height)
      break
    case 'socialCard':
      renderSocialCardToCanvas(ctx, context, width, height)
      break
  }
}
