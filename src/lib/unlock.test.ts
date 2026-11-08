import { beforeEach, describe, expect, it } from 'vitest'
import { hashCode, isUnlocked, tryUnlock } from './unlock'

const store = new Map<string, string>()
globalThis.localStorage = {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => void store.set(k, v),
  removeItem: (k: string) => void store.delete(k),
  clear: () => store.clear(),
  key: () => null,
  length: 0,
} as Storage

// Tính sẵn bằng node:crypto đúng như vite.config.ts: sha256("kotonoha-unlock:" + mã).
const BUILD_HASH: Record<string, string> = {
  '2468': '69fe3807686fe7ab6b7721f9b816a456fa2dd6bbbd160b9c96c4d8017e58beba',
  '9999': '1517ddab6acdf0cbb1fd030e02ac0838c8260506bd23c15bd5bcb27c9c4858ef',
}
const buildHash = (code: string) => BUILD_HASH[code]

describe('mã mở khóa', () => {
  beforeEach(() => store.clear())

  it('mã băm trên trình duyệt khớp mã băm lúc build', async () => {
    expect(await hashCode('2468')).toBe(buildHash('2468'))
  })

  it('không đặt mã thì luôn mở', async () => {
    expect(isUnlocked('')).toBe(true)
    expect(await tryUnlock('0000', '')).toBe(true)
  })

  it('sai thì vẫn khóa, đúng thì nhớ trên máy; đổi mã thì khóa lại', async () => {
    const h = buildHash('2468')
    expect(isUnlocked(h)).toBe(false)
    expect(await tryUnlock('1357', h)).toBe(false)
    expect(isUnlocked(h)).toBe(false)
    expect(await tryUnlock('2468', h)).toBe(true)
    expect(isUnlocked(h)).toBe(true)
    expect(isUnlocked(buildHash('9999'))).toBe(false)
  })
})
