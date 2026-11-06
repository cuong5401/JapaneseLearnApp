import type { SrsCard } from '../types'

const PREFIX = 'jla:v1:'

export function readJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(PREFIX + key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

export function writeJSON(key: string, value: unknown): void {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value))
  } catch {
    // Bộ nhớ đầy hoặc bị chặn: bỏ qua, ứng dụng vẫn chạy trong phiên hiện tại.
  }
}

/**
 * Nơi lưu tiến độ. Giai đoạn sau chỉ cần viết một bản cài đặt khác
 * (ví dụ Supabase) theo cùng interface này.
 */
export interface ProgressStore {
  load(): Record<string, SrsCard>
  save(cards: Record<string, SrsCard>): void
}

export const localProgressStore: ProgressStore = {
  load: () => readJSON<Record<string, SrsCard>>('cards', {}),
  save: (cards) => writeJSON('cards', cards),
}
