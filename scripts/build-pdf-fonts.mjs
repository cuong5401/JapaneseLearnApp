/**
 * Font nhúng vào phiếu luyện viết (PDF / Word), subset sẵn để tải nhanh.
 * Chạy tay khi đổi danh sách chữ (kanji.json, bộ thủ, strokes/index.json): `node scripts/build-pdf-fonts.mjs`
 * Tải font gốc từ github.com/google/fonts (giấy phép SIL OFL 1.1), subset bằng subset-font (HarfBuzz),
 * ghi vào src/assets/fonts/ (import `?url` trong src/lib/writing/fonts.ts, chỉ tải khi bấm xuất).
 * Khi xuất, pdf-lib còn subset thêm lần nữa: file PDF chỉ chứa ký tự thật sự dùng.
 *
 * LƯU Ý: HarfBuzz ghi glyph độ dài lẻ (bảng loca dạng dài). Bộ subset của @pdf-lib/fontkit chép nguyên byte glyph
 * rồi ghi loca dạng ngắn (offset / 2) → glyph lẻ và các glyph sau nó bị lệch, mất chữ trong PDF (ガ, キ, ひ…).
 * Vì vậy `padGlyphs` đệm mỗi glyph thành bội số 4 byte. Test: src/lib/writing/fonts.test.ts.
 *
 *  - noto-sans-jp-bold.ttf : Noto Sans JP (instance wght 700) – kana, dấu câu, chữ Hán của kanji.json + bộ thủ
 *  - be-vietnam-pro-{regular,bold}.ttf : Be Vietnam Pro – Latin + tiếng Việt
 *  - klee-one-semibold.ttf : Klee One – chữ KHÔNG có dữ liệu nét KanjiVG (ô mẫu / ô mờ vẽ bằng font)
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import subsetFont from 'subset-font'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const OUT = resolve(ROOT, 'src/assets/fonts')
const RAW = 'https://raw.githubusercontent.com/google/fonts/main/ofl'

const json = (p) => JSON.parse(readFileSync(resolve(ROOT, p), 'utf8'))
const range = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => String.fromCodePoint(a + i)).join('')

const kanji = json('public/data/kanji/kanji.json').map((k) => k.kanji)
const radicals = json('public/data/kanji/radicals.json').flatMap((r) => [r.radical, ...(r.variants ?? [])])
const strokeChars = new Set(json('public/data/strokes/index.json').chars)
const dataChars = [...new Set([...kanji, ...radicals])].filter((c) => [...c].length === 1)

const ASCII = range(0x20, 0x7e)
const LATIN_VI =
  ASCII + 'ÀÁÂÃÈÉÊÌÍÒÓÔÕÙÚÝàáâãèéêìíòóôõùúýĂăĐđĨĩŨũƠơƯư' + range(0x1ea0, 0x1ef9) + '–—‘’“”…·'
const JP = ASCII + range(0x3000, 0x303f) + range(0x3041, 0x3096) + range(0x309b, 0x30ff) + range(0xff01, 0xff5e) + '・…' + dataChars.join('')
const NO_STROKES = dataChars.filter((c) => !strokeChars.has(c)).join('')

const FONTS = [
  { out: 'noto-sans-jp-bold.ttf', src: 'notosansjp/NotoSansJP%5Bwght%5D.ttf', text: JP, axes: { wght: 700 } },
  { out: 'be-vietnam-pro-regular.ttf', src: 'bevietnampro/BeVietnamPro-Regular.ttf', text: LATIN_VI },
  { out: 'be-vietnam-pro-bold.ttf', src: 'bevietnampro/BeVietnamPro-Bold.ttf', text: LATIN_VI },
  // Chỉ chữ thiếu nét KanjiVG (kana và chữ Hán còn lại đều có nét).
  { out: 'klee-one-semibold.ttf', src: 'kleeone/KleeOne-SemiBold.ttf', text: NO_STROKES || '?' },
]

/** Đệm mỗi glyph trong bảng glyf thành bội số 4 byte, ghi loca dạng dài, tính lại checksum (font TrueType). */
function padGlyphs(font) {
  const src = Buffer.from(font)
  const numTables = src.readUInt16BE(4)
  const tables = []
  for (let i = 0; i < numTables; i++) {
    const at = 12 + i * 16
    tables.push({ tag: src.toString('latin1', at, at + 4), offset: src.readUInt32BE(at + 8), length: src.readUInt32BE(at + 12) })
  }
  const get = (tag) => tables.find((t) => t.tag === tag)
  const [head, loca, glyf, maxp] = ['head', 'loca', 'glyf', 'maxp'].map(get)
  if (!glyf || !loca) return src // font CFF: không có glyf
  const numGlyphs = src.readUInt16BE(maxp.offset + 4)
  const long = src.readInt16BE(head.offset + 50) === 1
  const offs = Array.from({ length: numGlyphs + 1 }, (_, i) => (long ? src.readUInt32BE(loca.offset + i * 4) : src.readUInt16BE(loca.offset + i * 2) * 2))
  const parts = []
  const newOffs = [0]
  for (let i = 0; i < numGlyphs; i++) {
    const g = src.subarray(glyf.offset + offs[i], glyf.offset + offs[i + 1])
    const padded = Buffer.alloc(Math.ceil(g.length / 4) * 4)
    g.copy(padded)
    parts.push(padded)
    newOffs.push(newOffs[i] + padded.length)
  }
  const data = new Map(tables.map((t) => [t.tag, Buffer.from(src.subarray(t.offset, t.offset + t.length))]))
  data.set('glyf', Buffer.concat(parts))
  const newLoca = Buffer.alloc((numGlyphs + 1) * 4)
  newOffs.forEach((o, i) => newLoca.writeUInt32BE(o, i * 4))
  data.set('loca', newLoca)
  const newHead = data.get('head')
  newHead.writeInt16BE(1, 50) // indexToLocFormat = long
  newHead.writeUInt32BE(0, 8) // checkSumAdjustment tính lại bên dưới

  const checksum = (buf) => {
    const p = Buffer.alloc(Math.ceil(buf.length / 4) * 4)
    buf.copy(p)
    let sum = 0
    for (let i = 0; i < p.length; i += 4) sum = (sum + p.readUInt32BE(i)) >>> 0
    return sum
  }
  const dir = Buffer.alloc(12 + numTables * 16)
  src.copy(dir, 0, 0, 12)
  const sorted = [...tables].sort((a, b) => (a.tag < b.tag ? -1 : 1))
  let offset = dir.length
  const bodies = []
  sorted.forEach((t, i) => {
    const body = data.get(t.tag)
    const at = 12 + i * 16
    dir.write(t.tag, at, 'latin1')
    dir.writeUInt32BE(checksum(body), at + 4)
    dir.writeUInt32BE(offset, at + 8)
    dir.writeUInt32BE(body.length, at + 12)
    const padded = Buffer.alloc(Math.ceil(body.length / 4) * 4)
    body.copy(padded)
    bodies.push(padded)
    offset += padded.length
  })
  const out = Buffer.concat([dir, ...bodies])
  const headAt = out.readUInt32BE(12 + sorted.findIndex((t) => t.tag === 'head') * 16 + 8)
  out.writeUInt32BE((0xb1b0afba - checksum(out)) >>> 0, headAt + 8)
  return out
}

mkdirSync(OUT, { recursive: true })
for (const f of FONTS) {
  const res = await fetch(`${RAW}/${f.src}`)
  if (!res.ok) throw new Error(`Tải ${f.src} lỗi ${res.status}`)
  const buf = Buffer.from(await res.arrayBuffer())
  const sub = await subsetFont(buf, f.text, { targetFormat: 'sfnt', ...(f.axes ? { variationAxes: f.axes } : {}) })
  writeFileSync(resolve(OUT, f.out), padGlyphs(sub))
  console.log(`${f.out}: ${(buf.length / 1024).toFixed(0)} KB → ${(sub.length / 1024).toFixed(0)} KB`)
}
console.log(`Chữ không có nét KanjiVG (vẽ bằng Klee One): ${NO_STROKES || '—'}`)
