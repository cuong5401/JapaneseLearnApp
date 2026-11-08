import { readSse } from './sse'
import { AiError, errorFromStatus, type AiProvider, type AiRequest } from './types'

/**
 * Gemini API gọi thẳng từ trình duyệt:
 * POST /v1beta/models/{model}:streamGenerateContent?alt=sse, header x-goog-api-key.
 */
const BASE = 'https://generativelanguage.googleapis.com/v1beta/models'

interface Part {
  text?: string
  thought?: boolean
  inline_data?: { mime_type: string; data: string }
}

export function geminiBody(req: Pick<AiRequest, 'model' | 'system' | 'messages'>) {
  return {
    systemInstruction: { parts: [{ text: req.system }] },
    contents: req.messages.map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [...(m.image ? [{ inline_data: { mime_type: m.image.mime, data: m.image.data } }] : []), { text: m.text }] satisfies Part[],
    })),
    // Gemini 3.x / 4: mức suy nghĩ "low" cho chat nhanh. Model 2.x không nhận thinkingLevel.
    ...(/^gemini-[34]/.test(req.model) ? { generationConfig: { thinkingConfig: { thinkingLevel: 'low' } } } : {}),
  }
}

async function failure(res: Response): Promise<AiError> {
  let detail = ''
  try {
    const j = (await res.json()) as { error?: { message?: string; status?: string; details?: { reason?: string }[] } }
    detail = j.error?.status ?? ''
    // Key sai: Gemini trả 400 kèm lý do API_KEY_INVALID.
    if (res.status === 400 && (j.error?.details?.some((d) => d.reason === 'API_KEY_INVALID') || /api key/i.test(j.error?.message ?? ''))) {
      return new AiError('auth', 'API_KEY_INVALID', 400)
    }
  } catch {
    /* thân lỗi không phải JSON */
  }
  return errorFromStatus(res.status, detail)
}

export const gemini: AiProvider = {
  id: 'gemini',
  async *stream(req: AiRequest) {
    let res: Response
    try {
      res = await fetch(`${BASE}/${encodeURIComponent(req.model)}:streamGenerateContent?alt=sse`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': req.apiKey },
        body: JSON.stringify(geminiBody(req)),
        signal: req.signal,
      })
    } catch (e) {
      throw req.signal?.aborted ? new AiError('aborted') : new AiError('network', e instanceof Error ? e.name : 'fetch')
    }
    if (!res.ok || !res.body) throw await failure(res)
    try {
      for await (const data of readSse(res.body, req.signal)) {
        let chunk: { candidates?: { content?: { parts?: Part[] }; finishReason?: string }[]; error?: { code?: number } }
        try {
          chunk = JSON.parse(data)
        } catch {
          continue
        }
        if (chunk.error) throw errorFromStatus(chunk.error.code ?? 500)
        const cand = chunk.candidates?.[0]
        const text = (cand?.content?.parts ?? [])
          .filter((p) => !p.thought && p.text)
          .map((p) => p.text)
          .join('')
        if (text) yield text
        if (cand?.finishReason === 'SAFETY' || cand?.finishReason === 'PROHIBITED_CONTENT') throw new AiError('refusal')
      }
    } catch (e) {
      if (e instanceof AiError) throw e
      throw req.signal?.aborted ? new AiError('aborted') : new AiError('network')
    }
  },
}
