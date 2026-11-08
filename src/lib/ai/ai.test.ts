import { afterEach, describe, expect, it, vi } from 'vitest'
import { createBackup } from '../backup'
import { claude } from './claude'
import { gemini, geminiBody } from './gemini'
import { addConversation, MAX_CONVERSATIONS, renameConversation, sendWindow, togglePin, type Conversation, type StoredMessage } from './history'
import { mock } from './mock'
import { extractWords, splitFurigana, stripFurigana } from './parse'
import { systemPrompt } from './prompts'
import { readSse } from './sse'
import { AiError, aiErrorText, type AiProvider, type AiRequest } from './types'

/** Key giả trong test, không khớp mẫu key thật (xem scripts/check-secrets.mjs). */
const KEY = 'test-key'
const enc = new TextEncoder()
const streamOf = (chunks: string[]) =>
  new ReadableStream<Uint8Array>({
    start(c) {
      for (const ch of chunks) c.enqueue(enc.encode(ch))
      c.close()
    },
  })
const req = (over: Partial<AiRequest> = {}): AiRequest => ({ apiKey: KEY, model: 'gemini-3.8-flash', system: 'sys', messages: [{ role: 'user', text: 'hỏi' }], ...over })
async function collect(p: AiProvider, r: AiRequest) {
  const out: string[] = []
  for await (const t of p.stream(r)) out.push(t)
  return out
}
async function errorOf(p: AiProvider, r: AiRequest): Promise<AiError> {
  try {
    await collect(p, r)
  } catch (e) {
    return e as AiError
  }
  throw new Error('không có lỗi')
}

afterEach(() => {
  vi.unstubAllGlobals()
  claude.fetchImpl = undefined
})

describe('SSE', () => {
  it('ghép dòng bị cắt giữa hai chunk, bỏ dòng không phải data', async () => {
    const out: string[] = []
    for await (const d of readSse(streamOf(['data: {"a"', ':1}\n\n: comment\nevent: x\ndata: 2\n', '\ndata: 3']))) out.push(d)
    expect(out).toEqual(['{"a":1}', '2', '3'])
  })
})

describe('Gemini (fetch giả)', () => {
  const sse = (texts: string[]) => texts.map((t) => `data: ${JSON.stringify({ candidates: [{ content: { parts: [{ text: t }] } }] })}\r\n\r\n`)

  it('stream nhiều mẩu; gửi key ở header, không ở URL; bỏ phần suy nghĩ', async () => {
    const fetchMock = vi.fn(async (_url: string, _init: RequestInit) =>
      new Response(streamOf([...sse(['Xin ', 'chào']), `data: ${JSON.stringify({ candidates: [{ content: { parts: [{ text: 'nghĩ…', thought: true }, { text: '!' }] } }] })}\n\n`]), { status: 200 }),
    )
    vi.stubGlobal('fetch', fetchMock)
    expect(await collect(gemini, req())).toEqual(['Xin ', 'chào', '!'])
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toContain('/models/gemini-3.8-flash:streamGenerateContent?alt=sse')
    expect(url).not.toContain(KEY)
    expect((init.headers as Record<string, string>)['x-goog-api-key']).toBe(KEY)
  })

  it('body: role model, ảnh inline_data, thinkingLevel chỉ cho Gemini 3+', () => {
    const b = geminiBody({ model: 'gemini-3.8-flash', system: 's', messages: [{ role: 'user', text: 'a', image: { mime: 'image/png', data: 'AAA' } }, { role: 'assistant', text: 'b' }] })
    expect(b.contents[1].role).toBe('model')
    expect(b.contents[0].parts[0]).toEqual({ inline_data: { mime_type: 'image/png', data: 'AAA' } })
    expect(b.generationConfig?.thinkingConfig.thinkingLevel).toBe('low')
    expect('generationConfig' in geminiBody({ model: 'gemini-2.5-flash', system: 's', messages: [] })).toBe(false)
  })

  it('401 / 403 / key sai (400) → auth; 429 → quota; mất mạng → network', async () => {
    vi.stubGlobal('fetch', async () => new Response('{}', { status: 403 }))
    expect((await errorOf(gemini, req())).kind).toBe('auth')
    vi.stubGlobal('fetch', async () => new Response(JSON.stringify({ error: { code: 400, message: 'API key not valid. Please pass a valid API key.', details: [{ reason: 'API_KEY_INVALID' }] } }), { status: 400 }))
    expect((await errorOf(gemini, req())).kind).toBe('auth')
    vi.stubGlobal('fetch', async () => new Response('{"error":{"code":429,"status":"RESOURCE_EXHAUSTED"}}', { status: 429 }))
    const quota = await errorOf(gemini, req())
    expect(quota.kind).toBe('quota')
    expect(aiErrorText(quota)).toBe('Đã hết lượt miễn phí, thử lại sau ít phút.')
    vi.stubGlobal('fetch', async () => {
      throw new TypeError('Failed to fetch')
    })
    expect((await errorOf(gemini, req())).kind).toBe('network')
  })

  it('thông báo lỗi không chứa key', async () => {
    vi.stubGlobal('fetch', async () => new Response('{}', { status: 401 }))
    const e = await errorOf(gemini, req())
    expect(aiErrorText(e)).not.toContain(KEY)
    expect(e.message).not.toContain(KEY)
  })
})

describe('Claude (SDK với fetch giả)', () => {
  const event = (type: string, data: object) => `event: ${type}\ndata: ${JSON.stringify({ type, ...data })}\n\n`
  const ok = () =>
    new Response(
      streamOf([
        event('message_start', { message: { id: 'msg_1', type: 'message', role: 'assistant', model: 'claude-haiku-5-5', content: [], stop_reason: null, stop_sequence: null, usage: { input_tokens: 5, output_tokens: 0 } } }),
        event('content_block_start', { index: 0, content_block: { type: 'text', text: '' } }),
        event('content_block_delta', { index: 0, delta: { type: 'text_delta', text: 'Xin ' } }),
        event('content_block_delta', { index: 0, delta: { type: 'text_delta', text: 'chào' } }),
        event('content_block_stop', { index: 0 }),
        event('message_delta', { delta: { stop_reason: 'end_turn', stop_sequence: null }, usage: { output_tokens: 2 } }),
        event('message_stop', {}),
      ]),
      { status: 200, headers: { 'content-type': 'text/event-stream' } },
    )

  it('stream text_delta; gửi header gọi từ trình duyệt và effort thấp', async () => {
    const calls: { headers: Headers; body: Record<string, unknown> }[] = []
    claude.fetchImpl = (async (_url: RequestInfo | URL, init?: RequestInit) => {
      calls.push({ headers: new Headers(init?.headers), body: JSON.parse(String(init?.body)) })
      return ok()
    }) as typeof fetch
    expect(await collect(claude, req({ model: 'claude-haiku-5-5' }))).toEqual(['Xin ', 'chào'])
    expect(calls[0].headers.get('anthropic-dangerous-direct-browser-access')).toBe('true')
    // SDK 1.x gửi apiKey dạng Authorization: Bearer.
    expect(calls[0].headers.get('authorization')).toBe(`Bearer ${KEY}`)
    expect(calls[0].body).toMatchObject({ model: 'claude-haiku-5-5', stream: true, output_config: { effort: 'low' }, system: 'sys' })
    expect(calls[0].body).not.toHaveProperty('temperature')
  })

  it('401 → auth; 429 → quota (không thử lại quá 1 lần)', async () => {
    const err = (status: number) => new Response(JSON.stringify({ type: 'error', error: { type: 'x', message: 'x' } }), { status, headers: { 'content-type': 'application/json' } })
    claude.fetchImpl = (async () => err(401)) as typeof fetch
    expect((await errorOf(claude, req())).kind).toBe('auth')
    let n = 0
    claude.fetchImpl = (async () => {
      n++
      return err(429)
    }) as typeof fetch
    expect((await errorOf(claude, req())).kind).toBe('quota')
    expect(n).toBeLessThanOrEqual(2)
  }, 20_000)
})

describe('mock provider', () => {
  it('trả lời dần; #401 / #429 giả lỗi; dừng được', async () => {
    mock.delay = 0
    expect((await collect(mock, req())).length).toBeGreaterThan(5)
    expect((await errorOf(mock, req({ messages: [{ role: 'user', text: '#401' }] }))).kind).toBe('auth')
    expect((await errorOf(mock, req({ messages: [{ role: 'user', text: 'x #429' }] }))).kind).toBe('quota')
    const c = new AbortController()
    c.abort()
    expect((await errorOf(mock, req({ signal: c.signal }))).kind).toBe('aborted')
    mock.delay = 120
  })
})

describe('tách khối từ vựng và furigana', () => {
  const block = '```kotonoha-words\n[{"word":"把握","reading":"はあく","meaning":"nắm bắt","hanViet":"bả ác"},{"word":"把握","reading":"x","meaning":"trùng"},{"word":"","meaning":"rỗng"}]\n```'

  it('bỏ khối JSON khỏi phần hiển thị, lấy từ hợp lệ, không trùng', () => {
    const r = extractWords(`Giải thích.\n\n${block}\nHết.`)
    expect(r.body).toBe('Giải thích.\n\n\nHết.')
    expect(r.words).toEqual([{ word: '把握', reading: 'はあく', meaning: 'nắm bắt', hanViet: 'BẢ ÁC' }])
  })

  it('JSON hỏng → không có từ; đang stream dở → ẩn phần khối', () => {
    expect(extractWords('A\n```kotonoha-words\n[{"word":').body).toBe('A')
    expect(extractWords('A\n```kotonoha-words\n[{"word":').words).toEqual([])
    expect(extractWords('A\n```kotonoha-words\n{bad}\n```').words).toEqual([])
    expect(extractWords('A\n```koto').body).toBe('A')
    expect(extractWords('Code: ```js\nx\n```').body).toContain('```js')
  })

  it('furigana 漢字{かんじ}, kể cả 々; bỏ furigana trong JSON', () => {
    expect(splitFurigana('日本{にほん}語{ご}を時々{ときどき}話す')).toEqual([
      { text: '日本', ruby: 'にほん' },
      { text: '語', ruby: 'ご' },
      { text: 'を' },
      { text: '時々', ruby: 'ときどき' },
      { text: '話す' },
    ])
    expect(splitFurigana('{không phải} ruby')).toEqual([{ text: '{không phải} ruby' }])
    expect(stripFurigana('勉強{べんきょう}する')).toBe('勉強する')
    expect(extractWords('```kotonoha-words\n[{"word":"勉強{べんきょう}","reading":"べんきょう","meaning":"học"}]\n```').words[0].word).toBe('勉強')
  })
})

describe('lịch sử hội thoại', () => {
  const conv = (i: number, pinned = false): Conversation => ({ id: `c${i}`, title: `#${i}`, mode: 'lookup', pinned, createdAt: i, updatedAt: i, messages: [] })

  it('tối đa 10 cuộc: cuộc thứ 11 xóa cuộc cũ nhất chưa ghim; cuộc ghim được giữ', () => {
    let list: Conversation[] = []
    for (let i = 1; i <= MAX_CONVERSATIONS; i++) {
      const r = addConversation(list, conv(i, i === 1))
      if (!r.ok) throw new Error()
      list = r.list
    }
    const r = addConversation(list, conv(11))
    expect(r.ok && r.list).toHaveLength(10)
    expect(r.ok && r.removed?.id).toBe('c2') // c1 cũ nhất nhưng đã ghim
    expect(r.ok && r.list.some((c) => c.id === 'c1')).toBe(true)
    expect(r.ok && r.list[0].id).toBe('c11')
  })

  it('cả 10 cuộc đều ghim thì không tạo được', () => {
    const list = Array.from({ length: 10 }, (_, i) => conv(i, true))
    expect(addConversation(list, conv(99))).toEqual({ ok: false, reason: 'all-pinned' })
  })

  it('chỉ gửi 20 tin gần nhất, bỏ tin lỗi, bắt đầu bằng tin người dùng', () => {
    const msgs: StoredMessage[] = Array.from({ length: 30 }, (_, i) => ({ role: i % 2 ? 'assistant' : 'user', text: `m${i}`, at: i }))
    msgs.push({ role: 'assistant', text: 'dở', error: 'Đã dừng.', at: 99 })
    const w = sendWindow(msgs)
    expect(w.length).toBeLessThanOrEqual(20)
    expect(w[0].role).toBe('user')
    expect(w.at(-1)?.text).toBe('m29')
  })

  it('đổi tên, ghim', () => {
    let list = [conv(1)]
    list = renameConversation(list, 'c1', '  Tên mới  ', 5)
    expect(list[0]).toMatchObject({ title: 'Tên mới', updatedAt: 5 })
    expect(renameConversation(list, 'c1', '   ', 6)[0].title).toBe('Tên mới')
    expect(togglePin(list, 'c1')[0].pinned).toBe(true)
  })
})

describe('prompt và bảo mật', () => {
  it('system prompt có trình độ, furigana và khối từ vựng', () => {
    const p = systemPrompt('conversation', 'N3')
    expect(p).toContain('N3')
    expect(p).toContain('漢字{かんじ}')
    expect(p).toContain('kotonoha-words')
    expect(p).toContain('Lỗi trong câu của bạn')
  })

  it('API key không vào file xuất tiến độ', () => {
    const store = new Map<string, string>()
    vi.stubGlobal('localStorage', { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => store.set(k, v), removeItem: (k: string) => store.delete(k) })
    localStorage.setItem('jla:ai-key:gemini', KEY)
    expect(JSON.stringify(createBackup({}, 20))).not.toContain(KEY)
  })
})
