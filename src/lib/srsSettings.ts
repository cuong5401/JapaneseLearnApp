import { useSyncExternalStore } from 'react'
import type { SchedulerSettings } from './srs'
import { readJSON, writeJSON } from './storage'

/** Cài đặt ôn tập (localStorage `jla:v1:srs-settings`, có trong Xuất/Nhập tiến độ). */
export interface SrsSettings extends SchedulerSettings {
  /** Số thẻ Mới tối đa mỗi ngày ở trang Ôn tập */
  newPerDay: number
  /** Số lượt ôn (thẻ Ôn tập) tối đa mỗi ngày */
  reviewsPerDay: number
}

export const SRS_DEFAULTS: SrsSettings = { retention: 0.9, maxInterval: 365, fuzz: true, newPerDay: 20, reviewsPerDay: 200 }

export const RETENTION_RANGE = [0.8, 0.95] as const

const num = (v: unknown, min: number, max: number, def: number) =>
  typeof v === 'number' && Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : def

/** Gộp dữ liệu bất kỳ lên mặc định, kẹp giá trị vào khoảng hợp lệ. */
export function sanitizeSrsSettings(raw: unknown): SrsSettings {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Partial<SrsSettings>
  const out: SrsSettings = {
    retention: Math.round(num(r.retention, RETENTION_RANGE[0], RETENTION_RANGE[1], SRS_DEFAULTS.retention) * 100) / 100,
    maxInterval: Math.round(num(r.maxInterval, 7, 36500, SRS_DEFAULTS.maxInterval)),
    fuzz: typeof r.fuzz === 'boolean' ? r.fuzz : SRS_DEFAULTS.fuzz,
    newPerDay: Math.round(num(r.newPerDay, 0, 9999, SRS_DEFAULTS.newPerDay)),
    reviewsPerDay: Math.round(num(r.reviewsPerDay, 0, 99999, SRS_DEFAULTS.reviewsPerDay)),
  }
  if (Array.isArray(r.w) && r.w.length >= 17 && r.w.every((x) => typeof x === 'number' && Number.isFinite(x))) out.w = [...r.w]
  return out
}

let settings = sanitizeSrsSettings(readJSON<unknown>('srs-settings', null))
const listeners = new Set<() => void>()

function save(next: SrsSettings) {
  settings = next
  writeJSON('srs-settings', settings)
  listeners.forEach((l) => l())
}

export const srsSettings = {
  subscribe(l: () => void) {
    listeners.add(l)
    return () => {
      listeners.delete(l)
    }
  },
  getSnapshot: () => settings,
  set(patch: Partial<SrsSettings>) {
    save(sanitizeSrsSettings({ ...settings, ...patch }))
  },
  replace(next: unknown) {
    save(sanitizeSrsSettings(next))
  },
}

export const useSrsSettings = () => useSyncExternalStore(srsSettings.subscribe, srsSettings.getSnapshot)
