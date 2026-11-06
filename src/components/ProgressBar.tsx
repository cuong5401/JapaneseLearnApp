import { motion } from 'motion/react'

interface Props {
  total: number
  learned: number
  mastered: number
  label?: string
}

const GROW = { duration: 0.7, ease: [0.2, 0.7, 0.2, 1] } as const

/** Thanh hai lớp: phần đã học (chàm nhạt) và phần đã thuộc (chàm đậm), chạy từ 0 khi xuất hiện. */
export function ProgressBar({ total, learned, mastered, label }: Props) {
  const ratio = (n: number) => (total ? n / total : 0)
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={total}
      aria-valuenow={learned}
      aria-valuetext={`Đã học ${learned}/${total}, đã thuộc ${mastered}`}
      className="relative h-1.5 w-full overflow-hidden rounded-full bg-sunken"
    >
      <motion.div
        className="absolute inset-0 origin-left rounded-full bg-cell-line"
        initial={{ scaleX: 0 }}
        animate={{ scaleX: ratio(learned) }}
        transition={GROW}
      />
      <motion.div
        className="absolute inset-0 origin-left rounded-full bg-ai"
        initial={{ scaleX: 0 }}
        animate={{ scaleX: ratio(mastered) }}
        transition={{ ...GROW, delay: 0.1 }}
      />
    </div>
  )
}
