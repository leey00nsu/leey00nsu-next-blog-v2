import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  getBlogChatAnswerModel,
  getBlogChatPlannerModel,
  getBlogChatRerankModel,
} from '@/features/chat/config/chat-models'

describe('chat-models', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('답변 전용 모델이 없으면 번역 모델 설정을 사용한다', () => {
    vi.stubEnv('OPENAI_BLOG_CHAT_MODEL', '')
    vi.stubEnv('OPENAI_MDX_MODEL', 'translation-model')

    expect(getBlogChatAnswerModel()).toBe('translation-model')
  })

  it('라우터와 리랭커 전용 모델이 없으면 답변 모델 설정을 사용한다', () => {
    vi.stubEnv('OPENAI_BLOG_CHAT_ROUTER_MODEL', '')
    vi.stubEnv('OPENAI_BLOG_CHAT_RERANK_MODEL', '')
    vi.stubEnv('OPENAI_BLOG_CHAT_MODEL', 'answer-model')

    expect(getBlogChatPlannerModel()).toBe('answer-model')
    expect(getBlogChatRerankModel()).toBe('answer-model')
  })

  it('답변에 사용할 모델 설정이 없으면 오류를 발생시킨다', () => {
    vi.stubEnv('OPENAI_BLOG_CHAT_MODEL', '')
    vi.stubEnv('OPENAI_MDX_MODEL', '')

    expect(() => getBlogChatAnswerModel()).toThrow(
      'OPENAI_BLOG_CHAT_MODEL or OPENAI_MDX_MODEL is required.',
    )
  })
})
