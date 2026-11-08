/**
 * Đọc luồng Server-Sent Events: trả về nội dung của từng dòng `data:` (đã nối các dòng của cùng một sự kiện).
 * Xử lý được trường hợp một dòng bị cắt giữa hai chunk mạng.
 */
export async function* readSse(body: ReadableStream<Uint8Array>, signal?: AbortSignal): AsyncGenerator<string> {
  const reader = body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let data: string[] = []
  const onAbort = () => void reader.cancel().catch(() => {})
  signal?.addEventListener('abort', onAbort)
  try {
    for (;;) {
      const { value, done } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      let nl: number
      while ((nl = buffer.indexOf('\n')) >= 0) {
        const line = buffer.slice(0, nl).replace(/\r$/, '')
        buffer = buffer.slice(nl + 1)
        if (line === '') {
          if (data.length) yield data.join('\n')
          data = []
        } else if (line.startsWith('data:')) {
          data.push(line.slice(5).replace(/^ /, ''))
        }
      }
    }
    buffer += decoder.decode()
    if (buffer.startsWith('data:')) data.push(buffer.slice(5).replace(/^ /, ''))
    if (data.length) yield data.join('\n')
  } finally {
    signal?.removeEventListener('abort', onAbort)
    reader.releaseLock()
  }
}
