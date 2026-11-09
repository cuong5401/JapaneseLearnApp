import { useSyncExternalStore } from 'react'
import { aiSession } from '../lib/ai/session'

export type { AskInput } from '../lib/ai/session'

/**
 * Gửi câu hỏi và nhận câu trả lời dần. Phiên nằm ngoài component (lib/ai/session) nên câu trả lời
 * đang chạy không bị hủy khi rời trang /ai hay thu gọn khung chat nổi.
 */
export function useAiChat() {
  const live = useSyncExternalStore(aiSession.subscribe, aiSession.getSnapshot)
  return { live, ask: aiSession.ask, retry: aiSession.retry, stop: aiSession.stop, busy: live !== null }
}
