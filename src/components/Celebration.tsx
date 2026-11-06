import { motion, useReducedMotion } from 'motion/react'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

interface Piece {
  id: number
  left: number
  drift: number
  size: number
  rotate: number
  delay: number
  duration: number
  glyph: string | null
  tone: 'ai' | 'kihada' | 'matsu'
}

const GLYPHS = ['言', '葉', null, null]
const TONES = ['ai', 'kihada', 'matsu'] as const
const TONE_CLASS = {
  ai: 'border-ai text-ai',
  kihada: 'border-kihada text-kihada',
  matsu: 'border-matsu text-matsu',
}

function makePieces(count: number): Piece[] {
  return Array.from({ length: count }, (_, id) => ({
    id,
    left: Math.random() * 100,
    drift: (Math.random() - 0.5) * 160,
    size: 14 + Math.random() * 16,
    rotate: (Math.random() < 0.5 ? -1 : 1) * (180 + Math.random() * 360),
    delay: Math.random() * 0.5,
    duration: 1.8 + Math.random() * 1.2,
    glyph: GLYPHS[id % GLYPHS.length],
    tone: TONES[id % TONES.length],
  }))
}

/** "言の葉" rơi: các ô giấy tập viết nhỏ, có ô mang chữ 言 / 葉. Tự biến mất sau ~3 giây. */
export function Celebration({ count = 22 }: { count?: number }) {
  const reduce = useReducedMotion()
  const [pieces] = useState(() => makePieces(count))
  // Dùng pixel: chuyển giữa các giá trị 'vh' của transform không được nội suy ổn định.
  const [fall] = useState(() => window.innerHeight + 60)
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const t = setTimeout(() => setVisible(false), 3400)
    return () => clearTimeout(t)
  }, [])

  if (reduce || !visible) return null

  return createPortal(
    <div aria-hidden className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
      {pieces.map((p) => (
        <motion.span
          key={p.id}
          lang="ja"
          className={`absolute top-0 grid place-items-center rounded-[2px] border-[1.5px] bg-surface font-jp font-bold leading-none ${TONE_CLASS[p.tone]}`}
          style={{ left: `${p.left}%`, width: p.size, height: p.size, fontSize: p.size * 0.62 }}
          initial={{ y: -40, x: 0, rotate: 0, opacity: 1 }}
          animate={{ y: fall, x: p.drift, rotate: p.rotate, opacity: [1, 1, 0.9] }}
          transition={{ duration: p.duration, delay: p.delay, ease: [0.3, 0.1, 0.6, 1] }}
        >
          {p.glyph}
        </motion.span>
      ))}
    </div>,
    document.body,
  )
}
