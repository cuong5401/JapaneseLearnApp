import { DECK_ID_PREFIX, VOCAB_DECK_INFO, deckTitle } from '../data'
import { t } from '../i18n'
import type { TermCategory, VocabDeckKey } from '../types'

/**
 * Cây cha – con của các trang (MỘT chỗ duy nhất): nút "‹ …" của PageHeader và mục điều hướng đang sáng đều đọc từ đây.
 *  - Trang gốc (mục điều hướng chính): `/`, `/learn`, `/review`, `/notebooks`, `/me`.
 *  - Trang con quay về CHA TRỰC TIẾP: /kanji → Học, /vocab/n5/3 → N5 Nhập môn, /grammar/n5/gn5-… → Ngữ pháp N5,
 *    /settings → Cá nhân…
 * Trang biết thêm dữ liệu (vd. chi tiết từ biết số bài) có thể truyền `back` cụ thể hơn, nhưng cha phải cùng nhánh.
 */
export interface ParentLink {
  to: string
  label: string
}

/** Trang gốc = mục điều hướng chính. */
export const ROOTS = ['/', '/learn', '/review', '/notebooks', '/me'] as const
export type RootPath = (typeof ROOTS)[number]

const learn = (): ParentLink => ({ to: '/learn', label: t('common.hoc') })
const me = (): ParentLink => ({ to: '/me', label: t('common.caNhan') })
const notebooks = (): ParentLink => ({ to: '/notebooks', label: t('common.soTay') })

const isVocab = (k: string): k is VocabDeckKey => Object.hasOwn(VOCAB_DECK_INFO, k)
const vocabDeck = (key: string): ParentLink | null => (isVocab(key) ? { to: `/vocab/${key}`, label: deckTitle({ kind: 'vocab', key }) } : null)

/** Bộ từ của một id từ vựng (theo tiền tố id: n5-…, cp-…). */
function deckOfWordId(id: string): VocabDeckKey | null {
  const prefix = id.split('-')[0]
  return (Object.keys(DECK_ID_PREFIX) as VocabDeckKey[]).find((k) => DECK_ID_PREFIX[k] === prefix) ?? null
}

const RULES: [RegExp, (m: RegExpMatchArray) => ParentLink | null][] = [
  [/^\/vocab\/[^/]+$/, learn],
  [/^\/vocab\/([^/]+)\/[^/]+$/, (m) => vocabDeck(m[1]) ?? learn()],
  [/^\/word\/(.+)$/, (m) => vocabDeck(deckOfWordId(decodeURIComponent(m[1])) ?? '') ?? learn()],
  [/^\/kanji$/, learn],
  [/^\/kanji\/[^/]+\/learn$/, () => ({ to: '/kanji', label: t('common.chuHan') })],
  [/^\/grammar(\/[^/]+)?$/, learn],
  [/^\/grammar\/([^/]+)\/[^/]+$/, (m) => ({ to: `/grammar/${m[1]}`, label: t('common.nguPhap', { level: m[1].toUpperCase() }) })],
  [/^\/kana$/, learn],
  [/^\/learn\/counters$/, learn],
  [/^\/terms\/[^/]+$/, learn],
  [/^\/terms\/([^/]+)\/(flashcards|quiz)$/, (m) => ({ to: `/terms/${m[1]}`, label: deckTitle({ kind: 'terms', category: m[1] as TermCategory }) })],
  [/^\/writing$/, learn],
  [/^\/(progress|settings|ai)$/, me],
  [/^\/notebooks\/[^/]+$/, notebooks],
]

/** Cha trực tiếp của trang (null: trang gốc hoặc không có trong cây). */
export function parentOf(pathname: string): ParentLink | null {
  if ((ROOTS as readonly string[]).includes(pathname)) return null
  for (const [re, parent] of RULES) {
    const m = pathname.match(re)
    if (m) return parent(m)
  }
  return null
}

/** Trang gốc (mục điều hướng) chứa trang này: đi ngược lên cây. */
export function sectionOf(pathname: string): RootPath | null {
  let path: string | null = pathname
  for (let i = 0; path && i < 8; i++) {
    if ((ROOTS as readonly string[]).includes(path)) return path as RootPath
    path = parentOf(path)?.to.split('?')[0] ?? null
  }
  return null
}
