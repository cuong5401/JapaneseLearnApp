import { beforeEach, describe, expect, it } from 'vitest'
import { SESSION_TTL, clearSession, hashIds, isResumable, leavesSession, readSession, sessionKey, writeSession } from './studySession'

class MemoryStorage {
  private m = new Map<string, string>()
  getItem(k: string) {
    return this.m.has(k) ? this.m.get(k)! : null
  }
  setItem(k: string, v: string) {
    this.m.set(k, v)
  }
  removeItem(k: string) {
    this.m.delete(k)
  }
  clear() {
    this.m.clear()
  }
}

beforeEach(() => {
  ;(globalThis as { sessionStorage?: unknown }).sessionStorage = new MemoryStorage()
})

describe('studySession', () => {
  it('khóa không phụ thuộc thứ tự mục, khác nhau theo loại / trang / danh sách', () => {
    expect(sessionKey('quiz', '/vocab/n5/1', ['a', 'b'])).toBe(sessionKey('quiz', '/vocab/n5/1', ['b', 'a']))
    expect(sessionKey('quiz', '/vocab/n5/1', ['a'])).not.toBe(sessionKey('flashcard', '/vocab/n5/1', ['a']))
    expect(sessionKey('quiz', '/vocab/n5/1', ['a'])).not.toBe(sessionKey('quiz', '/vocab/n5/2', ['a']))
    expect(hashIds(['a', 'b'])).not.toBe(hashIds(['a', 'c']))
  })

  it('lưu khi đang dở, tự xóa khi chưa làm câu nào hoặc đã xong', () => {
    const k = sessionKey('quiz', '/x', ['a'])
    writeSession(k, { i: 7 }, { answered: 7, total: 20 }, 1000)
    expect(readSession<{ i: number }>(k, 2000)).toMatchObject({ answered: 7, total: 20, state: { i: 7 } })
    writeSession(k, { i: 20 }, { answered: 20, total: 20 }, 1000)
    expect(readSession(k, 2000)).toBeNull()
    writeSession(k, {}, { answered: 3, total: 10 })
    clearSession(k)
    expect(readSession(k)).toBeNull()
  })

  it('phiên quá hạn hoặc hỏng thì bỏ', () => {
    const k = sessionKey('quiz', '/x', ['a'])
    writeSession(k, {}, { answered: 2, total: 10 }, 0)
    expect(readSession(k, SESSION_TTL + 1)).toBeNull()
    sessionStorage.setItem(k, '{hỏng')
    expect(readSession(k)).toBeNull()
    expect(isResumable({ answered: 0, total: 10, at: 0 }, 1)).toBe(false)
  })

  it('rời phiên khi đổi trang hoặc tham số chính; bỏ qua ?xem, ?k, ?trang', () => {
    const at = (pathname: string, search = '') => ({ pathname, search })
    expect(leavesSession(at('/vocab/n5/1', '?tab=quiz'), at('/review'))).toBe(true)
    expect(leavesSession(at('/vocab/n5/1', '?tab=quiz'), at('/vocab/n5/1', '?tab=list'))).toBe(true)
    expect(leavesSession(at('/kana', '?luyen=1'), at('/kana'))).toBe(true)
    expect(leavesSession(at('/vocab/n5/1', '?tab=quiz'), at('/vocab/n5/1', '?tab=quiz&xem=w:1'))).toBe(false)
    expect(leavesSession(at('/kanji', '?bai=1&mode=quiz'), at('/kanji', '?mode=quiz&bai=1&k=日'))).toBe(false)
  })
})
