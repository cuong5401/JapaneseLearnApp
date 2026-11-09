import type { SrsCard } from '../types'
import { sanitizeAiWords, type AiWordItem } from './aiWords'
import { sanitizeChecked, type CheckedMap } from './grammarChecked'
import { isKanaStat, type KanaStat } from './kanaProgress'
import { sanitizeState, type NotebookState } from './notebooks'
import { LESSON_SIZES, type LessonSize } from './lessons'
import { cardsToFsrs, migrateCards, migrateNotebooks } from './migrations'
import { sanitizeLog, type PackedLog } from './reviewLog'
import { sanitizeSrsSettings, type SrsSettings } from './srsSettings'

/**
 * Xuất / nhập tiến độ ra file .json để chuyển giữa các máy (máy tính ↔ điện thoại).
 * Định dạng có `app` và `version` để sau này đổi cấu trúc vẫn đọc được bản cũ.
 *  - version 1: thẻ SM-2 (ease / interval / repetitions) → khi nhập tự đổi sang FSRS.
 *  - version 2: thẻ FSRS + lịch sử ôn (`reviewLog`) + cài đặt ôn tập (`srsSettings`).
 */
export const BACKUP_VERSION = 2

export interface Backup {
  app: 'kotonoha'
  version: 2
  exportedAt: string
  cards: Record<string, SrsCard>
  /** Lịch sử ôn dạng nén (src/lib/reviewLog.ts) */
  reviewLog?: PackedLog
  /** Cài đặt ôn tập FSRS */
  srsSettings?: SrsSettings
  lessonSize?: LessonSize
  /** Mức thuộc kana (từ bản có Luyện kana mới; file cũ không có) */
  kana?: Record<string, KanaStat>
  /** Sổ tay (chỉ id mục, không chép dữ liệu) */
  notebooks?: NotebookState
  /** Mẫu ngữ pháp tự soạn đã bấm "Đã kiểm tra" */
  grammarChecked?: CheckedMap
  /** Từ "Hỏi AI" gợi ý đã lưu (để mục sổ tay aw-… còn dữ liệu ở máy khác). Không bao giờ chứa API key. */
  aiWords?: Record<string, AiWordItem>
  /** 'kangxi': id bộ thủ rd-NNN theo số Khang Hy. File cũ không có field này -> đổi id khi nhập. */
  radicalIds?: 'kangxi'
}

export function createBackup(
  cards: Record<string, SrsCard>,
  lessonSize: LessonSize,
  kana: Record<string, KanaStat> = {},
  now = new Date(),
  notebooks?: NotebookState,
  grammarChecked?: CheckedMap,
  aiWords?: Record<string, AiWordItem>,
  extra: { reviewLog?: PackedLog; srsSettings?: SrsSettings } = {},
): Backup {
  return {
    app: 'kotonoha',
    version: BACKUP_VERSION,
    exportedAt: now.toISOString(),
    cards,
    lessonSize,
    kana,
    notebooks,
    grammarChecked,
    aiWords,
    radicalIds: 'kangxi',
    reviewLog: extra.reviewLog,
    srsSettings: extra.srsSettings,
  }
}

export function backupFileName(now = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `kotonoha-tien-do-${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}.json`
}

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)

function toCard(id: string, v: unknown): SrsCard | null {
  if (!v || typeof v !== 'object') return null
  const c = v as Partial<SrsCard>
  const nums = [c.due, c.stability, c.difficulty, c.elapsed_days, c.scheduled_days, c.reps, c.lapses, c.learning_steps]
  if (c.id !== id || !nums.every(isNum) || ![0, 1, 2, 3].includes(c.state as number)) return null
  return {
    id,
    due: c.due!,
    stability: c.stability!,
    difficulty: c.difficulty!,
    elapsed_days: c.elapsed_days!,
    scheduled_days: c.scheduled_days!,
    reps: c.reps!,
    lapses: c.lapses!,
    state: c.state!,
    last_review: isNum(c.last_review) ? c.last_review : 0,
    learning_steps: c.learning_steps!,
  }
}

/** Thẻ SM-2 của file version 1: đủ trường thì đổi sang FSRS (migrations.sm2ToFsrs), hỏng thì bỏ. */
function toSm2(id: string, v: unknown): boolean {
  if (!v || typeof v !== 'object') return false
  const c = v as Record<string, unknown>
  return c.id === id && [c.ease, c.interval, c.repetitions, c.due].every(isNum)
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
  const b = raw as Omit<Partial<Backup>, 'version'> & { version?: number }
  if (b.version !== 1 && b.version !== 2) return { ok: false, error: `Không đọc được file tiến độ phiên bản ${String(b.version)}.` }
  if (!b.cards || typeof b.cards !== 'object' || Array.isArray(b.cards)) {
    return { ok: false, error: 'File tiến độ không có danh sách thẻ.' }
  }

  let cards: Record<string, SrsCard> = {}
  let skipped = 0
  if (b.version === 1) {
    // file SM-2 cũ: đổi sang FSRS như migration trên máy
    const sm2: Record<string, unknown> = {}
    for (const [id, v] of Object.entries(b.cards)) {
      if (toSm2(id, v)) sm2[id] = { lastReviewed: 0, ...(v as object) }
      else skipped++
    }
    cards = cardsToFsrs(sm2)
  } else {
    for (const [id, v] of Object.entries(b.cards)) {
      const card = toCard(id, v)
      if (card) cards[id] = card
      else skipped++
    }
  }
  const kana: Record<string, KanaStat> = {}
  if (b.kana && typeof b.kana === 'object' && !Array.isArray(b.kana)) {
    for (const [id, v] of Object.entries(b.kana)) {
      if (isKanaStat(v)) kana[id] = { right: v.right, wrong: v.wrong, streak: v.streak, last: v.last }
      else skipped++
    }
  }
  const lessonSize = (LESSON_SIZES as readonly number[]).includes(b.lessonSize as number) ? b.lessonSize : undefined
  const notebooks = sanitizeState(b.notebooks) ?? undefined
  // file xuất trước khi bộ thủ đổi sang số Khang Hy: đổi id rd-NNN như migration trên máy
  const old = b.radicalIds !== 'kangxi'
  return {
    ok: true,
    skipped,
    backup: { app: 'kotonoha', version: 2, exportedAt: String(b.exportedAt ?? ''),
      reviewLog: sanitizeLog(b.reviewLog) ?? undefined,
      srsSettings: b.srsSettings ? sanitizeSrsSettings(b.srsSettings) : undefined,
      cards: old ? migrateCards(cards) : cards, lessonSize, kana,
      notebooks: old && notebooks ? migrateNotebooks(notebooks) : notebooks,
      radicalIds: 'kangxi',
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

/** Gộp: mỗi thẻ giữ bản được ôn gần nhất (last_review lớn hơn). Không xóa thẻ đang có. */
export function mergeCards(current: Record<string, SrsCard>, incoming: Record<string, SrsCard>): MergeResult {
  const cards = { ...current }
  let added = 0
  let updated = 0
  for (const [id, card] of Object.entries(incoming)) {
    const mine = cards[id]
    if (!mine) {
      cards[id] = card
      added++
    } else if (card.last_review > mine.last_review) {
      cards[id] = card
      updated++
    }
  }
  return { cards, added, updated }
}
