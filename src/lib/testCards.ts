import type { SrsCard } from '../types'

/** Thẻ FSRS cho test: mặc định là thẻ Ôn tập ổn định 1 ngày; ghi đè trường cần thiết. Chỉ dùng trong *.test.ts. */
export const fsrsCard = (id: string, patch: Partial<SrsCard> = {}): SrsCard => ({
  id,
  due: 0,
  stability: 1,
  difficulty: 5,
  elapsed_days: 1,
  scheduled_days: 1,
  reps: 1,
  lapses: 0,
  state: 2,
  last_review: 0,
  learning_steps: 0,
  ...patch,
})
