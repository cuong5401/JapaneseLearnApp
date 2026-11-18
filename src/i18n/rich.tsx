import { Fragment, type ReactNode } from 'react'
import { t, type MessageKey, type Params } from '.'

/**
 * Dịch câu có phần định dạng riêng (chữ đậm, số có hiệu ứng…) mà vẫn để CẢ CÂU trong từ điển, nhờ đó mỗi ngôn ngữ
 * tự đặt trật tự từ / số nhiều:  "Đã học <b>{learned}</b>/{total}"  →  tRich(key, params, { b: (s) => <strong>{s}</strong> }).
 * Thẻ dạng `<ten>…</ten>` (không lồng nhau); thẻ không có trong `tags` thì giữ nguyên chữ bên trong.
 */
export function tRich(key: MessageKey, params: Params | undefined, tags: Record<string, (chunk: string) => ReactNode>): ReactNode {
  const text = t(key, params)
  const out: ReactNode[] = []
  const re = /<(\w+)>([\s\S]*?)<\/\1>/g
  let last = 0
  let m: RegExpExecArray | null
  let i = 0
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index))
    const render = tags[m[1]]
    out.push(<Fragment key={i++}>{render ? render(m[2]) : m[2]}</Fragment>)
    last = m.index + m[0].length
  }
  if (last < text.length) out.push(text.slice(last))
  return <>{out}</>
}
