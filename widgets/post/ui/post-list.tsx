'use client'

import { useEffect, useState } from 'react'
import { Post } from '@/entities/post/model/types'
import { PostCard } from '@/entities/post/ui/post-card'
import {
  SupportedLocale,
  buildBlogPostHref,
} from '@/shared/config/constants'
import {
  AnimatePresence,
  motion,
  useReducedMotion,
} from 'motion/react'
import {
  buildPostListAnimationKey,
  buildPostListContainerVariants,
  buildPostListItemVariants,
} from '@/widgets/post/lib/post-list-motion'

import Link from 'next/link'

interface PostListProps {
  posts: Post[]
  locale: SupportedLocale
}

let hasPostListEntranceMotionPlayed = false

export function PostList({ posts, locale }: PostListProps) {
  const shouldReduceMotion = Boolean(useReducedMotion())
  const [shouldPlayEntranceMotion, setShouldPlayEntranceMotion] = useState(
    !hasPostListEntranceMotionPlayed,
  )
  const postListAnimationKey = buildPostListAnimationKey(posts)
  const postListContainerVariants =
    buildPostListContainerVariants(shouldReduceMotion)
  const postListItemVariants = buildPostListItemVariants(shouldReduceMotion)

  useEffect(() => {
    hasPostListEntranceMotionPlayed = true
  }, [])

  function handlePostListEntranceAnimationComplete() {
    if (!shouldPlayEntranceMotion) {
      return
    }

    setShouldPlayEntranceMotion(false)
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={postListAnimationKey}
        className="flex flex-col divide-y"
        variants={postListContainerVariants}
        initial={shouldPlayEntranceMotion ? 'hidden' : false}
        animate="visible"
        exit="exit"
        onAnimationComplete={handlePostListEntranceAnimationComplete}
      >
        {posts.map((post, index) => {
          return (
            <motion.div
              key={post.slug}
              variants={postListItemVariants}
              layout={!shouldReduceMotion}
            >
              <Link href={buildBlogPostHref(post.slug, locale)}>
                <PostCard post={post} priority={index === 0} />
              </Link>
            </motion.div>
          )
        })}
      </motion.div>
    </AnimatePresence>
  )
}
