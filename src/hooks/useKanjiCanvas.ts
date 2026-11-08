import { useCallback, useEffect, useRef, useState } from 'react'
import type { Stroke } from '../lib/handwriting/recognize'
import type { WorkerIn, WorkerOut } from '../lib/handwriting/worker'

export type RecognizerStatus = 'loading' | 'ready' | 'error'

/**
 * Bảng vẽ chữ Hán: giữ các nét, gửi sang Web Worker nhận dạng sau mỗi nét, trả về tối đa 10 ứng viên.
 * Worker (và ~2 MB mẫu nét) chỉ tạo khi component dùng hook này được mở.
 *
 * @param prefer chữ ưu tiên xếp trước (chữ có trong kanji.json); có thể đến muộn, sẽ gửi lại khi có.
 */
export function useKanjiCanvas(prefer: readonly string[] | undefined) {
  const [strokes, setStrokes] = useState<Stroke[]>([])
  const [candidates, setCandidates] = useState<string[]>([])
  const [status, setStatus] = useState<RecognizerStatus>('loading')
  const [attempt, setAttempt] = useState(0)
  const worker = useRef<Worker | null>(null)
  const seq = useRef(0)
  const size = useRef(256)
  const latest = useRef<Stroke[]>([])

  const setSize = useCallback((px: number) => {
    size.current = px
  }, [])

  const send = useCallback((m: WorkerIn) => worker.current?.postMessage(m), [])

  const run = useCallback(
    (next: Stroke[]) => {
      latest.current = next
      seq.current++
      if (next.length === 0) setCandidates([])
      else send({ type: 'recognize', seq: seq.current, strokes: next, size: size.current })
    },
    [send],
  )

  useEffect(() => {
    const w = new Worker(new URL('../lib/handwriting/worker.ts', import.meta.url), { type: 'module' })
    worker.current = w
    w.onmessage = (e: MessageEvent<WorkerOut>) => {
      const m = e.data
      if (m.type === 'ready') {
        setStatus('ready')
        if (latest.current.length) run(latest.current)
      } else if (m.type === 'result') {
        // Bỏ kết quả cũ: chỉ nhận kết quả của lần gửi mới nhất.
        if (m.seq === seq.current) setCandidates(m.candidates)
      } else setStatus('error')
    }
    w.onerror = () => setStatus('error')
    w.postMessage({ type: 'init', prefer: [] } satisfies WorkerIn)
    return () => {
      w.terminate()
      worker.current = null
    }
  }, [attempt, run])

  const preferKey = prefer?.join('') ?? ''
  useEffect(() => {
    if (!preferKey) return
    send({ type: 'init', prefer: [...preferKey] })
    if (latest.current.length) run(latest.current)
  }, [preferKey, send, run, attempt])

  return {
    strokes,
    candidates,
    status,
    /** Kích thước khung vẽ (px CSS), để co tọa độ về khung 256 của thư viện (hàm ổn định). */
    setSize,
    addStroke: (s: Stroke) => {
      const next = [...latest.current, s]
      setStrokes(next)
      run(next)
    },
    undo: () => {
      const next = latest.current.slice(0, -1)
      setStrokes(next)
      run(next)
    },
    clear: () => {
      setStrokes([])
      run([])
    },
    retry: () => {
      setStatus('loading')
      setAttempt((a) => a + 1)
    },
  }
}

export type KanjiCanvasState = ReturnType<typeof useKanjiCanvas>
