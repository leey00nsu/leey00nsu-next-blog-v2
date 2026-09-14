import { describe, expect, it, vi } from 'vitest'
import type { ChatEvidenceRecord } from '@/features/chat/model/chat-evidence'
import type { ChatRetrievalPlan } from '@/features/chat/model/chat-retrieval-plan'
import { executeChatRetrievalPlan } from '@/features/chat/model/execute-chat-retrieval-plan'

// 검색 순서를 검증하는 테스트이므로 외부 모델을 호출하는 기본 rerank는 비활성화한다.
// rerank 연결 자체는 아래에서 rerankMatches를 주입해 확인한다.
vi.mock('@/features/chat/api/rerank-chat-evidence', () => {
  return {
    rerankChatEvidence: async ({
      matches,
    }: {
      matches: ChatEvidenceRecord[]
    }) => {
      return { matches, applied: false }
    },
  }
})

const OLDER_AI_PROJECT: ChatEvidenceRecord = {
  id: 'ko/project/older-ai',
  locale: 'ko',
  slug: 'older-ai',
  title: 'AI 활용 프로젝트',
  url: '/ko/projects/older-ai',
  excerpt: 'AI 활용',
  content: 'AI로 문서 생성을 자동화합니다.',
  sectionTitle: null,
  tags: ['AI', 'project'],
  searchTerms: ['AI 활용'],
  evidenceTime: {
    kind: 'project_ended',
    value: '2025-01-01T00:00:00.000Z',
  },
  sourceCategory: 'project',
}

const RECENT_AI_PROJECT: ChatEvidenceRecord = {
  ...OLDER_AI_PROJECT,
  id: 'ko/project/recent-ai',
  slug: 'recent-ai',
  url: '/ko/projects/recent-ai',
  evidenceTime: {
    kind: 'project_ended',
    value: '2026-01-01T00:00:00.000Z',
  },
}

const RECENT_NON_AI_PROJECT: ChatEvidenceRecord = {
  ...RECENT_AI_PROJECT,
  id: 'ko/project/recent-storage',
  slug: 'recent-storage',
  title: '스토리지 프로젝트',
  url: '/ko/projects/recent-storage',
  excerpt: '파일 저장',
  content: '파일 저장을 관리합니다.',
  tags: ['storage', 'project'],
  searchTerms: ['저장소'],
  evidenceTime: {
    kind: 'project_ended',
    value: '2026-05-01T00:00:00.000Z',
  },
}

const NEWER_AI_BLOG: ChatEvidenceRecord = {
  ...RECENT_AI_PROJECT,
  id: 'ko/blog/newer-ai',
  slug: 'newer-ai',
  title: 'AI 활용 글',
  url: '/ko/blog/newer-ai',
  evidenceTime: {
    kind: 'published',
    value: '2026-04-21T00:00:00.000Z',
  },
  publishedAt: '2026-04-21T00:00:00.000Z',
  sourceCategory: 'blog',
}

const RECENT_PROJECT_AI_PLAN: ChatRetrievalPlan = {
  executionKind: 'retrieve_and_generate',
  standaloneQuestion: '최근 프로젝트에서 AI를 어떻게 활용해?',
  operation: 'explain',
  canonicalTargets: [],
  sourceStrategy: 'only',
  sourceCategories: ['project'],
  requiredConcepts: ['AI'],
  optionalConcepts: [],
  requestedFields: ['content'],
  temporalStrategy: 'rank',
  temporalOrder: 'latest',
  maximumEvidenceCount: 3,
}

const SINGLE_METADATA_PLAN: ChatRetrievalPlan = {
  ...RECENT_PROJECT_AI_PLAN,
  executionKind: 'direct_metadata',
  operation: 'lookup',
  requiredConcepts: [],
  requestedFields: ['title'],
  temporalStrategy: 'single',
  sourceStrategy: 'all',
  sourceCategories: [],
}

const UNDATED_INDEX_RECORD: ChatEvidenceRecord = {
  ...NEWER_AI_BLOG,
  id: 'curated/ko/project/index',
  slug: 'index',
  title: '배포 프로젝트',
  url: '/ko/projects',
  publishedAt: null,
  evidenceTime: null,
  sourceCategory: 'project',
}

describe('executeChatRetrievalPlan', () => {
  it.each(['latest', 'oldest'] as const)(
    '%s metadata는 날짜가 없는 항목을 고르지 않는다',
    async (temporalOrder) => {
      const result = await executeChatRetrievalPlan({
        plan: { ...SINGLE_METADATA_PLAN, temporalOrder },
        locale: 'ko',
        blogRecords: [NEWER_AI_BLOG],
        curatedRecords: [UNDATED_INDEX_RECORD],
        retrieveSemanticMatches: async () => [],
      })

      expect(result).toMatchObject({
        kind: 'direct',
        response: { answer: expect.stringContaining('AI 활용 글') },
        matches: [expect.objectContaining({ slug: 'newer-ai' })],
      })
      expect(result).not.toMatchObject({ matches: [{ slug: 'index' }] })
    },
  )

  it('metadata 후보에 날짜가 있는 근거가 없으면 답을 만들지 않는다', async () => {
    const result = await executeChatRetrievalPlan({
      plan: { ...SINGLE_METADATA_PLAN, temporalOrder: 'oldest' },
      locale: 'ko',
      blogRecords: [],
      curatedRecords: [UNDATED_INDEX_RECORD],
      retrieveSemanticMatches: async () => [],
    })

    expect(result).toMatchObject({
      kind: 'refusal',
      refusalReason: 'insufficient_search_match',
      matches: [],
    })
  })

  it('진행 중 프로젝트는 게시 글이 아니라 시작 시점 문장으로 답한다', async () => {
    const ongoingProject: ChatEvidenceRecord = {
      ...RECENT_AI_PROJECT,
      id: 'ko/project/ongoing',
      slug: 'ongoing',
      title: '진행 중 프로젝트',
      url: '/ko/projects/ongoing',
      publishedAt: null,
      evidenceTime: {
        kind: 'project_started',
        value: '2026-03-01T00:00:00.000Z',
      },
    }
    const result = await executeChatRetrievalPlan({
      plan: { ...SINGLE_METADATA_PLAN, temporalOrder: 'latest' },
      locale: 'ko',
      blogRecords: [],
      curatedRecords: [ongoingProject],
      retrieveSemanticMatches: async () => [],
    })

    expect(result).toMatchObject({
      kind: 'direct',
      response: {
        answer: expect.stringContaining('시작한 프로젝트'),
      },
    })
  })

  it('같은 인용 URL을 공유해도 내용이 다른 하위 청크는 유지한다', async () => {
    const records = [
      'The queue stores pending jobs.',
      'The queue recovers interrupted jobs.',
    ].map((content, index) => ({
      ...OLDER_AI_PROJECT,
      id: `en/queue/chunk/${index}`,
      locale: 'en' as const,
      slug: 'queue',
      title: 'Queue',
      url: '/en/queue#operation',
      content,
      excerpt: content,
      tags: [],
      searchTerms: [],
    }))
    const result = await executeChatRetrievalPlan({
      plan: {
        ...RECENT_PROJECT_AI_PLAN,
        standaloneQuestion: 'Explain queue operation.',
        operation: 'summarize',
        sourceStrategy: 'all',
        sourceCategories: [],
        requiredConcepts: [],
        temporalStrategy: 'none',
        temporalOrder: null,
        maximumEvidenceCount: 3,
      },
      locale: 'en',
      blogRecords: [],
      curatedRecords: records,
      retrieveSemanticMatches: async () => records,
    })
    expect(result.matches.map((record) => record.id)).toEqual(
      expect.arrayContaining(records.map((record) => record.id)),
    )
  })
  it.each(['latest', 'oldest'] as const)(
    '%s 문서 선택은 리랭커가 섹션 순서를 뒤집어도 유지한다',
    async (temporalOrder) => {
      const expectedRecord =
        temporalOrder === 'latest' ? RECENT_AI_PROJECT : OLDER_AI_PROJECT
      const extraSection = {
        ...expectedRecord,
        id: `${expectedRecord.id}/details`,
        url: `${expectedRecord.url}#details`,
      }
      const rerankMatches = vi.fn(
        async ({ matches }: { matches: ChatEvidenceRecord[] }) => ({
          matches: matches.toReversed(),
          applied: true,
        }),
      )
      const result = await executeChatRetrievalPlan({
        plan: {
          ...RECENT_PROJECT_AI_PLAN,
          temporalStrategy: 'single',
          temporalOrder,
        },
        locale: 'ko',
        blogRecords: [],
        curatedRecords: [OLDER_AI_PROJECT, RECENT_AI_PROJECT, extraSection],
        hasConversationContext: true,
        retrieveSemanticMatches: async () => [],
        rerankMatches,
      })
      expect(rerankMatches).toHaveBeenCalledOnce()
      expect(
        rerankMatches.mock.calls[0][0].matches.every(
          (match) => match.slug === expectedRecord.slug,
        ),
      ).toBe(true)
      expect(result.matches.map((match) => match.id)).toEqual([
        extraSection.id,
        expectedRecord.id,
      ])
    },
  )

  it('리랭커가 순서를 뒤집어도 최신순 나열 조건을 유지한다', async () => {
    const result = await executeChatRetrievalPlan({
      plan: RECENT_PROJECT_AI_PLAN,
      locale: 'ko',
      blogRecords: [],
      curatedRecords: [OLDER_AI_PROJECT, RECENT_AI_PROJECT],
      hasConversationContext: true,
      retrieveSemanticMatches: async () => [],
      rerankMatches: async ({ matches }) => ({
        matches: matches.toReversed(),
        applied: true,
      }),
    })
    expect(result.matches.map((match) => match.id)).toEqual([
      RECENT_AI_PROJECT.id,
      OLDER_AI_PROJECT.id,
    ])
  })

  it.each([' ', ' ~ ', ' – '])('최근 근무처의 날짜 구분자 %s를 읽는다', async (separator) => {
    const careerRecords: ChatEvidenceRecord[] = [
      {
        ...RECENT_AI_PROJECT,
        id: 'ko/about/profile/ecount-erp',
        slug: 'about',
        title: 'About Me',
        url: '/ko/about#ecount-erp',
        excerpt: 'Ecount ERP 서버 개발자',
        content:
          `경력 > Ecount ERP\n2024.07${separator}2025.08 서버 개발자로 ERP 기능 개발 및 유지보수`,
        sectionTitle: 'Ecount ERP',
        sourceCategory: 'profile',
      },
      {
        ...RECENT_AI_PROJECT,
        id: 'ko/about/profile/previous-company',
        slug: 'about',
        title: 'About Me',
        url: '/ko/about#previous-company',
        excerpt: '이전 회사',
        content: 'Career > 이전 회사\n2022.01 2023.12 프론트엔드 개발',
        sectionTitle: '이전 회사',
        sourceCategory: 'profile',
      },
    ]
    const result = await executeChatRetrievalPlan({
      plan: {
        ...RECENT_PROJECT_AI_PLAN,
        standaloneQuestion: '최근 어디에서 일했어?',
        operation: 'lookup',
        sourceCategories: ['profile'],
        requiredConcepts: [],
        optionalConcepts: ['career', 'workplace'],
        temporalStrategy: 'single',
        temporalOrder: 'latest',
      },
      locale: 'ko',
      blogRecords: [],
      curatedRecords: careerRecords,
      retrieveSemanticMatches: async () => [],
    })

    expect(result).toMatchObject({
      kind: 'direct',
      response: {
        answer:
          '가장 최근 근무처는 Ecount ERP이며, 2024.07부터 2025.08까지 근무했습니다.',
        grounded: true,
      },
      matches: [expect.objectContaining({ sectionTitle: 'Ecount ERP' })],
    })
  })

  it('직접 프로필 응답이 없는 요청도 근거 검색을 수행한다', async () => {
    const record: ChatEvidenceRecord = {
      ...RECENT_AI_PROJECT,
      id: 'profile/example',
      slug: 'about',
      sourceCategory: 'profile',
      content: 'Example Labs 계약직으로 근무했다.',
    }
    const retrieveSemanticMatches = vi.fn(async () => [record])
    const result = await executeChatRetrievalPlan({
      plan: {
        ...RECENT_PROJECT_AI_PLAN,
        executionKind: 'direct_profile',
        standaloneQuestion: 'Example Labs에서 계약 형태는?',
        sourceCategories: ['profile'],
        requiredConcepts: [],
        temporalStrategy: 'none',
        temporalOrder: null,
      },
      locale: 'ko',
      blogRecords: [],
      curatedRecords: [record],
      retrieveSemanticMatches,
    })
    expect(retrieveSemanticMatches).toHaveBeenCalledOnce()
    expect(result.kind).toBe('evidence')
  })

  it('전체 프로젝트의 주력 기술 스택 질문은 profile 요약 근거로 직접 답한다', async () => {
    const techStackRecord: ChatEvidenceRecord = {
      ...RECENT_AI_PROJECT,
      id: 'ko/about/profile-tech-stack',
      slug: 'about',
      title: 'About Me',
      url: '/ko/about',
      excerpt: '프로젝트에서 반복적으로 사용한 기술',
      content:
        '주력 기술 스택\n프로젝트 전체에서 반복적으로 쓰인 기술 스택입니다.\n공통/반복 기술: TypeScript, Next.js, Tailwind CSS',
      sectionTitle: '주력 기술 스택',
      sourceCategory: 'profile',
    }
    const result = await executeChatRetrievalPlan({
      plan: {
        ...RECENT_PROJECT_AI_PLAN,
        standaloneQuestion: '이윤수가 프로젝트에서 주로 쓰는 기술 스택은 뭐야?',
        operation: 'lookup',
        canonicalTargets: [
          {
            kind: 'profile',
            sourceCategory: 'profile',
            slug: 'about',
            title: '이윤수',
          },
        ],
        sourceCategories: ['profile'],
        requiredConcepts: [],
        optionalConcepts: ['기술 스택'],
        temporalStrategy: 'none',
        temporalOrder: null,
      },
      locale: 'ko',
      blogRecords: [],
      curatedRecords: [techStackRecord],
      retrieveSemanticMatches: async () => [],
    })

    expect(result).toMatchObject({
      kind: 'direct',
      response: {
        answer:
          '프로젝트에서 반복적으로 사용한 주력 기술은 TypeScript, Next.js, Tailwind CSS입니다.',
        grounded: true,
      },
      matches: [expect.objectContaining({ id: techStackRecord.id })],
    })
  })

  it('학교별 학력 질문은 profile Education 청크를 구조화해 직접 답한다', async () => {
    const educationRecords: ChatEvidenceRecord[] = [
      {
        ...RECENT_AI_PROJECT,
        id: 'ko/about/profile/삼육대학교',
        slug: 'about',
        title: 'About Me',
        url: '/ko/about#삼육대학교',
        excerpt: '삼육대학교 소프트웨어전공',
        content:
          'Education > 삼육대학교\n2022.03 2024.02 컴퓨터공학부 소프트웨어전공, 공학사, 학점 4.26 / 4.50',
        sectionTitle: '삼육대학교',
        sourceCategory: 'profile',
      },
      {
        ...RECENT_AI_PROJECT,
        id: 'ko/about/profile/동양미래대학교',
        slug: 'about',
        title: 'About Me',
        url: '/ko/about#동양미래대학교',
        excerpt: '동양미래대학교 반도체전자공학과',
        content:
          'Education > 동양미래대학교\n2015.03 2022.02 반도체전자공학과, 공학전문학사, 학점 4.10 / 4.50',
        sectionTitle: '동양미래대학교',
        sourceCategory: 'profile',
      },
    ]
    const result = await executeChatRetrievalPlan({
      plan: {
        ...RECENT_PROJECT_AI_PLAN,
        standaloneQuestion: '학력을 학교별로 알려줘',
        operation: 'summarize',
        sourceCategories: ['profile'],
        requiredConcepts: [],
        optionalConcepts: ['학력'],
        temporalStrategy: 'none',
        temporalOrder: null,
        maximumEvidenceCount: 6,
      },
      locale: 'ko',
      blogRecords: [],
      curatedRecords: educationRecords,
      retrieveSemanticMatches: async () => [],
    })

    expect(result).toMatchObject({
      kind: 'direct',
      response: {
        answer: expect.stringContaining('삼육대학교'),
        grounded: true,
      },
      matches: expect.arrayContaining([
        expect.objectContaining({ sectionTitle: '삼육대학교' }),
        expect.objectContaining({ sectionTitle: '동양미래대학교' }),
      ]),
    })
  })

  it('only source를 관련도 계산 전에 필터링한다', async () => {
    const result = await executeChatRetrievalPlan({
      plan: RECENT_PROJECT_AI_PLAN,
      locale: 'ko',
      blogRecords: [NEWER_AI_BLOG],
      curatedRecords: [OLDER_AI_PROJECT, RECENT_AI_PROJECT],
      retrieveSemanticMatches: async () => [],
    })

    expect(result).toMatchObject({
      kind: 'evidence',
      matches: expect.arrayContaining([
        expect.objectContaining({
          slug: 'recent-ai',
          sourceCategory: 'project',
        }),
      ]),
    })
    expect(
      result.matches.every((match) => match.sourceCategory === 'project'),
    ).toBe(true)
  })

  it('질문 문구가 달라도 compiled source 계약을 동일하게 실행한다', async () => {
    const result = await executeChatRetrievalPlan({
      plan: {
        ...RECENT_PROJECT_AI_PLAN,
        standaloneQuestion: 'AI를 어떻게 활용해?',
      },
      locale: 'ko',
      blogRecords: [NEWER_AI_BLOG],
      curatedRecords: [RECENT_AI_PROJECT],
      retrieveSemanticMatches: async () => [],
    })

    expect(result.matches.map((match) => match.sourceCategory)).toEqual([
      'project',
    ])
  })

  it('required concept coverage를 시간 정렬보다 먼저 적용한다', async () => {
    const result = await executeChatRetrievalPlan({
      plan: RECENT_PROJECT_AI_PLAN,
      locale: 'ko',
      blogRecords: [],
      curatedRecords: [RECENT_NON_AI_PROJECT, OLDER_AI_PROJECT],
      retrieveSemanticMatches: async () => [],
    })

    expect(result.matches[0]?.slug).toBe('older-ai')
  })

  it('같은 slug의 서로 다른 chunk가 필수 개념을 담당하면 다양성 제한 후에도 모두 보존한다', async () => {
    const alphaChunk: ChatEvidenceRecord = {
      ...RECENT_AI_PROJECT,
      id: 'ko/blog/shared-section/alpha',
      slug: 'shared-section',
      title: '비교 분석',
      url: '/ko/blog/shared-section#comparison',
      content: 'Alpha의 특징을 설명합니다.',
      searchTerms: ['Alpha'],
      sourceCategory: 'blog',
    }
    const betaChunk: ChatEvidenceRecord = {
      ...alphaChunk,
      id: 'ko/blog/shared-section/beta',
      content: 'Beta의 특징을 설명합니다.',
      searchTerms: ['Beta'],
    }

    const result = await executeChatRetrievalPlan({
      plan: {
        ...RECENT_PROJECT_AI_PLAN,
        standaloneQuestion: 'Alpha와 Beta를 비교해줘',
        operation: 'compare',
        sourceStrategy: 'all',
        sourceCategories: [],
        requiredConcepts: ['Alpha', 'Beta'],
        temporalStrategy: 'none',
        temporalOrder: null,
      },
      locale: 'ko',
      blogRecords: [alphaChunk, betaChunk],
      curatedRecords: [],
      retrieveSemanticMatches: async () => [],
    })

    expect(result.matches.map((match) => match.id)).toEqual([
      alphaChunk.id,
      betaChunk.id,
    ])
  })

  it('prefer source는 다른 category를 제거하지 않고 우선순위만 높인다', async () => {
    const result = await executeChatRetrievalPlan({
      plan: {
        ...RECENT_PROJECT_AI_PLAN,
        sourceStrategy: 'prefer',
      },
      locale: 'ko',
      blogRecords: [NEWER_AI_BLOG],
      curatedRecords: [RECENT_AI_PROJECT],
      retrieveSemanticMatches: async () => [],
    })

    expect(result.matches[0]?.sourceCategory).toBe('project')
    expect(result.matches.map((match) => match.sourceCategory)).toContain(
      'blog',
    )
  })

  it('single metadata는 최신 블로그 하나를 direct response로 반환한다', async () => {
    const result = await executeChatRetrievalPlan({
      plan: {
        ...RECENT_PROJECT_AI_PLAN,
        executionKind: 'direct_metadata',
        standaloneQuestion: '가장 최근 글의 제목과 날짜를 알려줘',
        operation: 'lookup',
        sourceCategories: ['blog'],
        requiredConcepts: [],
        requestedFields: ['title', 'published_at'],
        temporalStrategy: 'single',
      },
      locale: 'ko',
      blogRecords: [
        NEWER_AI_BLOG,
        {
          ...NEWER_AI_BLOG,
          id: 'ko/blog/older',
          slug: 'older',
          title: '이전 글',
          url: '/ko/blog/older',
          evidenceTime: {
            kind: 'published',
            value: '2025-01-01T00:00:00.000Z',
          },
          publishedAt: '2025-01-01T00:00:00.000Z',
        },
      ],
      curatedRecords: [],
      retrieveSemanticMatches: async () => [],
    })

    expect(result).toMatchObject({
      kind: 'direct',
      response: {
        answer: expect.stringContaining('AI 활용 글'),
        grounded: true,
      },
      matches: [expect.objectContaining({ slug: 'newer-ai' })],
    })
  })

  it('semantic 검색 실패 시 lexical 근거가 있으면 해당 근거로 계속한다', async () => {
    const result = await executeChatRetrievalPlan({
      plan: RECENT_PROJECT_AI_PLAN,
      locale: 'ko',
      blogRecords: [],
      curatedRecords: [RECENT_AI_PROJECT],
      retrieveSemanticMatches: async () => {
        throw new Error('semantic retrieval failed')
      },
    })

    expect(result).toMatchObject({
      kind: 'evidence',
      matches: [expect.objectContaining({ slug: 'recent-ai' })],
      semanticMatches: [],
    })
  })

  it('lexical과 semantic에 모두 검색된 근거를 RRF로 우선한다', async () => {
    const lexicalOnlyRecord: ChatEvidenceRecord = {
      ...RECENT_AI_PROJECT,
      id: 'ko/project/next-deployment',
      slug: 'next-deployment',
      title: 'Next.js 배포 구조',
      url: '/ko/projects/next-deployment',
      content: 'Next.js 배포 구조를 설명합니다.',
      searchTerms: ['Next.js', '배포 구조'],
    }
    const hybridRecord: ChatEvidenceRecord = {
      ...RECENT_AI_PROJECT,
      id: 'ko/project/deployment-retrospective',
      slug: 'deployment-retrospective',
      title: '배포 회고',
      url: '/ko/projects/deployment-retrospective',
      content: 'Next.js의 배포 구조와 운영 경험을 설명합니다.',
      searchTerms: ['Next.js', '배포 구조'],
    }

    const result = await executeChatRetrievalPlan({
      plan: {
        ...RECENT_PROJECT_AI_PLAN,
        standaloneQuestion: 'Next.js 배포 구조',
        temporalStrategy: 'none',
        temporalOrder: null,
        requiredConcepts: [],
      },
      locale: 'ko',
      blogRecords: [],
      curatedRecords: [lexicalOnlyRecord, hybridRecord],
      retrieveSemanticMatches: async () => [hybridRecord],
    })

    expect(result.matches[0]?.id).toBe(hybridRecord.id)
  })

  it('semantic 검색 실패를 근거 없음으로 숨기지 않는다', async () => {
    await expect(
      executeChatRetrievalPlan({
        plan: {
          ...RECENT_PROJECT_AI_PLAN,
          standaloneQuestion: '검색되지 않는 질문',
          requiredConcepts: ['검색되지 않는 개념'],
        },
        locale: 'ko',
        blogRecords: [],
        curatedRecords: [],
        retrieveSemanticMatches: async () => {
          throw new Error('semantic retrieval failed')
        },
      }),
    ).rejects.toThrow('semantic retrieval failed')
  })

  it('semantic 검색 실패 후 lexical 후보가 required concept를 충족하지 못해도 오류를 다시 던진다', async () => {
    await expect(
      executeChatRetrievalPlan({
        plan: {
          ...RECENT_PROJECT_AI_PLAN,
          requiredConcepts: ['Vercel'],
        },
        locale: 'ko',
        blogRecords: [],
        curatedRecords: [RECENT_AI_PROJECT],
        retrieveSemanticMatches: async () => {
          throw new Error('semantic retrieval failed')
        },
      }),
    ).rejects.toThrow('semantic retrieval failed')
  })

  it('여러 근거를 비교해야 하는 긴 질문은 rerank 결과 순서를 최종 근거로 쓴다', async () => {
    const secondaryRecord: ChatEvidenceRecord = {
      ...RECENT_AI_PROJECT,
      id: 'ko/project/ai-document-automation',
      slug: 'ai-document-automation',
      title: 'AI 문서 자동화',
      url: '/ko/projects/ai-document-automation',
      content: 'AI로 문서 생성을 자동화한 과정을 정리합니다.',
      searchTerms: ['AI 활용'],
    }

    const result = await executeChatRetrievalPlan({
      plan: {
        ...RECENT_PROJECT_AI_PLAN,
        standaloneQuestion:
          '프로젝트에서 AI를 어떻게 활용했고 그 과정에서 무엇을 배웠는지 설명해줘',
      },
      locale: 'ko',
      blogRecords: [],
      curatedRecords: [RECENT_AI_PROJECT, secondaryRecord],
      retrieveSemanticMatches: async () => [],
      rerankMatches: async ({ matches }) => {
        return { matches: matches.toReversed(), applied: true }
      },
    })

    expect(result).toMatchObject({ kind: 'evidence', reranked: true })
    expect(result.matches[0]?.id).toBe(secondaryRecord.id)
  })

  it('짧고 단순한 질문은 rerank를 호출하지 않는다', async () => {
    let rerankCallCount = 0
    const result = await executeChatRetrievalPlan({
      plan: {
        ...RECENT_PROJECT_AI_PLAN,
        standaloneQuestion: 'AI 프로젝트',
      },
      locale: 'ko',
      blogRecords: [],
      curatedRecords: [RECENT_AI_PROJECT],
      retrieveSemanticMatches: async () => [],
      rerankMatches: async ({ matches }) => {
        rerankCallCount += 1

        return { matches, applied: true }
      },
    })

    expect(rerankCallCount).toBe(0)
    expect(result).toMatchObject({ kind: 'evidence', reranked: false })
  })

  it('rerank는 최종 근거 수로 자르기 전의 후보 풀을 받아 4순위 근거도 살릴 수 있다', async () => {
    const lexicalRecords: ChatEvidenceRecord[] = [
      'ai-usage',
      'ai-review',
      'ai-experiment',
    ].map((slug) => {
      return {
        ...RECENT_AI_PROJECT,
        id: `ko/project/${slug}`,
        slug,
        title: `AI 활용 ${slug}`,
        url: `/ko/projects/${slug}`,
        content: 'AI 활용 방식을 정리했습니다.',
        searchTerms: ['AI 활용'],
      }
    })
    // lexical 목록에는 들지 못하고 semantic 목록으로만 후보에 들어오는 근거.
    const semanticOnlyRecord: ChatEvidenceRecord = {
      ...RECENT_AI_PROJECT,
      id: 'ko/project/ai-automation-playbook',
      slug: 'ai-automation-playbook',
      title: '자동화 플레이북',
      url: '/ko/projects/ai-automation-playbook',
      content: '자동화 절차를 단계별로 정리한 문서입니다.',
      tags: ['automation'],
      searchTerms: ['자동화'],
    }
    let rerankCandidateCount = 0

    const result = await executeChatRetrievalPlan({
      plan: {
        ...RECENT_PROJECT_AI_PLAN,
        standaloneQuestion:
          '프로젝트에서 AI를 어떻게 활용했고 그 과정에서 무엇을 배웠는지 설명해줘',
      },
      locale: 'ko',
      blogRecords: [],
      curatedRecords: [...lexicalRecords, semanticOnlyRecord],
      // 기대 근거를 융합 후보 마지막 순위로만 넣어, 선별 전에 리랭커가 고르는지 확인한다.
      retrieveSemanticMatches: async () => [semanticOnlyRecord],
      rerankMatches: async ({ matches }) => {
        rerankCandidateCount = matches.length

        return { matches: [...matches].toReversed(), applied: true }
      },
    })

    expect(rerankCandidateCount).toBeGreaterThan(
      RECENT_PROJECT_AI_PLAN.maximumEvidenceCount,
    )
    expect(result).toMatchObject({ kind: 'evidence', reranked: true })
    expect(result.matches[0]?.id).toBe(semanticOnlyRecord.id)
  })

  it('같은 섹션의 앞뒤 청크는 서로 다른 근거로 보존한다', async () => {
    const sharedSectionRecords: ChatEvidenceRecord[] = [
      {
        ...RECENT_AI_PROJECT,
        id: 'ko/project/ai-usage-part-1',
        slug: 'ai-usage',
        title: 'AI 활용 정리',
        url: '/ko/projects/ai-usage#활용-방식',
        content: 'AI 활용 방식을 정리한 앞부분입니다.',
        searchTerms: ['AI 활용'],
      },
      {
        ...RECENT_AI_PROJECT,
        id: 'ko/project/ai-usage-part-2',
        slug: 'ai-usage',
        title: 'AI 활용 정리',
        url: '/ko/projects/ai-usage#활용-방식',
        content: 'AI 활용 방식을 정리한 뒷부분입니다.',
        searchTerms: ['AI 활용'],
      },
      {
        ...RECENT_AI_PROJECT,
        id: 'ko/project/ai-review',
        slug: 'ai-review',
        title: 'AI 회고',
        url: '/ko/projects/ai-review',
        content: 'AI 활용 회고입니다.',
        searchTerms: ['AI 활용'],
      },
    ]

    const result = await executeChatRetrievalPlan({
      plan: {
        ...RECENT_PROJECT_AI_PLAN,
        standaloneQuestion: 'AI 활용 방식을 정리해줘',
      },
      locale: 'ko',
      blogRecords: [],
      curatedRecords: sharedSectionRecords,
      retrieveSemanticMatches: async () => [],
    })
    const matchUrls = result.matches.map((match) => {
      return match.url
    })

    expect(matchUrls).toContain('/ko/projects/ai-usage#활용-방식')
    expect(result.matches.map((match) => match.id)).toEqual(
      expect.arrayContaining([
        'ko/project/ai-usage-part-1',
        'ko/project/ai-usage-part-2',
      ]),
    )
    expect(new Set(result.matches.map((match) => match.id)).size).toBe(
      result.matches.length,
    )
  })
})
