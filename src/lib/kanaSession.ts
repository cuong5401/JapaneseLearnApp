import { KANA, confusables } from '../data/kana'
import type { KanaChar } from '../types'

/**
 * Logic phiên luyện kana, không phụ thuộc React để test được.
 *
 * Phiên gồm các "lượt" (slot) lập sẵn từ đầu. Mỗi lượt là một chữ; trả lời đúng thì lượt xong,
 * sai thì lượt đó được đưa lại vào hàng đợi cách 3–5 câu. Phiên kết thúc khi hàng đợi rỗng,
 * tức là mọi lượt (và do đó mọi chữ) đều đã được trả lời đúng ít nhất một lần.
 */

export type Rng = () => number

export type QuestionMode = 'typing' | 'choice' | 'reverse' | 'listen'
export type ModeChoice = QuestionMode | 'mixed'
/** 'each' = mỗi chữ đã chọn 1 lần */
export type CountChoice = 'each' | 20 | 50

export interface QueueItem {
  slot: number
  id: string
  /** Lượt này đã từng trả lời sai (câu hỏi lại) */
  retry: boolean
  mode: QuestionMode
}

export interface SessionState {
  queue: QueueItem[]
  /** Tổng số lượt lập sẵn */
  planned: number
  /** Số lượt đã xong (trả lời đúng) */
  done: number
  /** Lượt đúng ngay lần đầu */
  firstTry: number
  answers: number
  correct: number
  streak: number
  bestStreak: number
  /** id chữ → số lần sai trong phiên */
  mistakes: Record<string, number>
  /** Câu hỏi đã hiện (tăng mỗi lần chuyển câu, dùng làm key cho hiệu ứng) */
  step: number
}

export function shuffleWith<T>(items: readonly T[], rng: Rng): T[] {
  const a = [...items]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/** Sửa thứ tự để không có hai phần tử liền nhau cùng khóa (nếu làm được). */
export function spreadOut<T>(items: readonly T[], key: (t: T) => string): T[] {
  const out = [...items]
  for (let i = 1; i < out.length; i++) {
    if (key(out[i]) !== key(out[i - 1])) continue
    // Tìm phía sau một phần tử khác khóa, đổi chỗ mà không tạo cặp trùng mới.
    let j = i + 1
    while (j < out.length && (key(out[j]) === key(out[i - 1]) || (j + 1 < out.length && key(out[i]) === key(out[j + 1])))) j++
    if (j < out.length) {
      ;[out[i], out[j]] = [out[j], out[i]]
      continue
    }
    // Không có phía sau: thử chèn vào phía trước một chỗ hợp lệ.
    const [moved] = out.splice(i, 1)
    let placed = false
    for (let p = 0; p <= out.length; p++) {
      const before = out[p - 1]
      const after = out[p]
      if ((!before || key(before) !== key(moved)) && (!after || key(after) !== key(moved))) {
        out.splice(p, 0, moved)
        placed = true
        break
      }
    }
    if (!placed) out.splice(i, 0, moved)
  }
  return out
}

/** Danh sách id cho từng lượt: mỗi chữ một lần, hoặc đủ `count` lượt (lặp đều các chữ). */
export function planSlots(ids: readonly string[], count: CountChoice, rng: Rng): string[] {
  if (ids.length === 0) return []
  if (count === 'each') return spreadOut(shuffleWith(ids, rng), (x) => x)
  if (count <= ids.length) return shuffleWith(ids, rng).slice(0, count)
  const out: string[] = []
  while (out.length < count) out.push(...shuffleWith(ids, rng))
  return spreadOut(out.slice(0, count), (x) => x)
}

export function pickMode(choice: ModeChoice, available: readonly QuestionMode[], rng: Rng): QuestionMode {
  if (choice !== 'mixed') return choice
  return available[Math.floor(rng() * available.length)] ?? 'choice'
}

export function createSession(
  ids: readonly string[],
  count: CountChoice,
  mode: ModeChoice,
  available: readonly QuestionMode[],
  rng: Rng = Math.random,
): SessionState {
  const slots = planSlots(ids, count, rng)
  return {
    queue: slots.map((id, slot) => ({ slot, id, retry: false, mode: pickMode(mode, available, rng) })),
    planned: slots.length,
    done: 0,
    firstTry: 0,
    answers: 0,
    correct: 0,
    streak: 0,
    bestStreak: 0,
    mistakes: {},
    step: 0,
  }
}

/** Vị trí chèn lại câu sai: cách 3–5 câu, tránh đứng cạnh chính chữ đó. */
export function reinsertIndex(queue: readonly QueueItem[], id: string, rng: Rng): number {
  if (queue.length <= 3) return queue.length
  const want = 3 + Math.floor(rng() * 3) // 3, 4 hoặc 5
  const ok = (p: number) => queue[p - 1]?.id !== id && queue[p]?.id !== id
  const candidates = [want, 3, 4, 5, 2]
  for (const p of candidates) if (p <= queue.length && ok(p)) return p
  return Math.min(want, queue.length)
}

export interface AnswerResult {
  state: SessionState
  /** Lần trả lời đầu tiên của lượt này (dùng để tính mức thuộc) */
  firstAttempt: boolean
}

/** Ghi nhận câu trả lời cho câu đầu hàng đợi. Chưa chuyển câu: gọi `advance` sau khi hiện kết quả. */
export function answer(state: SessionState, correct: boolean): AnswerResult {
  const head = state.queue[0]
  if (!head) return { state, firstAttempt: false }
  const streak = correct ? state.streak + 1 : 0
  return {
    firstAttempt: !head.retry,
    state: {
      ...state,
      answers: state.answers + 1,
      correct: state.correct + (correct ? 1 : 0),
      done: state.done + (correct ? 1 : 0),
      firstTry: state.firstTry + (correct && !head.retry ? 1 : 0),
      streak,
      bestStreak: Math.max(state.bestStreak, streak),
      mistakes: correct ? state.mistakes : { ...state.mistakes, [head.id]: (state.mistakes[head.id] ?? 0) + 1 },
    },
  }
}

/** Sang câu tiếp: bỏ câu đầu; nếu vừa sai thì đưa lượt đó lại vào hàng đợi. */
export function advance(state: SessionState, wasCorrect: boolean, mode: ModeChoice, available: readonly QuestionMode[], rng: Rng = Math.random): SessionState {
  const [head, ...rest] = state.queue
  if (!head) return state
  if (!wasCorrect) {
    const at = reinsertIndex(rest, head.id, rng)
    rest.splice(at, 0, { ...head, retry: true, mode: pickMode(mode, available, rng) })
  }
  return { ...state, queue: rest, step: state.step + 1 }
}

export const isFinished = (s: SessionState) => s.queue.length === 0

/** Mã chữ để tránh hai lựa chọn trùng âm (じ/ぢ, ず/づ cùng "ji"/"zu"). */
const sound = (k: KanaChar) => k.romaji

/**
 * 3 đáp án nhiễu cho `target`, ưu tiên:
 *  1. chữ dễ nhầm (hình dạng, cùng gốc khác dấu);
 *  2. cùng hàng hoặc cùng cột trong bảng;
 *  3. chữ khác cùng bảng chữ và cùng nhóm, rồi tới bất kỳ chữ nào cùng bảng chữ.
 * Không bao giờ trùng cách đọc với đáp án hay với nhau.
 */
export function pickDistractors(target: KanaChar, rng: Rng = Math.random, n = 3): KanaChar[] {
  const same = KANA.filter((k) => k.script === target.script && k.id !== target.id)
  const tiers: KanaChar[][] = [
    shuffleWith(confusables(target), rng),
    shuffleWith(
      same.filter((k) => k.group === target.group && (k.row === target.row || k.col === target.col)),
      rng,
    ),
    shuffleWith(
      same.filter((k) => k.group === target.group),
      rng,
    ),
    shuffleWith(same, rng),
  ]
  const out: KanaChar[] = []
  const used = new Set([sound(target)])
  for (const tier of tiers) {
    for (const k of tier) {
      if (out.length >= n) return out
      if (used.has(sound(k))) continue
      used.add(sound(k))
      out.push(k)
    }
  }
  return out
}

/** 4 lựa chọn đã trộn, gồm đáp án đúng. */
export function buildOptions(target: KanaChar, rng: Rng = Math.random): KanaChar[] {
  return shuffleWith([target, ...pickDistractors(target, rng)], rng)
}
