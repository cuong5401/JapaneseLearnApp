import { toHiragana, toKatakana, toRomaji } from 'wanakana'
import { KANA, KANA_ROWS, SCRIPT_LABELS, counterpart } from '../../data/kana'
import type { KanaScript, KanjiEntry, RadicalEntry, StudyEntry, VocabItem } from '../../types'
import { KANJI_LEVEL_SHORT, isKanjiLevel, type KanjiLevelFilter } from '../kanjiLessons'
import type { KanjiReading } from '../readings'
import { slug, type WritingItem } from './layout'
import { t } from '../../i18n'

/** Nguồn chữ của phiếu luyện viết (đồng bộ với URL /writing?src=…). */
export type WritingSource =
  | { kind: 'kanji'; level: KanjiLevelFilter; /** Số bài, bắt đầu từ 1 */ lessons: number[] }
  | { kind: 'notebook'; id: string }
  | { kind: 'kana'; script: KanaScript; rows: string[] }
  | { kind: 'custom'; text: string }
  /** Bộ thủ: theo bài (chia như tab Bộ thủ) hoặc theo số bộ (`nos` khác rỗng, vd. 1–20, 30) */
  | { kind: 'radical'; lessons: number[]; nos: number[] }

const ROW_IDS = new Set(KANA_ROWS.map((r) => r.id))

export function parseSource(p: URLSearchParams): WritingSource {
  const src = p.get('src')
  if (src === 'notebook') return { kind: 'notebook', id: p.get('id') ?? '' }
  if (src === 'kana') {
    const script: KanaScript = p.get('script') === 'katakana' ? 'katakana' : 'hiragana'
    const prefix = script === 'hiragana' ? 'h-' : 'k-'
    const rows = (p.get('rows') ?? '').split(',').filter((r) => ROW_IDS.has(r) && r.startsWith(prefix))
    return { kind: 'kana', script, rows: rows.length ? rows : [`${prefix}basic-a`] }
  }
  if (src === 'custom') return { kind: 'custom', text: p.get('text') ?? '' }
  const lessons = [...new Set((p.get('bai') ?? '1').split(',').map(Number))].filter((n) => Number.isInteger(n) && n >= 1).sort((a, b) => a - b)
  if (src === 'radical') {
    const nos = parseRanges(p.get('so') ?? '', 214)
    return { kind: 'radical', lessons: nos.length ? [] : lessons.length ? lessons : [1], nos }
  }
  const level = p.get('level')
  return { kind: 'kanji', level: isKanjiLevel(level) ? level : 'N5', lessons: lessons.length ? lessons : [1] }
}

/** Tham số URL của một nguồn (chữ tự nhập không đưa lên URL: có thể rất dài). */
export function sourceParams(s: WritingSource): Record<string, string> {
  if (s.kind === 'notebook') return { src: 'notebook', id: s.id }
  if (s.kind === 'kana') return { src: 'kana', script: s.script, rows: s.rows.join(',') }
  if (s.kind === 'custom') return { src: 'custom' }
  if (s.kind === 'radical') return s.nos.length ? { src: 'radical', so: formatRanges(s.nos) } : { src: 'radical', bai: s.lessons.join(',') }
  return { src: 'kanji', level: s.level, bai: s.lessons.join(',') }
}

/** "1–3" (liền nhau) hoặc "1, 3, 5". */
function lessonLabel(lessons: readonly number[]): { label: string; key: string } {
  const contiguous = lessons.every((n, i) => i === 0 || n === lessons[i - 1] + 1)
  if (lessons.length === 1) return { label: String(lessons[0]), key: String(lessons[0]) }
  if (contiguous) return { label: `${lessons[0]}–${lessons[lessons.length - 1]}`, key: `${lessons[0]}-${lessons[lessons.length - 1]}` }
  return { label: lessons.join(', '), key: lessons.join('_') }
}

/** "1-20, 30" → [1…20, 30] (bỏ số ngoài 1…max, bỏ trùng, sắp xếp). */
export function parseRanges(text: string, max: number): number[] {
  const out = new Set<number>()
  for (const part of text.split(/[,，、\s]+/)) {
    const m = part.match(/^(\d+)(?:[-–~〜](\d+))?$/)
    if (!m) continue
    const a = Number(m[1])
    const b = m[2] ? Number(m[2]) : a
    for (let n = Math.min(a, b); n <= Math.max(a, b) && n <= max; n++) if (n >= 1) out.add(n)
  }
  return [...out].sort((x, y) => x - y)
}

/** [1…20, 30] → "1-20,30" */
export function formatRanges(nos: readonly number[]): string {
  const out: string[] = []
  for (let i = 0; i < nos.length; ) {
    let j = i
    while (j + 1 < nos.length && nos[j + 1] === nos[j] + 1) j++
    out.push(j > i ? `${nos[i]}-${nos[j]}` : String(nos[i]))
    i = j + 1
  }
  return out.join(',')
}

const rowKey = (id: string) => id.split('-').slice(2).join('-')

/** Tiêu đề phiếu ("N5 · Bài 1") và phần tên file ("N5-bai1"). */
export function sourceTitle(s: WritingSource, extra: { notebookName?: string } = {}): { title: string; fileKey: string } {
  if (s.kind === 'kanji') {
    const l = lessonLabel(s.lessons)
    const level = KANJI_LEVEL_SHORT[s.level]
    return { title: t('sources.bai', { level, label: l.label }), fileKey: `${/^N\d$/.test(level) ? level : slug(level)}-bai${l.key}` }
  }
  if (s.kind === 'notebook') {
    const name = extra.notebookName ?? t('common.soTay')
    return { title: t('sources.soTay', { name }), fileKey: `so-tay-${slug(name) || 'so'}` }
  }
  if (s.kind === 'kana') {
    const rows = KANA_ROWS.filter((r) => s.rows.includes(r.id))
    const script = SCRIPT_LABELS[s.script]
    const all = rows.length === KANA_ROWS.filter((r) => r.script === s.script).length
    const label = all ? t('sources.caBang') : rows.length > 4 ? t('sources.hang', { length: rows.length }) : rows.map((r) => r.label).join(', ')
    const key = all ? '' : rows.length > 4 ? `-${rows.length}-hang` : `-${rows.map((r) => rowKey(r.id)).join('-')}`
    return { title: `${script} · ${label}`, fileKey: `${slug(script)}${key}` }
  }
  if (s.kind === 'radical') {
    if (s.nos.length) {
      const label = formatRanges(s.nos).replace(/,/g, ', ').replace(/-/g, '–')
      return { title: t('sources.radicalNos', { label }), fileKey: `bo-thu-so${formatRanges(s.nos).replace(/,/g, '_')}` }
    }
    const l = lessonLabel(s.lessons)
    return { title: t('sources.radicalLessons', { label: l.label }), fileKey: `bo-thu-bai${l.key}` }
  }
  return { title: t('sources.tuChon'), fileKey: 'tu-chon' }
}

/* ───────────── Danh sách chữ của từng nguồn ───────────── */

/** Chữ của các hàng kana đã chọn (theo thứ tự bảng). */
export function kanaRowChars(rows: readonly string[]): string[] {
  return KANA_ROWS.filter((r) => rows.includes(r.id)).flatMap((r) => r.cells.flatMap((c) => (c ? [c.kana] : [])))
}

const IDEOGRAPH = /[㐀-䶿一-鿿豈-﫿⺀-⿟]/u
const KANA_CHAR = /[ぁ-ゖァ-ヺ]/u

/** Chữ Hán trong một chuỗi bất kỳ, theo thứ tự, bỏ trùng. */
export function kanjiIn(text: string): string[] {
  return [...new Set([...text].filter((c) => IDEOGRAPH.test(c)))]
}

/** Chữ của một sổ tay: chữ Hán, bộ thủ, chữ ngoài danh sách, và chữ Hán trong các từ đã lưu. */
export function notebookChars(entries: readonly StudyEntry[]): string[] {
  const out: string[] = []
  for (const e of entries) {
    if (e.kind === 'kanji') out.push(e.item.kanji)
    else if (e.kind === 'char') out.push(e.item.char)
    else if (e.kind === 'radical') out.push(e.item.radical)
    else if (e.kind === 'word' || e.kind === 'counter') out.push(...kanjiIn(e.kind === 'word' ? e.item.word : e.item.counter))
  }
  return [...new Set(out)]
}

/**
 * Chữ tự nhập: giữ chữ Hán và kana có dữ liệu nét, bỏ trùng. `dropped` = ký tự bị bỏ (không có nét, không phải chữ),
 * không tính khoảng trắng.
 */
export function parseCustom(text: string, hasStrokes: (ch: string) => boolean): { chars: string[]; dropped: string[] } {
  const chars: string[] = []
  const dropped: string[] = []
  for (const c of text.normalize('NFC')) {
    if (/\s/u.test(c)) continue
    const ok = (IDEOGRAPH.test(c) || KANA_CHAR.test(c)) && hasStrokes(c)
    const list = ok ? chars : dropped
    if (!list.includes(c)) list.push(c)
  }
  return { chars, dropped }
}

/* ───────────── Dựng WritingItem ───────────── */

const KANA_BY_CHAR = new Map(KANA.map((k) => [k.kana, k]))
const isKanaText = (s: string) => [...s].every((c) => KANA_CHAR.test(c))

/** Nghĩa ngắn cho dòng ví dụ: phần đầu trước dấu phẩy / chấm phẩy / ngoặc, tối đa 28 ký tự. */
export function shortMeaning(meaning: string): string {
  const first = meaning.split(/[;,；，、(（/]/)[0].trim() || meaning.trim()
  return [...first].length > 28 ? [...first].slice(0, 27).join('') + '…' : first
}

/** 1–2 từ ví dụ: từ ngắn (≤ 4 ký tự) có nghĩa, theo thứ tự trong kanji.json (cấp thấp trước). */
export function pickExamples(entry: KanjiEntry | undefined, words: ReadonlyMap<string, VocabItem>, count: number): WritingItem['examples'] {
  if (!entry || count <= 0) return undefined
  const list = entry.words.flatMap((id) => {
    const w = words.get(id)
    return w && w.meaning && [...w.word].length <= 4 && [...w.word].length >= 2 ? [w] : []
  })
  const seen = new Set<string>()
  return list
    .filter((w) => !seen.has(w.word) && seen.add(w.word))
    .slice(0, count)
    .map((w) => ({ word: w.word, reading: w.reading, meaning: shortMeaning(w.meaning) }))
}

export interface ItemContext {
  kanji: ReadonlyMap<string, KanjiEntry>
  readings?: ReadonlyMap<string, KanjiReading>
  words?: ReadonlyMap<string, VocabItem>
  examples: number
}

export function makeItem(ch: string, ctx: ItemContext): WritingItem {
  if (isKanaText(ch)) {
    const k = KANA_BY_CHAR.get(ch)
    if (k) return { char: ch, kind: 'kana', romaji: k.romaji, counterpart: counterpart(k).kana }
    const other = /[ァ-ヺ]/u.test(ch) ? toHiragana(ch) : toKatakana(ch)
    return { char: ch, kind: 'kana', romaji: toRomaji(ch), counterpart: other }
  }
  const entry = ctx.kanji.get(ch)
  const r = ctx.readings?.get(ch)
  return {
    char: ch,
    kind: 'kanji',
    hanViet: entry?.hanViet,
    on: r?.on,
    kun: r?.kun,
    examples: ctx.words ? pickExamples(entry, ctx.words, ctx.examples) : undefined,
  }
}

/** Khối của một bộ thủ: tiêu đề "Bộ 9 · NHÂN" | biến thể | ý nghĩa; ô mẫu là dạng hiển thị của bộ. */
export function makeRadicalItem(r: RadicalEntry): WritingItem {
  return { char: r.radical, kind: 'radical', no: r.no, hanViet: r.name, variants: r.variants, meaning: r.meaning }
}

/** Chữ (kể cả âm ghép きゃ) có đủ dữ liệu nét KanjiVG không. */
export const hasStrokeData = (ch: string, index: ReadonlySet<string>) => [...ch].every((c) => index.has(c))
