/**
 * Sinh src/data/radical-kanji.json: bộ thủ (số 1–214) → các chữ Hán trong kanji.json thuộc bộ đó.
 *
 * Nguồn: Unicode Han Database (Unihan), trường kRSUnicode ("bộ.nét"; dấu ' là bộ biến thể giản thể,
 * vẫn tính vào cùng số bộ). © Unicode, Inc., Unicode License v3: https://www.unicode.org/license.txt
 *
 * Cách chạy:
 *   1. Tải https://www.unicode.org/Public/UCD/latest/ucd/Unihan.zip và giải nén.
 *   2. node scripts/build-radical-kanji.mjs <đường dẫn tới Unihan_IRGSources.txt>
 * Không sửa public/data: chỉ đọc kanji.json để biết bộ chữ đang dùng.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const source = process.argv[2]
if (!source) {
  console.error('Thiếu đường dẫn Unihan_IRGSources.txt')
  process.exit(1)
}

const kanji = JSON.parse(readFileSync(resolve(root, 'public/data/kanji/kanji.json'), 'utf8'))
const radicals = JSON.parse(readFileSync(resolve(root, 'public/data/kanji/radicals.json'), 'utf8'))
const wanted = new Map(kanji.map((k) => [k.kanji, k]))

const radicalOf = new Map()
for (const line of readFileSync(source, 'utf8').split('\n')) {
  const m = /^U\+([0-9A-F]+)\tkRSUnicode\t(\d+)/.exec(line)
  if (!m) continue
  const ch = String.fromCodePoint(parseInt(m[1], 16))
  if (wanted.has(ch)) radicalOf.set(ch, Number(m[2]))
}

const map = {}
for (const [ch, no] of radicalOf) (map[no] ??= []).push(ch)
for (const no of Object.keys(map)) map[no].sort((a, b) => wanted.get(b).wordCount - wanted.get(a).wordCount || a.localeCompare(b))

const known = new Set(radicals.map((r) => r.no))
const orphan = Object.keys(map).filter((no) => !known.has(Number(no)))
const missing = [...wanted.keys()].filter((ch) => !radicalOf.has(ch))
const out = {
  source: 'Unicode Unihan kRSUnicode (https://www.unicode.org/license.txt)',
  radicals: Object.fromEntries(Object.entries(map).sort((a, b) => Number(a[0]) - Number(b[0]))),
}
writeFileSync(resolve(root, 'src/data/radical-kanji.json'), JSON.stringify(out) + '\n')
console.log(`${radicalOf.size}/${wanted.size} chữ có bộ, ${Object.keys(map).length} bộ có chữ.`)
if (missing.length) console.log('Không có trong Unihan:', missing.join(''))
if (orphan.length) console.log('Bộ không có trong radicals.json:', orphan.join(', '))
