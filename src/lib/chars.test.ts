import { describe, expect, it } from 'vitest'
import { isCurrentId } from '../data'
import { charOfRef, charRef, isCharRef } from './chars'

describe('ref chữ ngoài kanji.json (ch-<hex>)', () => {
  it('đổi qua lại chữ ↔ ref', () => {
    expect(charRef('璃')).toBe('ch-7483')
    expect(charOfRef('ch-7483')).toBe('璃')
    expect(charOfRef(charRef('𠮷'))).toBe('𠮷')
  })

  it('từ chối ref sai, id hợp lệ cho sổ tay', () => {
    expect(charOfRef('ch-')).toBeNull()
    expect(charOfRef('ch-zz12')).toBeNull()
    expect(charOfRef('kj-15917f3b')).toBeNull()
    expect(isCharRef('ch-65e5')).toBe(true)
    expect(isCurrentId('ch-65e5')).toBe(true)
  })
})
