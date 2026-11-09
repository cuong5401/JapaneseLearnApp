import { describe, expect, it } from 'vitest'
import { fixDuplicateBase } from './basePath'

const BASE = '/JapaneseLearnApp/'

describe('fixDuplicateBase', () => {
  it('bỏ basename bị lặp (một hay nhiều lần)', () => {
    expect(fixDuplicateBase('/JapaneseLearnApp/JapaneseLearnApp/kanji', BASE)).toBe('/JapaneseLearnApp/kanji')
    expect(fixDuplicateBase('/JapaneseLearnApp/JapaneseLearnApp/JapaneseLearnApp/grammar/n5', BASE)).toBe('/JapaneseLearnApp/grammar/n5')
    expect(fixDuplicateBase('/JapaneseLearnApp/JapaneseLearnApp/', BASE)).toBe('/JapaneseLearnApp/')
    expect(fixDuplicateBase('/JapaneseLearnApp/JapaneseLearnApp', BASE)).toBe('/JapaneseLearnApp')
  })

  it('đường dẫn đúng thì không đổi', () => {
    for (const p of ['/JapaneseLearnApp/', '/JapaneseLearnApp/kanji', '/JapaneseLearnApp/word/JapaneseLearnApp', '/JapaneseLearnAppX/JapaneseLearnApp/']) {
      expect(fixDuplicateBase(p, BASE)).toBeNull()
    }
  })

  it('dev chạy ở gốc "/": không sửa gì', () => {
    expect(fixDuplicateBase('//kanji', '/')).toBeNull()
    expect(fixDuplicateBase('/kanji', '/')).toBeNull()
  })
})
