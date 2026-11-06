import type { SrsCard } from '../types'
import { isMastered } from './srs'

export const LESSON_SIZES = [20, 30, 50] as const
export type LessonSize = (typeof LESSON_SIZES)[number]

/** Chia danh sách thành các bài liên tiếp, giữ nguyên thứ tự. */
export function splitLessons<T>(items: readonly T[], size: number): T[][] {
  if (size < 1) throw new Error('Số từ mỗi bài phải lớn hơn 0')
  const out: T[][] = []
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size))
  return out
}

export const lessonCount = (total: number, size: number) => Math.ceil(total / size)

/** Bài (bắt đầu từ 0) chứa mục ở vị trí `index`. */
export const lessonIndexOf = (index: number, size: number) => Math.floor(index / size)

export type LessonState = 'new' | 'learning' | 'mastered'

export interface LessonProgress {
  total: number
  learned: number
  mastered: number
  state: LessonState
  /** Lần ôn gần nhất của bất kỳ thẻ nào trong bài (0 nếu chưa học) */
  lastReviewed: number
}

export function lessonProgress(ids: readonly string[], cards: Record<string, SrsCard>): LessonProgress {
  let learned = 0
  let mastered = 0
  let lastReviewed = 0
  for (const id of ids) {
    const c = cards[id]
    if (!c) continue
    learned++
    if (isMastered(c)) mastered++
    lastReviewed = Math.max(lastReviewed, c.lastReviewed)
  }
  const state: LessonState = learned === 0 ? 'new' : mastered === ids.length ? 'mastered' : 'learning'
  return { total: ids.length, learned, mastered, state, lastReviewed }
}

/**
 * Bài nên "Học tiếp": bài dở dang (đã học ít nhất một từ, chưa thuộc hết) được học gần nhất;
 * nếu không có thì bài đầu tiên chưa học; nếu đã thuộc hết thì bài đầu tiên.
 */
export function continueLesson(progress: readonly LessonProgress[]): number {
  let best = -1
  for (let i = 0; i < progress.length; i++) {
    const p = progress[i]
    if (p.state !== 'learning') continue
    if (best === -1 || p.lastReviewed > progress[best].lastReviewed) best = i
  }
  if (best !== -1) return best
  const firstNew = progress.findIndex((p) => p.state === 'new')
  return firstNew === -1 ? 0 : firstNew
}
