import { describe, expect, it } from 'vitest'
import { KANA_BY_ID } from '../data/kana'
import type { VocabItem } from '../types'
import { kanaExample } from './kanaExamples'

const w = (word: string, reading: string, meaning = 'nghĩa'): VocabItem => ({ id: `n5-${word}`, word, reading, meaning }) as VocabItem

describe('từ ví dụ cho kana', () => {
  const words = [w('今日', 'きょう'), w('木', 'き', 'cây'), w('聞く', 'きく'), w('カメラ', 'カメラ', 'máy ảnh'), w('紙', 'かみ')]
  it('hiragana: cách đọc bắt đầu bằng chữ, bỏ âm ghép きょ, ưu tiên từ ngắn', () => {
    expect(kanaExample(KANA_BY_ID.get('h-ki')!, words)?.word).toBe('木')
  })
  it('katakana: từ viết katakana', () => {
    expect(kanaExample(KANA_BY_ID.get('k-ka')!, words)?.word).toBe('カメラ')
  })
  it('không có ví dụ thì null', () => {
    expect(kanaExample(KANA_BY_ID.get('k-nu')!, words)).toBeNull()
  })
})
