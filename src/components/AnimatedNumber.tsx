import { animate, motion, useMotionValue, useReducedMotion, useTransform } from 'motion/react'
import { useEffect } from 'react'

/** Số đếm tăng dần đến giá trị thật; tắt khi người dùng muốn giảm chuyển động. */
export function AnimatedNumber({ value, className = '' }: { value: number; className?: string }) {
  const reduce = useReducedMotion()
  const mv = useMotionValue(reduce ? value : 0)
  const text = useTransform(mv, (v) => String(Math.round(v)))

  useEffect(() => {
    if (reduce) {
      mv.set(value)
      return
    }
    const controls = animate(mv, value, { duration: 0.6, ease: 'easeOut' })
    return () => controls.stop()
  }, [value, reduce, mv])

  return <motion.span className={`tabular-nums ${className}`}>{text}</motion.span>
}
