import { AiError, type AiProvider, type AiRequest } from './types'

/**
 * Nhà cung cấp giả để test (Vitest, Playwright): không gọi mạng, trả lời dần theo kịch bản.
 * Chỉ được đăng ký ở bản dev (xem ./index.ts), không có trong bản build.
 *  - "#401" trong câu hỏi → lỗi key; "#429" → hết hạn mức; "#offline" → mất mạng; "#table" → bảng rộng 6 cột.
 */
export const MOCK_REPLY = [
  'Từ **',
  '日本語{にほんご}',
  '** nghĩa là ',
  'tiếng Nhật.\n\n',
  '- Ví dụ: ',
  '日本語{にほんご}を',
  '勉強{べんきょう}しています。',
  '\n- Dịch: Tôi đang học tiếng Nhật.\n\n',
  '```kotonoha-words\n',
  '[{"word":"日本語","reading":"にほんご","meaning":"tiếng Nhật","hanViet":"NHẬT BẢN NGỮ"},',
  '{"word":"勉強","reading":"べんきょう","meaning":"học tập","hanViet":"MIỄN CƯỜNG"}]\n',
  '```',
]

/** Bảng rộng (6 cột, chữ Nhật dài) để test cuộn ngang trong khung chat. */
export const MOCK_TABLE = [
  'So sánh:\n\n',
  '| Từ | Cách đọc | Nghĩa | Ví dụ | Dịch | Ghi chú |\n',
  '|---|---|---|---|---|---|\n',
  '| 把握 | はあく | nắm bắt | 状況を正確に把握する必要があります | Cần nắm bắt tình hình chính xác | Văn viết, trang trọng |\n',
  '| 理解 | りかい | hiểu | 日本の文化をもっと深く理解したいです | Tôi muốn hiểu sâu hơn văn hóa Nhật | Dùng rộng rãi |\n',
]

const wait = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    const t = setTimeout(resolve, ms)
    signal?.addEventListener('abort', () => {
      clearTimeout(t)
      reject(new AiError('aborted'))
    })
  })

export const mock: AiProvider & { delay: number } = {
  id: 'mock',
  delay: 120,
  async *stream(req: AiRequest) {
    const last = req.messages[req.messages.length - 1]?.text ?? ''
    await wait(mock.delay, req.signal)
    if (last.includes('#401')) throw new AiError('auth', 'mock', 401)
    if (last.includes('#429')) throw new AiError('quota', 'mock', 429)
    if (last.includes('#offline')) throw new AiError('network')
    // Gọi một lần (lib/ai/complete.ts): câu ví dụ / bản dịch giả cho test.
    if (last.includes('[kotonoha-examples]')) {
      yield JSON.stringify([
        { ja: 'AIが作った例文その一です。', vi: 'Câu ví dụ AI tạo số một.' },
        { ja: 'AIが作った二つ目の文です。', vi: 'Câu thứ hai AI tạo.' },
        { ja: 'これは三つ目の例文です。', vi: 'Đây là câu ví dụ thứ ba.' },
      ])
      return
    }
    if (last.includes('[kotonoha-translate]')) {
      yield 'Bản dịch tiếng Việt (AI).'
      return
    }
    for (const part of last.includes('#table') ? MOCK_TABLE : MOCK_REPLY) {
      if (req.signal?.aborted) throw new AiError('aborted')
      yield part
      await wait(mock.delay, req.signal)
    }
  },
}
