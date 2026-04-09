import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  buildBlogChatConversationStorageKey,
  useBlogChat,
} from '@/features/chat/model/use-blog-chat'

const fetchMock = vi.fn()

const GROUNDED_RESPONSE = {
  answer: '답변입니다.',
  citations: [],
  grounded: true,
} as const

const PERSISTED_CONVERSATION_ITEM = {
  id: 'persisted-item',
  question: '이전 질문',
  status: 'completed',
  response: GROUNDED_RESPONSE,
} as const

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubGlobal('fetch', fetchMock)
  globalThis.localStorage.clear()
})

describe('useBlogChat', () => {
  it('같은 로케일의 저장된 대화 내역을 복원한다', () => {
    globalThis.localStorage.setItem(
      buildBlogChatConversationStorageKey('ko'),
      JSON.stringify({
        version: 1,
        locale: 'ko',
        conversationItems: [PERSISTED_CONVERSATION_ITEM],
      }),
    )

    const { result } = renderHook(() => {
      return useBlogChat({ locale: 'ko' })
    })

    expect(result.current.conversationItems).toEqual([PERSISTED_CONVERSATION_ITEM])
  })

  it('새 대화를 로케일별 localStorage에 저장한다', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => GROUNDED_RESPONSE,
    })

    const { result } = renderHook(() => {
      return useBlogChat({ locale: 'ko' })
    })

    await act(async () => {
      result.current.setQuestion('새 질문')
    })

    await act(async () => {
      await result.current.submitQuestion()
    })

    await waitFor(() => {
      const persistedPayload = JSON.parse(
        globalThis.localStorage.getItem(
          buildBlogChatConversationStorageKey('ko'),
        ) ??
          'null',
      )

      expect(persistedPayload.locale).toBe('ko')
      expect(persistedPayload.conversationItems).toHaveLength(1)
      expect(persistedPayload.conversationItems[0].question).toBe('새 질문')
      expect(persistedPayload.conversationItems[0].status).toBe('completed')
    })
  })

  it('질문 전송 직후 pending 대화 항목을 먼저 추가한다', async () => {
    let resolveResponse: ((value: {
      ok: boolean
      json: () => Promise<typeof GROUNDED_RESPONSE>
    }) => void) | null = null
    const responsePromise = new Promise<{
      ok: boolean
      json: () => Promise<typeof GROUNDED_RESPONSE>
    }>((resolve) => {
      resolveResponse = resolve
    })

    fetchMock.mockReturnValue(responsePromise)

    const { result } = renderHook(() => {
      return useBlogChat({ locale: 'ko' })
    })

    await act(async () => {
      result.current.setQuestion('바로 보이는 질문')
    })

    await act(async () => {
      void result.current.submitQuestion()
    })

    expect(result.current.conversationItems).toHaveLength(1)
    expect(result.current.conversationItems[0]).toMatchObject({
      question: '바로 보이는 질문',
      status: 'pending',
    })
    expect(
      globalThis.localStorage.getItem(buildBlogChatConversationStorageKey('ko')),
    ).toBeNull()

    await act(async () => {
      resolveResponse?.({
        ok: true,
        json: async () => GROUNDED_RESPONSE,
      })
      await responsePromise
    })

    await waitFor(() => {
      expect(result.current.conversationItems[0]).toMatchObject({
        question: '바로 보이는 질문',
        status: 'completed',
        response: GROUNDED_RESPONSE,
      })
    })
  })

  it('요청이 실패하면 질문은 남기고 failed 상태와 에러 코드를 저장한다', async () => {
    fetchMock.mockRejectedValue(new Error('Request failed'))

    const { result } = renderHook(() => {
      return useBlogChat({ locale: 'ko' })
    })

    await act(async () => {
      result.current.setQuestion('실패하는 질문')
    })

    await act(async () => {
      await result.current.submitQuestion()
    })

    await waitFor(() => {
      expect(result.current.conversationItems).toHaveLength(1)
      expect(result.current.conversationItems[0]).toMatchObject({
        question: '실패하는 질문',
        status: 'failed',
        errorCode: 'request_failed',
      })
    })

    const persistedPayload = JSON.parse(
      globalThis.localStorage.getItem(
        buildBlogChatConversationStorageKey('ko'),
      ) ?? 'null',
    )

    expect(persistedPayload.conversationItems[0]).toMatchObject({
      question: '실패하는 질문',
      status: 'failed',
      errorCode: 'request_failed',
    })
  })

  it('잘못된 저장 데이터는 무시하고 빈 대화 상태로 시작한다', () => {
    globalThis.localStorage.setItem(
      buildBlogChatConversationStorageKey('ko'),
      '{"invalid":true}',
    )

    const { result } = renderHook(() => {
      return useBlogChat({ locale: 'ko' })
    })

    expect(result.current.conversationItems).toEqual([])
  })

  it('손상된 JSON이 저장돼 있어도 예외 없이 빈 대화 상태로 시작한다', () => {
    globalThis.localStorage.setItem(
      buildBlogChatConversationStorageKey('ko'),
      '{invalid json',
    )

    const { result } = renderHook(() => {
      return useBlogChat({ locale: 'ko' })
    })

    expect(result.current.conversationItems).toEqual([])
  })
})
