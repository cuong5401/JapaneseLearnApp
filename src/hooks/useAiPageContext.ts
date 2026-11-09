import { useMemo } from 'react'
import { useLocation, useSearchParams } from 'react-router-dom'
import { parseStack } from '../lib/detailStack'
import { grammarQuestion, kanjiQuestion, wordQuestion, type PresetQuestion } from '../lib/ai/questions'
import { useEntries, useKanjiIndex } from './useData'

type Target = { t: 'item'; id: string } | { t: 'kanji'; ch: string } | null

/** Mục đang xem: chi tiết trên cùng của ngăn xếp (?xem=), chữ ở ?k= trang Chữ Hán, trang /word/:id, /grammar/:level/:id. */
function currentTarget(pathname: string, params: URLSearchParams): Target {
  const top = parseStack(params.get('xem')).at(-1)
  if (top?.t === 'w') return { t: 'item', id: top.id }
  if (top?.t === 'k') return { t: 'kanji', ch: top.ch }
  if (top) return null
  const k = pathname === '/kanji' ? (params.get('k') ?? params.get('c')) : null
  if (k && [...k].length === 1) return { t: 'kanji', ch: k }
  const word = pathname.match(/^\/word\/([^/]+)$/)
  if (word) return { t: 'item', id: decodeURIComponent(word[1]) }
  const grammar = pathname.match(/^\/grammar\/[^/]+\/([^/]+)$/)
  if (grammar) return { t: 'item', id: decodeURIComponent(grammar[1]) }
  return null
}

/** Câu hỏi soạn sẵn về mục đang xem (chip "Hỏi về 把握" trong khung chat nổi), null nếu không có. */
export function useAiPageContext(): PresetQuestion | null {
  const { pathname } = useLocation()
  const [params] = useSearchParams()
  const target = currentTarget(pathname, params)
  const itemId = target?.t === 'item' ? target.id : null
  const ids = useMemo(() => (itemId ? [itemId] : []), [itemId])
  const { entries } = useEntries(ids)
  const index = useKanjiIndex()
  const ch = target?.t === 'kanji' ? target.ch : null
  const hanViet = useMemo(() => (ch ? index.data?.find((k) => k.kanji === ch)?.hanViet : undefined), [ch, index.data])

  if (ch) return kanjiQuestion(ch, hanViet)
  const e = itemId ? entries.get(itemId) : undefined
  if (e?.kind === 'word') return wordQuestion(e.item)
  if (e?.kind === 'kanji') return kanjiQuestion(e.item.kanji, e.item.hanViet)
  if (e?.kind === 'grammar') return grammarQuestion(e.item)
  return null
}
