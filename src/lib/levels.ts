import { LEVELS, type Level } from '../types'

/** "n4" | "N4" → "N4"; giá trị khác → null. */
export function parseLevel(param: string | undefined): Level | null {
  const up = (param ?? '').toUpperCase()
  return (LEVELS as readonly string[]).includes(up) ? (up as Level) : null
}
