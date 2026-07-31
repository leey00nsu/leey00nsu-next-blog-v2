import { StrictMode } from 'react'
import { render, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ENGAGEMENT } from '@/features/engagement/config/constants'
import { EngagementPageView } from '@/features/engagement/ui/engagement-page-view'

const commitEngagementEventMock = vi.hoisted(() => vi.fn())

vi.mock('@/features/engagement/api/commit-engagement-event', () => {
  return {
    commitEngagementEvent: commitEngagementEventMock,
  }
})

describe('EngagementPageView', () => {
  beforeEach(() => {
    commitEngagementEventMock.mockReset()
    commitEngagementEventMock.mockResolvedValue(null)
  })

  it('같은 조회의 재실행은 동일 ID를 사용하고 글이 바뀌면 새 ID를 사용한다', async () => {
    const { rerender } = render(
      <StrictMode>
        <EngagementPageView
          eventName={ENGAGEMENT.EVENT_NAME.BLOG_POST_VIEW}
          locale="ko"
          contentSlug="first-post"
        />
      </StrictMode>,
    )

    await waitFor(() => {
      expect(commitEngagementEventMock).toHaveBeenCalled()
    })

    const firstPostEventIdentifiers = commitEngagementEventMock.mock.calls.map(
      ([params]) => params.eventId,
    )

    expect(new Set(firstPostEventIdentifiers).size).toBe(1)

    commitEngagementEventMock.mockClear()
    rerender(
      <StrictMode>
        <EngagementPageView
          eventName={ENGAGEMENT.EVENT_NAME.BLOG_POST_VIEW}
          locale="ko"
          contentSlug="second-post"
        />
      </StrictMode>,
    )

    await waitFor(() => {
      expect(commitEngagementEventMock).toHaveBeenCalled()
    })

    const secondPostEventIdentifiers = commitEngagementEventMock.mock.calls.map(
      ([params]) => params.eventId,
    )

    expect(new Set(secondPostEventIdentifiers).size).toBe(1)
    expect(secondPostEventIdentifiers[0]).not.toBe(firstPostEventIdentifiers[0])
  })
})
