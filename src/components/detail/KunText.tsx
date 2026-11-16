import { Fragment } from 'react'
import { displayKun, kunSegments } from '../../lib/readings'

/**
 * Danh sách âm Kun theo ký hiệu KANJIDIC2: "おも.う", "ひと-", "-あ.がる". Dấu "." vẫn hiện; phần okurigana sau
 * dấu chấm in nhạt (--muted) để thấy phần nào là âm của chữ Hán. Dùng ở panel chi tiết, flashcard, trang chủ.
 */
export function KunText({ kun }: { kun: readonly string[] }) {
  return (
    <span lang="ja" className="font-jp">
      {displayKun(kun).map((k, i) => (
        <Fragment key={k}>
          {i > 0 && '、'}
          {kunSegments(k).map((s, j) =>
            s.okurigana ? (
              <span key={j} className="text-muted" data-okurigana>
                {s.text}
              </span>
            ) : (
              <Fragment key={j}>{s.text}</Fragment>
            ),
          )}
        </Fragment>
      ))}
    </span>
  )
}
