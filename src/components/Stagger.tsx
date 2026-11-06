import { motion, type HTMLMotionProps, type Variants } from 'motion/react'

const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.04 } },
}

const item: Variants = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.2, ease: 'easeOut' } },
}

type As = 'ul' | 'ol' | 'div'
const TAGS = { ul: motion.ul, ol: motion.ol, div: motion.div }

/** Các con `StaggerItem` hiện lần lượt cách nhau 40ms khi lần đầu xuất hiện. */
export function Stagger({ as = 'div', ...props }: { as?: As } & HTMLMotionProps<'div'>) {
  const Tag = TAGS[as] as typeof motion.div
  return <Tag variants={container} initial="hidden" animate="show" {...props} />
}

export function StaggerItem({ as = 'div', ...props }: { as?: 'li' | 'div' } & HTMLMotionProps<'div'>) {
  const Tag = (as === 'li' ? motion.li : motion.div) as typeof motion.div
  return <Tag variants={item} {...props} />
}
