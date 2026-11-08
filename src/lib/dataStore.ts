import type { DataManifest } from '../types'
import { PUBLIC_BUILD, isGrammarId } from './edition'

/**
 * Kho dữ liệu học tải từ public/data.
 *  - Không import JSON vào bundle: mỗi file được fetch khi lần đầu cần.
 *  - Cache trong bộ nhớ theo `path@hash` (hash lấy từ manifest), URL kèm `?v=hash`
 *    để trình duyệt tự cache và tự tải lại khi dữ liệu đổi.
 *  - Trạng thái từng file (loading / ready / error) được phát cho React qua subscribe.
 */

export type LoadStatus = 'loading' | 'ready' | 'error'

export interface ResourceState {
  status: LoadStatus
  data?: unknown
  error?: string
}

type Fetcher = (url: string) => Promise<Pick<Response, 'ok' | 'status' | 'json'>>

const BASE = `${import.meta.env.BASE_URL ?? '/'}data/`
export const MANIFEST = 'manifest.json'

let fetcher: Fetcher = (url) => fetch(url)
const resources = new Map<string, ResourceState>()
const inflight = new Map<string, Promise<unknown>>()
const listeners = new Set<() => void>()
let version = 0

function setState(key: string, state: ResourceState) {
  resources.set(key, state)
  version++
  listeners.forEach((l) => l())
}

async function fetchJSON<T>(url: string): Promise<T> {
  const res = await fetcher(url)
  if (!res.ok) throw new Error(`Máy chủ trả lỗi ${res.status} khi tải ${url}`)
  return (await res.json()) as T
}

/** Gộp các lần gọi trùng nhau; lỗi thì bỏ khỏi cache để lần sau thử lại được. */
function once<T>(key: string, run: () => Promise<T>): Promise<T> {
  let p = inflight.get(key) as Promise<T> | undefined
  if (!p) {
    p = run().catch((e) => {
      inflight.delete(key)
      throw e
    })
    inflight.set(key, p)
  }
  return p
}

export function loadManifest(): Promise<DataManifest> {
  // Manifest luôn hỏi lại máy chủ (no-cache) để thấy hash mới khi dữ liệu được cập nhật.
  return once(MANIFEST, () => fetchJSON<DataManifest>(`${BASE}${MANIFEST}?t=${Date.now()}`))
}

export async function loadFile<T>(path: string): Promise<T> {
  const manifest = await loadManifest()
  const file = manifest.files.find((f) => f.path === path)
  if (!file) throw new Error(`Không tìm thấy ${path} trong manifest`)
  return once(`${path}@${file.hash}`, () => fetchJSON<T>(`${BASE}${path}?v=${file.hash}`))
}

/**
 * Bắt đầu tải một tài nguyên (key = MANIFEST hoặc đường dẫn file) nếu chưa có.
 * `force` dùng cho nút "Thử lại" sau khi lỗi.
 */
export function request(key: string, force = false): void {
  const current = resources.get(key)
  if (current && !(force && current.status === 'error')) return
  setState(key, { status: 'loading' })
  const p = key === MANIFEST ? loadManifest() : loadFile(key)
  p.then(
    (data) => setState(key, { status: 'ready', data }),
    (e: unknown) => setState(key, { status: 'error', error: e instanceof Error ? e.message : String(e) }),
  )
}

export const dataStore = {
  subscribe(listener: () => void) {
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  },
  getVersion: () => version,
  get: (key: string) => resources.get(key),
}

/* ---------- Tra cứu theo ID ---------- */

const PREFIX_PATH: Record<string, string> = {
  n5: 'vocab/n5.json',
  n4: 'vocab/n4.json',
  n3: 'vocab/n3.json',
  n2: 'vocab/n2.json',
  n1: 'vocab/n1.json',
  cp: 'vocab/compounds.json',
  ono: 'vocab/onomatopoeia.json',
  adv: 'vocab/adverbs.json',
  kj: 'kanji/kanji.json',
  gn5: 'grammar/n5.json',
  gn4: 'grammar/n4.json',
  gn3: 'grammar/n3.json',
  gn2: 'grammar/n2.json',
  gn1: 'grammar/n1.json',
}

/** ID dữ liệu public/data có dạng `<tiền tố>-<8 ký tự hex>`. */
const DATA_ID = /^([a-z]+\d?)-[0-9a-f]{8}$/

/** File chứa mục có ID này, hoặc null nếu ID không thuộc public/data (thuật ngữ có sẵn, ID cũ…). */
export function pathForId(id: string): string | null {
  const m = DATA_ID.exec(id)
  // Bản public không có file ngữ pháp: coi ID ngữ pháp như không tồn tại (bỏ qua, không báo lỗi tải).
  if (!m || (PUBLIC_BUILD && isGrammarId(id))) return null
  return PREFIX_PATH[m[1]] ?? null
}

const indexes = new WeakMap<readonly { id: string }[], Map<string, { id: string }>>()

/** Bảng id → mục, dựng một lần cho mỗi mảng dữ liệu. */
export function indexById<T extends { id: string }>(items: readonly T[]): Map<string, T> {
  let map = indexes.get(items) as Map<string, T> | undefined
  if (!map) {
    map = new Map(items.map((it) => [it.id, it]))
    indexes.set(items, map as Map<string, { id: string }>)
  }
  return map
}

/** Chỉ dùng trong test. */
export const __testing = {
  setFetcher(f: Fetcher) {
    fetcher = f
  },
  reset() {
    resources.clear()
    inflight.clear()
    version = 0
  },
}
