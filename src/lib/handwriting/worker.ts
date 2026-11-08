/**
 * Web Worker nhận dạng chữ viết tay: nạp KanjiCanvas + mẫu nét (~2 MB) và so khớp ngoài luồng chính,
 * để nét vẽ không bị giật.
 *
 * Nhận: { type: 'init', prefer: string[] } | { type: 'recognize', seq, strokes, size }
 * Gửi:  { type: 'ready' } | { type: 'result', seq, candidates } | { type: 'error', message }
 */
import { loadRecognizer, recognizeWith, type Stroke } from './recognize'

export type WorkerIn = { type: 'init'; prefer: string[] } | { type: 'recognize'; seq: number; strokes: Stroke[]; size: number }
export type WorkerOut = { type: 'ready' } | { type: 'result'; seq: number; candidates: string[] } | { type: 'error'; message: string }

let prefer = new Set<string>()
// Kiểu DOM coi self là Window; trong worker postMessage chỉ cần một tham số.
const post = (m: WorkerOut) => (self as unknown as { postMessage(m: WorkerOut): void }).postMessage(m)

self.onmessage = async (e: MessageEvent<WorkerIn>) => {
  const msg = e.data
  try {
    const kc = await loadRecognizer()
    if (msg.type === 'init') {
      prefer = new Set(msg.prefer)
      post({ type: 'ready' })
    } else {
      post({ type: 'result', seq: msg.seq, candidates: recognizeWith(kc, msg.strokes, msg.size, prefer) })
    }
  } catch (err) {
    post({ type: 'error', message: err instanceof Error ? err.message : String(err) })
  }
}
