import { describe, expect, it } from 'vitest'
import { DEFAULT_LOCALE, LOCALES, LOCALE_REGISTRY, __setDictForTest, formatMessage, messageParams, t, type Dict } from '.'
import vi from './vi'

const VI = /[àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ]/i
/** Chuỗi được phép giữ chữ tiếng Việt ở mọi ngôn ngữ (ví dụ tìm kiếm bằng tiếng Việt có chủ đích). */
const KEEP_VI = new Set(['counters.timLatConDoi', 'searchDialog.viDuSankaTham'])
const keys = Object.keys(vi) as (keyof typeof vi)[]

/** Tham số mẫu để thử định dạng mọi chuỗi: số 1 và 5 (số ít / số nhiều), đơn vị đếm hợp lệ. */
const sample = (msg: string, n: number) =>
  Object.fromEntries(messageParams(msg).map((p) => [p, p === 'unit' ? 'word' : n]))

describe('bảng đăng ký ngôn ngữ', () => {
  it('ngôn ngữ mặc định là vi (từ điển gốc), mọi mục có tên, Intl hợp lệ, tiêu đề', () => {
    expect(DEFAULT_LOCALE).toBe('vi')
    for (const l of LOCALES) {
      const info = LOCALE_REGISTRY[l]
      expect(info.name.trim(), l).not.toBe('')
      expect(info.title.trim(), l).not.toBe('')
      expect(Intl.PluralRules.supportedLocalesOf([info.intl]), `${l}: Intl ${info.intl}`).toHaveLength(1)
    }
  })
})

describe.each(LOCALES)('từ điển %s', (locale) => {
  it('đủ đúng bộ khóa của vi.ts, không rỗng, tham số là tập con của bản tiếng Việt', async () => {
    const d = (await LOCALE_REGISTRY[locale].load()).default
    expect(Object.keys(d).sort()).toEqual([...keys].sort())
    for (const k of keys) {
      expect(d[k].trim() || d[k] === vi[k] || k.endsWith('Suffix'), `${locale} rỗng: ${k}`).toBeTruthy()
      const extra = messageParams(d[k]).filter((p) => !messageParams(vi[k]).includes(p))
      expect(extra, `${locale} ${k}: tham số không có trong bản gốc`).toEqual([])
    }
  })

  it('mọi chuỗi định dạng được với số ít / số nhiều (cú pháp plural / select đúng, không sót dấu ngoặc)', async () => {
    const d = (await LOCALE_REGISTRY[locale].load()).default
    for (const k of keys)
      for (const n of [1, 5]) {
        const out = formatMessage(d[k], sample(vi[k], n), LOCALE_REGISTRY[locale].intl)
        expect(out, `${locale} ${k}`).not.toMatch(/[{}]/)
      }
  })

  it.runIf(locale !== DEFAULT_LOCALE)('không còn chữ tiếng Việt (trừ ví dụ tìm kiếm có chủ đích)', async () => {
    const d = (await LOCALE_REGISTRY[locale].load()).default
    expect(keys.filter((k) => VI.test(d[k]) && !KEEP_VI.has(k))).toEqual([])
  })
})

describe('định dạng chuỗi (ICU rút gọn)', () => {
  it('tham số, false / null thành chuỗi rỗng, tham số thiếu giữ nguyên', () => {
    expect(formatMessage('Bài {n}{x}{y}', { n: 3, x: false, y: null }, 'vi-VN')).toBe('Bài 3')
    expect(formatMessage('Bài {n}', {}, 'vi-VN')).toBe('Bài {n}')
  })

  it('số nhiều theo Intl.PluralRules (sẵn cho ngôn ngữ có số nhiều), # là số đã định dạng', () => {
    const msg = '{n, plural, =0 {no cards} one {# card} other {# cards}}'
    expect(formatMessage(msg, { n: 0 }, 'en-US')).toBe('no cards')
    expect(formatMessage(msg, { n: 1 }, 'en-US')).toBe('1 card')
    expect(formatMessage(msg, { n: 1695 }, 'en-US')).toBe('1,695 cards')
    expect(formatMessage('{n, plural, other {# thẻ}}', { n: 1695 }, 'vi-VN')).toBe('1.695 thẻ')
    // Nga: one / few / many
    const ru = '{n, plural, one {# карточка} few {# карточки} many {# карточек} other {# карточки}}'
    expect([1, 3, 5].map((n) => formatMessage(ru, { n }, 'ru-RU'))).toEqual(['1 карточка', '3 карточки', '5 карточек'])
  })

  it('select lồng trong plural (đơn vị đếm)', () => {
    const en = '{n, plural, one {# {unit, select, word {word} char {character} other {item}}} other {# {unit, select, word {words} char {characters} other {items}}}}'
    expect(formatMessage(en, { n: 1, unit: 'word' }, 'en-US')).toBe('1 word')
    expect(formatMessage(en, { n: 20, unit: 'char' }, 'en-US')).toBe('20 characters')
    expect(messageParams(en)).toEqual(['n', 'unit'])
  })

  it('{n, number} theo locale', () => {
    expect(formatMessage('{n, number}', { n: 12345 }, 'ja-JP')).toBe('12,345')
    expect(formatMessage('{n, number}', { n: 12345 }, 'vi-VN')).toBe('12.345')
  })

  it('t(): dùng Intl của ngôn ngữ đang chọn', async () => {
    const ja = (await LOCALE_REGISTRY.ja.load()).default
    __setDictForTest('ja', ja)
    expect(t('common.bai', { v: 3 })).toBe('第3課')
    expect(t('common.unitCount', { n: 20, unit: 'card' })).toBe('20 枚')
    __setDictForTest('vi', vi as Dict)
    expect(t('common.unitCount', { n: 20, unit: 'card' })).toBe('20 thẻ')
    expect(t('progress.daThuoc', { mastered: 2, v: false })).toBe('2 đã thuộc')
  })
})
