import { useSyncExternalStore } from 'react'
import { LESSON_SIZES, type LessonSize } from './lessons'
import { readJSON, writeJSON } from './storage'

/** Cài đặt nhỏ lưu localStorage, đổi ở một trang thì các trang khác cập nhật theo. */
let lessonSize: LessonSize = (() => {
  const v = readJSON<number>('lesson-size', 20)
  return (LESSON_SIZES as readonly number[]).includes(v) ? (v as LessonSize) : 20
})()
const listeners = new Set<() => void>()

export function setLessonSize(size: LessonSize) {
  lessonSize = size
  writeJSON('lesson-size', size)
  listeners.forEach((l) => l())
}

export function useLessonSize(): LessonSize {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => {
        listeners.delete(l)
      }
    },
    () => lessonSize,
  )
}
