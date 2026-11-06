import { motion, type HTMLMotionProps } from 'motion/react'
import type { ComponentProps } from 'react'
import { Link } from 'react-router-dom'

const MotionLink = motion.create(Link)
const TAP = { scale: 0.97 }
const QUICK = { type: 'spring', stiffness: 600, damping: 32 } as const

/** Nút có phản hồi khi nhấn. */
export function Button(props: HTMLMotionProps<'button'>) {
  return <motion.button type="button" whileTap={props.disabled ? undefined : TAP} transition={QUICK} {...props} />
}

/** Thẻ dạng liên kết: nâng nhẹ khi rê chuột (chỉ chuột, không ảnh hưởng cảm ứng). */
export function CardLink(props: ComponentProps<typeof MotionLink>) {
  return <MotionLink whileHover={{ y: -3 }} whileTap={{ scale: 0.985 }} transition={QUICK} {...props} />
}

/** Liên kết dạng nút. */
export function ButtonLink(props: ComponentProps<typeof MotionLink>) {
  return <MotionLink whileTap={TAP} transition={QUICK} {...props} />
}
