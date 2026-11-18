#!/usr/bin/env node
/** Xuất toàn bộ cặp Việt–Nhật của từ điển giao diện ra docs/i18n-ja-review.md (bảng: khóa | Tiếng Việt | 日本語) để rà. */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'

const parse = (f) => {
  const src = readFileSync(f, 'utf8')
  const start = src.indexOf('{', src.indexOf('= {'))
  const end = src.lastIndexOf('}', src.lastIndexOf(src.includes('as const') ? 'as const' : 'export default'))
  return JSON.parse(src.slice(start, end + 1).replace(/,(\s*)\}$/, '$1}'))
}
const vi = parse('src/i18n/vi.ts')
const ja = parse('src/i18n/ja.ts')
const cell = (s) => s.replace(/\|/g, '\|').replace(/\n/g, '<br>') || '(rỗng)'
const groups = new Map()
for (const k of Object.keys(vi)) {
  const area = k.split('.')[0]
  if (!groups.has(area)) groups.set(area, [])
  groups.get(area).push(k)
}
let md = `# Rà soát bản dịch giao diện 日本語\n\nSinh tự động bằng \`npm run i18n:review\` từ \`src/i18n/vi.ts\` và \`src/i18n/ja.ts\` (${Object.keys(vi).length} khóa).\n`
md += 'Sửa bản dịch trong `src/i18n/ja.ts` rồi chạy lại lệnh này. `{ten}` là tham số (số, tên…) được điền khi chạy.\n'
md += 'Dữ liệu học (nghĩa từ, âm Hán Việt, giải thích ngữ pháp, cách dùng trợ số từ, câu dịch ví dụ) không nằm ở đây: luôn là tiếng Việt.\n'
for (const [area, keys] of [...groups.entries()].sort()) {
  md += `\n## ${area}\n\n| Khóa | Tiếng Việt | 日本語 |\n|---|---|---|\n`
  for (const k of keys.sort()) md += `| \`${k}\` | ${cell(vi[k])} | ${cell(ja[k] ?? '')} |\n`
}
mkdirSync('docs', { recursive: true })
writeFileSync('docs/i18n-ja-review.md', md)
console.log(`docs/i18n-ja-review.md: ${Object.keys(vi).length} khóa`)
