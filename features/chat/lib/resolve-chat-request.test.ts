import { describe, expect, it } from 'vitest'
import { resolveChatRequest } from './resolve-chat-request'
import type { ChatEvidenceRecord } from '@/features/chat/model/chat-evidence'

const CURATED_CHAT_SOURCES: ChatEvidenceRecord[] = [
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
    })

    expect(result.shouldCallModel).toBe(false)
    expect(result.directResponse?.answer).toContain('블로그 글을 기반으로')
  })

  it('프로필형 질문은 curated profile source를 우선 선택한다', () => {
    const result = resolveChatRequest({
      question: '이 사람 어떤 사람이야?',
      locale: 'ko',
      blogRecords: BLOG_CHAT_SOURCES,
      curatedRecords: CURATED_CHAT_SOURCES,
    })

    expect(result.shouldCallModel).toBe(true)
    expect(result.matches[0]?.sourceCategory).toBe('profile')
    expect(result.matches[0]?.url).toBe('/ko/about')
  })

  it('프로필과 프로젝트가 함께 있는 질문은 두 source를 함께 포함한다', () => {
    const result = resolveChatRequest({
      question: '이 사람은 어떤 개발자고 대표 프로젝트는 뭐야?',
      locale: 'ko',
      blogRecords: BLOG_CHAT_SOURCES,
      curatedRecords: CURATED_CHAT_SOURCES,
    })

    expect(result.shouldCallModel).toBe(true)
    expect(result.matches.map((match) => match.sourceCategory)).toEqual(
      expect.arrayContaining(['profile', 'project']),
    )
  })

  it('학력 질문은 curated profile source로 답변 근거를 잡는다', () => {
    const result = resolveChatRequest({
      question: '어떤 대학 출신이야?',
      locale: 'ko',
      blogRecords: BLOG_CHAT_SOURCES,
      curatedRecords: CURATED_CHAT_SOURCES,
    })

    expect(result.shouldCallModel).toBe(true)
    expect(result.matches[0]?.sourceCategory).toBe('profile')
    expect(result.matches[0]?.url).toBe('/ko/about')
  })

  it('경력 질문은 curated profile source로 답변 근거를 잡는다', () => {
    const result = resolveChatRequest({
      question: '어디서 일했고 어떤 업무를 했어?',
      locale: 'ko',
      blogRecords: BLOG_CHAT_SOURCES,
      curatedRecords: CURATED_CHAT_SOURCES,
    })

    expect(result.shouldCallModel).toBe(true)
    expect(result.matches[0]?.sourceCategory).toBe('profile')
  })

  it('기술 스택 질문은 curated profile source를 포함한다', () => {
    const result = resolveChatRequest({
      question: '주력 기술 스택이 뭐야?',
      locale: 'ko',
      blogRecords: BLOG_CHAT_SOURCES,
      curatedRecords: CURATED_CHAT_SOURCES,
    })

    expect(result.shouldCallModel).toBe(true)
    expect(result.matches.map((match) => match.sourceCategory)).toContain(
      'profile',
    )
  })
})
