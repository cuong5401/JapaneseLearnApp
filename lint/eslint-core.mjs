/**
 * Mượn rule core của ESLint để oxlint dùng (JS plugin): dự án lint bằng oxlint,
 * không có ESLint parser cho TypeScript 7. Oxlint tự parse, rule ESLint chỉ nhận AST.
 */
import { builtinRules } from 'eslint/use-at-your-own-risk'

export default {
  meta: { name: 'eslint-core' },
  rules: {
    'no-restricted-syntax': builtinRules.get('no-restricted-syntax'),
  },
}
