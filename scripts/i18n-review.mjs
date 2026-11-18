#!/usr/bin/env node
/**
 * Xuất cặp Việt – <ngôn ngữ> của từ điển giao diện ra docs/i18n-<mã>-review.md (bảng: khóa | Tiếng Việt | bản dịch).
 *   npm run i18n:review            → mọi ngôn ngữ trong src/i18n/locales.ts (trừ vi, là bản gốc)
 *   npm run i18n:review -- ja      → chỉ một ngôn ngữ
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'

/** Đọc object từ điển trong file .ts (dạng `{ "khóa": "chuỗi", … }`). */
const parse = (f) => {
  const src = readFileSync(f, 'utf8')
  const start = src.indexOf('{', src.indexOf('= {'))
  const end = src.lastIndexOf('}', src.lastIndexOf(src.includes('as const') ? 'as const' : 'export default'))
  return JSON.parse(src.slice(start, end + 1).replace(/,(\s*)\}$/, '$1}'))
}

/** Ngôn ngữ đã đăng ký: [mã, tên]. */
const registry = [...readFileSync('src/i18n/locales.ts', 'utf8').matchAll(/^\s*(\w+): \{ name: '([^']+)'/gm)].map((m) => [m[1], m[2]])
const [root] = registry[0]
const wanted = process.argv[2] ? registry.filter(([c]) => c === process.argv[2]) : registry.filter(([c]) => c !== root)
if (!wanted.length) throw new Error(`Không có ngôn ngữ "${process.argv[2]}" trong src/i18n/locales.ts`)

const base = parse(`src/i18n/${root}.ts`)
const cell = (s) => (s ?? '').replace(/\|/g, '\\|').replace(/\n/g, '<br>') || '(rỗng)'
mkdirSync('docs', { recursive: true })
for (const [code, name] of wanted) {
  const dict = parse(`src/i18n/${code}.ts`)
  const groups = new Map()
  for (const k of Object.keys(base)) {
    const area = k.split('.')[0]
    if (!groups.has(area)) groups.set(area, [])
    groups.get(area).push(k)
  }
  let md = `# Rà soát bản dịch giao diện ${name}\n\nSinh tự động bằng \`npm run i18n:review\` từ \`src/i18n/${root}.ts\` và \`src/i18n/${code}.ts\` (${Object.keys(base).length} khóa).\n`
  md += `Sửa bản dịch trong \`src/i18n/${code}.ts\` rồi chạy lại lệnh này. \`{ten}\` là tham số; \`{n, plural, …}\` / \`{unit, select, …}\` là số nhiều / chọn nhánh; \`<b>…</b>\` là phần được định dạng riêng.\n`
  md += 'Dữ liệu học (nghĩa từ, âm Hán Việt, giải thích ngữ pháp, cách dùng trợ số từ, câu dịch ví dụ) không nằm ở đây: luôn là tiếng Việt.\n'
  for (const [area, keys] of [...groups.entries()].sort()) {
    md += `\n## ${area}\n\n| Khóa | Tiếng Việt | ${name} |\n|---|---|---|\n`
    for (const k of keys.sort()) md += `| \`${k}\` | ${cell(base[k])} | ${cell(dict[k])} |\n`
  }
  writeFileSync(`docs/i18n-${code}-review.md`, md)
  console.log(`docs/i18n-${code}-review.md: ${Object.keys(base).length} khóa`)
}
