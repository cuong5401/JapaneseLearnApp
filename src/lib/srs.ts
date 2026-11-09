import { Rating, State, createEmptyCard, fsrs, type Card, type FSRS, type Grade as FsrsGrade, type ReviewLog } from 'ts-fsrs'
import type { Grade, SrsCard } from '../types'

/**
 * Lịch ôn FSRS (ts-fsrs 5.x). Hàm thuần: nhận cài đặt và thời điểm từ ngoài để test được.
 * Ánh xạ thao tác → mức chấm: flashcard Chưa nhớ/Đã nhớ = Again/Good; quiz sai = Again, đúng sau gợi ý = Hard,
 * đúng = Good; trang Ôn tập 4 nút Quên/Khó/Nhớ/Dễ.
 */
export const GRADE = { again: 1, hard: 2, good: 3, easy: 4 } as const satisfies Record<string, Grade>

export const STATE = { new: State.New, learning: State.Learning, review: State.Review, relearning: State.Relearning } as const

/** Khoảng cách (ngày) từ đó coi là "đã thuộc". */
export const MASTERED_INTERVAL = 21

export interface SchedulerSettings {
  /** Mức ghi nhớ mong muốn 0.80–0.95 */
  retention: number
  /** Khoảng cách tối đa (ngày) */
  maxInterval: number
  /** Xáo nhẹ ngày ôn để thẻ không dồn một ngày */
  fuzz: boolean
  /** Tham số FSRS (để dành cho tối ưu sau); không có thì dùng mặc định ts-fsrs */
  w?: number[]
}

export const DEFAULT_SCHEDULER: SchedulerSettings = { retention: 0.9, maxInterval: 365, fuzz: true }

let cache: { key: string; f: FSRS } | null = null

export function scheduler(s: SchedulerSettings = DEFAULT_SCHEDULER): FSRS {
  const key = JSON.stringify(s)
  if (cache?.key !== key) {
    cache = {
      key,
      f: fsrs({
        request_retention: s.retention,
        maximum_interval: s.maxInterval,
        enable_fuzz: s.fuzz,
        enable_short_term: true,
        learning_steps: ['1m', '10m'],
        relearning_steps: ['10m'],
        ...(s.w ? { w: s.w } : {}),
      }),
    }
  }
  return cache.f
}

export function toFsrs(c: SrsCard): Card {
  return {
    due: new Date(c.due),
    stability: c.stability,
    difficulty: c.difficulty,
    elapsed_days: c.elapsed_days,
    scheduled_days: c.scheduled_days,
    reps: c.reps,
    lapses: c.lapses,
    state: c.state as State,
    last_review: c.last_review ? new Date(c.last_review) : undefined,
    learning_steps: c.learning_steps,
  }
}

export function fromFsrs(id: string, c: Card): SrsCard {
  return {
    id,
    due: c.due.getTime(),
    stability: c.stability,
    difficulty: c.difficulty,
    elapsed_days: c.elapsed_days,
    scheduled_days: c.scheduled_days,
    reps: c.reps,
    lapses: c.lapses,
    state: c.state as SrsCard['state'],
    last_review: c.last_review ? c.last_review.getTime() : 0,
    learning_steps: c.learning_steps,
  }
}

/** ts-fsrs cho mức Dễ luôn dài hơn mức Nhớ nên có thể vượt `maximum_interval` vài ngày: kẹp lại đúng cài đặt. */
function capInterval(c: SrsCard, s: SchedulerSettings): SrsCard {
  if (c.scheduled_days <= s.maxInterval || !c.last_review) return c
  return { ...c, scheduled_days: s.maxInterval, due: c.last_review + s.maxInterval * 86_400_000 }
}

/** Thẻ Mới, đến hạn ngay. */
export const newCard = (id: string, now = Date.now()): SrsCard => fromFsrs(id, createEmptyCard(new Date(now)))

export interface ReviewResult {
  card: SrsCard
  log: ReviewLog
}

/** Chấm một thẻ. */
export function review(card: SrsCard, grade: Grade, now = Date.now(), s: SchedulerSettings = DEFAULT_SCHEDULER): ReviewResult {
  const r = scheduler(s).next(toFsrs(card), new Date(now), grade as FsrsGrade)
  return { card: capInterval(fromFsrs(card.id, r.card), s), log: r.log }
}

/** Xem trước kết quả của 4 mức chấm (để hiện "1 phút", "10 phút", "4 ngày" trên nút). */
export function preview(card: SrsCard, now = Date.now(), s: SchedulerSettings = DEFAULT_SCHEDULER): Record<Grade, SrsCard> {
  const p = scheduler(s).repeat(toFsrs(card), new Date(now))
  const at = (r: Rating.Again | Rating.Hard | Rating.Good | Rating.Easy) => capInterval(fromFsrs(card.id, p[r].card), s)
  return { 1: at(Rating.Again), 2: at(Rating.Hard), 3: at(Rating.Good), 4: at(Rating.Easy) }
}

/** Khả năng nhớ (0–1) ở thời điểm `now`; thẻ Mới = 0. */
export const retrievability = (c: SrsCard, now = Date.now(), s: SchedulerSettings = DEFAULT_SCHEDULER) =>
  c.state === State.New ? 0 : scheduler(s).get_retrievability(toFsrs(c), new Date(now), false)

/** Khoảng cách (ngày) FSRS sẽ xếp cho một độ ổn định ở mức ghi nhớ của `s` (dùng ước tính tải ôn mỗi ngày). */
export const intervalFor = (stability: number, s: SchedulerSettings) => scheduler(s).next_interval(stability, 0)

export const isDue = (card: SrsCard, now = Date.now()) => card.due <= now
export const isMastered = (card: SrsCard) => card.state === State.Review && card.scheduled_days >= MASTERED_INTERVAL

const MIN = 60_000
const HOUR = 60 * MIN
const DAY = 24 * HOUR

/** Khoảng thời gian gọn kiểu tiếng Việt: "1 phút", "10 phút", "3 giờ", "1 ngày", "4 ngày", "2 tháng", "1,2 năm". */
export function formatDelay(ms: number): string {
  if (ms < MIN) return '< 1 phút'
  if (ms < HOUR) return `${Math.round(ms / MIN)} phút`
  if (ms < DAY) return `${Math.round(ms / HOUR)} giờ`
  const days = Math.round(ms / DAY)
  if (days < 30) return `${days} ngày`
  if (days < 365) return `${Math.round(days / 30)} tháng`
  return `${(Math.round((days / 365) * 10) / 10).toString().replace('.', ',')} năm`
}

/** Mức chấm của một câu quiz: sai = Quên, đúng sau khi xem gợi ý = Khó, đúng = Nhớ. */
export const quizGrade = (correct: boolean, hinted: boolean): Grade => (!correct ? GRADE.again : hinted ? GRADE.hard : GRADE.good)

/** Mức chấm flashcard: vuốt trái "Chưa nhớ" = Quên, vuốt phải "Đã nhớ" = Nhớ. */
export const flashcardGrade = (known: boolean): Grade => (known ? GRADE.good : GRADE.again)

/**
 * Ước tính số lượt ôn mỗi ngày ở trạng thái ổn định cho các thẻ Ôn tập: Σ 1 / khoảng cách FSRS sẽ xếp
 * (theo độ ổn định hiện tại) ở mức ghi nhớ của `s`. Dùng để so sánh khi đổi mức ghi nhớ mong muốn.
 */
export function dailyLoad(cards: readonly SrsCard[], s: SchedulerSettings): number {
  const f = scheduler({ ...s, fuzz: false })
  let load = 0
  for (const c of cards) if (c.state === State.Review && c.stability > 0) load += 1 / Math.max(1, f.next_interval(c.stability, 0))
  return load
}
