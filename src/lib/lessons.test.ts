import { describe, expect, it } from 'vitest'
import type { SrsCard } from '../types'
import { continueLesson, lessonCount, lessonIndexOf, lessonProgress, splitLessons } from './lessons'

const card = (id: string, interval: number, lastReviewed: number): SrsCard => ({
  id,
  ease: 2.5,
  interval,
  repetitions: 1,
  due: 0,
  lastReviewed,
})

describe('splitLessons', () => {
  const items = Array.from({ length: 45 }, (_, i) => i)

  it('chia đúng kích thước, giữ thứ tự, bài cuối có phần dư', () => {
    const lessons = splitLessons(items, 20)
    expect(lessons.map((l) => l.length)).toEqual([20, 20, 5])
    expect(lessons.flat()).toEqual(items)
    expect(lessons[1][0]).toBe(20)
  })

  it('kích thước 30 và 50', () => {
    expect(splitLessons(items, 30).map((l) => l.length)).toEqual([30, 15])
    expect(splitLessons(items, 50)).toHaveLength(1)
  })

  it('danh sách rỗng thì không có bài; kích thước 0 thì báo lỗi', () => {
    expect(splitLessons([], 20)).toEqual([])
    expect(() => splitLessons(items, 0)).toThrow()
  })

  it('lessonCount / lessonIndexOf khớp với splitLessons', () => {
    expect(lessonCount(703, 20)).toBe(36)
    expect(lessonCount(3058, 20)).toBe(153)
    expect(lessonIndexOf(0, 20)).toBe(0)
    expect(lessonIndexOf(19, 20)).toBe(0)
    expect(lessonIndexOf(20, 20)).toBe(1)
  })
})

describe('lessonProgress & continueLesson', () => {
  const ids = (prefix: string, n: number) => Array.from({ length: n }, (_, i) => `${prefix}${i}`)

  it('chưa học / đang học / đã thuộc', () => {
    const a = ids('a', 3)
    expect(lessonProgress(a, {}).state).toBe('new')
    expect(lessonProgress(a, { a0: card('a0', 1, 5) }).state).toBe('learning')
    const all = Object.fromEntries(a.map((id) => [id, card(id, 30, 1)]))
    expect(lessonProgress(a, all)).toMatchObject({ state: 'mastered', learned: 3, mastered: 3 })
  })

  it('Học tiếp chọn bài dở dang học gần nhất, rồi bài chưa học đầu tiên', () => {
    const cards = { a0: card('a0', 1, 100), b0: card('b0', 1, 300), c0: card('c0', 30, 900) }
    const lessons = [ids('a', 2), ids('b', 2), ['c0'], ids('d', 2)]
    const progress = lessons.map((l) => lessonProgress(l, cards))
    expect(progress.map((p) => p.state)).toEqual(['learning', 'learning', 'mastered', 'new'])
    expect(continueLesson(progress)).toBe(1)

    const noneStarted = lessons.map((l) => lessonProgress(l, {}))
    expect(continueLesson(noneStarted)).toBe(0)

    const doneFirst = [lessonProgress(['c0'], cards), lessonProgress(ids('d', 2), cards)]
    expect(continueLesson(doneFirst)).toBe(1)
  })
})
