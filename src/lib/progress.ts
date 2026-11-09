import type { Grade, SrsCard } from '../types'
import { reviewLog } from './reviewLog'
import { newCard, review } from './srs'
import { srsSettings } from './srsSettings'
import { localProgressStore, type ProgressStore } from './storage'

/** Kho tiến độ dùng chung (thẻ FSRS), đăng ký được qua useSyncExternalStore. */
const store: ProgressStore = localProgressStore
let cards: Record<string, SrsCard> = store.load()
const listeners = new Set<() => void>()

function commit(next: Record<string, SrsCard>) {
  cards = next
  store.save(cards)
  listeners.forEach((l) => l())
}

export const progress = {
  subscribe(listener: () => void) {
    listeners.add(listener)
    return () => listeners.delete(listener)
  },
  getSnapshot: () => cards,

  /**
   * Chấm một mục (tạo thẻ Mới nếu chưa có), ghi lịch sử ôn. Trả về thẻ trước khi chấm để hoàn tác (`restore`).
   */
  grade(id: string, grade: Grade, now = Date.now()): SrsCard | undefined {
    const prev = cards[id]
    const card = prev ?? newCard(id, now)
    const r = review(card, grade, now, srsSettings.getSnapshot())
    commit({ ...cards, [id]: r.card })
    reviewLog.append({ id, at: now, rating: grade, state: card.state, elapsed_days: r.log.elapsed_days, scheduled_days: r.log.scheduled_days })
    return prev
  },

  /**
   * "Đánh dấu đã học" / "Thêm vào lịch ôn": tạo thẻ Mới (đến hạn ngay) chờ ở trang Ôn tập, theo giới hạn thẻ mới
   * mỗi ngày. Thẻ đã có thì giữ nguyên.
   */
  markLearned(id: string) {
    progress.addNew([id])
  },
  /** Như markLearned cho nhiều mục, một lần ghi. Trả về số thẻ mới thêm. */
  addNew(ids: readonly string[], now = Date.now()): number {
    const next = { ...cards }
    let added = 0
    ids.forEach((id, i) => {
      if (next[id]) return
      // giữ thứ tự thêm (due tăng dần 1ms) để hàng đợi thẻ mới đúng thứ tự
      next[id] = newCard(id, now + i)
      added++
    })
    if (added) commit(next)
    return added
  },

  /** Hoàn tác lần chấm gần nhất: đặt lại thẻ về trạng thái trước (xóa nếu trước đó chưa có), bỏ log tương ứng. */
  restore(id: string, card?: SrsCard) {
    const next = { ...cards }
    if (card) next[id] = card
    else delete next[id]
    commit(next)
    reviewLog.removeLast(id)
  },

  forget(id: string) {
    const next = { ...cards }
    delete next[id]
    commit(next)
  },

  /** Thay toàn bộ thẻ (dùng sau khi gộp với file tiến độ nhập vào). */
  importCards(next: Record<string, SrsCard>) {
    commit({ ...next })
  },

  reset() {
    commit({})
    reviewLog.reset()
  },
}
