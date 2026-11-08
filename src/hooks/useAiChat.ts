import { useCallback, useEffect, useRef, useState } from 'react'
import { chats, sendWindow, type LocalHit, type StoredMessage } from '../lib/ai/history'
import { systemPrompt, type ChatMode } from '../lib/ai/prompts'
import { loadProvider } from '../lib/ai/providers'
import { aiSettings } from '../lib/ai/settings'
import { AiError, aiErrorText, type AiImage } from '../lib/ai/types'

export interface AskInput {
  text: string
  mode: ChatMode
  image?: AiImage
  /** Tra từ: mục tìm thấy trong dữ liệu app, hiện ngay và gửi kèm cho AI */
  hits?: LocalHit[]
}

/** Dữ liệu sẵn có gửi kèm câu hỏi (chỉ trong yêu cầu, không lưu vào lịch sử). */
function contextText(hits: readonly LocalHit[]): string {
  const lines = hits.map((h) => `- ${h.kind === 'kanji' ? 'Chữ Hán' : 'Từ'} ${h.title}${h.reading ? ` (${h.reading})` : ''}: ${h.meaning}`)
  return `Dữ liệu sẵn có trong app (đã đúng, chỉ cần bổ sung):\n${lines.join('\n')}`
}

/**
 * Gửi câu hỏi và nhận câu trả lời dần cho một cuộc trò chuyện.
 * Chữ đang stream giữ trong state (cập nhật theo khung hình); chỉ khi xong mới ghi vào lịch sử (localStorage).
 */
export function useAiChat() {
  const [live, setLive] = useState<{ convId: string; text: string } | null>(null)
  const ctrl = useRef<AbortController | null>(null)
  const extra = useRef<{ convId: string; image?: AiImage; hits?: LocalHit[] } | null>(null)

  useEffect(() => () => ctrl.current?.abort(), [])

  const run = useCallback(async (convId: string, mode: ChatMode) => {
    const conv = chats.getSnapshot().find((c) => c.id === convId)
    if (!conv) return
    const messages = sendWindow(conv.messages)
    const last = messages[messages.length - 1]
    const x = extra.current?.convId === convId ? extra.current : null
    if (last && x?.hits?.length) last.text = `${contextText(x.hits)}\n\nCâu hỏi: ${last.text}`
    if (last && x?.image) last.image = x.image

    const controller = new AbortController()
    ctrl.current?.abort()
    ctrl.current = controller
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
      if (ctrl.current === controller) ctrl.current = null
      setLive((l) => (l?.convId === convId ? null : l))
    }
  }, [])

  /** Gửi câu hỏi mới vào cuộc `convId`. */
  const ask = useCallback(
    (convId: string, input: AskInput) => {
      extra.current = { convId, image: input.image, hits: input.hits }
      chats.append(convId, {
        role: 'user',
        text: input.text,
        at: Date.now(),
        ...(input.image ? { hadImage: true } : {}),
        ...(input.hits?.length ? { hits: input.hits } : {}),
      })
      return run(convId, input.mode)
    },
    [run],
  )

  /** Thử lại câu trả lời lỗi cuối cùng. */
  const retry = useCallback(
    (convId: string, mode: ChatMode) => {
      const conv = chats.getSnapshot().find((c) => c.id === convId)
      if (conv?.messages.at(-1)?.role === 'assistant') chats.dropLast(convId)
      return run(convId, mode)
    },
    [run],
  )

  const stop = useCallback(() => ctrl.current?.abort(), [])

  return { live, ask, retry, stop, busy: live !== null }
}
