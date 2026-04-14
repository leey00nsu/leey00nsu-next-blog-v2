import { describe, expect, it } from 'vitest'
import { resolveChatRequest } from './resolve-chat-request'
import type { ChatEvidenceRecord } from '@/features/chat/model/chat-evidence'
import type { ChatContactProfile } from '@/features/chat/model/chat-contact'

const KO_CHAT_CONTACT_PROFILE: ChatContactProfile = {
  title: 'About Me',
  aboutUrl: '/ko/about',
  methods: [
    {
      label: 'GitHub',
      url: 'https://github.com/leey00nsu',
    },
    {
      label: 'LinkedIn',
      url: 'https://www.linkedin.com/in/leey00nsu',
    },
  ],
}

const CURATED_CHAT_SOURCES: ChatEvidenceRecord[] = [
  {
    id: 'ko/assistant/profile',
    locale: 'ko',
    slug: 'assistant-profile',
    title: '블로그 챗봇 안내',
    url: '/ko/about',
    excerpt:
      '저는 이윤수 님의 챗봇으로, 블로그 글과 공개된 소개 페이지를 근거로 답변하고 있어요.',
    content:
      '저는 이윤수 님의 챗봇입니다. 블로그 글과 공개된 소개 페이지를 근거로 답변합니다. 저는 작성자가 아니며 공개되지 않은 정보는 추측하지 않습니다.',
    sectionTitle: null,
    tags: ['assistant', 'chatbot', 'relationship'],
    sourceCategory: 'assistant',
  },
  {
    id: 'ko/about/profile',
    locale: 'ko',
    slug: 'about',
    title: 'About Me',
    url: '/ko/about',
    excerpt: '아이디어를 빠르게 실험하고 운영 환경에서도 안정적으로 동작하는 서비스를 지향합니다.',
    content:
      '이윤수는 React와 Next.js 중심의 사이드 프로젝트를 만들고 AI 에이전트 워크플로우를 개선하는 개발자입니다. 삼육대학교 컴퓨터공학과를 졸업했고 Ecount ERP에서 서버 개발자로 일했습니다. TypeScript와 React를 자주 사용합니다.',
    sectionTitle: null,
    tags: [
      'profile',
      'about',
      'react',
      'next.js',
      'typescript',
      'education',
      'university',
      'career',
      'server',
      'ai',
    ],
    searchTerms: [
      '이윤수',
      'about me',
      '블로그 소개',
      '이 사람',
      '작성자',
      '이름',
      'yoonsu lee',
      'author',
      'who is the author',
      'what is his name',
    ],
    sourceCategory: 'profile',
  },
  {
    id: 'ko/about/profile-reference-en',
    locale: 'ko',
    slug: 'about',
    title: 'About Me',
    url: '/en/about',
    excerpt: 'About this blog',
    content:
      'Yoonsu Lee is a developer focused on React, Next.js, and AI-assisted workflows.',
    sectionTitle: null,
    tags: ['profile', 'about', 'canonical-reference'],
    searchTerms: [
      '영어 이름',
      'english name',
      'yoonsu lee',
      'about me',
      'what is his name',
    ],
    sourceCategory: 'profile',
  },
  {
    id: 'ko/project/lee-spec-kit',
    locale: 'ko',
    slug: 'lee-spec-kit',
    title: 'lee-spec-kit',
    url: '/ko/projects/lee-spec-kit',
    excerpt: 'AI 에이전트 기반 개발을 위한 프로젝트 문서 구조 생성 CLI',
    content:
      'lee-spec-kit은 AI 보조 개발을 위한 문서 구조와 워크플로우를 표준화하기 위한 CLI입니다.',
    sectionTitle: null,
    tags: ['project', 'cli', 'ai', 'typescript'],
    sourceCategory: 'project',
  },
]

const EN_CURATED_CHAT_SOURCES: ChatEvidenceRecord[] = [
  {
    id: 'en/assistant/profile',
    locale: 'en',
    slug: 'assistant-profile',
    title: 'Blog Chatbot Guide',
    url: '/en/about',
    excerpt:
      'I am Yoonsu Lee’s chatbot, and I answer using the blog posts and public profile pages.',
    content:
      'I am Yoonsu Lee’s chatbot. I answer using the blog posts and public profile pages. I am not the author and I do not guess unpublished information.',
    sectionTitle: null,
    tags: ['assistant', 'chatbot', 'relationship'],
    sourceCategory: 'assistant',
  },
  {
    id: 'en/about/profile',
    locale: 'en',
    slug: 'about',
    title: 'About Me',
    url: '/en/about',
    excerpt: 'About this blog',
    content:
      'Yoonsu Lee is a developer focused on React, Next.js, and AI-assisted workflows.',
    sectionTitle: null,
    tags: ['profile', 'about', 'developer'],
    searchTerms: [
      'author',
      'blog owner',
      'name',
      'what is his name',
      'who is the author',
      'yoonsu lee',
    ],
    sourceCategory: 'profile',
  },
]

const BLOG_CHAT_SOURCES: ChatEvidenceRecord[] = [
  {
    id: 'ko/blog/why-i-built-lee-spec-kit',
    locale: 'ko',
    slug: 'why-i-built-lee-spec-kit',
    title: 'AI 시대의 개발 생산성은 코드보다 구조에 달려 있다: lee-spec-kit을 만든 이유',
    url: '/ko/blog/why-i-built-lee-spec-kit',
    excerpt: 'lee-spec-kit을 만든 이유를 설명합니다.',
    content:
      'lee-spec-kit은 AI가 일하기 좋은 프로젝트 구조를 만들기 위해 시작한 도구입니다.',
    sectionTitle: null,
    tags: ['lee-spec-kit', 'ai'],
    publishedAt: '2025-03-01T00:00:00.000Z',
    sourceCategory: 'blog',
  },
  {
    id: 'ko/blog/oldest-post',
    locale: 'ko',
    slug: 'oldest-post',
    title: '가장 오래된 글',
    url: '/ko/blog/oldest-post',
    excerpt: '예전 글입니다.',
    content: '블로그 초기에 쓴 글입니다.',
    sectionTitle: null,
    tags: ['회고'],
    publishedAt: '2023-01-01T00:00:00.000Z',
    sourceCategory: 'blog',
  },
  {
    id: 'ko/blog/latest-post',
    locale: 'ko',
    slug: 'latest-post',
    title: '가장 최신 글',
    url: '/ko/blog/latest-post',
    excerpt: '가장 최근 글입니다.',
    content: '최근에 쓴 글입니다.',
    sectionTitle: null,
    tags: ['회고'],
    publishedAt: '2026-03-01T00:00:00.000Z',
    sourceCategory: 'blog',
  },
]

describe('resolveChatRequest', () => {
  it('연락 질문은 공개 소개 페이지의 연락 채널을 direct response로 처리한다', () => {
    const result = resolveChatRequest({
      question: '어떻게 연락해?',
      locale: 'ko',
      blogRecords: BLOG_CHAT_SOURCES,
      curatedRecords: CURATED_CHAT_SOURCES,
      contactProfile: KO_CHAT_CONTACT_PROFILE,
      questionRouting: {
        selector: 'contact',
        action: 'answer',
        scope: 'global',
        reason: 'test',
      },
    })

    expect(result.shouldCallModel).toBe(false)
    expect(result.directResponse?.answer).toContain('GitHub')
    expect(result.directResponse?.answer).toContain('LinkedIn')
    expect(result.directResponse?.citations[0]?.url).toBe('/ko/about')
  })

  it('현재 글 질문은 현재 글 레코드를 우선 근거로 사용한다', () => {
    const result = resolveChatRequest({
      question: '이 글 요약해줘',
      locale: 'ko',
      blogRecords: BLOG_CHAT_SOURCES,
      curatedRecords: CURATED_CHAT_SOURCES,
      currentPostSlug: 'why-i-built-lee-spec-kit',
      questionRouting: {
        selector: 'current_post',
        action: 'summarize',
        scope: 'current_page',
        reason: 'test',
      },
    })

    expect(result.shouldCallModel).toBe(true)
    expect(result.matches[0]?.slug).toBe('why-i-built-lee-spec-kit')
  })

  it('standard retrieval 질문은 currentPostSlug가 있어도 현재 글 fallback을 강제하지 않는다', () => {
    const result = resolveChatRequest({
      question: '이 사람 이름 뭐야?',
      locale: 'ko',
      blogRecords: BLOG_CHAT_SOURCES,
      curatedRecords: CURATED_CHAT_SOURCES.filter((record) => {
        return record.sourceCategory !== 'profile' && record.sourceCategory !== 'assistant'
      }),
      currentPostSlug: 'why-i-built-lee-spec-kit',
      questionAnalysis: {
        normalizedQuestion: '이 사람 이름 뭐야',
        questionType: 'general',
        searchQueries: [
          {
            question: '이 사람 이름 뭐야',
            intent: 'general',
            additionalKeywords: [],
            preferredSourceCategories: [],
          },
        ],
      },
      questionRouting: {
        selector: 'retrieval',
        action: 'answer',
        scope: 'global',
        reason: 'test',
      },
    })

    expect(result.shouldCallModel).toBe(false)
    expect(result.matches).toEqual([])
    expect(result.refusalReason).toBe('insufficient_search_match')
  })

  it('영문 일반 질문도 retrieval-first로 curated source를 검색한다', () => {
    const result = resolveChatRequest({
      question: 'Which project uses TypeScript?',
      locale: 'ko',
      blogRecords: BLOG_CHAT_SOURCES,
      curatedRecords: CURATED_CHAT_SOURCES,
    })

    expect(result.shouldCallModel).toBe(true)
    expect(result.matches.map((match) => match.sourceCategory)).toContain(
      'project',
    )
    expect(result.matches[0]?.url).toBe('/ko/projects/lee-spec-kit')
  })

  it('영문 이름 질문은 generated profile metadata로 근거를 찾는다', () => {
    const result = resolveChatRequest({
      question: 'what is his name',
      locale: 'en',
      blogRecords: [],
      curatedRecords: EN_CURATED_CHAT_SOURCES,
    })

    expect(result.shouldCallModel).toBe(true)
    expect(result.matches[0]?.sourceCategory).toBe('profile')
    expect(result.matches[0]?.url).toBe('/en/about')
  })

  it('기술 사용 여부 질문은 curated 결과가 많아도 blog 근거를 top-k에 유지한다', () => {
    const projectOnlyCuratedRecords: ChatEvidenceRecord[] = [
      {
        id: 'ko/project/leesfield/intro',
        locale: 'ko',
        slug: 'leesfield',
        title: 'Leesfield',
        url: '/ko/projects/leesfield#프로젝트-소개',
        excerpt: '프로젝트 소개',
        content: '이윤수가 프로젝트에서 사용한 기술을 설명합니다.',
        sectionTitle: '프로젝트 소개',
        tags: ['project', 'typescript'],
        searchTerms: [
          '이윤수가 블로그나 프로젝트에서 nivo를 사용한 적이 있는지 확인하고 싶습니다.',
          'project',
          '프로젝트',
        ],
        sourceCategory: 'project',
      },
      {
        id: 'ko/project/lee-spec-kit/problem',
        locale: 'ko',
        slug: 'lee-spec-kit',
        title: 'lee-spec-kit',
        url: '/ko/projects/lee-spec-kit#problem',
        excerpt: '문제 정의',
        content: '프로젝트에서 다루는 문제를 설명합니다.',
        sectionTitle: 'Problem',
        tags: ['project', 'typescript'],
        searchTerms: [
          '이윤수가 블로그나 프로젝트에서 nivo를 사용한 적이 있는지 확인하고 싶습니다.',
          'project',
          '프로젝트',
        ],
        sourceCategory: 'project',
      },
      {
        id: 'ko/project/leemage/stack',
        locale: 'ko',
        slug: 'leemage',
        title: 'Leemage',
        url: '/ko/projects/leemage#기술-스택',
        excerpt: '기술 스택',
        content: '프로젝트에 사용한 기술 스택입니다.',
        sectionTitle: '기술 스택',
        tags: ['project', 'typescript'],
        searchTerms: [
          '이윤수가 블로그나 프로젝트에서 nivo를 사용한 적이 있는지 확인하고 싶습니다.',
          'project',
          '프로젝트',
        ],
        sourceCategory: 'project',
      },
    ]
    const nivoBlogRecords: ChatEvidenceRecord[] = [
      {
        id: 'ko/blog/nivo-chart/line-chart',
        locale: 'ko',
        slug: 'nivo-chart',
        title: 'nivo chart로 데이터 시각화하기',
        url: '/ko/blog/nivo-chart#라인-차트-만들기',
        excerpt: 'nivo로 라인 차트를 만든 글입니다.',
        content: 'nivo를 사용해 차트를 구현한 경험을 설명합니다.',
        sectionTitle: '라인 차트 만들기',
        tags: ['react', 'nivo', 'chart'],
        searchTerms: [
          'nivo',
          'nivo chart',
          '차트 라이브러리',
          '이윤수가 블로그나 프로젝트에서 nivo를 사용한 적이 있는지 확인하고 싶습니다.',
        ],
        sourceCategory: 'blog',
      },
    ]

    const result = resolveChatRequest({
      question: 'nivo라는걸 쓴 적 있나요?',
      locale: 'ko',
      blogRecords: nivoBlogRecords,
      curatedRecords: projectOnlyCuratedRecords,
      questionAnalysis: {
        normalizedQuestion:
          '이윤수가 블로그나 프로젝트에서 nivo를 사용한 적이 있는지 확인하고 싶습니다.',
        questionType: 'general',
        searchQueries: [
          {
            question:
              '이윤수가 블로그나 프로젝트에서 nivo를 사용한 적이 있는지 확인하고 싶습니다.',
            intent: 'general',
            additionalKeywords: [
              'project',
              'projects',
              '프로젝트',
              'nivo',
              '차트 라이브러리',
              'react',
            ],
            preferredSourceCategories: ['project', 'blog'],
          },
        ],
      },
      questionRouting: {
        selector: 'retrieval',
        action: 'answer',
        scope: 'global',
        reason: 'test',
      },
    })

    expect(result.shouldCallModel).toBe(true)
    expect(
      result.matches.some((match) => {
        return match.sourceCategory === 'blog'
      }),
    ).toBe(true)
    expect(
      result.matches.some((match) => {
        return match.slug === 'nivo-chart'
      }),
    ).toBe(true)
  })

  it('ko 로케일에서도 영어 이름 질문은 canonical profile source를 찾는다', () => {
    const result = resolveChatRequest({
      question: 'what is his name',
      locale: 'ko',
      blogRecords: BLOG_CHAT_SOURCES,
      curatedRecords: CURATED_CHAT_SOURCES,
      questionRouting: {
        selector: 'retrieval',
        action: 'answer',
        scope: 'global',
        reason: 'test',
      },
    })

    expect(result.shouldCallModel).toBe(true)
    expect(result.matches[0]?.sourceCategory).toBe('profile')
    expect(result.matches[0]?.url).toBe('/ko/about')
  })

  it('영어 이름 질문은 영어 프로필 참조 source를 우선 선택한다', () => {
    const result = resolveChatRequest({
      question: '영어 이름 뭐야?',
      locale: 'ko',
      blogRecords: BLOG_CHAT_SOURCES,
      curatedRecords: CURATED_CHAT_SOURCES,
      questionRouting: {
        selector: 'retrieval',
        action: 'answer',
        scope: 'global',
        reason: 'test',
      },
    })

    expect(result.shouldCallModel).toBe(true)
    expect(result.matches[0]?.sourceCategory).toBe('profile')
    expect(result.matches[0]?.url).toBe('/en/about')
  })

  it('최신 글 질문은 날짜 기준 direct response로 처리한다', () => {
    const result = resolveChatRequest({
      question: '최신 글 뭐지?',
      locale: 'ko',
      blogRecords: BLOG_CHAT_SOURCES,
      curatedRecords: CURATED_CHAT_SOURCES,
      questionRouting: {
        selector: 'latest_post',
        action: 'answer',
        scope: 'global',
        reason: 'test',
      },
    })

    expect(result.shouldCallModel).toBe(false)
    expect(result.directResponse?.answer).toContain('가장 최신 글')
    expect(result.directResponse?.answer).not.toContain('**')
    expect(result.directResponse?.citations[0]?.url).toBe(
      '/ko/blog/latest-post',
    )
  })

  it('latest_post answer 슬롯은 질문 문자열 패턴 없이도 최신 글을 고른다', () => {
    const result = resolveChatRequest({
      question: '마지막 글',
      locale: 'ko',
      blogRecords: BLOG_CHAT_SOURCES,
      curatedRecords: CURATED_CHAT_SOURCES,
      questionAnalysis: {
        normalizedQuestion: '마지막 글',
        questionType: 'general',
        searchQueries: [],
      },
      questionRouting: {
        selector: 'latest_post',
        action: 'answer',
        scope: 'global',
        reason: 'test',
      },
    })

    expect(result.shouldCallModel).toBe(false)
    expect(result.directResponse?.answer).toContain('가장 최신 글')
    expect(result.directResponse?.citations[0]?.url).toBe(
      '/ko/blog/latest-post',
    )
  })

  it('가장 오래된 글 질문은 날짜 오름차순 direct response로 처리한다', () => {
    const result = resolveChatRequest({
      question: '가장 오래된 글 추천',
      locale: 'ko',
      blogRecords: BLOG_CHAT_SOURCES,
      curatedRecords: CURATED_CHAT_SOURCES,
      questionRouting: {
        selector: 'oldest_post',
        action: 'recommend',
        scope: 'global',
        reason: 'test',
      },
    })

    expect(result.shouldCallModel).toBe(false)
    expect(result.directResponse?.answer).toContain('가장 오래된 글')
    expect(result.directResponse?.answer).not.toContain('**')
    expect(result.directResponse?.citations[0]?.url).toBe(
      '/ko/blog/oldest-post',
    )
  })

  it('oldest_post summarize 슬롯은 가장 오래된 글을 모델 근거로 넘긴다', () => {
    const result = resolveChatRequest({
      question: '가장 첫 글 요약해봐',
      locale: 'ko',
      blogRecords: BLOG_CHAT_SOURCES,
      curatedRecords: CURATED_CHAT_SOURCES,
      questionAnalysis: {
        normalizedQuestion: '가장 첫 글 요약해봐',
        questionType: 'general',
        searchQueries: [],
      },
      questionRouting: {
        selector: 'oldest_post',
        action: 'summarize',
        scope: 'global',
        reason: 'test',
      },
    })

    expect(result.shouldCallModel).toBe(true)
    expect(result.directResponse).toBeUndefined()
    expect(result.matches).toHaveLength(1)
    expect(result.matches[0]?.url).toBe('/ko/blog/oldest-post')
  })
})
