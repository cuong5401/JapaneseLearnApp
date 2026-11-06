import { useParams } from 'react-router-dom'
import { LEVELS, TERM_CATEGORIES, type Deck, type Level, type TermCategory } from '../types'

/** Đọc bộ học từ URL: /level/:level/... hoặc /terms/:category/... */
export function useDeck(): Deck | null {
  const { level, category } = useParams()
  if (level && (LEVELS as readonly string[]).includes(level)) return { kind: 'level', level: level as Level }
  if (category && (TERM_CATEGORIES as readonly string[]).includes(category))
    return { kind: 'terms', category: category as TermCategory }
  return null
}
