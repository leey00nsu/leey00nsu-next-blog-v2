import { describe, expect, it } from 'vitest'
import type { ChatEvidenceRecord } from '@/features/chat/model/chat-evidence'
import type { ChatRetrievalPlan } from '@/features/chat/model/chat-retrieval-plan'
import { executeChatRetrievalPlan } from '@/features/chat/model/execute-chat-retrieval-plan'

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

describe('executeChatRetrievalPlan', () => {
  it('최근 근무처 질문은 최신 Career 항목으로 직접 답한다', async () => {
    const careerRecords: ChatEvidenceRecord[] = [
      {
        ...RECENT_AI_PROJECT,
        id: 'ko/about/profile/ecount-erp',
        slug: 'about',
        title: 'About Me',
        url: '/ko/about#ecount-erp',
        excerpt: 'Ecount ERP 서버 개발자',
        content:
          'Career > Ecount ERP\n2024.07 2025.08 서버 개발자로 ERP 기능 개발 및 유지보수',
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
        standaloneQuestion:
          '이윤수가 프로젝트에서 주로 쓰는 기술 스택은 뭐야?',
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
})
