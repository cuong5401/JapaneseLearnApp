#!/usr/bin/env node
/**
 * Quét src/: không còn chữ giao diện viết cứng (mọi chữ phải qua từ điển src/i18n/vi.ts + ja.ts).
 * Chạy trong `npm run lint` (CI). Báo lỗi khi gặp:
 *  - chuỗi / template / chữ JSX có dấu tiếng Việt;
 *  - chữ JSX hoặc thuộc tính hiển thị (aria-label, title, placeholder, alt, label…) bằng chữ Latin không dấu
 *    (vd. "Nghe", "Xong", "Flashcard"), trừ danh sách tên riêng ALLOW.
 * Bỏ qua: src/i18n (từ điển), src/data (dữ liệu học), src/vendor, src/lib/ai/content (nội dung gửi AI theo
 * "Ngôn ngữ giải thích của AI"), src/lib/ai/mock.ts (chỉ bản dev), *.test.ts, đối số console.*, import, khóa object,
 * vùng `/* i18n-ignore-start *\/ … /* i18n-ignore-end *\/` và dòng có chú thích `// i18n-ignore`.
 */
import { readFileSync, globSync } from 'node:fs'
import { parse } from '@babel/parser'
import _traverse from '@babel/traverse'

const traverse = _traverse.default ?? _traverse
const VI = /[àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ]/i
const SKIP = [/[\\/]i18n[\\/]/, /src[\\/]data[\\/]/, /[\\/]vendor[\\/]/, /lib[\\/]ai[\\/]content[\\/]/, /lib[\\/]ai[\\/]mock\.ts$/, /\.test\.ts$/]
const UI_PROP = /^(aria-label|aria-description|aria-valuetext|aria-roledescription|title|placeholder|alt|label|confirmLabel|cancelLabel)$/
/** Tên riêng / ký hiệu giữ nguyên ở mọi ngôn ngữ. */
const ALLOW = new Set(['Kotonoha', 'EN', 'Tatoeba', 'KANJIDIC Project', 'kanjivg.tagaini.net', '(CC BY 2.0 FR)', 'JLPT', 'API', 'PDF', 'Word', 'PNG', 'JSON', 'OK'])

const problems = []
const files = globSync('src/**/*.{ts,tsx}').filter((f) => !SKIP.some((r) => r.test(f)))
for (const f of files) {
  const code = readFileSync(f, 'utf8').replace(/\r\n/g, '\n')
  const lines = code.split('\n')
  const ignored = new Set()
  let inside = false
  lines.forEach((l, i) => {
    if (l.includes('i18n-ignore-start')) inside = true
    if (inside || /\/\/\s*i18n-ignore\b/.test(l)) ignored.add(i + 1)
    if (l.includes('i18n-ignore-end')) inside = false
  })
  const ast = parse(code, { sourceType: 'module', plugins: ['typescript', 'jsx'] })
  const skip = (p) => {
    if (ignored.has(p.node.loc.start.line)) return true
    if (p.findParent((q) => q.isImportDeclaration() || q.isTSLiteralType() || q.isTSEnumMember?.())) return true
    if (p.parentPath.isObjectProperty() && p.parentPath.node.key === p.node) return true
    const call = p.findParent((q) => q.isCallExpression() && q.node.callee.type === 'MemberExpression' && q.node.callee.object.name === 'console')
    return Boolean(call)
  }
  const report = (p, text) => problems.push(`${f.replace(/\\/g, '/')}:${p.node.loc.start.line}  ${JSON.stringify(text.trim()).slice(0, 90)}`)
  const uiProp = (p) => {
    const par = p.parentPath.isJSXExpressionContainer() ? p.parentPath.parentPath : p.parentPath
    if (par.isJSXAttribute()) return par.node.name.name
    if (par.isObjectProperty() && par.node.value === p.node) return par.node.key.name ?? par.node.key.value
    return null
  }
  traverse(ast, {
    JSXText(p) {
      const v = p.node.value.trim()
      if (!v || skip(p) || ALLOW.has(v)) return
      if (VI.test(v) || /[A-Za-z]{2,}/.test(v)) report(p, v)
    },
    StringLiteral(p) {
      const v = p.node.value
      if (skip(p)) return
      if (VI.test(v)) {
        report(p, v)
        return
      }
      const prop = uiProp(p)
      if (prop && UI_PROP.test(prop) && /[A-Za-z]{2,}/.test(v) && !ALLOW.has(v)) report(p, v)
    },
    TemplateLiteral(p) {
      if (skip(p)) return
      const raw = p.node.quasis.map((q) => q.value.cooked ?? q.value.raw).join('…')
      if (VI.test(raw)) {
        report(p, raw)
        return
      }
      const prop = uiProp(p)
      if (prop && UI_PROP.test(prop) && /[A-Za-z]{2,}/.test(raw)) report(p, raw)
    },
  })
}

if (problems.length) {
  console.error(`check-i18n: ${problems.length} chữ giao diện viết cứng (dùng t('khóa') và thêm vào src/i18n/vi.ts + ja.ts):\n${problems.join('\n')}`)
  process.exit(1)
}
console.log(`check-i18n: OK (${files.length} file)`)
