import { toKatakana, toRomaji } from 'wanakana'
import type { KanaChar, KanaGroup, KanaScript } from '../types'

/**
 * Bảng kana xếp như 五十音図: mỗi hàng là một "行", mỗi cột là một nguyên âm.
 * Chỉ khai báo hiragana; katakana và romaji sinh tự động (wanakana).
 * `null` = ô trống (や行, わ行).
 */
interface RowDef {
  /** Khóa hàng, dùng làm id ổn định: "k", "g", "ky"… */
  key: string
  cells: (string | null)[]
}

const BASIC: RowDef[] = [
  { key: 'a', cells: ['あ', 'い', 'う', 'え', 'お'] },
  { key: 'k', cells: ['か', 'き', 'く', 'け', 'こ'] },
  { key: 's', cells: ['さ', 'し', 'す', 'せ', 'そ'] },
  { key: 't', cells: ['た', 'ち', 'つ', 'て', 'と'] },
  { key: 'n', cells: ['な', 'に', 'ぬ', 'ね', 'の'] },
  { key: 'h', cells: ['は', 'ひ', 'ふ', 'へ', 'ほ'] },
  { key: 'm', cells: ['ま', 'み', 'む', 'め', 'も'] },
  { key: 'y', cells: ['や', null, 'ゆ', null, 'よ'] },
  { key: 'r', cells: ['ら', 'り', 'る', 'れ', 'ろ'] },
  { key: 'w', cells: ['わ', null, null, null, 'を'] },
  { key: 'nn', cells: ['ん', null, null, null, null] },
]

const DAKUTEN: RowDef[] = [
  { key: 'g', cells: ['が', 'ぎ', 'ぐ', 'げ', 'ご'] },
  { key: 'z', cells: ['ざ', 'じ', 'ず', 'ぜ', 'ぞ'] },
  { key: 'd', cells: ['だ', 'ぢ', 'づ', 'で', 'ど'] },
  { key: 'b', cells: ['ば', 'び', 'ぶ', 'べ', 'ぼ'] },
  { key: 'p', cells: ['ぱ', 'ぴ', 'ぷ', 'ぺ', 'ぽ'] },
]

const YOON: RowDef[] = [
  { key: 'ky', cells: ['きゃ', 'きゅ', 'きょ'] },
  { key: 'sh', cells: ['しゃ', 'しゅ', 'しょ'] },
  { key: 'ch', cells: ['ちゃ', 'ちゅ', 'ちょ'] },
  { key: 'ny', cells: ['にゃ', 'にゅ', 'にょ'] },
  { key: 'hy', cells: ['ひゃ', 'ひゅ', 'ひょ'] },
  { key: 'my', cells: ['みゃ', 'みゅ', 'みょ'] },
  { key: 'ry', cells: ['りゃ', 'りゅ', 'りょ'] },
  { key: 'gy', cells: ['ぎゃ', 'ぎゅ', 'ぎょ'] },
  { key: 'j', cells: ['じゃ', 'じゅ', 'じょ'] },
  { key: 'by', cells: ['びゃ', 'びゅ', 'びょ'] },
  { key: 'py', cells: ['ぴゃ', 'ぴゅ', 'ぴょ'] },
]

const TABLE_DEFS: Record<KanaGroup, RowDef[]> = { basic: BASIC, dakuten: DAKUTEN, yoon: YOON }

export const KANA_GROUP_LABELS: Record<KanaGroup, string> = {
  basic: 'Bảng 50 âm',
  dakuten: 'Âm đục, bán đục',
  yoon: 'Âm ghép',
}

export const KANA_GROUPS: KanaGroup[] = ['basic', 'dakuten', 'yoon']

export const SCRIPT_LABELS: Record<KanaScript, string> = { hiragana: 'Hiragana', katakana: 'Katakana' }

export const COLUMN_LABELS: Record<KanaGroup, string[]> = {
  basic: ['a', 'i', 'u', 'e', 'o'],
  dakuten: ['a', 'i', 'u', 'e', 'o'],
  yoon: ['ya', 'yu', 'yo'],
}

const SCRIPT_PREFIX: Record<KanaScript, string> = { hiragana: 'h', katakana: 'k' }

/** Một hàng của bảng theo một bảng chữ: ô trống giữ `null` để vẽ đúng vị trí. */
export interface KanaRow {
  id: string
  group: KanaGroup
  script: KanaScript
  /** Nhãn đầu hàng: "あ行", "きゃ行"… */
  label: string
  cells: (KanaChar | null)[]
}

function makeChar(hira: string, script: KanaScript, group: KanaGroup, rowId: string, col: number): KanaChar {
  const romaji = toRomaji(hira)
  return {
    id: `${SCRIPT_PREFIX[script]}-${romaji}${hira === 'ぢ' || hira === 'づ' ? '-d' : ''}`,
    kana: script === 'hiragana' ? hira : toKatakana(hira),
    romaji,
    script,
    group,
    row: rowId,
    col,
  }
}

function buildRows(script: KanaScript): KanaRow[] {
  return KANA_GROUPS.flatMap((group) =>
    TABLE_DEFS[group].map((def) => {
      const id = `${SCRIPT_PREFIX[script]}-${group}-${def.key}`
      const cells = def.cells.map((h, col) => (h ? makeChar(h, script, group, id, col) : null))
      const first = cells.find(Boolean)!
      return { id, group, script, label: def.key === 'nn' ? first.kana : `${first.kana}行`, cells }
    }),
  )
}

export const KANA_ROWS: KanaRow[] = [...buildRows('hiragana'), ...buildRows('katakana')]

export const KANA: KanaChar[] = KANA_ROWS.flatMap((r) => r.cells.filter((c): c is KanaChar => c !== null))

export const KANA_BY_ID = new Map(KANA.map((k) => [k.id, k]))
const BY_KANA = new Map(KANA.map((k) => [k.kana, k]))

export const kanaOf = (script: KanaScript) => KANA.filter((k) => k.script === script)
export const rowsOf = (script: KanaScript, group?: KanaGroup) =>
  KANA_ROWS.filter((r) => r.script === script && (!group || r.group === group))

/** Chữ tương ứng ở bảng kia: あ ↔ ア. */
export function counterpart(k: KanaChar): KanaChar {
  const other = k.script === 'hiragana' ? 'k' : 'h'
  return KANA_BY_ID.get(other + k.id.slice(1))!
}

/** Ghi chú cách đọc cho các chữ trùng âm. */
export const KANA_NOTES: Record<string, string> = {
  ぢ: 'Đọc giống じ (ji). Gõ "di" cũng được. Ít gặp, chủ yếu trong từ ghép như はなぢ.',
  づ: 'Đọc giống ず (zu). Gõ "du" cũng được. Gặp trong つづく, こづつみ…',
  を: 'Đọc "o", chỉ dùng làm trợ từ. Gõ "wo".',
  は: 'Khi làm trợ từ đọc là "wa".',
  へ: 'Khi làm trợ từ đọc là "e".',
  ヂ: 'Đọc giống ジ (ji). Gõ "di" cũng được.',
  ヅ: 'Đọc giống ズ (zu). Gõ "du" cũng được.',
}

/**
 * Nhóm chữ dễ nhầm hình dạng. Mỗi nhóm chỉ chứa chữ cùng một bảng.
 * Dùng cho phần "Dễ nhầm với" và để chọn đáp án nhiễu trong trắc nghiệm.
 */
const SHAPE_GROUPS: string[][] = [
  // Hiragana
  ['ぬ', 'め'],
  ['わ', 'ね', 'れ'],
  ['る', 'ろ'],
  ['さ', 'ち'],
  ['さ', 'き'],
  ['は', 'ほ', 'け'],
  ['あ', 'お', 'め'],
  ['い', 'り'],
  ['こ', 'に', 'た'],
  ['ま', 'も'],
  ['ら', 'ろ', 'ち'],
  ['う', 'つ', 'ら'],
  ['く', 'へ'],
  ['し', 'つ'],
  ['の', 'め'],
  ['そ', 'て'],
  ['す', 'お'],
  // Katakana
  ['シ', 'ツ'],
  ['ソ', 'ン'],
  ['シ', 'ン'],
  ['ソ', 'ツ'],
  ['ク', 'ケ', 'タ'],
  ['ウ', 'ワ', 'フ'],
  ['コ', 'ユ', 'ヨ'],
  ['チ', 'テ'],
  ['ナ', 'メ', 'ノ'],
  ['ヌ', 'ス'],
  ['マ', 'ム', 'ア'],
  ['エ', 'ユ'],
  ['ハ', 'ヘ'],
  ['ル', 'レ'],
  ['オ', 'ホ'],
  ['セ', 'ヤ'],
  ['ラ', 'ヲ', 'フ'],
  ['リ', 'ソ'],
  ['キ', 'サ'],
]

const SHAPES = new Map<string, Set<string>>()
for (const group of SHAPE_GROUPS) {
  for (const a of group) {
    const set = SHAPES.get(a) ?? new Set<string>()
    group.forEach((b) => b !== a && set.add(b))
    SHAPES.set(a, set)
  }
}

/** Dấu ゛゜: が ↔ か, ば ↔ ぱ ↔ は (so sánh sau khi bỏ dấu). */
function stripMarks(kana: string): string {
  return kana.normalize('NFD').replace(/[゙゚]/g, '').normalize('NFC')
}

/**
 * Chữ dễ nhầm với `k` (cùng bảng chữ), sắp theo mức dễ nhầm:
 *  1. giống hình dạng (danh sách SHAPE_GROUPS, kể cả bản có dấu: ぬ ↔ め ⇒ ぶ không liên quan);
 *  2. cùng chữ gốc khác dấu ゛゜ (か/が, は/ば/ぱ);
 *  3. âm ghép: cùng hàng khác nguyên âm (きゃ/きょ) hoặc cùng nguyên âm hàng gần (しゃ/ちゃ).
 */
export function confusables(k: KanaChar): KanaChar[] {
  const out: KanaChar[] = []
  const add = (c: KanaChar | undefined) => {
    if (c && c.id !== k.id && c.script === k.script && !out.includes(c)) out.push(c)
  }
  const base = stripMarks(k.kana)
  if (k.group !== 'yoon') {
    // Giữ nguyên dấu nếu chữ kia cũng có bản có dấu: ば ↔ ぼ (vì は ↔ ほ), rồi tới bản không dấu.
    const mark = k.kana.normalize('NFD').slice(1)
    for (const s of SHAPES.get(base) ?? []) {
      if (mark) add(BY_KANA.get((s + mark).normalize('NFC')))
      add(BY_KANA.get(s))
    }
  }
  for (const c of KANA) if (c.script === k.script && c.kana.length === k.kana.length && stripMarks(c.kana) === base) add(c)
  if (k.group === 'yoon') {
    const [head, small] = [...k.kana]
    for (const c of KANA) {
      if (c.group !== 'yoon' || c.script !== k.script) continue
      const [h2, s2] = [...c.kana]
      if (h2 === head || (s2 === small && SHAPES.get(stripMarks(head))?.has(stripMarks(h2)))) add(c)
    }
  }
  return out
}
