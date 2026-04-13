'use client'

import type { ReactNode } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { ENTRANCE_MOTION } from '@/shared/config/entrance-motion'
import { cn } from '@/shared/lib/utils'

interface EntranceMotionBlockProps {
  children?: ReactNode
  className?: string
  delaySeconds?: number
  disabled?: boolean
}

export function EntranceMotionBlock({
  children,
  className,
  delaySeconds = 0,
  disabled = false,
}: EntranceMotionBlockProps) {
  const shouldReduceMotion = Boolean(useReducedMotion())
  const shouldAnimate = !disabled && !shouldReduceMotion

  if (!shouldAnimate) {
    return <div className={className}>{children}</div>
  }

  return (
    <motion.div
      className={cn(className)}
      initial={{
        opacity: 0,
        y: ENTRANCE_MOTION.ENTER_OFFSET_Y,
      }}
      animate={{
        opacity: 1,
        y: 0,
      }}
      transition={{
        duration: ENTRANCE_MOTION.ENTER_DURATION_SECONDS,
        ease: ENTRANCE_MOTION.EASE,
        delay: delaySeconds,
      }}
    >
      {children}
    </motion.div>
  )
}
