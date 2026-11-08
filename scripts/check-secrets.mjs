#!/usr/bin/env node
/**
 * Quét repo (các file git đang theo dõi) và dist/ tìm chuỗi giống API key thật.
 * Kotonoha không bao giờ chứa key: key người dùng nhập chỉ nằm trong localStorage trình duyệt của họ.
 * Chạy: npm run check:secrets (CI chạy sau bước build).
 */
import { execFileSync } from 'node:child_process'
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

const PATTERNS = [
  { name: 'Google / Gemini API key', re: /AIza[0-9A-Za-z_-]{35}/g },
  { name: 'Anthropic API key', re: /sk-ant-(?:api|admin)\d{2}-[0-9A-Za-z_-]{20,}/g },
  { name: 'Anthropic key (dạng khác)', re: /sk-ant-[0-9A-Za-z_-]{40,}/g },
]
const SKIP = /\.(png|jpe?g|webp|ico|woff2?|xlsx|zip)$/i

function walk(dir) {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f)
    return statSync(p).isDirectory() ? walk(p) : [p]
  })
}

const files = [
  ...execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8' }).split('\0').filter(Boolean),
  ...(existsSync('dist') ? walk('dist') : []),
].filter((f) => !SKIP.test(f) && existsSync(f))

const hits = []
for (const f of files) {
  const text = readFileSync(f, 'utf8')
  for (const { name, re } of PATTERNS) {
    for (const m of text.matchAll(re)) hits.push(`${f}: ${name} (${m[0].slice(0, 8)}…)`)
  }
}

if (hits.length) {
  console.error(`Tìm thấy ${hits.length} chuỗi giống API key:\n  ${hits.join('\n  ')}`)
  process.exit(1)
}
console.log(`Không có chuỗi giống API key (${files.length} file, gồm ${existsSync('dist') ? 'dist/' : 'không có dist/'}).`)
