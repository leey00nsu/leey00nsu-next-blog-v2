import { describe, expect, it } from 'vitest'
import type { Post } from '@/entities/post/model/types'
import {
  buildPostListAnimationKey,
  buildPostListContainerVariants,
  buildPostListItemVariants,
} from '@/widgets/post/lib/post-list-motion'

const POSTS = [
  {
    slug: 'first-post',
  },
  {
    slug: 'second-post',
  },
] as Post[]

describe('buildPostListAnimationKey', () => {
  it('게시글 목록 순서를 기반으로 애니메이션 키를 만든다', () => {
    expect(buildPostListAnimationKey(POSTS)).toBe('first-post|second-post')
  })
})

describe('buildPostListContainerVariants', () => {
  it('모션이 허용되면 순차 등장용 stagger 설정을 포함한다', () => {
    const containerVariants = buildPostListContainerVariants(false)

    expect(containerVariants.visible).toMatchObject({
      opacity: 1,
      transition: {
        staggerChildren: 0.06,
      },
    })
  })

  it('reduced motion 환경에서는 정적인 컨테이너 variant를 반환한다', () => {
    const containerVariants = buildPostListContainerVariants(true)

    expect(containerVariants.hidden).toEqual({
      opacity: 1,
    })
    expect(containerVariants.visible).toEqual({
      opacity: 1,
    })
  })
})

describe('buildPostListItemVariants', () => {
  it('모션이 허용되면 아래에서 위로 fade up 하는 item variant를 반환한다', () => {
    const itemVariants = buildPostListItemVariants(false)

    expect(itemVariants.hidden).toEqual({
      opacity: 0,
      y: 12,
    })
    expect(itemVariants.visible).toMatchObject({
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.4,
      },
    })
  })

  it('reduced motion 환경에서는 정적인 item variant를 반환한다', () => {
    const itemVariants = buildPostListItemVariants(true)

    expect(itemVariants.hidden).toEqual({
      opacity: 1,
      y: 0,
    })
    expect(itemVariants.visible).toEqual({
      opacity: 1,
      y: 0,
    })
  })
})
