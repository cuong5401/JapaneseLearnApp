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

export function migrateCards(cards: Record<string, SrsCard>): Record<string, SrsCard> {
  const out: Record<string, SrsCard> = {}
  for (const [id, card] of Object.entries(cards)) {
    const to = migrateRadicalId(id)
    if (!to) continue
    const have = out[to]
    // hai id cũ cùng trỏ một bộ (亻 và 人): giữ thẻ ôn gần nhất
    if (!have || (card.lastReviewed ?? 0) > (have.lastReviewed ?? 0)) out[to] = { ...card, id: to }
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

const PREFIX = 'jla:v1:'
const DONE_KEY = PREFIX + 'migrations'
export const RADICAL_MIGRATION = 'radical-kangxi'

function read(key: string): unknown {
  const raw = localStorage.getItem(PREFIX + key)
  return raw ? JSON.parse(raw) : null
}

/** Chạy một lần mỗi máy; lỗi (localStorage bị chặn, JSON hỏng) thì bỏ qua, app vẫn chạy. */
export function runMigrations(): void {
  try {
    const done = (JSON.parse(localStorage.getItem(DONE_KEY) ?? '[]') as string[]) ?? []
    if (done.includes(RADICAL_MIGRATION)) return
    const cards = read('cards') as Record<string, SrsCard> | null
    if (cards && typeof cards === 'object') localStorage.setItem(PREFIX + 'cards', JSON.stringify(migrateCards(cards)))
    const nb = read('notebooks') as NotebookState | null
    if (nb && typeof nb === 'object' && nb.items && typeof nb.items === 'object') {
      localStorage.setItem(PREFIX + 'notebooks', JSON.stringify(migrateNotebooks(nb)))
    }
    localStorage.setItem(DONE_KEY, JSON.stringify([...done, RADICAL_MIGRATION]))
  } catch {
    // bỏ qua
  }
}
