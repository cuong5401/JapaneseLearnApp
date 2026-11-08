import { useSyncExternalStore } from 'react'
import { LEVELS, type Level } from '../../types'
import { readJSON, writeJSON } from '../storage'
import { PROVIDERS } from './providers'
import type { ProviderId } from './types'

/**
 * Cài đặt AI. API key lưu RIÊNG ở `jla:ai-key:<provider>` trong localStorage của máy này:
 *  - không nằm trong store này (snapshot chỉ biết "có key hay không"),
 *  - không vào file Xuất tiến độ (backup.ts chỉ lấy các khóa nó biết),
 *  - không được log hay đưa vào thông báo lỗi.
 */
export interface AiSettings {
  provider: ProviderId
  models: Record<'gemini' | 'claude', string>
  level: Level
}

export interface AiSettingsState extends AiSettings {
  /** Có key cho nhà cung cấp đang chọn (mock không cần key). */
  hasKey: boolean
}

const KEY_PREFIX = 'jla:ai-key:'
const DEFAULTS: AiSettings = {
  provider: 'gemini',
  models: { gemini: PROVIDERS[0].defaultModel, claude: PROVIDERS[1].defaultModel },
  level: 'N2',
}

function sanitize(raw: unknown): AiSettings {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Partial<AiSettings>
  const provider: ProviderId = r.provider === 'claude' || r.provider === 'gemini' || (r.provider === 'mock' && import.meta.env.DEV) ? r.provider : DEFAULTS.provider
  const str = (v: unknown, d: string) => (typeof v === 'string' && v.trim() ? v.trim() : d)
  return {
    provider,
    models: { gemini: str(r.models?.gemini, DEFAULTS.models.gemini), claude: str(r.models?.claude, DEFAULTS.models.claude) },
    level: LEVELS.includes(r.level as Level) ? (r.level as Level) : DEFAULTS.level,
  }
}

function readKey(provider: ProviderId): string {
  if (provider === 'mock') return 'mock'
  try {
    return localStorage.getItem(KEY_PREFIX + provider) ?? ''
  } catch {
    return ''
  }
}

let settings = sanitize(readJSON<unknown>('ai-settings', null))
let state: AiSettingsState = { ...settings, hasKey: Boolean(readKey(settings.provider)) }
const listeners = new Set<() => void>()

function refresh() {
  state = { ...settings, hasKey: Boolean(readKey(settings.provider)) }
  listeners.forEach((l) => l())
}

function save(next: AiSettings) {
  settings = next
  writeJSON('ai-settings', settings)
  refresh()
}

export const aiSettings = {
  subscribe(l: () => void) {
    listeners.add(l)
    return () => {
      listeners.delete(l)
    }
  },
  getSnapshot: () => state,
  setProvider: (provider: ProviderId) => save({ ...settings, provider }),
  setModel: (provider: 'gemini' | 'claude', model: string) => save({ ...settings, models: { ...settings.models, [provider]: model.trim() || DEFAULTS.models[provider] } }),
  setLevel: (level: Level) => save({ ...settings, level }),
  /** Model đang dùng của nhà cung cấp đang chọn. */
  model: () => (settings.provider === 'mock' ? 'mock' : settings.models[settings.provider]),
  /** Chỉ gọi ngay trước khi gửi yêu cầu; không lưu vào state React. */
  key: () => readKey(settings.provider),
  hasKeyFor: (provider: ProviderId) => Boolean(readKey(provider)),
  setKey(provider: 'gemini' | 'claude', key: string) {
    try {
      if (key.trim()) localStorage.setItem(KEY_PREFIX + provider, key.trim())
      else localStorage.removeItem(KEY_PREFIX + provider)
    } catch {
      /* chế độ riêng tư: không lưu được */
    }
    refresh()
  },
  removeKey(provider: 'gemini' | 'claude') {
    aiSettings.setKey(provider, '')
  },
}

export const useAiSettings = () => useSyncExternalStore(aiSettings.subscribe, aiSettings.getSnapshot)
