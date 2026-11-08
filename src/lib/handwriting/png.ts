import type { Stroke } from './recognize'

/** Vẽ lại các nét lên ảnh PNG 256×256 nền trắng, nét đen (gửi cho AI đoán chữ). Trả base64 không có tiền tố. */
export function strokesToPng(strokes: readonly Stroke[], size: number, px = 256): string {
  const canvas = document.createElement('canvas')
  canvas.width = px
  canvas.height = px
  const ctx = canvas.getContext('2d')
  if (!ctx) return ''
  const k = px / (size || px)
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, px, px)
  ctx.strokeStyle = '#000000'
  ctx.fillStyle = '#000000'
  ctx.lineWidth = Math.max(4, px / 28)
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  for (const s of strokes) {
    if (s.length === 0) continue
    ctx.beginPath()
    if (s.length === 1) {
      ctx.arc(s[0][0] * k, s[0][1] * k, ctx.lineWidth / 2, 0, Math.PI * 2)
      ctx.fill()
      continue
    }
    ctx.moveTo(s[0][0] * k, s[0][1] * k)
    for (const [x, y] of s.slice(1)) ctx.lineTo(x * k, y * k)
    ctx.stroke()
  }
  return canvas.toDataURL('image/png').split(',')[1] ?? ''
}
