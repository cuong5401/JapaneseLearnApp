import { useParams } from 'react-router-dom'
import { TERM_CATEGORIES, VOCAB_DECKS, type Deck, type TermCategory, type VocabDeckKey } from '../types'

/** Đọc bộ học từ URL: /vocab/:deck/... hoặc /terms/:category/... */
export function useDeck(): Deck | null {
  const { deck, category } = useParams()
  if (deck && (VOCAB_DECKS as readonly string[]).includes(deck)) return { kind: 'vocab', key: deck as VocabDeckKey }
  if (category && (TERM_CATEGORIES as readonly string[]).includes(category))
    return { kind: 'terms', category: category as TermCategory }
  return null
}
