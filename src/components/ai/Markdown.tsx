import ReactMarkdown, { type Components } from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { splitFurigana } from '../../lib/ai/parse'

/** Nút mdast tối thiểu (tránh phụ thuộc trực tiếp vào @types/mdast). */
interface MdNode {
  type: string
  value?: string
  children?: MdNode[]
  data?: Record<string, unknown>
}

/**
 * Plugin remark: chữ 漢字{かんじ} trong văn bản → <ruby>漢字<rt>かんじ</rt></ruby>.
 * Không đụng tới khối code / inline code (furigana trong code giữ nguyên chữ).
 */
function remarkFurigana() {
  const walk = (node: MdNode) => {
    if (!node.children) return
    const next: MdNode[] = []
    for (const child of node.children) {
      if (child.type === 'text' && child.value && child.value.includes('{')) {
        for (const part of splitFurigana(child.value)) {
          if (!part.ruby) next.push({ type: 'text', value: part.text })
          else
            next.push({
              type: 'ruby',
              data: {
                hName: 'ruby',
                hChildren: [
                  { type: 'text', value: part.text },
                  { type: 'element', tagName: 'rt', properties: {}, children: [{ type: 'text', value: part.ruby }] },
                ],
              },
            })
        }
      } else {
        if (child.type !== 'code' && child.type !== 'inlineCode') walk(child)
        next.push(child)
      }
    }
    node.children = next
  }
  return (tree: MdNode) => walk(tree)
}

const components: Components = {
  a: ({ href, children }) => (
    <a href={href} target="_blank" rel="noreferrer noopener" className="text-ai underline">
      {children}
    </a>
  ),
  table: ({ children }) => (
    <div className="my-3 max-w-full overflow-x-auto overscroll-x-contain">
      <table className="w-full border-collapse text-sm">{children}</table>
    </div>
  ),
  th: ({ children }) => <th className="border border-line bg-sunken px-2 py-1.5 text-left font-semibold">{children}</th>,
  td: ({ children }) => <td className="border border-line px-2 py-1.5 align-top">{children}</td>,
}

/** Markdown của câu trả lời AI: GFM (bảng, danh sách) + furigana. Không render HTML thô. */
export function AiMarkdown({ text }: { text: string }) {
  return (
    <div className="ai-md min-w-0 leading-relaxed break-words">
      <ReactMarkdown remarkPlugins={[remarkGfm, remarkFurigana]} components={components}>
        {text}
      </ReactMarkdown>
    </div>
  )
}
