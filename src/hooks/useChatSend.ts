import { chats, titleFrom, type Conversation, type LocalHit } from '../lib/ai/history'
import type { ChatMode } from '../lib/ai/prompts'
import { aiSession } from '../lib/ai/session'
import { useAiSettings } from '../lib/ai/settings'
import type { AiImage } from '../lib/ai/types'
import { normalizeKana, search, type SearchDoc } from '../lib/search'
import { showToast } from '../lib/toast'
import { useSearchDocs } from './useSearchDocs'
import { t } from '../i18n'

/** Tra từ: mục khớp trong dữ liệu Kotonoha (khớp đúng chữ / cách đọc trước, tối đa 3 mục). */
export function findLocalHits(docs: readonly SearchDoc[], q: string): LocalHit[] {
  const query = q.trim()
  if (!query || query.length > 20 || docs.length === 0) return []
  const r = search(docs, query, 20)
  const kana = normalizeKana(query)
  const exact = (d: SearchDoc) => d.title === query || (d.reading && normalizeKana(d.reading) === kana)
  const words = [...r.word.filter(exact), ...r.word.filter((d) => !exact(d))].slice(0, exact(r.word[0] ?? ({} as SearchDoc)) ? 3 : 2)
  const kanji = [...query].length === 1 ? r.kanji.filter((d) => d.title === query).slice(0, 1) : []
  return [...kanji, ...words].map((d) => ({ kind: d.kind === 'kanji' ? 'kanji' : 'word', id: d.id, title: d.title, reading: d.reading, meaning: d.subtitle }))
}

export interface SendOptions {
  /** Chế độ cho cuộc MỚI (cuộc đang mở giữ chế độ của nó) */
  mode: ChatMode
  image?: AiImage
  /** Luôn tạo cuộc mới (nút "Hỏi AI" ở trang chi tiết, chip "Hỏi về …", ảnh vẽ tay) */
  fresh?: boolean
}

/**
 * Gửi câu hỏi cho trang /ai và khung chat nổi. Chế độ CỐ ĐỊNH theo cuộc trò chuyện: đang mở một cuộc thì gửi vào
 * cuộc đó với chế độ của nó; chưa có cuộc (màn chọn chế độ) hoặc `fresh` thì tạo cuộc mới với `mode` và gọi
 * `onConversation(id)`. Trả false nếu không gửi được (chưa có key, đang trả lời…).
 */
export function useChatSend(active: Conversation | null, onConversation: (id: string) => void) {
  const settings = useAiSettings()
  const { docs } = useSearchDocs()
  return (text: string, { mode: wanted, image, fresh = false }: SendOptions): boolean => {
    const q = text.trim()
    if (!q || aiSession.getSnapshot() || !settings.hasKey) return false
    let id = !fresh && active ? active.id : null
    const mode = id && active ? active.mode : wanted
    if (!id) {
      id = chats.create(mode, titleFrom(q))
      if (!id) {
        showToast(t('useChatSend.daDu10Cuoc'))
        return false
      }
      onConversation(id)
    }
    void aiSession.ask(id, { text: q, mode, image, hits: (mode === 'lookup' || mode === 'mixed') && !image ? findLocalHits(docs, q) : undefined })
    return true
  }
}
