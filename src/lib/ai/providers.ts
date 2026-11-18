import type { AiProvider, ProviderId } from './types'
import { t } from '../../i18n'

/** Thông tin nhà cung cấp cho trang Cài đặt (nhẹ, không kéo theo SDK). */
export interface ModelOption {
  id: string
  label: string
  /** Nhận ảnh (dùng cho "Nhờ AI đoán" chữ vẽ tay) */
  vision: boolean
}

export interface ProviderInfo {
  id: Exclude<ProviderId, 'mock'>
  name: string
  defaultModel: string
  models: ModelOption[]
  keyHint: string
  keyUrl: string
}

export const PROVIDERS: ProviderInfo[] = [
  {
    id: 'gemini',
    name: 'Gemini (Google)',
    defaultModel: 'gemini-3.8-flash',
    models: [
      { id: 'gemini-3.8-flash', get label() {
    return t('providers.gemini38Flash')
  }, vision: true },
      { id: 'gemini-3.5-flash-lite', get label() {
    return t('providers.gemini35Flash')
  }, vision: true },
    ],
    get keyHint() {
    return t('providers.taoKeyMienPhi')
  },
    keyUrl: 'https://aistudio.google.com/apikey',
  },
  {
    id: 'claude',
    name: 'Claude (Anthropic)',
    defaultModel: 'claude-haiku-5-5',
    models: [
      { id: 'claude-haiku-5-5', get label() {
    return t('providers.claudeHaiku55')
  }, vision: true },
      { id: 'claude-sonnet-5-5', label: 'Claude Sonnet 5.5', vision: true }, // i18n-ignore (tên model)
      { id: 'claude-opus-5-5', label: 'Claude Opus 5.5', vision: true }, // i18n-ignore (tên model)
    ],
    get keyHint() {
    return t('providers.taoKeyOAnthropic')
  },
    keyUrl: 'https://console.anthropic.com/settings/keys',
  },
]

export const providerInfo = (id: ProviderId) => PROVIDERS.find((p) => p.id === id)

/** Model gõ tay không có trong danh sách: coi như nhận ảnh (cả hai nhà cung cấp đều đa phương thức). */
export function modelSupportsImages(provider: ProviderId, model: string): boolean {
  if (provider === 'mock') return true
  return providerInfo(provider)?.models.find((m) => m.id === model)?.vision ?? true
}

/** Nạp provider khi cần: SDK Claude và mã gọi mạng không vào bundle chính. */
export async function loadProvider(id: ProviderId): Promise<AiProvider> {
  if (id === 'gemini') return (await import('./gemini')).gemini
  if (id === 'claude') return (await import('./claude')).claude
  if (import.meta.env.DEV) return (await import('./mock')).mock
  throw new Error(t('providers.nhaCungCapKhong'))
}
