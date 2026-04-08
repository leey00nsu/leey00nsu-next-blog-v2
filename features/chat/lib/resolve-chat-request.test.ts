import { describe, expect, it } from 'vitest'
import { resolveChatRequest } from './resolve-chat-request'
import type { ChatEvidenceRecord } from '@/features/chat/model/chat-evidence'
import type { ChatAssistantProfile } from '@/features/chat/model/chat-assistant'
import type { ChatContactProfile } from '@/features/chat/model/chat-contact'

const KO_CHAT_ASSISTANT_PROFILE: ChatAssistantProfile = {
  title: '블로그 챗봇 안내',
  description: '이 챗봇이 누구를 위해 어떤 근거로 답하는지 정리한 내부 문서',
  chatbotName: '블로그 챗봇',
  ownerName: '이윤수',
  greetingAnswer:
    '안녕하세요. 저는 이윤수 님의 블로그 챗봇으로, 블로그 글과 공개된 소개 페이지를 근거로 답변하고 있어요.',
  identityAnswer:
    '저는 이윤수 님의 챗봇으로, 블로그 글과 공개된 소개 페이지를 근거로 답변하고 있어요.',
  aliases: ['이 사람 챗봇', '누구의 챗봇'],
  content:
    '저는 이윤수 님의 챗봇입니다. 블로그 글과 공개된 소개 페이지를 근거로 답변합니다.',
}

const EN_CHAT_ASSISTANT_PROFILE: ChatAssistantProfile = {
  title: 'Blog Chatbot Guide',
  description: 'Internal document describing who this chatbot is',
  chatbotName: 'Blog Chatbot',
  ownerName: 'Yoonsu Lee',
  greetingAnswer:
    "Hi there. I am Yoonsu Lee's blog chatbot, and I answer using the blog posts and public profile pages.",
  identityAnswer:
    "I am Yoonsu Lee's chatbot, and I answer using the blog posts and public profile pages.",
  aliases: ['whose chatbot are you', 'relationship with the author'],
  content:
    "I am Yoonsu Lee's chatbot. I answer using the blog posts and public profile pages.",
}

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
  it('인사형 질문은 모델 호출 없이 고정 응답으로 처리한다', () => {
    const result = resolveChatRequest({
      question: '안녕',
      locale: 'ko',
      blogRecords: BLOG_CHAT_SOURCES,
      curatedRecords: CURATED_CHAT_SOURCES,
      assistantProfile: KO_CHAT_ASSISTANT_PROFILE,
    })

    expect(result.shouldCallModel).toBe(false)
    expect(result.directResponse?.answer).toContain('블로그 챗봇')
  })

  it('챗봇 정체 질문은 작성자처럼 답하지 않고 챗봇으로 소개한다', () => {
    const result = resolveChatRequest({
      question: '넌 뭐야?',
      locale: 'ko',
      blogRecords: BLOG_CHAT_SOURCES,
      curatedRecords: CURATED_CHAT_SOURCES,
      assistantProfile: KO_CHAT_ASSISTANT_PROFILE,
      questionAnalysis: {
        normalizedQuestion: '넌 뭐야',
        questionType: 'assistant-identity',
        searchQueries: [],
      },
    })

    expect(result.shouldCallModel).toBe(false)
    expect(result.directResponse?.answer).toContain('이윤수 님의 챗봇')
    expect(result.directResponse?.answer).not.toContain('저는 프로젝트를')
  })

  it('챗봇 관계 질문은 assistant 문서 기반 direct response로 처리한다', () => {
    const result = resolveChatRequest({
      question: '넌 이 사람이랑 어떤 관계야?',
      locale: 'ko',
      blogRecords: BLOG_CHAT_SOURCES,
      curatedRecords: CURATED_CHAT_SOURCES,
      assistantProfile: KO_CHAT_ASSISTANT_PROFILE,
      questionAnalysis: {
        normalizedQuestion: '넌 이 사람이랑 어떤 관계야',
        questionType: 'assistant-identity',
        searchQueries: [],
      },
    })

    expect(result.shouldCallModel).toBe(false)
    expect(result.directResponse?.answer).toBe(
      '저는 이윤수 님의 챗봇으로, 블로그 글과 공개된 소개 페이지를 근거로 답변하고 있어요.',
    )
  })

  it('연락 질문은 공개 소개 페이지의 연락 채널을 direct response로 처리한다', () => {
    const result = resolveChatRequest({
      question: '어떻게 연락해?',
      locale: 'ko',
      blogRecords: BLOG_CHAT_SOURCES,
      curatedRecords: CURATED_CHAT_SOURCES,
      assistantProfile: KO_CHAT_ASSISTANT_PROFILE,
      contactProfile: KO_CHAT_CONTACT_PROFILE,
      handlingType: 'direct_contact',
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
      assistantProfile: KO_CHAT_ASSISTANT_PROFILE,
      currentPostSlug: 'why-i-built-lee-spec-kit',
      handlingType: 'direct_current_post',
    })

    expect(result.shouldCallModel).toBe(true)
    expect(result.matches[0]?.slug).toBe('why-i-built-lee-spec-kit')
  })

  it('영문 일반 질문도 retrieval-first로 curated source를 검색한다', () => {
    const result = resolveChatRequest({
      question: 'Which project uses TypeScript?',
      locale: 'ko',
      blogRecords: BLOG_CHAT_SOURCES,
      curatedRecords: CURATED_CHAT_SOURCES,
      assistantProfile: KO_CHAT_ASSISTANT_PROFILE,
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
      assistantProfile: EN_CHAT_ASSISTANT_PROFILE,
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
      assistantProfile: KO_CHAT_ASSISTANT_PROFILE,
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
      assistantProfile: KO_CHAT_ASSISTANT_PROFILE,
    })

    expect(result.shouldCallModel).toBe(false)
    expect(result.directResponse?.answer).toContain('가장 오래된 글')
    expect(result.directResponse?.citations[0]?.url).toBe(
      '/ko/blog/oldest-post',
    )
  })
})
