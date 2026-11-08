import { AiError, type AiProvider, type AiRequest } from './types'

/**
 * Claude Messages API gọi thẳng từ trình duyệt bằng SDK chính thức.
 * `dangerouslyAllowBrowser: true` làm SDK gửi header `anthropic-dangerous-direct-browser-access: true`;
 * key là key của chính người dùng, chỉ nằm trong localStorage máy họ.
 * SDK chỉ được tải (dynamic import) khi gọi Claude lần đầu.
 */
type Sdk = typeof import('@anthropic-ai/sdk')

let sdk: Promise<Sdk> | null = null
const loadSdk = () => (sdk ??= import('@anthropic-ai/sdk'))

function toAiError(e: unknown, mod: Sdk, signal?: AbortSignal): AiError {
  const A = mod.default
  if (signal?.aborted || e instanceof A.APIUserAbortError) return new AiError('aborted')
  if (e instanceof A.AuthenticationError || e instanceof A.PermissionDeniedError) return new AiError('auth', 'auth', e.status)
  if (e instanceof A.RateLimitError) return new AiError('quota', 'rate_limit', 429)
  if (e instanceof A.APIConnectionError) return new AiError('network')
  if (e instanceof A.BadRequestError || e instanceof A.NotFoundError) return new AiError('bad_request', 'bad_request', e.status)
  if (e instanceof A.InternalServerError) return new AiError('busy', 'server', e.status)
  if (e instanceof A.APIError) return new AiError(e.status === 529 ? 'busy' : 'unknown', 'api', e.status)
  return new AiError('unknown')
}

export const claude: AiProvider & { fetchImpl?: typeof fetch } = {
  id: 'claude',
  async *stream(req: AiRequest) {
    const mod = await loadSdk()
    const client = new mod.default({
      apiKey: req.apiKey,
      dangerouslyAllowBrowser: true,
      maxRetries: 1,
      ...(claude.fetchImpl ? { fetch: claude.fetchImpl } : {}),
    })
    try {
      const stream = client.messages.stream(
        {
          model: req.model,
          max_tokens: 8000,
          system: req.system,
          // Chat ngắn: effort thấp để trả lời nhanh, ít token (Haiku 5.5 mặc định là medium).
          output_config: { effort: 'low' },
          messages: req.messages.map((m) => ({
            role: m.role,
            content: m.image
              ? [
                  { type: 'image' as const, source: { type: 'base64' as const, media_type: m.image.mime, data: m.image.data } },
                  { type: 'text' as const, text: m.text },
                ]
              : m.text,
          })),
        },
        { signal: req.signal },
      )
      for await (const event of stream) {
        if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') yield event.delta.text
      }
      const final = await stream.finalMessage()
      if (final.stop_reason === 'refusal') throw new AiError('refusal')
    } catch (e) {
      if (e instanceof AiError) throw e
      throw toAiError(e, mod, req.signal)
    }
  },
}
