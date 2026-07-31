import { describe, expect, it } from 'vitest'
import {
  EMPTY_BLOG_CHAT_PROGRESS_TRACE,
  reduceBlogChatProgressTrace,
} from '@/features/chat/model/blog-chat-progress'

describe('reduceBlogChatProgressTrace', () => {
  it('새 단계가 시작되면 이전 단계를 완료 처리한다', () => {
    const understandingTrace = reduceBlogChatProgressTrace(
      EMPTY_BLOG_CHAT_PROGRESS_TRACE,
      {
        type: 'stage',
        stage: 'understanding_question',
      },
    )
    const searchingTrace = reduceBlogChatProgressTrace(understandingTrace, {
      type: 'stage',
      stage: 'searching_evidence',
    })

    expect(searchingTrace.stages).toEqual([
      {
        stage: 'understanding_question',
        status: 'completed',
      },
      {
        stage: 'searching_evidence',
        status: 'active',
      },
    ])
  })

  it('출처 URL의 중복을 제거하고 완료 시간까지 기록한다', () => {
    const source = {
      title: 'About Me',
      url: '/ko/about',
      sourceCategory: 'profile' as const,
    }
    const sourceTrace = reduceBlogChatProgressTrace(
      EMPTY_BLOG_CHAT_PROGRESS_TRACE,
      {
        type: 'sources',
        sources: [source, source],
      },
    )
    const completedTrace = reduceBlogChatProgressTrace(sourceTrace, {
      type: 'completed',
      elapsedMilliseconds: 1250,
    })

    expect(completedTrace).toMatchObject({
      sources: [source],
      elapsedMilliseconds: 1250,
      failed: false,
    })
  })
})
