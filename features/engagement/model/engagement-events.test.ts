import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Pool, PoolClient } from 'pg'
import { ENGAGEMENT } from '@/features/engagement/config/constants'
import {
  getEngagementDatabaseConfiguration,
  initializeEngagementDatabase,
  insertEngagementEvent,
  selectEngagementEventPage,
} from '@/features/engagement/model/engagement-events'
import { PDF } from '@/shared/config/constants'

describe('engagement-events', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('빈 전용 URL을 건너뛰고 Chat DB 설정으로 fallback한다', () => {
    vi.stubEnv('ENGAGEMENT_DATABASE_URL', '')
    vi.stubEnv('ENGAGEMENT_DATABASE_SSL', 'false')
    vi.stubEnv('BLOG_CHAT_RAG_DATABASE_URL', 'postgresql://chat-database/blog')
    vi.stubEnv('BLOG_CHAT_RAG_DATABASE_SSL', 'true')

    expect(getEngagementDatabaseConfiguration()).toMatchObject({
      url: 'postgresql://chat-database/blog',
      ssl: true,
    })
  })

  it('전용 이벤트 DB가 있으면 전용 SSL 설정을 우선한다', () => {
    vi.stubEnv(
      'ENGAGEMENT_DATABASE_URL',
      'postgresql://engagement-database/blog',
    )
    vi.stubEnv('ENGAGEMENT_DATABASE_SSL', 'false')
    vi.stubEnv('BLOG_CHAT_RAG_DATABASE_URL', 'postgresql://chat-database/blog')
    vi.stubEnv('BLOG_CHAT_RAG_DATABASE_SSL', 'true')

    expect(getEngagementDatabaseConfiguration()).toMatchObject({
      url: 'postgresql://engagement-database/blog',
      ssl: false,
    })
  })

  it('이벤트 테이블과 조회 인덱스를 생성한다', async () => {
    const queryMock = vi.fn().mockResolvedValue({ rows: [] })
    const databaseClient = {
      query: queryMock,
    } as unknown as Pool | PoolClient

    await initializeEngagementDatabase(databaseClient)

    expect(queryMock).toHaveBeenCalledWith(
      expect.stringContaining('CREATE TABLE IF NOT EXISTS engagement_events'),
    )
    expect(queryMock).toHaveBeenCalledWith(
      expect.stringContaining('engagement_events_visitor_created_at_index'),
    )
    expect(queryMock).toHaveBeenCalledWith(
      expect.stringContaining('ADD COLUMN IF NOT EXISTS content_slug TEXT'),
    )
    expect(queryMock).toHaveBeenCalledWith(
      expect.stringContaining(
        'engagement_events_content_slug_created_at_index',
      ),
    )
    expect(queryMock).toHaveBeenCalledWith(
      expect.stringContaining(
        'DROP CONSTRAINT IF EXISTS engagement_events_event_name_check',
      ),
    )
  })

  it('중복 이벤트 식별자를 무시하며 익명 해시를 저장한다', async () => {
    const queryMock = vi.fn().mockResolvedValue({ rows: [] })
    const databaseClient = {
      query: queryMock,
    } as unknown as Pool | PoolClient

    await insertEngagementEvent({
      databaseClient,
      event: {
        eventId: 'a451cda9-9304-41ef-a2f9-4d7d44f64a1b',
        eventName: ENGAGEMENT.EVENT_NAME.RESUME_DOWNLOAD,
        anonymousVisitorIdHash: 'visitor-hash',
        sessionIdHash: 'session-hash',
        locale: 'ko',
        pagePath: '/ko/about',
        documentKind: PDF.DOCUMENT_KIND.RESUME,
        deviceCategory: 'desktop',
      },
    })

    expect(queryMock).toHaveBeenCalledWith(
      expect.stringContaining('ON CONFLICT (event_id) DO NOTHING'),
      [
        'a451cda9-9304-41ef-a2f9-4d7d44f64a1b',
        ENGAGEMENT.EVENT_NAME.RESUME_DOWNLOAD,
        'visitor-hash',
        'session-hash',
        'ko',
        '/ko/about',
        null,
        PDF.DOCUMENT_KIND.RESUME,
        null,
        null,
        null,
        null,
        null,
        'desktop',
      ],
    )
  })

  it('요약과 필터된 이벤트 목록을 함께 조회한다', async () => {
    const queryMock = vi
      .fn()
      .mockResolvedValueOnce({
        rows: [
          {
            total_event_count: 7,
            unique_visitor_count: 3,
            about_view_count: 3,
            blog_list_view_count: 4,
            blog_post_view_count: 8,
            resume_download_count: 2,
            portfolio_download_count: 1,
            contact_click_count: 1,
          },
        ],
      })
      .mockResolvedValueOnce({ rows: [{ total_count: 2 }] })
      .mockResolvedValueOnce({
        rows: [
          {
            event_id: 'a451cda9-9304-41ef-a2f9-4d7d44f64a1b',
            created_at: new Date('2026-07-30T03:00:00.000Z'),
            event_name: ENGAGEMENT.EVENT_NAME.RESUME_DOWNLOAD,
            anonymous_visitor_id_hash: 'visitor-hash',
            session_id_hash: 'session-hash',
            locale: 'ko',
            page_path: '/ko/about',
            content_slug: null,
            document_kind: PDF.DOCUMENT_KIND.RESUME,
            target_kind: null,
            referrer_host: 'www.google.com',
            utm_source: 'linkedin',
            utm_medium: 'social',
            utm_campaign: 'resume',
            device_category: 'mobile',
          },
        ],
      })
    const databaseClient = {
      query: queryMock,
    } as unknown as Pool | PoolClient

    const result = await selectEngagementEventPage({
      databaseClient,
      page: 1,
      pageSize: 20,
      eventName: ENGAGEMENT.EVENT_NAME.RESUME_DOWNLOAD,
      dateRange: {
        startDate: '2026-07-01',
        endDate: '2026-07-31',
      },
    })

    expect(queryMock).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('COUNT(DISTINCT anonymous_visitor_id_hash)'),
      ['2026-07-01T00:00:00+09:00', '2026-08-01T00:00:00+09:00'],
    )
    expect(queryMock).toHaveBeenNthCalledWith(
      3,
      expect.stringContaining('ORDER BY created_at DESC'),
      [
        '2026-07-01T00:00:00+09:00',
        '2026-08-01T00:00:00+09:00',
        ENGAGEMENT.EVENT_NAME.RESUME_DOWNLOAD,
        20,
        0,
      ],
    )
    expect(result).toMatchObject({
      totalCount: 2,
      dateRange: {
        startDate: '2026-07-01',
        endDate: '2026-07-31',
      },
      summary: {
        totalEventCount: 7,
        uniqueVisitorCount: 3,
        blogListViewCount: 4,
        blogPostViewCount: 8,
        resumeDownloadCount: 2,
      },
      records: [
        {
          eventName: ENGAGEMENT.EVENT_NAME.RESUME_DOWNLOAD,
          createdAt: '2026-07-30T03:00:00.000Z',
          documentKind: PDF.DOCUMENT_KIND.RESUME,
          deviceCategory: 'mobile',
        },
      ],
    })
  })
})
