import type { Deck, Level, TermCategory, VocabDeckKey, VocabItem } from '../types'
import { isCharRef } from '../lib/chars'
import { isCounterRef } from '../lib/counters'
import { PUBLIC_BUILD, isGrammarId } from '../lib/edition'

import termsIt from './terms/it.json'
import termsElectronics from './terms/electronics.json'
import termsOffice from './terms/office.json'
import { t } from '../i18n'

/*
 * Dữ liệu từ vựng, kanji, ngữ pháp nằm trong public/data và được tải khi cần (src/lib/dataStore.ts).
 * Ở đây chỉ còn thông tin mô tả các bộ và nhóm thuật ngữ chuyên ngành nhỏ đóng gói sẵn.
 */

export interface VocabDeckInfo {
  key: VocabDeckKey
  path: string
  name: string
  ja: string
  level?: Level
  note?: string
}

export const VOCAB_DECK_INFO: Record<VocabDeckKey, VocabDeckInfo> = {
  n5: { key: 'n5', path: 'vocab/n5.json', get name() {
    return t('index.nhapMon')
  }, ja: '入門', level: 'N5' },
  n4: { key: 'n4', path: 'vocab/n4.json', get name() {
    return t('index.soCap')
  }, ja: '初級', level: 'N4' },
  n3: { key: 'n3', path: 'vocab/n3.json', get name() {
    return t('index.trungCap')
  }, ja: '中級', level: 'N3' },
  n2: { key: 'n2', path: 'vocab/n2.json', get name() {
    return t('index.trungCaoCap')
  }, ja: '中上級', level: 'N2' },
  n1: { key: 'n1', path: 'vocab/n1.json', get name() {
    return t('index.caoCap')
  }, ja: '上級', level: 'N1' },
  compounds: { key: 'compounds', path: 'vocab/compounds.json', get name() {
    return t('index.tuGhep')
  }, ja: '熟語', get note() {
    return t('index.tuHanGhepHai')
  } },
  onomatopoeia: { key: 'onomatopoeia', path: 'vocab/onomatopoeia.json', get name() {
    return t('index.tuLay')
  }, ja: '擬音語', get note() {
    return t('index.tuTuongThanhTuong')
  } },
  adverbs: { key: 'adverbs', path: 'vocab/adverbs.json', get name() {
    return t('index.phoTu')
  }, ja: '副詞', get note() {
    return t('index.trangTuHayGap')
  } },
}

export const LEVEL_DECKS: VocabDeckKey[] = ['n5', 'n4', 'n3', 'n2', 'n1']
export const EXTRA_DECKS: VocabDeckKey[] = ['compounds', 'onomatopoeia', 'adverbs']

/** Tiền tố ID của từng bộ: dùng để đếm tiến độ mà không cần tải dữ liệu. */
export const DECK_ID_PREFIX: Record<VocabDeckKey, string> = {
  n5: 'n5',
  n4: 'n4',
  n3: 'n3',
  n2: 'n2',
  n1: 'n1',
  compounds: 'cp',
  onomatopoeia: 'ono',
  adverbs: 'adv',
}

export const TERM_INFO: Record<TermCategory, { name: string; ja: string; note: string; prefix: string }> = {
  it: { get name() {
    return t('index.congNgheThongTin')
  }, ja: '情報技術', get note() {
    return t('index.phatTrienPhanMem')
  }, prefix: 'it' },
  electronics: { get name() {
    return t('index.dienTu')
  }, ja: '電子', get note() {
    return t('index.machLinhKienSan')
  }, prefix: 'el' },
  office: { get name() {
    return t('index.vanPhong')
  }, ja: '事務', get note() {
    return t('index.hopGiayToGiao')
  }, prefix: 'of' },
}

const TERMS: Record<TermCategory, VocabItem[]> = {
  it: termsIt,
  electronics: termsElectronics,
  office: termsOffice,
}

export const getTerms = (category: TermCategory): VocabItem[] => TERMS[category]

/** Thuật ngữ có sẵn tra theo ID (it-001, el-001, of-001). */
export const TERM_BY_ID: Map<string, { item: VocabItem; category: TermCategory }> = new Map(
  (Object.keys(TERMS) as TermCategory[]).flatMap((category) => TERMS[category].map((item) => [item.id, { item, category }] as const)),
)

export function deckKeyForId(id: string): VocabDeckKey | null {
  const prefix = id.split('-')[0]
  const found = (Object.keys(DECK_ID_PREFIX) as VocabDeckKey[]).find((k) => DECK_ID_PREFIX[k] === prefix)
  return found ?? null
}

export function deckTitle(deck: Deck): string {
  if (deck.kind === 'terms') return TERM_INFO[deck.category].name
  if (deck.kind === 'ai') return t('index.tuAiGoiY')
  const info = VOCAB_DECK_INFO[deck.key]
  return info.level ? `${info.level} ${info.name}` : info.name
}

export function deckPath(deck: Deck): string {
  if (deck.kind === 'ai') return '/ai'
  return deck.kind === 'vocab' ? `/vocab/${deck.key}` : `/terms/${deck.category}`
}

/** ID hợp lệ hiện nay: dữ liệu public/data hoặc thuật ngữ. ID của bộ mẫu cũ (n5-v-001…) bị bỏ qua. */
export function isCurrentId(id: string): boolean {
  if (PUBLIC_BUILD && isGrammarId(id)) return false
  return /^([a-z]+\d?)-[0-9a-f]{8}$/.test(id) || /^rd-\d{3}$/.test(id) || isCharRef(id) || isCounterRef(id) || TERM_BY_ID.has(id)
}
