import type { SrsCard } from '../types'
import { sanitizeAiWords, type AiWordItem } from './aiWords'
import { sanitizeChecked, type CheckedMap } from './grammarChecked'
import { isKanaStat, type KanaStat } from './kanaProgress'
import { sanitizeState, type NotebookState } from './notebooks'
import { LESSON_SIZES, type LessonSize } from './lessons'

/**
 * Xuất / nhập tiến độ ra file .json để chuyển giữa các máy (máy tính ↔ điện thoại).
 * Định dạng có `app` và `version` để sau này đổi cấu trúc vẫn đọc được bản cũ.
 */
export interface Backup {
  app: 'kotonoha'
  version: 1
  exportedAt: string
  cards: Record<string, SrsCard>
  lessonSize?: LessonSize
  /** Mức thuộc kana (từ bản có Luyện kana mới; file cũ không có) */
  kana?: Record<string, KanaStat>
  /** Sổ tay (chỉ id mục, không chép dữ liệu) */
  notebooks?: NotebookState
  /** Mẫu ngữ pháp tự soạn đã bấm "Đã kiểm tra" */
  grammarChecked?: CheckedMap
  /** Từ "Hỏi AI" gợi ý đã lưu (để mục sổ tay aw-… còn dữ liệu ở máy khác). Không bao giờ chứa API key. */
  aiWords?: Record<string, AiWordItem>
}

export function createBackup(
  cards: Record<string, SrsCard>,
  lessonSize: LessonSize,
  kana: Record<string, KanaStat> = {},
  now = new Date(),
  notebooks?: NotebookState,
  grammarChecked?: CheckedMap,
  aiWords?: Record<string, AiWordItem>,
): Backup {
  return { app: 'kotonoha', version: 1, exportedAt: now.toISOString(), cards, lessonSize, kana, notebooks, grammarChecked, aiWords }
}

export function backupFileName(now = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `kotonoha-tien-do-${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}.json`
}

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)

function toCard(id: string, v: unknown): SrsCard | null {
  if (!v || typeof v !== 'object') return null
  const c = v as Partial<SrsCard>
  if (c.id !== id || !isNum(c.ease) || !isNum(c.interval) || !isNum(c.repetitions) || !isNum(c.due)) return null
  return {
    id,
    ease: c.ease,
    interval: c.interval,
    repetitions: c.repetitions,
    due: c.due,
    lastReviewed: isNum(c.lastReviewed) ? c.lastReviewed : 0,
  }
}

export type ParseResult = { ok: true; backup: Backup; skipped: number } | { ok: false; error: string }

/** Đọc nội dung file; thẻ hỏng bị bỏ qua (đếm trong `skipped`), file sai định dạng thì báo lỗi. */
export function parseBackup(text: string): ParseResult {
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    return { ok: false, error: 'File không phải JSON hợp lệ.' }
  }
  if (!raw || typeof raw !== 'object' || (raw as Backup).app !== 'kotonoha') {
    return { ok: false, error: 'Đây không phải file tiến độ của Kotonoha.' }
  }
  const b = raw as Partial<Backup>
  if (b.version !== 1) return { ok: false, error: `Không đọc được file tiến độ phiên bản ${String(b.version)}.` }
  if (!b.cards || typeof b.cards !== 'object' || Array.isArray(b.cards)) {
    return { ok: false, error: 'File tiến độ không có danh sách thẻ.' }
  }

  const cards: Record<string, SrsCard> = {}
  let skipped = 0
  for (const [id, v] of Object.entries(b.cards)) {
    const card = toCard(id, v)
    if (card) cards[id] = card
    else skipped++
  }
  const kana: Record<string, KanaStat> = {}
  if (b.kana && typeof b.kana === 'object' && !Array.isArray(b.kana)) {
    for (const [id, v] of Object.entries(b.kana)) {
      if (isKanaStat(v)) kana[id] = { right: v.right, wrong: v.wrong, streak: v.streak, last: v.last }
      else skipped++
    }
  }
  const lessonSize = (LESSON_SIZES as readonly number[]).includes(b.lessonSize as number) ? b.lessonSize : undefined
  return {
    ok: true,
    skipped,
    backup: { app: 'kotonoha', version: 1, exportedAt: String(b.exportedAt ?? ''), cards, lessonSize, kana, notebooks: sanitizeState(b.notebooks) ?? undefined,
      grammarChecked: sanitizeChecked(b.grammarChecked) ?? undefined,
      aiWords: sanitizeAiWords(b.aiWords) ?? undefined,
    },
  }
}

export interface MergeResult {
  cards: Record<string, SrsCard>
  /** Thẻ chỉ có trong file */
  added: number
  /** Thẻ có ở cả hai nơi, bản trong file mới hơn */
  updated: number
}

/** Gộp: mỗi thẻ giữ bản được ôn gần nhất (lastReviewed lớn hơn). Không xóa thẻ đang có. */
export function mergeCards(current: Record<string, SrsCard>, incoming: Record<string, SrsCard>): MergeResult {
  const cards = { ...current }
  let added = 0
  let updated = 0
  for (const [id, card] of Object.entries(incoming)) {
    const mine = cards[id]
    if (!mine) {
      cards[id] = card
      added++
    } else if (card.lastReviewed > mine.lastReviewed) {
      cards[id] = card
      updated++
    }
  }
  return { cards, added, updated }
}
