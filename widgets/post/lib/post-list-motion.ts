import type { Variants } from 'motion/react'
import type { Post } from '@/entities/post/model/types'

const POST_LIST_MOTION = {
  LIST_KEY_SEPARATOR: '|',
  HIDDEN_OPACITY: 0,
  VISIBLE_OPACITY: 1,
  ITEM_ENTER_OFFSET_Y: 12,
  ITEM_EXIT_OFFSET_Y: -4,
  ITEM_ENTER_DURATION_SECONDS: 0.4,
  ITEM_EXIT_DURATION_SECONDS: 0.16,
  ITEM_STAGGER_DELAY_SECONDS: 0.06,
  CONTAINER_DELAY_SECONDS: 0.02,
  EASE: [0.22, 1, 0.36, 1],
} as const

export function buildPostListAnimationKey(
  posts: ReadonlyArray<Pick<Post, 'slug'>>,
): string {
  return posts
    .map((post) => post.slug)
    .join(POST_LIST_MOTION.LIST_KEY_SEPARATOR)
}

export function buildPostListContainerVariants(
  shouldReduceMotion: boolean,
): Variants {
  if (shouldReduceMotion) {
    return {
      hidden: {
        opacity: POST_LIST_MOTION.VISIBLE_OPACITY,
      },
      visible: {
        opacity: POST_LIST_MOTION.VISIBLE_OPACITY,
      },
      exit: {
        opacity: POST_LIST_MOTION.VISIBLE_OPACITY,
      },
    }
  }

  return {
    hidden: {
      opacity: POST_LIST_MOTION.VISIBLE_OPACITY,
    },
    visible: {
      opacity: POST_LIST_MOTION.VISIBLE_OPACITY,
      transition: {
        delayChildren: POST_LIST_MOTION.CONTAINER_DELAY_SECONDS,
        staggerChildren: POST_LIST_MOTION.ITEM_STAGGER_DELAY_SECONDS,
      },
    },
    exit: {
      opacity: POST_LIST_MOTION.VISIBLE_OPACITY,
      transition: {
        duration: POST_LIST_MOTION.ITEM_EXIT_DURATION_SECONDS,
      },
    },
  }
}

export function buildPostListItemVariants(
  shouldReduceMotion: boolean,
): Variants {
  if (shouldReduceMotion) {
    return {
      hidden: {
        opacity: POST_LIST_MOTION.VISIBLE_OPACITY,
        y: 0,
      },
      visible: {
        opacity: POST_LIST_MOTION.VISIBLE_OPACITY,
        y: 0,
      },
      exit: {
        opacity: POST_LIST_MOTION.VISIBLE_OPACITY,
        y: 0,
      },
    }
  }

  return {
    hidden: {
      opacity: POST_LIST_MOTION.HIDDEN_OPACITY,
      y: POST_LIST_MOTION.ITEM_ENTER_OFFSET_Y,
    },
    visible: {
      opacity: POST_LIST_MOTION.VISIBLE_OPACITY,
      y: 0,
      transition: {
        duration: POST_LIST_MOTION.ITEM_ENTER_DURATION_SECONDS,
        ease: POST_LIST_MOTION.EASE,
      },
    },
    exit: {
      opacity: POST_LIST_MOTION.HIDDEN_OPACITY,
      y: POST_LIST_MOTION.ITEM_EXIT_OFFSET_Y,
      transition: {
        duration: POST_LIST_MOTION.ITEM_EXIT_DURATION_SECONDS,
      },
    },
  }
}
