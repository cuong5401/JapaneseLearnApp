import type { Quality, SrsCard } from '../types'
import { localProgressStore, type ProgressStore } from './storage'
import { newCard, review } from './srs'

/** Kho tiến độ dùng chung, đăng ký được qua useSyncExternalStore. */
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

  /** Chấm điểm một mục; tạo thẻ mới nếu chưa có. */
  grade(id: string, q: Quality) {
    const card = cards[id] ?? newCard(id)
    commit({ ...cards, [id]: review(card, q) })
  },

  /** Đánh dấu đã học (từ flashcard/kanji): đưa vào lịch ôn, đến hạn ngày mai. */
  markLearned(id: string) {
    if (cards[id]) return
    commit({ ...cards, [id]: review(newCard(id), 4) })
  },

  /** Hoàn tác: đặt lại thẻ về trạng thái trước (hoặc xóa nếu trước đó chưa có). */
  restore(id: string, card?: SrsCard) {
    const next = { ...cards }
    if (card) next[id] = card
    else delete next[id]
    commit(next)
  },

  forget(id: string) {
    const next = { ...cards }
    delete next[id]
    commit(next)
  },

  reset() {
    commit({})
  },
}
