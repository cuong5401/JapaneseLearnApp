import type { FontKey, Measure } from './layout'

/** Font của bản xem trước (cùng họ font với bản PDF, tải từ Google Fonts như phần còn lại của app). */
export const FAMILY: Record<FontKey, { family: string; weight: number }> = {
  vi: { family: '"Be Vietnam Pro", sans-serif', weight: 400 },
  'vi-bold': { family: '"Be Vietnam Pro", sans-serif', weight: 700 },
  jp: { family: '"Noto Sans JP", sans-serif', weight: 700 },
}

let canvas: HTMLCanvasElement | null = null

/** Đo text bằng font của trình duyệt để bản xem trước chọn cỡ chữ / cắt bớt âm đọc giống bản in. */
export const browserMeasure: Measure = (text, font, size) => {
  canvas ??= document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  if (!ctx) return text.length * size * 0.6
  const f = FAMILY[font]
  ctx.font = `${f.weight} ${size}px ${f.family}`
  return ctx.measureText(text).width
}
