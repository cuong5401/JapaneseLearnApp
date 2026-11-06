import { motion, type HTMLMotionProps, type Variants } from 'motion/react'

const container = (step: number): Variants => ({
  hidden: {},
  show: { transition: { staggerChildren: step } },
})

const item: Variants = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.2, ease: 'easeOut' } },
}

type As = 'ul' | 'ol' | 'div'
const TAGS = { ul: motion.ul, ol: motion.ol, div: motion.div }

/**
 * Các con `StaggerItem` hiện lần lượt (mặc định cách nhau 40ms) khi lần đầu xuất hiện.
 * Lưới dài nên truyền `step` nhỏ hơn để cả lưới hiện trong khoảng nửa giây.
 */
export function Stagger({ as = 'div', step = 0.04, ...props }: { as?: As; step?: number } & HTMLMotionProps<'div'>) {
  const Tag = TAGS[as] as typeof motion.div
  return <Tag variants={container(step)} initial="hidden" animate="show" {...props} />
}

export function StaggerItem({ as = 'div', ...props }: { as?: 'li' | 'div' } & HTMLMotionProps<'div'>) {
  const Tag = (as === 'li' ? motion.li : motion.div) as typeof motion.div
  return <Tag variants={item} {...props} />
}
