import { chats, sendWindow, type LocalHit, type StoredMessage } from './history'
import { systemPrompt, type ChatMode } from './prompts'
import { loadProvider } from './providers'
import { aiSettings } from './settings'
import { AiError, aiErrorText, type AiImage } from './types'

export interface AskInput {
  text: string
  mode: ChatMode
  image?: AiImage
  /** Tra từ: mục tìm thấy trong dữ liệu app, hiện ngay và gửi kèm cho AI */
  hits?: LocalHit[]
}

export type LiveAnswer = { convId: string; text: string } | null

/** Dữ liệu sẵn có gửi kèm câu hỏi (chỉ trong yêu cầu, không lưu vào lịch sử). */
function contextText(hits: readonly LocalHit[]): string {
  const lines = hits.map((h) => `- ${h.kind === 'kanji' ? 'Chữ Hán' : 'Từ'} ${h.title}${h.reading ? ` (${h.reading})` : ''}: ${h.meaning}`)
  return `Dữ liệu sẵn có trong app (đã đúng, chỉ cần bổ sung):\n${lines.join('\n')}`
}

/*
 * Phiên chat dùng chung cho cả app (trang /ai và khung chat nổi): chỉ một câu trả lời stream một lúc.
 * Nằm ngoài React nên chuyển trang hay thu gọn khung không hủy câu trả lời đang chạy.
 * Chữ đang stream giữ trong bộ nhớ (cập nhật theo khung hình); xong mới ghi vào lịch sử (localStorage).
 */
let live: LiveAnswer = null
let ctrl: AbortController | null = null
let extra: { convId: string; image?: AiImage; hits?: LocalHit[] } | null = null
const listeners = new Set<() => void>()
const finishListeners = new Set<(convId: string) => void>()

function setLive(next: LiveAnswer) {
  live = next
  listeners.forEach((l) => l())
}

async function run(convId: string, mode: ChatMode) {
  const conv = chats.getSnapshot().find((c) => c.id === convId)
  if (!conv) return
  const messages = sendWindow(conv.messages)
  const last = messages[messages.length - 1]
  const x = extra?.convId === convId ? extra : null
  if (last && x?.hits?.length) last.text = `${contextText(x.hits)}\n\nCâu hỏi: ${last.text}`
  if (last && x?.image) last.image = x.image

  const controller = new AbortController()
  ctrl?.abort()
  ctrl = controller
  let acc = ''
  let frame = 0
  setLive({ convId, text: '' })
  const flush = () => {
    frame = 0
    setLive({ convId, text: acc })
  }
  const done = (m: Omit<StoredMessage, 'role' | 'at'>) => chats.append(convId, { role: 'assistant', at: Date.now(), ...m })

  try {
    const { provider, level } = aiSettings.getSnapshot()
    const ai = await loadProvider(provider)
    for await (const chunk of ai.stream({
      apiKey: aiSettings.key(),
      model: aiSettings.model(),
      system: systemPrompt(mode, level),
      messages,
      signal: controller.signal,
    })) {
      acc += chunk
      if (!frame) frame = requestAnimationFrame(flush)
    }
    done({ text: acc })
  } catch (e) {
    const err = e instanceof AiError ? e : new AiError('unknown')
    done({ text: acc, error: aiErrorText(err) })
  } finally {
    if (frame) cancelAnimationFrame(frame)
    if (ctrl === controller) ctrl = null
    if (live?.convId === convId) setLive(null)
    finishListeners.forEach((l) => l(convId))
  }
}

export const aiSession = {
  subscribe(l: () => void) {
    listeners.add(l)
    return () => {
      listeners.delete(l)
    }
  },
  getSnapshot: () => live,
  /** Gọi khi một câu trả lời kết thúc (xong, lỗi hoặc dừng). */
  onFinish(l: (convId: string) => void) {
    finishListeners.add(l)
    return () => {
      finishListeners.delete(l)
    }
  },
  /** Gửi câu hỏi mới vào cuộc `convId`. */
  ask(convId: string, input: AskInput) {
    extra = { convId, image: input.image, hits: input.hits }
    chats.append(convId, {
      role: 'user',
      text: input.text,
      at: Date.now(),
      ...(input.image ? { hadImage: true } : {}),
      ...(input.hits?.length ? { hits: input.hits } : {}),
    })
    return run(convId, input.mode)
  },
  /** Thử lại câu trả lời lỗi cuối cùng. */
  retry(convId: string, mode: ChatMode) {
    const conv = chats.getSnapshot().find((c) => c.id === convId)
    if (conv?.messages.at(-1)?.role === 'assistant') chats.dropLast(convId)
    return run(convId, mode)
  },
  stop: () => ctrl?.abort(),
}
