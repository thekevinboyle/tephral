export type BlendMode = 'normal' | 'add' | 'multiply' | 'screen' | 'difference' | 'overlay'

export interface EffectConfig {
  id: string
  name: string
  enabled: boolean
  blendMode: BlendMode
  mix: number // 0-1
  parameters: Record<string, number | boolean | string>
}

export interface EffectModule {
  id: string
  name: string
  defaultParameters: Record<string, number | boolean | string>
}
