import { create } from 'zustand'

// ============================================================================
// Types
// ============================================================================

export interface DataField {
  id: string
  label: string
  value: string
  visible: boolean
  isAuto?: boolean  // true for auto-computed fields like duration
}

export type Template = 'watermark' | 'statsBar' | 'titleCard' | 'socialCard'
export type FontFamily = 'mono' | 'sans' | 'serif'
export type WatermarkPosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'

export interface DataOverlayStyle {
  fontSize: number    // 12-48, default 16
  color: string       // hex, default '#ffffff'
  opacity: number     // 0-1, default 1
  font: FontFamily    // default 'sans'
}

export interface DataOverlayState {
  enabled: boolean
  template: Template
  fields: DataField[]
  style: DataOverlayStyle
  watermarkPosition: WatermarkPosition

  // Actions
  setEnabled: (enabled: boolean) => void
  setTemplate: (template: Template) => void
  updateField: (id: string, updates: Partial<DataField>) => void
  setFieldValue: (id: string, value: string) => void
  toggleFieldVisibility: (id: string) => void
  setStyle: (style: Partial<DataOverlayStyle>) => void
  setWatermarkPosition: (position: WatermarkPosition) => void
  reset: () => void
}

// ============================================================================
// Template Defaults
// ============================================================================

const TEMPLATE_FIELDS: Record<Template, DataField[]> = {
  watermark: [
    { id: 'text', label: 'Text', value: 'SEG_F4ULT', visible: true },
  ],
  statsBar: [
    { id: 'title', label: 'Title', value: '', visible: true },
    { id: 'duration', label: 'Duration', value: '', visible: true, isAuto: true },
    { id: 'date', label: 'Date', value: '', visible: true, isAuto: true },
    { id: 'custom', label: 'Custom', value: '', visible: false },
  ],
  titleCard: [
    { id: 'title', label: 'Title', value: '', visible: true },
    { id: 'subtitle', label: 'Subtitle', value: '', visible: true },
  ],
  socialCard: [
    { id: 'title', label: 'Title', value: '', visible: true },
    { id: 'subtitle', label: 'Subtitle', value: '', visible: true },
    { id: 'duration', label: 'Duration', value: '', visible: true, isAuto: true },
    { id: 'effectCount', label: 'Effects', value: '', visible: true, isAuto: true },
    { id: 'branding', label: 'Branding', value: 'Made with SEG_F4ULT', visible: true },
  ],
}

// ============================================================================
// Default Values
// ============================================================================

const DEFAULT_STYLE: DataOverlayStyle = {
  fontSize: 16,
  color: '#ffffff',
  opacity: 1,
  font: 'sans',
}

const DEFAULT_STATE = {
  enabled: false,
  template: 'watermark' as Template,
  fields: [...TEMPLATE_FIELDS.watermark],
  style: { ...DEFAULT_STYLE },
  watermarkPosition: 'bottom-right' as WatermarkPosition,
}

// ============================================================================
// Store Implementation
// ============================================================================

export const useDataOverlayStore = create<DataOverlayState>((set) => ({
  ...DEFAULT_STATE,

  setEnabled: (enabled) => set({ enabled }),

  setTemplate: (template) => set({
    template,
    fields: TEMPLATE_FIELDS[template].map((field) => ({ ...field })),
  }),

  updateField: (id, updates) => set((state) => ({
    fields: state.fields.map((field) =>
      field.id === id ? { ...field, ...updates } : field
    ),
  })),

  setFieldValue: (id, value) => set((state) => ({
    fields: state.fields.map((field) =>
      field.id === id ? { ...field, value } : field
    ),
  })),

  toggleFieldVisibility: (id) => set((state) => ({
    fields: state.fields.map((field) =>
      field.id === id ? { ...field, visible: !field.visible } : field
    ),
  })),

  setStyle: (styleUpdates) => set((state) => ({
    style: {
      ...state.style,
      ...styleUpdates,
      // Clamp values to valid ranges
      fontSize: styleUpdates.fontSize !== undefined
        ? Math.max(12, Math.min(48, styleUpdates.fontSize))
        : state.style.fontSize,
      opacity: styleUpdates.opacity !== undefined
        ? Math.max(0, Math.min(1, styleUpdates.opacity))
        : state.style.opacity,
    },
  })),

  setWatermarkPosition: (position) => set({ watermarkPosition: position }),

  reset: () => set({
    ...DEFAULT_STATE,
    fields: TEMPLATE_FIELDS.watermark.map((field) => ({ ...field })),
    style: { ...DEFAULT_STYLE },
  }),
}))
