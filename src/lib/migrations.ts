import type { SrsCard } from '../types'
import RADICAL_MAP from '../data/radical-id-migration.json'
import type { NotebookState } from './notebooks'

/**
 * Bộ thủ trước đây đánh số theo thứ tự dòng Excel (rd-036 = 大…); nay theo số Khang Hy (rd-037 = 大).
 * Ánh xạ số cũ -> số mới do scripts/convert_xlsx.py sinh (src/data/radical-id-migration.json).
 * Id cũ không có trong ánh xạ (dòng không phải bộ thủ) bị bỏ, vì số đó giờ là một bộ khác.
 *
 * Module này KHÔNG import store nào: main.tsx import nó đầu tiên để chạy trước khi store đọc localStorage.
 */
const MAP = RADICAL_MAP as Record<string, number>
const RD = /^rd-(\d{3})$/
const pad = (n: number) => `rd-${String(n).padStart(3, '0')}`

/** Id mới cho một id bất kỳ: id không phải bộ thủ giữ nguyên, bộ thủ không còn thì null. */
export function migrateRadicalId(id: string): string | null {
  const m = RD.exec(id)
  if (!m) return id
  const to = MAP[String(Number(m[1]))]
  return to ? pad(to) : null
}

/** Thẻ SM-2 cũ (trước khi chuyển sang FSRS). */
export interface Sm2Card {
  id: string
  ease: number
  interval: number
  repetitions: number
  due: number
  lastReviewed: number
}

type AnyCard = (SrsCard | Sm2Card) & { id: string }
const reviewedAt = (c: AnyCard) => ('last_review' in c ? c.last_review : c.lastReviewed) ?? 0

export function migrateCards<C extends AnyCard>(cards: Record<string, C>): Record<string, C> {
  const out: Record<string, C> = {}
  for (const [id, card] of Object.entries(cards)) {
    const to = migrateRadicalId(id)
    if (!to) continue
    const have = out[to]
    // hai id cũ cùng trỏ một bộ (亻 và 人): giữ thẻ ôn gần nhất
    if (!have || reviewedAt(card) > reviewedAt(have)) out[to] = { ...card, id: to }
  }
  return out
}

export function migrateNotebooks(s: NotebookState): NotebookState {
  const items: NotebookState['items'] = {}
  for (const [book, list] of Object.entries(s.items)) {
    const seen = new Set<string>()
    items[book] = []
    for (const it of list) {
      const ref = migrateRadicalId(it.ref)
      if (!ref || seen.has(ref)) continue
      seen.add(ref)
      items[book].push({ ...it, ref })
    }
  }
  return { ...s, items }
}

/* ───────────── SM-2 → FSRS ───────────── */

export const isSm2Card = (c: unknown): c is Sm2Card =>
  !!c && typeof c === 'object' && typeof (c as Sm2Card).ease === 'number' && typeof (c as Sm2Card).interval === 'number'

/** Độ khó FSRS (1–10) từ hệ số dễ SM-2: 1.3 → 9, 2.5 → 5, ≥ 3.0 → 3, nội suy tuyến tính. */
export function easeToDifficulty(ease: number): number {
  const e = Math.max(1.3, ease)
  const d = e <= 2.5 ? 9 - ((e - 1.3) / 1.2) * 4 : 5 - ((Math.min(e, 3) - 2.5) / 0.5) * 2
  return Math.round(Math.min(10, Math.max(1, d)) * 100) / 100
}

/**
 * Đổi thẻ SM-2 sang FSRS, không mất tiến độ: thẻ đã ôn → Ôn tập (stability ≈ interval cũ, tối thiểu 0.5 ngày;
 * độ khó từ ease; giữ due, số lượt, lần ôn gần nhất); thẻ chưa ôn → Mới. SM-2 không lưu số lần quên nên lapses = 0.
 */
export function sm2ToFsrs(c: Sm2Card): SrsCard {
  const reviewed = c.lastReviewed > 0
  return {
    id: c.id,
    due: c.due,
    stability: reviewed ? Math.max(0.5, c.interval) : 0,
    difficulty: reviewed ? easeToDifficulty(c.ease) : 0,
    elapsed_days: reviewed ? c.interval : 0,
    scheduled_days: reviewed ? c.interval : 0,
    reps: c.repetitions,
    lapses: 0,
    state: reviewed ? 2 : 0,
    last_review: reviewed ? c.lastReviewed : 0,
    learning_steps: 0,
  }
}

/** Đổi cả kho thẻ; thẻ đã ở dạng FSRS giữ nguyên. */
export function cardsToFsrs(cards: Record<string, unknown>): Record<string, SrsCard> {
  const out: Record<string, SrsCard> = {}
  for (const [id, c] of Object.entries(cards)) {
    if (isSm2Card(c)) out[id] = sm2ToFsrs({ ...c, id })
    else if (c && typeof c === 'object' && typeof (c as SrsCard).stability === 'number') out[id] = c as SrsCard
  }
  return out
}

const PREFIX = 'jla:v1:'
const DONE_KEY = PREFIX + 'migrations'
export const RADICAL_MIGRATION = 'radical-kangxi'
export const FSRS_MIGRATION = 'fsrs'

function read(key: string): unknown {
  const raw = localStorage.getItem(PREFIX + key)
  return raw ? JSON.parse(raw) : null
}

/** Chạy một lần mỗi máy; lỗi (localStorage bị chặn, JSON hỏng) thì bỏ qua, app vẫn chạy. */
export function runMigrations(): void {
  try {
    const done = (JSON.parse(localStorage.getItem(DONE_KEY) ?? '[]') as string[]) ?? []
    if (!done.includes(RADICAL_MIGRATION)) {
      const cards = read('cards') as Record<string, AnyCard> | null
      if (cards && typeof cards === 'object') localStorage.setItem(PREFIX + 'cards', JSON.stringify(migrateCards(cards)))
      const nb = read('notebooks') as NotebookState | null
      if (nb && typeof nb === 'object' && nb.items && typeof nb.items === 'object') {
        localStorage.setItem(PREFIX + 'notebooks', JSON.stringify(migrateNotebooks(nb)))
      }
      done.push(RADICAL_MIGRATION)
      localStorage.setItem(DONE_KEY, JSON.stringify(done))
    }
    if (!done.includes(FSRS_MIGRATION)) {
      const cards = read('cards') as Record<string, unknown> | null
      if (cards && typeof cards === 'object') localStorage.setItem(PREFIX + 'cards', JSON.stringify(cardsToFsrs(cards)))
      done.push(FSRS_MIGRATION)
      localStorage.setItem(DONE_KEY, JSON.stringify(done))
    }
  } catch {
    // bỏ qua
  }
}
