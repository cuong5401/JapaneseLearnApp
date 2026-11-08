import type { AiProvider, ProviderId } from './types'

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
      { id: 'gemini-3.8-flash', label: 'Gemini 3.8 Flash (mặc định)', vision: true },
      { id: 'gemini-3.5-flash-lite', label: 'Gemini 3.5 Flash-Lite (nhanh, rẻ)', vision: true },
    ],
    keyHint: 'Tạo key miễn phí ở Google AI Studio → Get API key.',
    keyUrl: 'https://aistudio.google.com/apikey',
  },
  {
    id: 'claude',
    name: 'Claude (Anthropic)',
    defaultModel: 'claude-haiku-5-5',
    models: [
      { id: 'claude-haiku-5-5', label: 'Claude Haiku 5.5 (mặc định, nhanh)', vision: true },
      { id: 'claude-sonnet-5-5', label: 'Claude Sonnet 5.5', vision: true },
      { id: 'claude-opus-5-5', label: 'Claude Opus 5.5', vision: true },
    ],
    keyHint: 'Tạo key ở Anthropic Console → API Keys (cần nạp credit).',
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
  throw new Error('Nhà cung cấp không hợp lệ')
}
