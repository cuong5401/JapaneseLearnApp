import { useLocation, useNavigate } from 'react-router-dom'
import { aiDock } from '../../lib/ai/dock'
import { askAiHref } from '../../lib/ai/handoff'
import type { PresetQuestion } from '../../lib/ai/questions'

/**
 * Nút "Hỏi AI": mở khung chat nổi với câu hỏi soạn sẵn (tự gửi nếu đã có key, chưa có thì điền sẵn).
 * Đang ở trang /ai (không có khung nổi) thì mở cuộc mới ngay trên trang như trước.
 */
export function AskAiLink({ question, className = '' }: { question: PresetQuestion; className?: string }) {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const onClick = () => {
    if (pathname.startsWith('/ai')) navigate(askAiHref(question.mode, question.text))
    else aiDock.ask({ mode: question.mode, text: question.text })
  }
  return (
    <button
      type="button"
      onClick={onClick}
      data-ask-ai
      className={`inline-flex min-h-11 items-center justify-center gap-1.5 rounded-lg border border-line px-3 text-sm font-semibold hover:border-ai hover:text-ai ${className}`}
    >
      <span lang="ja" aria-hidden className="font-jp">
        問
      </span>
      Hỏi AI
    </button>
  )
}
