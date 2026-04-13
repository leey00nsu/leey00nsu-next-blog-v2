import { describe, expect, it } from 'vitest'
import {
  buildBlogChatCitationContainerVariants,
  buildBlogChatCitationItemVariants,
  buildBlogChatConversationItemVariants,
  buildBlogChatPanelVariants,
  buildBlogChatTriggerVariants,
  buildInitialSeenConversationItemIds,
  shouldAnimateBlogChatConversationItem,
} from '@/widgets/chatbot/lib/blog-chat-widget-motion'

describe('buildInitialSeenConversationItemIds', () => {
  it('초기 대화 내역의 id를 기준으로 seen 집합을 만든다', () => {
    expect(
      buildInitialSeenConversationItemIds([
        { id: 'first-item' },
        { id: 'second-item' },
      ]),
    ).toEqual(new Set(['first-item', 'second-item']))
  })
})

describe('shouldAnimateBlogChatConversationItem', () => {
  it('이전에 본 적 없는 대화 항목만 애니메이션 대상으로 처리한다', () => {
    expect(
      shouldAnimateBlogChatConversationItem({
        seenConversationItemIds: new Set(['existing-item']),
        conversationItemId: 'new-item',
      }),
    ).toBe(true)
    expect(
      shouldAnimateBlogChatConversationItem({
        seenConversationItemIds: new Set(['existing-item']),
        conversationItemId: 'existing-item',
      }),
    ).toBe(false)
  })
})

describe('buildBlogChatTriggerVariants', () => {
  it('트리거 버튼은 첫 진입 시 아래에서 위로 fade in 한다', () => {
    expect(buildBlogChatTriggerVariants(false).hidden).toEqual({
      opacity: 0,
      y: 10,
      scale: 0.96,
    })
  })
})

describe('buildBlogChatPanelVariants', () => {
  it('패널은 열릴 때 fade up 하고 닫힐 때 더 빠르게 사라진다', () => {
    const panelVariants = buildBlogChatPanelVariants(false)

    expect(panelVariants.hidden).toEqual({
      opacity: 0,
      y: 16,
      scale: 0.98,
    })
    expect(panelVariants.exit).toEqual({
      opacity: 0,
      y: 8,
      scale: 0.98,
      transition: {
        duration: 0.18,
      },
    })
  })
})

describe('buildBlogChatConversationItemVariants', () => {
  it('새 대화 항목은 짧은 fade up 애니메이션을 사용한다', () => {
    expect(buildBlogChatConversationItemVariants(false).hidden).toEqual({
      opacity: 0,
      y: 10,
    })
  })
})

describe('buildBlogChatCitationContainerVariants', () => {
  it('새 답변의 출처 목록은 순차 등장 stagger를 사용한다', () => {
    expect(buildBlogChatCitationContainerVariants(false).visible).toEqual({
      opacity: 1,
      transition: {
        staggerChildren: 0.05,
      },
    })
  })
})

describe('buildBlogChatCitationItemVariants', () => {
  it('새 출처 항목은 가볍게 fade up 한다', () => {
    expect(buildBlogChatCitationItemVariants(false).hidden).toEqual({
      opacity: 0,
      y: 6,
    })
  })
})
