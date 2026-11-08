import { Link } from 'react-router-dom'
import { askAiHref } from '../../lib/ai/handoff'
import type { ChatMode } from '../../lib/ai/prompts'

/** Nút "Hỏi AI": mở /ai ở chế độ phù hợp với câu hỏi soạn sẵn (tự gửi nếu đã có key). */
export function AskAiLink({ mode, q, className = '' }: { mode: ChatMode; q: string; className?: string }) {
  return (
    <Link
      to={askAiHref(mode, q)}
      data-ask-ai
      className={`inline-flex min-h-11 items-center justify-center gap-1.5 rounded-lg border border-line px-3 text-sm font-semibold hover:border-ai hover:text-ai ${className}`}
    >
      <span lang="ja" aria-hidden className="font-jp">
        問
      </span>
      Hỏi AI
    </Link>
  )
}
